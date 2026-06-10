import { useEffect } from 'react';
import useCheckers from './hooks/useCheckers';
import Board from './components/Board';
import StatusPanel from './components/StatusPanel';
import GameOverModal from './components/GameOverModal';
import './App.css';

export default function App() {
  const game = useCheckers();

  useEffect(() => {
    game.startGame();
  }, []);

  return (
    <div className="app">
      <div className="game-layout">
        <Board
          board={game.board}
          selectedPiece={game.selectedPiece}
          validMoves={game.validMoves}
          lastMove={game.lastMove}
          aiThinking={game.aiThinking}
          animatingStep={game.animatingStep}
          legalMoves={game.legalMoves}
          phase={game.phase}
          onSquareClick={game.selectSquare}
        />
        <StatusPanel
          board={game.board}
          phase={game.phase}
          moveCount={game.moveCount}
          difficulty={game.difficulty}
          aiThinking={game.aiThinking}
          onDifficultyChange={game.setDifficulty}
          onNewGame={game.startGame}
        />
      </div>
      {game.error && (
        <div className={`error-bar${game.error === 'rate_limit' ? ' rate-limit' : ''}`}>
          <span>
            {game.error === 'rate_limit'
              ? `Too many requests — retrying in ${game.retryCountdown ?? '…'}s`
              : `Connection error: ${game.error}`}
          </span>
          {game.error !== 'rate_limit' && (
            <button onClick={game.startGame}>Retry</button>
          )}
        </div>
      )}
      {game.phase === 'game_over' && (
        <GameOverModal winner={game.winner} onNewGame={game.startGame} />
      )}
    </div>
  );
}
