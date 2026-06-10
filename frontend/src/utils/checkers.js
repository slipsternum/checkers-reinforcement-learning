export const EMPTY = 0;
export const BLACK_MAN = 1;
export const BLACK_KING = 2;
export const WHITE_MAN = 3;
export const WHITE_KING = 4;
export const BLACK = 1;
export const WHITE = -1;

export function isBlackPiece(v) {
  return v === BLACK_MAN || v === BLACK_KING;
}

export function isWhitePiece(v) {
  return v === WHITE_MAN || v === WHITE_KING;
}

export function isKing(v) {
  return v === BLACK_KING || v === WHITE_KING;
}

export function isPlayerPiece(v, player) {
  return player === BLACK ? isBlackPiece(v) : isWhitePiece(v);
}

export function applyMove(board, move) {
  const b = board.map(r => [...r]);
  for (const [sr, sc, dr, dc] of move) {
    b[dr][dc] = b[sr][sc];
    b[sr][sc] = EMPTY;
    if (Math.abs(dr - sr) === 2) {
      b[(sr + dr) / 2][(sc + dc) / 2] = EMPTY;
    }
    if (b[dr][dc] === BLACK_MAN && dr === 7) b[dr][dc] = BLACK_KING;
    if (b[dr][dc] === WHITE_MAN && dr === 0) b[dr][dc] = WHITE_KING;
  }
  return b;
}

export function nextGameState(state, move) {
  const hasCapture = move.some(([sr, , dr]) => Math.abs(dr - sr) === 2);
  return {
    board: applyMove(state.board, move),
    currentPlayer: -state.currentPlayer,
    moveCount: state.moveCount + 1,
    noProgressCount: hasCapture ? 0 : state.noProgressCount + 1,
  };
}

export function getMovesForPiece(legalMoves, row, col) {
  return legalMoves.filter(m => m[0][0] === row && m[0][1] === col);
}

export function getDestinations(moves) {
  return moves.map(m => {
    const last = m[m.length - 1];
    return [last[2], last[3]];
  });
}

export function findMoveToDestination(moves, destRow, destCol) {
  return moves.find(m => {
    const last = m[m.length - 1];
    return last[2] === destRow && last[3] === destCol;
  });
}

export function countPieces(board) {
  let blackMen = 0, blackKings = 0, whiteMen = 0, whiteKings = 0;
  for (const row of board) {
    for (const v of row) {
      if (v === BLACK_MAN) blackMen++;
      else if (v === BLACK_KING) blackKings++;
      else if (v === WHITE_MAN) whiteMen++;
      else if (v === WHITE_KING) whiteKings++;
    }
  }
  return { blackMen, blackKings, whiteMen, whiteKings };
}
