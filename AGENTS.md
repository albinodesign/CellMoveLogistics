# AGENTS.md — CellMove Logistics Website

Static Astro 4 marketing site (German) for CellMove Logistics GmbH, a dangerous-goods
carrier for lithium-ion batteries. 4 pages, no CMS, no backend, no tests.

## Environment: fix these before anything else

The checked-in working copy is **not** in a runnable state on macOS. Two independent
breakages, both verified:

1. **`node_modules` was installed on Windows and copied here.** It contains only
   `@rollup/rollup-win32-*` and `@esbuild/win32-x64`. Any build dies with
   `Cannot find module @rollup/rollup-darwin-arm64`.
2. **No file has the execute bit** (everything is `-rw-rw-rw-`), so
   `npm run dev` / `npm run build` fail with
   `node_modules/.bin/astro: Permission denied`.

Recovery (takes seconds; `package-lock.json` already pins the darwin optional deps):

```bash
npm install
chmod +x node_modules/.bin/*
```

Requires Node `^18.17.1 || ^20.3.0 || >=21.0.0` (Astro 4 constraint). There is no
`.nvmrc` and no `engines` field in `package.json`.

## Commands

```bash
npm run dev       # http://localhost:4321, hot reload
npm run build     # -> dist/  (~1s)
npm run preview   # serve the built dist/
```

There is **no** test, lint, format, typecheck, or CI script. The only automated
verification is `npm run build` succeeding. Everything else is a manual browser check.

## Build output shape (surprising)

`astro.config.mjs` sets `build.format: 'file'`, so pages emit as **`dist/services.html`**,
not `dist/services/index.html`. Netlify pretty URLs map `/services` -> `/services.html`,
so links stay extensionless — don't "fix" the links to add `.html`.

`vite.build.cssCodeSplit: false` means a single `dist/assets/style.*.css`.

`Astro.site` is **not** set in `astro.config.mjs`. Canonical URLs come solely from the
hardcoded fallback at `src/layouts/Layout.astro:8`. If you set `site` or change the domain,
canonicals shift — update both places.

## Content is duplicated — change all copies

- **Service data lives in two files with different shapes.** `src/pages/index.astro`
  (short teaser + `href: "/services#<id>"`) and `src/pages/services.astro`
  (long detail + the matching `id`). Adding/renaming a service without touching both
  breaks the homepage anchor links.
- **Service images are resolved by array index**, not by id:
  `/images/leistung${index + 1}.png` in `index.astro:210` and `services.astro:259`.
  Exactly 3 exist (`leistung1-3.png`), so a 4th service silently renders a broken image.
  Add the PNG to `public/images/`.
- **Company data** (Peter-Rosegger-Str. 4, 72762 Reutlingen, `+49 155 60 11 44 42`,
  `contact@cellmove-logistics.com`, owner Christian Gördes) is hardcoded in **five**
  places: `layouts/Layout.astro` (JSON-LD), `components/Header.astro`,
  `components/Footer.astro`, `pages/contact.astro`, `pages/legal.astro`.

## Known broken / unfinished

- **The Inter font 404s on every page.** `Layout.astro:33,62` preloads and declares
  `@font-face` for `/fonts/inter-var.woff2`, but `public/fonts/` is **empty**.
  `@fontsource/inter` is installed and never imported. Text silently falls back to
  `system-ui`. Fix by dropping the woff2 into `public/fonts/`, or by importing
  `@fontsource/inter` and deleting the `@font-face` block.
- **The contact form does not work.** `pages/contact.astro:94` still has the placeholder
  `value="YOUR_ACCESS_KEY_HERE"`. This is a static build with no env plumbing, so the key
  is committed in markup — replace it with the real key from web3forms.com.
- **`pages/legal.astro:24,26`** ship unresolved placeholders `HRB [Nummer]` and
  `DE [USt-IdNr]`. Legally blocking for production (Impressum).
- **`components/PlaceholderImage.astro` is dead code.** It's imported by `index.astro:6`
  and `contact.astro:6` but never rendered — all pages use real `<img>` tags now.
  Don't assume gradient placeholders are live on any page.

## Conventions worth preserving

- **All user-facing text is German** — copy, `alt`, `aria-label`, breadcrumb labels, and
  the JSON-LD. Don't add English strings.
- **Styling is Tailwind utility classes only**, with custom tokens `brand`
  (`#a5d34f` / `brand-dark` / `brand-light`) and `dark` (`900`/`800`/`700`) defined in
  `tailwind.config.cjs`. Global CSS lives in the `<style is:global>` block in
  `Layout.astro` (font-face, `--brand-color`, `:focus-visible`, reduced-motion).
  Content globs in `tailwind.config.cjs` only cover `src/**` — a new top-level directory
  needs to be added there.
- **Every page must render `<Header />`, `<main id="main-content">`, `<Footer />`,
  `<CookieBanner />` inside `<Layout title description>`.** Sections use
  `aria-labelledby` pointing at a heading `id`. The header is `fixed`, so hero sections
  carry `pt-32 lg:pt-40`.
- **Nav is only `/`, `/services`, `/contact`** (`Header.astro` `navItems`). `/legal` is
  deliberately footer-only — don't add it to the header without being asked.
  Anchor ids on the legal page are load-bearing: `#impressum`, `#datenschutz`, `#cookies`
  are linked from the footer and the cookie banner.
- **Contact form has two success paths** that must stay in sync: a `fetch` submit handler
  that intercepts and shows the inline success box (no navigation), plus the hidden
  `redirect` field to `?success=true` for the no-JS fallback. Change the action URL and you
  must update the query-param handler at the top of that script too.
- **FAQ on `/services` uses native `<details>/<summary>`** with `group-open:rotate-180` —
  no JS. `/legal` has no client script at all.
- **Cookie consent** persists in `localStorage` under `cellmove_cookie_consent`
  (`accepted` | `declined` | `essential`) and is only checked client-side, with a 1s
  show delay. Escape writes `essential`. Nothing is gated behind it yet (only a
  `console.log`) — when you add analytics, wire it to the `cookieConsentChanged` event.
  To retest the banner, clear that key or use a fresh origin.

## Deployment

Netlify via `netlify.toml`: `npm run build` -> `publish = "dist"`. Headers are declared
there, not in Astro — security headers on `/*`, plus 1-year `immutable` caching for
`/assets/*`, `/fonts/*`, `/images/*`. `public/images` is ~11 MB of uncompressed PNGs that
get copied verbatim into `dist`; every new image directly ships to users.
