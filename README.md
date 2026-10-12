# Meme'd — Campaign Payout Tracker

Brands create campaigns with a milestone ladder and a budget. Creators submit Instagram / YouTube posts, and get paid the amount of the **highest milestone** their post has crossed — without a campaign ever paying out more than its budget.

- **Live app:** `<add Vercel URL>`
- **Live API:** `<add Render URL>` (health check: `/health`)

> The free Render instance sleeps when idle — the first request can take ~30–50 s to wake it.

## Stack

| Part | Tech |
| --- | --- |
| API | Node.js 22, TypeScript, Express 5, MongoDB + Mongoose, Zod, JWT |
| Web | Next.js 15 (App Router), TypeScript, plain CSS |
| Tests | Jest + ts-jest, Supertest, mongodb-memory-server |
| Extras | Redis cache (optional), Docker Compose, spike detection |

```
.
├── backend/
│   ├── src/
│   │   ├── domain/        # pure business rules — no I/O
│   │   │   ├── payout.ts      # milestone + budget-cap maths
│   │   │   ├── settlement.ts  # concurrency-safe payout flow
│   │   │   └── spike.ts       # view-spike detection
│   │   ├── services/      # DB-backed use cases (auth, campaigns, submissions, cache)
│   │   ├── routes/        # thin Express routers + Zod request schemas
│   │   ├── middleware/    # auth/roles, validation, error handler
│   │   ├── models/        # Mongoose schemas
│   │   └── app.ts / server.ts
│   └── tests/             # unit tests + integration/ (real MongoDB)
├── frontend/src/
│   ├── app/               # /login, /signup, /brand, /creator
│   ├── components/
│   └── lib/               # typed API client, auth context, formatting
└── docker-compose.yml
```

The payout rules live in `backend/src/domain` as plain functions with no database code, so they are easy to read, test and change.

## Running locally

**Prerequisites:** Node 20+ and a MongoDB (local, Docker, or a free Atlas cluster). Redis is optional.

