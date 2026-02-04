from __future__ import annotations

import json
import logging
import sys
import time
from typing import Any


class JsonFormatter(logging.Formatter):
  def format(self, record: logging.LogRecord) -> str:
    payload: dict[str, Any] = {
      "ts": int(time.time() * 1000),
      "level": record.levelname,
      "logger": record.name,
      "msg": record.getMessage(),
    }
    if record.exc_info:
      payload["exc_info"] = self.formatException(record.exc_info)
    return json.dumps(payload, ensure_ascii=False)


def configure_logging(service_name: str) -> None:
  root = logging.getLogger()
  root.setLevel(logging.INFO)
  handler = logging.StreamHandler(sys.stdout)
  handler.setFormatter(JsonFormatter())
  root.handlers = [handler]
  logging.getLogger(service_name).info("logging_configured")


