import type { NextConfig } from 'next';

// When NEXT_PUBLIC_API_URL is not set, the browser calls same-origin /api/* and
// Next proxies it here. That way the app works from any device on the network
// (e.g. a phone opening http://<your-ip>:3000) without CORS changes.
const apiProxyTarget = (process.env.API_PROXY_TARGET ?? 'http://localhost:4000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server for the Docker image.
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiProxyTarget}/api/:path*` }];
  },
};

export default nextConfig;
