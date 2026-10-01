![Angular](https://img.shields.io/badge/angular-22.2-dd0031)
![Node](https://img.shields.io/badge/node-24-339933)
![pnpm](https://img.shields.io/badge/pnpm-12-f69220)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-in%20development-orange)

# THEMIS Demo Frontend

A simple demonstration frontend that talks to the THEMIS matchmaker backend. THEMIS is the
**THE**sis **M**atching and **I**nformation **S**ystem: it finds thesis supervisors and open
thesis positions at the University of Zurich. This repository is a small Angular GUI that shows
what the backend can do, so a demo no longer has to run through `themis-matcher repl`.

It is a tool for our own testing and for showing the project to others. It is **not** how
students will reach THEMIS.

## Why this exists

The production path does not use this frontend at all. The THEMIS backend
([`backend-core`](https://github.com/MP-Thesis-Matchmaker/RAG-Thesis-Matchmaker)) will be
deployed as a standalone MCP server, and askUZH (UZH's LibreChat-based assistant) will point its
agent at it. askUZH calls the structured `find_researchers` tool and writes the answer to the
student itself.

That leaves a gap while we develop. The REPL can only print text. It cannot show ranked
researchers next to their evidence, compare the structured result with the prose
recommendation, or show what is in the index. This frontend fills that gap, and nothing in
production depends on it.

## Architecture

```
Browser (ng serve :4200)
   │  fetch(environment.matcherOrigin + '/v1/...')      cross-origin, CORS
   ▼
themis-matcher serve  :8100      ← backend-core, FastAPI, MATCHER_CORS_ORIGINS=http://localhost:4200
   │
   ▼
Postgres + pgvector  :5432       ← docker compose up -d postgres
```

**The frontend talks to the matcher's HTTP API, not to the MCP gateway.** The matcher API is
richer: it returns structured JSON and also exposes index status and run history. MCP from a
browser would also need session handling for only two tools. The gateway's
`find_researchers` / `recommend_supervisors` tools are thin wrappers over the same
`/v1/match` and `/v1/recommend` endpoints anyway, so the demo shows the same retrieval that
askUZH gets.

**The backend URL comes from build-time environment files.** There is no proxy; the setup
follows hui-client.
[`src/environments/environment.ts`](src/environments/environment.ts) (local, `http://localhost:8100`)
is swapped for `environment.prod.ts` in the `prod` build configuration via `fileReplacements`.
Services build absolute URLs: `environment.matcherOrigin + '/v1/match'`.

**The matcher has to allow this origin.** Its CORS is opt-in and off by default, because in the
cluster only the gateway calls it, server to server. To use the demo locally, start the matcher
with `MATCHER_CORS_ORIGINS=http://localhost:4200`. Without that, the browser blocks every call.

## Backend endpoints

All of these are defined in
`backend-core/projects/matcher/src/themis_matcher/api/app.py`.

| Method | Path | What it gives the demo |
|---|---|---|
| `GET` | `/v1/health` | Liveness. Needs no database, so it works before anything is indexed. |
| `GET` | `/v1/index/status` | Manifest of the current index. Returns the `index_not_built` error until an index exists. |
| `POST` | `/v1/match` | `{query, top_k}` → ranked researchers with departments, scores, open positions and evidence. What askUZH consumes. |
| `POST` | `/v1/recommend` | Same body → a grounded prose recommendation. |
| `POST` | `/v1/index/publications` | Starts a publication index run. Returns `202` with a receipt, not a result. |
| `POST` | `/v1/index/postings` | Starts a thesis-posting index run. Same `202` receipt. |
| `GET` | `/v1/index/runs` | Recent index runs (`?limit=`, 1–100, default 20). |
| `GET` | `/v1/index/runs/{id}` | One run. Returns `no_such_run` (404) if it does not exist. |

## Quickstart

Needs Node **24** (see [`.nvmrc`](.nvmrc); Angular 22.2 refuses anything older than
`22.22.3`) and **pnpm** through corepack.

**1. Backend**, from a `backend-core` checkout. Its README has the full story:

```
uv sync --all-packages
docker compose up -d postgres         # Postgres + pgvector on localhost:5432
uv run themis-init-db                 # creates the schema
uv run themis-matcher index           # indexes the 50 checked-in samples
MATCHER_CORS_ORIGINS=http://localhost:4200 uv run themis-matcher serve   # HTTP API on :8100
```

Everything above runs offline by default, with hash embeddings, the rule-based parser and
template synthesis. If you want real embeddings and LLM answers in the demo, configure them in
the backend's `.env`; this repo has nothing to configure for that.

**2. Frontend**, from this repository:

```
nvm use                               # picks up .nvmrc → Node 24
corepack enable pnpm                  # once; provides the pnpm version pinned in package.json
pnpm install
pnpm start                            # ng serve on http://localhost:4200 → redirects to /en/home
```

Use pnpm only. `package-lock.json` is gitignored, and `pnpm-workspace.yaml` lists the native
build scripts pnpm is allowed to run (esbuild, lmdb, …).

## Scripts

| Command | What it does |
|---|---|
| `pnpm start` | Dev server on `:4200` (`local` configuration, live reload). |
| `pnpm build` | Production build into `dist/themis-demo` (`prod` configuration). |
| `pnpm build:local` | Unoptimised build with source maps. |
| `pnpm watch` | `build:local` in watch mode. |
| `pnpm test` | Unit tests once, with Vitest (`@angular/build:unit-test`, jsdom). |
| `pnpm lint` | ESLint (angular-eslint) over `src/**/*.{ts,html}`. |

## Layout

The structure follows hui-client, collapsed to one application: what hui keeps in
`projects/shared` lives directly under `src/`.

```
src/
  index.html  main.ts  favicon.ico
  app/
    app.component.*  app.config.ts  app.routes.ts
    transloco.config.ts  transloco-loader.ts
    components/        reusable UI (toolbar: language switch, theme toggle)
    pages/             routed screens, lazy-loaded (home)
    services/          theme, Font Awesome registration, Transloco helpers
    guards/            lang.guard (the /:lang URL segment)
    constants/         languages and other app-wide constants
  assets/i18n/         en.json, de.json
  environments/        environment.ts (local), environment.prod.ts
  styles/              global SCSS: Bootstrap + Material theme (see src/styles/README.md)
  testing/             Vitest setup and Transloco testing helpers
```

## Conventions (from hui-client)

- **Components:** standalone only, no NgModules, no barrel `index.ts`. Files use type suffixes
  (`.component.ts`, `.service.ts`, `.guard.ts`). Selectors and directives use the `themis`
  prefix.
- **DI and state:** `inject()`, not constructor injection; constructors only hold `effect()`
  calls. Signals end in `$$`, observables in `$`. State lives in signals. Routes use lazy
  `loadComponent`.
- **i18n:** Transloco, with kebab-case keys namespaced as `shared.*`, `components.*` and
  `pages.*`. Every route sits under `/:lang` (`en` default, `de`), which `langGuard` validates.
  Switching language rewrites that segment. Add a key to both `en.json` and `de.json`.
- **Icons:** Font Awesome Free. Register every icon in `services/fontawesome.service.ts`, then
  reference it by name (`<fa-icon icon="sun">`).
- **Colours:** use theme tokens (`var(--mat-sys-*)`) and never hard-coded colours, so light and
  dark mode both work. `src/styles/README.md` explains the mechanism.
- **Assets:** runtime asset URLs are bare-relative (`assets/i18n/en.json`, not
  `/assets/...`), so the app survives a non-root `<base href>`.

## Theming

The palette is generated from the lavender accent of the THEMIS banner
(`backend-core/docs/branding/themis-banner.png`). The fonts follow the banner too: Oswald for
headings, Inter for body text, Source Serif 4 italic for taglines, all self-hosted through
`@fontsource`.

Light, dark and "follow the system" are switched with the toolbar button. `ThemeService`
remembers the choice in `localStorage` and sets both the CSS `color-scheme` (Material) and
`data-bs-theme` (Bootstrap). The details are in
[`src/styles/README.md`](src/styles/README.md).

## Planned features

The app is currently a themed shell with a placeholder home page. This is what the demo is
meant to show:

- **Query box** for free text, with a `top_k` control.
- **Ranked researchers** from `/v1/match`, with the evidence behind each suggestion:
  publications, open thesis postings and scores.
- **Prose recommendation** from `/v1/recommend`, shown next to the structured result, so the
  difference between the two tools is visible.
- **Index panel** showing the current status, recent runs, and buttons that start a
  publication or posting index run.
- **Clear error states** for the backend's coded errors (`index_not_built`, matcher
  unreachable) instead of a blank page.

## Related

- [`backend-core`](https://github.com/MP-Thesis-Matchmaker/RAG-Thesis-Matchmaker): the
  THEMIS matchmaking core (ingestion, indexing, retrieval, synthesis, MCP gateway). Mirrored
  to `gitlab.uzh.ch/askuzh/themis`.
- [askUZH](https://www.ai-buddy.uzh.ch/en.html): the UZH assistant that THEMIS plugs into
  as an MCP tool.

THEMIS is a graded master's project, not an official University of Zurich service.

## License

MIT, see [LICENSE](LICENSE).
