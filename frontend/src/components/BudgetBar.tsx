import { rupees } from '@/lib/format';

export function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  return (
    <div>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="row small">
        <span>
          <strong>{rupees(spent)}</strong> <span className="muted">spent</span>
        </span>
        <span style={{ textAlign: 'right' }}>
          <strong>{rupees(Math.max(0, budget - spent))}</strong> <span className="muted">remaining of {rupees(budget)}</span>
        </span>
      </div>
    </div>
  );
}
