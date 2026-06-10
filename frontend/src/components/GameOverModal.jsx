import { WHITE, BLACK } from '../utils/checkers';
import './GameOverModal.css';

export default function GameOverModal({ winner, onNewGame }) {
  let heading, message, headingClass;
  if (winner === 0 || winner === null) {
    heading = 'Draw';
    message = 'The game ended in a draw — no captures or promotions for 80 moves.';
    headingClass = 'draw';
  } else if (winner === WHITE) {
    heading = 'You Win!';
    message = 'Congratulations — you beat the AlphaZero AI.';
    headingClass = 'win';
  } else {
    heading = 'AI Wins';
    message = 'The AlphaZero AI won this round. Try a lower difficulty or try again!';
    headingClass = 'lose';
  }

  return (
    <div className="modal-backdrop" onClick={onNewGame}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className={`modal-heading ${headingClass}`}>{heading}</h2>
        <p className="modal-msg">{message}</p>
        <button className="modal-btn" onClick={onNewGame}>Play Again</button>
      </div>
    </div>
  );
}
