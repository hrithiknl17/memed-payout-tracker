/**
 * End-to-end API tests against a real (in-memory) MongoDB.
 * Run with: npm run test:integration
 * (mongodb-memory-server downloads a mongod binary on first run.)
 */
import './setupEnv'; // must be first: config is read at import time
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../src/app';
import { CampaignModel } from '../../src/models/Campaign';
import { SubmissionModel } from '../../src/models/Submission';

jest.setTimeout(60_000);

let mongod: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await mongoose.syncIndexes();
});

afterEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

let counter = 0;
async function signup(role: 'brand' | 'creator') {
  counter += 1;
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: `${role} ${counter}`, email: `${role}${counter}@test.dev`, password: 'password123', role })
    .expect(201);
  return res.body.token as string;
}

const ladder = [
  { views: 10_000, payout: 500 },
  { views: 50_000, payout: 2_000 },
  { views: 100_000, payout: 5_000 },
];

async function createCampaign(token: string, budget: number) {
  const res = await request(app)
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Summer Drop', platform: 'instagram', budget, milestones: ladder })
    .expect(201);
  return res.body.campaign.id as string;
}

async function submit(token: string, campaignId: string, n: number) {
  const res = await request(app)
    .post('/api/submissions')
    .set('Authorization', `Bearer ${token}`)
    .send({ campaignId, postUrl: `https://www.instagram.com/reel/post${n}/` })
    .expect(201);
  return res.body.submission.id as string;
}

const setViews = (id: string, views: number) =>
  request(app).patch(`/api/submissions/${id}/views`).send({ views });

describe('auth', () => {
  it('signs up, logs in, and rejects bad credentials', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'A', email: 'a@test.dev', password: 'password123', role: 'brand' })
      .expect(201);
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'A', email: 'A@test.dev', password: 'password123', role: 'brand' })
      .expect(409);
    const ok = await request(app).post('/api/auth/login').send({ email: 'a@test.dev', password: 'password123' }).expect(200);
    expect(ok.body.user.role).toBe('brand');
    await request(app).post('/api/auth/login').send({ email: 'a@test.dev', password: 'wrong' }).expect(401);
  });

  it('enforces roles', async () => {
    const creator = await signup('creator');
    await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${creator}`)
      .send({ name: 'x', platform: 'instagram', budget: 1000, milestones: ladder })
      .expect(403);
    await request(app).get('/api/campaigns/live').expect(401);
  });
});

describe('campaigns and submissions', () => {
  it('rejects an invalid ladder', async () => {
    const brand = await signup('brand');
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${brand}`)
      .send({ name: 'x', platform: 'youtube', budget: 1000, milestones: [{ views: 10, payout: 5000 }] })
      .expect(400);
    expect(res.body.details[0]).toMatch(/exceeds the campaign budget/);
  });

  it('rejects a link from the wrong platform and duplicate posts', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaignId = await createCampaign(brand, 10_000);
    await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${creator}`)
      .send({ campaignId, postUrl: 'https://youtube.com/watch?v=abc' })
      .expect(400);
    await submit(creator, campaignId, 1);
    // Same post, cosmetic differences (no www, query string, no trailing slash).
    await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${creator}`)
      .send({ campaignId, postUrl: 'https://instagram.com/reel/post1?igsh=xyz' })
      .expect(409);
  });
});

describe('views and payouts', () => {
  it('pays the highest milestone, shows earnings and brand spend', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaignId = await createCampaign(brand, 10_000);
    const subId = await submit(creator, campaignId, 1);

    const r1 = await setViews(subId, 60_000).expect(200);
    expect(r1.body.payout.paidNow).toBe(2_000);

    const r2 = await setViews(subId, 60_000).expect(200); // repeat → no double pay
    expect(r2.body.payout.paidNow).toBe(0);

    const r3 = await setViews(subId, 150_000).expect(200);
    expect(r3.body.payout.paidNow).toBe(3_000);

    const mine = await request(app).get('/api/submissions/mine').set('Authorization', `Bearer ${creator}`).expect(200);
    expect(mine.body.earnings.totalEarnings).toBe(5_000);

    const brandView = await request(app).get('/api/campaigns/mine').set('Authorization', `Bearer ${brand}`).expect(200);
    expect(brandView.body.campaigns[0]).toMatchObject({ spent: 5_000, remaining: 5_000, submissionCount: 1 });
  });

  it('caps at the remaining budget and drops the campaign from the live list', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaignId = await createCampaign(brand, 6_000);
    const a = await submit(creator, campaignId, 1);
    const b = await submit(creator, campaignId, 2);

    await setViews(a, 100_000).expect(200); // ₹5,000
    const rb = await setViews(b, 100_000).expect(200); // only ₹1,000 left
    expect(rb.body.payout).toMatchObject({ paidNow: 1_000, cappedByBudget: true });
    expect(rb.body.submission.unpaidDueToBudget).toBe(4_000);

    const live = await request(app).get('/api/campaigns/live').set('Authorization', `Bearer ${creator}`).expect(200);
    expect(live.body.campaigns).toHaveLength(0);

    await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${creator}`)
      .send({ campaignId, postUrl: 'https://www.instagram.com/reel/late/' })
      .expect(409);
  });

  it('never overspends or double-pays under concurrent updates', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const budget = 12_300;
    const campaignId = await createCampaign(brand, budget);
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) ids.push(await submit(creator, campaignId, i));

    // 10 posts × ₹5,000 owed, each updated 3 times at once = 30 concurrent requests.
    await Promise.all([...ids, ...ids, ...ids].map((id) => setViews(id, 200_000)));

    const campaign = await CampaignModel.findById(campaignId).lean();
    const subs = await SubmissionModel.find({ campaignId }).lean();
    const paid = subs.reduce((sum, s) => sum + s.paidAmount, 0);

    expect(campaign!.spent).toBe(budget);
    expect(paid).toBe(budget);
    subs.forEach((s) => expect(s.paidAmount).toBeLessThanOrEqual(5_000));
  });

  it('validates the views payload and unknown ids', async () => {
    await request(app).patch('/api/submissions/not-an-id/views').send({ views: 10 }).expect(404);
    await request(app).patch(`/api/submissions/${new mongoose.Types.ObjectId()}/views`).send({ views: 10 }).expect(404);
    await request(app).patch(`/api/submissions/${new mongoose.Types.ObjectId()}/views`).send({ views: -1 }).expect(400);
  });
});
