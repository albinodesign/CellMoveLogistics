# AGENTS.md — CellMove Logistics Website

Static Astro 4 marketing site (German) for CellMove Logistics GmbH, a dangerous-goods
carrier for lithium-ion batteries. 5 pages, no CMS, no backend, no tests.
Deployed on **Vercel** (build output `dist/`).

## Environment: fix these before anything else

The working copy ships in a **non-runnable** state on macOS. Two independent
breakages, both verified:

1. **`node_modules` may have been installed on Windows and copied here.** It then
   contains only `@rollup/rollup-win32-*` / `@esbuild/win32-x64`, and every build dies
   with `Cannot find module @rollup/rollup-darwin-arm64`.
2. **No file has the execute bit** (everything `-rw-rw-rw-`), so `npm run dev` /
   `npm run build` fail with `node_modules/.bin/astro: Permission denied`.

Recovery (`package-lock.json` already pins the darwin optional deps):

```bash
npm install
chmod +x node_modules/.bin/*
```

Node `^18.17.1 || ^20.3.0 || >=21.0.0` required (Astro 4). No `.nvmrc`, no `engines`
field.

## Never change `build.format` back to `'file'`

`astro.config.mjs` must keep `build.format: 'directory'`. This is the one setting that
silently breaks the entire site:

| `format` | Output | Result on Vercel |
|---|---|---|
| `'file'` | `dist/services.html` | **404 on every page except `/`** |
| `'directory'` | `dist/services/index.html` | 301 → 200, works everywhere |

`astro preview` returns **200 for all pages under BOTH settings** — Astro's own preview
server understands `'file'`. So this bug is completely invisible locally and only appears
after deploy. If pages 404 in production but work under `npm run preview`, check this
setting first.

## Commands

```bash
npm run dev       # http://localhost:4321
npm run build     # -> dist/   (~1s)
npm run preview   # serves dist/ — but see the caveat above, it hides routing bugs
```

No test, lint, format, typecheck, or CI. The only automated verification is
`npm run build` plus a static-server smoke test:

```bash
npm run build && (cd dist && python3 -m http.server 8899) &
for u in / /services /contact /legal /nicht-da; do
  printf "%-14s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -L http://localhost:8899$u)"
done
# expect: / 200, /services /contact /legal 200 (after redirect), /nicht-da 404
```

`astro preview` is *not* a valid routing check — use the static server.

## Build output

```
dist/index.html
dist/services/index.html
dist/contact/index.html
dist/legal/index.html
dist/404.html            <- Vercel serves this for unknown paths; keep it at dist root
dist/assets/             <- hashed CSS/JS/woff2 (astro build.assets: 'assets')
dist/images/             <- verbatim copies of public/images, NOT hashed
```

`vite.build.cssCodeSplit: false` → one `dist/assets/style.*.css`.

`astro.config.mjs` sets `site: 'https://cellmove-logistics.com'`, so `Astro.site` is
populated and canonical URLs derive from config. `src/layouts/Layout.astro` still carries
a hardcoded fallback string — update both when the domain changes.

## Required environment variable

| Variable | Where | Effect if missing |
|---|---|---|
| `PUBLIC_WEB3FORMS_KEY` | Vercel project settings | Contact form posts with an empty `access_key` and silently fails. Build prints a warning. |

Get the free key at https://web3forms.com/. It is read in `pages/contact.astro`
frontmatter via `import.meta.env` and injected into the hidden form field, so it is not
committed to the repo.

## Still unfinished — needs real company data

`src/pages/legal.astro` (`companyData`) ships `HRB [Nummer]` and `DE [USt-IdNr]`. An
Impressum without these is not legally acceptable in Germany. The build prints a warning
but does not fail. Replace before going live.

## Content is duplicated — change all copies

- **Service data lives in two files with different shapes.** `pages/index.astro`
  (short teaser + `href: "/services#<id>"`) and `pages/services.astro`
  (long detail + the matching `id`). Touching one without the other breaks the
  homepage anchor links.
- **Service images resolve by array index**, not by id:
  `/images/leistung${index + 1}.png` in `index.astro` and `services.astro`. Exactly 3
  exist (`leistung1-3.png`), so a 4th service renders a broken image — add the PNG.
- **Company data** (Peter-Rosegger-Str. 4, 72762 Reutlingen, `+49 155 60 11 44 42`,
  `contact@cellmove-logistics.com`, owner Christian Gördes) is hardcoded in **six**
  places: `layouts/Layout.astro` (JSON-LD), `components/Header.astro`,
  `components/Footer.astro`, `pages/contact.astro`, `pages/legal.astro`, `pages/404.astro`.

## Conventions worth preserving

- **All user-facing text is German** — copy, `alt`, `aria-label`, breadcrumbs, JSON-LD.
- **Styling is Tailwind utilities only.** Custom tokens: `brand` (`#a5d34f` /
  `brand-dark` / `brand-light`) and `dark` (`900`/`800`/`700`) in `tailwind.config.cjs`.
  Global CSS lives in the `<style is:global>` block in `Layout.astro`. Tailwind's content
  glob only covers `src/**` — a new top-level directory must be added there.
- **Fonts come from `@fontsource/inter`**, imported as the four static latin weights in
  `Layout.astro` frontmatter (400/500/600/700 — the only weights the site uses). Do not
  reintroduce a manual `@font-face` pointing at `public/fonts/`; that directory is empty
  and every such URL 404s. `@fontsource-variable/inter` is not installed.
- **Every page renders `<Header />`, `<main id="main-content">`, `<Footer />`,
  `<CookieBanner />` inside `<Layout title description>`.** Sections use
  `aria-labelledby` pointing at a heading `id`. The header is `fixed`, so hero sections
  need `pt-32 lg:pt-40`.
- **Header nav is only `/`, `/services`, `/contact`.** `/legal` is deliberately
  footer-only. Legal anchor ids are load-bearing: `#impressum`, `#datenschutz`,
  `#cookies` are linked from the footer and cookie banner.
- **Contact form has two success paths** that must stay in sync: a `fetch` handler that
  intercepts submit and shows an inline success box, plus the hidden `redirect` field to
  `?success=true` for the no-JS fallback. Changing the action URL requires updating the
  query-param handler at the top of that script too.
- **FAQ on `/services` uses native `<details>/<summary>`** with `group-open:rotate-180`,
  no JS. `pages/legal.astro` and `pages/404.astro` have no client script.
- **Cookie consent** persists in `localStorage` under `cellmove_cookie_consent`
  (`accepted` | `declined` | `essential`), checked client-side only, with a 1s show delay.
  Escape writes `essential`. Nothing is gated behind it yet (only a `console.log`) — wire
  future analytics to the `cookieConsentChanged` event. To retest, clear that key.

## Deployment

Vercel. `vercel.json` pins `buildCommand`, `outputDirectory: "dist"`, and all headers —
security headers on `/*` plus cache rules. Keep it in sync when hosting changes.

Cache policy note: `/assets/*` is `immutable` because Astro hashes those filenames, but
`/images/*` is **not** — those are unhashed copies of `public/images`, so `immutable`
would freeze them in browsers for a year on replacement. They use
`max-age=86400, stale-while-revalidate=604800` instead.

`public/images` is ~11 MB of uncompressed PNG copied verbatim into `dist`; every new image
ships straight to users. No `netlify.toml` — an earlier one existed but never applied
anything, since deployment is on Vercel.
