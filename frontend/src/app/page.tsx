'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Ladder, Progress, Wordmark } from '@/components/brand';
import { homeFor, useAuth } from '@/lib/auth';

const EXAMPLE_LADDER = [
  { views: 10_000, payout: 500 },
  { views: 50_000, payout: 2_000 },
  { views: 100_000, payout: 5_000 },
];

const STEPS = [
  { title: 'Brand sets budget + ladder', body: 'A total budget and the view counts that unlock each payout.' },
  { title: 'Creator submits a post', body: 'Paste the Instagram or YouTube link into a live campaign.' },
  { title: 'Views cross a milestone → payout', body: 'The highest milestone reached is paid, capped by what is left in the budget.' },
];

/** Landing page for visitors; signed-in users go straight to their dashboard. */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user.role));
  }, [user, loading, router]);

  if (loading || user) return <p className="loading">Loading…</p>;

  return (
    <div className="landing">
      <header className="landing-top">
        <Wordmark />
        <Link href="/login" className="link">Log in</Link>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <p className="eyebrow">Campaign payout tracker</p>
            <h1>
              Views in.
              <br />
              <span className="marker">Payouts out.</span>
            </h1>
            <p className="lede">
              Brands set a budget and a milestone ladder. Creators post, views climb, payouts unlock — and a campaign
              never spends a rupee more than its budget.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary">
                I&apos;m a brand <ArrowRight size={17} />
              </Link>
              <Link href="/signup" className="btn btn-ghost">
                I&apos;m a creator <ArrowRight size={17} />
              </Link>
            </div>
            <p className="muted small">
              Already have an account? <Link href="/login" className="link">Log in</Link>
            </p>
          </div>

          <aside className="card receipt" aria-label="Example milestone ladder">
            <div className="receipt-head">
              <span className="eyebrow">Example ladder</span>
              <span className="mono muted small">#0001</span>
            </div>
            <Ladder milestones={EXAMPLE_LADDER} views={62_000} />
            <div className="receipt-row">
              <span>Post at <span className="mono">62,000</span> views</span>
              <strong className="mono paid">₹2,000</strong>
            </div>
            <p className="hint">You earn the highest milestone reached, not the sum.</p>
            <div className="receipt-meter">
              <div className="receipt-row small">
                <span className="eyebrow">Budget used</span>
                <span className="mono">₹7,500 / ₹20,000</span>
              </div>
              <Progress value={7_500} max={20_000} large label="Example budget used" />
            </div>
          </aside>
        </section>

        <section className="how" aria-labelledby="how-title">
          <h2 id="how-title">How it works</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="step-label mono">Step {i + 1}</span>
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="landing-foot">
        <Wordmark size="sm" />
        <span className="muted small">Payout tracking for creator campaigns.</span>
      </footer>
    </div>
  );
}
