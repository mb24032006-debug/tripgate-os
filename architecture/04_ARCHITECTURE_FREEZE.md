# Architecture Freeze

The point of this document: every decision below becomes expensive to change the moment the first
persistent production record is written. Everything built so far (schema, UI, French support) was
reversible — SQLite, in-memory-feeling, no real users. Postgres + Auth + migrations + a live
production deployment is a different category of decision. This document makes those decisions
explicitly, before any of that code is written, per direct instruction: **decide and justify, no
code, no implementation.**

Nothing in this document has been executed — no accounts created, no services provisioned. This is
the proposal to sign off on before that happens.

**Revision note:** the first pass of this document (decisions #3, #4, #7 below) was reviewed a
second time under harder scrutiny before being presented as final, and three problems surfaced:
(1) the original hosting decision (Railway, rejecting Vercel for "not fitting long-lived DB
connections") directly contradicted the DB decision right above it (Neon, chosen *specifically*
for an HTTP-based driver built for serverless) — Server Actions are stateless request/response and
run natively on serverless; (2) the original auth decision (Auth.js) optimized for avoiding a
vendor's per-seat fee while overlooking that self-hosting credentials auth (password hashing,
brute-force rate-limiting, session invalidation, password-reset email) is real, ongoing security
work for a team with no dedicated security engineer — the opposite of "boring and hard to get
wrong," which is the standard this whole project has held to since the first architecture doc; (3)
the original roles design hardcoded three roles into application logic, which is inconsistent with
every other taxonomy in this system (Category, enabledModules, Provider.sourceKind) being data, not
code. All three are corrected below, with the reasoning kept visible rather than silently redone.

## Standing constraint carried into this freeze

**Do not connect the live marketing site yet.** The marketing site (`tripgatemorocco.com`) stays on
Formspree exactly as it is today. The OS stays on localhost/staging. The cutover described in
`research/10_WEBSITE_OS_INTEGRATION_BLUEPRINT.md` does not happen until Auth, Postgres, migrations,
backups, and a real production deployment all exist and are verified — not concurrently with them.

---

## 1. PostgreSQL provider — **Neon**

**Decision: Neon.** Not Supabase, not Railway's bundled Postgres, not Cloud SQL.

**Why:** Neon's branching model directly answers question #8 (dev/staging/production environments)
— a branch is a full, instant, copy-on-write fork of the schema and data, not a separate empty
database to reseed. That turns "spin up a staging environment" and "give each developer their own
throwaway dev database" from an ops chore into a one-command action. It's also true, unmodified
Postgres (no proprietary extensions to get locked into), scales to zero when idle (this is a
low-traffic internal tool for a 2-5 person team — paying for an always-on instance would be waste),
and its driver is HTTP-based rather than a long-lived TCP connection — which is exactly what makes
Vercel a workable hosting choice in §7, not a liability. It doesn't bundle Auth the way Supabase
does, which keeps the auth decision (§3) independent, chosen for identity/session needs rather than
inherited from whichever DB host was picked.

**Region: EU (Frankfurt, `eu-central-1`)** — the closest Neon region to Morocco and to the
European clientele the international-tours line already serves (`research/06`), rather than
defaulting to a US region by not deciding.

**Rejected alternatives:** Supabase (excellent product, but its Auth is coupled to its own client
SDK/session model — a separate reason to keep DB and identity decisions independent, not because
Supabase Auth is bad); Railway's bundled Postgres (fine engine, no branching story — would need a
separate, manual "copy prod to staging" process); Cloud SQL (GCP-grade reliability this team
doesn't need yet, and meaningfully more operational overhead for a team with no dedicated DevOps
person).

## 2. ORM — **Prisma**

**Decision: Prisma. Not Drizzle.**

