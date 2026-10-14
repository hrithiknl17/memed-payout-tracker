import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { corsOrigins, env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { authRouter } from './routes/auth.routes';
import { campaignRouter } from './routes/campaign.routes';
import { creatorRouter } from './routes/creator.routes';
import { submissionRouter } from './routes/submission.routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Behind a proxy, rate limits must key on the real client IP, not the proxy's.
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/campaigns', campaignRouter);
  app.use('/api/submissions', submissionRouter);
  app.use('/api/creators', creatorRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
