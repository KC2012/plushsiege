# Plush Siege

Little plushes. Big trouble.

A self-contained browser slingshot game about four stuffed animals and some very wobbly monster castles. The expanded campaign contains **70 verified levels across five distinct worlds**, with destructible wood, glass, stone, ice and metal, real mechanisms, local progress, and an advanced level workshop. It uses original procedural artwork and synthesized audio; ordinary play needs no account, API, CDN, or game server.

> Current release: **0.4.0 — The Great Expansion**. See [Pass 4 report](docs/pass-4-report.md) for the changes and verification.

## Run locally

Use **Node.js 24** and npm. From the existing checkout:

```sh
cd /workspace/plushsiege
npm ci
npm run dev
```

**Windows:** extract the ZIP, open a terminal in the extracted folder (the one containing `package.json`), run `npm ci` once, then `npm run dev`.

Vite prints its local address. On another computer, replace `/workspace/plushsiege` with the checkout's actual path. Each cloud task already has an isolated workspace; use its existing checkout rather than creating a Git worktree. No environment variables or credentials are required for gameplay.

```sh
npm run build       # TypeScript check, then optimized browser build in dist/
npm run preview     # Serve the production build for local verification (port 4173)
```

Publish `dist/` with a static HTTPS host when you choose to deploy. The current build assumes hosting at the origin root. Building or running the game does not publish the cloud environment or deploy a site.

## Play

- Choose **PLAY** or choose a world and any level on its paged trail map. Every level is freely replayable.
- Drag the stuffie away from the sling, then release. A longer pull gives a stronger launch; the dotted guide can be disabled in settings.
- Tap the game area once during flight to activate the stuffie's ability. On desktop, Space also activates it.
- Defeat every monster, then let the physics finish. Unused stuffies add a completion bonus.
- Use Restart, or **R**, to retry. Pause with the pause button or **Escape**. Master sound, independent music/effects volumes, the aiming guide, and gentle motion are configurable.
- The responsive game is designed for landscape play. Real iPad Safari/device validation remains outstanding.

| Stuffie | Role | Flight ability |
| --- | --- | --- |
| Mallow the sheep | Balanced | A small buoyant hop |
| Pip the duck | Fast | Speed burst |
| Bruno the bear | Heavy | Downward stomp |
| Clover the rabbit | Agile | Splits into three projectiles |

The Worlds portals open five campaign destinations. Each map shows eight numbered levels per page, with independent world progress and stars. Use **Overview**, **Sling**, and **−/+** to inspect large levels. Drag empty scenery to pan; pinch or use the mouse wheel to zoom. The camera follows launched stuffies until you inspect manually.

Monsters award 5,000 points; broken wood 500, glass 600, stone 800; TNT 1,000; each unused stuffie 3,000. Completion earns at least one star; each level defines the higher score thresholds. Best scores and stars are stored on this browser/device, alongside settings. Browser storage restrictions can prevent persistence; there is no cloud save.

## Physics lab

While the dev or production server is running, open `/physics-lab.html` on that same server. Select one of eleven deterministic rigs, then Run, Pause, Step, or Reset. The body overlay, live position/rotation, sleep state, health, damage source and outcome show the actual game simulation. The lab includes support loss, falling stone/wood, monster falls, push-off, chain reactions, explosions, harmless contact, stable rest, and meaningful crushing. It is also included in the offline build.

[GAMEPLAY_RULES.md](GAMEPLAY_RULES.md) separates reference behavior from our implementation choices and documents the reference-access limitation. Existing scores/settings remain compatible; no save migration is required.

## The workshop

Open **The workshop** from the home screen, or **Build your own** from level selection.

1. Pick a piece, monster, or TNT and tap the scene to place it. Select and drag existing objects to move them.
2. Change materials; edit dimensions and position; rotate, duplicate, or delete selected pieces. Grid/snap, multi-selection (Shift or the touch checkbox), alignment, copy/paste and structural templates help assembly.
3. Edit the stuffie queue and score thresholds. Undo and redo retain up to 100 authoring operations.
4. Playtest immediately, then return to the workshop. Save/load a local draft or export/import portable JSON.

Validation rejects malformed JSON, unknown types, invalid bounds, missing targets, duplicate IDs, and overlapping bodies. Edit world dimensions, terrain, sling, environmental zones, props, joints and actuators. Detailed anchors and some advanced properties use the validated JSON supplement; the schematic preview is separate from actual-physics playtesting. Local drafts may remain incomplete while being built; playtesting requires a valid level. Export important work because browser storage is not a backup.

## Verify

```sh
npm test            # Content, input rules, abilities, damage, TNT, win/fail, reset and save tests
npm run validate    # Campaign bounds/overlap checks, idle stability, and sampled shot search
```

`validate` runs the same Matter.js simulation used by the game, writes `artifacts/campaign-validation.json`, and exits unsuccessfully for malformed or unstable campaign levels. The original introduction has verified three-star routes. Every accepted expansion level must pass geometry, twenty-second idle and deliberate-miss checks, plus an independently replayed winning shot sequence. A missed sample is not proof a level is impossible; a found solution is not a measure of fun.

With `npm run dev` running in a separate terminal:

```sh
npm run test:browser # Integrated game navigation, input, scoring and other browser checks
npm run test:editor  # Editing, drag, undo/redo, draft/import/export and validation checks
npm run test:destruction # Rendered physical collapse/fragment and ability-input regressions
npm run test:monsters # Eleven rendered monster rigs and body/sprite synchronization
npm run test:camera  # Mouse/touch pan, zoom, focus, tracking and scaled aiming
npm run test:audio   # Real Web Audio world cues, gains, mute and cleanup
npm run test:showcase # Rendered large castles and a real-engine chain-reaction clear
npm run test:worlds  # Production five-world navigation/progress at four viewport sizes
npm run test:presentation # Four responsive layouts (defaults to production preview)
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

## Producing levels

`npm run produce:levels` rebuilds 46 deliberately composed candidates from reusable structural templates. `npm run audit:expansion` audits and promotes only stable, nontrivial, replayable candidates. Pass level IDs after `--` for a targeted repair. Candidate JSON is authoring material; only `src/content/expansion/accepted.json` ships. Automated clears establish solvability, not enjoyment or optimal difficulty. See [LEVEL_DESIGN.md](LEVEL_DESIGN.md) for acceptance criteria and remaining human playtesting.

## Offline play

Production builds generate a service worker that caches the built shell, scripts, campaign and artwork code. Use HTTPS (or localhost), load the production app online once, allow the worker to activate, then reload before testing offline. Supported browsers can install it as a PWA; on iPad use Safari's **Add to Home Screen**. Development mode deliberately does not register the worker. Installation UX and persistence on a physical iPad still need checking.

See [Pass 4 report](docs/pass-4-report.md), [gameplay rules](GAMEPLAY_RULES.md), [architecture](docs/architecture.md) for extension points and [development report](docs/development-report.md) for verification evidence, limitations, and the next milestone. Dependency license notices remain with their packages: Phaser is MIT-licensed and Matter.js is MIT-licensed.
