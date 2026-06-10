import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import Piece from './Piece';
import { EMPTY, isPlayerPiece, WHITE } from '../utils/checkers';
import { getDestinations } from '../utils/checkers';
import './Board.css';

export default function Board({
  board,
  selectedPiece,
  validMoves,
  lastMove,
  aiThinking,
  animatingStep,
  legalMoves,
  phase,
  onSquareClick,
}) {
  const boardRef = useRef(null);
  const [squareSize, setSquareSize] = useState(0);

  useLayoutEffect(() => {
    function measure() {
      if (boardRef.current) {
        setSquareSize(boardRef.current.clientWidth / 8);
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (boardRef.current) ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, []);

  const destinations = useMemo(
    () => (validMoves.length > 0 ? getDestinations(validMoves) : []),
    [validMoves],
  );

  const clickablePieces = useMemo(() => {
    if (phase !== 'human_turn' || !legalMoves) return new Set();
    const set = new Set();
    for (const m of legalMoves) {
      set.add(`${m[0][0]},${m[0][1]}`);
    }
    return set;
  }, [phase, legalMoves]);

  const animOffset = useMemo(() => {
    if (!animatingStep || !squareSize) return null;
    const [sr, sc, dr, dc] = animatingStep;
    return {
      srcR: sr,
      srcC: sc,
      dx: (dc - sc) * squareSize,
      dy: (dr - sr) * squareSize,
    };
  }, [animatingStep, squareSize]);

  const capturedSquare = useMemo(() => {
    if (!animatingStep) return null;
    const [sr, sc, dr, dc] = animatingStep;
    if (Math.abs(dr - sr) === 2) {
      return `${(sr + dr) / 2},${(sc + dc) / 2}`;
    }
    return null;
  }, [animatingStep]);

  if (!board) return null;

  const squares = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isDark = (r + c) % 2 === 1;
      const key = `${r},${c}`;
      const piece = board[r][c];

      const isSelected = selectedPiece && selectedPiece[0] === r && selectedPiece[1] === c;
      const isDest = destinations.some(([dr, dc]) => dr === r && dc === c);
      const isLastFrom = lastMove && lastMove.from[0] === r && lastMove.from[1] === c && !animatingStep;
      const isLastTo = lastMove && lastMove.to[0] === r && lastMove.to[1] === c && !animatingStep;
      const isClickable = clickablePieces.has(key) && piece !== EMPTY && isPlayerPiece(piece, WHITE);
      const isCaptured = capturedSquare === key;

      const isAnimSrc = animOffset && animOffset.srcR === r && animOffset.srcC === c;

      let squareClass = `square ${isDark ? 'dark' : 'light'}`;
      if (isSelected) squareClass += ' selected';
      if (isDest) squareClass += ' destination';
      if (isLastFrom) squareClass += ' last-from';
      if (isLastTo) squareClass += ' last-to';

      squares.push(
        <div
          key={key}
          className={squareClass}
          onClick={() => onSquareClick(r, c)}
        >
          {isDest && piece === EMPTY && (
            <div className="dest-dot" />
          )}

          {piece !== EMPTY && (
            <div
              className={`piece-wrap${isAnimSrc ? ' animating' : ''}${isCaptured ? ' captured' : ''}${isClickable ? ' clickable' : ''}`}
              style={
                isAnimSrc
                  ? { transform: `translate(${animOffset.dx}px, ${animOffset.dy}px)`, zIndex: 10 }
                  : undefined
              }
            >
              <Piece value={piece} />
            </div>
          )}
        </div>,
      );
    }
  }

  return (
    <div className={`board-container${aiThinking ? ' thinking' : ''}`}>
      <div className="board" ref={boardRef}>
        {squares}
      </div>
    </div>
  );
}
