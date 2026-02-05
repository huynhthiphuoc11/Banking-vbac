from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from common.logging import configure_logging
from common.auth import require_auth
from common.rate_limit import RateLimitMiddleware
from common.security import (
  enforce_no_autodecision,
  safety_filter_user_input,
)
from common.settings import CommonSettings

from .nlp import detect_emotion, detect_intent, summarize_context
from .openai_client import maybe_llm_summarize


settings = CommonSettings(service_name="conversation_service")
configure_logging("conversation_service")

app = FastAPI(
  title="Conversation Service",
  version="0.1.0",
  description="Conversation context, summarization, intent/emotion detection, and feedback collection.",
)

app.add_middleware(
  RateLimitMiddleware,
  enabled=settings.rate_limit_enabled,
  rps=settings.rate_limit_rps,
  burst=settings.rate_limit_burst,
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=[settings.cors_allow_origins],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
  return {"status": "ok", "service": "conversation_service"}


Role = Literal["user", "assistant"]


class Turn(BaseModel):
  role: Role
  content: str
  ts: int | None = None


class ConversationMessageIn(BaseModel):
  user_id: str
  conversation_id: str
  message: str
  history: list[Turn] = Field(default_factory=list, description="Last N turns (optional)")
  summary: str | None = Field(default=None, description="Rolling summary from client (optional)")
  modality: Literal["text", "voice"] = "text"


class ConversationMessageOut(BaseModel):
  request_id: str
  assistant_message: str
  summary: str
  intent: dict
  emotion: dict
  safety: dict
  latency_ms: int


def _request_id() -> str:
  return f"req_{int(time.time()*1000)}_{os.urandom(4).hex()}"


@app.post("/v1/conversation/message", response_model=ConversationMessageOut)
def post_message(payload: ConversationMessageIn) -> ConversationMessageOut:
  t0 = time.time()
  rid = _request_id()

  safety = safety_filter_user_input(payload.message)
  intent = detect_intent(safety.redacted_text)
  emotion = detect_emotion(safety.redacted_text)

  # Summarization strategy: prefer existing summary; otherwise build from last turns.
  base_summary = payload.summary or summarize_context(payload.history)
  summary = maybe_llm_summarize(
    user_text=safety.redacted_text,
    current_summary=base_summary,
    conversation_id=payload.conversation_id,
  )

  # Response generation (safe scaffold).
  assistant = (
    f"Intent detected: **{intent['label']}** (conf {intent['confidence']:.2f})\n"
    f"Emotion detected: **{emotion['label']}** (conf {emotion['confidence']:.2f})\n\n"
    "Next best actions:\n"
    "- I can analyze your recent transactions and find patterns.\n"
    "- I can recommend suitable products and explain why.\n\n"
    "Tell me your goal (saving more, getting a card, planning a loan, etc.) and the time horizon."
  )
  assistant = enforce_no_autodecision(assistant)

  latency_ms = int((time.time() - t0) * 1000)
  return ConversationMessageOut(
    request_id=rid,
    assistant_message=assistant,
    summary=summary,
    intent=intent,
    emotion=emotion,
    safety={
      "allowed": safety.allowed,
      "reasons": safety.reasons,
    },
    latency_ms=latency_ms,
  )


@app.post("/v1/chat/message", response_model=ConversationMessageOut)
def chat_message(payload: ConversationMessageIn) -> ConversationMessageOut:
  # Alias endpoint for standardized frontend contract
  return post_message(payload)


class FeedbackIn(BaseModel):
  user_id: str
  conversation_id: str
  message_id: str
  reaction: Literal["like", "dislike"]
  reason: str | None = None


class FeedbackOut(BaseModel):
  ok: bool
  stored: bool


@app.post("/v1/conversation/feedback", response_model=FeedbackOut)
def post_feedback(payload: FeedbackIn) -> FeedbackOut:
  # For scaffolding: append JSONL locally. In production: Kafka topic + warehouse.
  base = Path(os.environ.get("FEEDBACK_DIR", os.path.join(os.path.dirname(__file__), "../../../backend_data")))
  base.mkdir(parents=True, exist_ok=True)
  fp = base / "conversation_feedback.jsonl"
  with fp.open("a", encoding="utf-8") as f:
    f.write(json.dumps(payload.model_dump(), ensure_ascii=False) + "\n")
  return FeedbackOut(ok=True, stored=True)


@app.post("/v1/chat/feedback", response_model=FeedbackOut)
def chat_feedback(payload: FeedbackIn) -> FeedbackOut:
  return post_feedback(payload)


