import { settleSubmission } from '../src/domain/settlement';
import type { Milestone } from '../src/domain/payout';
import { InMemorySettlementStore } from './helpers/inMemoryStore';

const ladder: Milestone[] = [
  { views: 10_000, payout: 500 },
  { views: 50_000, payout: 2_000 },
  { views: 100_000, payout: 5_000 },
];

function setup(budget: number, submissionCount: number) {
  const store = new InMemorySettlementStore();
  store.addCampaign({ id: 'c1', budget, spent: 0, milestones: ladder });
  const ids: string[] = [];
  for (let i = 0; i < submissionCount; i++) {
    const id = `s${i}`;
    store.addSubmission({ id, campaignId: 'c1', peakViews: 0, paidAmount: 0, cappedByBudget: false });
    ids.push(id);
  }
  return { store, ids };
}

describe('settleSubmission', () => {
  it('pays the highest milestone and updates campaign spend', async () => {
    const { store } = setup(10_000, 1);
    store.setViews('s0', 60_000);
    const result = await settleSubmission(store, 's0');
    expect(result).toEqual({ paidNow: 2_000, totalPaid: 2_000, entitled: 2_000, cappedByBudget: false });
    expect(store.campaigns.get('c1')!.spent).toBe(2_000);
  });

  it('pays the remaining budget and marks the submission capped', async () => {
    const { store } = setup(1_200, 1);
    store.setViews('s0', 100_000);
    const result = await settleSubmission(store, 's0');
    expect(result.paidNow).toBe(1_200);
    expect(result.cappedByBudget).toBe(true);
    expect(store.submissions.get('s0')!.cappedByBudget).toBe(true);
    expect(store.campaigns.get('c1')!.spent).toBe(1_200);
  });
});

describe('concurrency (stretch goal)', () => {
  it('two simultaneous updates on the same post never double-pay', async () => {
    const { store } = setup(100_000, 1);
    store.setViews('s0', 100_000);

    const results = await Promise.all([settleSubmission(store, 's0'), settleSubmission(store, 's0')]);

    expect(results.map((r) => r.paidNow).sort()).toEqual([0, 5_000]);
    expect(store.submissions.get('s0')!.paidAmount).toBe(5_000);
    expect(store.campaigns.get('c1')!.spent).toBe(5_000);
  });

  it('many simultaneous updates across posts never overspend the budget', async () => {
    // 50 posts each owed ₹5,000 = ₹250,000 demand against a ₹23,700 budget.
    const budget = 23_700;
    const { store, ids } = setup(budget, 50);
    ids.forEach((id) => store.setViews(id, 150_000));

    // Fire every settlement at once, plus a duplicate for every post.
    await Promise.all([...ids, ...ids].map((id) => settleSubmission(store, id)));

    const campaign = store.campaigns.get('c1')!;
    expect(campaign.spent).toBeLessThanOrEqual(budget); // never overspent
    expect(store.totalPaid('c1')).toBe(campaign.spent); // every reserved rupee reached a creator
    for (const s of store.submissions.values()) {
      expect(s.paidAmount).toBeLessThanOrEqual(5_000); // nobody paid twice
    }

    // A later round of updates tops up anyone left short by a momentary
    // reservation, so the budget ends up fully and exactly used.
    for (const id of ids) await settleSubmission(store, id);
    expect(campaign.spent).toBe(budget);
    expect(store.totalPaid('c1')).toBe(budget);
  });

  it('repeated identical updates are idempotent', async () => {
    const { store } = setup(100_000, 1);
    store.setViews('s0', 55_000);
    for (let i = 0; i < 5; i++) await settleSubmission(store, 's0');
    expect(store.submissions.get('s0')!.paidAmount).toBe(2_000);
    expect(store.campaigns.get('c1')!.spent).toBe(2_000);
  });
});
