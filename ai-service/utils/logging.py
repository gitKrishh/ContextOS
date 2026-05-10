from __future__ import annotations

import json
import logging
from typing import Any


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO)


def logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def info(log: logging.Logger, event: str, **fields: Any) -> None:
    payload = {"event": event, **fields}
    log.info(json.dumps(payload))
