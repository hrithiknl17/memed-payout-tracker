import type {
  CampaignSnapshot,
  SettlementStore,
  SubmissionSnapshot,
} from '../../src/domain/settlement';

/** Yields to the event loop so concurrent settlements genuinely interleave. */
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * In-memory SettlementStore with the same atomicity guarantees as the Mongo
 * implementation: each method checks-and-writes in one synchronous step
 * (like a single Mongo update), but every call yields first so concurrent
 * callers interleave between steps.
 */
export class InMemorySettlementStore implements SettlementStore {
  campaigns = new Map<string, CampaignSnapshot>();
  submissions = new Map<string, SubmissionSnapshot>();

  addCampaign(c: CampaignSnapshot) {
    this.campaigns.set(c.id, structuredClone(c));
  }

  addSubmission(s: SubmissionSnapshot) {
    this.submissions.set(s.id, structuredClone(s));
  }

  async getSubmission(id: string) {
    await tick();
    const s = this.submissions.get(id);
    return s ? structuredClone(s) : null;
  }

  async getCampaign(id: string) {
    await tick();
    const c = this.campaigns.get(id);
    return c ? structuredClone(c) : null;
  }

  async reserveBudget(campaignId: string, amount: number) {
    await tick();
    const c = this.campaigns.get(campaignId);
    if (!c || c.spent + amount > c.budget) return false;
    c.spent += amount;
    return true;
  }

  async releaseBudget(campaignId: string, amount: number) {
    await tick();
    const c = this.campaigns.get(campaignId);
    if (c) c.spent -= amount;
  }

  async creditSubmission(id: string, expectedPaid: number, amount: number, capped: boolean) {
    await tick();
    const s = this.submissions.get(id);
    if (!s || s.paidAmount !== expectedPaid) return false;
    s.paidAmount += amount;
    s.cappedByBudget = capped;
    return true;
  }

  async setCapped(id: string, capped: boolean) {
    await tick();
    const s = this.submissions.get(id);
    if (s) s.cappedByBudget = capped;
  }

  /** Test helper: simulates the views write that happens before settlement. */
  setViews(id: string, views: number) {
    const s = this.submissions.get(id);
    if (!s) throw new Error('no submission');
    s.views = views;
  }

  totalPaid(campaignId: string) {
    let sum = 0;
    for (const s of this.submissions.values()) if (s.campaignId === campaignId) sum += s.paidAmount;
    return sum;
  }
}
