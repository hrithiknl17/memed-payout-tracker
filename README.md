# meme'd — Campaign Payout Tracker

Brands create campaigns with a **budget** and a **milestone ladder**. Creators submit Instagram / YouTube posts and are paid the amount of the **highest milestone** their post has crossed — and a campaign never pays out more than its budget.

> **Views in. Payouts out.**

- **Live app:** not deployed yet — see [Deployment](#deployment)
- **Repo layout:** `backend/` (API) and `frontend/` (web)

## Highlights

- **Correct, concurrency-safe payouts.** Highest milestone only (not cumulative), incremental top-ups, partial payout when the budget runs low, never overspends or double-pays — even with simultaneous view updates.
- **Payout ledger.** Every credit is an append-only record (amount, views, milestone reached, cause), shown as the creator's wallet history.
- **Spike review.** A sudden jump in views holds that post's payouts until the brand approves (pays what's owed) or rejects it.
- **Brand analytics.** Spend-over-time chart against the budget and a milestone funnel, drawn in plain SVG.
- **Creator nudges.** "18K more views to unlock +₹5,000" with progress to the next milestone.
- **Hardening.** Zod validation, JWT auth with roles, helmet headers, per-IP rate limiting, one JSON error shape.
- **Bonus / stretch.** Redis cache for the live campaign list, Docker Compose, 69 Jest tests including real-MongoDB integration tests.

## Stack

| Part | Tech |
| --- | --- |
| API | Node.js 20+, TypeScript, Express 5, MongoDB + Mongoose 8, Zod, JWT, helmet, express-rate-limit |
| Web | Next.js 15 (App Router), React 19, TypeScript, plain CSS (neo-brutalist design) |
| Tests | Jest + ts-jest, Supertest, mongodb-memory-server |
| Extras | Redis cache (optional), Docker Compose, Render blueprint |

```
.
├── backend/
│   ├── src/
│   │   ├── domain/        # pure business rules — no I/O
│   │   │   ├── payout.ts      # milestone + budget-cap maths
│   │   │   ├── settlement.ts  # concurrency-safe payout flow (incl. review holds)
│   │   │   └── spike.ts       # view-spike detection
│   │   ├── services/      # DB-backed use cases (auth, campaigns, submissions, ledger, cache)
│   │   ├── routes/        # thin Express routers + Zod request schemas
│   │   ├── middleware/    # auth/roles, validation, rate limits, error handler
│   │   ├── models/        # Mongoose schemas (User, Campaign, Submission, PayoutEntry)
│   │   ├── scripts/seed.ts
│   │   └── app.ts / server.ts
│   └── tests/             # unit tests + integration/ (real MongoDB)
├── frontend/src/
│   ├── app/               # /, /login, /signup, /brand/*, /creator/*
│   ├── components/        # shell, campaign cards/tables, charts, ladder, review actions
│   └── lib/               # typed API client, auth context, formatting
├── docker-compose.yml
└── render.yaml
```

The payout rules live in `backend/src/domain` as plain functions with no database code, so they are easy to read, test and change.

## Running locally

**Prerequisites:** Node 20+ and a MongoDB (local, Docker, or a free Atlas cluster). Redis is optional.

```bash
# 1. API
cd backend
cp .env.example .env          # set MONGODB_URI and JWT_SECRET
npm install
npm run seed                  # optional: demo brands, creators, campaigns and payouts
npm run dev                   # http://localhost:4000

# 2. Web (new terminal)
cd frontend
cp .env.example .env.local    # API_PROXY_TARGET=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

**Or everything with Docker** (Mongo, Redis, API, web):

```bash
docker compose up --build     # web on :3000, API on :4000
```

### Demo accounts (after `npm run seed`)

All use the password `password123`.

| Role | Email |
| --- | --- |
| Brand | `brand@memed.demo` (Snackpass), `brand2@memed.demo` (Nimbus Audio) |
| Creator | `creator@memed.demo`, `creator2@memed.demo` … `creator5@memed.demo` |

The seed includes paid posts, a campaign whose budget is used up, one that has ended, and **one post held for spike review**: log in as `brand2@memed.demo` and open "Main character audio" to approve or reject it. `npm run seed -- --reset` recreates the demo data and only ever deletes `*@memed.demo` accounts and their campaigns.

### Trying it out

1. Sign up as a **brand** and create a campaign (the form is pre-filled with the 10K → ₹500 / 50K → ₹2,000 / 100K → ₹5,000 ladder).
2. In another browser (or private window) sign up as a **creator** and submit a post link to that campaign.
3. On **Participations**, use **Set views** to simulate platform views (it calls `PATCH /api/submissions/:id/views`). Earnings, the wallet ledger and the brand's budget meter update.
4. Jump views very fast (e.g. 0 → 200,000 in one go) to trigger a **spike**: the payout is held, and the brand sees **Approve / Reject** on the campaign page.

Or from the terminal:

```bash
curl -X PATCH http://localhost:4000/api/submissions/<submissionId>/views \
  -H 'Content-Type: application/json' -d '{"views": 60000}'
