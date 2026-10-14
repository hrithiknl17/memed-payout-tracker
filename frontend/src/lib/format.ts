import type { Campaign, Milestone } from './types';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');
// K/M rather than en-IN's lakh ("1L"), matching how the app writes amounts (3.3K of 25K).
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const rupees = (n: number) => inr.format(n);
export const count = (n: number) => num.format(n);
export const shortCount = (n: number) => compact.format(n);
export const platformLabel = (p: string) => (p === 'youtube' ? 'YouTube' : 'Instagram');
/** Short format tag used on campaign cards, as in the mobile app ("Reels"). */
export const platformTag = (p: string) => (p === 'youtube' ? 'Shorts' : 'Reels');

/** Up to two initials for avatars: "Aarav Kapoor" → "AK". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '?';
  const last = parts[parts.length - 1] ?? '';
  return (parts.length > 1 ? first.charAt(0) + last.charAt(0) : first.slice(0, 2)).toUpperCase();
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "7 days left", "Ends today", or null when the campaign has no deadline. */
export function deadlineLabel(endsAt?: string): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 1) return 'Ends today';
  return `${days} days left`;
}

export function statusLabel(c: Pick<Campaign, 'status'>): string {
  return c.status === 'live' ? 'Live' : c.status === 'ended' ? 'Ended' : 'Budget used up';
}

/**
 * The next milestone a post hasn't reached yet, with how many more views it
 * needs and how much more it would earn (payouts aren't cumulative, so the
 * extra is the difference from the current tier). Null once at the top.
 */
export function nextMilestone(
  milestones: readonly Milestone[],
  views: number,
): { views: number; payout: number; viewsToGo: number; extra: number; progress: number } | null {
  const ladder = [...milestones].sort((a, b) => a.views - b.views);
  const next = ladder.find((m) => m.views > views);
  if (!next) return null;
  const current = [...ladder].reverse().find((m) => m.views <= views);
  const from = current?.views ?? 0;
  return {
    views: next.views,
    payout: next.payout,
    viewsToGo: next.views - views,
    extra: next.payout - (current?.payout ?? 0),
    progress: Math.max(0, Math.min(1, (views - from) / (next.views - from))),
  };
}

/** Highest milestone payout: the most a single post can earn. */
export const topPayout = (c: Pick<Campaign, 'milestones'>) => Math.max(0, ...c.milestones.map((m) => m.payout));

/** Value for an <input type="datetime-local"> from an ISO string, in local time. */
export function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
