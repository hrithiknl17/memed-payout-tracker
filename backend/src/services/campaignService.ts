import { Types } from 'mongoose';
import { env } from '../config/env';
import { normaliseLadder, validateLadder, type Milestone } from '../domain/payout';
import { CampaignModel, type Platform } from '../models/Campaign';
import { PayoutEntryModel } from '../models/PayoutEntry';
import { SubmissionModel } from '../models/Submission';
import { UserModel } from '../models/User';
import { HttpError } from '../utils/httpError';
import { CACHE_KEYS, cacheDel, cacheGet, cacheSet } from './cache';

/**
 * `live`: accepting posts and paying out.
 * `exhausted`: the whole budget has been paid out.
 * `ended`: past its deadline, so no new posts (earlier posts can still earn).
 */
export type CampaignStatus = 'live' | 'exhausted' | 'ended';

export interface CampaignView {
  id: string;
  name: string;
  platform: Platform;
  budget: number;
  spent: number;
  remaining: number;
  milestones: Milestone[];
  status: CampaignStatus;
  objective?: string;
  thumbnailUrl?: string;
  endsAt?: string;
  createdAt: string;
}

export interface BrandCampaignView extends CampaignView {
  submissionCount: number;
  flaggedCount: number;
  /** Spiked submissions waiting for the brand to approve or reject. */
  pendingReviewCount: number;
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
  objective?: string | null;
  thumbnailUrl?: string | null;
  endsAt?: Date | null;
  createdAt: Date;
}

export function campaignStatus(c: Pick<CampaignLike, 'budget' | 'spent' | 'endsAt'>, now = new Date()): CampaignStatus {
  if (c.spent >= c.budget) return 'exhausted';
  if (c.endsAt && c.endsAt.getTime() <= now.getTime()) return 'ended';
  return 'live';
}

export function toCampaignView(c: CampaignLike, now = new Date()): CampaignView {
  return {
    id: String(c._id),
    name: c.name,
    platform: c.platform,
    budget: c.budget,
    spent: c.spent,
    remaining: Math.max(0, c.budget - c.spent),
    milestones: c.milestones.map((m) => ({ views: m.views, payout: m.payout })),
    status: campaignStatus(c, now),
    objective: c.objective || undefined,
    thumbnailUrl: c.thumbnailUrl || undefined,
    endsAt: c.endsAt ? c.endsAt.toISOString() : undefined,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function createCampaign(
  brandId: string,
  input: {
    name: string;
    platform: Platform;
    budget: number;
    milestones: Milestone[];
    objective?: string;
    thumbnailUrl?: string;
    endsAt?: string;
  },
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
    objective: input.objective || undefined,
    thumbnailUrl: input.thumbnailUrl || undefined,
    endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
  });
  await cacheDel(CACHE_KEYS.liveCampaigns);
  return toCampaignView(doc);
}

/**
 * Edit presentation fields only. Budget and milestones are deliberately not
 * editable: changing them after creators have posted would change the terms
 * those posts were made under, and could break the "never overspend" rule.
 */
export async function updateCampaign(
  brandId: string,
  campaignId: string,
  input: { name?: string; objective?: string; thumbnailUrl?: string; endsAt?: string | null },
): Promise<CampaignView> {
  const campaign = await getOwnedCampaign(campaignId, brandId);

  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.objective !== undefined) {
    if (input.objective) set.objective = input.objective;
    else unset.objective = '';
  }
  if (input.thumbnailUrl !== undefined) {
    if (input.thumbnailUrl) set.thumbnailUrl = input.thumbnailUrl;
    else unset.thumbnailUrl = '';
  }
  if (input.endsAt !== undefined) {
    if (input.endsAt) set.endsAt = new Date(input.endsAt);
    else unset.endsAt = '';
  }

  const updated = await CampaignModel.findByIdAndUpdate(
    campaign._id,
    { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true },
  ).lean();
  if (!updated) throw HttpError.notFound('Campaign not found');
  await cacheDel(CACHE_KEYS.liveCampaigns);
  return toCampaignView(updated);
}

