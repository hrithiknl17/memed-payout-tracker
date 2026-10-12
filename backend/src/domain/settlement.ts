import { decidePayout, type Milestone } from './payout';

/**
 * The storage operations settlement needs. Each method must be ATOMIC on its
 * own document — that's what makes the whole flow safe without a
 * multi-document transaction. Implemented by MongoSettlementStore (production)
 * and InMemorySettlementStore (tests).
 */
export interface SettlementStore {
  getSubmission(id: string): Promise<SubmissionSnapshot | null>;
  getCampaign(id: string): Promise<CampaignSnapshot | null>;

  /**
   * Atomically adds `amount` to campaign.spent, but only if the result stays
   * within campaign.budget. Returns false if that would overspend.
   * (Mongo: updateOne with `$expr: spent + amount <= budget` and `$inc`.)
   */
  reserveBudget(campaignId: string, amount: number): Promise<boolean>;

  /** Atomically gives back a reservation we couldn't use. */
  releaseBudget(campaignId: string, amount: number): Promise<void>;

  /**
   * Compare-and-set on the submission: adds `amount` to paidAmount only if
   * paidAmount still equals `expectedPaid`. Returns false if someone else
   * paid in the meantime. This is what prevents double-paying.
   */
  creditSubmission(
    submissionId: string,
    expectedPaid: number,
    amount: number,
    cappedByBudget: boolean,
  ): Promise<boolean>;

  /** Records whether the submission is still short of what it earned. */
  setCapped(submissionId: string, cappedByBudget: boolean): Promise<void>;
}

export interface SubmissionSnapshot {
  id: string;
  campaignId: string;
  views: number;
  paidAmount: number;
  cappedByBudget: boolean;
}

export interface CampaignSnapshot {
  id: string;
  budget: number;
  spent: number;
  milestones: Milestone[];
}

export interface SettlementResult {
  paidNow: number;
  totalPaid: number;
  entitled: number;
  cappedByBudget: boolean;
}

export class SettlementConflictError extends Error {
  constructor() {
    super('Could not settle payout after several retries due to concurrent updates');
    this.name = 'SettlementConflictError';
  }
}

const MAX_ATTEMPTS = 8;

/**
 * Pays whatever a submission is owed for its current view count, safely.
 *
 * Flow (each step is one atomic DB operation):
 *   1. Read the submission and campaign.
 *   2. Work out the grant = min(owed, remaining budget).
 *   3. Reserve the grant on the campaign (fails if it would overspend).
 *   4. Credit the submission, only if nobody else paid it since step 1.
 *      If that fails, release the reservation and start again.
 *
 * Why this is safe under concurrency:
 *   - Overspend is impossible: step 3 is a single conditional `$inc` that can
 *     only succeed while spent + grant <= budget.
 *   - Double-pay is impossible: step 4 is a compare-and-set on paidAmount, so
 *     two requests that both read paidAmount = 500 can't both add to it.
 *   - Budget is reserved BEFORE the creator is credited, so at every instant
 *     sum(paidAmount) <= spent <= budget.
 */
export async function settleSubmission(
  store: SettlementStore,
  submissionId: string,
): Promise<SettlementResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sub = await store.getSubmission(submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);
    const campaign = await store.getCampaign(sub.campaignId);
    if (!campaign) throw new Error(`Campaign ${sub.campaignId} not found`);

    const decision = decidePayout({
      milestones: campaign.milestones,
      views: sub.views,
      alreadyPaid: sub.paidAmount,
      remainingBudget: campaign.budget - campaign.spent,
    });

    if (decision.grant === 0) {
      // Nothing payable now: either fully paid, or the budget is gone.
      if (sub.cappedByBudget !== decision.cappedByBudget) {
        await store.setCapped(sub.id, decision.cappedByBudget);
      }
      return {
        paidNow: 0,
        totalPaid: sub.paidAmount,
        entitled: decision.entitled,
        cappedByBudget: decision.cappedByBudget,
      };
    }

    const reserved = await store.reserveBudget(campaign.id, decision.grant);
    if (!reserved) continue; // budget moved under us — re-read and recompute

    const credited = await store.creditSubmission(
      sub.id,
      sub.paidAmount,
      decision.grant,
      decision.cappedByBudget,
    );
    if (!credited) {
      // Another request paid this submission first. Give the money back.
      await store.releaseBudget(campaign.id, decision.grant);
      continue;
    }

    return {
      paidNow: decision.grant,
      totalPaid: sub.paidAmount + decision.grant,
      entitled: decision.entitled,
      cappedByBudget: decision.cappedByBudget,
    };
  }
  throw new SettlementConflictError();
}
