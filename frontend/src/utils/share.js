// Encode/decode a resumable game position into a URL-safe string.
//
// The backend is fully stateless — the bot keeps no per-game memory — so the
// whole game can be resumed from just the position below. We do NOT embed move
// history here (that would bloat the URL); replay history is session-local.

const FIELDS = ['board', 'currentPlayer', 'moveCount', 'noProgressCount', 'difficulty'];

function toUrlSafe(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return b64 + pad;
}

export function encodeGame(state) {
  const compact = {
    b: state.board,
    p: state.currentPlayer,
    m: state.moveCount,
    n: state.noProgressCount,
    d: state.difficulty,
  };
  return toUrlSafe(btoa(JSON.stringify(compact)));
}

export function decodeGame(param) {
  const obj = JSON.parse(atob(fromUrlSafe(param)));
  const board = obj.b;
  // Validate shape so a malformed link fails loudly instead of corrupting state.
  if (!Array.isArray(board) || board.length !== 8 || board.some(r => !Array.isArray(r) || r.length !== 8)) {
    throw new Error('Invalid game data');
  }
  if (obj.p !== 1 && obj.p !== -1) throw new Error('Invalid game data');
  return {
    board,
    currentPlayer: obj.p,
    moveCount: typeof obj.m === 'number' ? obj.m : 0,
    noProgressCount: typeof obj.n === 'number' ? obj.n : 0,
    difficulty: typeof obj.d === 'string' ? obj.d : 'medium',
  };
}

export function buildShareUrl(state) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?state=${encodeGame(state)}`;
}

export { FIELDS };
