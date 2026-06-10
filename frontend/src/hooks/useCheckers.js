import { useState, useCallback, useRef, useEffect } from 'react';
import { newGame, getMove } from '../utils/api';
import { nextGameState, getMovesForPiece, findMoveToDestination, WHITE, EMPTY, BLACK_MAN, BLACK_KING, WHITE_MAN, WHITE_KING } from '../utils/checkers';

const HUMAN_COLOR = WHITE;
const STEP_DURATION = 300;

function parseApiState(data) {
  return {
    board: data.board,
    currentPlayer: data.current_player,
    moveCount: data.move_count,
    noProgressCount: data.no_progress_count,
    legalMoves: data.legal_moves,
    isTerminal: data.is_terminal,
    winner: data.winner,
  };
}

function applyOneStep(board, step) {
  const [sr, sc, dr, dc] = step;
  const b = board.map(r => [...r]);
  b[dr][dc] = b[sr][sc];
  b[sr][sc] = EMPTY;
  if (Math.abs(dr - sr) === 2) {
    b[(sr + dr) / 2][(sc + dc) / 2] = EMPTY;
  }
  if (b[dr][dc] === BLACK_MAN && dr === 7) b[dr][dc] = BLACK_KING;
  if (b[dr][dc] === WHITE_MAN && dr === 0) b[dr][dc] = WHITE_KING;
  return b;
}

export default function useCheckers() {
  const [board, setBoard] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [moveCount, setMoveCount] = useState(0);
  const [noProgressCount, setNoProgressCount] = useState(0);
  const [legalMoves, setLegalMoves] = useState([]);
  const [isTerminal, setIsTerminal] = useState(false);
  const [winner, setWinner] = useState(null);

  const [selectedPiece, setSelectedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [phase, setPhase] = useState('loading');
  const [difficulty, setDifficulty] = useState('medium');
  const [error, setError] = useState(null);
  const [animatingStep, setAnimatingStep] = useState(null);
  const [displayBoard, setDisplayBoard] = useState(null);

  const [retryCountdown, setRetryCountdown] = useState(null);
  const pendingAiState = useRef(null);
  const retryTimerRef = useRef(null);

  const diffRef = useRef(difficulty);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  const applyApiState = useCallback((data) => {
    const s = parseApiState(data);
    setBoard(s.board);
    setCurrentPlayer(s.currentPlayer);
    setMoveCount(s.moveCount);
    setNoProgressCount(s.noProgressCount);
    setLegalMoves(s.legalMoves);
    setIsTerminal(s.isTerminal);
    setWinner(s.winner);
    return s;
  }, []);

  const animateAndApply = useCallback((move, boardBefore, afterState, onDone) => {
    const steps = move;
    let stepIndex = 0;
    let currentBoard = boardBefore;

    function animateNextStep() {
      if (stepIndex >= steps.length) {
        setAnimatingStep(null);
        setDisplayBoard(null);
        setBoard(afterState.board);
        const first = steps[0];
        const last = steps[steps.length - 1];
        setLastMove({ from: [first[0], first[1]], to: [last[2], last[3]] });
        if (onDone) onDone();
        return;
      }

      const step = steps[stepIndex];
      setDisplayBoard(currentBoard);
      setAnimatingStep(step);

      setTimeout(() => {
        currentBoard = applyOneStep(currentBoard, step);
        stepIndex++;
        setDisplayBoard(currentBoard);
        setAnimatingStep(null);

        setTimeout(() => {
          animateNextStep();
        }, 50);
      }, STEP_DURATION);
    }

    animateNextStep();
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setRetryCountdown(null);
    pendingAiState.current = null;
  }, []);

  const requestAiMove = useCallback(async (state) => {
    setAiThinking(true);
    setPhase('ai_thinking');
    setError(null);
    clearRetryTimer();
    try {
      const data = await getMove(state, diffRef.current);
      const afterState = parseApiState(data);

      animateAndApply(data.move, state.board, afterState, () => {
        setCurrentPlayer(afterState.currentPlayer);
        setMoveCount(afterState.moveCount);
        setNoProgressCount(afterState.noProgressCount);
        setLegalMoves(afterState.legalMoves);
        setIsTerminal(afterState.isTerminal);
        setWinner(afterState.winner);
        setAiThinking(false);

        if (afterState.isTerminal) {
          setPhase('game_over');
        } else {
          setPhase('human_turn');
        }
      });
    } catch (e) {
      if (e.message === 'rate_limit') {
        pendingAiState.current = state;
        let remaining = e.retryAfter;
        setRetryCountdown(remaining);
        setError('rate_limit');
        retryTimerRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            clearInterval(retryTimerRef.current);
            retryTimerRef.current = null;
            setRetryCountdown(null);
            const s = pendingAiState.current;
            pendingAiState.current = null;
            if (s) requestAiMove(s);
          } else {
            setRetryCountdown(remaining);
          }
        }, 1000);
      } else {
        setError(e.message);
        setAiThinking(false);
        setPhase('human_turn');
      }
    }
  }, [animateAndApply, clearRetryTimer]);

  const startGame = useCallback(async () => {
    setPhase('loading');
    setError(null);
    clearRetryTimer();
    setSelectedPiece(null);
    setValidMoves([]);
    setLastMove(null);
    setAnimatingStep(null);
    setDisplayBoard(null);

    try {
      const data = await newGame();
      const s = applyApiState(data);

      if (s.currentPlayer !== HUMAN_COLOR && !s.isTerminal) {
        await requestAiMove({
          board: s.board,
          currentPlayer: s.currentPlayer,
          moveCount: s.moveCount,
          noProgressCount: s.noProgressCount,
        });
      } else {
        setPhase(s.isTerminal ? 'game_over' : 'human_turn');
      }
    } catch (e) {
      setError(e.message);
      setPhase('loading');
    }
  }, [applyApiState, requestAiMove]);

  const selectSquare = useCallback((row, col) => {
    if (phase !== 'human_turn') return;

    if (selectedPiece) {
      const move = findMoveToDestination(validMoves, row, col);
      if (move) {
        const state = { board, currentPlayer, moveCount, noProgressCount };
        const after = nextGameState(state, move);

        setSelectedPiece(null);
        setValidMoves([]);

        animateAndApply(move, board, after, () => {
          setCurrentPlayer(after.currentPlayer);
          setMoveCount(after.moveCount);
          setNoProgressCount(after.noProgressCount);

          if (after.currentPlayer !== HUMAN_COLOR) {
            requestAiMove(after);
          }
        });
        return;
      }
    }

    const pieceMoves = getMovesForPiece(legalMoves, row, col);
    if (pieceMoves.length > 0) {
      setSelectedPiece([row, col]);
      setValidMoves(pieceMoves);
    } else {
      setSelectedPiece(null);
      setValidMoves([]);
    }
  }, [phase, selectedPiece, validMoves, board, currentPlayer, moveCount,
      noProgressCount, legalMoves, animateAndApply, requestAiMove]);

  return {
    board: displayBoard ?? board,
    currentPlayer,
    moveCount,
    legalMoves,
    isTerminal,
    winner,
    selectedPiece,
    validMoves,
    lastMove,
    aiThinking,
    phase,
    difficulty,
    error,
    animatingStep,
    startGame,
    selectSquare,
    setDifficulty,
    retryCountdown,
  };
}
