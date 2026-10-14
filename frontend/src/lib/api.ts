import type {
  BrandCampaign,
  Campaign,
  Earnings,
  LiveCampaign,
  Milestone,
  Platform,
  Role,
  Submission,
  User,
  ViewsUpdateResult,
} from './types';

// Empty means same-origin: requests go to /api/* and next.config.ts proxies them to the backend.
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'memed_token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }

  /** Message plus any field-level details, for showing to the user. */
  get fullMessage(): string {
    if (Array.isArray(this.details) && this.details.length) {
      const parts = this.details.map((d) =>
        typeof d === 'string' ? d : (d as { message?: string }).message ?? JSON.stringify(d),
      );
      return `${this.message}: ${parts.join('; ')}`;
    }
    return this.message;
  }
}

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Could not reach the server. It may be waking up — try again in a few seconds.');
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.details);
  }
  return body as T;
}

const json = (data: unknown) => JSON.stringify(data);

export const api = {
  signup: (input: { name: string; email: string; password: string; role: Role }) =>
    request<{ token: string; user: User }>('/api/auth/signup', { method: 'POST', body: json(input) }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: json({ email, password }) }),
  me: () => request<{ user: User }>('/api/auth/me'),

  createCampaign: (input: { name: string; platform: Platform; budget: number; milestones: Milestone[] }) =>
    request<{ campaign: Campaign }>('/api/campaigns', { method: 'POST', body: json(input) }),
  myCampaigns: () => request<{ campaigns: BrandCampaign[] }>('/api/campaigns/mine'),
  liveCampaigns: () => request<{ campaigns: LiveCampaign[] }>('/api/campaigns/live'),
  campaignSubmissions: (id: string) => request<{ submissions: Submission[] }>(`/api/campaigns/${id}/submissions`),

  submitPost: (campaignId: string, postUrl: string) =>
    request<{ submission: Submission }>('/api/submissions', { method: 'POST', body: json({ campaignId, postUrl }) }),
  mySubmissions: () => request<{ submissions: Submission[]; earnings: Earnings }>('/api/submissions/mine'),
  updateViews: (submissionId: string, views: number) =>
    request<ViewsUpdateResult>(`/api/submissions/${submissionId}/views`, { method: 'PATCH', body: json({ views }) }),
};
