![Angular](https://img.shields.io/badge/angular-22.2-dd0031)
![Node](https://img.shields.io/badge/node-24-339933)
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
Browser ──▶ ng serve  :4200
              │  /api/*  (dev-server proxy, prefix stripped)
              ▼
            themis-matcher serve  :8100      ← backend-core, FastAPI
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

**The proxy is required, not a convenience.** The matcher has no CORS middleware, so a browser
on `:4200` calling `:8100` directly is blocked. [`proxy.conf.json`](proxy.conf.json) forwards
`/api/*` to `http://127.0.0.1:8100/*`, which means frontend code calls `/api/v1/match` and the
browser only ever sees one origin. If you run the matcher on another port
(`MATCHER_API_PORT`), change `target` there.

## Backend endpoints

All of these are defined in
`backend-core/projects/matcher/src/themis_matcher/api/app.py`. From the frontend, call them
with an `/api` prefix.

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

Needs Node **24** (see [`.nvmrc`](.nvmrc)). Angular 22.2 requires
`^22.22.3 || ^24.15.0`, and the CLI refuses to start on anything older.

**1. Backend**, from a `backend-core` checkout. Its README has the full story:

```
uv sync --all-packages
docker compose up -d postgres         # Postgres + pgvector on localhost:5432
uv run themis-init-db                 # creates the schema
uv run themis-matcher index           # indexes the 50 checked-in samples
uv run themis-matcher serve           # HTTP API on 127.0.0.1:8100
```

Everything above runs offline by default, with hash embeddings, the rule-based parser and
template synthesis. If you want real embeddings and LLM answers in the demo, configure them in
the backend's `.env`; this repo has nothing to configure for that.

**2. Frontend**, from this repository:

```
nvm use                               # picks up .nvmrc → Node 24
npm ci
npm start                             # ng serve on http://localhost:4200
```

To check the proxy is working: `curl localhost:4200/api/v1/health` should return
`{"status":"ok"}`.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server on `:4200` with live reload and the `/api` proxy. |
| `npm run build` | Production build into `dist/`. |
| `npm run watch` | Development build in watch mode. |
| `npm test` | Unit tests with Vitest (`@angular/build:unit-test`, jsdom). |

New code follows the CLI defaults for Angular 22: standalone components, zoneless change
detection, SCSS. Generate with `npx ng generate component <name>`.

## Planned features

Nothing below exists yet. The app is still the CLI scaffold. This is what the demo is meant to
show:

- **Query box** for free text, with a `top_k` control.
- **Ranked researchers** from `/v1/match`, with the evidence behind each suggestion:
  publications, open thesis postings and scores.
- **Prose recommendation** from `/v1/recommend`, shown next to the structured result, so the
  difference between the two tools is visible.
- **Index panel** showing the current status, recent runs, and buttons that start a
  publication or posting index run.
- **Clear error states** for the backend's coded errors (`index_not_built`, matcher
  unreachable) instead of a blank page.

## Layout

```
src/app/            application code (app.ts, app.config.ts, app.routes.ts)
src/styles.scss     global styles
public/             static assets, copied as-is
proxy.conf.json     dev-server proxy to the matcher API
angular.json        CLI workspace config (serve → proxyConfig)
```

## Related

- [`backend-core`](https://github.com/MP-Thesis-Matchmaker/RAG-Thesis-Matchmaker): the
  THEMIS matchmaking core (ingestion, indexing, retrieval, synthesis, MCP gateway). Mirrored
  to `gitlab.uzh.ch/askuzh/themis`.
- [askUZH](https://www.ai-buddy.uzh.ch/en.html): the UZH assistant that THEMIS plugs into
  as an MCP tool.

THEMIS is a graded master's project, not an official University of Zurich service.

## License

MIT, see [LICENSE](LICENSE).
