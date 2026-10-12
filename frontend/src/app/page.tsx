'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homeFor, useAuth } from '@/lib/auth';

/** Sends people to their dashboard, or to login. */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(user ? homeFor(user.role) : '/login');
  }, [user, loading, router]);
  return <p className="muted">Loading…</p>;
}
