/**
 * Pure payout rules. No I/O lives here, so every rule is unit-testable.
 *
 * All money is in whole rupees (integers) to avoid floating-point drift.
 */

export interface Milestone {
  /** Views the post must reach (inclusive) to unlock this milestone. */
  views: number;
  /** Total payout for the post once this milestone is reached (not additive). */
  payout: number;
}

/**
 * Returns the payout for the highest milestone the post has crossed.
 *
 * Milestones are NOT cumulative: crossing 10K (₹500) and then 50K (₹2,000)
 * pays ₹2,000 in total, not ₹2,500. A post that jumps several milestones in
 * one update is simply paid the highest one it reached.
 *
 * "Crossed" means views >= threshold.
 */
export function entitledPayout(milestones: readonly Milestone[], views: number): number {
  let best = 0;
  for (const m of milestones) {
    if (views >= m.views && m.payout > best) best = m.payout;
  }
  return best;
}

export interface PayoutDecision {
  /** What the post has earned by the milestone ladder. */
  entitled: number;
  /** Still unpaid by the ladder: entitled - alreadyPaid (never negative). */
  owed: number;
  /** What we can actually pay right now: owed, capped by remaining budget. */
  grant: number;
  /** True when the budget prevented paying everything owed. */
  cappedByBudget: boolean;
}

/**
 * Decides how much to pay for a submission right now.
 *
 * - Only the difference between what's earned and what's already paid is paid,
 *   so repeating the same view update never pays twice.
 * - Payouts never go backwards: if views drop, already-paid money is kept and
 *   nothing new is paid.
 * - If the remaining budget is smaller than what's owed, we pay whatever budget
 *   is left (a partial payout) and mark the submission as capped.
 */
export function decidePayout(params: {
  milestones: readonly Milestone[];
  views: number;
  alreadyPaid: number;
  remainingBudget: number;
}): PayoutDecision {
  const { milestones, views, alreadyPaid } = params;
  const remainingBudget = Math.max(0, params.remainingBudget);

  const entitled = entitledPayout(milestones, views);
  const owed = Math.max(0, entitled - alreadyPaid);
  const grant = Math.min(owed, remainingBudget);

  return { entitled, owed, grant, cappedByBudget: grant < owed };
}

/**
 * Validates a milestone ladder. Returns a list of human-readable problems
 * (empty when valid). Sorting is the caller's job via `normaliseLadder`.
 */
export function validateLadder(milestones: readonly Milestone[], budget: number): string[] {
  const errors: string[] = [];
  if (milestones.length === 0) errors.push('At least one milestone is required');

  const sorted = normaliseLadder(milestones);
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i]!;
    if (!Number.isInteger(m.views) || m.views <= 0) {
      errors.push(`Milestone view thresholds must be positive whole numbers (got ${m.views})`);
    }
    if (!Number.isInteger(m.payout) || m.payout <= 0) {
      errors.push(`Milestone payouts must be positive whole rupees (got ${m.payout})`);
    }
    if (m.payout > budget) {
      errors.push(`Milestone payout ₹${m.payout} exceeds the campaign budget ₹${budget}`);
    }
    const prev = sorted[i - 1];
    if (prev) {
      if (m.views === prev.views) errors.push(`Duplicate view threshold ${m.views}`);
      if (m.payout <= prev.payout) {
        errors.push('Payouts must increase as view thresholds increase');
      }
    }
  }
  return [...new Set(errors)];
}

/** Sorts milestones by view threshold, ascending. */
export function normaliseLadder(milestones: readonly Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => a.views - b.views);
}