**Why:** The entire schema, every migration, and every server action already runs on Prisma —
switching now would be a rewrite in search of a marginal benefit, not a fix for a real problem.
Prisma's schema-as-source-of-truth model is also exactly what makes the migration strategy in §5
possible (a migration is a reviewable file in git, not an imperative script). The one concrete
change this freeze requires: swap the `@prisma/adapter-better-sqlite3` driver adapter for
`@prisma/adapter-neon` (Neon's HTTP/WebSocket-based driver, the recommended adapter for Neon +
Prisma 7's driver-adapter architecture) — a connection-layer swap, not a schema change, per the
schema's own header comment about exactly this portability.

## 3. Authentication — **Clerk**

**Decision: Clerk. Not Auth.js, not Supabase Auth.**

**Why (reversed from the first pass of this document, reasoning kept visible):** the original
instinct — self-host with Auth.js to avoid a per-seat vendor fee — optimized for the wrong cost.
At 2-5 staff, Clerk's free tier covers this team at $0; what self-hosting actually would have
traded that non-cost away for is taking on password hashing, brute-force login rate-limiting,
session invalidation, and password-reset email delivery (which would have needed yet another
vendor — a transactional email service) as this team's own ongoing security responsibility. For a
team with no dedicated security engineer, that is real, unbounded maintenance risk, not a one-time
setup cost — the opposite of "boring and hard to get wrong," which is the bar this project has
held every other infrastructure choice to. Clerk has first-party Next.js App Router/Server Action
support, so it doesn't cost anything on the "fits this codebase's patterns" dimension either — the
two options are equivalent there, which makes the security/maintenance difference the deciding
factor.

**What stays independent of this choice:** Role data (§4) lives in this app's own Postgres, keyed
off Clerk's user ID — Clerk owns identity/session only, never authorization, so the permission
model isn't coupled to a vendor that could change its access-control API later.

**Mechanism:** Email + password to start, no SSO/SAML — Clerk supports adding both later without a
migration, which is the point of not self-hosting this layer.

## 4. Roles and permissions — modeled as data, not hardcoded (reversed from the first pass)

**Reversed from the first pass:** the original design hardcoded three roles directly into
application/Server Action logic. Every other taxonomy in this system — `Category` with its
per-category `attributeSchema`, `OrganizationSettings.enabledModules`, `Provider.sourceKind` — was
built specifically so a new value is a data change, not a code change. Hardcoding roles into
`if (role === "agent")` checks scattered across Server Actions would have been the one place this
build quietly abandoned its own discipline. Corrected: a `Role` table (id, name,
`permissions` JSON — mirroring `Category.attributeSchema`'s shape exactly) plus `Staff.roleId`.
Adding a fourth role later (e.g. a "Finance" role once Payments/Phase 2 lands) is then a seed-data
change, the same way adding a "Restaurant" product category was.

**Initial seed data for that `Role` table** — same three roles, same permissions as originally
designed, just stored as data instead of code:

| Action | Agent | Ops Manager | Administrator |
|---|---|---|---|
| Create/edit own Trips, Leads, Requirements | ✅ | ✅ | ✅ |
| View all Trips (not just own) | ❌ | ✅ | ✅ |
| Create/edit Quotes, add/remove QuoteLines | ✅ (own trips) | ✅ (any) | ✅ |
| Send a Quote | ✅ (own trips) | ✅ | ✅ |
| Delete/void a sent Quote | ❌ | ✅ (with audit log) | ✅ |
| Create/resolve Support tickets | ✅ (own trips) | ✅ (any) | ✅ |
| Create/edit TravelProducts, Providers, Categories | ❌ | ✅ | ✅ |
| Manage Bookings/Documents/Payments (Phase 2) | ❌ | ✅ | ✅ |
| Manage Staff accounts and roles | ❌ | ❌ | ✅ |
| Change OrganizationSettings (operating model, feature flags) | ❌ | ❌ | ✅ |
| View audit/change logs | ❌ | ✅ | ✅ |

Enforcement stays server-side, in the Server Action itself — a hidden button is not a security
boundary — but the check becomes "does this Staff row's Role.permissions include X," a data lookup,
never a hardcoded string comparison.

**Schema implication (not built yet, documented for whoever implements this freeze):** a `Staff`
table (id, name, email, `clerkUserId`, `roleId`, status) and a `createdByStaffId`/`ownerStaffId`
field on `Trip`/`Quote` — additive, following the same nullable-and-string-status convention already
used throughout the schema. This is exactly stress-test scenario #19 from
`architecture/02_ARCHITECTURE_STRESS_TEST.md`, now scheduled rather than merely flagged. No
`passwordHash` field — Clerk (§3) owns credentials; this table only owns role assignment.

## 5. Migration strategy

- **Local dev**: once this freeze is adopted, local development stops using SQLite (it was always
  a zero-setup stopgap, never the target — see `schema.prisma`'s own header comment) and moves to a
  personal Neon dev branch per developer, created via `prisma migrate dev` against that branch.
  This removes the last "does this behave differently on real Postgres" risk entirely.
- **Staging**: a dedicated Neon branch, forked from production's schema (not its data — see
  privacy note in §8), auto-updated via `prisma migrate deploy` when a migration merges to `main`.
- **Production**: `prisma migrate deploy` only — never `migrate dev` (which can generate
  destructive shadow-database diffs) — and only run after a human approves it. For a team this
  size, that human is the Administrator/technical lead, and approval is a manual step in the
  deploy workflow (§9), not an automatic gate.
- **Review**: every migration is a file committed to git and reviewed like any other code change
  before merge — the migration file itself is the audit trail of every schema change ever made.

## 6. Backup strategy

- **Primary**: Neon's built-in point-in-time recovery (available on paid tiers, 7-30 day window
  depending on plan) — restore to any point within the window without a separate backup job to
  maintain.
- **Independent secondary**: a scheduled daily `pg_dump` to object storage (Cloudflare R2 — already
  the recommended choice for `Document.fileUrl` in `architecture/01_TARGET_ARCHITECTURE.md`, so no
  new vendor). This exists specifically so a Neon-side incident can't also take out the only backup
  — an independent copy on different infrastructure, run from different infrastructure too.
- **Mechanism**: a Vercel Cron Job (a scheduled route handler, native to the hosting platform
  chosen in §7 — no separate scheduler service to run) triggers the dump once daily and uploads it
  to R2.
- **Retention**: 30 daily dumps + 12 monthly snapshots, rolling.

## 7. Production hosting for the OS — **Vercel** (reversed from the first pass)

**Decision: Vercel. Not Railway, not Fly.io.**

**Why this reverses the first pass:** the original reasoning rejected Vercel because "serverless
fights long-lived DB connections" — but that objection is exactly what choosing Neon's HTTP-based
driver (§1/§2) already solved; there is no long-lived TCP connection for serverless to fight.
Server Actions are stateless request/response, the same as any API route, and run natively on
Vercel — which is built by the team that ships Next.js itself, making this the single most
well-trodden combination for this exact stack. The "keep it on a different platform than the
marketing site" argument from the first pass was also moot on inspection: the marketing site is
already on Cloudflare Pages (`research/01`), a platform neither Vercel nor Railway touches — that
reasoning didn't actually distinguish the two options, it just sounded like it did.

**What Vercel adds that the first pass didn't credit:** an automatic preview deployment per pull
request, each wired to its own ephemeral environment — a stronger, more automatic staging story
than manually configuring a separate always-on staging service, and it's the default behavior, not
something to build.

**Real caveat, stated honestly rather than discovered later:** Vercel's serverless functions have
per-invocation duration limits and no persistent background-worker model. The daily backup job
(§6) fits fine as a short Cron-triggered function. But if/when this project needs something
genuinely long-running (the future supplier-API polling from stress-test scenario #6, for
instance), that would need a small satellite worker service — likely on Railway or Fly.io — added
alongside Vercel, not a reason to avoid Vercel for the main app today. Flagging this now so it's a
planned decision later, not a surprise.

## 8. Environments

| Environment | Database | App hosting | Region | Data |
|---|---|---|---|---|
| Local dev | Personal Neon dev branch | `next dev` on localhost | eu-central-1 | Seeded from `prisma/seed.ts` (real product/provider data, no real customer PII) |
| Staging | Neon staging branch | Vercel Preview Deployment (per PR) | `fra1` | Seeded/synthetic Trips/Customers only — **never a copy of real production customer data**, a privacy line worth stating explicitly now |
| Production | Neon production branch (paid, PITR-enabled) | Vercel Production Deployment | `fra1` | Real data, access restricted per §4/§10 |

## 9. Deployment workflow

1. Every PR gets an automatic Vercel **Preview Deployment** — no manual staging setup step, it's
   the platform default.
2. Any pending Prisma migration is applied to a matching **staging** Neon branch as part of that
   preview (safe, since staging/preview holds no real customer data).
3. Manual verification on the preview deployment (the same "run locally → verify in browser"
   discipline already used throughout this build, just one environment further along).
4. **Promotion to production is a manual, explicit action** — promote the exact tested build
   artifact (not a rebuild from `main` a second time), gated on the Administrator approving the
   pending migration (if any) via `prisma migrate deploy` against the production branch.
5. No migration ever auto-applies to production. No deploy to production ever happens without a
   human step in between preview verification and the production promotion.

## 10. Security model

- Every route requires Staff authentication (via Clerk) **except** the future public
  `POST /api/leads` endpoint (research/10) — that remains the one deliberate exception, and it gets
  its own hardening (rate limiting, honeypot, strict CORS to the marketing site's exact origin)
  independent of this freeze.
- Role checks happen in the Server Action itself, server-side, on every mutation, against the
  data-driven `Role.permissions` (§4) — never trust a hidden UI element as the only gate.
- Secrets (DB connection string, Clerk API keys, future third-party API keys) live only in Vercel's
  encrypted environment-variable store — never in git, never in a client bundle.
- HTTPS everywhere (Vercel default).
- Explicitly deferred, not silently forgotten: SSO/SAML and 2FA. Clerk supports adding both later
  without a migration; reasonable to leave off for a first production launch at this team size and
  revisit as a named future hardening step once staff count grows.

---

## What this freeze does NOT authorize

No Neon project has been created. No Vercel project exists. No Clerk integration code has been
written. No migration has been run anywhere but the local SQLite dev database used throughout this
build so far. This document is the decision record to review and sign off on — implementation is
the next, separate step once these ten decisions are confirmed.
