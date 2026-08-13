# Sales Book — Multi-tenant SaaS for SMEs

A production-ready **Sales Book SaaS platform** that helps small and medium businesses
record sales, manage customers and products, track revenue, and manage their
subscription — all in one place.

The project contains **three separate applications** in one repository:

| App            | Path          | Port | What it does                                     |
| -------------- | ------------- | ---- | ------------------------------------------------ |
| **frontend**   | `frontend/`   | 3000 | Next.js app for SME businesses (the main product) |
| **backend**    | `backend/`    | 3002 | NestJS REST API + PostgreSQL + Prisma            |
| **super-admin**| `super-admin/`| 3001 | Next.js console for the platform Super Admin      |

---

## 1. Architecture

```
                         ┌──────────────────────┐
                         │     frontend (:3000)  │   Next.js 14 (App Router)
                         │   SME workspace UI    │
                         └──────────┬───────────┘
                                    │ REST (JWT bearer)
                         ┌──────────▼───────────┐
                         │      backend (:3002)  │   NestJS 10
                         │  auth · sales · plans │
                         │  billing · payments  │
                         │  usage limits · admin│
                         └──────────┬───────────┘
                                    │ Prisma ORM
                         ┌──────────▼───────────┐
                         │     PostgreSQL        │
                         └──────────────────────┘
                         ┌──────────────────────┐
                         │   super-admin (:3001) │   separate Next.js app
                         │   platform console    │   (calls /admin API)
                         └──────────────────────┘
```

- **One backend, one database.** Both `frontend` and `super-admin` talk to the same
  NestJS API at `http://localhost:3002/api`. Neither app connects to PostgreSQL
  directly.
- **Multi-tenancy**: every record belongs to a `businessId`. The backend derives the
  current business from the authenticated JWT (`CurrentBusinessId` decorator) and
  **always** scopes queries with it — a user from Business A can never see Business B's data.
- **RBAC**: `SUPER_ADMIN`, `BUSINESS_OWNER`, `MANAGER`, `STAFF`. Enforced by the
  `RolesGuard` on the backend, never only in the UI.
- **Usage limits**: a central `UsageService` checks plan limits before every limited
  operation and records usage. All limits come from the database (see §6).
- **Payments**: a `PaymentProvider` interface with Paystack + Flutterwave
  implementations behind a provider factory. Secret keys live only in `backend/.env`.

### Folder structure

```
sales-book-saas/
├── backend/
│   ├── prisma/                # schema.prisma + migrations/ + seed.ts
│   ├── src/
│   │   ├── admin/             # SUPER_ADMIN platform management (/admin)
│   │   ├── audit/             # audit logging for sensitive actions
│   │   ├── auth/              # register, login, refresh, password reset, JWT
│   │   ├── billing/           # checkout, verification, webhooks
│   │   ├── businesses/        # tenant business profile
│   │   ├── common/            # guards, decorators, filters, interceptors, utils
│   │   ├── customers/
│   │   ├── dashboard/
│   │   ├── payments/          # provider interface + Paystack + Flutterwave
│   │   ├── prisma/
│   │   ├── products/
│   │   ├── sales/             # sales + line items + reports
│   │   ├── subscriptions/     # plans, lifecycle
│   │   ├── usage/             # usage limits enforcement
│   │   └── users/             # team management
│   └── test/                  # e2e tests
├── frontend/
│   ├── app/                   # App Router pages (landing, auth, workspace)
│   ├── components/            # UI kit + feature components
│   ├── hooks/                 # auth context
│   ├── services/              # thin API clients
│   ├── types/                 # shared TypeScript types
│   └── utils/                 # formatting helpers
├── super-admin/
│   ├── app/                   # login + console pages
│   ├── components/
│   ├── services/
│   ├── types/
│   └── utils/
└── README.md
```

---

## 2. Database relationships

```
User ──N:1──▶ Business ◀──1:1── Subscription ──N:1──▶ SubscriptionPlan
                 │                                   │
                 ├──1:N── Customer                  ├──1:N── PlanFeature ──N:1── Feature
                 ├──1:N── Product
                 ├──1:N── Sale ──1:N── SaleItem
                 ├──1:N── PaymentTransaction ──N:1── PaymentProvider
                 └──1:N── Usage

PasswordReset ──N:1── User
AuditLog (standalone, references ids as strings)
PlatformSetting (key/value store)
```

Key design decisions:

- `SubscriptionPlan` + `Feature` + `PlanFeature` hold **all** plan pricing and limits
  in the database — nothing is hard-coded. The Super Admin edits them from the
  console without code changes.
