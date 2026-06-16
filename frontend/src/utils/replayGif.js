// Render a game's move history into a shareable animated GIF.
//
// Self-contained canvas renderer (does not reuse the SVG Piece/Board components)
// + gifenc encoder. A checkers board has only a handful of colours, so 256-colour
// quantisation is visually lossless and the file stays small. Branded intro/outro
// frames are added to boost outreach when the clip is shared.

import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import {
  EMPTY, BLACK_MAN, BLACK_KING, WHITE_KING, WHITE, BLACK,
} from './checkers';

const CELL = 60;
const BOARD = CELL * 8;            // 480
const CAPTION_H = 44;
const W = BOARD;
const H = BOARD + CAPTION_H;

// Colours mirror the live board / pieces.
const LIGHT = '#e8d5b7';
const DARK = '#654321';
const HILITE = 'rgba(255, 235, 80, 0.45)';
const CAPTION_BG = '#2a2a2f';
const CAPTION_FG = '#f0f0f0';

function drawCaption(ctx, text, accent) {
  ctx.fillStyle = CAPTION_BG;
  ctx.fillRect(0, BOARD, W, CAPTION_H);
  ctx.fillStyle = accent || CAPTION_FG;
  ctx.font = '600 18px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, BOARD + CAPTION_H / 2);
}

function drawPiece(ctx, value, cx, cy) {
  if (value === EMPTY) return;
  const isBlack = value === BLACK_MAN || value === BLACK_KING;
  const isKing = value === BLACK_KING || value === WHITE_KING;
  const r = CELL * 0.4;

  // drop shadow
  ctx.beginPath();
  ctx.arc(cx + 1.5, cy + 2, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = isBlack ? '#1a1a1a' : '#f0e6d2';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isBlack ? '#555' : '#b5a48a';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = isBlack ? '#444' : '#c8b99a';
  ctx.stroke();

  if (isKing) {
    ctx.fillStyle = '#ffd700';
    ctx.font = `${Math.round(CELL * 0.42)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♛', cx, cy + 1);
  }
}

function drawBoardFrame(ctx, board, move, caption, accent) {
  // squares
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 === 1 ? DARK : LIGHT;
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }
  // last-move highlight
  if (move && move.length) {
    const from = [move[0][0], move[0][1]];
    const to = [move[move.length - 1][2], move[move.length - 1][3]];
    ctx.fillStyle = HILITE;
    ctx.fillRect(from[1] * CELL, from[0] * CELL, CELL, CELL);
    ctx.fillRect(to[1] * CELL, to[0] * CELL, CELL, CELL);
  }
  // pieces
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      drawPiece(ctx, board[r][c], c * CELL + CELL / 2, r * CELL + CELL / 2);
    }
  }
  drawCaption(ctx, caption, accent);
}

function drawTextCard(ctx, lines) {
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const total = lines.reduce((a, l) => a + l.size + 14, 0);
  let y = (H - total) / 2 + lines[0].size / 2;
  for (const l of lines) {
    ctx.fillStyle = l.color;
    ctx.font = `${l.weight || 600} ${l.size}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(l.text, W / 2, y);
    y += l.size + 14;
  }
}

function resultText(winner) {
  if (winner === WHITE) return { text: 'You Win! 🎉', color: '#81c784' };
  if (winner === BLACK) return { text: 'AlphaZero Wins', color: '#e57373' };
  return { text: 'Draw', color: '#ffd54f' };
}

function addFrame(gif, ctx, delay) {
  const { data } = ctx.getImageData(0, 0, W, H);
  const palette = quantize(data, 256);
  const index = applyPalette(data, palette);
  gif.writeFrame(index, W, H, { palette, delay });
}

const GIF_FILENAME = 'checkers-replay.gif';

/**
 * Build an animated GIF of the game and return it as a Blob (the caller decides
 * whether to download or share it).
 * @param {Object} opts
 * @param {Array}  opts.history  frames of { board, move, player, moveCount }
 * @param {number} opts.winner   WHITE / BLACK / 0
 * @param {string} opts.shareUrl public URL to advertise in the outro
 */
export async function buildReplayGifBlob({ history, winner, shareUrl }) {
  if (!history || history.length === 0) throw new Error('No game to record');

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const gif = GIFEncoder();

  const host = shareUrl ? shareUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : 'this demo';

  // Intro
  drawTextCard(ctx, [
    { text: 'AlphaZero Checkers', size: 34, weight: 700, color: '#f0f0f0' },
    { text: 'A DAP reinforcement-learning demo', size: 18, color: '#aaa' },
    { text: 'Can you beat the bot?', size: 20, color: '#81c784' },
  ]);
  addFrame(gif, ctx, 1600);

  // Moves
  history.forEach((frame, i) => {
    const caption = i === 0 ? 'Start' : `Move ${frame.moveCount}`;
    drawBoardFrame(ctx, frame.board, frame.move, caption);
    addFrame(gif, ctx, i === history.length - 1 ? 1400 : 650);
  });

  // Outro
  const res = resultText(winner);
  drawTextCard(ctx, [
    { text: res.text, size: 38, weight: 700, color: res.color },
    { text: 'Play it yourself at', size: 18, color: '#aaa' },
    { text: host, size: 20, weight: 600, color: '#5a8ec8' },
    { text: 'Build cool stuff like this — Join DAP', size: 16, color: '#aaa' },
  ]);
  addFrame(gif, ctx, 3200);

  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

/** Trigger a browser download of an already-built GIF blob. */
export function downloadGifBlob(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = GIF_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Whether this device/browser can share a GIF file via the native share sheet. */
export function canShareGif() {
  try {
    const probe = new File([new Blob()], GIF_FILENAME, { type: 'image/gif' });
    return !!navigator.canShare && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Caption with a tone that matches the game's outcome. */
export function replayShareCaption(winner, shareUrl) {
  const url = shareUrl || '';
  if (winner === WHITE) {
    return `I just beat AlphaZero at checkers! 🎉 Think you can too? Play: ${url}`;
  }
  if (winner === BLACK) {
    return `AlphaZero just beat me at checkers 🤖 Bet you can't do better — try: ${url}`;
  }
  return `Dead heat with AlphaZero at checkers 🤝 Can you actually beat it? ${url}`;
}

/**
 * Share an already-built GIF blob via the native share sheet, with an
 * outcome-aware caption. Resolves quietly if the user dismisses the sheet.
 */
export async function shareReplayGif(blob, { winner, shareUrl }) {
  const file = new File([blob], GIF_FILENAME, { type: 'image/gif' });
  try {
    await navigator.share({
      files: [file],
      title: 'AlphaZero Checkers',
      text: replayShareCaption(winner, shareUrl),
    });
  } catch (e) {
    if (e && e.name === 'AbortError') return; // user cancelled — not an error
    throw e;
  }
}
