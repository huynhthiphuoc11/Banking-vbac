from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class SafetyResult:
  allowed: bool
  reasons: list[str]
  redacted_text: str


PII_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
  ("email", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)),
  ("phone", re.compile(r"\b(\+?\d[\d\s\-().]{7,}\d)\b", re.I)),
]


def redact_pii(text: str) -> tuple[str, list[str]]:
  reasons: list[str] = []
  redacted = text
  for name, pat in PII_PATTERNS:
    if pat.search(redacted):
      reasons.append(f"pii:{name}")
      redacted = pat.sub("[REDACTED]", redacted)
  return redacted, reasons


def detect_prompt_injection(text: str) -> list[str]:
  t = text.lower()
  hits: list[str] = []
  if "ignore previous" in t or "system prompt" in t:
    hits.append("prompt_injection")
  if "exfiltrate" in t or "leak" in t:
    hits.append("data_exfiltration")
  return hits


def safety_filter_user_input(text: str) -> SafetyResult:
  redacted, pii = redact_pii(text)
  inj = detect_prompt_injection(redacted)
  reasons = pii + inj
  # We keep allowed=True but annotate reasons; policy can tighten later.
  return SafetyResult(allowed=True, reasons=reasons, redacted_text=redacted)


def enforce_no_autodecision(output_text: str) -> str:
  """
  Ensures assistant output stays in recommendation-only mode.
  In production: use a classifier + policy engine. Here: add a standard disclaimer.
  """
  disclaimer = (
    "\n\nDisclaimer: This is informational guidance, not a financial decision. "
    "Please consult a qualified advisor before acting."
  )
  if "Disclaimer:" in output_text:
    return output_text
  return output_text + disclaimer


