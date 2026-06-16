import { useEffect, useRef, useState } from 'react';
import useCheckers from './hooks/useCheckers';
import Board from './components/Board';
import StatusPanel from './components/StatusPanel';
import GameOverModal from './components/GameOverModal';
import ContinueDialog from './components/ContinueDialog';
import ReplayViewer from './components/ReplayViewer';
import './App.css';

export default function App() {
  const game = useCheckers();
  const [showContinue, setShowContinue] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Resume a shared game if the URL carries one, then strip the query so a
    // refresh starts fresh. Otherwise start a normal new game.
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    if (state) {
      game.loadGame(state);
      window.history.replaceState({}, '', `${window.location.origin}${window.location.pathname}`);
    } else {
      game.startGame();
    }
  }, [game]);

  const newGame = () => {
    setShowReplay(false);
    setShowContinue(false);
    game.startGame();
  };

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
          onNewGame={newGame}
          onContinue={() => setShowContinue(true)}
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
        <GameOverModal
          winner={game.winner}
          onNewGame={newGame}
          onShare={() => setShowContinue(true)}
          onReplay={() => setShowReplay(true)}
        />
      )}
      {showContinue && (
        <ContinueDialog shareState={game.shareState} onClose={() => setShowContinue(false)} />
      )}
      {showReplay && game.history.length > 0 && (
        <ReplayViewer
          history={game.history}
          winner={game.winner}
          shareState={game.shareState}
          onClose={() => setShowReplay(false)}
        />
      )}
    </div>
  );
}
