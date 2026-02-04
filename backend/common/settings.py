from pydantic_settings import BaseSettings, SettingsConfigDict


class CommonSettings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", extra="ignore")

  service_name: str = "backend-service"
  environment: str = "local"

  # Auth (in AWS, validated at API Gateway; services can still validate if needed)
  disable_auth: bool = True
  jwks_url: str | None = None
  issuer: str | None = None
  audience: str | None = None

  # Rate limiting (local / service-level; production usually at API Gateway)
  rate_limit_enabled: bool = True
  rate_limit_rps: float = 30.0
  rate_limit_burst: int = 60

  # CORS
  cors_allow_origins: str = "*"


