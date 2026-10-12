'use client';

import Link from 'next/link';
import { homeFor, useAuth } from '@/lib/auth';

export function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <Link href={user ? homeFor(user.role) : '/'} className="brandmark">
        meme<span>&apos;d</span>
      </Link>
      <div className="topbar-right">
        {user ? (
          <>
            <span>
              {user.name} · {user.role}
            </span>
            <button className="secondary" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}