- `Usage` rows track counters per business, feature key, and period
  (`YYYY-MM` for monthly limits, `ALL` for lifetime limits).
- Sales keep a denormalized `productName`/`unitPrice` snapshot on each `SaleItem` so
  history stays correct even if a product is later edited or archived.
- Customers/products are **archived** (soft-deleted) so sales history and reports
  remain intact.

---

## 3. Authentication flow

1. **Register** (`POST /auth/register`) creates the business (tenant), the owner
   (`BUSINESS_OWNER`), and a trial subscription on the default plan (14 days).
2. **Login** (`POST /auth/login`) verifies the bcrypt hash and returns
   `{ user, accessToken, refreshToken }`. Access tokens are short-lived (15 min),
   refresh tokens long-lived (30 days) and stored **hashed** in the database.
3. **Refresh** (`POST /auth/refresh`) validates the refresh token, **rotates** it,
   and returns a new pair. Reusing an old token is rejected.
4. **Logout** (`POST /auth/logout`) clears the stored refresh token.
5. **Forgot / reset password** (`POST /auth/forgot-password`, `POST /auth/reset-password`)
   uses a one-time token hashed in the DB with a 24 h expiry.
6. Every authenticated request carries `Authorization: Bearer <accessToken>`.
   The `JwtAuthGuard` validates the JWT **and re-checks the database** that the user
   is still active and their business is not suspended — so disabling/suspending
   takes effect immediately.

### Role-based authorization

| Role             | Capabilities                                                        |
| ---------------- | ------------------------------------------------------------------- |
| `SUPER_ADMIN`    | Everything under `/admin` (businesses, users, plans, payments, settings) |
| `BUSINESS_OWNER` | All business operations + team management + subscription/billing    |
| `MANAGER`        | Sales, products, customers + inviting STAFF members                 |
| `STAFF`          | Record sales only (no discounts)                                    |

Authorization is enforced on the backend by the `RolesGuard` + per-endpoint
`@Roles(...)` decorators.

---

## 4. Subscription & payment flow

```
1. User picks a plan (frontend)  →  POST /billing/checkout { planId, provider }
2. Backend validates plan + provider, creates a PENDING PaymentTransaction
   and a payment session with the provider (Paystack / Flutterwave)
3. Frontend redirects the user to the provider's hosted page
4. User pays on the provider's page
5. Provider redirects back with ?reference=  (or sends a webhook)
6. Frontend calls POST/GET /billing/verify?reference=…
   → backend asks the PROVIDER for the truth (never trusts the frontend)
   → if SUCCESS and the amount matches, the subscription is activated/upgraded
     and the transaction is recorded as SUCCESS
7. Webhooks (POST /billing/webhook/:provider) are signature-verified and run
   the same verification logic
```

**Security rules:**

- A paid subscription is **never** activated based on frontend confirmation alone —
  the backend always verifies with the provider.
- The amount returned by the provider is compared with the stored transaction amount.
- Webhook signatures are verified before processing.
- Secret payment keys stay in `backend/.env` — never in the frontend.

### Subscription lifecycle

`TRIAL → ACTIVE → PAST_DUE → CANCELLED → EXPIRED / SUSPENDED`

- Renewals of the same plan extend the current period (priced by the provider flow).
- Plan changes (upgrade/downgrade) switch immediately after verified payment.
- Cancellation sets `cancelAtPeriodEnd` — access continues until period end.
- Suspending a business (from the Super Admin console) also suspends its subscription
  and locks out all its users.

### Usage limits

Limits are **enforced server-side** by `UsageService`:

- `assertLimit(businessId, 'MAX_CUSTOMERS')` — throws `409 Conflict` with a
  clear upgrade message when the limit is reached.
- `assertFeatureEnabled(businessId, 'ADVANCED_REPORTS')` — throws `403` when the
  feature isn't in the plan.
- `increment(...)` records usage inside the same transaction as the operation.

Example dashboard output:

```
Current plan: Starter
Customers: 450 / 500  (remaining: 50)
Products:  80  / 100
```

---

## 5. Required software

- Node.js **18+** (tested on 20.x / 24.x)
- PostgreSQL **14+** (local install — this project uses your local server)
- npm (bundled with Node)

---

## 6. Installation

From the project root (npm workspaces install all three apps at once):

```powershell
cd sales-book-saas
npm install
```

If you prefer installing each app separately:

```powershell
cd backend; npm install; cd ..
cd frontend; npm install; cd ..
cd super-admin; npm install; cd ..
```

