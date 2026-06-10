const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:7860';

export async function newGame() {
  const res = await fetch(`${BASE}/api/new_game`, { method: 'POST' });
  if (!res.ok) throw new Error(`new_game failed: ${res.status}`);
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
  if (!res.ok) throw new Error(`get_move failed: ${res.status}`);
  return res.json();
}
