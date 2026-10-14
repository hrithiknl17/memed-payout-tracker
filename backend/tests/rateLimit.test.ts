import './setupEnv';
import express from 'express';
import request from 'supertest';
import { limiter } from '../src/middleware/rateLimit';

describe('rate limiting', () => {
  it('returns a JSON 429 once the limit is used up', async () => {
    const app = express();
    app.get('/x', limiter({ windowMs: 60_000, limit: 2, message: 'Slow down', enabled: true }), (_req, res) => {
      res.json({ ok: true });
    });
    await request(app).get('/x').expect(200);
    await request(app).get('/x').expect(200);
    const res = await request(app).get('/x').expect(429);
    expect(res.body).toEqual({ error: 'Slow down' });
    expect(res.headers['ratelimit']).toBeDefined();
  });

  it('can be switched off', async () => {
    const app = express();
    app.get('/x', limiter({ windowMs: 60_000, limit: 1, message: 'Slow down', enabled: false }), (_req, res) => {
      res.json({ ok: true });
    });
    for (let i = 0; i < 3; i++) await request(app).get('/x').expect(200);
  });
});
