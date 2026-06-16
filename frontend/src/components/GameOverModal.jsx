import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { WHITE, BLACK } from '../utils/checkers';
import './GameOverModal.css';

// CTA metadata, mirroring the AI Lodge SHOWCASE_PROJECTS registry pattern.
const LINKS = {
  joinDap: 'https://www.smubia.com/dap',
  showcase: 'https://www.smubia.com/showcase',
  github: 'https://github.com/smubia-projects/dap-ay2526-checkers-reinforcement-learning',
};

const OUTCOMES = {
  win: {
    emoji: '🎉',
    accent: '#3fae6b',
    accent2: '#7be0a0',
    headline: 'You beat AlphaZero!',
    sub: 'You just outplayed a self-trained reinforcement-learning bot. Want to build cool stuff like this?',
  },
  lose: {
    emoji: '🤖',
    accent: '#b8504d',
    accent2: '#e57373',
    headline: 'AlphaZero wins this one',
    sub: 'The bot got the better of you. Try a lower difficulty — or come learn how it works.',
  },
  draw: {
    emoji: '🤝',
    accent: '#b59225',
    accent2: '#ffd54f',
    headline: "It's a draw",
    sub: 'Evenly matched — no captures or promotions for 80 moves. Fancy a rematch?',
  },
};

function outcomeKey(winner) {
  if (winner === WHITE) return 'win';
  if (winner === BLACK) return 'lose';
  return 'draw';
}

export default function GameOverModal({ winner, onNewGame, onReplay }) {
  const key = outcomeKey(winner);
  const o = OUTCOMES[key];
  const gradient = `linear-gradient(135deg, ${o.accent}, ${o.accent2})`;

  useEffect(() => {
    if (key !== 'win') return;
    const fire = (opts) => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, zIndex: 200, ...opts });
    fire({ angle: 60, origin: { x: 0, y: 0.7 } });
    fire({ angle: 120, origin: { x: 1, y: 0.7 } });
    fire({ particleCount: 130, spread: 100, origin: { y: 0.45 } });
    const t = setTimeout(() => fire({ particleCount: 70, spread: 120, startVelocity: 38 }), 350);
    return () => clearTimeout(t);
  }, [key]);

  return (
    <div className="gom-backdrop">
      <div className="gom-card" role="dialog" aria-modal="true" aria-label={o.headline}>
        <div className="gom-banner" style={{ background: gradient }}>
          <span className="gom-circle c1" />
          <span className="gom-circle c2" />
          <span className="gom-circle c3" />
          <div className="gom-emoji">{o.emoji}</div>
          <h2 className="gom-headline">{o.headline}</h2>
          <p className="gom-sub">{o.sub}</p>
        </div>

        <div className="gom-body">
          <a className="gom-btn primary" style={{ background: gradient }}
             href={LINKS.joinDap} target="_blank" rel="noopener noreferrer">
            <span>Join DAP</span><span className="gom-arrow">→</span>
          </a>
          <a className="gom-btn secondary"
             href={LINKS.showcase} target="_blank" rel="noopener noreferrer">
            <span>Explore other projects</span><span className="gom-arrow">→</span>
          </a>
          <a className="gom-btn secondary"
             href={LINKS.github} target="_blank" rel="noopener noreferrer">
            <span>View on GitHub</span><span className="gom-arrow">→</span>
          </a>

          <div className="gom-actions">
            <button className="gom-action" onClick={onNewGame}>New Game</button>
            <button className="gom-action" onClick={onReplay}>Watch Replay</button>
          </div>
        </div>
      </div>
    </div>
  );
}
