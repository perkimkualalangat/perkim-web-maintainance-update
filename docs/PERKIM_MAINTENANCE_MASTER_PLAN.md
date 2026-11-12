# PERKIM Web Maintenance Dashboard — Master Implementation Plan

**Version:** 2.0 (supersedes `PERKIM_WEB_MAINTENANCE_MIGRATION_PLAN.md`)
**Date:** 12 November 2026
**Dashboard project:** `C:\Users\rafee\Downloads\PERKIM\perkim-web-maintainance-update`
**Managed source of truth:** `C:\Users\rafee\Downloads\PERKIM\perkim-web`
**Audit system:** `C:\Users\rafee\Downloads\PERKIM\perkim-monitor`
**Live site:** `https://perkimkualalangat.github.io/Website-PERKIM/`
**Target machine:** Windows 11, Intel i5-10220U, 8 GB RAM, no GPU

---

## 0. How to read this document

| Section | Purpose |
|---|---|
| 1–4 | What is being built, why, the rules that make it real, and the verified baseline |
| 5 | Architecture and data flow |
| 6 | What is kept, replaced, and removed |
| 7 | Every UI surface mapped to a real data source |
| 8 | Server implementation, endpoint contracts, security |
| 9 | Frontend foundation, routes, state, theme |
| 10 | Page-by-page specification |
| 11 | Operations tabs specification |
| 12 | Design fidelity and micro-interaction specification |
| 13 | Performance budget for the target laptop |
| 14 | Phased task list with exit gates |
| 15 | Proof and verification plan |
| 16 | Rollback, risks, and required inputs |
| 17 | Appendices: file inventory, API examples, NCL → PERKIM mapping |

**Status legend:** `✅ exists and is sound` · `⚠️ exists but needs repair` · `🔴 must be replaced` · `🗑️ must be removed` · `🆕 must be built`

---

## 1. Executive summary

The dashboard is not a reskinned Nvidia Computer Ledger. It is the maintenance console for a real static website.

It must answer four questions at a glance and then act on them:

1. **What is in `perkim-web` right now?** — a live manifest of every managed file, its size, type, hash, and role.
2. **Is it healthy?** — the real validator result plus the real `perkim-monitor` audit, with timestamps.
3. **What changed and is it safe to publish?** — the real Git working-tree diff, backup state, and preflight checks.
4. **Publish and verify.** — commit selected files, push with a PAT, wait for the GitHub Pages run for that exact commit SHA, then verify the live URL.

The existing NCL shell is retained because it is good: Astryx `AppShell`, `SideNav`, `TopNav`, `Page`, `Card`, `Table`, tabs, BM/EN support, light/dark/system, the terminal, the API tester, the log panel, and the server/SSE pattern. The domain layer is replaced entirely. The visual identity becomes PERKIM green and gold while keeping NCL's spacing, density, and interaction language.

**What "done" means, in one sentence:** every number, list, status, and success message in the UI can be traced to a file, a Git command, a monitor JSON file, an NVIDIA response, or an HTTP response — and every mutating action produces a real, reversible change on disk.

---

## 2. Definition of done

The project is accepted only when all of the following are true.

### 2.1 Functional

- [ ] Overview shows the real manifest counts, real Git state, real monitor score, and real live-site latency.
- [ ] Asset Manager lists, filters, opens, edits, creates, uploads, renames, deletes, and restores every managed file type.
- [ ] File Browser navigates the entire project (including vendor, tools, API module, and dev folders) with lazy loading.
- [ ] Monaco-based editor saves UTF-8 text with hash-conflict detection, atomic replace, backup, and undo.
- [ ] Images, PDFs, fonts, and SVGs preview or show metadata without loading a 5 MB original into a table.
- [ ] Content Assistant streams real NVIDIA Nemotron responses, shows a diff, and only writes after explicit user approval.
- [ ] Dependency Map is generated from real HTML/CSS/JS references and opens any node in the editor.
- [ ] Validator runs deterministic checks against the real tree and reports file + line.
- [ ] Operations terminal executes only allow-listed commands in the real project directories.
- [ ] Git Sync shows real `status`, `diff`, ahead/behind, and performs real `fetch`, fast-forward `pull`, explicit-path `commit`, and authenticated `push`.
- [ ] Deploy runs preflight → audit → commit → push → Actions status → live URL verification, with real SSE progress and a persisted deploy log.
- [ ] Logs tab reads real server events, real monitor history, and real deploy records.
- [ ] API Test tab exercises every registered endpoint and shows the real response.
- [ ] Settings persists language/theme locally and displays sanitized server configuration.

### 2.2 Truthfulness

- [ ] No hardcoded statistics, fake progress bars, simulated delays, placeholder success messages, or "demo" rows.
- [ ] The string gate passes: `mockData`, `dummyData`, `fakeData`, `coming soon`, `lorem ipsum`, `TODO: implement` do not exist in shipped `src/` or `server/` code.
- [ ] Every stat card declares its source endpoint or file, visible on hover.
- [ ] A failed action reports the real error and leaves the filesystem unchanged.
- [ ] Deploy never reports "deployed" before the Actions run for the pushed SHA succeeds and the live URL returns 200.

### 2.3 Quality

- [ ] `npm run build` succeeds with no errors.
- [ ] `node --test` passes: path safety, scan categories, validator, hash conflict, backup/restore, Git parsing.
- [ ] `npm run scan` completes in under 5 seconds cold and under 2 seconds warm on the target laptop.
- [ ] Initial dashboard JS loads without Monaco; Monaco is a separate lazy chunk.
- [ ] Keyboard-only operation works for navigation, search, save, and dialogs; focus is always visible.
- [ ] `prefers-reduced-motion` disables non-essential motion.
- [ ] Light, dark, and system modes have readable contrast in all states.

### 2.4 Live proof

- [ ] A real file change is edited in the dashboard, validated, committed, pushed, and observed on the live URL.
- [ ] The pushed commit SHA matches the latest successful `pages build and deployment` run.
- [ ] The deploy log contains the real SHA, timings, Actions conclusion, HTTP status, and final URL.
- [ ] A deliberate broken JSON file is blocked by the validator and never reaches Git.

---

## 3. Verified ground truth (measured, not assumed)

These values were read from the actual projects on 12 November 2026. They are the baseline for implementation and for the first acceptance run.

### 3.1 `perkim-web` inventory

Scope: all files under `perkim-web` excluding `.git/`, `backups/`, `node_modules/`, `.pawprints/`, and `__pycache__/`.

| Group | Count | Details |
|---|---:|---|
| Public + dev HTML | 12 | `index.html` + 9 pages in `pages/` + 2 dev pages in `dev/` |
| JSON data | 11 | 10 in `data/`, 1 in `data/perkim/ringkasan.json` |
| JS modules (non-vendor) | 20 | `js/main.js`, `js/paths.js`, 2 globe scripts, 14 modules, 2 library modules |
| CSS (non-vendor) | 15 | Entry `css/style.css` imports 13 files + variables |
| Assets | 43 | 8 images, 15 PDFs, 15 covers, 4 fonts, 1 SVG icon |
| Programs | 26 | 2 real programs × 8 files, `_template` 1, `README.md`, 8 system references |
| API module | 14 | `web-api-module/**` |
| Tools | 11 | Python maintenance scripts + `serve.mjs` |
| Root config | 4 | `.gitignore`, `.nojekyll`, `README.md`, `start.bat` |
| Vendor / dev / legacy / other | 16 | `js/vendor` 6, `dev` 3, old ascii-globe folder 3, `database_lokasi` 2, `css/vendor` 1, `data/*.md` 1 |
| **Total managed files** | **172** | Excludes generated, backup, and ignored folders |

Known real content sizes:

- `assets/img` = 8 files, ~5.5 MB
- `assets/books` = 30 files, ~24.1 MB
- `assets/fonts` = 4 files, ~346 KB
- `data/aktiviti.json` = 2 activity records
- `data/berita.json` = 17 news records
- `data/books.json` = 5 groups, 14 books
- `assets/books` contains 15 PDFs: the 14 listed in `books.json` plus an unlisted `panduan-draf.pdf` → a real orphan/consistency finding for the validator
- `data/search-index.json` = 30 entries
- `data/perkim.json` = 13 top-level sections
- `data/site.json` = organisation, contact, social, links, announcement, status
- `data/motion.json` = version, tokens, 35 component rules
- Program images use uppercase `.JPG` — relevant for GitHub Pages case sensitivity.

### 3.2 Git and live site

| Item | Verified value |
|---|---|
| Branch | `main` |
| Local HEAD | `bf990ff5e669fa1c210135e7ed09ba0b9f45fd03` |
| Remote `main` (`git ls-remote`) | `bf990ff5e669fa1c210135e7ed09ba0b9f45fd03` |
| Latest commit | `Tambah banner AJK PERKIM di halaman utama` |
| Working tree | Clean except untracked `.pawprints/`, `assets/img/logo-perkim-kuala-langat.jpg`, `assets/img/logo-perkim-kuala-langat.png` |
| Remote | `https://github.com/perkimkualalangat/Website-PERKIM.git` |
| Dashboard repo | `https://github.com/perkimkualalangat/perkim-web-maintainance-update.git`, branch `main`, initial plan commit `aeb9fca`, fix commit `1951bd4` |
| Live URL | `https://perkimkualalangat.github.io/Website-PERKIM/` |
| Live response | HTTP 200, ~415 ms, 17,225 bytes |
| Live title | `PERKIM Kuala Langat — laman draf` |
| Draft policy | `<meta name="robots" content="noindex, nofollow">` |
| Latest Pages workflow | `pages build and deployment`, success, SHA `bf990ff`, 24 s |
| Pages API endpoint | `GET /repos/.../pages` returns 404 — do not depend on it |
| Actions API | Public and readable without a token; use a token for higher rate limits |

**Important:** local and remote `main` are currently equal. An earlier belief that the branch was four commits ahead is stale; the local tracking ref just needs `git fetch`. The dashboard must always compute ahead/behind from a fresh fetch, never from a cached assumption.

### 3.3 `perkim-monitor` baseline

| Item | Verified value |
|---|---|
| Last audit | `2026-11-12T14:34:59Z` |
| Score | 97 / 100 |
| Checks | 38 total: 32 pass, 4 warn, 0 fail, 2 unknown |
| Pages audited | 9 |
| Programs | 2 |
| Books | 14 |
| Duration | 12–21 s |
| History | 7 runs, all score 97 |
| Categories | links/assets .18, data/program .14, R2 .08, SEO .13, accessibility .13, performance .13, deploy .10, security .06, technical .05 |
| npm scripts | `audit`, `audit:full` (Lighthouse), `serve` on 8082 |
| Output files | `data/status.json`, `data/history.json`, `data/uptime.json`, `data/db/*.json` |

Known warnings to surface, not hide:

