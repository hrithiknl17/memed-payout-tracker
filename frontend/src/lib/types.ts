// Mirrors the shapes returned by the backend API.

export type Role = 'brand' | 'creator';
export type Platform = 'instagram' | 'youtube';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Milestone {
  views: number;
  payout: number;
}

export interface Campaign {
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
