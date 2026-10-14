'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { rupees } from '@/lib/format';
import type { Submission } from '@/lib/types';

/**
 * Stands in for the platform reporting a new view count (PATCH /api/submissions/:id/views).
 * In production this would be a scheduled job, not a button.
 */
export function SimulateViews({ submission, onChanged }: { submission: Submission; onChanged: () => void }) {
  const [views, setViews] = useState(String(submission.views));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function update() {
    setMsg(null);
    setBusy(true);
    try {
      const r = await api.updateViews(submission.id, Number(views));
      const parts = [r.payout.paidNow > 0 ? `+${rupees(r.payout.paidNow)} credited` : 'No new payout'];
      if (r.payout.cappedByBudget) parts.push('budget ran out');
      if (r.spikeDetected) parts.push('view spike flagged');
      setMsg({ ok: true, text: parts.join(' · ') });
      onChanged();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.fullMessage : 'Update failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void update();
      }}
    >
      <div className="inline-form">
        <input
          className="input"
          style={{ padding: '9px 12px' }}
          type="number"
          min={0}
          step={1}
          value={views}
          onChange={(e) => setViews(e.target.value)}
          aria-label="Simulated view count"
        />
        <button className="btn btn-ghost btn-sm" type="submit" disabled={busy || views === ''}>
          {busy ? '…' : 'Set views'}
        </button>
      </div>
      {msg && (
        <span className={`msg ${msg.ok ? 'success' : 'error'}`} role="status">
          {msg.text}
        </span>
      )}
    </form>
  );
}