- `static.seo`, `live.seo` — canonical/Open Graph incomplete.
- `static.large_images` — at least one image above the 500 KB threshold.
- `static.temp_files` — temporary files present in the site.
- `deploy.pages` — unknown because the Pages API returns 404.
- `lighthouse.run` — unknown because Lighthouse has not run.

These become real, clickable findings in the dashboard. They are not averaged away.

### 3.4 Environment

| Item | Value |
|---|---|
| Node | v24.18.0 |
| npm | 12.0.2 |
| Git | 2.55.0.windows.2 |
| Server | raw `node:http`, port 5174 |
| Frontend | Vite 8, port 5173, proxy `/api` and `/api/events` |
| AI | NVIDIA cloud only, `nvidia/nemotron-3-ultra-550b-a55b` |
| AI key | **missing** — `.env.local` still has the placeholder |
| Git PAT | configured in ignored `.env.local`; scopes `repo, workflow`; not committed |
| Local inference | none — correct for the 8 GB laptop |

---

## 4. Non-negotiable principles

### 4.1 One source of truth

```
perkim-web files  →  Git working tree  →  GitHub remote  →  GitHub Pages live
        ↑                    ↑                  ↑                  ↑
     editor            git status/diff      push + SHA        Actions + HTTP
```

The dashboard reads and writes the real files. It never keeps a second editable copy that can drift. Derived artifacts (manifest, graph, thumbnails, backups) live in the dashboard project under `data/`, `.maintenance/`, and `public/` as explicitly labeled derivatives.

### 4.2 No fake data, no fake progress

| Forbidden | Required replacement |
|---|---|
| Hardcoded `StatCard` values | Value from a typed API payload |
| Timed progress bar | SSE event from the real process |
| "Deployed successfully" toast | Actions run conclusion + live 200 check |
| Sample file rows | `scan` output from the real tree |
| Fake AI typing | Real streamed deltas, or a disabled state with setup instructions |
| Silent catch that shows empty success | Error object with endpoint, status, and message |
| Auto-advancing wizard | Step completes only when the server emits a result |

### 4.3 Reversibility

Every write, move, delete, upload, and restore:

1. validates the path and extension;
2. stores a timestamped backup of the previous bytes;
3. writes atomically (same-directory temp file + rename);
4. returns the new hash;
5. emits an SSE event;
6. keeps the operation in an append-only operation log.

Git is the second safety net. Backups are the first, because they cover untracked files too.

### 4.4 Honest capability boundaries

- Nemotron is a **text** model. It cannot see image pixels. "Alt text" is generated from filename, caption, surrounding Markdown, and page context, and must be reviewed. No vision claims.
- The validator is a fast local gate. `perkim-monitor` remains the authoritative 38-check audit. The UI labels them distinctly.
- GitHub Pages API is unavailable (404). Deploy verification uses the Actions runs API plus the live URL.
- If the NVIDIA key or PAT is missing, the related feature is disabled with exact setup instructions — never simulated.

### 4.5 Design fidelity

Keep NCL's structure, spacing, typography scale, table density, side navigation behaviour, top bar, cards, tabs, and command surfaces. Change only:

- brand color tokens (PERKIM green/gold);
- navigation labels and icons;
- page content and data;
- the operations workflow.

No new component library. No CSS framework. No layout rewrite.

---

## 5. Architecture

### 5.1 Runtime topology

```
┌──────────────────────────────────────────────────────────────────┐
│ Browser — http://127.0.0.1:5173                                  │
│ React 19 · Astryx · HashRouter · DataContext · EventSource        │
│  ├─ pages: Overview / Assets / Files / Assistant / Map / Ops      │
│  └─ lazy chunks: Monaco, dependency map, operations tabs          │
└───────────────────────────────┬──────────────────────────────────┘
                                │ /api/*  (Vite proxy)
┌───────────────────────────────▼──────────────────────────────────┐
│ Node server — http://127.0.0.1:5174                              │
│  ├─ router + auth + JSON/body limits + SSE hub                    │
│  ├─ file-ops  (read/write/move/upload/raw/thumb/backup/restore)  │
│  ├─ scan      (manifest + per-category JSON)                      │
│  ├─ git-ops   (status/diff/fetch/pull/commit/push/revert)         │
│  ├─ deploy    (preflight/audit/commit/push/Actions/live verify)   │
│  ├─ validator (JSON/links/imports/case/alt/draft/R2)              │
│  ├─ deps      (HTML/CSS/JS graph)                                 │
│  ├─ watcher   (chokidar → SSE)                                    │
│  └─ AI proxy  (NVIDIA cloud; key never reaches browser)            │
└───────┬───────────────────────┬───────────────────────┬───────────┘
        │ fs + git              │ child process         │ HTTPS
┌───────▼──────────┐   ┌────────▼───────────┐   ┌───────▼────────────┐
│ perkim-web        │   │ perkim-monitor      │   │ NVIDIA + GitHub    │
│ source of truth   │   │ audit CLI + data    │   │ + live Pages URL   │
└───────────────────┘   └─────────────────────┘   └────────────────────┘
```

### 5.2 Processes

| Process | Command | Port | Required |
|---|---|---|---:|
| Vite dev server | `npm run dev` | 5173 | dev |
| API server | `npm run server` | 5174 | yes |
| Both | `npm run dev:all` | — | normal use |
| Monitor dashboard | `cd ../perkim-monitor && npm run serve` | 8082 | optional |
| Static site preview | `cd ../perkim-web && python tools/serve.mjs` or `npx serve` | 3000 | optional |

### 5.3 Request flow

1. The browser calls a relative `/api/*` URL. Vite proxies to `127.0.0.1:5174`.
2. Mutating requests carry `X-Dev-Token`, compared with `DEV_API_TOKEN` using a timing-safe comparison.
3. The server validates method, content type, body size, token, and path before touching disk.
4. Long-running operations (`scan`, `audit`, `deploy`) open an SSE response and emit real stage events, output lines, and a final result.
5. The file watcher broadcasts `file-changed`; the client refreshes the affected query, not the whole app.
6. All results include `generatedAt` and `source` so the UI can display provenance.

### 5.4 Why not keep the old "sync" concept

The old plan described a bi-directional sync between a dashboard copy and `perkim-web`. That would create two editable copies and invites silent divergence. The dashboard edits `perkim-web` in place, so the real sync operation is **Git synchronization**:

- working tree ↔ `HEAD` (diff, backup, restore);
- local `main` ↔ `origin/main` (fetch, ahead/behind, fast-forward pull);
- commit → push → Pages.

The `/api/sync/*` file-mirror endpoints will be removed or aliased to the Git implementation. There will be exactly one editable tree.

---

## 6. What is kept, replaced, and removed

### 6.1 Keep from NCL

| Asset | Path | Use |
|---|---|---|
| Astryx design system | `package.json`, `src/main.jsx` | Shell, theme, components |
| App shell + nav + top bar | `src/App.jsx` | Reuse structure, replace labels/routes |
| Page primitives | `src/components/Page.jsx` | All pages |
| Stat card | `src/components/StatCard.jsx` | Extend with `source` and `trend` |
| Settings context | `src/context/AppSettings.jsx` | BM/EN, light/dark/system |
| i18n core | `src/assets/js/core/i18n.js` | Extend dictionaries |
| AI client + SSE | `src/lib/ai.js` | Adapt context and modes |
| Toast viewport | `src/main.jsx` | Real action feedback |
| Dev components | `LogPanel`, `JsonViewer`, `CommandInput` | Terminal, API test, logs |
| Dev hooks | `useTerminal`, `useDevApi`, `useAiTester` | Operations and AI test |
| Terminal tab | `src/pages/dev/tabs/TerminalTab.jsx` | Adapt to PERKIM commands |
| API tester tab | `src/pages/dev/tabs/ApiTesterTab.jsx` | Adapt endpoint presets |
| Config tab | `src/pages/dev/tabs/ConfigTab.jsx` | Sanitized config display |
| Server pattern | `server/server.mjs`, `server/env.mjs` | Routing, auth, SSE |

### 6.2 Replace

| NCL area | Replacement |
|---|---|
| `ENTITY_TYPES` (17 research entities) | `ASSET_GROUPS` (10 real groups + total) |
| `/data/*.json` research files | Delete; load `/api/scan/results` |
| `DashboardPage` | `OverviewPage` |
| `EntityPage`, `CatalogPage` | `AssetManagerPage`, `FileBrowserPage` |
| `MatrixPage`, `GapsPage` | `DependencyMapPage`, `ValidatorTab` |
| `AiPage` | `ContentAssistantPage` |
| `PrinciplesPage`, `CasesPage`, `TopicsPage` | Delete |
| `ImportExportPage` | Delete; import = upload, export = download/raw |
| `schema.js` research schema | `src/lib/asset-schema.js` |
| NCL AI prompts | PERKIM maintenance prompts |
| `sync-engine.mjs` mirror semantics | `git-ops.mjs` Git synchronization |
| `deploy.mjs` orchestrator | Rewritten with preflight, PAT, Actions, live proof |

### 6.3 Remove

- `src/pages/{GapsPage,PrinciplesPage,CasesPage,TopicsPage,MatrixPage,CatalogPage,CatalogEntityPage,ImportExportPage,DashboardPage,AiPage,DevPage}.jsx`
- `src/components/EntityPage.jsx`
- `src/assets/js/core/schema.js` and `.d.ts`
- `data/*.json` — all 17 NCL files, replaced by scan outputs
- `server/checks.d.ts`
- `tests/at2.mjs` — replaced by `tests/*.test.mjs` and `tests/smoke.mjs`
- `dist/` — rebuilt from the new source
- NCL MCP references — already removed, keep removed
- `express`, `zod` if unused after the rewrite; keep `sharp`, `diff`, `chokidar`, Monaco, esbuild
- NCL README and `start.bat` — rewritten for PERKIM

### 6.4 Current defects found in the scaffold (must fix before UI work)

