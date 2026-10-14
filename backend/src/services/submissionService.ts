import { Types } from 'mongoose';
import { env } from '../config/env';
import { entitledPayout } from '../domain/payout';
import { settleSubmission, type SettlementResult } from '../domain/settlement';
import { detectSpike } from '../domain/spike';
import { CampaignModel } from '../models/Campaign';
import { PayoutEntryModel } from '../models/PayoutEntry';
import { SubmissionModel, type ReviewState } from '../models/Submission';
import { UserModel } from '../models/User';
import { HttpError } from '../utils/httpError';
import { normalisePostUrl } from '../utils/postUrl';
import { CACHE_KEYS, cacheDel } from './cache';
import { getOwnedCampaign } from './campaignService';
import { MongoSettlementStore } from './mongoSettlementStore';

const store = new MongoSettlementStore();

export interface SubmissionView {
  id: string;
  campaignId: string;
  campaignName?: string;
  platform?: string;
  postUrl: string;
  views: number;
  peakViews: number;
  entitledAmount: number;
  paidAmount: number;
  /** Earned by the ladder but not paid because the budget ran out. */
  unpaidDueToBudget: number;
  cappedByBudget: boolean;
  flagged: boolean;
  flagReason?: string;
  /** Brand review of a view spike; payouts are held while `pending` or `rejected`. */
  review: ReviewState;
  viewsUpdatedAt: string;
  createdAt: string;
}

interface SubmissionLike {
  _id: unknown;
  campaignId: unknown;
  postUrl: string;
  views: number;
  peakViews: number;
  entitledAmount: number;
  paidAmount: number;
  cappedByBudget: boolean;
  flagged: boolean;
  flagReason?: string | null;
  review?: ReviewState | null;
  viewsUpdatedAt: Date;
  createdAt: Date;
}

function toView(s: SubmissionLike, campaign?: { name: string; platform: string }): SubmissionView {
  return {
    id: String(s._id),
    campaignId: String(s.campaignId),
    campaignName: campaign?.name,
    platform: campaign?.platform,
    postUrl: s.postUrl,
    views: s.views,
    peakViews: s.peakViews,
    entitledAmount: s.entitledAmount,
    paidAmount: s.paidAmount,
    unpaidDueToBudget: Math.max(0, s.entitledAmount - s.paidAmount),
    cappedByBudget: s.cappedByBudget,
    flagged: s.flagged,
    flagReason: s.flagReason ?? undefined,
    review: s.review ?? 'none',
    viewsUpdatedAt: s.viewsUpdatedAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  };
}

function assertObjectId(id: string, what: string) {
  if (!Types.ObjectId.isValid(id)) throw HttpError.notFound(`${what} not found`);
}

export async function createSubmission(
  creatorId: string,
  input: { campaignId: string; postUrl: string },
): Promise<SubmissionView> {
  assertObjectId(input.campaignId, 'Campaign');
  const campaign = await CampaignModel.findById(input.campaignId).lean();
  if (!campaign) throw HttpError.notFound('Campaign not found');
  if (campaign.spent >= campaign.budget) {
    throw HttpError.conflict('This campaign has used its whole budget and is no longer accepting posts');
  }
  if (campaign.endsAt && campaign.endsAt.getTime() <= Date.now()) {
    throw HttpError.conflict('This campaign has ended and is no longer accepting posts');
  }

  const postUrl = normalisePostUrl(input.postUrl, campaign.platform);
  if (!postUrl) {
    throw HttpError.badRequest(
      `That doesn't look like a ${campaign.platform === 'instagram' ? 'Instagram' : 'YouTube'} post link`,
    );
  }

  // A post belongs to whoever posted it: stop a second creator claiming the
  // same link (on this or any other campaign) and collecting its payouts.
  const claimedByOther = await SubmissionModel.exists({ postUrl, creatorId: { $ne: creatorId } });
  if (claimedByOther) {
    throw HttpError.conflict('This post has already been submitted by another creator');
  }

  try {
    const doc = await SubmissionModel.create({ campaignId: campaign._id, creatorId, postUrl });
    return toView(doc, campaign);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw HttpError.conflict('This post has already been submitted to this campaign');
    }
    throw err;
  }
}

