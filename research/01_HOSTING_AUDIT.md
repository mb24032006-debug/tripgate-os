# 01 — Hosting & Infrastructure Audit

Repo audited: `c:\Users\PC\Desktop\TRIPG\TRIPG\Coding\site`. Every claim below is cited to a specific file; no assumptions.

## Is the site statically exported?

**Yes.** `next.config.ts`:
```
output: "export",
images: { unoptimized: true },
```
This is the single fact that determines everything else in this document. Under `output: "export"`, Next.js produces a folder of static files (confirmed present: `out/`) with no server process attached at runtime.

## Is there any server runtime?

**No.** `output: "export"` disables Server Actions, Route Handlers acting as a live API, and Middleware — none of these exist in the repo regardless (see below). `next.config.ts`'s own `headers()` function is dead code under this mode — the real HTTP headers are delivered by `public/_headers` (Cloudflare Pages' static-headers convention), not by Next.js.

## Is there any database?

**No.** `package.json` dependencies are exactly: `next`, `react`, `react-dom`, `motion`, `swiper` (runtime) plus a standard Next/TypeScript/ESLint/Vitest/Testing-Library dev toolchain. No ORM (Prisma/Drizzle/Mongoose), no DB driver (`pg`, `mysql2`, etc.), no hosted-DB SDK (Supabase/Firebase) appears anywhere.

## Is there any authentication?

**No.** No auth library (NextAuth/Auth.js, Clerk, Lucia, etc.) in `package.json`; no `app/api/auth` route; no session/cookie-handling code found in `lib/` or `components/`.

## Are there any API routes?

**No.** `app/` contains only page routes plus `sitemap.ts` and `robots.ts` (both `export const dynamic = "force-static"` per static-export requirements) and `not-found.tsx`. There is no `app/api/` directory anywhere in the tree.

## `lib/` — the entire "backend-adjacent" code

`lib/site.ts` is the only file in `lib/`. It exports SEO/routing constants only: `SITE_URL`, `SITE_NAME`, and a `ROUTES` array consumed by `sitemap.ts`/`robots.ts`/`layout.tsx` metadata — 31 lines total, no business logic, no data access.

## Deployment target

- `.wrangler/` directory at the repo root and `public/_headers` (Cloudflare Pages' static-headers convention) both point at **Cloudflare Pages** as the hosting target.
- `docs/SESSION_HANDOFF.md` (line 486 per the media/brand research pass) references "the real production Cloudflare deployment," and separately notes Cloudflare Web Analytics was considered but deferred ("no beacon token was available yet").
- `public/site.webmanifest` declares this as a PWA-manifest-enabled static site: `name`/`short_name`: "TripGate", `theme_color: "#0f4c6e"`, `background_color: "#faf7f1"`, icons at `/icons/icon-192.png` / `/icons/icon-512.png`.

## Security / CSP configuration

`public/_headers` (1,553 bytes) sets, per its own comment: "next.config.ts's headers() is a no-op under output: 'export', so this file is the real mechanism here." It configures CSP, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and HSTS. The CSP's `connect-src` is scoped to `'self' https://formspree.io` — i.e., the only outbound fetch target the browser is currently allowed to call is Formspree. Any future integration point (e.g. a new ops-platform API) requires adding its origin here explicitly; this is a visible, deliberate gate, not something that fails silently.

## Form handling / third-party services

- **Formspree** is the only backend-equivalent service in use. All three inquiry forms (Tailor-Made Holidays, Business Travel, Omra & Hajj) route through one shared client (`components/shared/FormStateContext.tsx`), which POSTs JSON to `https://formspree.io/contact@tripgatemorocco.com` (line 29) — a single shared inbox distinguished only by a per-page `_subject` string (line 69: `` `New ${formName} inquiry — TripGate` ``).
- `content/legal.ts` corroborates: "Formspree is the only third-party data processor in use... no analytics/tracking is currently live," and describes to visitors that "Form submissions are delivered to us via Formspree, a third-party form-processing service."
- **Google Fonts** (Cormorant, Inter) are loaded via `next/font/google` in `app/layout.tsx` (self-hosted at build time by Next.js's font optimization, not a runtime third-party call).
- No payment processor, no CRM/booking SDK, no chat widget, no other third-party service integration exists anywhere in the repo.

## Files that prove these conclusions

| Fact | File |
|---|---|
| Static export, no images optimization | `next.config.ts` |
| No backend dependencies | `package.json` |
| No `app/api/` directory | `app/` directory listing |
| Only backend-adjacent code is SEO constants | `lib/site.ts` (sole file in `lib/`) |
| Cloudflare Pages hosting | `.wrangler/`, `public/_headers` |
| CSP / allowed outbound origins | `public/_headers` |
| Formspree as sole "backend" | `components/shared/FormStateContext.tsx:24-80`, `content/legal.ts` |
| PWA manifest / theme metadata | `public/site.webmanifest` |

## Explicit confirmation from the project's own governance doc

`docs/SESSION_HANDOFF.md` §14.9 states outright (as reported by the earlier exploration pass and re-confirmed by the KB research pass): *"The 'Business Layer'... — a CMS, an admin dashboard, tour/booking management, a real booking workflow, email templates, CRM integration, analytics/conversion tracking, search/filters, reviews, payments — is entirely out of scope, confirmed via a full repo scan: zero backend exists anywhere (`output: "export"`, no API routes, no database, no auth; the existing inquiry forms don't submit anywhere real)."*

**Caveat on that quote's currency:** the clause "the existing inquiry forms don't submit anywhere real" is now outdated by a later change in the same repo — Formspree submission was added 2026-08-13 (per `content/legal.ts` and `FormStateContext.tsx`'s own dated comments), after `SESSION_HANDOFF.md` was written. The rest of the §14.9 finding (no backend/DB/auth/API routes) remains accurate today.
