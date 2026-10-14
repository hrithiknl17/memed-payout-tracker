import { rupees, shortCount } from '@/lib/format';
import type { Milestone } from '@/lib/types';

export function Ladder({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="ladder-chips" aria-label="Milestone ladder">
      {milestones.map((m) => (
        <span key={m.views}>
          {shortCount(m.views)} → {rupees(m.payout)}
        </span>
      ))}
    </div>
  );
}