```

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `MONGODB_URI` | yes | — | MongoDB connection string |
| `JWT_SECRET` | yes | — | Secret for signing tokens (16+ chars) |
| `JWT_EXPIRES_IN` | no | `7d` | Token lifetime |
| `PORT` | no | `4000` | API port |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Allowed frontend origin(s), comma-separated |
| `REDIS_URL` | no | empty | Enables caching of the live campaign list |
| `CAMPAIGN_CACHE_TTL_SECONDS` | no | `30` | Cache lifetime |
| `SPIKE_MIN_GAIN` | no | `10000` | Minimum view gain to count as a spike |
| `SPIKE_VIEWS_PER_MINUTE` | no | `2000` | Minimum growth rate to count as a spike |
| `RATE_LIMIT_ENABLED` | no | `true` (off under Jest) | Per-IP rate limiting |
| `TRUST_PROXY` | no | `0` | Proxy hops in front of the API (set `1` on Render/Railway/Heroku) so limits use the real client IP |

### Frontend (`frontend/.env.local`)

| Variable | Required | What it does |
| --- | --- | --- |
| `API_PROXY_TARGET` | default mode | Where Next proxies same-origin `/api/*` calls (e.g. `http://localhost:4000`). No CORS needed, works from phones on your network. |
| `NEXT_PUBLIC_API_URL` | alternative | Call the API directly from the browser instead (baked in at build time; the API's `CORS_ORIGIN` must include the app URL). |

## API

All bodies are JSON. Protected routes need `Authorization: Bearer <token>`. Money is in **whole rupees**.

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | public | `{ name, email, password, role }` → `{ token, user }` |
| POST | `/api/auth/login` | public | `{ email, password }` → `{ token, user }` |
| GET / PATCH | `/api/auth/me` | any | Current profile / update name and social handles |
| POST | `/api/campaigns` | brand | `{ name, platform, budget, milestones: [{ views, payout }], objective?, thumbnailUrl?, endsAt? }` |
| PATCH | `/api/campaigns/:id` | brand (owner) | Edit name, objective, thumbnail, deadline (budget and ladder are fixed) |
| GET | `/api/campaigns/mine` | brand | Own campaigns with `spent`, `remaining`, post / flag / pending-review counts |
| GET | `/api/campaigns/:id/submissions` | brand (owner) | Posts on a campaign |
| GET | `/api/campaigns/:id/analytics` | brand (owner) | Spend by day, milestone funnel, held payouts |
| POST | `/api/campaigns/:id/submissions/:subId/review` | brand (owner) | `{ decision: "approve" \| "reject" }` for a held spike |
| GET | `/api/campaigns/live` | any | Campaigns still accepting posts (cached when Redis is on) |
| GET | `/api/campaigns/ended` | any | Recently ended / exhausted campaigns |
| POST | `/api/submissions` | creator | `{ campaignId, postUrl }` |
| GET | `/api/submissions/mine` | creator | Own posts + `earnings` |
| GET | `/api/submissions/payouts` | creator | Payout ledger, newest first |
| GET | `/api/creators/me/earnings` | creator | `{ totalEarnings, unpaidDueToBudget, submissionCount }` |
| GET | `/api/creators/leaderboard` | any | Creators ranked by real payouts, plus total disbursed |
| PATCH | `/api/submissions/:id/views` | none (per brief) | `{ views }` → submission + `payout: { paidNow, totalPaid, entitled, cappedByBudget, held }` + `spikeDetected` |

Errors always look like `{ "error": "message", "details": ... }` with a matching status (400 validation, 401 auth, 403 role, 404, 409 conflict, 429 rate limit).

## Decisions and assumptions

The brief left some cases open. Here's what I decided and why.

**Payouts**

1. **Milestones are not cumulative.** The payout is the amount of the highest milestone crossed. 60K views on the example ladder pays ₹2,000 total, not ₹500 + ₹2,000.
2. **Crossing several milestones in one update** pays the highest one reached, once. Going 0 → 120K views pays ₹5,000 in a single payout.
3. **Payouts are incremental.** We store `paidAmount` per post and only ever pay `entitled − paidAmount`. A post paid ₹2,000 at 50K that then reaches 100K gets another ₹3,000.
4. **"Crossed" means `views >= threshold`.** Exactly 10,000 views unlocks the 10K milestone.
5. **Views going down never claws money back.** Payouts use the highest view count ever reported (`peakViews`). A milestone, once crossed, stays crossed.

**Budget**

6. **When the budget runs out mid-payout, the creator gets whatever is left** (a partial payout) and the post is marked `cappedByBudget`, with the unpaid amount shown to both sides. It uses the brand's budget fully and treats the creator who crossed first fairly.
7. **First come, first served** when budget is tight.
8. **Exhausted campaigns** (spent = budget) leave the creators' live list and reject new submissions.
9. **Ladder rules:** each milestone payout must fit inside the budget, thresholds must be unique, payouts must rise with thresholds, whole rupees only. Budget and ladder can't change after creation, because creators may already have posted against them.
10. **Deadlines:** after `endsAt` a campaign stops accepting new posts, but posts submitted before it keep earning from views until the budget runs out (they were made under the campaign's terms).

**Posts**

11. **Links must match the campaign's platform** and are normalised (no `www.`, query string or trailing slash; YouTube keeps `?v=`). The same post can't be submitted twice to one campaign, and **a post already claimed by one creator can't be submitted by another** on any campaign.
12. **The views endpoint has no auth**, as the brief says, because it stands in for platform data. In production it would be a scheduled job pulling from the Instagram / YouTube APIs, or a signed webhook.

**Spike detection and review (bonus)**

13. A post is flagged when it gains at least `SPIKE_MIN_GAIN` views at `SPIKE_VIEWS_PER_MINUTE` or faster since its last reading. A flag puts the post **on hold**: nothing more is paid until the campaign's brand **approves** (everything owed is paid at once) or **rejects** it (the post stays unpaid; money paid before the spike is not clawed back). The hold is enforced inside the settlement compare-and-set, so a payout can't slip through between the read and the write.

**Ledger**

14. Every credit writes a `PayoutEntry`. `Submission.paidAmount` stays the source of truth for balances; the entry is written right after the credit succeeds. A crash in between would leave one credit unlogged, which a reconciliation job can detect by comparing `sum(entries.amount)` with `paidAmount`.

**UI previews**

15. KYC, withdrawals and refer-and-earn appear in the creator UI with a **Preview** badge — they have no backend and are clearly marked as not working. Sign-in is email + password.

## Concurrency: no overspend, no double-pay (stretch)

The worry: two view updates arrive at the same time. Both read "₹1,000 left" and both pay ₹1,000 (overspend), or both read "paid ₹0" for the same post and both pay it (double-pay).

The fix is in `backend/src/domain/settlement.ts`. Every write is **one atomic MongoDB update with a condition in its filter**, so the database itself refuses the second, conflicting write:

1. **Read** the post and the campaign. If the post is on hold for review, stop. Otherwise work out `grant = min(owed, remaining budget)`.
2. **Reserve the budget** — one update that only matches if it still fits:
   ```js
   Campaign.updateOne(
     { _id, $expr: { $lte: [{ $add: ['$spent', grant] }, '$budget'] } },
     { $inc: { spent: grant } })
   ```
   If someone else spent the money first, nothing matches. We re-read and recompute (maybe a smaller partial payout).
3. **Credit the post** — a compare-and-set that only matches if nobody paid it (or put it on hold) since step 1:
   ```js
   Submission.updateOne(
     { _id, paidAmount: expectedPaid, review: { $nin: ['pending', 'rejected'] } },
     { $inc: { paidAmount: grant } })
   ```
   If it doesn't match, we **release** the reservation and retry. The retry sees nothing is owed (or the hold) and stops.

Budget is always reserved **before** the creator is credited, so at every moment `sum(paidAmount) ≤ spent ≤ budget`.

**Why not a MongoDB transaction?** Transactions need a replica set and add retry logic of their own. Two guarded single-document updates give the same guarantee here, work on any MongoDB, and are easy to test.

**Known trade-off:** if the server crashes between step 2 and step 3, that reservation stays counted as spent without being paid. That's the safe direction (never overpays), but it can strand a little budget; the ledger plus a periodic reconciliation (`spent` vs `sum(paidAmount)`) would clean it up.

Tests for this are in `tests/settlement.test.ts` (many posts plus duplicates settled at once against a small budget, and a hold landing mid-settlement) and `tests/integration/api.int.test.ts` (simultaneous HTTP requests against real MongoDB).

## Tests

```bash
cd backend
npm test                  # unit + HTTP tests, no database needed
npm run test:integration  # end-to-end against an in-memory MongoDB
npm run test:all          # everything (69 tests)
```

- `payout.test.ts` — milestone maths, non-cumulative payouts, idempotency, budget cap, partial payouts, ladder validation
- `settlement.test.ts` — the safe payout flow, concurrent and repeated updates, review holds
- `spike.test.ts` — spike detection
- `rateLimit.test.ts` — JSON 429s and the off switch
- `app.test.ts` — routing, auth guard, validation and error responses
- `integration/api.int.test.ts` — full flows with a real MongoDB: payouts, budget cap, deadlines, concurrency, ledger, spike approve / reject, post ownership, analytics, leaderboard (`mongodb-memory-server` downloads a `mongod` binary the first time)

## Frontend

- **Landing** (`/`): what the product does, how it works, and an example ladder. Logged-in users go straight to their dashboard.
- **Creator:** live and ended campaigns, campaign brief with the payout ladder and post submission, participations (active / past) with simulated views and next-milestone progress, wallet with the payout ledger, leaderboard, profile with social handles.
- **Brand:** dashboard with budget totals, campaigns table, create / edit campaign, campaign page with budget meter, spend chart, milestone funnel, submissions and spike review.
- **Design:** a neo-brutalist "payout ledger" look — sky-blue page, thick ink outlines, hard offset shadows, flat colour blocks, Space Grotesk for text and JetBrains Mono for every number. Works down to 375 px wide.

## Deployment

- **Database:** MongoDB Atlas free cluster. Allow access from anywhere (`0.0.0.0/0`) so Render can connect.
- **API:** Render web service from `render.yaml` (root `backend`, build `npm ci --include=dev && npm run build`, start `npm start`). Set `MONGODB_URI` and `CORS_ORIGIN`; `TRUST_PROXY=1` is preset.
- **Web:** Vercel with root directory `frontend` and `API_PROXY_TARGET` (or `NEXT_PUBLIC_API_URL`) set to the Render URL.

> A free Render instance sleeps when idle — the first request can take ~30–50 s to wake it.

## Scaling to 10,000 creators

10,000 creators with a few posts each is ~50K submissions — small for MongoDB. The pressure points are view updates and hot campaigns, not data size.

- **View ingestion.** Real view counts would come from polling platform APIs, not a public PATCH. Put submissions on a queue (BullMQ/SQS) and have workers fetch views in batches on a schedule, checking posts near a milestone more often. This respects platform rate limits and spreads load.
- **Hot campaigns.** All payouts on one campaign update the same document (`spent`). The conditional `$inc` is atomic and cheap, and payouts only happen when a milestone is crossed (rare compared to view updates). If one campaign got extremely hot, route its settlements through one queue partition so they run in order without retries.
- **Skip work that can't pay.** Most view updates don't cross a milestone; checking that first keeps the hot path to a single submission write.
- **Reads.** Indexes on `campaignId`, `creatorId`, `(campaignId, postUrl)`, `postUrl` and the ledger's `(creatorId, createdAt)` / `(campaignId, createdAt)`. The live campaign list is cached in Redis; brand dashboards could be cached briefly too.
- **Money safety.** The payout ledger is already in place; add an idempotency key per entry and a nightly check that `spent == sum(ledger)` per campaign.
- **API.** Stateless (JWT), so it runs as several instances behind a load balancer; switch the rate limiter to a shared Redis store at that point.