export async function listCreatorSubmissions(creatorId: string) {
  const subs = await SubmissionModel.find({ creatorId }).sort({ createdAt: -1 }).lean();
  const campaigns = await CampaignModel.find({ _id: { $in: subs.map((s) => s.campaignId) } })
    .select('name platform')
    .lean();
  const byId = new Map(campaigns.map((c) => [String(c._id), c]));
  return subs.map((s) => toView(s, byId.get(String(s.campaignId))));
}

export async function getCreatorEarnings(creatorId: string) {
  const [row] = await SubmissionModel.aggregate<{
    totalPaid: number;
    totalEntitled: number;
    submissionCount: number;
  }>([
    { $match: { creatorId: new Types.ObjectId(creatorId) } },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: '$paidAmount' },
        totalEntitled: { $sum: '$entitledAmount' },
        submissionCount: { $sum: 1 },
      },
    },
  ]);
  const totalPaid = row?.totalPaid ?? 0;
  const totalEntitled = row?.totalEntitled ?? 0;
  return {
    totalEarnings: totalPaid,
    unpaidDueToBudget: Math.max(0, totalEntitled - totalPaid),
    submissionCount: row?.submissionCount ?? 0,
  };
}

export async function listCampaignSubmissions(campaignId: string, brandId: string) {
  const campaign = await getOwnedCampaign(campaignId, brandId);
  const subs = await SubmissionModel.find({ campaignId: campaign._id }).sort({ paidAmount: -1, createdAt: -1 }).lean();
  const creators = await UserModel.find({ _id: { $in: subs.map((s) => s.creatorId) } })
    .select('name')
    .lean();
  const creatorNames = new Map(creators.map((c) => [String(c._id), c.name]));
  return subs.map((s) => ({ ...toView(s, campaign), creatorName: creatorNames.get(String(s.creatorId)) ?? 'Unknown creator' }));
}

type PayoutReason = 'views' | 'review-approved';

/**
 * Pays whatever the submission is owed (atomic, idempotent, budget-capped,
 * respects review holds), then writes the credit to the payout ledger.
 */
async function settleAndRecord(submissionId: string, reason: PayoutReason, now: Date): Promise<SettlementResult> {
  const payout = await settleSubmission(store, submissionId);
  if (payout.paidNow === 0) return payout;

  const sub = await SubmissionModel.findById(submissionId).select('campaignId creatorId peakViews').lean();
  const campaign = sub && (await CampaignModel.findById(sub.campaignId).select('milestones spent budget').lean());
  if (!sub || !campaign) return payout;

  const reached = campaign.milestones.filter((m) => m.views <= sub.peakViews).map((m) => m.views);
  await PayoutEntryModel.create({
    submissionId: sub._id,
    campaignId: sub.campaignId,
    creatorId: sub.creatorId,
    amount: payout.paidNow,
    views: sub.peakViews,
    milestoneViews: reached.length ? Math.max(...reached) : 0,
    entitled: payout.entitled,
    totalPaid: payout.totalPaid,
    cappedByBudget: payout.cappedByBudget,
    reason,
    createdAt: now,
  });

  // If this payout used the last of the budget, drop the campaign from the
  // cached "live" list straight away.
  if (campaign.spent >= campaign.budget) await cacheDel(CACHE_KEYS.liveCampaigns);
  return payout;
}

/**
 * Records a new view count for a post (simulating platform data) and pays out
 * anything newly earned. Safe to call concurrently and repeatedly.
 *
 * A view spike puts the submission on hold: nothing more is paid until the
 * brand approves it (see reviewSubmission).
 */