| # | File | Defect | Fix |
|---:|---|---|---|
| 1 | `server/scan.mjs` | `scanCategory` existed but was not exported; the bottom `export { runFullScan }` duplicated an inline export and made the module a SyntaxError | Exported `scanCategory`; removed the duplicate export. **Fixed in `aeb9fca`** |
| 2 | `server/server.mjs` line ~741 | Dynamically imports `scanCategory`; it now resolves, but the duplicate scan logic remains | Import the real function; delete the duplicate `runFullScanWithProgress` logic |
| 3 | `server/deploy.mjs` | Sync step is a `TODO` but reports `completed` | Remove the fake step; deploy starts from the real Git state |
| 4 | `server/deploy.mjs` | `git add -A`, generic message, push without auth, no preflight | Explicit paths, user message, PAT, fetch/behind checks, audit gate |
| 5 | `server/deploy.mjs` | `npm run audit --dry-run` is a weak prerequisite check | Verify the script and monitor directory; run a bounded audit only on request |
| 6 | `server/server.mjs` | Multipart parser buffers the whole file and splits binary as a string | Replace with streamed raw-body upload + metadata headers |
| 7 | `server/server.mjs` | No binary/raw endpoint, so previews are impossible | Add `/api/files/raw` and `/api/files/thumb` with Range support |
| 8 | `server/config.mjs` | Dev token is generated but PAT and GitHub fields are absent | Add `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`, author identity |
| 9 | `server/ai-prompts.mjs` | NCL research prompts and modes | Rewrite for maintenance modes |
| 10 | `src/astryx-themes.js` | Generated neutral theme only | Keep generated file; layer PERKIM token overrides |
| 11 | `src/context/DataContext.jsx` | Fetches `/data/<entity>.json` | Fetch `/api/status`, `/api/scan/results`, `/api/git/status`, `/api/deploy/results` |
| 12 | `src/App.jsx`, `routes.js`, `entities.js` | NCL routes and entity names | Replace with PERKIM routes and asset groups |
| 13 | `data/` | 17 NCL JSON files | Delete after scan produces PERKIM manifests |
| 14 | `README.md`, `start.bat` | NCL instructions | Rewrite for PERKIM |
| 15 | `.env.local` | NVIDIA key is still the placeholder; PAT is now configured | Add a real `nvapi-` key; keep the PAT in the ignored `.env.local` only |
| 16 | `server/deploy.mjs`, `server/sync-engine.mjs` | Duplicate bottom exports made both modules SyntaxErrors | Removed duplicate exports. **Fixed in `aeb9fca`** |
| 17 | `src/pages/dev/hooks/useDevApi.js`, `src/pages/dev/DevPage.jsx` | Read `import.meta.env.DEV_API_TOKEN` / `ENABLE_DEV_PAGE`, which Vite never exposes | Use `VITE_DEV_API_TOKEN` / `VITE_ENABLE_DEV_PAGE`; added both to `.env.local`. **Fixed in `1951bd4`** |
| 18 | `server/deploy.mjs` | `runGitDeploy` ignores command exit codes, so a failed push can be reported as success; `shell: true` is used | Check every exit code; use `shell: false`; verify remote SHA |
| 19 | `server/server.mjs` | CORS headers are emitted, but a disallowed `Origin` is not rejected | Enforce an Origin allow-list before dispatch, in addition to the dev token |

---

## 7. Real data source map

Every UI element is listed with its only permitted source. If a source is unavailable, the element shows an error/empty state — never a fallback number.

### 7.1 Overview

| UI element | Real source |
|---|---|
| Total managed files | `/api/scan/results` → `summary.totalFiles` |
| Counts per group | same → `summary.byCategory` |
| Last scan time, duration | same → `scannedAt`, `durationMs` |
| Git branch, dirty count, ahead/behind | `/api/git/status` (`git status --porcelain=v2 --branch`) |
| Latest commit | `/api/git/log?limit=1` |
| Monitor score, pass/warn/fail, timestamp | `/api/deploy/results` → reads `perkim-monitor/data/status.json` |
| Live status and latency | `/api/live/status` → real HTTP request with `cache: no-store` |
| AI availability | `/api/ai/status` → key presence + model + endpoint |
| Recent changes | `/api/git/status` entries with mtime and size |
| Quick actions | Real POSTs: scan, validate, audit, commit, deploy |

### 7.2 Asset Manager

| UI element | Real source |
|---|---|
| Group tabs and counts | `scan` manifest categories |
| File rows | category `files[]` with path, bytes, mtime, extension, parse status, metadata |
| Search/filter/sort | client-side over the manifest; result count shown live |
| Preview | `/api/files/raw` or `/api/files/thumb` |
| Edit | `/api/files/read` → Monaco → `/api/files/write` |
| Create | `/api/files/write` with `createOnly: true` |
| Upload | `/api/files/upload` |
| Rename/move | `/api/files/move` |
| Delete | `/api/files/delete` (backup first) |
| Restore | `/api/files/backups` + `/api/files/restore` |

### 7.3 File Browser

| UI element | Real source |
|---|---|
| Tree nodes | `/api/files/tree?path=<relative>` — one directory per request |
| File metadata | `/api/files/stat` |
| Content | `/api/files/read` or `/api/files/raw` |
| Context actions | write/move/delete/upload endpoints |
| Live changes | SSE `file-changed` |
| Hidden/ignored | server marks `.git`, `backups`, `node_modules`, `.pawprints` as ignored; browser can show them with a warning |

### 7.4 Content Assistant

| UI element | Real source |
|---|---|
| File context | `/api/files/read` (truncated safely) |
| Manifest context | `/api/scan/results` summary |
| Monitor findings | `/api/deploy/results` checks |
| Model + key status | `/api/ai/status` |
| Response | `/api/ai/chat` SSE, real Nemotron |
| Proposed diff | client-side `diff` or Monaco DiffEditor |
| Apply | `/api/files/write` with `expectedHash` |

### 7.5 Dependency Map

| UI element | Real source |
|---|---|
| Nodes/edges | `/api/deps/graph`, generated by parsing real files |
| File size/type | manifest |
| Unresolved references | graph `unresolved[]` with source file and line |
| Orphans | graph `orphans[]` |
| Click to open | `/api/files/read` |

### 7.6 Operations

| Tab | Real source |
|---|---|
| Terminal | `/api/dev/exec` allow-listed process output |
| Git Sync | `/api/git/*` |
| Deploy | `/api/deploy/*` + `data/deploy-log.jsonl` |
| Validator | `/api/validator/run` |
| Logs | server ring buffer, monitor `history.json`, deploy log |
| Config | `/api/config` sanitized |
| API Test | `/api/dev/exec`? No — direct `fetch` to selected endpoints with token |

### 7.7 Settings

| UI element | Real source |
|---|---|
| Language/theme | localStorage + `AppSettings` |
| Paths | `/api/config` values resolved at startup |
| Key presence | booleans only, never the key |
| Versions | server reads `package.json`, Node, Git, monitor package |
| Monitor URL | `http://127.0.0.1:8082` from config |

---

## 8. Server implementation

### 8.1 Configuration (`server/config.mjs`)

Add and validate:

```env
PERKIM_WEB_PATH=../perkim-web
PERKIM_MONITOR_PATH=../perkim-monitor
NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
DEV_API_TOKEN=
GITHUB_TOKEN=
GITHUB_REPO=perkimkualalangat/Website-PERKIM
GITHUB_BRANCH=main
GIT_AUTHOR_NAME=PERKIM Maintenance
GIT_AUTHOR_EMAIL=maintenance@perkimkualalangat.local
LIVE_URL=https://perkimkualalangat.github.io/Website-PERKIM/
PORT=5174
HOST=127.0.0.1
```

Rules:

- Resolve and `realpath` both project paths at startup; fail fast if missing.
- Refuse to start if `PERKIM_WEB_PATH` is inside the dashboard project or vice versa.
- `config.public` exposes only sanitized values. Keys never serialize.
- `hasValidNvidiaKey` checks the `nvapi-` prefix and rejects the placeholder.
- `hasGitToken` checks non-empty; never logs the value.
- Limits: text read 2 MB, write 2 MB, upload 25 MB (configurable), JSON body 4 MB, SSE heartbeat 25 s.
- Editable extensions: `html, htm, css, js, mjs, cjs, json, md, txt, py, bat, cmd, yml, yaml, svg, xml, webmanifest, gitignore, nojekyll`.
- Binary preview: `png, jpg, jpeg, webp, gif, avif, ico, pdf, woff, woff2, ttf, otf`.
- Always denied: `.env*`, `*.pem`, `*.key`, `.git/**`, `node_modules/**`, `backups/**`, `.pawprints/**`.

### 8.2 File operations (`server/file-ops.mjs`)

Keep the existing path-safe core and add:

| Function | Contract |
|---|---|
| `resolveSafePath(rel, root)` | Normalize slashes, reject absolute, `..`, drive letters, NUL; verify `realpath` stays under root; reject symlink escape |
| `listDir(rel, root)` | Names, type, size, mtime, extension, `ignored` flag; no recursion |
| `readText(rel, root)` | UTF-8 with BOM detection; reject NUL bytes; return `{content, hash, encoding, eol, bytes, mtime}` |
| `readRaw(rel, root, range)` | Stream with content type, ETag, `Accept-Ranges`, 206 support |
| `writeText(rel, content, opts)` | `expectedHash`, `createOnly`, `backup`, atomic temp+rename, preserve EOL, return new hash |
| `deletePath(rel, root)` | Backup then unlink; refuse non-empty directory unless recursive flag + confirmation |
| `movePath(src, dest, root)` | Case-only rename support on Windows; refuse overwrite unless explicit |
| `uploadRaw(relDir, filename, stream, meta)` | Stream to temp with size limit, validate magic bytes, optional image optimization, atomic rename |
| `thumbnail(rel, width)` | `sharp` resize, cache under `.maintenance/thumbs/<sha>-<w>.webp`, return path |
| `backupFile(rel)` | Copy to `.maintenance/backups/<ISO>/<rel>` + append `backups.jsonl` |
| `restoreBackup(id)` | Verify backup, write atomically, return new hash |
| `getStat(rel)` | Size, mtime, hash (on demand), binary flag, image dimensions, PDF header, line count |
| `scanManifest(root, rel)` | Recursive manifest with ignore rules, cached hashes |

Safety details:

- **Atomic write:** temp file in the same directory, `writeFile`, `fsync`, `rename`. On Windows, rename over an existing file can fail; use `fs.rm` after backup or `rename` with retry.
- **Hash conflict:** `expectedHash` mismatch returns HTTP 409 with `{currentHash, mtime, changedExternally: true}`. The editor then shows "File changed on disk" with Reload / Diff / Overwrite.
- **Encoding:** detect UTF-8 BOM; preserve it. Reject UTF-16 for editing to avoid silent corruption.
- **Line endings:** detect dominant EOL; preserve on save unless the user runs "Format".
- **Large files:** text > 2 MB is read-only with a download action. Images > 5 MB are never embedded in a table; thumbnails only.
- **Backups:** retention 50 versions per path or 30 days, whichever is larger; never inside `perkim-web`.
- **Operation log:** `.maintenance/operations.jsonl` with timestamp, action, path, bytes, hash, token-authenticated actor label.

### 8.3 Scan (`server/scan.mjs`)

Refactor into pure, testable functions:

```js
export const ASSET_GROUPS = {
  pages:      { label: 'Halaman',       root: null,  match: (rel) => rel.endsWith('.html') },
  data:       { label: 'Data JSON',     root: 'data', match: (rel) => rel.endsWith('.json') },
  modules:    { label: 'Modul JS',      root: 'js',   match: (rel) => /\.(m?js)$/.test(rel) && !rel.startsWith('js/vendor/') },
  styles:     { label: 'Gaya CSS',      root: 'css',  match: (rel) => rel.endsWith('.css') && !rel.startsWith('css/vendor/') },
  media:      { label: 'Media',         root: 'assets', match: (rel) => /\.(png|jpe?g|webp|gif|avif|svg|pdf|woff2?|ttf|otf)$/i.test(rel) },
  programs:   { label: 'Program',       root: 'program', match: () => true },
  api:        { label: 'API Module',    root: 'web-api-module', match: () => true },
  tools:      { label: 'Alat',          root: 'tools', match: () => true },
  config:     { label: 'Konfigurasi',   root: null, match: (rel) => !rel.includes('/') },
  other:      { label: 'Lain-lain',     root: null, match: () => true },
};
```

