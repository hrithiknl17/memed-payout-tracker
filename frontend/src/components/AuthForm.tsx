'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { Coin, PixelLogo, PlatformIcon, Thumb } from './brand';

const ROLE_OPTIONS: { id: Role; title: string; blurb: string }[] = [
  { id: 'creator', title: 'Creator', blurb: 'Post for campaigns, earn by views' },
  { id: 'brand', title: 'Brand', blurb: 'Run campaigns with a budget' },
];

const TAPE = 'clip → meme → post → earn → '.repeat(8);

/** Decorative collage from the app's onboarding screen. Stock photos, invented campaigns. */
function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="tape one">{TAPE}</div>
      <div className="tape two">{TAPE}</div>
      <div className="payout-chip">
        <small>Your max payout</small>
        <strong><Coin size={22} /> 15,000</strong>
      </div>
      <div className="float-card a">
        <div className="thumb">
          <Thumb src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=70" alt="" />
        </div>
        <div className="body">
          <strong>Midnight snack drop</strong>
          <span className="pill outline small"><PlatformIcon platform="instagram" size={14} /> instagram reels</span>
        </div>
      </div>
      <div className="float-card b">
        <div className="thumb">
          <Thumb src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=70" alt="" />
        </div>
        <div className="body">
          <strong>Outfit math is mathing</strong>
          <span className="pill outline small"><PlatformIcon platform="youtube" size={14} /> shorts</span>
        </div>
      </div>
      <span className="hero-coin" style={{ top: '8%', left: '2%' }}><Coin size={46} tilt={-20} /></span>
      <span className="hero-coin" style={{ bottom: '6%', left: '30%' }}><Coin size={54} tilt={16} /></span>
      <span className="hero-coin" style={{ top: '18%', right: '6%' }}><Coin size={38} tilt={30} /></span>
    </div>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { login, signup } = useAuth();
  const [role, setRole] = useState<Role>('creator');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup({ name, email, password, role });
    } catch (err) {
      setError(err instanceof ApiError ? err.fullMessage : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === 'signup';
  return (
    <main className="auth">
      <section className="auth-hero">
        <PixelLogo size="lg" />
        <HeroArt />
        <div>
          <h1>
            <small>You slay.</small>
            We&apos;ll <span className="blue">pay.</span>
          </h1>
          <p>Participate in campaigns to earn real cash for posting brand-approved content.</p>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <h2>
            {isSignup ? 'Create your' : 'Welcome'}
            <span className="blue">{isSignup ? 'account.' : 'back.'}</span>
          </h2>
          <p className="muted" style={{ margin: '10px 0 26px' }}>
            {isSignup ? 'Earn as a creator, or run campaigns as a brand.' : 'Log in to your dashboard.'}
          </p>

          <form onSubmit={onSubmit}>
            {isSignup && (
              <>
                <div className="field">
                  <span className="label" id="role-label">I am a…</span>
                  <div className="role-pick" role="radiogroup" aria-labelledby="role-label">
                    {ROLE_OPTIONS.map((r) => (
                      <button
                        type="button"
                        key={r.id}
                        role="radio"
                        aria-checked={role === r.id}
                        className={`role-option${role === r.id ? ' active' : ''}`}
                        onClick={() => setRole(r.id)}
                      >
                        <strong>{r.title}</strong>
                        <span>{r.blurb}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="name">{role === 'brand' ? 'Brand name' : 'Page / channel name'}</label>
                  <input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSignup ? 8 : 1}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
              {isSignup && <p className="hint">At least 8 characters.</p>}
            </div>

            {isSignup && (
              <label className="check" style={{ marginTop: 18 }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
                I agree to the terms &amp; privacy policy.
              </label>
            )}

            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 24, padding: 16, fontSize: 17 }}>
              {busy ? 'Please wait…' : isSignup ? 'Start earning' : 'Log in'} <ArrowRight size={18} />
            </button>
            {error && <p className="alert error" role="alert">{error}</p>}
          </form>

          <p className="muted" style={{ marginTop: 20 }}>
            {isSignup ? (
              <>
                Already have an account? <Link href="/login" className="link">Log in</Link>
              </>
            ) : (
              <>
                New here? <Link href="/signup" className="link">Sign up</Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
