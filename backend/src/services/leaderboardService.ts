import { Types } from 'mongoose';
import { CampaignModel, type Platform } from '../models/Campaign';
import { SubmissionModel } from '../models/Submission';
import { UserModel } from '../models/User';

export interface LeaderboardEntry {
  rank: number;
  creatorId: string;
  name: string;
  earnings: number;
  platforms: Platform[];
}

export interface Leaderboard {
  /** Total paid to creators across every campaign. */
  totalDisbursed: number;
  creators: LeaderboardEntry[];
  /** The requesting creator's own standing; null for brands or creators with no earnings yet. */
  me: { rank: number; earnings: number } | null;
}

/** Creators ranked by what they have actually been paid. Everything here is derived from real payouts. */
export async function getLeaderboard(viewerId: string, limit = 20): Promise<Leaderboard> {
  const [ranked, disbursed] = await Promise.all([
    SubmissionModel.aggregate<{ _id: Types.ObjectId; earnings: number; platforms: Platform[] }>([
      { $match: { paidAmount: { $gt: 0 } } },
      { $lookup: { from: CampaignModel.collection.name, localField: 'campaignId', foreignField: '_id', as: 'c' } },
      { $unwind: '$c' },
      { $group: { _id: '$creatorId', earnings: { $sum: '$paidAmount' }, platforms: { $addToSet: '$c.platform' } } },
      { $sort: { earnings: -1, _id: 1 } },
    ]),
    CampaignModel.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: '$spent' } } }]),
  ]);

  const top = ranked.slice(0, limit);
  const users = await UserModel.find({ _id: { $in: top.map((r) => r._id) } })
    .select('name')
    .lean();
  const names = new Map(users.map((u) => [String(u._id), u.name]));

  const myIndex = ranked.findIndex((r) => String(r._id) === viewerId);
  return {
    totalDisbursed: disbursed[0]?.total ?? 0,
    creators: top.map((r, i) => ({
      rank: i + 1,
      creatorId: String(r._id),
      name: names.get(String(r._id)) ?? 'Creator',
      earnings: r.earnings,
      platforms: r.platforms.sort(),
    })),
    me: myIndex >= 0 ? { rank: myIndex + 1, earnings: ranked[myIndex]!.earnings } : null,
  };
}
