import logging
import sys
from app.core.config import settings


def setup_logging():
    level = logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO
    fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    logging.basicConfig(stream=sys.stdout, level=level, format=fmt)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
