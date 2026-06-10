"""Rate-limit adapter (anti-spam) over the shared engine.

The engine (`rate_limit_engine.py`) is vendored from
DOCS/shared/rate-limit/engine/fastapi/. This adapter supplies the project slug and
its single inference bucket; the engine handles X-Forwarded-For, central config,
event mode, the kill switch (503), caching, and fail-open. DAP tuning is anti-spam
(short window, higher threshold) — one IP shouldn't monopolise the single worker.
"""

from __future__ import annotations

import os

from rate_limit_engine import RateLimiter

limiter = RateLimiter(
    # Slug = full project folder name (canonical identifier across code + sheet).
    project="dap-ay2526-checkers-reinforcement-learning",
    buckets={"predict": int(os.getenv("RATE_LIMIT_PREDICT_MAX", "20"))},
    redis_url=os.getenv("UPSTASH_REDIS_REST_URL", os.getenv("UPSTASH_REDIS_URL", "")),
    redis_token=os.getenv("UPSTASH_REDIS_REST_TOKEN", os.getenv("UPSTASH_REDIS_TOKEN", "")),
    default_window=int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")),
)


def check_rate_limit(request, bucket: str = "predict") -> None:
    """Raise 503 if the demo is paused, or 429 if the caller is over the limit."""
    limiter.enforce(request, bucket)
