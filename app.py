"""
FastAPI backend for AlphaZero Checkers — deployable on Hugging Face Spaces.

Endpoints:
  GET  /                   health check
  POST /api/new_game       initial board state + legal moves
  POST /api/legal_moves    legal moves & terminal check for a given state
  POST /api/get_move       run MCTS and return AI move + resulting state

Model loading (in order of precedence):
  1. Local file at MODEL_PATH env var   (default: checkpoints/model_latest.pt)
  2. HF Hub model repo at MODEL_REPO_ID env var  (e.g. "yourname/checkers-alphazero")
     - downloads model.pt from root of that repo
  3. Falls back to untrained random weights with a warning.
"""

import os
import logging
from enum import Enum
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rate_limit import check_rate_limit

from checkers_env import CheckersState
from neural_network import NetworkWrapper
from mcts import MCTS
from config import BLACK, WHITE

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AlphaZero Checkers API",
    description="MCTS + ResNet checkers engine. Pair with a Vercel frontend.",
    version="1.0.0",
)

# Allow all origins by default; set ALLOWED_ORIGINS env var to restrict
# e.g. ALLOWED_ORIGINS="https://my-checkers.vercel.app,https://my-checkers-git-main.vercel.app"
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------
MODEL_PATH = os.environ.get("MODEL_PATH", "checkpoints/model_latest.pt")
MODEL_REPO_ID = os.environ.get("MODEL_REPO_ID", "")   # e.g. "jayhan/checkers-alphazero"
MODEL_FILENAME = os.environ.get("MODEL_FILENAME", "model_latest.pt")

nnet = NetworkWrapper()
_model_loaded = False

def _try_load_local():
    if os.path.exists(MODEL_PATH):
        log.info(f"Loading model from local path: {MODEL_PATH}")
        nnet.load(MODEL_PATH)
        return True
    return False

def _try_load_hf_hub():
    if not MODEL_REPO_ID:
        return False
    try:
        from huggingface_hub import hf_hub_download
        log.info(f"Downloading model from HF Hub: {MODEL_REPO_ID}/{MODEL_FILENAME}")
        local_path = hf_hub_download(repo_id=MODEL_REPO_ID, filename=MODEL_FILENAME)
        nnet.load(local_path)
        return True
    except Exception as e:
        log.warning(f"HF Hub download failed: {e}")
        return False

if _try_load_local():
    _model_loaded = True
elif _try_load_hf_hub():
    _model_loaded = True
else:
    log.warning(
        "No trained model found. Using random (untrained) weights. "
        "Set MODEL_PATH or MODEL_REPO_ID env var."
    )

mcts_engine = MCTS(nnet)

DIFFICULTY_LEVELS = {
    "easy": 25,
    "medium": 100,
    "hard": 200,
    "harder": 400,
}

class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
    harder = "harder"

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class GameState(BaseModel):
    board: List[List[int]]          # 8×8 grid, values: 0=empty 1=B-man 2=B-king 3=W-man 4=W-king
    current_player: int             # 1 = BLACK (moves first), -1 = WHITE
    no_progress_count: int = 0
    move_count: int = 0

class MoveRequest(GameState):
    difficulty: Difficulty = Difficulty.medium

class StateResponse(BaseModel):
    board: List[List[int]]
    current_player: int
    no_progress_count: int
    move_count: int
    legal_moves: List[List[List[int]]]   # list of moves; each move = list of [sr,sc,dr,dc] steps
    is_terminal: bool
    winner: Optional[int]               # 1=BLACK wins, -1=WHITE wins, 0=draw, null=ongoing

class MoveResponse(StateResponse):
    # `move`/`move_index` are null when the requested state is already terminal
    # (the game ended on the caller's move) — see get_move below.
    move: Optional[List[List[int]]] = None   # the move played: [[sr,sc,dr,dc], ...]
    move_index: Optional[int] = None         # flattened index (src*32 + dst)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _deserialize(gs: GameState) -> CheckersState:
    board = np.array(gs.board, dtype=np.int8)
    if board.shape != (8, 8):
        raise HTTPException(status_code=422, detail="board must be 8×8")
    if gs.current_player not in (1, -1):
        raise HTTPException(status_code=422, detail="current_player must be 1 or -1")
    return CheckersState(
        board=board,
        current_player=gs.current_player,
        no_progress_count=gs.no_progress_count,
        move_count=gs.move_count,
    )

def _serialize_move(move) -> List[List[int]]:
    return [list(step) for step in move]

def _state_response(state: CheckersState, move=None, move_index=None) -> dict:
    terminal, winner = state.is_terminal()
    legal_moves = state.get_legal_moves() if not terminal else []
    payload = {
        "board": state.board.tolist(),
        "current_player": int(state.current_player),
        "no_progress_count": int(state.no_progress_count),
        "move_count": int(state.move_count),
        "legal_moves": [_serialize_move(m) for m in legal_moves],
        "is_terminal": terminal,
        "winner": int(winner) if terminal else None,
    }
    if move is not None:
        payload["move"] = _serialize_move(move)
        payload["move_index"] = int(move_index)
    return payload

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", summary="Health check")
def health():
    return {
        "status": "ok",
        "model_loaded": _model_loaded,
        "model_path": MODEL_PATH if _model_loaded else None,
        "model_repo": MODEL_REPO_ID or None,
        "difficulties": DIFFICULTY_LEVELS,
    }

@app.post("/api/new_game", response_model=StateResponse, summary="Start a new game")
def new_game():
    """Return the initial board state and all legal first moves."""
    state = CheckersState()
    return _state_response(state)

@app.post("/api/legal_moves", response_model=StateResponse, summary="Get legal moves for a state")
def legal_moves(gs: GameState):
    """Given a board state, return all legal moves and terminal status."""
    state = _deserialize(gs)
    return _state_response(state)

@app.post("/api/get_move", response_model=MoveResponse, summary="Get AI move via MCTS")
def get_move(req: MoveRequest, request: Request):
    """
    Run MCTS on the given board state and return the chosen move together with the
    resulting board state.  Pass `difficulty` (easy/medium/hard/harder) to control
    strength. The backend maps difficulty to simulation count.
    """
    state = _deserialize(req)

    # If the game already ended on the caller's move (e.g. the human captured the
    # AI's last piece), there is no move to make. Return the terminal state with a
    # null move instead of a 400 so the client can show its game-over screen. This
    # check is intentionally *before* rate limiting so a game-ending request does
    # not consume the caller's quota.
    terminal, _ = state.is_terminal()
    if terminal:
        return _state_response(state)

    check_rate_limit(request, "predict")

    sims = DIFFICULTY_LEVELS[req.difficulty.value]
    action, move, _pi = mcts_engine.get_action(
        state,
        temperature=0.0,
        num_simulations=sims,
        add_noise=False,
    )

    new_state = state.apply_move(move)
    return _state_response(new_state, move=move, move_index=action)


# ---------------------------------------------------------------------------
# Dev entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860, reload=False)