Every discovered file is assigned exactly one group by first match, so totals reconcile.

Per-file metadata:

```json
{
  "path": "pages/aktiviti.html",
  "group": "pages",
  "bytes": 3154,
  "mtime": "2026-11-04T08:54:00.000Z",
  "ext": ".html",
  "kind": "text",
  "readable": true,
  "title": "Aktiviti Cawangan | PERKIM Kuala Langat (draf)",
  "description": "...",
  "draft": true,
  "features": { "h1": 1, "images": 4, "scripts": ["../js/main.js"], "styles": ["../css/style.css"] }
}
```

Scan deliverables:

- `data/manifest.json` — full, versioned manifest.
- `data/<group>.json` — per-group arrays for fast UI reads.
- `data/deps.json` — dependency graph.
- `data/scan-cache.json` — hash/mtime cache for warm scans.
- `data/validation.json` — last validator result.
- `data/deploy-log.jsonl` — append-only deploy records.

Performance:

- Hash only text files and only when the cache misses.
- Use `sharp.metadata()` for image dimensions; cache by mtime+size.
- Do not recurse into ignored folders.
- Target: < 2 s warm, < 5 s cold.
- Abort scan if a directory read fails, but report the path instead of returning partial success silently.

### 8.4 Git operations (`server/git-ops.mjs`, new)

All commands run with `cwd = perkimWeb`, `shell: false`, `windowsHide: true`, and a timeout (30 s for reads, 120 s for push).

| Function | Command / behavior |
|---|---|
| `status()` | `git status --porcelain=v2 --branch`; parse branch, ahead, behind, staged, unstaged, untracked, ignored |
| `diff(path, staged)` | `git diff --no-color --unified=3 -- <path>` or `--cached` |
| `log(limit)` | `git log -n <limit> --pretty=format:%H%x09%h%x09%an%x09%aI%x09%s` |
| `fetch()` | `git fetch --prune origin` |
| `pullFfOnly()` | `git merge --ff-only origin/<branch>`; refuse if diverged |
| `commit(paths, message)` | Verify paths are inside repo; `git add -- <paths>`; `git commit -m <message>`; return SHA |
| `push()` | Verify branch, commit, remote; inject auth header via env; `git push origin HEAD:<branch>`; verify with `git ls-remote` |
| `revert(sha)` | `git revert --no-edit <sha>`; never `reset --hard` |
| `remoteHead()` | `git ls-remote origin refs/heads/<branch>` |

Push authentication (no token in argv or `.git/config`):

```js
const auth = Buffer.from(`x-access-token:${config.github.token}`).toString('base64');
const env = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
  GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${auth}`,
};
spawn('git', ['push', 'origin', `HEAD:${branch}`], { cwd, env });
```

Guards:

- Refuse commit if there are no selected paths.
- Refuse commit of `.env`, keys, `.pawprints/**`, `backups/**`, `node_modules/**`.
- Refuse push if `behind > 0`, if the branch is not `main`, or if the token is missing.
- Warn for untracked binaries > 5 MB; require an explicit checkbox.
- Never run `git add -A`.
- Serialize git/deploy operations with an in-process mutex and a lock file.

### 8.5 Deploy (`server/deploy.mjs`, rewrite)

State machine, each transition emitted as SSE `{stage, status, message, at, detail}`:

```
idle → preflight → audit (optional) → ready → committing → pushing
     → actions_pending → actions_success → live_verifying → live_ok
     ↘ failed (with stage, command, stderr, exitCode)
```

Preflight checks:

1. `perkim-web` exists and is a Git repo on `main`.
2. `git fetch` succeeds; `behind === 0`; divergence handled by "Pull first".
3. Selected files exist and are not denied paths.
4. Validator has no `error` findings (warnings allowed with confirmation).
5. Commit message is non-empty (default: `chore: kemas kini dari papan pemuka PERKIM`).
6. PAT present; remote reachable; branch is `main`.
7. No deploy lock held.

Audit gate:

- Optional `npm run audit` in `perkim-monitor` (not `audit:full`) with a 120 s timeout.
- Parse `data/status.json`; block only if the audit exits non-zero or has `fail` checks.
- Display the real score and warnings. Do not block on pre-existing warnings such as `static.seo`.
- `audit:full` is available as a separate button because Lighthouse can be slow on the target laptop.

Commit and push:

- Commit only the selected paths.
- Capture the short and full SHA.
- Push with the header auth described above.
- Confirm remote `refs/heads/main` equals the new SHA via `git ls-remote`.

Actions verification:

- Poll `https://api.github.com/repos/<repo>/actions/runs?head_sha=<sha>&per_page=10` every 5 s, up to 5 minutes.
- Find a `pages build and deployment` run for the exact SHA.
- Report `queued`, `in_progress`, `completed/success`, `completed/failure`.
- Use the PAT when present; unauthenticated fallback works for the public repo.

Live verification:

- Poll `LIVE_URL` with a cache-buster and `cache: no-store` every 5 s, up to 3 minutes.
- Require HTTP 200 and the `<title>` of the local `index.html` (or a page selected for verification).
- Record final status, latency, bytes, title, and timestamp.
- Only then emit `live_ok`.

Persistence:

```json
{
  "id": "20261112T143000Z-bf990ff",
  "startedAt": "...",
  "finishedAt": "...",
  "commit": "abc1234",
  "files": ["pages/aktiviti.html"],
  "audit": { "score": 97, "warn": 4 },
  "actions": { "runId": 123, "conclusion": "success" },
  "live": { "status": 200, "ms": 415, "title": "..." },
  "result": "success"
}
```

Written to `data/deploy-log.jsonl`. Never overwrite history.

### 8.6 Validator (`server/validator.mjs`, new; `checks.mjs` remains the quick system check)

Deterministic checks, all against real files:

| ID | Check | Severity |
|---|---|---|
| `json.parse` | Every JSON file parses | error |
| `json.shape` | `site.json`, `books.json`, `aktiviti.json`, `berita.json`, `sitemap.json`, `motion.json` have required keys/types | error |
| `html.links` | Local `href`/`src` resolve, with exact case | error |
| `html.ids` | No duplicate `id` per page | error |
| `html.title` | `<title>` present and non-empty | error |
| `html.description` | Meta description present | warn |
| `html.h1` | Exactly one `<h1>` | warn |
| `html.alt` | Every `<img>` has `alt` | error |
| `html.lang` | `<html lang="ms">` | warn |
| `html.viewport` | Viewport meta present | error |
| `css.imports` | Every `@import` resolves | error |
| `css.urls` | Every `url()` resolves or is remote/data | error |
| `js.imports` | Relative imports resolve (try exact, `.js`, `/index.js`) | error |
| `draft.noindex` | Draft site pages use `noindex, nofollow` | error |
| `draft.banner` | Draft pages show the draft notice | warn |
| `case.paths` | Referenced path case matches directory entry exactly | error |
| `assets.orphans` | Assets unreferenced by any page/CSS/JS/data | info |
| `files.temp` | `Thumbs.db`, `*.tmp`, `*~`, `.DS_Store` | warn |
| `files.empty` | Zero-byte files that are not intentional | warn |
| `r2.head` | R2 PDF/cover URLs return 200 (optional toggle) | error |
| `security.secrets` | No `nvapi-`, `ghp_`, private keys, PAT patterns | error |
| `program.schema` | Program folder has `caption.md` + `laporan.md` + images | warn |

Each finding:

```json
{
  "id": "html.links",
  "status": "fail",
  "severity": "error",
  "file": "pages/aktiviti.html",
  "line": 42,
  "message": "Rujukan tidak dijumpai: ../assets/img/aktiviti.jpg",
  "hint": "Betulkan laluan atau muat naik fail."
}
```

Runtime target: < 5 s without R2; R2 is concurrent (max 4) and cached for 10 minutes.

### 8.7 Dependency graph (`server/deps.mjs`, new)

Parse rules:

| Source | Extracted edges |
|---|---|
| HTML | `<link href>`, `<script src>`, `<img src/srcset>`, `<source src>`, `<a href>` to local pages, `<iframe src>` |
| CSS | `@import`, `url()` |
| JS | `import ... from`, `import(...)`, `fetch('...json')`, literal `data/...` paths |
| JSON | Image/PDF URLs in `books.json`, program captions, site assets |

Output:

```json
{
  "generatedAt": "...",
  "nodes": [{ "id": "css/style.css", "type": "css", "bytes": 524 }],
  "edges": [{ "from": "index.html", "to": "css/style.css", "kind": "stylesheet", "line": 12, "resolved": true }],
  "unresolved": [{ "from": "pages/berita.html", "to": "../js/foo.js", "line": 88 }],
  "orphans": ["js/vendor/pdfjs/pdf.min.mjs"],
  "cycles": []
}
```

The graph is regenerated on scan and after file changes (debounced 1 s). The UI uses a deterministic layered layout, not a physics simulation, to stay smooth on integrated graphics.

### 8.8 Watcher and SSE (`server/watcher.mjs` + existing SSE hub)

- `chokidar.watch(perkimWeb, { ignoreInitial: true, ignored: ['.git/**','backups/**','node_modules/**','.pawprints/**','**/*.tmp'], awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 } })`.
- Debounce per path 250 ms.
- Broadcast `file-changed` with `{path, action, mtime, bytes}`.
- Broadcast `scan-ready`, `audit-ready`, `deploy-stage`, `deploy-done`, `server-log`.
- Heartbeat `: ping` every 25 s; clean up on `req.close`.
- Watch `perkim-monitor/data/status.json` and `history.json` for `audit-ready`.
- On startup, send `connected` with server version, paths, and timestamp.
- SSE endpoint requires no dev token (read-only), but CORS/origin is restricted to the local dashboard.

### 8.9 AI proxy (`server/ai-prompts.mjs`, `nvidia-client.mjs`, `validation.mjs`)

Modes:

| Mode | System instruction | Temperature |
|---|---|---:|
| `general` | Helpful PERKIM maintenance assistant; answer from supplied context | 0.4 |
| `explain` | Explain the selected file's role, inputs, outputs, and risks | 0.2 |
| `improve` | Propose a minimal patch; preserve Malay copy and existing style | 0.2 |
| `translate` | Translate BM ↔ EN without changing HTML/JSON syntax | 0.2 |
| `summarize` | Summarize a report/caption into 3–6 bullet points | 0.3 |
| `seo` | Suggest title and meta description within length limits | 0.3 |
| `caption` | Write a caption from the supplied program text and filename | 0.4 |
| `check` | Review content against the validator checklist | 0.1 |

