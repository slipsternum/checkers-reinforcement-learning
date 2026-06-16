import { useEffect, useRef, useState } from 'react';
import Board from './Board';
import { buildReplayGifBlob, downloadGifBlob, canShareGif, shareReplayGif } from '../utils/replayGif';
import { buildShareUrl } from '../utils/share';
import './ReplayViewer.css';

const SPEEDS = [
  { label: '0.5×', ms: 1400 },
  { label: '1×', ms: 700 },
  { label: '2×', ms: 350 },
];

function lastMoveOf(frame) {
  if (!frame || !frame.move || !frame.move.length) return null;
  const m = frame.move;
  return { from: [m[0][0], m[0][1]], to: [m[m.length - 1][2], m[m.length - 1][3]] };
}

export default function ReplayViewer({ history, winner, shareState, onClose }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(null);   // 'download' | 'share' | null
  const [failed, setFailed] = useState(false);
  const timerRef = useRef(null);
  const gifBlobRef = useRef(null);          // encode the GIF at most once, reuse for both actions
  const [shareSupported] = useState(canShareGif);  // feature-detected once on mount

  const total = history.length;
  const frame = history[idx];

  useEffect(() => {
    if (!playing) return;
    if (idx >= total - 1) { setPlaying(false); return; }
    timerRef.current = setTimeout(() => setIdx(i => Math.min(i + 1, total - 1)), SPEEDS[speed].ms);
    return () => clearTimeout(timerRef.current);
  }, [playing, idx, speed, total]);

  const togglePlay = () => {
    if (idx >= total - 1) { setIdx(0); setPlaying(true); }
    else setPlaying(p => !p);
  };

  const shareUrl = buildShareUrl(shareState);

  const ensureBlob = async () => {
    if (!gifBlobRef.current) {
      gifBlobRef.current = await buildReplayGifBlob({ history, winner, shareUrl });
    }
    return gifBlobRef.current;
  };

  const onDownload = async () => {
    setBusy('download');
    setFailed(false);
    try {
      downloadGifBlob(await ensureBlob());
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    setBusy('share');
    setFailed(false);
    try {
      await shareReplayGif(await ensureBlob(), { winner, shareUrl });
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rv-backdrop" onClick={onClose}>
      <div className="rv-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Game replay">
        <div className="rv-head">
          <h3 className="rv-title">Game Replay</h3>
          <button className="rv-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="rv-board">
          <Board
            board={frame.board}
            selectedPiece={null}
            validMoves={[]}
            lastMove={lastMoveOf(frame)}
            aiThinking={false}
            animatingStep={null}
            legalMoves={[]}
            phase="replay"
            onSquareClick={() => {}}
          />
        </div>

        <div className="rv-caption">
          {idx === 0 ? 'Starting position' : `Move ${frame.moveCount} — ${frame.player === -1 ? 'You' : 'AlphaZero'}`}
          <span className="rv-counter">{idx} / {total - 1}</span>
        </div>

        <input
          className="rv-scrub"
          type="range"
          min={0}
          max={total - 1}
          value={idx}
          onChange={e => { setPlaying(false); setIdx(Number(e.target.value)); }}
        />

        <div className="rv-controls">
          <button className="rv-btn" onClick={() => { setPlaying(false); setIdx(i => Math.max(0, i - 1)); }} aria-label="Previous move">◀</button>
          <button className="rv-btn play" onClick={togglePlay}>
            {idx >= total - 1 ? '↺ Replay' : (playing ? '❚❚ Pause' : '▶ Play')}
          </button>
          <button className="rv-btn" onClick={() => { setPlaying(false); setIdx(i => Math.min(total - 1, i + 1)); }} aria-label="Next move">▶</button>
          <div className="rv-speeds">
            {SPEEDS.map((s, i) => (
              <button key={s.label} className={`rv-speed${i === speed ? ' active' : ''}`} onClick={() => setSpeed(i)}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="rv-export">
          <button className="rv-download" onClick={onDownload} disabled={busy !== null}>
            {busy === 'download' ? 'Generating GIF…' : '⬇ Download GIF'}
          </button>
          {shareSupported && (
            <button className="rv-download rv-share" onClick={onShare} disabled={busy !== null}>
              {busy === 'share' ? 'Preparing…' : '↗ Share GIF'}
            </button>
          )}
        </div>
        <p className="rv-hint">
          {failed ? 'Something went wrong — try again.' : 'Share the GIF to show off your game.'}
        </p>
      </div>
    </div>
  );
}
