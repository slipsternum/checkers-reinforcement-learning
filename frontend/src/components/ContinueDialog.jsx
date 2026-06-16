import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { buildShareUrl } from '../utils/share';
import './ContinueDialog.css';

export default function ContinueDialog({ shareState, onClose }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const url = buildShareUrl(shareState);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current, url,
        { width: 200, margin: 1, color: { dark: '#1e1e1e', light: '#ffffff' } },
        () => {},
      );
    }
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — the link input is selectable as a fallback */
    }
  };

  return (
    <div className="cd-backdrop" onClick={onClose}>
      <div className="cd-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Continue on another device">
        <button className="cd-close" onClick={onClose} aria-label="Close">×</button>
        <h3 className="cd-title">Continue on another device</h3>
        <p className="cd-sub">Scan to resume this exact game on your phone, or copy the link to open it on another computer.</p>
        <div className="cd-qr"><canvas ref={canvasRef} /></div>
        <div className="cd-linkrow">
          <input className="cd-input" readOnly value={url} onFocus={e => e.target.select()} />
          <button className="cd-copy" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      </div>
    </div>
  );
}