export async function updateViews(
  submissionId: string,
  views: number,
  now: Date = new Date(),
): Promise<{ submission: SubmissionView; payout: SettlementResult; spikeDetected: boolean }> {
  assertObjectId(submissionId, 'Submission');
  const existing = await SubmissionModel.findById(submissionId).lean();
  if (!existing) throw HttpError.notFound('Submission not found');
  const campaign = await CampaignModel.findById(existing.campaignId).lean();
  if (!campaign) throw HttpError.notFound('Campaign not found');

  const spike = detectSpike({
    previousViews: existing.views,
    previousAt: existing.viewsUpdatedAt,
    newViews: views,
    now,
    config: { minGain: env.SPIKE_MIN_GAIN, viewsPerMinute: env.SPIKE_VIEWS_PER_MINUTE },
  });

  // 1) Record the reading in one atomic update.
  //    - peakViews / entitledAmount use $max: a milestone once crossed stays
  //      crossed, and payouts are never clawed back when views drop.
  //    - A spike flag, once raised, stays raised, and holds payouts until the
  //      brand reviews it. A rejected post stays rejected.
  const set: Record<string, unknown> = { views, viewsUpdatedAt: now };
  if (spike.isSpike) {
    set.flagged = true;
    set.flagReason = `+${spike.gain} views at ~${spike.ratePerMinute}/min`;
    if (existing.review !== 'rejected') set.review = 'pending';
  }
  await SubmissionModel.updateOne(
    { _id: existing._id },
    {
      $set: set,
      $max: { peakViews: views, entitledAmount: entitledPayout(campaign.milestones, views) },
    },
  );

  // 2) Pay whatever is newly owed and log it to the ledger.
  const payout = await settleAndRecord(submissionId, 'views', now);

  const saved = await SubmissionModel.findById(submissionId).lean();
  if (!saved) throw HttpError.notFound('Submission not found');
  return { submission: toView(saved, campaign), payout, spikeDetected: spike.isSpike };
}

/**
 * Brand: approve or reject a submission held for a view spike. Approving
 * releases the hold and pays everything owed right away; rejecting keeps it
 * held (money already paid before the spike is not clawed back).
 */
export async function reviewSubmission(
  brandId: string,
  campaignId: string,
  submissionId: string,
  decision: 'approve' | 'reject',
  now: Date = new Date(),
): Promise<{ submission: SubmissionView; payout: SettlementResult | null }> {
  assertObjectId(submissionId, 'Submission');
  const campaign = await getOwnedCampaign(campaignId, brandId);

  // Only a pending review can be decided, and only once: the filter makes
  // two concurrent decisions race safely (one wins, the other gets a 409).
  const updated = await SubmissionModel.findOneAndUpdate(
    { _id: submissionId, campaignId: campaign._id, review: 'pending' },
    { $set: { review: decision === 'approve' ? 'approved' : 'rejected', reviewedAt: now } },
    { new: true },
  ).lean();
  if (!updated) {
    const exists = await SubmissionModel.exists({ _id: submissionId, campaignId: campaign._id });
    if (!exists) throw HttpError.notFound('Submission not found');
    throw HttpError.conflict('This submission has no pending review');
  }

  const payout = decision === 'approve' ? await settleAndRecord(submissionId, 'review-approved', now) : null;
  const saved = await SubmissionModel.findById(submissionId).lean();
  if (!saved) throw HttpError.notFound('Submission not found');
  return { submission: toView(saved, campaign), payout };
}

export interface PayoutEntryView {
  id: string;
  submissionId: string;
  campaignId: string;
  campaignName?: string;
  amount: number;
  views: number;
  milestoneViews: number;
  totalPaid: number;
  cappedByBudget: boolean;
  reason: PayoutReason;
  createdAt: string;
}

/** Creator: their payout ledger, newest first. */
export async function listCreatorPayouts(creatorId: string, limit = 100): Promise<PayoutEntryView[]> {
  const entries = await PayoutEntryModel.find({ creatorId }).sort({ createdAt: -1 }).limit(limit).lean();
  const campaigns = await CampaignModel.find({ _id: { $in: entries.map((e) => e.campaignId) } })
    .select('name')
    .lean();
  const names = new Map(campaigns.map((c) => [String(c._id), c.name]));
  return entries.map((e) => ({
    id: String(e._id),
    submissionId: String(e.submissionId),
    campaignId: String(e.campaignId),
    campaignName: names.get(String(e.campaignId)),
    amount: e.amount,
    views: e.views,
    milestoneViews: e.milestoneViews,
    totalPaid: e.totalPaid,
    cappedByBudget: e.cappedByBudget,
    reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  }));
}
