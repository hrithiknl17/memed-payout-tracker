'use client';

import { ArrowRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Coin, PlatformIcon } from '@/components/brand';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { initials, shortCount } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { LeaderboardEntry } from '@/lib/types';

const MEDAL = ['gold', 'silver', 'bronze'] as const;

function Podium({ entry, place }: { entry: LeaderboardEntry; place: 0 | 1 | 2 }) {
  return (
    <div className={`podium-spot${place === 0 ? ' first' : ''}`}>
      <span className="avatar" aria-hidden="true">{initials(entry.name).charAt(0)}</span>
      <span className={`medal ${MEDAL[place]}`}>#{place + 1}</span>
      <strong>{entry.name}</strong>
      <span className="coin-amount small">
        <Coin size={16} /> {shortCount(entry.earnings)}
        {entry.platforms.map((p) => <PlatformIcon key={p} platform={p} size={16} />)}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { data, error } = useLoad(() => api.leaderboard());
  const [first, second, third, ...rest] = data?.creators ?? [];
  const meEntry = data?.creators.find((c) => c.creatorId === user?.id);

  return (
    <div className="page">
      <div className="banner-blue" style={{ padding: '28px 30px' }}>
        <h1 style={{ fontSize: 22, textAlign: 'center' }}>All Time Leaderboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22 }}>
          <span className="avatar lg" aria-hidden="true">{initials(user?.name ?? '?').charAt(0)}</span>
          <strong style={{ fontSize: 24 }}>{user?.name}</strong>
        </div>
        <div className="grid-3" style={{ marginTop: 22, textAlign: 'center', gap: 0 }}>
          {[
            ['Your position', data?.me ? `#${data.me.rank}` : '--'],
            ['Your earnings', data?.me ? shortCount(data.me.earnings) : '--'],
            ['Platforms', meEntry ? String(meEntry.platforms.length) : '--'],
          ].map(([label, value], i) => (
            <div key={label} style={{ padding: '6px 10px', borderLeft: i ? '1px solid #ffffff55' : 0 }}>
              <div style={{ color: '#c9d3ff' }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="alert error">{error}</p>}
      {!data && !error && <div className="skeleton section" style={{ height: 260 }} />}

      {data && data.creators.length === 0 && (
        <div className="card empty section">
          <Trophy size={40} color="var(--cobalt)" aria-hidden="true" />
          <h3>No payouts yet</h3>
          <p>The leaderboard fills up as creators earn from campaigns.</p>
        </div>
      )}

      {first && (
        <div className="card podium section">
          {second ? <Podium entry={second} place={1} /> : <span />}
          <Podium entry={first} place={0} />
          {third ? <Podium entry={third} place={2} /> : <span />}
        </div>
      )}

      <div className="card card-pad section" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', background: 'var(--cream-2)', boxShadow: 'none', borderColor: 'var(--line)' }}>
        <Trophy size={40} color="var(--cobalt)" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <strong style={{ fontSize: 18 }}>Participate. Earn. Get featured!</strong>
          <p className="muted" style={{ margin: '4px 0 0' }}>Rankings are based on what creators have actually been paid.</p>
        </div>
        <Link href="/creator" className="btn btn-soft">
          Explore Challenges <ArrowRight size={17} />
        </Link>
      </div>

      {rest.length > 0 && (
        <div className="card section">
          {rest.map((c) => (
            <div className={`rank-row${c.creatorId === user?.id ? ' me' : ''}`} key={c.creatorId}>
              <strong>#{c.rank}</strong>
              <span>{c.name}</span>
              <span className="coin-amount"><Coin /> {shortCount(c.earnings)}</span>
              <span className="platforms" style={{ display: 'flex', gap: 4 }}>
                {c.platforms.map((p) => <PlatformIcon key={p} platform={p} size={20} />)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