Rules:

- Build context from the selected file only plus a manifest summary and at most 8 monitor findings.
- Redact `nvapi-`, `ghp_`, `github_pat_`, private key blocks, and `.env` values.
- Truncate to 60,000 characters; state clearly when truncated.
- Never include secrets in the prompt.
- The model cannot write files. The client receives text and computes a diff.
- If the key is missing, `/api/ai/chat` returns 503 with `{code: 'AI_NOT_CONFIGURED', setup: [...]}`; the UI renders setup steps.
- Abort the upstream request when the browser disconnects.
- Timeouts: 180 s; max tokens 4096; validate messages, roles, and mode.

### 8.10 Endpoint contract

Existing endpoints marked ✅ keep their paths. New endpoints are 🆕.

| Method | Path | Auth | Purpose |
|---|---|---|:--|
| GET | `/api/health` | — | Server liveness, version, uptime |
| GET | `/api/status` | — | Paths, key presence, versions, watcher state |
| GET | `/api/models` | — | Model list/static metadata |
| GET | `/api/ai/status` | — | Key/model availability |
| POST | `/api/ai/check` | token | Real minimal NVIDIA request |
| POST | `/api/ai/chat` | token | SSE stream |
| GET | `/api/files/tree` | — | One directory level |
| GET | `/api/files/read` | — | Text content + hash |
| GET | `/api/files/raw` 🆕 | — | Binary stream, Range |
| GET | `/api/files/thumb` 🆕 | — | Cached image thumbnail |
| GET | `/api/files/stat` 🆕 | — | Detailed metadata |
| POST | `/api/files/write` | token | Create/update with hash guard |
| POST | `/api/files/mkdir` 🆕 | token | Create directory |
| POST | `/api/files/delete` | token | Backup + delete |
| POST | `/api/files/move` | token | Move/rename |
| POST | `/api/files/upload` | token | Streamed upload |
| GET | `/api/files/hash` | — | SHA-256 |
| GET | `/api/files/backups` 🆕 | — | Backup list for path |
| POST | `/api/files/restore` 🆕 | token | Restore backup |
| GET | `/api/files/manifest` | — | Ad-hoc manifest for a subtree |
| POST | `/api/scan/run` | token | SSE scan |
| GET | `/api/scan/results` | — | Last manifest |
| GET | `/api/validator/run` 🆕 | — | Validator results (optional `?r2=1`) |
| GET | `/api/deps/graph` 🆕 | — | Dependency graph |
| GET | `/api/git/status` 🆕 | — | Real Git status |
| GET | `/api/git/diff` 🆕 | — | Real diff |
| GET | `/api/git/log` 🆕 | — | Commit history |
| POST | `/api/git/fetch` 🆕 | token | Fetch remote |
| POST | `/api/git/pull` 🆕 | token | Fast-forward only |
| POST | `/api/git/commit` 🆕 | token | Explicit paths + message |
| POST | `/api/git/push` 🆕 | token | Authenticated push |
| POST | `/api/git/revert` 🆕 | token | Safe revert |
| GET | `/api/deploy/validate` | — | Preflight report |
| POST | `/api/deploy/audit` | token | Run monitor audit (SSE optional) |
| POST | `/api/deploy/run` | token | Full deploy state machine (SSE) |
| GET | `/api/deploy/results` | — | Monitor status + last deploy |
| GET | `/api/live/status` 🆕 | — | Live URL check |
| GET | `/api/logs` 🆕 | — | Server/deploy/audit logs |
| GET | `/api/config` 🆕 | — | Sanitized config |
| GET | `/api/events` | — | SSE |
| GET | `/api/dev/env` | token | Dev environment |
| POST | `/api/dev/exec` | token | Allow-listed command |

Response envelope convention:

```json
{ "ok": true, "data": {}, "source": "/api/scan/results", "generatedAt": "..." }
```

Errors:

```json
{ "ok": false, "error": { "code": "HASH_CONFLICT", "message": "...", "detail": {} } }
```

HTTP status codes: 400 validation, 401 token, 403 path/policy, 404 missing, 409 conflict, 413 too large, 415 type, 500 internal, 503 AI/deploy unavailable.

### 8.11 Command allow-list (`/api/dev/exec`)

The terminal is useful but dangerous. Replace free-form shell with structured presets plus a narrow raw allow-list.

Allowed presets:

```text
git status --porcelain=v2 --branch
git diff --stat
git log -n 20 --oneline
node --version
npm --version
npm run scan
npm run validate
npm run build
cd ../perkim-monitor && npm run audit
cd ../perkim-monitor && npm run audit:full
cd ../perkim-monitor && npm run serve
```

Raw input validation:

- Reject `;`, `&&`, `||`, `|`, `>`, `<`, backticks, `$()`, newlines.
- Reject `rm`, `del`, `format`, `shutdown`, `reg`, `powershell`, `cmd /c`, `curl`, `Invoke-WebRequest`.
- Allow only the first token from an explicit binary list, and only approved argument patterns.
- Run with `shell: false`, a 120 s timeout, and a kill tree on timeout.
- Stream stdout/stderr as SSE lines, capped at 2 MB per run.
- Record every command in the operation log.

If a workflow is common, add a dedicated endpoint instead of a terminal command (scan, validate, git, deploy).

### 8.12 Security model

| Risk | Mitigation |
|---|---|
| Path traversal / symlink escape | Resolve + `realpath`, prefix check with separator, reject symlinks |
| Arbitrary command execution | Presets + allow-list + `shell:false` |
| Token leakage | Keys only in server env; sanitized config; redaction in logs and AI context |
| CSRF/DNS rebinding | Bind `127.0.0.1`; validate `Origin`/`Host`; require dev token on writes |
| Large upload DoS | Stream + size limit + timeout + temp cleanup |
| Malicious SVG/HTML preview | Serve raw with `Content-Security-Policy: sandbox`; use `<img>` not inline HTML |
| Git mistakes | Explicit paths, fetch/behind checks, backups, revert not reset |
| Secret commit | Validator + Git path deny-list + pre-commit display of diffs |
| Race with external edits | Hash guard + watcher notification |
| Loss of work | Backup before every mutation + operation log |

---

## 9. Frontend foundation

### 9.1 Theme

Keep the generated neutral theme import, then override brand tokens in `src/styles.css` (or a dedicated `src/perkim-tokens.css` imported after the theme CSS):

```css
:root {
  --color-accent: light-dark(#1f7a34, #57b96a);
  --color-accent-muted: light-dark(#dfeee1, #24402a);
  --color-text-accent: light-dark(#166028, #7ed08d);
  --color-icon-accent: light-dark(#1f7a34, #7ed08d);
  --color-background-body: light-dark(#f5f7f3, #0f1511);
  --color-background-card: light-dark(#ffffff, #151b16);
  --color-background-surface: light-dark(#ffffff, #151b16);
  --color-background-muted: light-dark(#eef2ec, #1b241d);
  --color-text-primary: light-dark(#1d2433, #eef3ee);
  --color-text-secondary: light-dark(#5a6478, #a9b6ac);
  --color-border: light-dark(#dfe4ee, #2a352c);
  --color-border-emphasized: light-dark(#c7d2c4, #3b4a3e);
  --perkim-focus: #28903b;
  --radius-container: 12px;
  --radius-element: 8px;
}
```

Gold `#f2d600` is reserved for:

- draft/warning accents,
- the "draft" badge,
- selected highlight in the dependency map,
- never body text on white (contrast).

Typography stays NCL's Figtree for UI and its code font for code. This preserves the dashboard's established look. The site's own Merriweather/Inter choices are previewed only inside the site preview, not applied to the dashboard chrome.

### 9.2 Routes

| Route | Page | Lazy |
|---|---|:--:|
| `/` | Overview | no |
| `/assets/:group?` | Asset Manager | no |
| `/files` | File Browser | no |
| `/assistant` | Content Assistant | yes |
| `/map` | Dependency Map | yes |
| `/operations/:tab?` | Operations | tabs lazy |
| `/settings` | Settings | no |
| `*` | NotFound | no |

HashRouter stays, because the server serves a static SPA and GitHub-style deep links are not needed.

### 9.3 Navigation

```
PEMANTAUAN
  Ringkasan
KANDUNGAN
  Pengurus Aset        [count badge]
  Penjelajah Fail
  Penulis AI           [AI status dot]
  Peta Kebergantungan
OPERASI
  Operasi              [dirty badge]
  Tetapan
```

Top bar:

- Product title: `PERKIM Web Maintenance`
- Environment pill: `Local · 127.0.0.1`
- Live status dot + latency
- Branch + dirty indicator
- Language selector (BM/EN)
- Theme selector (light/dark/system)
- Command palette trigger (`Ctrl/Cmd+K`) for file search and actions

### 9.4 State and data fetching

`DataContext` responsibilities:

- `status`, `manifest`, `git`, `deploy`, `live`, `aiStatus`, `config`
- `refresh(name)` with in-flight deduplication
- SSE subscription and targeted invalidation
- global `lastError` and `isStale`
- no polling faster than 10 s; overview refresh every 30 s while visible

Rules:

- Never optimistically mark a write/deploy as successful.
- Show skeleton only on first load; subsequent refreshes keep stale data visible with a small "updating" indicator.
- Every fetch has an `AbortController` and a 30 s timeout (long operations excluded).
- Errors preserve the previous good data and display a retry action.

### 9.5 API client

`src/lib/api.js`:

```js
api.get(path, { signal })
api.post(path, body, { token: true })
api.stream(path, body, { onEvent })
api.upload(path, file, { onProgress })
api.rawUrl(path)
```

- Prefix `/api`.
- Add `X-Dev-Token` for mutations from `import.meta.env.VITE_DEV_API_TOKEN` (dev only) or a token entered in Settings and stored in `sessionStorage` (never localStorage).
- Normalize errors to `{code, message, status, detail}`.
- Parse SSE frames with `\n\n`, ignore comments, handle `error` and `done`.

### 9.6 Internationalization

Extend `src/assets/js/core/i18n.js` with a complete PERKIM dictionary in BM and EN. Rules:

- No mixed-language buttons.
- File/system terms stay technical (`Git`, `commit`, `push`, `JSON`).
- Every new key exists in both languages.
- A development check logs missing keys once.

### 9.7 Accessibility

- Semantic landmarks: `nav`, `main`, `header`.
- One `h1` per page.
- Focus ring 2 px `#28903b`, offset 2 px.
- All icon buttons have `aria-label`.
- Dialogs trap focus and restore it.
- Tables use proper `<th scope="col">`.
- Status is not conveyed by color alone; use icon + text.
- `prefers-reduced-motion` respected globally.

---

## 10. Page specifications

### 10.1 Overview (`/`)

**Purpose:** a truthful snapshot and the entry point to action.

Layout:

