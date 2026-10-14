import { Types } from 'mongoose';
import { env } from '../config/env';
import { normaliseLadder, validateLadder, type Milestone } from '../domain/payout';
import { CampaignModel, type Platform } from '../models/Campaign';
import { SubmissionModel } from '../models/Submission';
import { UserModel } from '../models/User';
import { HttpError } from '../utils/httpError';
import { CACHE_KEYS, cacheDel, cacheGet, cacheSet } from './cache';

export interface CampaignView {
  id: string;
  name: string;
  platform: Platform;
  budget: number;
  spent: number;
  remaining: number;
  milestones: Milestone[];
  status: 'live' | 'exhausted';
  createdAt: string;
}

export interface BrandCampaignView extends CampaignView {
  submissionCount: number;
  flaggedCount: number;
}

export interface LiveCampaignView extends CampaignView {
  brandName: string;
}

interface CampaignLike {
  _id: unknown;
  name: string;
  platform: Platform;
  budget: number;
  spent: number;
  milestones: { views: number; payout: number }[];
  createdAt: Date;
}

export function toCampaignView(c: CampaignLike): CampaignView {
  const remaining = Math.max(0, c.budget - c.spent);
  return {
    id: String(c._id),
    name: c.name,
    platform: c.platform,
    budget: c.budget,
    spent: c.spent,
    remaining,
    milestones: c.milestones.map((m) => ({ views: m.views, payout: m.payout })),
    status: remaining > 0 ? 'live' : 'exhausted',
    createdAt: c.createdAt.toISOString(),
  };
}

export async function createCampaign(
  brandId: string,
  input: { name: string; platform: Platform; budget: number; milestones: Milestone[] },
): Promise<CampaignView> {
  const errors = validateLadder(input.milestones, input.budget);
  if (errors.length) throw HttpError.badRequest('Invalid milestone ladder', errors);

  const doc = await CampaignModel.create({
    brandId,
    name: input.name,
    platform: input.platform,
    budget: input.budget,
    spent: 0,
    milestones: normaliseLadder(input.milestones),
  });
  await cacheDel(CACHE_KEYS.liveCampaigns);
  return toCampaignView(doc);
}

/** A brand's own campaigns with budget spent vs remaining and submission stats. */
export async function listBrandCampaigns(brandId: string): Promise<BrandCampaignView[]> {
  const campaigns = await CampaignModel.find({ brandId }).sort({ createdAt: -1 }).lean();
  if (campaigns.length === 0) return [];

  const stats = await SubmissionModel.aggregate<{ _id: Types.ObjectId; count: number; flagged: number }>([
    { $match: { campaignId: { $in: campaigns.map((c) => c._id) } } },
    {
      $group: {
        _id: '$campaignId',
        count: { $sum: 1 },
        flagged: { $sum: { $cond: ['$flagged', 1, 0] } },
      },
    },
  ]);
  const byId = new Map(stats.map((s) => [String(s._id), s]));

  return campaigns.map((c) => {
    const s = byId.get(String(c._id));
    return { ...toCampaignView(c), submissionCount: s?.count ?? 0, flaggedCount: s?.flagged ?? 0 };
  });
}

/**
 * Campaigns creators can still earn from (budget not exhausted).
 * Cached in Redis for a short TTL when REDIS_URL is set; the cache is cleared
 * when a campaign is created or runs out of budget.
 */
export async function listLiveCampaigns(): Promise<LiveCampaignView[]> {
  const cached = await cacheGet<LiveCampaignView[]>(CACHE_KEYS.liveCampaigns);
  if (cached) return cached;

  const campaigns = await CampaignModel.find({ $expr: { $lt: ['$spent', '$budget'] } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  const brands = await UserModel.find({ _id: { $in: campaigns.map((c) => c.brandId) } })
    .select('name')
    .lean();
  const brandNames = new Map(brands.map((b) => [String(b._id), b.name]));
  const views = campaigns.map((c) => ({
    ...toCampaignView(c),
    brandName: brandNames.get(String(c.brandId)) ?? 'Unknown brand',
  }));
  await cacheSet(CACHE_KEYS.liveCampaigns, views, env.CAMPAIGN_CACHE_TTL_SECONDS);
  return views;
}

export async function getOwnedCampaign(campaignId: string, brandId: string) {
  if (!Types.ObjectId.isValid(campaignId)) throw HttpError.notFound('Campaign not found');
  const campaign = await CampaignModel.findById(campaignId).lean();
  if (!campaign) throw HttpError.notFound('Campaign not found');
  if (String(campaign.brandId) !== brandId) throw HttpError.forbidden('This campaign belongs to another brand');
  return campaign;
}
