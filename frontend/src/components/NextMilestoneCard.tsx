import { Flame } from 'lucide-react';
import { count, rupees, shortCount } from '@/lib/format';
import type { Campaign, Milestone, Submission } from '@/lib/types';

interface Goal {
  submission: Submission;
  campaign: Campaign;
  from: Milestone;
  next: Milestone;
  toGo: number;
}

/** The post closest to its next milestone, among campaigns that can still pay. */
function closestGoal(submissions: Submission[], campaigns: Map<string, Campaign>): Goal | null {
  let best: Goal | null = null;
  for (const s of submissions) {
    const campaign = campaigns.get(s.campaignId);
    if (!campaign) continue; // campaign out of budget: nothing more to earn
    const ladder = [...campaign.milestones].sort((a, b) => a.views - b.views);
    const next = ladder.find((m) => m.views > s.peakViews);
    if (!next) continue;
    const from = [...ladder].reverse().find((m) => m.views <= s.peakViews) ?? { views: 0, payout: 0 };
    const toGo = next.views - s.peakViews;
    if (!best || toGo < best.toGo) best = { submission: s, campaign, from, next, toGo };
  }
  return best;
}

export function NextMilestoneCard({ submissions, campaigns }: { submissions: Submission[]; campaigns: Map<string, Campaign> }) {
  const goal = closestGoal(submissions, campaigns);

  if (!goal) {
    return (
      <div className="card milestone-card bg-butter">
        <div>
          <p className="kicker">Next payout milestone</p>
          <h2 style={{ fontSize: 21, fontWeight: 800 }}>
            {submissions.length ? 'Every live post is at the top rung.' : 'Your first milestone is one post away.'}
          </h2>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Pick a live campaign, post, and submit the link. You earn as soon as views cross a milestone.
        </p>
      </div>
    );
  }

  const { submission, campaign, from, next, toGo } = goal;
  const pct = Math.min(100, Math.max(0, ((submission.peakViews - from.views) / (next.views - from.views)) * 100));
  const gain = next.payout - submission.entitledAmount;

  return (
    <div className="card milestone-card bg-butter">
      <div className="milestone-top">
        <div>
          <p className="kicker">Next payout milestone</p>
          <h2>{campaign.name}</h2>
        </div>
        <div className="to-go">
          {shortCount(toGo)}
          <span>views to go</span>
        </div>
      </div>
      <div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Progress to next milestone"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-meta" style={{ marginTop: 8 }}>
          <span>{count(submission.peakViews)} views</span>
          <span style={{ color: '#c4553c' }}>
            {shortCount(next.views)} milestone · +{rupees(gain)}
          </span>
        </div>
      </div>
      <p className="small" style={{ margin: 0, fontWeight: 700 }}>
        <Flame size={14} color="#c4553c" aria-hidden="true" /> One good push gets you there.
      </p>
    </div>
  );
}
