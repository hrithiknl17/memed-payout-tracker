'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { login, signup } = useAuth();
  const [role, setRole] = useState<Role>('creator');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="auth-wrap card">
      <h1>{isSignup ? 'Create an account' : 'Welcome back'}</h1>
      <p className="sub">{isSignup ? 'Run campaigns as a brand, or earn as a creator.' : 'Log in to your dashboard.'}</p>

      <form onSubmit={onSubmit}>
        {isSignup && (
          <>
            <label>I am a…</label>
            <div className="role-pick">
              {(['creator', 'brand'] as const).map((r) => (
                <button type="button" key={r} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>
                  {r === 'brand' ? 'Brand' : 'Creator'}
                </button>
              ))}
            </div>
            <label htmlFor="name">{role === 'brand' ? 'Brand name' : 'Page / channel name'}</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </>
        )}

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />

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

        <button className="full" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      <p className="small muted" style={{ marginTop: 16 }}>
        {isSignup ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/signup">Create an account</Link>
          </>
        )}
      </p>
    </div>
  );
}
