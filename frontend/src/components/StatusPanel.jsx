import { countPieces } from '../utils/checkers';
import './StatusPanel.css';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'harder'];

export default function StatusPanel({
  board,
  phase,
  moveCount,
  difficulty,
  aiThinking,
  onDifficultyChange,
  onNewGame,
  onContinue,
}) {
  const counts = board ? countPieces(board) : null;

  let statusText = '';
  let statusClass = 'status';
  if (phase === 'loading') {
    statusText = 'Connecting to server...';
  } else if (phase === 'ai_thinking') {
    statusText = 'AI is thinking...';
    statusClass += ' thinking';
  } else if (phase === 'game_over') {
    statusText = 'Game over';
  } else {
    statusText = 'Your turn (White)';
    statusClass += ' your-turn';
  }

  return (
    <div className="status-panel">
      <h1 className="title">AlphaZero Checkers</h1>
      <p className="subtitle">ResNet + MCTS</p>

      <div className={statusClass}>{statusText}</div>

      {counts && (
        <div className="piece-counts">
          <div className="count-row">
            <span className="count-dot black" />
            <span>AI (Black)</span>
            <span className="count-nums">{counts.blackMen} + {counts.blackKings}K</span>
          </div>
          <div className="count-row">
            <span className="count-dot white" />
            <span>You (White)</span>
            <span className="count-nums">{counts.whiteMen} + {counts.whiteKings}K</span>
          </div>
        </div>
      )}

      <div className="info-row">Move {moveCount}</div>

      <div className="section-label">Difficulty</div>
      <div className="difficulty-btns">
        {DIFFICULTIES.map(d => (
          <button
            key={d}
            className={`diff-btn${difficulty === d ? ' active' : ''}`}
            onClick={() => onDifficultyChange(d)}
            disabled={aiThinking}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      <button className="new-game-btn" onClick={onNewGame} disabled={aiThinking}>
        New Game
      </button>

      <button
        className="continue-btn"
        onClick={onContinue}
        disabled={!board || phase === 'loading'}
        title="Get a link / QR code to resume this game on another device"
      >
        Continue on another device
      </button>

      <div className="controls-hint">
        Click a white piece, then click a destination.
      </div>
    </div>
  );
}
