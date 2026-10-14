import { Types } from 'mongoose';
import { CampaignModel } from '../models/Campaign';
import { HELD_REVIEW_STATES, SubmissionModel } from '../models/Submission';
import type {
  CampaignSnapshot,
  SettlementStore,
  SubmissionSnapshot,
} from '../domain/settlement';

/**
 * MongoDB implementation of the settlement primitives. Every write is a single
 * atomic update with a guard in its filter, so no multi-document transaction
 * (and no replica set) is needed for correctness.
 */
export class MongoSettlementStore implements SettlementStore {
  async getSubmission(id: string): Promise<SubmissionSnapshot | null> {
    const s = await SubmissionModel.findById(id)
      .select('campaignId peakViews paidAmount cappedByBudget review')
      .lean();
    if (!s) return null;
    return {
      id: String(s._id),
      campaignId: String(s.campaignId),
      peakViews: s.peakViews,
      paidAmount: s.paidAmount,
      cappedByBudget: s.cappedByBudget,
      onHold: HELD_REVIEW_STATES.includes(s.review),
    };
  }

  async getCampaign(id: string): Promise<CampaignSnapshot | null> {
    const c = await CampaignModel.findById(id).select('budget spent milestones').lean();
    if (!c) return null;
    return {
      id: String(c._id),
      budget: c.budget,
      spent: c.spent,
      milestones: c.milestones.map((m) => ({ views: m.views, payout: m.payout })),
    };
  }

  async reserveBudget(campaignId: string, amount: number): Promise<boolean> {
    // Matches only if spent + amount <= budget; the $inc happens atomically
    // with that check, so concurrent reservations can never overshoot.
    const res = await CampaignModel.updateOne(
      {
        _id: new Types.ObjectId(campaignId),
        $expr: { $lte: [{ $add: ['$spent', amount] }, '$budget'] },
      },
      { $inc: { spent: amount } },
    );
    return res.modifiedCount === 1;
  }

  async releaseBudget(campaignId: string, amount: number): Promise<void> {
    await CampaignModel.updateOne({ _id: new Types.ObjectId(campaignId) }, { $inc: { spent: -amount } });
  }

  async creditSubmission(
    submissionId: string,
    expectedPaid: number,
    amount: number,
    cappedByBudget: boolean,
  ): Promise<boolean> {
    // Compare-and-set: only succeeds if nobody has paid this submission since
    // we read it, and it hasn't been put on hold for review in the meantime.
    const res = await SubmissionModel.updateOne(
      {
        _id: new Types.ObjectId(submissionId),
        paidAmount: expectedPaid,
        review: { $nin: [...HELD_REVIEW_STATES] },
      },
      { $inc: { paidAmount: amount }, $set: { cappedByBudget } },
    );
    return res.modifiedCount === 1;
  }

  async setCapped(submissionId: string, cappedByBudget: boolean): Promise<void> {
    await SubmissionModel.updateOne({ _id: new Types.ObjectId(submissionId) }, { $set: { cappedByBudget } });
  }
}
