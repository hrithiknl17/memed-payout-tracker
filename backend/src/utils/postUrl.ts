import type { Platform } from '../models/Campaign';

const PLATFORM_HOSTS: Record<Platform, string[]> = {
  instagram: ['instagram.com'],
  youtube: ['youtube.com', 'youtu.be'],
};

/**
 * Validates that a link belongs to the campaign's platform and normalises it
 * (https, lowercase host, no "www."/"m.", no query string, no trailing slash)
 * so the same post can't be submitted twice with cosmetic differences.
 *
 * YouTube keeps the `v` query parameter because that IS the video id.
 * Returns null if the link isn't a valid post on that platform.
 */
export function normalisePostUrl(raw: string, platform: Platform): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const allowed = PLATFORM_HOSTS[platform];
  if (!allowed.some((h) => host === h)) return null;

  const path = url.pathname.replace(/\/+$/, '');
  if (!path) return null; // a bare domain isn't a post

  let query = '';
  if (host === 'youtube.com' && path === '/watch') {
    const v = url.searchParams.get('v');
    if (!v) return null;
    query = `?v=${v}`;
  }
  return `https://${host}${path}${query}`;
}
