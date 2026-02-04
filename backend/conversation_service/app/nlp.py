from __future__ import annotations

import re
from typing import Any


def summarize_context(history: list[dict[str, Any]] | list[Any]) -> str:
  # Minimal deterministic summary. Production: LLM summarization + token budget.
  if not history:
    return ""
  user_msgs: list[str] = []
  for turn in history[-10:]:
    role = getattr(turn, "role", None) or (turn.get("role") if isinstance(turn, dict) else None)
    content = getattr(turn, "content", None) or (turn.get("content") if isinstance(turn, dict) else "")
    if role == "user" and content:
      user_msgs.append(content.strip())
  if not user_msgs:
    return ""
  bullets = "\n".join(f"- {m[:140]}" for m in user_msgs[-6:])
  return f"Recent user topics:\n{bullets}"


def detect_intent(text: str) -> dict[str, Any]:
  t = text.lower()
  rules: list[tuple[str, float, bool]] = [
    ("loan", 0.85, bool(re.search(r"(loan|vay|mortgage|interest|lãi suất)", t, re.I))),
    ("travel", 0.8, bool(re.search(r"(travel|du lịch|flight|hotel|vé máy bay|khách sạn)", t, re.I))),
    ("saving", 0.8, bool(re.search(r"(saving|tiết kiệm|deposit|gửi góp|lãi kép)", t, re.I))),
    ("credit", 0.75, bool(re.search(r"(credit|thẻ tín dụng|limit|cashback|points)", t, re.I))),
    ("insurance", 0.75, bool(re.search(r"(insurance|bảo hiểm|policy|premium)", t, re.I))),
    ("spending", 0.7, bool(re.search(r"(spending|chi tiêu|budget|ngân sách|transaction|giao dịch)", t, re.I))),
    ("investment", 0.7, bool(re.search(r"(invest|đầu tư|stock|fund|bond|ETF|cổ phiếu)", t, re.I))),
  ]
  for label, conf, hit in rules:
    if hit:
      return {"label": label, "confidence": conf}
  return {"label": "unknown", "confidence": 0.4}


def detect_emotion(text: str) -> dict[str, Any]:
  t = text.lower()
  if re.search(r"(urgent|gấp|kẹt|overdue|nợ|debt|stress|áp lực)", t, re.I):
    return {"label": "stress", "confidence": 0.8}
  if re.search(r"(worried|lo|concern|sợ|không biết)", t, re.I):
    return {"label": "concern", "confidence": 0.75}
  if re.search(r"(great|tuyệt|excited|hào hứng|được rồi|yay)", t, re.I):
    return {"label": "excitement", "confidence": 0.75}
  return {"label": "neutral", "confidence": 0.7}


