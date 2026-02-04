from __future__ import annotations

import time
from dataclasses import dataclass

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


@dataclass
class _Bucket:
  tokens: float
  updated_at: float


class RateLimitMiddleware(BaseHTTPMiddleware):
  """
  Simple in-memory token bucket per key.
  Intended for local dev; production rate limiting should be handled at API Gateway/WAF.
  """

  def __init__(
    self,
    app,
    enabled: bool,
    rps: float,
    burst: int,
    header_key: str = "x-user-id",
  ):
    super().__init__(app)
    self.enabled = enabled
    self.rps = float(rps)
    self.burst = int(burst)
    self.header_key = header_key
    self._buckets: dict[str, _Bucket] = {}

  def _key(self, request: Request) -> str:
    # Prefer user id header (gateway can inject). Fallback to client IP.
    h = request.headers.get(self.header_key)
    if h:
      return f"user:{h}"
    ip = request.client.host if request.client else "unknown"
    return f"ip:{ip}"

  def _consume(self, key: str) -> None:
    now = time.time()
    b = self._buckets.get(key)
    if not b:
      b = _Bucket(tokens=float(self.burst), updated_at=now)
      self._buckets[key] = b

    # Refill
    elapsed = max(0.0, now - b.updated_at)
    b.tokens = min(float(self.burst), b.tokens + elapsed * self.rps)
    b.updated_at = now

    if b.tokens < 1.0:
      raise HTTPException(status_code=429, detail="Rate limit exceeded")
    b.tokens -= 1.0

  async def dispatch(self, request: Request, call_next):
    if self.enabled and request.url.path not in ("/healthz", "/docs", "/openapi.json"):
      self._consume(self._key(request))
    resp: Response = await call_next(request)
    return resp


