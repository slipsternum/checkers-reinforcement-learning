import { isBlackPiece, isKing, EMPTY } from '../utils/checkers';

export default function Piece({ value }) {
  if (value === EMPTY) return null;

  const isBlack = isBlackPiece(value);
  const crowned = isKing(value);

  return (
    <svg viewBox="0 0 100 100" className="piece-svg">
      <circle cx={53} cy={54} r={40} fill="rgba(0,0,0,0.35)" />
      <circle
        cx={50} cy={50} r={40}
        fill={isBlack ? '#1a1a1a' : '#f0e6d2'}
        stroke={isBlack ? '#555' : '#b5a48a'}
        strokeWidth={3}
      />
      <circle
        cx={50} cy={50} r={30}
        fill="none"
        stroke={isBlack ? '#444' : '#c8b99a'}
        strokeWidth={1.2}
      />
      {crowned && (
        <text
          x={50} y={51}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={38}
          fill="#ffd700"
          fontWeight={700}
        >
          ♛
        </text>
      )}
    </svg>
  );
}
