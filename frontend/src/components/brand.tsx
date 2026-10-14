'use client';

import Link from 'next/link';
import { useState } from 'react';

/** The pixel "MEMED" wordmark from the mobile app, set in a pixel font with an inked outline. */
export function PixelLogo({ href, size = 'md' }: { href?: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = `pixel-logo${size === 'md' ? '' : ` ${size}`}`;
  const mark = (
    <span className={cls} aria-label="Meme'd">
      MEMED
    </span>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {mark}
    </Link>
  ) : (
    mark
  );
}

/** Gold coin with a lightning bolt, as used for money throughout the app. */
export function Coin({ size = 18, tilt = 0 }: { size?: number; tilt?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ transform: `rotate(${tilt}deg)` }}>
      <ellipse cx="16" cy="17.5" rx="13" ry="13" fill="#c98a07" />
      <circle cx="16" cy="15" r="13" fill="#f7c52b" stroke="#111" strokeWidth="1.6" />
      <circle cx="16" cy="15" r="9.5" fill="none" stroke="#d99a0b" strokeWidth="1.4" />
      <path d="M17.6 7.5 11 16.4h4.4l-1.6 7.1 6.8-9.2h-4.5z" fill="#111" />
    </svg>
  );
}

/** A stack of coins for earnings cards and the wallet header. */
export function CoinStack({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="58" rx="20" ry="4" fill="#f2d24a" opacity=".6" />
      {[46, 38, 30, 22].map((y, i) => (
        <g key={y} transform={`translate(${i % 2 ? 2 : -1} 0)`}>
          <ellipse cx="32" cy={y + 4} rx="17" ry="6" fill="#c98a07" stroke="#111" strokeWidth="1.4" />
          <ellipse cx="32" cy={y} rx="17" ry="6" fill="#f7c52b" stroke="#111" strokeWidth="1.4" />
        </g>
      ))}
      <g transform="translate(34 4) rotate(18)">
        <circle cx="12" cy="12" r="11" fill="#f7c52b" stroke="#111" strokeWidth="1.4" />
        <path d="M13.4 5.5 8 12.8h3.6l-1.3 5.8 5.6-7.6h-3.7z" fill="#111" />
      </g>
    </svg>
  );
}

export function CoinAmount({ value, size = 18 }: { value: string; size?: number }) {
  return (
    <span className="coin-amount">
      <Coin size={size} />
      {value}
    </span>
  );
}

/** Campaign cover image, falling back to a branded tile when there is none or it fails to load. */
export function Thumb({ src, alt, mini = false }: { src?: string; alt: string; mini?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="thumb-fallback" role="img" aria-label={alt}>
        <span className={`pixel-logo${mini ? ' sm' : ''}`}>MEMED</span>
      </div>
    );
  }
  // Plain <img>: thumbnails are arbitrary brand-supplied URLs, so next/image's domain allowlist doesn't fit.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

export function Progress({ value, max, large = false, label }: { value: number; max: number; large?: boolean; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={`progress${large ? ' lg' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Marks UI for features the backend doesn't support yet, so nobody mistakes it for a working feature. */
export function PreviewBadge({ label = 'Preview' }: { label?: string }) {
  return (
    <span className="preview-badge" title="Not connected to the backend yet">
      {label}
    </span>
  );
}

/** Small platform glyphs (lucide no longer ships brand icons). */
export function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  if (platform === 'youtube') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#ff0033" />
        <path d="M10 8.8v6.4l5.6-3.2z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#feda75" />
          <stop offset=".35" stopColor="#fa7e1e" />
          <stop offset=".65" stopColor="#d62976" />
          <stop offset="1" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)" />
      <circle cx="12" cy="12" r="4.4" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="17.3" cy="6.7" r="1.3" fill="#fff" />
    </svg>
  );
}

/** The pixel-logo folder illustration used for empty states in the app. */
export function EmptyFolder() {
  return (
    <div className="folder" aria-hidden="true">
      <div>
        <span className="pixel-logo sm">MEMED</span>
      </div>
    </div>
  );
}
