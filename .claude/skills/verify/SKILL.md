---
name: verify
description: Build/serve recipe for this Angular SPA, and the known gap in this environment (no browser automation tool available).
---

# Verifying changes in this repo (Angular SPA, no SSR)

## Build & serve

- `npx ng build --configuration development` — full AOT build, catches template
  binding errors (wrong `@Input()` names, missing component imports, type
  mismatches) across the whole app. Fast (~5s), zero errors = strong signal for
  Angular-specific wiring mistakes.
- `npx ng serve --port <PORT>` — Vite-based dev server. `angular.json` has NO
  SSR/prerender builder (`@angular/build:application` client-only), so
  `curl http://localhost:<PORT>/` only returns the empty SPA shell
  (`<app-root></app-root>`) — no server-rendered content to inspect.
- `curl http://localhost:<PORT>/main.js | grep <NewSymbolName>` — confirms new
  code actually made it into the served bundle (not silently orphaned by a
  broken import), but does NOT execute it.

## Known gap: no browser automation in this environment

No Playwright/Puppeteer/Cypress installed (checked `node_modules` +
`package.json`), and no browser/screenshot tool available to the agent in this
environment (checked via `ToolSearch`). This means **actual click-through GUI
verification (does a button open a panel, does a value update on screen) is
not possible from this environment** — only build-time (AOT template
compilation) and bundle-inclusion checks are available.

If this changes (a browser tool becomes available, or Playwright gets
installed), prefer driving the real UI: `ng serve`, navigate to the relevant
route (e.g. `/village`, `/adventure/fight`, `/adventure/summary`), click
through, screenshot.

Until then: report build/serve/bundle checks as partial evidence and flag the
interactive verification as BLOCKED, rather than claiming a full PASS.
