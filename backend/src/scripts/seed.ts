/**
 * Demo data so the app has something to show.
 *
 *   npm run seed            # adds demo data if it isn't there yet
 *   npm run seed -- --reset # removes previous demo data (only *@memed.demo accounts) first
 *
 * Everything goes through the normal services, so payouts, budget caps and
 * flags are computed exactly as in real use. Cover photos are free Unsplash
 * images; campaign and brand names are invented.
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { CampaignModel } from '../models/Campaign';
import { PayoutEntryModel } from '../models/PayoutEntry';
import { SubmissionModel } from '../models/Submission';
import { UserModel } from '../models/User';
import { signup, updateProfile } from '../services/authService';
import { createCampaign } from '../services/campaignService';
import { createSubmission, updateViews } from '../services/submissionService';

const PASSWORD = 'password123';
const DEMO_DOMAIN = '@memed.demo';
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

async function resetDemoData() {
  const users = await UserModel.find({ email: { $regex: `${DEMO_DOMAIN.replace('.', '\\.')}$` } }).select('_id').lean();
  const ids = users.map((u) => u._id);
  const campaigns = await CampaignModel.find({ brandId: { $in: ids } }).select('_id').lean();
  const owned = { $or: [{ creatorId: { $in: ids } }, { campaignId: { $in: campaigns.map((c) => c._id) } }] };
  await PayoutEntryModel.deleteMany(owned);
  await SubmissionModel.deleteMany(owned);
  await CampaignModel.deleteMany({ _id: { $in: campaigns.map((c) => c._id) } });
  await UserModel.deleteMany({ _id: { $in: ids } });
  console.log(`Removed ${users.length} demo users and ${campaigns.length} demo campaigns.`);
}

async function seed() {
  const brand = (await signup({ name: 'Snackpass', email: `brand${DEMO_DOMAIN}`, password: PASSWORD, role: 'brand' })).user;
  const brand2 = (await signup({ name: 'Nimbus Audio', email: `brand2${DEMO_DOMAIN}`, password: PASSWORD, role: 'brand' })).user;

  const creator = async (name: string, emailPrefix: string) =>
    (await signup({ name, email: `${emailPrefix}${DEMO_DOMAIN}`, password: PASSWORD, role: 'creator' })).user;
  const aarav = await creator('Aarav Kapoor', 'creator');
  const mira = await creator('Mira Shah', 'creator2');
  const rohan = await creator('Rohan Verma', 'creator3');
  const kabir = await creator('Kabir Sethi', 'creator4');
  const zoya = await creator('Zoya Khan', 'creator5');
  await updateProfile(aarav.id, { socials: [{ platform: 'instagram', handle: 'aaravmakesmemes' }] });

  const snack = await createCampaign(brand.id, {
    name: 'Midnight snack drop',
    platform: 'instagram',
    budget: 25_000,
    milestones: [{ views: 10_000, payout: 500 }, { views: 50_000, payout: 2_000 }, { views: 100_000, payout: 5_000 }],
    objective: 'Make the group chat hungry. Show your most chaotic late-night snack run. Tag @snackpass and use #MidnightDrop.',
    thumbnailUrl: photo('photo-1565299624946-b28f40a0ae38'),
    endsAt: daysFromNow(7),
  });
  const flex = await createCampaign(brand.id, {
    name: 'The 10-minute flex',
    platform: 'youtube',
    budget: 40_000,
    milestones: [{ views: 25_000, payout: 1_500 }, { views: 75_000, payout: 4_000 }, { views: 150_000, payout: 8_000 }],
    objective: 'What would you order if time was the only thing you had less of? A Short under 45s, POV style.',
    thumbnailUrl: photo('photo-1504674900247-0877df9cc836'),
    endsAt: daysFromNow(14),
  });
  const audio = await createCampaign(brand2.id, {
    name: 'Main character audio',
    platform: 'instagram',
    budget: 30_000,
    milestones: [{ views: 20_000, payout: 1_000 }, { views: 100_000, payout: 6_000 }, { views: 250_000, payout: 10_000 }],
    objective: 'Turn your commute, workout or heartbreak into a tiny music video using the Nimbus trending audio.',
    thumbnailUrl: photo('photo-1505740420928-5e560c06d30e'),
    endsAt: daysFromNow(4),
  });
  await createCampaign(brand2.id, {
    name: 'Gym bro POV',
    platform: 'youtube',
    budget: 20_000,
    milestones: [{ views: 15_000, payout: 800 }, { views: 60_000, payout: 3_000 }],
    objective: 'Your most relatable gym moment, with Nimbus earbuds in frame.',
    thumbnailUrl: photo('photo-1517836357463-d25dfeac3438'),
  });
  // Will be fully paid out below, so it shows up under "Recently ended".
  const weekend = await createCampaign(brand.id, {
    name: 'Weekend reset',
    platform: 'instagram',
    budget: 6_000,
    milestones: [{ views: 20_000, payout: 1_000 }, { views: 80_000, payout: 3_500 }],
    objective: 'Show us your Sunday reset routine, snacks included.',
    thumbnailUrl: photo('photo-1492684223066-81342ee5ff30'),
  });
  // Past its deadline. The API only accepts future deadlines, so it's moved back directly.
  const fest = await createCampaign(brand2.id, {
    name: 'Fest season fits',
    platform: 'youtube',
    budget: 15_000,
    milestones: [{ views: 20_000, payout: 1_200 }, { views: 90_000, payout: 4_500 }],
    objective: 'Outfit transitions for festival season.',
    thumbnailUrl: photo('photo-1483985988355-763728e1935b'),
    endsAt: daysFromNow(1),
  });

  const ig = (slug: string) => `https://www.instagram.com/reel/${slug}/`;
  const yt = (slug: string) => `https://www.youtube.com/shorts/${slug}`;
  // [creator, campaign, link, view updates as [views, hoursAgo]] — spread out so they don't trip spike detection.
  const plan: [typeof aarav, { id: string }, string, [number, number][]][] = [
    [aarav, snack, ig('aarav-one-bite'), [[18_000, 30], [62_000, 6]]],
    [aarav, flex, yt('aarav-fastdelivery'), [[41_000, 10]]],
    [aarav, weekend, ig('aarav-sunday'), [[30_000, 40], [90_000, 20]]],
    [mira, snack, ig('mira-snack-run'), [[24_000, 28], [130_000, 4]]],
    [mira, audio, ig('mira-commute'), [[60_000, 30], [270_000, 3]]],
    [rohan, flex, yt('rohan-pov'), [[80_000, 20], [160_000, 2]]],
    [rohan, weekend, ig('rohan-reset'), [[25_000, 30], [85_000, 15]]],
    [kabir, audio, ig('kabir-heartbreak'), [[22_000, 12], [105_000, 2]]],
    [kabir, fest, yt('kabir-fits'), [[95_000, 10]]],
    [zoya, snack, ig('zoya-3am'), [[7_500, 3]]],
    // Deliberate spike (+115K views in ~3 minutes): held for the brand to review.
    [zoya, audio, ig('zoya-dance-loop'), [[25_000, 0.1], [140_000, 0.05]]],
  ];
  for (const [creator, campaign, link, updates] of plan) {
    const sub = await createSubmission(creator.id, { campaignId: campaign.id, postUrl: link });
    // Backdate the post so its first reading isn't measured against "now" (which would look like a spike).
    const postedAt = hoursAgo(updates[0]![1] + 24);
    await SubmissionModel.updateOne(
      { _id: sub.id },
      { $set: { viewsUpdatedAt: postedAt, createdAt: postedAt } },
      { timestamps: false },
    );
    for (const [views, ago] of updates) await updateViews(sub.id, views, hoursAgo(ago));
  }

  await CampaignModel.updateOne({ _id: fest.id }, { $set: { endsAt: hoursAgo(2) } });

  console.log('Demo data ready. Log in with password "password123":');
  console.log(`  Brand:   brand${DEMO_DOMAIN}  (also brand2${DEMO_DOMAIN})`);
  console.log(`  Creator: creator${DEMO_DOMAIN}  (also creator2..5${DEMO_DOMAIN})`);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  await mongoose.syncIndexes();
  if (process.argv.includes('--reset')) await resetDemoData();
  if (await UserModel.exists({ email: `brand${DEMO_DOMAIN}` })) {
    console.log('Demo data already exists. Run with --reset to recreate it.');
  } else {
    await seed();
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
