'use client';

import { AlertTriangle, ArrowRight, ChevronRight, Info } from 'lucide-react';
import { Coin, CoinStack, PreviewBadge } from '@/components/brand';
import { formatDate, rupees } from '@/lib/format';
import { useCreatorData } from '@/lib/hooks';

export default function WalletPage() {
  const { data, error } = useCreatorData();

  // Every post that has been credited money, newest first. Real data from the payout engine.
  const credits = (data?.submissions ?? [])
    .filter((s) => s.paidAmount > 0)
    .sort((a, b) => new Date(b.viewsUpdatedAt).getTime() - new Date(a.viewsUpdatedAt).getTime());

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Payout</h1>
          <p>Money credited to you as your posts cross milestones.</p>
        </div>
      </div>

      {error && <p className="alert error">{error}</p>}

      <div className="banner-blue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '28px 32px', flexWrap: 'wrap' }}>
        <CoinStack size={130} />
        <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
          <p style={{ margin: 0, color: '#c9d3ff', fontSize: 18 }}>total balance</p>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, margin: '4px 0 0', fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 700 }}>
            <Coin size={44} /> {data ? rupees(data.earnings.totalEarnings) : '—'}
          </p>
          {!!data?.earnings.unpaidDueToBudget && (
            <p style={{ margin: '6px 0 0', color: '#c9d3ff' }}>
              + {rupees(data.earnings.unpaidDueToBudget)} earned but not paid (campaign budget ran out)
            </p>
          )}
        </div>
      </div>

      <div className="grid-2 section" style={{ marginTop: 24 }}>
        <div className="card kyc-card">
          <div className="kyc-top">
            <span className="kyc-icon"><AlertTriangle size={26} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 18 }}>KYC required</strong>
                <PreviewBadge />
              </div>
              <p className="muted" style={{ margin: '4px 0 0' }}>You need to verify your KYC details before you can withdraw.</p>
            </div>
            <ArrowRight size={22} aria-hidden="true" />
          </div>
          <button className="kyc-cta" disabled title="KYC isn't connected to the backend yet">
            Complete KYC <ChevronRight size={18} />
          </button>
        </div>

        <div className="card card-pad" style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 18 }}>Withdraw to bank / UPI</strong>
            <PreviewBadge />
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Payout eligibility: earnings are credited instantly when a post crosses a milestone. Withdrawals open once KYC is live.
          </p>
          <button className="btn btn-primary" disabled>
            Withdraw {data ? rupees(data.earnings.totalEarnings) : ''}
          </button>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Transactions history</h2>
        </div>
        {!data && !error && <div className="skeleton" style={{ height: 200 }} />}
        {data && credits.length === 0 && (
          <div className="card empty">
            <CoinStack size={110} />
            <p>Your payout history will be shown here.</p>
          </div>
        )}
        {credits.length > 0 && (
          <div className="card">
            <div className="list">
              {credits.map((s) => (
                <div className="list-row" key={s.id}>
                  <Coin size={34} />
                  <div className="grow">
                    <span className="title">Payout · {s.campaignName ?? 'Campaign'}</span>
                    <span className="sub">Last credited {formatDate(s.viewsUpdatedAt)} · {s.views.toLocaleString('en-IN')} views</span>
                  </div>
                  <strong style={{ color: 'var(--good)', fontSize: 17 }}>+{rupees(s.paidAmount)}</strong>
                </div>
              ))}
            </div>
            <p className="hint" style={{ display: 'flex', gap: 6, padding: '12px 20px', borderTop: '1px solid var(--line)' }}>
              <Info size={15} aria-hidden="true" /> One row per post, showing its total credited so far.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
