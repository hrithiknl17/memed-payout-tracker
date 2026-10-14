import { Timer } from 'lucide-react';
import Link from 'next/link';
import { count, deadlineLabel, platformTag, shortCount, statusLabel, topPayout } from '@/lib/format';
import type { Campaign } from '@/lib/types';
import { PlatformIcon, Progress, Rupee, Thumb } from './brand';

/** The campaign card from the app's home feed: cover, platform, objective, distributed bar, "Max per post". */
export function CampaignCard({ campaign, href, brandName }: { campaign: Campaign; href: string; brandName?: string }) {
  const ended = campaign.status !== 'live';
  const deadline = deadlineLabel(campaign.endsAt);

  return (
    <Link href={href} className={`card campaign-card${ended ? ' ended' : ''}`}>
      <div className="thumb">
        <Thumb src={campaign.thumbnailUrl} alt="" />
        {ended ? (
          <span className="pill dark">{statusLabel(campaign)}</span>
        ) : (
          deadline && (
            <span className="pill dark">
              <Timer size={15} aria-hidden="true" /> {deadline}
            </span>
          )
        )}
      </div>
      <div className="campaign-body">
        <div className="pills">
          <span className="pill">
            <PlatformIcon platform={campaign.platform} /> {platformTag(campaign.platform)}
          </span>
          {brandName && <span className="pill outline">{brandName}</span>}
        </div>
        <h3 title={campaign.name}>{campaign.name}</h3>
        <p className="objective">{campaign.objective || 'Objectives on the campaign page'}</p>
        {!ended && (
          <>
            <div className="distributed">
              <Rupee size={16} />
              <strong>
                {shortCount(campaign.spent)} of {shortCount(campaign.budget)}
              </strong>
              <span>distributed to creators</span>
            </div>
            <Progress value={campaign.spent} max={campaign.budget} label="Budget distributed" />
          </>
        )}
        <div className="earn-btn">
          <small>Max per post</small>
          <strong>
            <Rupee size={22} /> {count(topPayout(campaign))}
          </strong>
        </div>
      </div>
    </Link>
  );
}
