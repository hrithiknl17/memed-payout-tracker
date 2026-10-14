'use client';

import { AlertTriangle, ArrowRight, ChevronRight, Info } from 'lucide-react';
import { PreviewBadge, Rupee } from '@/components/brand';
import { api } from '@/lib/api';
import { formatDate, rupees, shortCount } from '@/lib/format';
import { useCreatorData, useLoad } from '@/lib/hooks';

export default function WalletPage() {
  const { data, error } = useCreatorData();
  // The payout ledger: one row per credit, newest first.
  const ledger = useLoad(() => api.myPayouts());
  const credits = ledger.data?.payouts ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Payout</h1>
          <p>Money credited to you as your posts cross milestones.</p>
        </div>
      </div>

      {error && <p className="alert error">{error}</p>}

      <div className="banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '28px 32px', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
          <p style={{ margin: 0, color: 'var(--on-accent-muted)', fontSize: 18 }}>total balance</p>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, margin: '4px 0 0', fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 700 }}>
            <Rupee size={44} /> {data ? rupees(data.earnings.totalEarnings) : '—'}
          </p>
          {!!data?.earnings.unpaidDueToBudget && (
            <p style={{ margin: '6px 0 0', color: 'var(--on-accent-muted)' }}>
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
        {ledger.error && <p className="alert error">{ledger.error}</p>}
        {!ledger.data && !ledger.error && <div className="skeleton" style={{ height: 200 }} />}
        {ledger.data && credits.length === 0 && (
          <div className="card empty">
            <p>Your payout history will be shown here.</p>
          </div>
        )}
        {credits.length > 0 && (
          <div className="card">
            <div className="list">
              {credits.map((p) => (
                <div className="list-row" key={p.id}>
                  <Rupee size={34} />
                  <div className="grow">
                    <span className="title">Payout · {p.campaignName ?? 'Campaign'}</span>
                    <span className="sub">
                      {formatDate(p.createdAt)} ·{' '}
                      {p.milestoneViews > 0 ? `${shortCount(p.milestoneViews)} milestone` : 'milestone'} reached at{' '}
                      {p.views.toLocaleString('en-IN')} views
                      {p.reason === 'review-approved' && ' · released after brand review'}
                      {p.cappedByBudget && ' · partial, budget ran out'}
                    </span>
                  </div>
                  <strong style={{ color: 'var(--accent)', fontSize: 17 }}>+{rupees(p.amount)}</strong>
                </div>
              ))}
            </div>
            <p className="hint" style={{ display: 'flex', gap: 6, padding: '12px 20px', borderTop: '1px solid var(--line)' }}>
              <Info size={15} aria-hidden="true" /> One row per credit. A post that climbs milestones gets a new row for each top-up.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
