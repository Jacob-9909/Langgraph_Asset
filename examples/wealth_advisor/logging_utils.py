"""로깅 기본 설정."""

from __future__ import annotations

import logging
import os


def configure_logging() -> None:
    if logging.root.handlers:
        return
    level_name = (os.environ.get("LOG_LEVEL") or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
