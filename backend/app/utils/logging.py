"""
Structured JSON logging compatible with Google Cloud Logging.
Log entries are formatted as JSON with timestamp, severity, message, and module.
"""
from __future__ import annotations
import json
import logging
import sys
from datetime import datetime, timezone


class CloudLoggingFormatter(logging.Formatter):
    """Formats log records as JSON compatible with Cloud Logging."""

    SEVERITY_MAP = {
        "DEBUG": "DEBUG",
        "INFO": "INFO",
        "WARNING": "WARNING",
        "ERROR": "ERROR",
        "CRITICAL": "CRITICAL",
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": self.SEVERITY_MAP.get(record.levelname, record.levelname),
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "funcName": record.funcName,
            "lineNo": record.lineno,
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "extra"):
            log_entry.update(record.extra)  # type: ignore[arg-type]
        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging(level: str = "INFO") -> None:
    """Configure root logger with Cloud Logging JSON formatter."""
    root = logging.getLogger()
    if root.handlers:
        # Already configured — update level only
        root.setLevel(getattr(logging, level.upper(), logging.INFO))
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(CloudLoggingFormatter())
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Suppress noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
