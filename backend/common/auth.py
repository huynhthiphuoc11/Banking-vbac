from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Optional

import httpx
import jwt
from fastapi import Depends, HTTPException, Request

from .settings import CommonSettings


@dataclass
class _JWKSCache:
  jwks_url: str
  ttl_seconds: int = 300
  _fetched_at: float = 0.0
  _keys_by_kid: dict[str, dict[str, Any]] | None = None

  def _expired(self) -> bool:
    return not self._keys_by_kid or (time.time() - self._fetched_at) > self.ttl_seconds

  def get_key(self, kid: str) -> dict[str, Any] | None:
    if self._expired():
      self.refresh()
    if not self._keys_by_kid:
      return None
    return self._keys_by_kid.get(kid)

  def refresh(self) -> None:
    with httpx.Client(timeout=4.0) as client:
      r = client.get(self.jwks_url)
      r.raise_for_status()
      jwks = r.json()
    keys = jwks.get("keys", [])
    self._keys_by_kid = {k.get("kid"): k for k in keys if k.get("kid")}
    self._fetched_at = time.time()


_cache: _JWKSCache | None = None


def _get_cache(jwks_url: str) -> _JWKSCache:
  global _cache
  if _cache is None or _cache.jwks_url != jwks_url:
    _cache = _JWKSCache(jwks_url=jwks_url)
  return _cache


def verify_jwt_token(token: str, settings: CommonSettings) -> dict[str, Any]:
  if not settings.jwks_url:
    raise HTTPException(status_code=500, detail="JWKS_URL is not configured")

  try:
    header = jwt.get_unverified_header(token)
  except Exception:
    raise HTTPException(status_code=401, detail="Invalid JWT header")

  kid = header.get("kid")
  if not kid:
    raise HTTPException(status_code=401, detail="JWT missing kid")

  jwk = _get_cache(settings.jwks_url).get_key(kid)
  if not jwk:
    # refresh once and retry
    cache = _get_cache(settings.jwks_url)
    cache.refresh()
    jwk = cache.get_key(kid)
  if not jwk:
    raise HTTPException(status_code=401, detail="Unknown JWT kid")

  public_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)  # type: ignore[arg-type]
  options = {"verify_aud": bool(settings.audience)}

  try:
    claims = jwt.decode(
      token,
      key=public_key,
      algorithms=["RS256"],
      audience=settings.audience,
      issuer=settings.issuer,
      options=options,
      leeway=10,
    )
  except jwt.ExpiredSignatureError:
    raise HTTPException(status_code=401, detail="JWT expired")
  except jwt.InvalidTokenError:
    raise HTTPException(status_code=401, detail="JWT invalid")

  return claims


def require_auth(settings: CommonSettings):
  """
  FastAPI dependency.
  In local mode you can set DISABLE_AUTH=true to bypass verification.
  """

  async def _dep(request: Request) -> dict[str, Any]:
    if settings.disable_auth:
      return {"sub": "local-user", "scope": "local"}

    auth = request.headers.get("authorization") or ""
    if not auth.lower().startswith("bearer "):
      raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")
    token = auth.split(" ", 1)[1].strip()
    return verify_jwt_token(token, settings)

  return _dep


