# 08 — Brand System (Tokens Only, Components Excluded)

Exact design-token values as they exist in the codebase today, plus a documented internal inconsistency the future OS should not inherit blindly.

## ⚠ Important: two different palettes exist in this repo — `globals.css` is current

`docs/ART_DIRECTION.md` documents an **earlier** palette: navy `#023373` primary + gold `rgb(237,163,47)` accent, cool navy-tinted neutrals (`#F7F8FA` → `#333D4C`). The live, currently-shipped `app/globals.css` has since been superseded by what its own inline comments call a "Mediterranean redesign," with a **different** primary-blue anchor and a **warm** (not cool) neutral ramp. Both are documented below since both exist as real files in the repo, but **`app/globals.css` is authoritative for anything built today** — `docs/ART_DIRECTION.md`'s hex values are historical, not current. Any future OS brand-token package should pull from `globals.css`, not from `ART_DIRECTION.md`.

## Color tokens — current (`app/globals.css`)

**Brand colors** (lines 19-26):
- `--color-primary-blue: #0f4c6e` (9.21:1 contrast on white)
- `--color-secondary-blue: #3e6c86` (5.69:1)
- `--color-primary-blue-deep: #092b3f` (dark-surface anchor)
- `--color-accent-gold: rgb(237, 163, 47)` — "accent only: nav underline-sweep + Morocco tour-card selection ring. Never a text color, never a button fill."
- `--color-accent-terracotta: #c1603d` (4.19:1 — below body-text floor by design, decorative use only)
- `--color-accent-olive: #7a8b5d` (3.70:1)
- `--color-text-dark: #33302a` (13.15:1)
- `--color-background-white: rgb(255, 255, 255)`

**Neutral scale** — warm ivory/sand family (lines 32-40): `neutral-50 #faf7f1` (page background) → `neutral-100 #f3ecdd` → `neutral-200 #e4d9c4` → `neutral-300 #cdbb9b` → `neutral-400 #a99878` → `neutral-500 #8b7c63` (4.07:1) → `neutral-600 #5c5548` (default body text, 7.37:1) → `neutral-700 #453f36` → `neutral-800 #33302a` (= `--color-text-dark`).

**On-dark / border tokens** (lines 46-54): `--color-text-on-dark: #ffffff`; `--color-text-on-dark-secondary: rgba(255,255,255,0.64)`; `--color-border-on-dark: rgba(255,255,255,0.12)`; `--color-border-default: var(--color-neutral-200)`; `--color-border-strong: var(--color-neutral-300)`.

**Hero scrim gradients** (lines 111-125): vertical — `linear-gradient(to top, rgba(9,43,63,.54) 0%, rgba(9,43,63,.37) 20%, rgba(9,43,63,.16) 38%, rgba(9,43,63,0) 52%)`; side — 5-stop variant with the same `rgba(9,43,63,…)` navy anchor.

