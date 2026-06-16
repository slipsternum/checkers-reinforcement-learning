const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:7860';

export async function newGame() {
  const res = await fetch(`${BASE}/api/new_game`, { method: 'POST' });
  if (!res.ok) throw new Error(`new_game failed: ${res.status}`);
  return res.json();
}

// Rehydrate legal moves / terminal status for an arbitrary position. Used when
// loading a shared game — this endpoint is not rate-limited and does not run the bot.
export async function getLegalMoves(state) {
  const res = await fetch(`${BASE}/api/legal_moves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board: state.board,
      current_player: state.currentPlayer,
      no_progress_count: state.noProgressCount,
      move_count: state.moveCount,
    }),
  });
  if (!res.ok) throw new Error(`legal_moves failed: ${res.status}`);
  return res.json();
}

export async function getMove(state, difficulty = 'medium') {
  const res = await fetch(`${BASE}/api/get_move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board: state.board,
      current_player: state.currentPlayer,
      no_progress_count: state.noProgressCount,
      move_count: state.moveCount,
      difficulty,
    }),
  });
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const err = new Error('rate_limit');
    // Engine 429 carries no retry_after; fall back to the default 60s window.
    err.retryAfter = body.retry_after ?? 60;
    throw err;
  }
  // 503 = demo paused via the central kill switch (distinct from 429 "slow down").
  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail?.message ?? 'This demo is temporarily paused. Check back soon.');
  }
  if (!res.ok) throw new Error(`get_move failed: ${res.status}`);
  return res.json();
}