```bash
# 1. API
cd backend
cp .env.example .env          # set MONGODB_URI and JWT_SECRET
npm install
npm run dev                   # http://localhost:4000

# 2. Web (new terminal)
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

**Or everything with Docker** (Mongo, Redis, API, web):

```bash
docker compose up --build     # web on :3000, API on :4000
```

### Trying it out

1. Sign up as a **brand**, create a campaign (the form is pre-filled with the 10K → ₹500 / 50K → ₹2,000 / 100K → ₹5,000 ladder).
2. In another browser (or private window) sign up as a **creator**, submit a post link to that campaign.
3. Use the **Set** box next to the post to simulate platform views (it calls `PATCH /api/submissions/:id/views`). Earnings update, and the brand's spent/remaining bar moves.

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

### Frontend (`frontend/.env.local`)

| Variable | Required | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | Base URL of the API, no trailing slash |

## API

All bodies are JSON. Protected routes need `Authorization: Bearer <token>`. Money is in **whole rupees**.

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | public | `{ name, email, password, role: "brand" \| "creator" }` → `{ token, user }` |
| POST | `/api/auth/login` | public | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | any | Current user |
| POST | `/api/campaigns` | brand | `{ name, platform: "instagram" \| "youtube", budget, milestones: [{ views, payout }] }` |
| GET | `/api/campaigns/mine` | brand | Own campaigns with `spent`, `remaining`, post and flag counts |
| GET | `/api/campaigns/:id/submissions` | brand (owner) | Posts on a campaign |
| GET | `/api/campaigns/live` | any | Campaigns with budget left (cached when Redis is on) |
| POST | `/api/submissions` | creator | `{ campaignId, postUrl }` |
| GET | `/api/submissions/mine` | creator | Own posts + `earnings` |
| GET | `/api/creators/me/earnings` | creator | `{ totalEarnings, unpaidDueToBudget, submissionCount }` |
| PATCH | `/api/submissions/:id/views` | none (per brief) | `{ views }` → updated submission + `payout: { paidNow, totalPaid, entitled, cappedByBudget }` |

Errors always look like `{ "error": "message", "details": ... }` with a matching status (400 validation, 401 auth, 403 role, 404, 409 conflict).

## Decisions and assumptions

The brief left some cases open. Here's what I decided and why.

**Payouts**

1. **Milestones are not cumulative.** The payout is the amount of the highest milestone crossed. 60K views on the example ladder pays ₹2,000 total, not ₹500 + ₹2,000.
2. **Crossing several milestones in one update** pays the highest one reached, once. Going 0 → 120K views pays ₹5,000 in a single payout.
3. **Payouts are incremental.** We store `paidAmount` per post and only ever pay `entitled − paidAmount`. If a post was paid ₹2,000 at 50K and then reaches 100K, it gets another ₹3,000.
4. **"Crossed" means `views >= threshold`.** Exactly 10,000 views unlocks the 10K milestone.
5. **Views going down never claws money back.** Payouts use the highest view count ever reported (`peakViews`). A milestone, once crossed, stays crossed. Fraud is handled by flagging, not by silently reversing payments.

**Budget**

6. **When the budget runs out mid-payout, the creator gets whatever is left** (a partial payout) and the post is marked `cappedByBudget`, with the unpaid amount shown to both sides. I chose this over "all or nothing" because it uses the brand's budget fully and treats the creator who crossed the milestone first fairly.
7. **First come, first served.** When budget is tight, whichever view update is processed first gets paid first.
8. **Exhausted campaigns** (spent = budget) disappear from the creators' live list and reject new submissions.
9. **Each milestone payout must fit inside the budget**, thresholds must be unique, and payouts must go up as thresholds go up. Money must be whole rupees. Budgets can't be edited after creation (not in scope), so the ladder is fixed too.

**Posts**

10. **Links must match the campaign's platform** (`instagram.com`, `youtube.com`, `youtu.be`). Links are normalised (no `www.`, query string or trailing slash; YouTube keeps `?v=`) and **the same post can't be submitted twice to the same campaign** (unique index).
11. **The views endpoint has no auth**, as the brief says, because it stands in for platform data. In production it would be a scheduled job pulling from the Instagram/YouTube APIs, or a signed webhook.

**Spike detection (bonus)**

12. A post is flagged when it gains at least `SPIKE_MIN_GAIN` views (default 10,000) at `SPIKE_VIEWS_PER_MINUTE` or faster (default 2,000/min) since its last reading. Flags are sticky and shown to the brand. **Flagged posts are still paid** so the demo works when you jump views quickly; in production I'd hold flagged payouts until a brand or ops person approves them.

## Concurrency: no overspend, no double-pay (stretch)

The worry: two view updates arrive at the same time. Both read "₹1,000 left" and both pay ₹1,000 (overspend), or both read "paid ₹0" for the same post and both pay it (double-pay).

The fix is in `backend/src/domain/settlement.ts`. Every write is **one atomic MongoDB update with a condition in its filter**, so the database itself refuses the second, conflicting write:

1. **Read** the post and the campaign. Work out `grant = min(owed, remaining budget)`.
2. **Reserve the budget** — one update that only matches if it still fits:
   ```js
   Campaign.updateOne(
     { _id, $expr: { $lte: [{ $add: ['$spent', grant] }, '$budget'] } },
     { $inc: { spent: grant } })
   ```
   If someone else spent the money first, nothing matches. We re-read and recompute (maybe a smaller partial payout).
3. **Credit the post** — a compare-and-set that only matches if nobody paid it since step 1:
   ```js
   Submission.updateOne({ _id, paidAmount: expectedPaid }, { $inc: { paidAmount: grant } })
   ```
   If another request paid it first, we **release** the reservation and retry. The retry sees nothing is owed and stops.

Budget is always reserved **before** the creator is credited, so at every moment `sum(paidAmount) ≤ spent ≤ budget`.

**Why not a MongoDB transaction?** Transactions need a replica set and add retry logic of their own. Two guarded single-document updates give the same guarantee here, work on any MongoDB (including a plain local one), and are easy to test.

**Known trade-off:** if the server crashes between step 2 and step 3, that reservation stays counted as spent without being paid to anyone. That's the safe direction (never overpays), but it can leave a little budget stranded. A periodic reconciliation job (`spent` vs `sum(paidAmount)`) or a payout ledger would clean it up.

Tests for this are in `tests/settlement.test.ts` (50 posts plus duplicates settled at once against a small budget) and `tests/integration/api.int.test.ts` (30 simultaneous HTTP requests against real MongoDB). I checked that the unit tests fail if either guard is removed.

## Tests

```bash
cd backend
npm test                  # unit + HTTP tests, no database needed
npm run test:integration  # end-to-end against an in-memory MongoDB
```

- `payout.test.ts` — milestone maths, non-cumulative payouts, idempotency, budget cap, partial payouts, ladder validation
- `settlement.test.ts` — the safe payout flow, including concurrent and repeated updates
- `spike.test.ts` — spike detection
- `app.test.ts` — routing, auth guard, validation and error responses
- `integration/api.int.test.ts` — full flows through the API with a real MongoDB (`mongodb-memory-server` downloads a `mongod` binary the first time it runs)

## Deployment

- **Database:** MongoDB Atlas free cluster. Allow access from anywhere (`0.0.0.0/0`) so Render can connect.
- **API:** Render web service from `render.yaml` (root dir `backend`, build `npm ci --include=dev && npm run build`, start `npm start`). Set `MONGODB_URI` and `CORS_ORIGIN` (the Vercel URL).
- **Web:** Vercel with root directory `frontend` and `NEXT_PUBLIC_API_URL` set to the Render URL.

## Scaling to 10,000 creators

10,000 creators with a few posts each is ~50K submissions — small for MongoDB. The pressure points are view updates and hot campaigns, not data size.

- **View ingestion.** Real view counts would come from polling platform APIs, not a public PATCH. I'd put submissions on a queue (BullMQ/SQS) and have workers fetch views in batches on a schedule, with more frequent checks for posts near a milestone. This keeps us within platform rate limits and spreads the load.
- **Hot campaigns.** All payouts on one campaign update the same document (`spent`). The conditional `$inc` is atomic and cheap, but thousands of payouts per second on one campaign would contend. Since payouts only happen when a milestone is crossed (rare compared to view updates), this is fine at this scale. If not, route all settlements for a campaign through one queue partition so they run in order without retries.
- **Skip work that can't pay.** Most view updates don't cross a milestone. Checking that before touching the campaign keeps the hot path to a single submission write.
- **Reads.** Indexes are on `campaignId`, `creatorId` and `(campaignId, postUrl)`. Creator earnings could be kept as a running total instead of aggregated per request. The live campaign list is already cached in Redis; brand dashboards could be cached briefly too.
- **Money safety at scale.** Add an append-only payout ledger (one row per payout with an idempotency key) as the source of truth, and a nightly job that checks `spent == sum(ledger)` per campaign. Hold flagged posts for review before paying.
- **API.** The API is stateless (JWT), so it can run as several instances behind a load balancer.