---

## 7. Environment variables

Copy the example files and fill them in. **Never commit real secrets.**

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
Copy-Item super-admin\.env.example super-admin\.env.local
```

### backend/.env

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/sales_book?schema=public"
JWT_SECRET=change-me-long-random-string
JWT_REFRESH_SECRET=change-me-another-long-random-string
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
PORT=3002
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Payment providers (leave empty to disable a provider)
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=
```

### frontend/.env.local and super-admin/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api
```

---

## 8. PostgreSQL setup

This project uses your **existing local PostgreSQL installation** (no Docker, no
SQLite). Make sure the PostgreSQL service is running, then create the database:

```powershell
# Option A — with psql (add the bin folder to PATH if needed)
psql -U postgres -c "CREATE DATABASE sales_book;"

# Option B — from pgAdmin: right-click Databases → Create → Database → name: sales_book
```

`prisma migrate dev` can also create the database automatically if it doesn't exist.

Update `DATABASE_URL` in `backend/.env` with your real PostgreSQL password. The
password must stay local in `backend/.env` — never hard-code it elsewhere.

---

## 9. Prisma setup & migrations

```powershell
cd backend

# Generate the Prisma client (typed)
npx prisma generate

# Create and run the initial migration (creates the DB if missing)
npx prisma migrate dev --name init

# Seed roles, features, plans, providers and the Super Admin account
npm run seed
```

The seed script creates:

- The default features (`MAX_USERS`, `MAX_PRODUCTS`, `MAX_CUSTOMERS`,
  `MAX_MONTHLY_SALES`, `ADVANCED_REPORTS`, `EXPORT_DATA`).
- Four plans — **FREE, STARTER, BUSINESS, PRO** (configurable later from the console).
- The payment provider records (PAYSTACK, FLUTTERWAVE).
- A `SUPER_ADMIN` account:

```
email:    admin@example.com
password: ChangeMe123!
```

**Change the Super Admin password immediately after first login.**

---

## 10. Running the applications

### All three apps at once (recommended)

From the project root:

```powershell
npm run dev
```

This starts (via `concurrently`):

| App         | URL                          |
| ----------- | ---------------------------- |
| Frontend    | http://localhost:3000        |
| Super Admin | http://localhost:3001        |
| Backend API | http://localhost:3002/api    |
| Swagger     | http://localhost:3002/api/docs |

### Individually (each in its own terminal)

```powershell
# Terminal 1 — backend (http://localhost:3002)
cd backend
npm run start:dev

# Terminal 2 — frontend (http://localhost:3000)
cd frontend
npm run dev

# Terminal 3 — super-admin (http://localhost:3001)
cd super-admin
npm run dev
```

### Production builds

```powershell
cd backend; npm run build; npm run start:prod
cd frontend; npm run build; npm run start
cd super-admin; npm run build; npm run start
```

---

## 11. Payment configuration

Paystack and Flutterwave both need API keys in `backend/.env`:

1. Create accounts at [paystack.com](https://paystack.com) and
   [flutterwave.com](https://flutterwave.com) (Nigerian providers).
2. Copy the **secret keys** into `backend/.env`.
3. Set the webhook URL in the provider dashboard to:

   ```
   https://YOUR_BACKEND_HOST/api/billing/webhook/paystack
   https://YOUR_BACKEND_HOST/api/billing/webhook/flutterwave
   ```

4. Restart the backend so the provider records become active (the seed marks both
   as active; the billing service refuses providers without configured keys).

For local testing, both providers support **test mode** — use their sandbox keys and
test cards.

---

## 12. Testing

```powershell
cd backend

# Unit tests (UsageService, BillingService)
npm test

