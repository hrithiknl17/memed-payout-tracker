import { rupees } from '@/lib/format';
import type { Submission } from '@/lib/types';

/** Small badges explaining anything unusual about a submission's payout. */
export function SubmissionStatus({ s }: { s: Submission }) {
  const review = s.review ?? 'none';
  if (!s.cappedByBudget && !s.flagged) {
    return s.paidAmount > 0 ? <span className="pill good">Paid</span> : <span className="pill">Below first milestone</span>;
  }
  return (
    <span className="pills">
      {s.cappedByBudget && (
        <span className="pill warn" title="The campaign budget ran out before this post was paid in full">
          {rupees(s.unpaidDueToBudget)} unpaid · budget out
        </span>
      )}
      {review === 'pending' && (
        <span className="pill bad" title={s.flagReason ? `View spike: ${s.flagReason}` : undefined}>
          ⚑ Spike · payout on hold
        </span>
      )}
      {review === 'rejected' && (
        <span className="pill bad" title={s.flagReason}>
          ⚑ Spike rejected · not paid
        </span>
      )}
      {review === 'approved' && (
        <span className="pill good" title={s.flagReason}>
          ⚑ Spike approved
        </span>
      )}
      {review === 'none' && s.flagged && (
        <span className="pill bad" title={s.flagReason}>
          ⚑ View spike
        </span>
      )}
    </span>
  );
}