/** A brand's own campaigns with budget spent vs remaining and submission stats. */
export async function listBrandCampaigns(brandId: string): Promise<BrandCampaignView[]> {
  const campaigns = await CampaignModel.find({ brandId }).sort({ createdAt: -1 }).lean();
  if (campaigns.length === 0) return [];

  const stats = await SubmissionModel.aggregate<{ _id: Types.ObjectId; count: number; flagged: number; pending: number }>([
    { $match: { campaignId: { $in: campaigns.map((c) => c._id) } } },
    {
      $group: {
        _id: '$campaignId',
        count: { $sum: 1 },
        flagged: { $sum: { $cond: ['$flagged', 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$review', 'pending'] }, 1, 0] } },
      },
    },
  ]);
  const byId = new Map(stats.map((s) => [String(s._id), s]));

  return campaigns.map((c) => {
    const s = byId.get(String(c._id));
    return {
      ...toCampaignView(c),
      submissionCount: s?.count ?? 0,
      flaggedCount: s?.flagged ?? 0,
      pendingReviewCount: s?.pending ?? 0,
    };
  });
}

async function withBrandNames(campaigns: (CampaignLike & { brandId: unknown })[]): Promise<LiveCampaignView[]> {
  const brands = await UserModel.find({ _id: { $in: campaigns.map((c) => c.brandId) } })
    .select('name')
    .lean();
  const brandNames = new Map(brands.map((b) => [String(b._id), b.name]));
  return campaigns.map((c) => ({
    ...toCampaignView(c),
    brandName: brandNames.get(String(c.brandId)) ?? 'Unknown brand',
  }));
}

/**
 * Campaigns creators can still join: budget left and not past their deadline.
 * Cached in Redis for a short TTL when REDIS_URL is set; the cache is cleared
 * when a campaign is created, edited, or runs out of budget. Deadlines are
 * re-checked on every read so a cached list never shows an ended campaign.
 */
export async function listLiveCampaigns(): Promise<LiveCampaignView[]> {
  const stillLive = (list: LiveCampaignView[]) =>
    list.filter((c) => !c.endsAt || new Date(c.endsAt).getTime() > Date.now());

  const cached = await cacheGet<LiveCampaignView[]>(CACHE_KEYS.liveCampaigns);
  if (cached) return stillLive(cached);

  const campaigns = await CampaignModel.find({
    $expr: { $lt: ['$spent', '$budget'] },
    $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: new Date() } }],
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  const views = await withBrandNames(campaigns);
  await cacheSet(CACHE_KEYS.liveCampaigns, views, env.CAMPAIGN_CACHE_TTL_SECONDS);
  return views;
}

/** Most recent campaigns that are over: budget used up or deadline passed. */
export async function listEndedCampaigns(limit = 12): Promise<LiveCampaignView[]> {
  const campaigns = await CampaignModel.find({
    $or: [{ $expr: { $gte: ['$spent', '$budget'] } }, { endsAt: { $lte: new Date() } }],
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  return withBrandNames(campaigns);
}

export async function getOwnedCampaign(campaignId: string, brandId: string) {
  if (!Types.ObjectId.isValid(campaignId)) throw HttpError.notFound('Campaign not found');
  const campaign = await CampaignModel.findById(campaignId).lean();
  if (!campaign) throw HttpError.notFound('Campaign not found');
  if (String(campaign.brandId) !== brandId) throw HttpError.forbidden('This campaign belongs to another brand');
  return campaign;
}

export interface CampaignAnalytics {
  /** One point per day with payouts (IST), plus the running total. */
  spendByDay: { date: string; amount: number; cumulative: number; payouts: number }[];
  /** For each milestone: posts that reached it, and posts whose top milestone it is. */
  milestones: { views: number; payout: number; reached: number; topTier: number }[];
  posts: number;
  totalViews: number;
  /** Posts that haven't reached the first milestone yet. */
  belowFirstMilestone: number;
  /** Payouts held for review: how many posts, and how much they're owed. */
  held: { posts: number; owed: number };
}

/** Brand: payout trend and milestone funnel for one of their campaigns. */
export async function getCampaignAnalytics(campaignId: string, brandId: string): Promise<CampaignAnalytics> {
  const campaign = await getOwnedCampaign(campaignId, brandId);

  const [days, subs] = await Promise.all([
    PayoutEntryModel.aggregate<{ _id: string; amount: number; payouts: number }>([
      { $match: { campaignId: campaign._id } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          amount: { $sum: '$amount' },
          payouts: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SubmissionModel.find({ campaignId: campaign._id }).select('views peakViews entitledAmount paidAmount review').lean(),
  ]);

  let running = 0;
  const spendByDay = days.map((d) => {
    running += d.amount;
    return { date: d._id, amount: d.amount, cumulative: running, payouts: d.payouts };
  });

  const ladder = normaliseLadder(campaign.milestones);
  const milestones = ladder.map((m, i) => {
    const next = ladder[i + 1];
    return {
      views: m.views,
      payout: m.payout,
      reached: subs.filter((s) => s.peakViews >= m.views).length,
      topTier: subs.filter((s) => s.peakViews >= m.views && (!next || s.peakViews < next.views)).length,
    };
  });

  const held = subs.filter((s) => s.review === 'pending' || s.review === 'rejected');
  return {
    spendByDay,
    milestones,
    posts: subs.length,
    totalViews: subs.reduce((n, s) => n + s.views, 0),
    belowFirstMilestone: ladder[0] ? subs.filter((s) => s.peakViews < ladder[0]!.views).length : subs.length,
    held: { posts: held.length, owed: held.reduce((n, s) => n + Math.max(0, s.entitledAmount - s.paidAmount), 0) },
  };
}
