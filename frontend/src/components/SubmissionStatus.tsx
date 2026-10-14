import { rupees } from '@/lib/format';
import type { Submission } from '@/lib/types';

/** Small badges explaining anything unusual about a submission's payout. */
export function SubmissionStatus({ s }: { s: Submission }) {
  if (!s.cappedByBudget && !s.flagged) {
    return s.paidAmount > 0 ? <span className="pill live">Paid</span> : <span className="pill">Below first milestone</span>;
  }
  return (
    <span className="pills">
      {s.cappedByBudget && (
        <span className="pill warn" title="The campaign budget ran out before this post was paid in full">
          {rupees(s.unpaidDueToBudget)} unpaid · budget out
        </span>
      )}
      {s.flagged && (
        <span className="pill bad" title={s.flagReason}>
          ⚑ View spike
        </span>
      )}
    </span>
  );
}
