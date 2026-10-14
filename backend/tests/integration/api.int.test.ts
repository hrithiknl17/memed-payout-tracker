/**
 * End-to-end API tests against a real (in-memory) MongoDB.
 * Run with: npm run test:integration
 * (mongodb-memory-server downloads a mongod binary on first run.)
 */
import '../setupEnv'; // must be first: config is read at import time
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
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

    // Display names: creators see who runs a campaign, brands see who posted.
    const live = await request(app).get('/api/campaigns/live').set('Authorization', `Bearer ${creator}`).expect(200);
    expect(live.body.campaigns[0].brandName).toMatch(/^brand \d+$/);
    const posts = await request(app)
      .get(`/api/campaigns/${campaignId}/submissions`)
      .set('Authorization', `Bearer ${brand}`)
      .expect(200);
    expect(posts.body.submissions[0].creatorName).toMatch(/^creator \d+$/);

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

    const totals = async () => {
      const campaign = await CampaignModel.findById(campaignId).lean();
      const subs = await SubmissionModel.find({ campaignId }).lean();
      return { spent: campaign!.spent, paid: subs.reduce((sum, s) => sum + s.paidAmount, 0), subs };
    };

    const after = await totals();
    expect(after.spent).toBeLessThanOrEqual(budget); // never overspent
    expect(after.paid).toBe(after.spent); // every reserved rupee reached a creator
    after.subs.forEach((s) => expect(s.paidAmount).toBeLessThanOrEqual(5_000)); // no double-pay

    // One more (sequential) round tops up anyone left short by a momentary reservation.
    for (const id of ids) await setViews(id, 200_000).expect(200);
    const settled = await totals();
    expect(settled.spent).toBe(budget);
    expect(settled.paid).toBe(budget);
  });

  it('validates the views payload and unknown ids', async () => {
    await request(app).patch('/api/submissions/not-an-id/views').send({ views: 10 }).expect(404);
    await request(app).patch(`/api/submissions/${new mongoose.Types.ObjectId()}/views`).send({ views: 10 }).expect(404);
    await request(app).patch(`/api/submissions/${new mongoose.Types.ObjectId()}/views`).send({ views: -1 }).expect(400);
  });
});

