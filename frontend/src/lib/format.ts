const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');
// K/M rather than en-IN's lakh ("1L"), to match how milestones are written in briefs (10K, 100K).
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const rupees = (n: number) => inr.format(n);
export const count = (n: number) => num.format(n);
export const shortCount = (n: number) => compact.format(n);
export const platformLabel = (p: string) => (p === 'youtube' ? 'YouTube' : 'Instagram');

/** Up to two initials for avatars: "Aarav Kapoor" → "AK". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

const ART_COLOURS = ['coral', 'mint', 'powder', 'lavender'] as const;
const STICKERS = ['LOL', 'brb', 'POV', 'fr fr', 'LOUD', 'yum'] as const;

/** Stable decorative art for a campaign card, derived from its id. */
export function campaignArt(id: string): { colour: (typeof ART_COLOURS)[number]; sticker: string } {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { colour: ART_COLOURS[hash % ART_COLOURS.length], sticker: STICKERS[hash % STICKERS.length] };
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
