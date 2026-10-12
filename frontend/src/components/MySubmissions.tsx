'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { count, rupees, timeAgo } from '@/lib/format';
import type { Submission } from '@/lib/types';
import { SubmissionStatus } from './SubmissionStatus';

/**
 * The creator's posts. Each row has a small "simulate views" control that
 * calls PATCH /api/submissions/:id/views — standing in for real platform data.
 */
export function MySubmissions({ submissions, onChanged }: { submissions: Submission[]; onChanged: () => void }) {
  if (submissions.length === 0) {
    return <div className="card empty">No posts yet. Pick a campaign and submit a link.</div>;
  }
  return (
    <div className="card">
      <h2>Your posts</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Post</th>
              <th className="num">Views</th>
              <th className="num">Earned</th>
              <th>Simulate platform views</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <SubmissionRow key={s.id} s={s} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
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

  return (
    <tr>
      <td>
        <strong>{s.campaignName ?? 'Campaign'}</strong>
        <a className="url small muted" href={s.postUrl} target="_blank" rel="noreferrer">
          {s.postUrl.replace(/^https:\/\//, '')}
        </a>
        <SubmissionStatus s={s} />
      </td>
      <td className="num">
        {count(s.views)}
        <div className="small muted">{timeAgo(s.viewsUpdatedAt)}</div>
      </td>
      <td className="num">{rupees(s.paidAmount)}</td>
      <td>
        <div className="row" style={{ minWidth: 200 }}>
          <input
            type="number"
            min={0}
            step={1}
            value={views}
            onChange={(e) => setViews(e.target.value)}
            aria-label="New view count"
          />
          <button className="secondary shrink" onClick={update} disabled={busy || views === ''}>
            {busy ? '…' : 'Set'}
          </button>
        </div>
        {msg && <div className={`small ${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}
      </td>
    </tr>
  );
}
