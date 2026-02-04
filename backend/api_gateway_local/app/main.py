from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from common.auth import require_auth
from common.logging import configure_logging
from common.rate_limit import RateLimitMiddleware
from common.settings import CommonSettings


settings = CommonSettings(service_name="api_gateway_local")
configure_logging("api_gateway_local")

# Default to 127.0.0.1 to avoid IPv6/localhost resolution issues on Windows.
TX_URL = os.environ.get("TRANSACTION_SERVICE_URL", "http://127.0.0.1:8002")
CONV_URL = os.environ.get("CONVERSATION_SERVICE_URL", "http://127.0.0.1:8001")


app = FastAPI(
  title="Local API Gateway (BFF)",
  version="0.1.0",
  description="Local gateway that standardizes endpoint contracts for the frontend. In production this role is done by AWS API Gateway.",
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
  return {"status": "ok", "service": "api_gateway_local"}


async def _post_json(url: str, payload: dict[str, Any], headers: dict[str, str]) -> Any:
  async with httpx.AsyncClient(timeout=10.0) as client:
    r = await client.post(url, json=payload, headers=headers)
    if r.status_code >= 400:
      raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()


async def _get_json(url: str, headers: dict[str, str]) -> Any:
  async with httpx.AsyncClient(timeout=10.0) as client:
    r = await client.get(url, headers=headers)
    if r.status_code >= 400:
      raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()


# --------------------
# Chat endpoints
# --------------------


class ChatMessageIn(BaseModel):
  user_id: str
  conversation_id: str
  message: str
  history: list[dict] = []
  summary: str | None = None
  modality: str = "text"


@app.post("/v1/chat/message")
async def chat_message(
  payload: ChatMessageIn,
  claims: dict = Depends(require_auth(settings)),
):
  headers = {}
  # Forward user identity to services for rate-limiting keying if needed.
  headers["x-user-id"] = str(claims.get("sub", payload.user_id))
  return await _post_json(f"{CONV_URL}/v1/chat/message", payload.model_dump(), headers=headers)


class ChatFeedbackIn(BaseModel):
  user_id: str
  conversation_id: str
  message_id: str
  reaction: str  # like/dislike
  reason: str | None = None


@app.post("/v1/chat/feedback")
async def chat_feedback(
  payload: ChatFeedbackIn,
  claims: dict = Depends(require_auth(settings)),
):
  headers = {"x-user-id": str(claims.get("sub", payload.user_id))}
  return await _post_json(f"{CONV_URL}/v1/chat/feedback", payload.model_dump(), headers=headers)


# --------------------
# Dashboard endpoints (standardized)
# --------------------


@app.get("/v1/dashboard/users/{user_id}/transactions")
async def dashboard_transactions(
  user_id: str,
  start: str | None = None,
  end: str | None = None,
  limit: int = 200,
  claims: dict = Depends(require_auth(settings)),
):
  headers = {"x-user-id": str(claims.get("sub", user_id))}
  qs = []
  if start:
    qs.append(f"start={start}")
  if end:
    qs.append(f"end={end}")
  qs.append(f"limit={limit}")
  q = "&".join(qs)
  return await _get_json(f"{TX_URL}/v1/banking/users/{user_id}/transactions?{q}", headers=headers)


@app.get("/v1/dashboard/users/{user_id}/summary")
async def dashboard_summary(
  user_id: str,
  window_days: int = 90,
  claims: dict = Depends(require_auth(settings)),
):
  headers = {"x-user-id": str(claims.get("sub", user_id))}
  return await _get_json(f"{TX_URL}/v1/banking/users/{user_id}/summary?window_days={window_days}", headers=headers)


@app.get("/v1/dashboard/users/{user_id}/insights")
async def dashboard_insights(
  user_id: str,
  window_days: int = 90,
  claims: dict = Depends(require_auth(settings)),
):
  """
  Heuristic insight endpoint (placeholder for Behavior Detection Agent + Explainable Agent).
  """
  headers = {"x-user-id": str(claims.get("sub", user_id))}
  summary = await _get_json(f"{TX_URL}/v1/banking/users/{user_id}/summary?window_days={window_days}", headers=headers)

  top = (summary.get("top_categories") or [])[:1]
  top_cat = top[0]["category"] if top else "Other"
  inst_ratio = float(summary.get("installment_ratio") or 0.0)

  insights: list[dict[str, Any]] = []
  insights.append(
    {
      "level": "high",
      "title": "Spend concentration detected",
      "description": f"Your spend is concentrated in **{top_cat}** over the last {window_days} days.",
      "impact": "Consider setting a category budget and choosing the best rewards product for that category.",
      "why": ["Top category spend is dominant", "Pattern consistent across recent transactions"],
    }
  )
  if inst_ratio >= 0.3:
    insights.append(
      {
        "level": "warning",
        "title": "High installment usage",
        "description": f"Installment ratio is **{inst_ratio:.0%}** of your spending.",
        "impact": "Keep installment ratio under 30–35% to maintain healthy cashflow.",
        "why": ["Multiple transactions flagged as installment", "Installment share exceeds threshold"],
      }
    )
  else:
    insights.append(
      {
        "level": "stable",
        "title": "Installment usage is under control",
        "description": f"Installment ratio is **{inst_ratio:.0%}** of your spending.",
        "impact": "You have flexibility to automate savings or invest periodically.",
        "why": ["Installment share below threshold"],
      }
    )

  return {"user_id": user_id, "window_days": window_days, "insights": insights}


@app.get("/v1/dashboard/users/{user_id}/recommendations")
async def dashboard_recommendations(
  user_id: str,
  window_days: int = 90,
  claims: dict = Depends(require_auth(settings)),
):
  """
  Heuristic product rec endpoint (placeholder for Product Rec Agent + Orchestrator).
  """
  headers = {"x-user-id": str(claims.get("sub", user_id))}
  summary = await _get_json(f"{TX_URL}/v1/banking/users/{user_id}/summary?window_days={window_days}", headers=headers)
  top = (summary.get("top_categories") or [])[:1]
  top_cat = top[0]["category"] if top else "Other"
  inst_ratio = float(summary.get("installment_ratio") or 0.0)

  recs: list[dict[str, Any]] = []
  if top_cat in ("Travel", "Shopping"):
    recs.append(
      {
        "product": "Rewards Credit Card",
        "type": "credit_card",
        "match": 0.86,
        "why": [f"High spend in {top_cat}", "Better points/cashback multipliers"],
        "explanation": "This card maximizes rewards on your highest spend category.",
      }
    )
  recs.append(
    {
      "product": "Smart Saver Plan",
      "type": "saving",
      "match": 0.75,
      "why": ["Stable transaction frequency", "Helps automate saving habit"],
      "explanation": "Automated saving works well when cashflow is predictable.",
    }
  )
  if inst_ratio >= 0.3:
    recs.append(
      {
        "product": "Debt Consolidation (Optional)",
        "type": "loan",
        "match": 0.62,
        "why": ["Installment ratio is high", "May lower total repayment cost"],
        "explanation": "Consolidation can reduce stress and improve monthly predictability.",
      }
    )

  return {"user_id": user_id, "window_days": window_days, "recommendations": recs}


