import { Coin } from '@/components/brand';
import { count, nextMilestone, shortCount } from '@/lib/format';
import type { Milestone } from '@/lib/types';

/** "18K more views to unlock +₹5,000", with progress toward that milestone. */
export function NextMilestone({ milestones, views }: { milestones: Milestone[]; views: number }) {
  const next = nextMilestone(milestones, views);
  if (!next) {
    return (
      <p className="next-milestone done">
        <Coin size={16} /> Top milestone reached. This post has earned the most it can.
      </p>
    );
  }
  return (
    <div className="next-milestone">
      <p>
        <strong>{shortCount(next.viewsToGo)} more views</strong> to unlock{' '}
        <span className="coin-amount"><Coin size={15} /> +{count(next.extra)}</span>
        <span className="muted"> at {shortCount(next.views)}</span>
      </p>
      <div
        className="next-milestone-bar"
        role="progressbar"
        aria-label={`Progress to the ${shortCount(next.views)} views milestone`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(next.progress * 100)}
      >
        <span style={{ width: `${next.progress * 100}%` }} />
      </div>
    </div>
  );
}
