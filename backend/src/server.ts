import mongoose from 'mongoose';
import { createApp } from './app';
import { env } from './config/env';
import { closeCache } from './services/cache';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  // Build indexes (incl. the unique campaign+postUrl index) before serving.
  await mongoose.syncIndexes();
  console.log('[db] connected');

  const server = createApp().listen(env.PORT, () => {
    console.log(`[api] listening on :${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close();
    await Promise.allSettled([mongoose.disconnect(), closeCache()]);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
