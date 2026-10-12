import { rupees } from '@/lib/format';
import type { Submission } from '@/lib/types';

/** Small badges explaining anything unusual about a submission's payout. */
export function SubmissionStatus({ s }: { s: Submission }) {
  return (
    <span className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
      {s.cappedByBudget && (
        <span className="pill warn" title="The campaign budget ran out before this post was paid in full">
          {rupees(s.unpaidDueToBudget)} unpaid · budget out
        </span>
      )}
      {s.flagged && (
        <span className="pill bad" title={s.flagReason}>
          ⚑ view spike
        </span>
      )}
    </span>
  );
}
