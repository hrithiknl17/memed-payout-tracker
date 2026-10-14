'use client';

import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { rupees } from '@/lib/format';
import type { Submission } from '@/lib/types';

/** Brand: approve (pay what's owed now) or reject a post held for a view spike. */
export function ReviewActions({
  campaignId,
  submission,
  onDone,
}: {
  campaignId: string;
  submission: Submission;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const owed = Math.max(0, submission.entitledAmount - submission.paidAmount);

  async function decide(decision: 'approve' | 'reject') {
    setBusy(decision);
    setError(null);
    try {
      await api.reviewSubmission(campaignId, submission.id, decision);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.fullMessage : 'Could not save your decision');
      setBusy(null);
    }
  }

  return (
    <div className="review-actions">
      <span className="small muted">{owed > 0 ? `${rupees(owed)} on hold` : 'Held for review'}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void decide('approve')}>
          <Check size={14} /> {busy === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => void decide('reject')}>
          <X size={14} /> {busy === 'reject' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
      {error && <span className="msg error" role="alert">{error}</span>}
    </div>
  );
}
