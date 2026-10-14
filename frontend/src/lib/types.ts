// Mirrors the shapes returned by the backend API.

export type Role = 'brand' | 'creator';
export type Platform = 'instagram' | 'youtube';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface SocialAccount {
  platform: Platform;
  handle: string;
}

export interface Profile extends User {
  socials: SocialAccount[];
  createdAt: string;
}

export interface Milestone {
  views: number;
  payout: number;
}

/** `ended` = past its deadline (no new posts); `exhausted` = budget fully paid out. */
export type CampaignStatus = 'live' | 'exhausted' | 'ended';

export interface Campaign {
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

export interface BrandCampaign extends Campaign {
  submissionCount: number;
  flaggedCount: number;
}

export interface LiveCampaign extends Campaign {
  brandName: string;
}

export interface Submission {
  id: string;
  campaignId: string;
  campaignName?: string;
  /** Only on a brand's view of its campaign's posts. */
  creatorName?: string;
  platform?: Platform;
  postUrl: string;
  views: number;
  peakViews: number;
  entitledAmount: number;
  paidAmount: number;
  unpaidDueToBudget: number;
  cappedByBudget: boolean;
  flagged: boolean;
  flagReason?: string;
  viewsUpdatedAt: string;
  createdAt: string;
}

export interface Earnings {
  totalEarnings: number;
  unpaidDueToBudget: number;
  submissionCount: number;
}

export interface ViewsUpdateResult {
  submission: Submission;
  payout: { paidNow: number; totalPaid: number; entitled: number; cappedByBudget: boolean };
  spikeDetected: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  creatorId: string;
  name: string;
  earnings: number;
  platforms: Platform[];
}

export interface Leaderboard {
  totalDisbursed: number;
  creators: LeaderboardEntry[];
  me: { rank: number; earnings: number } | null;
}

export interface CampaignInput {
  name: string;
  platform: Platform;
  budget: number;
  milestones: Milestone[];
  objective?: string;
  thumbnailUrl?: string;
  endsAt?: string;
}

export interface CampaignEdit {
  name?: string;
  objective?: string;
  thumbnailUrl?: string;
  endsAt?: string | null;
}