describe('campaign details, deadlines and editing', () => {
  it('stores objective, thumbnail and deadline, and rejects past deadlines', async () => {
    const brand = await signup('brand');
    const endsAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${brand}`)
      .send({
        name: 'Snack drop',
        platform: 'instagram',
        budget: 10_000,
        milestones: ladder,
        objective: 'Post a reel reacting to the new flavour',
        thumbnailUrl: 'https://images.example.com/cover.jpg',
        endsAt,
      })
      .expect(201);
    expect(res.body.campaign).toMatchObject({ objective: 'Post a reel reacting to the new flavour', endsAt, status: 'live' });

    await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${brand}`)
      .send({ name: 'x', platform: 'instagram', budget: 10_000, milestones: ladder, endsAt: '2020-01-01T00:00:00Z' })
      .expect(400);
  });

  it('closes a campaign at its deadline but keeps paying posts made before it', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaignId = await createCampaign(brand, 10_000);
    const subId = await submit(creator, campaignId, 1);

    // Simulate the deadline passing (the API only accepts future deadlines).
    await CampaignModel.updateOne({ _id: campaignId }, { $set: { endsAt: new Date(Date.now() - 1000) } });

    const live = await request(app).get('/api/campaigns/live').set('Authorization', `Bearer ${creator}`).expect(200);
    expect(live.body.campaigns.map((c: { id: string }) => c.id)).not.toContain(campaignId);
    const ended = await request(app).get('/api/campaigns/ended').set('Authorization', `Bearer ${creator}`).expect(200);
    expect(ended.body.campaigns.find((c: { id: string }) => c.id === campaignId)).toMatchObject({ status: 'ended' });

    await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${creator}`)
      .send({ campaignId, postUrl: 'https://www.instagram.com/reel/too-late/' })
      .expect(409);

    const r = await setViews(subId, 60_000).expect(200);
    expect(r.body.payout.paidNow).toBe(2_000);
  });

  it('lets the owning brand edit presentation fields but never budget or milestones', async () => {
    const brand = await signup('brand');
    const other = await signup('brand');
    const campaignId = await createCampaign(brand, 10_000);

    const edited = await request(app)
      .patch(`/api/campaigns/${campaignId}`)
      .set('Authorization', `Bearer ${brand}`)
      .send({ name: 'Renamed', objective: 'New brief', thumbnailUrl: 'https://images.example.com/new.jpg' })
      .expect(200);
    expect(edited.body.campaign).toMatchObject({ name: 'Renamed', objective: 'New brief', budget: 10_000 });

    const cleared = await request(app)
      .patch(`/api/campaigns/${campaignId}`)
      .set('Authorization', `Bearer ${brand}`)
      .send({ objective: '', thumbnailUrl: '' })
      .expect(200);
    expect(cleared.body.campaign.objective).toBeUndefined();
    expect(cleared.body.campaign.thumbnailUrl).toBeUndefined();

    await request(app).patch(`/api/campaigns/${campaignId}`).set('Authorization', `Bearer ${brand}`).send({ budget: 99 }).expect(400);
    await request(app).patch(`/api/campaigns/${campaignId}`).set('Authorization', `Bearer ${other}`).send({ name: 'Mine now' }).expect(403);
  });
});

describe('profile and leaderboard', () => {
  it('saves social accounts on the profile', async () => {
    const creator = await signup('creator');
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${creator}`)
      .send({ socials: [{ platform: 'instagram', handle: '@memepage' }] })
      .expect(200);
    expect(res.body.user.socials).toEqual([{ platform: 'instagram', handle: 'memepage' }]);
    await request(app).patch('/api/auth/me').set('Authorization', `Bearer ${creator}`).send({ role: 'brand' }).expect(400);
  });

  it('ranks creators by real payouts and reports total disbursed', async () => {
    const brand = await signup('brand');
    const top = await signup('creator');
    const second = await signup('creator');
    const campaignId = await createCampaign(brand, 20_000);
    await setViews(await submit(top, campaignId, 1), 150_000).expect(200); // ₹5,000
    await setViews(await submit(second, campaignId, 2), 60_000).expect(200); // ₹2,000

    const res = await request(app).get('/api/creators/leaderboard').set('Authorization', `Bearer ${second}`).expect(200);
    expect(res.body.totalDisbursed).toBe(7_000);
    expect(res.body.creators.map((c: { earnings: number }) => c.earnings)).toEqual([5_000, 2_000]);
    expect(res.body.creators[0]).toMatchObject({ rank: 1, platforms: ['instagram'] });
    expect(res.body.me).toEqual({ rank: 2, earnings: 2_000 });
  });
});

