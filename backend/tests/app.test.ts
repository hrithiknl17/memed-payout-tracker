import request from 'supertest';
import { createApp } from '../src/app';

/** HTTP-layer checks that never reach the database. */
const app = createApp();

describe('app (no database needed)', () => {
  it('serves /health', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error).toMatch(/No route/);
  });

  it('requires a bearer token on protected routes', async () => {
    await request(app).get('/api/campaigns/live').expect(401);
    await request(app).get('/api/campaigns/live').set('Authorization', 'Bearer garbage').expect(401);
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(res.body.error).toMatch(/not valid JSON/);
  });

  it.each([{ views: -5 }, { views: 1.5 }, { views: '100' }, {}])(
    'rejects invalid view payload %p before touching the DB',
    async (body) => {
      const res = await request(app).patch('/api/submissions/abc/views').send(body).expect(400);
      expect(res.body.error).toBe('Validation failed');
    },
  );

  it('validates signup input with field-level errors', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: '', email: 'nope', password: 'short', role: 'admin' })
      .expect(400);
    expect(res.body.details.map((d: { field: string }) => d.field).sort()).toEqual(['email', 'name', 'password', 'role']);
  });
});
