from __future__ import annotations

import os
from typing import Optional

from tenacity import retry, stop_after_attempt, wait_exponential


def _has_openai() -> bool:
  return bool(os.environ.get("OPENAI_API_KEY"))


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=0.3, min=0.3, max=1.5))
def _openai_summarize(user_text: str, current_summary: str) -> str:
  # Imported lazily so the service can run without OpenAI installed in some envs.
  from openai import OpenAI

  client = OpenAI()
  prompt = (
    "You are a banking AI assistant. Maintain a concise rolling conversation summary.\n"
    "Rules:\n"
    "- Keep it under 10 bullet points.\n"
    "- Include user's goals, constraints, and key facts.\n"
    "- Do NOT include any PII.\n\n"
    f"CURRENT SUMMARY:\n{current_summary}\n\n"
    f"NEW USER MESSAGE:\n{user_text}\n\n"
    "UPDATED SUMMARY:"
  )
  resp = client.responses.create(
    model=os.environ.get("OPENAI_SUMMARY_MODEL", "gpt-4o-mini"),
    input=prompt,
  )
  # responses API returns output text in different shapes; handle common case:
  text = getattr(resp, "output_text", None)
  if isinstance(text, str) and text.strip():
    return text.strip()
  # fallback: best-effort
  return current_summary


def maybe_llm_summarize(user_text: str, current_summary: str, conversation_id: str) -> str:
  """
  Summarization path:
  - If OPENAI_API_KEY exists: use OpenAI for better summary quality.
  - Else: keep deterministic rolling summary.
  """
  if not current_summary:
    current_summary = ""
  if not _has_openai():
    # Deterministic update
    if user_text.strip():
      return (current_summary + ("\n- " if current_summary else "Recent user topics:\n- ") + user_text.strip()[:140]).strip()
    return current_summary

  try:
    return _openai_summarize(user_text=user_text, current_summary=current_summary)
  except Exception:
    return current_summary