# e2e tests (tenant isolation + auth) — needs a running database
npm run test:e2e
```

What's covered:

- **Usage limits** — limit enforcement and conflict errors.
- **Billing verification** — success, failure, and amount-tampering cases.
- **Tenant isolation** (e2e) — a user of Business A cannot access Business B's data.
- **RBAC** (e2e) — a tenant token cannot reach `/admin` endpoints.

Type/build checks for all three apps:

```powershell
npm run build -w backend
npm run build -w frontend
npm run build -w super-admin
# or, from the root, all three at once:
npm run build
```

---

## 13. Production deployment

### 13.1 GitHub setup

The repository is already prepared for GitHub:

- The repo has been initialised with `git init -b main`.
- `.gitignore` (root + each app) excludes `node_modules/`, `dist/`, `.next/`,
  `*.tsbuildinfo` and **all real `.env` files** — only the `.env.example` templates
  are committed.
- A scan of the codebase found **no hard-coded secrets**: database passwords, JWT
  secrets and payment keys live only in the local (ignored) `.env` files.

```bash
# 1. Create an empty repository on GitHub (no README/gitignore — this repo has them)
# 2. From the project root:
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/sales-book-saas.git
git push -u origin main
```

**Before pushing, double-check what will be committed:**

```bash
git status            # should list no .env, node_modules, dist or .next files
```

If you ever commit a secret by mistake, rotate it immediately and remove it from
history (e.g. with `git filter-repo`) — a leaked key in git history is compromised
forever.

### 13.2 Production database requirements

Production must **never** use the local `localhost` / `127.0.0.1` PostgreSQL.
Create a managed PostgreSQL database on a cloud provider (Neon, Supabase,
Railway Postgres, Render Postgres, AWS RDS, …) and put its **full connection
string** (including password) into the backend's `DATABASE_URL` environment
variable on your hosting platform — never in the repository.

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/sales_book?schema=public
```

Requirements:

- PostgreSQL **14+** (the schema uses standard features only).
- The database must be reachable from your backend host (allow the host's IP /
  enable public connection if the provider requires it).
- Run migrations **once** against the production database before or during the
  first backend deploy:

  ```bash
  cd backend
  npx prisma migrate deploy   # applies the committed migrations/
  ```

  (Alternatively set a `DB_DEPLOY` script on your host to run
  `npx prisma migrate deploy` on startup — keep it idempotent.)

- Then seed the production database once (plans, features, providers, Super Admin):

  ```bash
  cd backend
  npm run db:seed            # uses ADMIN_EMAIL / ADMIN_PASSWORD from env
  ```

- Enable automated backups and point-in-time recovery on the provider.

### 13.3 Vercel deployment — frontend

The `frontend/` app deploys directly to Vercel (Next.js is auto-detected):

1. Push the repo to GitHub and import it in Vercel (**New Project → Import**).
2. Set the **Root Directory** to `frontend`.
3. Framework preset: **Next.js** (auto-detected). Build command
   `npm run build`, output directory `out`/`.next` (auto).
4. Add the environment variables below (13.6) — **for Preview too**, or the
   preview builds will fail.
5. Deploy. Every push to `main` redeploys production.

### 13.4 Vercel deployment — super-admin

Identical to the frontend, with **Root Directory** set to `super-admin`:

1. Import the same repo as a **second Vercel project**.
2. Root Directory: `super-admin`.
3. Add the environment variables below (13.6).
4. Deploy. The console is now a separate deployment — keep its URL private or
   protect it with Vercel's access protection.

### 13.5 Backend deployment — why not Vercel, and where to put it

**The NestJS backend is a long-running server process, and it is not a good fit
for Vercel's serverless functions.** Vercel is designed for short, stateless,
request-scoped functions, while this backend:

- **Listens on a fixed port** (`app.listen(port)` in `src/main.ts`) and holds an
  in-process NestJS application;
- **Keeps a long-lived Prisma connection pool** to PostgreSQL;
- **Verifies payment webhooks against the raw request body** (`rawBody: true` in
  `main.ts`) — serverless platforms parse/rewrite bodies in ways that can break
  signature checks;
- **Rate-limits in memory** (global `ThrottlerGuard`) — meaningful only for a
  persistent process;
- Serves **Swagger** and relies on a single HTTP entry point.

Converting it to serverless would require an adapter (e.g. `@nestjs/vercel`),
re-architecting the Prisma connection, and re-testing webhook verification — a
significant change that risks breaking payment flows. **We deliberately did not
convert it.**

