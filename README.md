# Plush Siege

Little plushes. Big trouble.

A self-contained browser slingshot game about four stuffed animals and some very wobbly monster castles. This first playable slice contains **24 authored countryside levels**, destructible wood, glass and stone, explosive chain reactions, local progress, and a visual level workshop. It uses original procedural artwork and synthesized audio; ordinary play needs no account, API, CDN, or game server.

## Run locally

Use **Node.js 24** and npm. From the existing checkout:

```sh
cd /workspace/plushsiege
npm ci
npm run dev
```

Vite prints its local address. On another computer, replace `/workspace/plushsiege` with the checkout's actual path. Each cloud task already has an isolated workspace; use its existing checkout rather than creating a Git worktree. No environment variables or credentials are required for gameplay.

```sh
npm run build       # TypeScript check, then optimized browser build in dist/
npm run preview     # Serve the production build for local verification (port 4173)
```

Publish `dist/` with a static HTTPS host when you choose to deploy. The current build assumes hosting at the origin root. Building or running the game does not publish the cloud environment or deploy a site.

## Play

- Choose **Let's make a mess** or select any of the 24 levels. Every level is freely replayable.
- Drag the stuffie away from the sling, then release. A longer pull gives a stronger launch; the dotted guide can be disabled in settings.
- Tap the game area once during flight to activate the stuffie's ability. On desktop, Space also activates it.
- Defeat every monster, then let the physics finish. Unused stuffies add a completion bonus.
- Use Restart, or **R**, to retry. Pause with the pause button or **Escape**. Sound, the aiming guide, and gentle motion are configurable.
- The responsive game is designed for landscape play. Real iPad Safari/device validation remains outstanding.

| Stuffie | Role | Flight ability |
| --- | --- | --- |
| Mallow the sheep | Balanced | A small buoyant hop |
| Pip the duck | Fast | Speed burst |
| Bruno the bear | Heavy | Downward stomp |
| Clover the rabbit | Agile | Splits into three projectiles |

Monsters award 5,000 points; broken wood 500, glass 600, stone 800; TNT 1,000; each unused stuffie 3,000. Completion earns at least one star; each level defines the higher score thresholds. Best scores and stars are stored on this browser/device, alongside settings. Browser storage restrictions can prevent persistence; there is no cloud save.

## The workshop

Open **The workshop** from the home screen, or **Build your own** from level selection.

1. Pick a piece, monster, or TNT and tap the scene to place it. Select and drag existing objects to move them.
2. Change materials; edit dimensions and position; rotate, duplicate, or delete selected pieces. A tower template and optional 5-pixel snapping help assembly.
3. Edit the stuffie queue and score thresholds. Undo and redo retain up to 100 authoring operations.
4. Playtest immediately, then return to the workshop. Save/load a local draft or export/import portable JSON.

Validation rejects malformed JSON, unknown types, invalid bounds, missing targets, duplicate IDs, and overlapping bodies. The workshop's terrain, slingshot and initial world are fixed for this slice. Local drafts may remain incomplete while being built; playtesting requires a valid level. Export important work because browser storage is not a backup.

## Verify

```sh
npm test            # Content, input rules, abilities, damage, TNT, win/fail, reset and save tests
npm run validate    # Campaign bounds/overlap checks, idle stability, and sampled shot search
```

`validate` runs the same Matter.js simulation used by the game, writes `artifacts/campaign-validation.json`, and exits unsuccessfully for malformed or unstable campaign levels. Its finite greedy search reports solutions and three-star examples where found. A missed sample is not proof a level is impossible; a found solution is not a measure of fun.

With `npm run dev` running in a separate terminal:

```sh
npm run test:browser # Integrated game navigation, input, scoring and other browser checks
npm run test:editor  # Editing, drag, undo/redo, draft/import/export and validation checks
```

The browser scripts use the pinned Playwright development dependency and headless Chromium. The cloud image supplies `/usr/bin/chromium`; on another machine install the browser once:

```sh
npx playwright install chromium
```

Scripts use system Chromium when available, otherwise Playwright's installed browser. Optional `CHROMIUM_PATH`, `PLAYWRIGHT_MODULE_PATH`, and `GAME_URL` overrides support other installations. Browser tooling is excluded from the shipped game.

To reproduce the production offline check, build and serve the production output with `npm run preview`, then in another terminal run:

```sh
npm run test:offline
```

## Offline play

Production builds generate a service worker that caches the built shell, scripts, campaign and artwork code. Use HTTPS (or localhost), load the production app online once, allow the worker to activate, then reload before testing offline. Supported browsers can install it as a PWA; on iPad use Safari's **Add to Home Screen**. Development mode deliberately does not register the worker. Installation UX and persistence on a physical iPad still need checking.

See [architecture](docs/architecture.md) for extension points and [development report](docs/development-report.md) for verification evidence, limitations, and the next milestone. Dependency license notices remain with their packages: Phaser is MIT-licensed and Matter.js is MIT-licensed.
