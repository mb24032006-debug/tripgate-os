# 07 — Media & Asset Audit

Full inventory of `public/` (144 files total) and every image reference in code, with a shareable-vs-page-specific classification for the future OS.

## `public/` top level

- `public/_headers` (1,553 B) — Cloudflare Pages CSP/security headers config (see `01_HOSTING_AUDIT.md`).
- `public/site.webmanifest` (336 B) — PWA manifest: name/short_name "TripGate", `background_color: "#faf7f1"`, `theme_color: "#0f4c6e"`, icons at `/icons/icon-192.png` / `/icons/icon-512.png`.
- `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` — **unmodified Next.js/Vercel starter-template SVGs**, not TripGate brand assets. Safe to delete; not shareable, not meaningful.

## `public/brand/` — the logo assets (exactly 2 files)

| File | Size | Usage |
|---|---|---|
| `tripgate-logo.png` | 30,252 B | Square icon/wordmark lockup. **Not rendered visibly anywhere** — used only as the sitewide `TravelAgency` JSON-LD `logo` field (`app/layout.tsx:22`) and as the stated source image for generated favicons. Per `tests/Header.test.tsx:46-48`, this asset is considered "illegible" at header display scale. |
| `tripgate-logo-horizontal.png` | 27,483 B | **The actively-used logo.** Intrinsic size 750×165px (confirmed via `tests/Header.test.tsx:43-50`, which asserts `width="750" height="165"`). Rendered in `Header.tsx:30`, `Footer.tsx:157`, `MobileNav.tsx:227`. |

## `public/icons/` — PWA icons (2 files)

`icon-192.png` (11,362 B), `icon-512.png` (35,268 B) — referenced only from `site.webmanifest`.

## Next.js file-convention icons (under `app/`, not `public/`)

`app/icon.png` (35,268 B — byte-identical to `icon-512.png`), `app/apple-icon.png` (10,580 B), `app/favicon.ico` (18,334 B) — per `app/layout.tsx:46-48`'s own comment, generated from `public/brand/tripgate-logo.png`.

## `public/images/` — 144 files total across the tree, breakdown

- **Root of `public/images/`**: ~50 original/full-size source photos (`.jpg`/`.webp`), 123 KB (`agadir2.jpg`) up to 5.7 MB (`cairo-hurghada-luxor-karnak.jpg`).
- **`public/images/all tours hero/`** (note: literal space in the folder name): 13 raw hero-candidate photos, several with Unsplash/Pexels-attributed filenames (e.g. `2022-08_karsten-winegeart-fd1cQ3mmBTE-unsplash.jpg`, `pexels-hson-20633010.jpg`) — i.e. stock photography, not TripGate's own.
- **`public/images/optimized/`**: 96 files — WebP/JPG derivatives, "long-edge ~800px, q80" per `content/tours.ts:12-18`. This is the folder actually served to visitors.
  - **`public/images/optimized/og/`**: 7 Open Graph JPGs — `default-og.jpg` (167,703 B), `about-og.jpg` (70,093 B), `business-travel-og.jpg` (136,847 B), `omra-hajj-og.jpg` (127,944 B), `tailor-made-holidays-og.jpg` (124,820 B), `international-tours-og.jpg` (209,789 B), `morocco-og.jpg` (214,685 B).

## Key finding: only `/optimized/` is actually served

**Every single hardcoded `src="/images/…"` reference in the entire codebase points into `/images/optimized/`.** The ~50 root-level originals and the 13 "all tours hero" candidates are **orphaned source masters** — kept for provenance/re-export purposes only, never served to a visitor. Confirmed via repo-wide grep across all `.ts`/`.tsx` files.

## Image data-integrity flag: `imageBroken`

`content/tours.ts` defines `imageBroken: boolean` per Tour SKU. 9 of 10 entries are `false`; exactly 1 (`red-city-fever`) is `true` — its original hero-image reference didn't exist locally under that name, and a different, independently-confirmed image was substituted rather than a guessed placeholder. No customer-facing disclosure is rendered for this substitution.

## Orphaned OG images (dead assets, confirmed by grep — zero references)

`public/images/optimized/og/morocco-og.jpg` and `.../international-tours-og.jpg` exist as real files but are referenced nowhere in code. Cause: `app/morocco/page.tsx` and `app/international-tours/page.tsx` are now bare meta-refresh redirect stubs (to `/all-trips?region=morocco` and `/all-trips`) with only a minimal `title`/`robots` metadata object — no `openGraph` block — since the two dedicated pages were consolidated into `/all-trips`.

## Per-page hardcoded hero/OG images (component & page level, confirmed real files)

| Page/Component | Image(s) |
|---|---|
| Home (`app/page.tsx:195`) | `international-tours-hero-map-hero.webp` |
| Business Travel (`app/business-travel/page.tsx:99,127,198`) | `business-travel-lounge-hero.webp`, `business-travel-services-card.webp`, `business-travel-chauffeur-request-card.webp` |
| Tailor-Made Holidays (`app/tailor-made-holidays/page.tsx:97`) | `tailor-made-hero.webp` |
| About (`app/about/page.tsx:79`) | `about-hero.webp` |
| Omra & Hajj (`app/omra-hajj/page.tsx:96,127,146,202`) | `madinah-hero.webp`, `makkah-title.webp`, `madinah-title.webp`, `omra-hajj-pilgrims-card.webp` |
| Staff photo (`components/about/StaffPhotography.tsx:15`) | `about-staff-team-card.webp` |
| Home hero carousel (`components/home/Hero.tsx:32-37`) | 6 generic destination photos (Paris, Venice, San Francisco, Rio, Himalaya, overwater bungalows) |
| All-Trips hero carousel (`components/allTrips/AllTripsHero.tsx:40-49`) | 9 generic destination photos |

Per-tour and per-program images (10 Morocco + 10 International) are one-to-one tied to specific catalog entries in `content/tours.ts`/`content/internationalTours.ts` — not reusable.

## Recommendation — shareable vs. page-specific classification

**Shareable with the future OS** (brand-identity assets, not tied to marketing-page content):
- `public/brand/tripgate-logo.png`, `public/brand/tripgate-logo-horizontal.png`
- `public/icons/icon-192.png`, `public/icons/icon-512.png`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`
- `public/site.webmanifest` (as a reference for brand color tokens: `#0f4c6e` theme, `#faf7f1` background)
- `public/images/optimized/og/default-og.jpg` (sitewide fallback share image, if the OS ever needs a generic share card)

**Page-specific editorial content — do not share, do not duplicate into the OS as "brand" assets**: every hero photo, staff photo, and per-tour/per-program image listed above. These are marketing content tied to the site's own copy and layout, not reusable brand identity.

**Dead weight — recommend cleanup, not carried forward**: the 5 unmodified Next.js/Vercel starter SVGs, the ~50 orphaned root-level image originals, the 13 unused "all tours hero" candidates, and the 2 orphaned OG images (`morocco-og.jpg`, `international-tours-og.jpg`).
