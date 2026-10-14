'use client';

import { ArrowUpRight, LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { count, rupees, timeAgo } from '@/lib/format';
import type { Submission } from '@/lib/types';
import { SubmissionStatus } from './SubmissionStatus';

/**
 * The creator's posts. Each row has a small "simulate views" control that
 * calls PATCH /api/submissions/:id/views — standing in for real platform data.
 */
export function MySubmissions({
  submissions,
  onChanged,
  limit,
}: {
  submissions: Submission[];
  onChanged: () => void;
  limit?: number;
}) {
  if (submissions.length === 0) {
    return (
      <div className="card empty">
        <LayoutGrid size={26} color="var(--coral)" aria-hidden="true" />
        <strong>No posts yet</strong>
        <span>Pick a live campaign and submit a link to your post.</span>
      </div>
    );
  }
  const shown = limit ? submissions.slice(0, limit) : submissions;
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="post-list">
        <div className="post-row head" aria-hidden="true">
          <span>Post</span>
          <span>Views</span>
          <span>Earned</span>
          <span className="simulate-head">Simulate platform views</span>
        </div>
        {shown.map((s) => (
          <SubmissionRow key={s.id} s={s} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}

function SubmissionRow({ s, onChanged }: { s: Submission; onChanged: () => void }) {
  const [views, setViews] = useState(String(s.views));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function update() {
    setMsg(null);
    setBusy(true);
    try {
      const r = await api.updateViews(s.id, Number(views));
      const parts = [r.payout.paidNow > 0 ? `+${rupees(r.payout.paidNow)} paid` : 'No new payout'];
      if (r.payout.cappedByBudget) parts.push('budget ran out');
      if (r.spikeDetected) parts.push('spike flagged');
      setMsg({ ok: true, text: parts.join(' · ') });
      onChanged();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.fullMessage : 'Update failed' });
    } finally {
      setBusy(false);
    }
  }

  const campaign = s.campaignName ?? 'Campaign';
  return (
    <div className="post-row">
      <div className="post-main">
        <strong>{campaign}</strong>
        <a className="url" href={s.postUrl} target="_blank" rel="noreferrer">
          {s.postUrl.replace(/^https:\/\//, '')} <ArrowUpRight size={11} aria-hidden="true" />
        </a>
        <SubmissionStatus s={s} />
      </div>
      <div className="post-figure">
        <strong>{count(s.views)}</strong>
        <small>views · {timeAgo(s.viewsUpdatedAt)}</small>
      </div>
      <div className="post-figure">
        <strong style={{ color: 'var(--good)' }}>{rupees(s.paidAmount)}</strong>
        <small>{s.entitledAmount > s.paidAmount ? `paid of ${rupees(s.entitledAmount)} earned` : 'paid'}</small>
      </div>
      <form
        className="simulate"
        onSubmit={(e) => {
          e.preventDefault();
          void update();
        }}
      >
        <div className="simulate-row">
          <input
            type="number"
            min={0}
            step={1}
            value={views}
            onChange={(e) => setViews(e.target.value)}
            aria-label={`New view count for ${campaign}`}
          />
          <button className="btn btn-ghost btn-sm" type="submit" disabled={busy || views === ''}>
            {busy ? '…' : 'Set views'}
          </button>
        </div>
        {msg && (
          <span className={`inline-msg ${msg.ok ? 'success' : 'error'}`} role="status">
            {msg.text}
          </span>
        )}
      </form>
    </div>
  );
}
