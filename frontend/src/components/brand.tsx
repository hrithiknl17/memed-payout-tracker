'use client';

import Link from 'next/link';
import { useState } from 'react';
import { count, shortCount } from '@/lib/format';
import type { Milestone } from '@/lib/types';

/** The meme'd wordmark: a ledger-style ₹ block followed by the name. */
export function Wordmark({ href, size = 'md' }: { href?: string; size?: 'sm' | 'md' | 'lg' }) {
  const mark = (
    <span className={`wordmark ${size}`} aria-label="meme'd">
      <span className="wm-box" aria-hidden="true">₹</span>
      <span aria-hidden="true">
        meme<span className="wm-apos">’</span>d
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="wordmark-link">
      {mark}
    </Link>
  ) : (
    mark
  );
}

/** Rupee sign set in the number face, placed before amounts. */
export function Rupee({ size = 18 }: { size?: number }) {
  return (
    <span className="rupee" style={{ fontSize: Math.round(size * 0.9) }} aria-hidden="true">
      ₹
    </span>
  );
}

/** Campaign cover image, falling back to a plain tile when there is none or it fails to load. */
export function Thumb({ src, alt, mini = false }: { src?: string; alt: string; mini?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="thumb-fallback" role="img" aria-label={alt}>
        <span className="rupee" style={{ fontSize: mini ? 18 : 40 }}>₹</span>
      </div>
    );
  }
  // Plain <img>: thumbnails are arbitrary brand-supplied URLs, so next/image's domain allowlist doesn't fit.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

/** Ledger meter: a thick bar with tick marks at 25 / 50 / 75%. */
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
      <b style={{ left: '25%' }} aria-hidden="true" />
      <b style={{ left: '50%' }} aria-hidden="true" />
      <b style={{ left: '75%' }} aria-hidden="true" />
    </div>
  );
}

/**
 * Milestone ladder as a receipt: "10K views ........ ₹500". Rows the post has
 * already reached are marked when `views` is given.
 */
export function Ladder({ milestones, views }: { milestones: Milestone[]; views?: number }) {
  const rows = [...milestones].sort((a, b) => a.views - b.views);
  return (
    <ol className="ladder">
      {rows.map((m) => {
        const reached = views !== undefined && views >= m.views;
        return (
          <li key={m.views} className={reached ? 'reached' : undefined}>
            <span className="ladder-views">{shortCount(m.views)} views</span>
            <span className="ladder-dots" aria-hidden="true" />
            <span className="ladder-pay">₹{count(m.payout)}</span>
            {reached && <span className="sr-only"> (reached)</span>}
          </li>
        );
      })}
    </ol>
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
        <rect x="1.5" y="4.5" width="21" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M10 8.8v6.4l5.6-3.2z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
    </svg>
  );
}

/** Blank receipt used for empty states. */
export function EmptyState() {
  return (
    <svg className="empty-art" width="72" height="88" viewBox="0 0 72 88" aria-hidden="true">
      <path
        d="M6 4h60v76l-7.5-5-7.5 5-7.5-5-7.5 5-7.5-5-7.5 5L6 80z"
        fill="var(--surface)"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M18 22h36M18 34h36M18 46h22" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 4" />
      <path d="M44 60h10" stroke="var(--accent)" strokeWidth="4" />
    </svg>
  );
}
