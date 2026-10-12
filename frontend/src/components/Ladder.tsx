import { rupees, shortCount } from '@/lib/format';
import type { Milestone } from '@/lib/types';

export function Ladder({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="ladder">
      {milestones.map((m) => (
        <span key={m.views}>
          {shortCount(m.views)} views → {rupees(m.payout)}
        </span>
      ))}
    </div>
  );
}
