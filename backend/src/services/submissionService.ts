import { Types } from 'mongoose';
import { env } from '../config/env';
import { entitledPayout } from '../domain/payout';
import { settleSubmission, type SettlementResult } from '../domain/settlement';
import { detectSpike } from '../domain/spike';
import { CampaignModel } from '../models/Campaign';
import { SubmissionModel } from '../models/Submission';
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

  const postUrl = normalisePostUrl(input.postUrl, campaign.platform);
  if (!postUrl) {
    throw HttpError.badRequest(
      `That doesn't look like a ${campaign.platform === 'instagram' ? 'Instagram' : 'YouTube'} post link`,
    );
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

/**
 * Records a new view count for a post (simulating platform data) and pays out
 * anything newly earned. Safe to call concurrently and repeatedly.
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
  //    - A spike flag, once raised, stays raised for the brand to review.
  const set: Record<string, unknown> = { views, viewsUpdatedAt: now };
  if (spike.isSpike) {
    set.flagged = true;
    set.flagReason = `+${spike.gain} views at ~${spike.ratePerMinute}/min`;
  }
  await SubmissionModel.updateOne(
    { _id: existing._id },
    {
      $set: set,
      $max: { peakViews: views, entitledAmount: entitledPayout(campaign.milestones, views) },
    },
  );

  // 2) Pay whatever is newly owed (atomic, idempotent, budget-capped).
  const payout = await settleSubmission(store, submissionId);

  // 3) If this payout used the last of the budget, drop the campaign from the
  //    cached "live" list straight away.
  if (payout.paidNow > 0) {
    const fresh = await CampaignModel.findById(campaign._id).select('spent budget').lean();
    if (fresh && fresh.spent >= fresh.budget) await cacheDel(CACHE_KEYS.liveCampaigns);
  }

  const saved = await SubmissionModel.findById(submissionId).lean();
  if (!saved) throw HttpError.notFound('Submission not found');
  return { submission: toView(saved, campaign), payout, spikeDetected: spike.isSpike };
}
