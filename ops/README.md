# TripGate OS

The internal Trip Engine — Lead → Requirements → Travel products → Pricing → Quote → Booking →
Documents → Payments → Support. Design rationale lives in `../architecture/01_TARGET_ARCHITECTURE.md`;
the evidence it's grounded in lives in `../research/`.

## Standing invariant

**This app is permanently separate from the marketing site** (`TRIPG/TRIPG/Coding/site`, a static
export with zero server runtime). Do not merge them, do not add ops routes to the site, do not add
`output: "export"` here. The only integration point is the marketing site's lead-capture forms
POSTing into this app's future `/api/leads` endpoint — see `../research/10_WEBSITE_OS_INTEGRATION_BLUEPRINT.md`.

## Stack

Next.js (App Router, Server Actions — no separate API layer yet) + Prisma + Postgres, in every
environment including local dev (see "Getting started" — a real Postgres binary, no Docker/cloud
account required to start). Money is stored as `*Minor` integer cents throughout, and status fields
are plain strings rather than Prisma enums, on general portability principle rather than because of
any particular engine's limitations.

## Getting started

```bash
npm install
npm run pg:local:start    # in its own terminal — starts a real local Postgres, leave it running
                           # (see prisma/local-postgres.ts). First run also initialises + creates
                           # the database; data persists in .pgdata/ across restarts.

# in another terminal:
cp .env.example .env      # then fill in DATABASE_URL (the URL pg:local:start printed) and
                           # WEBSITE_INTAKE_SECRET (command to generate one is in the file)
npx prisma migrate dev    # creates the schema
npm run db:seed           # populates the 2 real Providers (TripGate, Moods Travel) and 43 real
                           # TravelProducts transcribed from the marketing site's content/*.ts —
                           # see prisma/seed.ts's own comments for exact source citations
BOOTSTRAP_ADMIN_PASSWORD=<pick one> npm run db:seed:admin   # creates the first Administrator login
npm run dev
```

Open http://localhost:3000.

### Production (Neon + Vercel)

Set `DATABASE_URL` (Neon's **pooled** connection string — the one with `-pooler` in the hostname),
`WEBSITE_INTAKE_SECRET`, and `WEBSITE_ORIGIN` as Vercel project environment variables (see
`.env.example` for what each one is) — this is what the deployed app itself uses.

For the one-off setup commands below, use Neon's **unpooled** connection string instead (no
`-pooler` in the hostname): pgbouncer's transaction-pooling mode can interfere with the schema
engine's advisory locks / prepared statements during DDL.

```bash
DATABASE_URL=<unpooled Neon URL> npx prisma migrate deploy   # creates the schema
DATABASE_URL=<unpooled Neon URL> npm run db:seed             # populates the product catalog
DATABASE_URL=<unpooled Neon URL> BOOTSTRAP_ADMIN_PASSWORD=<pick one> npm run db:seed:admin
```

The local-dev admin login does not exist in production — this is a separate database.

## What's built so far (Month-1 slice)

Dashboard, Products, Providers, Quote Builder (per-line net cost / selling price / margin — no
global markup slider, and currency mismatches between a quote and one of its lines are flagged
rather than silently blended), Lead Inbox (honestly empty — not wired to the site yet), Knowledge
Base (honestly empty — nothing migrated from `Knowledge/Omra_Hajj/partners.md` yet).

Bookings/Documents/Payments/Availability/Customer portal are modeled in `prisma/schema.prisma`
already (per the founder's "build the entire architecture now, activate features progressively"
direction) but gated off in the nav via `OrganizationSettings.enabledModules` until there's a real
booking/document/payment to put in them.