1. Header: "Ringkasan" + last scan time + `Imbas Semula` button.
2. Four stat cards: managed files, Git changes, monitor score, live latency. Each card shows a `source` caption on hover.
3. Two-column body:
   - left: "Kesihatan Laman" — monitor score, category bars, pass/warn/fail counts, top 5 findings.
   - right: "Perubahan Terkini" — Git status list with file path, status, mtime; click opens the file/diff.
4. Bottom: "Tindakan Pantas" — Scan, Validate, Audit, Git Sync, Deploy (disabled with reason when prerequisites fail).
5. A small provenance strip: `Sumber: /api/scan/results · /api/git/status · perkim-monitor/data/status.json · live URL`.

States:

- First load: skeleton cards.
- Scan missing: empty state "Belum ada manifest" + Scan button.
- Monitor missing: "Audit belum dijalankan" + Run audit.
- Live unreachable: red status with the real error and last success time.
- Dirty tree: amber banner with count and link to Git Sync.

No animated counters. Values appear directly. A subtle 160 ms fade is allowed on first paint only.

### 10.2 Asset Manager (`/assets/:group?`)

**Purpose:** the main CRUD surface for content.

Layout:

- Group tabs with counts: Halaman, Data JSON, Modul JS, Gaya CSS, Media, Program, API, Alat, Konfigurasi, Lain-lain.
- Toolbar: search, extension filter, sort (name/size/modified), view density, `Fail Baharu`, `Muat Naik`.
- Table columns: name/path, type, size, modified, status (valid/invalid/draft), actions.
- Row click opens the editor drawer; hover reveals preview, copy path, history.
- Footer: showing X of Y real files.

Editor drawer:

- Header: path, hash short, mtime, dirty dot.
- Tabs: Edit, Preview, Metadata, History.
- Monaco for text; image/PDF preview for binary; metadata table for fonts/PDFs.
- Sticky footer: Save (`Ctrl+S`), Format, Revert, Close.
- Save disabled when clean. Conflict banner on 409.
- On save: validate JSON before sending; show server validation errors inline.

Create/upload:

- Create dialog: directory, filename, type, initial content; rejects existing path.
- Upload zone: drag/drop, multi-file queue, per-file progress from real `xhr.upload`, destination selector, image-optimize toggle, JSON validation, PDF magic-byte check.
- Never silently overwrite; on conflict ask Rename / Replace (with backup) / Skip.

Delete:

- Typed confirmation of the filename.
- Shows whether the file is tracked by Git.
- Deletes with backup; toast includes "Buka Sejarah" to restore.

Empty/error:

- Group with zero files: empty state with the real directory path.
- Read error: show status code and retry, not an empty table.

### 10.3 File Browser (`/files`)

**Purpose:** complete access to the repository, including folders not in the curated groups.

Layout:

- Left: lazy tree (folders first, then files), search, "show ignored" toggle.
- Right: breadcrumb, directory table, preview panel.
- Double-click file → editor drawer; single click → preview/metadata.
- Context menu: open, edit, copy path, move, delete, download, reveal in Asset Manager.
- Keyboard: arrows navigate, Enter opens, `Ctrl+F` filters.
- Ignored folders (`.git`, `backups`, `node_modules`) are hidden by default and marked with a warning when shown.
- Large folders paginate at 200 entries with a "show more" button.

### 10.4 Content Assistant (`/assistant`)

**Purpose:** AI-assisted editing with human approval.

Layout (three panes on desktop, stacked on narrow):

1. File picker + mode selector + context toggles (include manifest summary, include monitor findings, include current file).
2. Chat stream with markdown; code blocks have Copy and "Use as proposal".
3. Proposal panel: Monaco DiffEditor (original vs proposed) + Apply / Discard.

Behavior:

- AI disabled state when no key: exact steps to add `NVIDIA_API_KEY` to `.env.local` and restart.
- The assistant cannot write without Apply.
- Apply uses `expectedHash`; on conflict, re-diff.
- Token/character usage shown from the response metadata.
- Stop button aborts the stream.
- Conversation is local to the session; no fake persistence.

### 10.5 Dependency Map (`/map`)

**Purpose:** understand what breaks before editing.

- Filter chips by node type (pages, CSS, JS, JSON, media, programs).
- Layered layout: pages → styles/scripts → modules → data → media.
- Edges colored by kind; dashed for unresolved.
- Click node: side panel with path, size, inbound/outbound links, open button.
- Toggle: show orphans, show only unresolved.
- Search highlights matches and dims others.
- Zoom/pan with transform only; no physics.
- Summary strip: nodes, edges, unresolved, orphans, cycles.
- Empty state if the graph has not been generated; real "Generate" action.

### 10.6 Settings (`/settings`)

- Appearance: language, theme mode.
- Connection: API base (fixed), dev token status, NVIDIA key status, PAT status.
- Paths: `perkim-web`, `perkim-monitor`, live URL, branch.
- Versions: dashboard, Node, Git, monitor.
- Behavior: confirm destructive actions, default upload optimization, backup retention.
- Diagnostics: copy sanitized config, open API health, download logs.

No editable secrets in the browser. A "How to configure" disclosure shows the exact `.env.local` keys.

---

## 11. Operations tabs

### 11.1 Terminal

- Preset buttons: `git status`, `git diff --stat`, `git log`, `scan`, `validate`, `build`, monitor audit, monitor serve.
- Command input with history (session), allow-list validation, and a clear warning.
- Output panel with ANSI-safe text, timestamps, exit code, duration, and "copy".
- Stop button kills the process tree.
- Never auto-runs a command on tab open.

### 11.2 Git Sync

- Header: branch, ahead/behind, last fetch time, remote URL, PAT status.
- Buttons: Fetch, Pull (fast-forward), Refresh.
- Working tree table: path, status (M/A/D/?/R), staged, size, mtime; checkbox selection.
- Diff viewer for the selected file (unified or Monaco diff).
- Commit box: message, selected count, "Commit selected".
- Push box: shows commit(s) to push, target branch, "Push".
- Divergence state: explain exactly why pull is required; no destructive merge.
- Revert: select a commit, `git revert`, show new SHA.
- All actions refresh status from the server after completion.

### 11.3 Deploy

- Prerequisite checklist with real status and fix links: repo, branch, sync state, validator, PAT, monitor.
- Options: run monitor audit before commit (default on), run full Lighthouse after deploy (default off).
- File selection summary and commit message.
- Stepper: Preflight → Validate → Audit → Commit → Push → Actions → Live.
- Each step shows start/end, real output, and status.
- Failure shows the exact command, exit code, stderr tail, and a retry from the failed step (without repeating a successful push).
- Result panel: SHA, Actions run URL, live URL, HTTP status, latency.
- History table from `deploy-log.jsonl`.

### 11.4 Validator

- Run button with R2 toggle.
- Summary: errors, warnings, info, duration.
- Filters by severity/category/file.
- Finding row: message, file:line, hint, "Open".
- Group by file view.
- Compare with the monitor: link to the last audit and its 38 checks; explain that they are different scopes.

### 11.5 Logs

- Sources: Server (ring buffer), Deploy (`deploy-log.jsonl`), Audit (`history.json`), Operations (`operations.jsonl`).
- Filter by level/source/time; search.
- Download as `.log` / `.json`.
- Live tail toggle via SSE.
- Clear only the server ring buffer, never audit/deploy history.

### 11.6 Config

- Sanitized table of every config value with source (`env`/`default`/`derived`).
- Key presence badges, never values.
- Resolved absolute paths.
- Effective limits and allow-list.
- "Copy diagnostic bundle" button.

### 11.7 API Test

- Endpoint preset list grouped by domain.
- Method, path, query, JSON body editor.
- Send with dev token where required.
- Response: status, time, size, headers, pretty JSON.
- SSE endpoints open a live event panel.
- History of the last 20 requests (session only).

---

## 12. Design fidelity and micro-interactions

### 12.1 Motion tokens (from the site's real `motion.css`)

| Token | Value | Use |
|---|---|---|
| instant | 90 ms | press, checkbox, toggle |
| fast | 160 ms | hover color, border, underline |
| base | 240 ms | card, drawer, dialog, tab panel |
| slow | 380 ms | full-page section entrance (rare) |
| ease-out | `cubic-bezier(0.22, 1, 0.36, 1)` | entrances, drawers |
| ease-in-out | `cubic-bezier(0.4, 0, 0.2, 1)` | layout shifts |
| press | `cubic-bezier(0.34, 1.4, 0.64, 1)` | button press scale |

Global rules:

- Animate only `transform` and `opacity`; color/border transitions are allowed because they do not trigger layout.
- One motion per action. No bouncing cards, no looping decorative animation.
- `@media (prefers-reduced-motion: reduce)` sets all durations to `0.01ms` and disables transforms.
- Page entrance: 240 ms opacity + 6 px translate, once per navigation. No stagger on data refreshes.
- Tables never animate on refresh; only rows that actually changed may flash a 600 ms background tint.

### 12.2 Deliberate micro-interactions

| Action | Feedback |
|---|---|
| Hover row | background tint 160 ms; action icons fade in 120 ms |
| Press button | scale 0.97 for 90 ms, then release |
| Save | idle → spinner → check + "Disimpan" for 1.5 s → idle; dirty dot disappears only after server hash returns |
| Save conflict | amber banner slides in 240 ms; editor does not discard local text |
| Upload drag-over | dashed border turns green, background tint, 1.01 scale; drop returns to rest |
| Upload progress | real per-file progress bar; queued files show "menunggu" |
| Scan | button becomes "Mengimbas…" with indeterminate progress driven by SSE stages; no fake percentage |
| Deploy stepper | each step ticks only on a real SSE stage; connector line fills 240 ms |
| Live status | dot pulses only while connected/checking; static green when healthy |
| Toast | slide/fade 240 ms, max 3 stacked, auto-dismiss 4 s except errors |
| Copy path | icon swaps to check for 1.2 s |
| Filter | result count updates immediately; list crossfades 120 ms |
| Tab switch | underline moves 160 ms; panel fades 120 ms |
| Dialog | backdrop fades 160 ms; panel scale 0.98→1 + fade 240 ms |
| Terminal new output | auto-scroll if at bottom; otherwise show "Lompat ke bawah" pill |
| File changed externally | amber dot + toast; editor shows Reload / Diff |
| Destructive confirm | button disabled until the exact filename is typed; no shake animation |
| Empty state | static illustration/icon; no looping animation |
| Skeleton | 1.4 s shimmer, only on first load |

### 12.3 Visual fidelity checklist

- Same `AppShell` proportions and side nav width as NCL.
- Same `Page` padding and section spacing.
- Same table density and header treatment.
- Same card radius/shadow rhythm, adjusted to PERKIM green tint.
- Same top bar height and control placement.
- BM labels match the site's vocabulary (`Halaman`, `Aktiviti`, `Program`, `Sorotan`, `Draf`).
- The dashboard never impersonates the public site; it is clearly a maintenance console. Site previews are framed and labeled.