**Recommended: deploy the backend as a Node.js service on a platform built for
long-running servers** — [Render](https://render.com), [Railway](https://railway.app),
or [Fly.io](https://fly.io). These run `node dist/main` continuously, exactly like
`npm run start:prod` locally:

| Step | Render | Railway |
| ---- | ------ | ------- |
| Start command | `npm run start:prod` | `npm run start:prod` |
| Root directory | `backend` | `backend` |
| Node version | 20.x (or 18.x) | 20.x |
| Build command | `npm install && npm run build` | `npm install && npm run build` |

1. Create the production PostgreSQL database first (13.2) and run migrations.
2. Deploy the `backend/` directory as a **Web Service** (Render) or **Service**
   (Railway).
3. Set all the backend environment variables (13.6).
4. The service gives you a public HTTPS URL, e.g. `https://sales-book-api.onrender.com`
   — this becomes the **API URL** for the frontends and the webhook base URL.

> Optional: with the right scale you can also run the backend on any VPS behind
> Nginx/Caddy with TLS (`npm run start:prod`), or in Docker — the code is a
> standard Node app and needs no changes.

### 13.6 Environment variables to set on the host

**Frontend (Vercel project 1):**

```
NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_HOST/api
```

**Super Admin (Vercel project 2):**

```
NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_HOST/api
```

> `NEXT_PUBLIC_*` variables are baked in at **build time** — after changing them,
> trigger a new deployment. If they are missing, the app fails loudly in
> production instead of silently calling `localhost`.

**Backend (Render / Railway / VPS):**

```
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/sales_book?schema=public   # production DB only
JWT_SECRET=<long random string>
JWT_REFRESH_SECRET=<different long random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
PORT=3002
CORS_ORIGINS=https://YOUR_FRONTEND_URL,https://YOUR_SUPER_ADMIN_URL
FRONTEND_URL=https://YOUR_FRONTEND_URL
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_CALLBACK_URL=https://YOUR_FRONTEND_URL/billing/verify
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_CALLBACK_URL=https://YOUR_FRONTEND_URL/billing/verify
FLUTTERWAVE_WEBHOOK_HASH=
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=<strong super-admin password>
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Notes:

- **Production fails closed on missing config**: the backend refuses to start if
  `JWT_SECRET` is missing, and refuses to start if `CORS_ORIGINS` is not set — it
  never falls back to permissive defaults in production.
- `CORS_ORIGINS` is a comma-separated list of exactly the origins that may call
  the API (no trailing slashes).
- The backend binds to all interfaces and trusts the first reverse-proxy hop in
  production so rate limiting and audit logs see real client IPs.

### 13.7 Custom domains

- **Vercel**: Project → Settings → Domains → add the domain (e.g. `app.example.com`)
  and point the DNS `CNAME`/`ALIAS` at `cname.vercel-dns.com`. Vercel provisions
  the TLS certificate automatically. Do the same for the super-admin project
  (e.g. `admin.example.com`).
- **Backend host**: add a subdomain such as `api.example.com` in your host's
  dashboard (Render/Railway handle the certificate).
- Update the **environment variables** to use the custom domains and redeploy
  frontend + super-admin, then update the provider webhook URLs (13.8).

### 13.8 Webhooks

In the Paystack and Flutterwave dashboards, set the webhook URL to your public
backend (test mode and live mode):

```
https://YOUR_BACKEND_HOST/api/billing/webhook/paystack
https://YOUR_BACKEND_HOST/api/billing/webhook/flutterwave
```

### 13.9 Security checklist

- [ ] Strong random `JWT_SECRET` / `JWT_REFRESH_SECRET` in production
- [ ] `DATABASE_URL` points at the managed production database (no `localhost`)
- [ ] HTTPS everywhere (Vercel + backend host)
- [ ] `CORS_ORIGINS` set to exactly your frontend origins (no `*`)
- [ ] Real email provider wired into `MailerService` (currently logs to console)
- [ ] Super Admin credentials rotated after seeding
- [ ] Rate limiting active (global: 100 req/min/IP)
- [ ] Payment keys live only in host environment variables, never in git
- [ ] Backups enabled on the database provider
- [ ] `git status` shows no `.env` files before any push

---

## 14. API overview (Swagger at `/api/docs`)

| Module          | Base path           | Highlights                                            |
| --------------- | ------------------- | ----------------------------------------------------- |
| Auth            | `/auth`             | register, login, refresh, logout, me, password flows  |
| Users           | `/users`            | team management (owner/manager)                       |
| Businesses      | `/businesses`       | tenant profile                                        |
| Customers       | `/customers`        | CRUD + archive + purchase history                     |
| Products        | `/products`         | CRUD + archive + stock                                |
| Sales           | `/sales`            | create (limits enforced), list, detail, reports       |
| Dashboard       | `/dashboard/summary`| stats + usage vs limits                               |
| Subscriptions   | `/subscriptions`    | public plans, current subscription, cancel            |
| Usage           | `/usage/me`         | plan + usage snapshot                                 |
| Billing         | `/billing`          | checkout, verify, webhooks, transactions              |
| Admin           | `/admin`            | platform dashboard, businesses, users, plans, payments, settings |

---

## 15. License / notes

This is a starter foundation — a working, secure, multi-tenant SaaS skeleton with a
clear path to production. Extend it with invoices, receipts, POS sync, SMS
notifications, and deeper analytics as your product grows.
