# ── Hugging Face Spaces — Docker SDK ─────────────────────────────────────────
# HF Spaces expects port 7860 and a non-root user (uid 1000).
#
# Model loading strategy (pick one):
#   A) HF Hub (recommended for Spaces) — set MODEL_REPO_ID secret in the Space UI
#   B) Bundle locally — uncomment the "COPY checkpoints/" block below
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer-cached when requirements don't change)
COPY requirements_space.txt .
RUN pip install --no-cache-dir -r requirements_space.txt

# Copy game-engine + API files (no pygame_gui, trainer, arena, etc.)
COPY config.py          .
COPY checkers_env.py    .
COPY neural_network.py  .
COPY mcts.py            .
COPY rate_limit.py      .
COPY app.py             .

# ── Option B: bundle model checkpoint directly ────────────────────────────────
# Uncomment if you want to ship the model in the image.
# Make sure checkpoints/model_latest.pt exists in your repo (use git-lfs for
# large files, or rename to whatever MODEL_PATH points to).
#
# RUN mkdir -p checkpoints
# COPY checkpoints/model_latest.pt ./checkpoints/model_latest.pt

# Create empty checkpoints dir so the path exists even when using HF Hub loading
RUN mkdir -p checkpoints

# ── HF Spaces non-root user (uid 1000) ───────────────────────────────────────
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH

# ── Environment variable reference ───────────────────────────────────────────
# Set these under Space → Settings → Variables and secrets:
#
#   MODEL_REPO_ID       HF Hub model repo, e.g. "yourname/checkers-alphazero"
#   MODEL_FILENAME      filename in that repo       (default: model_latest.pt)
#   MODEL_PATH          local path fallback          (default: checkpoints/model_latest.pt)
#   ALLOWED_ORIGINS     comma-separated CORS origins (default: *, restrict to Vercel URL)
#   UPSTASH_REDIS_REST_URL   Upstash REST URL (rate limiting disabled if unset)
#   UPSTASH_REDIS_REST_TOKEN Upstash REST token (short names without REST_ also work)
#   RATE_LIMIT_MAX_REQUESTS   max requests per window per IP (default: 20)
#   RATE_LIMIT_WINDOW_SECONDS window duration in seconds     (default: 60)
#
ENV MODEL_PATH="checkpoints/model_latest.pt"

EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
