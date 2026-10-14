'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, tokenStore } from './api';
import type { Role, User } from './types';

interface AuthState {
  user: User | null;
  /** True until we've checked localStorage for an existing session. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { name: string; email: string; password: string; role: Role }) => Promise<void>;
  logout: () => void;
  /** Re-fetch the signed-in user, e.g. after editing the profile. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const homeFor = (role: Role) => (role === 'brand' ? '/brand' : '/creator');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on first load.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      // Only a rejected token ends the session; a network blip (e.g. the API waking up) shouldn't log you out.
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) tokenStore.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  const finish = useCallback(
    ({ token, user }: { token: string; user: User }) => {
      tokenStore.set(token);
      setUser(user);
      router.replace(homeFor(user.role));
    },
    [router],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => finish(await api.login(email, password)),
      signup: async (input) => finish(await api.signup(input)),
      logout: () => {
        tokenStore.clear();
        setUser(null);
        router.replace('/login');
      },
      refresh: async () => setUser((await api.me()).user),
    }),
    [user, loading, finish, router],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/**
 * Guards a page to one role. Redirects to /login when signed out, or to the
 * user's own dashboard when signed in with the other role.
 */
export function useRequireRole(role: Role): User | null {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== role) router.replace(homeFor(user.role));
  }, [user, loading, role, router]);
  return user?.role === role ? user : null;
}
