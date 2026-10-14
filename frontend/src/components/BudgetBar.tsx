import { rupees } from '@/lib/format';

/** Budget spent vs remaining as a bar with both numbers. */
export function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  return (
    <div className="usage">
      <div
        className="usage-track"
        role="progressbar"
        aria-label="Budget spent"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="usage-meta">
        <span>
          <strong>{rupees(spent)}</strong> <em>spent</em>
        </span>
        <span>
          <strong>{rupees(Math.max(0, budget - spent))}</strong> <em>left</em>
        </span>
      </div>
    </div>
  );
}