---

## 13. Performance budget (i5-10220U, 8 GB, no GPU)

| Area | Budget | Enforcement |
|---|---|---|
| Initial JS (gzip) | < 600 KB | Vite chunk report; Monaco excluded |
| Monaco chunk | lazy only | `React.lazy` + dynamic import |
| Operations tabs | lazy per tab | route-level split |
| Dependency map | < 150 nodes rendered without jank | layered SVG, no physics |
| Scan cold | < 5 s | cache + ignore rules |
| Scan warm | < 2 s | mtime/size cache |
| Validator | < 5 s (no R2) | concurrency cap |
| API status refresh | ≥ 10 s, paused when tab hidden | visibility API |
| SSE | one connection | shared provider |
| Thumbnails | ≤ 40 KB each, 160 px | sharp cache |
| Table rows | ≤ 200 per page | pagination |
| Editor | text ≤ 2 MB | server limit |
| Build | < 60 s | esbuild/Vite defaults |
| Memory | < 500 MB server RSS | watcher ignores + no file buffering |

Additional rules:

- No `moment`, `lodash`, chart, or graph libraries. Use native APIs and SVG.
- No base64 images in JS bundles.
- No full-manifest re-fetch on every keystroke; debounce search.
- Use `startTransition` for filtering long lists.
- Avoid re-rendering the whole page on SSE; update only the affected query key.

---

## 14. Phased implementation plan

Each phase ends with a gate. Do not start the next phase until the gate passes.

### Phase 0 — Guardrails and baseline (½ session)

Tasks:

- [ ] Add `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`, author identity, `LIVE_URL` to `.env.local.example` and `.env.local`.
- [ ] Obtain a real NVIDIA `nvapi-` key and a GitHub fine-grained PAT (Contents: read/write for `Website-PERKIM`).
- [ ] Record the baseline: `git rev-parse HEAD`, `git ls-remote`, live HTTP status, monitor score.
- [ ] Delete NCL pages, NCL data files, stale tests, stale docs.
- [ ] Add `.maintenance/` to the dashboard `.gitignore` (backups, thumbnails, logs).
- [ ] Initialize Git in the dashboard project (optional but recommended) so implementation itself is reversible.
- [ ] Create `data/` placeholder with a README explaining that all JSON there is generated.

Gate:

- `npm run dev:all` starts both processes.
- `/api/health` returns 200.
- `git ls-remote` and live URL match the recorded baseline.

### Phase 1 — Server truth layer

Tasks:

- [ ] Fix `scan.mjs`: implement `scanCategory`, export `ASSET_GROUPS`, assign each file exactly once, persist manifest + per-group files + cache.
- [ ] Remove the duplicate scan logic in `server.mjs`.
- [ ] Harden `file-ops.mjs`: atomic writes, hash guard, BOM/EOL, raw stream, thumbnails, backups, restore, stat.
- [ ] Replace multipart upload with streamed raw upload + magic-byte validation.
- [ ] Add `git-ops.mjs` with status/diff/log/fetch/pull/commit/push/revert.
- [ ] Rewrite `deploy.mjs` as the state machine in §8.5; delete the fake sync step and `git add -A`.
- [ ] Add `validator.mjs` and `deps.mjs`.
- [ ] Add `watcher.mjs` and wire SSE events.
- [ ] Rewrite `ai-prompts.mjs` and update `validation.mjs`.
- [ ] Extend `config.mjs` with PAT/GitHub/live settings and sanitized public config.
- [ ] Add `/api/files/raw`, `/thumb`, `/stat`, `/backups`, `/restore`, `/mkdir`, `/api/git/*`, `/api/validator/run`, `/api/deps/graph`, `/api/live/status`, `/api/logs`, `/api/config`.
- [ ] Remove or alias `/api/sync/*` to Git semantics.

Gate:

- `npm run scan` produces a manifest whose total equals 172 (or the current real count) and whose group counts match the baseline.
- `curl /api/scan/results` returns the same totals.
- Write → read → hash → backup → restore round-trip passes on a temp file.
- `git status` endpoint matches `git status --porcelain=v2 --branch`.
- Validator runs in < 5 s and reports the real known warnings.
- No server crash when scan hits the previously broken `styles` branch.

### Phase 2 — Server contract tests

Tasks:

- [ ] `tests/paths.test.mjs`: traversal, absolute path, symlink, case, reserved names.
- [ ] `tests/scan.test.mjs`: real tree counts, group reconciliation, cache warm/cold.
- [ ] `tests/files.test.mjs`: write/read/hash/backup/restore/conflict; BOM/EOL.
- [ ] `tests/validator.test.mjs`: broken JSON, broken link, case mismatch, duplicate id.
- [ ] `tests/git.test.mjs`: status parsing, ahead/behind, path selection, denied paths.
- [ ] `tests/smoke.mjs`: boot server on a random port, hit every GET endpoint, assert envelope and real counts.
- [ ] `npm test` runs all of them.

Gate:

- All tests pass.
- No test writes to `perkim-web` without a temp copy or explicit cleanup.
- A deliberately broken file is rejected and the original bytes remain unchanged.

### Phase 3 — Frontend foundation

Tasks:

- [ ] Replace `entities.js` with `ASSET_GROUPS` labels/icons/colors.
- [ ] Replace `routes.js` with PERKIM routes and helpers.
- [ ] Rewrite `DataContext.jsx` for API + SSE + refresh dedupe.
- [ ] Add `lib/api.js`, `lib/file-api.js`, `hooks/useSse.js`, `hooks/useAsync.js`, `hooks/useDebouncedValue.js`.
- [ ] Add PERKIM token overrides in CSS; keep the neutral theme.
- [ ] Rewrite `App.jsx` navigation and routes.
- [ ] Extend i18n dictionaries.
- [ ] Add `StatCard` `source` and `status` props.
- [ ] Add error boundary and NotFound.

Gate:

- All routes render with real empty states when the server is off.
- No NCL labels or routes remain.
- Theme passes contrast in light/dark.
- `npm run build` succeeds.

### Phase 4 — Overview, Asset Manager, File Browser, Editor

Tasks:

- [ ] `OverviewPage` with real stats, monitor findings, git changes, live status.
- [ ] `AssetManagerPage` with group tabs, filters, sorting, table, empty/error states.
- [ ] `CodeEditor` lazy Monaco wrapper with language detection, dirty state, `Ctrl+S`, conflict handling.
- [ ] `FileBrowserPage` lazy tree + breadcrumb + context menu.
- [ ] `PreviewPane` for images, PDFs, fonts, JSON, Markdown.
- [ ] `UploadZone` with real progress, validation, conflict policy.
- [ ] `HistoryDrawer` for backups/restore.
- [ ] `ConfirmDeleteDialog` with typed filename.

Gate:

- Edit a real JSON file, save, reload, confirm bytes and hash.
- Open a 24 MB PDF from `assets/books` without freezing the table.
- Upload a real image, see a thumbnail, validate and revert.
- Kill the server mid-save; original file is intact.

### Phase 5 — Content Assistant

Tasks:

- [ ] Rewrite AI client context builder.
- [ ] Build the three-pane assistant UI.
- [ ] Add modes, stop, token usage, error/setup states.
- [ ] Add DiffEditor proposal and Apply with hash guard.
- [ ] Add redaction tests for keys and `.env` content.

Gate:

- With a real key, a real streamed response appears.
- Without a key, the disabled state appears and no request is made.
- Apply changes the file only after confirmation.
- Secrets never appear in the request payload (inspect in DevTools).

### Phase 6 — Dependency Map and Validator

Tasks:

- [ ] Build `deps.mjs` parsing and graph cache.
- [ ] Build the layered SVG map with filters and side panel.
- [ ] Build the validator page with filters and open-in-editor.
- [ ] Link findings to the editor at the correct line.
- [ ] Add R2 check toggle with timeout/caching.

Gate:

- Graph contains the known edges: `index.html → css/style.css`, `index.html → js/main.js`, `css/style.css → 14 imports`, `js/main.js → 14 modules`.
- Known monitor warnings appear as real validator findings where applicable.
- Clicking an unresolved edge opens the source file.

### Phase 7 — Operations

Tasks:

- [ ] `OperationsPage` with lazy tabs and URL state.
- [ ] Adapt `TerminalTab` to presets + allow-list.
- [ ] `GitSyncTab` with status/diff/commit/push/revert.
- [ ] `DeployTab` with stepper, SSE, preflight, history.
- [ ] `LogsTab` with real sources and live tail.
- [ ] `ConfigTab` sanitized.
- [ ] `ApiTesterTab` presets for all endpoints.
- [ ] `ValidatorTab` shared with §11.4.

Gate:

- Terminal runs `git status` and shows the real output.
- Git Sync commits a real temp change and shows the SHA.
- Deploy dry-run reaches the preflight result without pushing.
- Deploy real run (after user approval) pushes and verifies live.
- Logs show the deploy record.

### Phase 8 — Design polish and accessibility

Tasks:

- [ ] Apply the motion table in §12.2.
- [ ] Add skeletons, empty states, and error states everywhere.
- [ ] Add keyboard shortcuts and focus management.
- [ ] Add reduced-motion support.
- [ ] Verify contrast in both themes.
- [ ] Add page transition and row-change tint.
- [ ] Add command palette (`Ctrl/Cmd+K`).

Gate:

- Keyboard-only walkthrough of every page.
- No layout shift on refresh.
- No animation longer than 380 ms except skeleton shimmer.
- Reduced-motion mode has no transforms.

### Phase 9 — End-to-end proof

Tasks:

- [ ] Run the full acceptance matrix in §15.
- [ ] Fix every failure; rerun from a clean state.
- [ ] Capture evidence: command output, API JSON, screenshots, deploy log.
- [ ] Confirm the live site still renders after the test commit (or revert the test commit).

Gate:

- All §15 checks pass.
- Evidence is stored in `docs/evidence/` with timestamps.

### Phase 10 — Documentation and handover

Tasks:

- [ ] Rewrite `README.md`: setup, keys, scripts, architecture, safety, troubleshooting.
- [ ] Rewrite `start.bat`: checks Node, `.env.local`, starts `dev:all`, opens the browser.
- [ ] Document the PAT creation steps and the exact scopes.
- [ ] Document backup retention and restore.
- [ ] Document the difference between validator and monitor.
- [ ] Remove stale NCL docs and generated `dist/`.

Gate:

- A fresh clone + `.env.local` + `npm install` + `npm run dev:all` works.
- No dead links in the README.
- No NCL terminology remains in UI or docs.

---

## 15. Proof and verification plan

### 15.1 Automated proof