describe('payout ledger, spike review and analytics', () => {
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const review = (token: string, campaignId: string, subId: string, decision: string) =>
    request(app).post(`/api/campaigns/${campaignId}/submissions/${subId}/review`).set(auth(token)).send({ decision });

  /** Turns spike detection on for one test (setupEnv disables it). */
  async function withSpikes(fn: () => Promise<void>) {
    const saved = env.SPIKE_MIN_GAIN;
    env.SPIKE_MIN_GAIN = 10_000;
    try {
      await fn();
    } finally {
      env.SPIKE_MIN_GAIN = saved;
    }
  }

  it('writes one ledger entry per credit with the milestone reached', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaignId = await createCampaign(brand, 20_000);
    const subId = await submit(creator, campaignId, 1);
    await setViews(subId, 12_000).expect(200); // ₹500
    await setViews(subId, 12_000).expect(200); // nothing new, so no entry
    await setViews(subId, 60_000).expect(200); // +₹1,500

    const res = await request(app).get('/api/submissions/payouts').set(auth(creator)).expect(200);
    expect(res.body.payouts.map((p: { amount: number }) => p.amount)).toEqual([1_500, 500]); // newest first
    expect(res.body.payouts[0]).toMatchObject({
      milestoneViews: 50_000,
      totalPaid: 2_000,
      reason: 'views',
      campaignName: 'Summer Drop',
    });
    await request(app).get('/api/submissions/payouts').set(auth(brand)).expect(403);
  });

  it('holds a spiked post until the owning brand approves, then pays it', async () => {
    await withSpikes(async () => {
      const brand = await signup('brand');
      const creator = await signup('creator');
      const campaignId = await createCampaign(brand, 20_000);
      const subId = await submit(creator, campaignId, 1);

      const spiked = await setViews(subId, 60_000).expect(200);
      expect(spiked.body).toMatchObject({ spikeDetected: true, payout: { paidNow: 0, held: true } });
      expect(spiked.body.submission.review).toBe('pending');

      const mine = await request(app).get('/api/campaigns/mine').set(auth(brand)).expect(200);
      expect(mine.body.campaigns[0]).toMatchObject({ spent: 0, pendingReviewCount: 1 });

      await review(await signup('brand'), campaignId, subId, 'approve').expect(403);

      const approved = await review(brand, campaignId, subId, 'approve').expect(200);
      expect(approved.body.payout).toMatchObject({ paidNow: 2_000, held: false });
      expect(approved.body.submission.review).toBe('approved');

      // A decision can only be made once.
      await review(brand, campaignId, subId, 'reject').expect(409);

      const ledger = await request(app).get('/api/submissions/payouts').set(auth(creator)).expect(200);
      expect(ledger.body.payouts[0]).toMatchObject({ amount: 2_000, reason: 'review-approved' });
    });
  });

  it('keeps a rejected post unpaid even as its views keep growing', async () => {
    await withSpikes(async () => {
      const brand = await signup('brand');
      const creator = await signup('creator');
      const campaignId = await createCampaign(brand, 20_000);
      const subId = await submit(creator, campaignId, 1);
      await setViews(subId, 60_000).expect(200);
      await review(brand, campaignId, subId, 'reject').expect(200);

      const later = await setViews(subId, 200_000).expect(200);
      expect(later.body.payout).toMatchObject({ paidNow: 0, held: true });
      expect(later.body.submission.review).toBe('rejected');
      expect((await CampaignModel.findById(campaignId).lean())!.spent).toBe(0);
    });
  });

  it('validates review requests', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaignId = await createCampaign(brand, 20_000);
    const subId = await submit(creator, campaignId, 1);
    await review(brand, campaignId, subId, 'maybe').expect(400);
    await review(brand, campaignId, subId, 'approve').expect(409); // nothing pending
    await review(brand, campaignId, String(new mongoose.Types.ObjectId()), 'approve').expect(404);
  });

  it("stops a second creator claiming someone else's post", async () => {
    const brand = await signup('brand');
    const alice = await signup('creator');
    const bob = await signup('creator');
    const first = await createCampaign(brand, 20_000);
    const second = await createCampaign(brand, 20_000);
    await submit(alice, first, 7);

    // Same post (different link format), another campaign, another creator: rejected.
    const res = await request(app)
      .post('/api/submissions')
      .set(auth(bob))
      .send({ campaignId: second, postUrl: 'https://instagram.com/reel/post7?igsh=abc' })
      .expect(409);
    expect(res.body.error).toMatch(/another creator/);

    // The owner can still enter it in another campaign.
    await submit(alice, second, 7);
  });

  it('reports spend by day and the milestone funnel', async () => {
    const brand = await signup('brand');
    const creator = await signup('creator');
    const campaignId = await createCampaign(brand, 20_000);
    await setViews(await submit(creator, campaignId, 1), 12_000).expect(200); // tier 1, ₹500
    await setViews(await submit(creator, campaignId, 2), 60_000).expect(200); // tier 2, ₹2,000
    await setViews(await submit(creator, campaignId, 3), 150_000).expect(200); // tier 3, ₹5,000
    await submit(creator, campaignId, 4); // no views yet

    const res = await request(app).get(`/api/campaigns/${campaignId}/analytics`).set(auth(brand)).expect(200);
    const a = res.body.analytics;
    expect(a.spendByDay).toHaveLength(1);
    expect(a.spendByDay[0]).toMatchObject({ amount: 7_500, cumulative: 7_500, payouts: 3 });
    expect(a.milestones.map((m: { reached: number }) => m.reached)).toEqual([3, 2, 1]);
    expect(a.milestones.map((m: { topTier: number }) => m.topTier)).toEqual([1, 1, 1]);
    expect(a).toMatchObject({ posts: 4, belowFirstMilestone: 1, totalViews: 222_000, held: { posts: 0, owed: 0 } });

    await request(app).get(`/api/campaigns/${campaignId}/analytics`).set(auth(await signup('brand'))).expect(403);
  });
});