**Manifest/meta colors**: `public/site.webmanifest` — `theme_color: "#0f4c6e"`, `background_color: "#faf7f1"` (matching `globals.css`'s current primary blue and neutral-50). `app/layout.tsx:53` sets the same `themeColor: "#0f4c6e"`.

## Typography

**Font loading** (`app/layout.tsx:1-39`): `next/font/google` — `Cormorant` (weight `600` only, variable `--font-cormorant`) and `Inter` (weights `400`/`600`/`700`, variable `--font-inter`). A third typeface, **Alice**, is explicitly retired ("shipped only one weight (400)... Inter-600 covers the same role").

**Role assignment** (`globals.css:132-134`): `--font-heading: var(--font-cormorant), serif` — H1/H2 only. `--font-body` / `--font-button: var(--font-inter), sans-serif` — body, H3–H5, buttons, nav.

**Type scale** (`globals.css:137-210`): Eyebrow 13px/600/0.08em tracking/1.4 line-height; H1 65px desktop (`clamp(1.75rem, 6vw + 1rem, 65px)` mobile)/600/1.05; Display (Home hero only) `clamp(2.25rem, 4vw + 1.5rem, 4.25rem)`; H2 40px desktop/28px mobile/600/1.15; H3 28px/600/1.25; H4 22px/700/1.3; H5 18px/600/1.4; Body 16px/400/1.6; Caption 13px/400/1.5; Button label 15px/600/1.2; Nav label 14px/600/0.06em tracking/1.2; Form input 16px.

## Spacing, layout, radius, shadow

**Spacing scale** (8px base unit, `globals.css:213-221`): `3xs 4px` / `xs 8px` / `sm 16px` / `md 24px` / `lg 32px` / `xl 48px` / `xxl 64px` / `3xl 96px` / `4xl 128px`.

**Breakpoints** (`globals.css:225-227`): tablet `768px`, desktop `1024px`, wide `1440px`.

**Container** (`globals.css:230-235`): max-width `1280px` (narrow variant `720px`); gutters mobile `20px` → tablet `32px` → desktop `48px` → wide `64px` minimum, then `(100vw−1280px)/2`.

**Radius scale** (`globals.css:242-246`): `xs 6px` / `sm 10px` / `md 16px` / `lg 24px` / `full 999px`.

**Shadow scale** (warm-ink-tinted, `globals.css:254-257`): `xs 0 1px 2px rgba(38,31,23,.06)` / `sm 0 2px 8px rgba(38,31,23,.08)` / `md 0 8px 24px rgba(38,31,23,.1)` / `lg 0 16px 48px rgba(38,31,23,.14)`.

## Motion tokens

**`globals.css:268-276`** (source of truth per `components/motion/tokens.ts`'s own comment — the two files must be kept in sync **by hand**, no build-time link): durations `instant 100ms` / `fast 180ms` / `base 320ms` / `slow 500ms` / `slower 700ms`; easings `standard cubic-bezier(.4,0,.2,1)` / `out cubic-bezier(0,0,.2,1)` / `in cubic-bezier(.4,0,1,1)` / `emphasized cubic-bezier(.16,1,.3,1)`.

**`components/motion/tokens.ts`** (full file, 57 lines) mirrors the above in seconds (not ms, since `motion/react` takes seconds) and adds: `spring: { stiffness: 280, damping: 28, mass: 1 }`; `distance: { xs: 8, sm: 16, md: 24, lg: 40 }`; `stagger: { catalogStep: 0.05, catalogCap: 0.25, narrativeStep: 0.09 }`.

**`docs/MOTION_SYSTEM.md`** (438 lines, read in full) documents the same values plus governance rules: `emphasized` easing is allow-listed for exactly two uses sitewide (Home hero entrance, Home value-pillar reveal); distance has "a hard ceiling: 56px, never exceeded, anywhere"; two stagger speeds exist — catalog pacing (50ms/item, capped at 250ms cumulative) and narrative pacing (90ms/item, uncapped, reserved for ≤5 items like Home's four value pillars).

## Brand copy (`content/brand.ts`, full file read, 139 lines)

Taglines: *"Tailor-Made Journeys — Anywhere in the World"*; homeHeadline *"Where Every Journey Becomes a Story."* Four pillars: Global Network, Tailor-Made Journeys, Seamless Experience, Authentic Encounters (each with a one-line description — see file for exact text). Narrative fields: `whoWeAre`, `whatMakesUsDifferent`, `heritageConfidence` ("Rooted in Morocco, planning trips across the globe"), `heritageFooter`. Local-expertise statement (also duplicated in `components/shared/LocalExpertiseStatement.tsx`): *"Every journey is personally planned by a travel specialist — not generated from a template..."*

**`trustSignals: string[] = []`** — deliberately empty (line 139): *"Whether TripGate has verified, publishable figures for these (license number, traveler count, years in business, review rating) is still an open business decision... never display an invented or unverified number/placeholder string here."*

## Recommendation — minimum shareable brand-token package for the OS

Per the earlier architecture-design pass's guidance (share tokens, never components, never app code): the OS should consume **only**:
1. Both logo files (`tripgate-logo.png`, `tripgate-logo-horizontal.png`).
2. The color tokens from `globals.css` §"Brand colors"/"Neutral scale" (current, not `ART_DIRECTION.md`'s superseded set).
3. The two typefaces (Cormorant 600 for headings only, Inter 400/600/700 for everything else) and the type-scale numbers.
4. The spacing/radius/shadow primitives (these are generically useful for any internal dense-UI tool, independent of the marketing site's specific visual flourish).
Motion tokens, hero-scrim gradients, and image-grade filters are marketing-site-specific polish — not necessary for an internal ops tool and not worth the coupling.