| Test | Command | Expected real result |
|---|---|---|
| Path safety | `node --test tests/paths.test.mjs` | All traversal/symlink cases rejected |
| Scan reconciliation | `node --test tests/scan.test.mjs` | Group counts sum to total; known files present |
| File round-trip | `node --test tests/files.test.mjs` | Hash stable, backup restorable, conflict 409 |
| Validator | `node --test tests/validator.test.mjs` | Broken fixtures flagged; clean fixtures pass |
| Git parsing | `node --test tests/git.test.mjs` | Branch/ahead/behind match real repo |
| Smoke | `node tests/smoke.mjs` | Every GET endpoint returns its envelope |
| Build | `npm run build` | Exit 0, chunks reported |
| No fake data | `rg -n "mockData|dummyData|fakeData|coming soon|lorem ipsum|TODO: implement" src server` | No matches |
| No secrets | `rg -n "nvapi-[A-Za-z0-9]|ghp_|github_pat_" src server` | No matches |
| Theme doctor | `npm run doctor` | No blocking issues |

### 15.2 Manual acceptance matrix (real data)

Use the current tree; expected counts may drift only if the user edits files, and the UI must show the new real counts.

| # | Scenario | Steps | Pass condition |
|---:|---|---|---|
| 1 | Overview truth | Open `/` | Counts match `/api/scan/results`; monitor score matches `status.json`; live latency is a real HTTP measurement |
| 2 | Scan | Click Scan | SSE stages; new `generatedAt`; counts reconcile |
| 3 | Edit JSON | Open `data/site.json`, change a harmless value, save | Hash changes; file valid; backup exists; Git shows modified |
| 4 | Conflict | Modify the same file in Notepad before saving | 409 banner; no silent overwrite |
| 5 | Upload image | Upload a test PNG to `assets/img` | File exists, thumbnail works, size correct, backup not needed for new file |
| 6 | PDF preview | Open a real PDF from `assets/books` | First page/preview or download works; UI stays responsive |
| 7 | Delete/restore | Delete a test file, restore from history | Bytes identical to original |
| 8 | Dependency map | Open `/map` | Known edges present; unresolved list accurate |
| 9 | Validator | Break a JSON, run validator | Error with file/line; fix and rerun passes |
| 10 | AI disabled | No key | Setup state; no fake answer |
| 11 | AI enabled | Real key | Streamed answer; stop works; apply diff writes |
| 12 | Git status | `git status` vs UI | Same files and statuses |
| 13 | Commit | Commit one selected file | Real SHA; other files not included |
| 14 | Push | Push to `main` | Remote HEAD equals local HEAD |
| 15 | Deploy verify | Full deploy | Actions run for exact SHA succeeds; live 200; title matches |
| 16 | SSE | Touch a file externally | UI updates within 1 s; toast names the file |
| 17 | Restart | Kill server, restart | Backups/history persist; UI recovers |
| 18 | Reduced motion | Enable OS setting | No transforms; app remains usable |
| 19 | Keyboard | Tab/Enter/Esc/Ctrl+S | All actions reachable |
| 20 | Low-spec | Open map + editor + 43-asset table | No freeze; memory stable |

### 15.3 Deploy proof record

A successful deploy must produce a record like:

```json
{
  "commit": "bf990ff",
  "actions": { "name": "pages build and deployment", "conclusion": "success", "durationSec": 24 },
  "live": { "status": 200, "ms": 415, "title": "PERKIM Kuala Langat — laman draf" },
  "verifiedAt": "2026-11-12T15:00:00Z"
}
```

If any field is missing, the deployment is not "verified" in the UI.

### 15.4 Proof that the plan is grounded

Every implementation task in this document names a real file, endpoint, command, or baseline value. The plan does not rely on unverified APIs:

- Git behavior was checked with `git ls-remote`, `git status`, and `git log`.
- The live site was fetched and measured.
- The Actions API was queried for the latest run.
- The monitor data files were read.
- The file inventory was generated by walking the real tree.
- The theme tokens were read from the installed Astryx package.
- The motion tokens were read from the site's `css/motion.css`.

---

## 16. Rollback, risks, and required inputs

### 16.1 Rollback levels

| Level | Action | Scope |
|---|---|---|
| 1 | Undo in editor (before save) | session |
| 2 | Restore backup | one file |
| 3 | `git restore -- <path>` | tracked file to HEAD |
| 4 | `git revert <sha>` | published commit |
| 5 | Restore `.maintenance/backups/<timestamp>/` | bulk recovery |
| 6 | Re-clone from GitHub | catastrophic |

Never use `git reset --hard` in the dashboard.

### 16.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PAT missing/expired | high | push blocked | Preflight detects; Settings shows status; exact setup text |
| NVIDIA key missing | high | AI disabled | Honest disabled state |
| Windows case-insensitive dev vs Pages case-sensitive | medium | 404 live | Validator exact-case check |
| Large PDFs freeze UI | medium | poor UX | Thumbnails, no inline table embeds, Range streaming |
| Monitor audit slow/Lighthouse heavy | medium | deploy delay | Fast audit default; full audit optional |
| Git divergence | medium | push rejected | Fetch + ahead/behind; ff-only pull |
| Accidental secret commit | low | security | Deny-list + validator + diff review |
| File changed outside dashboard | medium | lost edit | Hash guard + watcher |
| SSE proxy buffering | low | stale UI | Heartbeat, `no-transform`, Vite proxy check |
| Monaco bundle size | medium | slow first editor | Lazy import, preload on hover |
| Low RAM | medium | swap | No heavy libs, concurrency caps, thumbnails |
| NCL leftovers | medium | confusion | Explicit removal list + grep gate |

### 16.3 Required from the user

| Input | Why | Where |
|---|---|---|
| NVIDIA `nvapi-` key | Real AI responses | `.env.local` → `NVIDIA_API_KEY` |
| GitHub fine-grained PAT | Real push | `.env.local` → `GITHUB_TOKEN` |
| PAT permissions | Push to `main` | Contents: Read and write on `Website-PERKIM` |
| Confirmation before first real deploy | Safety | Deploy tab confirmation |
| Decision on test commit | Live proof | Use a harmless `README`/comment change, then keep or revert |

Until the keys are provided, the plan can be fully implemented and verified except live AI and live push. Those two features must remain visibly disabled, not simulated.

---

## 17. Appendices

### 17.1 Managed file groups and editing rules

| Group | Examples | Edit | Preview | Upload | Delete |
|---|---|:--:|:--:|:--:|:--:|
| Pages | `index.html`, `pages/*.html` | ✅ | ✅ | ✅ | ✅ |
| Data | `data/*.json` | ✅ | ✅ | ✅ | ✅ |
| Modules | `js/main.js`, `js/modules/*.js` | ✅ | ✅ | ✅ | ✅ |
| Styles | `css/*.css` | ✅ | ✅ | ✅ | ✅ |
| Media | images, PDFs, fonts, SVG | ❌ | ✅ | ✅ | ✅ |
| Programs | `program/**` | ✅ text, ❌ images | ✅ | ✅ | ✅ |
| API module | `web-api-module/**` | ✅ | ✅ | ✅ | ✅ |
| Tools | `tools/*.py`, `*.mjs` | ✅ | ✅ | ✅ | ✅ |
| Config | root dotfiles, README, `start.bat` | ✅ | ✅ | ✅ | ⚠️ |
| Other | vendor, legacy | ✅ (warn) | ✅ | ⚠️ | ⚠️ |

Denied always: `.git/**`, `backups/**`, `node_modules/**`, `.pawprints/**`, `.env*`, key files.

### 17.2 NCL → PERKIM mapping

| NCL concept | PERKIM concept | Data source |
|---|---|---|
| `layers` | Asset group | scan manifest |
| `systems` | Site sections/pages | HTML manifest |
| `components` | JS modules / CSS files | scan manifest |
| `weaknesses` | Validator findings | validator |
| `fallbacks` | Backup/restore | backups |
| `costs` | File sizes / payload budget | manifest |
| `actors` | Git author / maintainer | git log |
| `evidence` | Audit checks | monitor |
| `principles` | Draft/SEO/a11y rules | validator |
| `metrics` | Score, latency, counts | monitor/live |
| `cases` | Deploy records | deploy log |
| `topics` | Program folders | programs |
| `narratives` | Content/captions | AI assistant |
| `captures` | Screenshots/previews | raw/thumb |
| `reflexivity` | Self-audit | validator vs monitor |
| `exitvoice` | Live site | live status |
| `unknownunknowns` | Orphans/unresolved graph | deps |

### 17.3 API examples

Scan:

```http
POST /api/scan/run
X-Dev-Token: <token>

event: progress
data: {"stage":"scanning","group":"styles","progress":40}

event: done
data: {"ok":true,"summary":{"totalFiles":172,"byCategory":{"pages":12}}}
```

Write with conflict guard:

```http
POST /api/files/write
X-Dev-Token: <token>
Content-Type: application/json

{"path":"data/site.json","content":"...","expectedHash":"abc123"}
```

Success:

```json
{"ok":true,"data":{"path":"data/site.json","hash":"def456","bytes":2738,"backup":"20261112T150000Z"}}
```

Conflict:

```json
{"ok":false,"error":{"code":"HASH_CONFLICT","message":"Fail telah berubah di cakera.","detail":{"currentHash":"zzz999"}}}
```

Git status:

```json
{"ok":true,"data":{"branch":"main","ahead":0,"behind":0,"dirty":["data/site.json"],"untracked":[".pawprints/"]}}
```

Deploy SSE:

```text
event: deploy-stage
data: {"stage":"preflight","status":"passed"}

event: deploy-stage
data: {"stage":"audit","status":"passed","score":97,"warn":4}

event: deploy-stage
data: {"stage":"pushing","status":"started"}

event: deploy-stage
data: {"stage":"actions_success","sha":"abc123","conclusion":"success"}

event: deploy-done
data: {"result":"success","live":{"status":200,"ms":415}}
```

### 17.4 Baseline acceptance values

Use these only as the first-run expectation. The UI must always read current data.

```text
managed files: 172
pages: 12 (10 public + 2 dev)
data JSON: 11
modules: 20
styles: 15
media: 43
programs: 26
api module: 14
tools: 11
root config: 4
other: 16
git HEAD: bf990ff
remote main: bf990ff
monitor score: 97
monitor checks: 38 (32 pass, 4 warn, 0 fail, 2 unknown)
live: HTTP 200, ~415 ms, title "PERKIM Kuala Langat — laman draf"
```

### 17.5 First-run commands

```powershell
# 1. Configure
cd C:\Users\rafee\Downloads\PERKIM\perkim-web-maintainance-update
Copy-Item .env.local.example .env.local
notepad .env.local   # add NVIDIA_API_KEY and GITHUB_TOKEN

# 2. Install and scan
npm install
npm run scan
npm test

# 3. Run
npm run dev:all
# open http://127.0.0.1:5173

# 4. Optional monitor
cd ..\perkim-monitor
npm run serve   # http://127.0.0.1:8082
```

### 17.6 Final rule

If a feature cannot be wired to real data, it is not shipped. It is listed as unavailable with the exact missing prerequisite. A smaller dashboard that tells the truth is better than a larger one that lies.

---

**End of master plan.**
