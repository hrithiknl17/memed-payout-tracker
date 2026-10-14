'use client';

import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { homeFor, useAuth } from '@/lib/auth';
import { initials } from '@/lib/format';
import type { User } from '@/lib/types';

export interface NavItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo">
      <span className="logo-mark" aria-hidden="true">
        m
      </span>
      Meme&apos;d
    </Link>
  );
}

/** Sidebar layout shared by the brand and creator workspaces. */
export function AppShell<T extends string>({
  user,
  nav,
  active,
  onNavigate,
  children,
}: {
  user: User;
  nav: NavItem<T>[];
  active: T;
  onNavigate: (id: T) => void;
  children: ReactNode;
}) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const home = homeFor(user.role);

  const go = (id: T) => {
    onNavigate(id);
    setOpen(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className={`app${open ? ' nav-open' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-top">
          <Logo href={home} />
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={22} />
          </button>
        </div>

        <div className="user-chip">
          <div className="avatar" aria-hidden="true">
            {initials(user.name)}
          </div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role} workspace</span>
          </div>
        </div>

        <nav className="nav">
          <p className="nav-kicker">Workspace</p>
          {nav.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              className={`nav-item${active === id ? ' active' : ''}`}
              aria-current={active === id ? 'page' : undefined}
              onClick={() => go(id)}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
              {count ? <span className="nav-count">{count}</span> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={logout}>
            <LogOut size={18} aria-hidden="true" />
            Log out
          </button>
          <p className="sidebar-note">
            <span className="live-dot" aria-hidden="true" />
            Payouts land the moment a post crosses a milestone.
          </p>
        </div>
      </aside>

      <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="main">
        <div className="mobile-bar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <Logo href={home} />
        </div>
        {children}
      </div>
    </div>
  );
}
