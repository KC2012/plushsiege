# Architecture

The first slice uses TypeScript, Phaser 3.90 for rendering/input, Matter.js 0.20 for rigid bodies, and Vite for development and production builds. The simulation is independent of Phaser so campaign audits and physics tests exercise the same rules as browser play. There is no backend.

## Modules

| Area | Files | Responsibility |
| --- | --- | --- |
| Simulation | `src/game/physics.ts` | Matter world, collision damage, turn resolution, abilities, explosions, scoring and win/fail state |
| Definitions | `src/game/types.ts`, `config.ts` | Portable content types, material properties, stuffie stats and physics constants |
| Scene | `src/game/scene.ts` | Fixed-step accumulator, aiming input, rendering, camera feedback and event routing |
| Artwork | `src/game/art.ts`, `src/ui/icons.ts` | Original procedural countryside, plushes, monsters, materials and menu portraits |
| Feedback | `src/game/effects.ts`, `audio.ts` | Bounded particles and Web Audio effects unlocked by interaction |
| Persistence | `src/game/save.ts` | Versioned local scores/settings; best scores and stars never regress |
| Content | `src/content/campaign.json`, `campaign.ts` | 24 authored level definitions and initial world metadata |
| Themes | `src/content/themes.ts` | Extensible environment palette registry with a countryside default |
| Validation | `src/content/validate.ts`, `level.schema.json` | Runtime validation of imported content, plus portable JSON Schema |
| Workshop | `src/editor/editor.ts`, `editor.css` | SVG authoring surface, selection, transforms, history, queue editing, JSON I/O and playtest callback |
| Application | `src/main.ts`, `style.css` | Home, campaign, HUD, dialogs, settings, scene/editor navigation and lifecycle |
| Build/offline | `vite.config.ts`, `public/` | Static output, generated versioned service worker, PWA manifest and icon |
| Verification | `tests/`, `scripts/` | Headless unit/physics tests, campaign audit/solution search and browser checks |

## Simulation contract

A `Simulation` owns a single Matter engine and an entity map. Its public state moves through `aiming → flying → aiming` until `won` or `lost`. `launch()` clamps the pull and rejects tiny drags or launches outside the aiming phase. `activate()` accepts one ability per flight after a short release debounce. Physics advances at a fixed 60 Hz, independent of rendering; the scene bounds catch-up work after slow frames.

New levels settle construction contacts before input, with damage suppressed during that initial settling. Collision damage is derived from relative speed and effective mass; material health, density, restitution and friction differ. TNT applies an impulse and damage to nearby entities, allowing chain reactions. Matter handles gravity, angular dynamics, contact response and sleeping. Collision callbacks enqueue damage, which is applied after the engine step.

The model emits events rather than drawing or playing sounds. Rendering reads live body positions and health; the scene consumes events to trigger particles, sounds, and modest camera shake. Effects are capped, and removed entities leave the physics world. Failure waits for a quiet simulation, with an upper turn-duration limit to avoid indefinite retries. Victory awards the unused-projectile bonus once.

A new `Simulation` implements restart; disposing the previous simulation clears bodies, contacts and listeners. UI actions are routed through DOM controls above the canvas. Leaving the canvas or receiving pointer cancellation clears a pending aim. Pausing stops simulation steps. Hiding the document pauses active play.

## Content and authoring

Level JSON uses format `version: 1` and includes an ID, display text, world ID, bounds/ground, sling, projectile queue, blocks, monsters, TNT hazards, score thresholds, and optional par/tutorial metadata. Coordinates are world pixels; positive Y points down. Block angles are **radians** in JSON and **degrees** in workshop controls. The current renderer and workshop are designed around 1440 × 810 with ground Y=675.

`validateLevel(unknown)` checks shape, finite numbers, supported types, bounds, unique IDs, score ordering, and overlaps. Rotated rectangles use separating axes; circle/rectangle and circle/circle cases use geometric intersection tests. A small tolerance allows flush structural contact. JSON Schema documents the format; runtime checks also enforce cross-object geometric constraints.

Keep accepted campaign levels in `campaign.json`, then run both the campaign audit and human playtests. The headless solver samples pull strengths, launch angles and ability timings using the actual game simulator. It replays prior shots while finding a sequence and records successful solutions. This is reproducible evidence of solvability, not a difficulty or quality oracle.

The workshop calls a playtest callback with a structured clone and returns a cleanup function. Its authoring state is separate from the running simulation. Imported files are validated before use; unfinished local drafts have a narrow recovery path so work can be resumed. Exported JSON has the same format as campaign levels.

## Extension points

- **Stuffies:** Extend the `StuffieKind` union, config, ability dispatch, character renderer, UI portrait and workshop roster. Keep gameplay stats separate from appearance and animation tuning.
- **Materials:** Extend `MaterialKind`, config, validation/schema and material rendering; add characteristic audio/particle treatment and collision tests.
- **Worlds:** Register a reviewed `EnvironmentTheme` with `registerTheme()` in `src/content/themes.ts`. `getTheme(level.world)` resolves sky, sun, clouds, hills, foliage, terrain and decoration colors; unknown IDs fall back to countryside. The read-only `themes` registry has no fixed world cap and supports 15 or more palettes without physics changes. Only countryside ships today. Additional biome geometry and a multi-world selector remain future work; no world roster is finalized.
- **Levels:** Add validated JSON with deliberate challenge progression. The data format does not impose a 600-level limit; future content should be indexed/lazy-loaded by world rather than repeatedly inflating startup work.
- **Mechanisms:** Matter supports compound bodies and constraints, but rope, joints, moving structures and their authoring controls are not implemented in this slice. Introduce explicit versioned data for these rather than special-casing campaign IDs.
- **Art and motion:** `art.ts` uses a shared immediate-mode drawing layer and transformed local geometry. The scene caches the static background for the current level world rather than regenerating its scenery geometry every frame; changing the loaded world refreshes that drawing. Background drawing also accepts a time parameter if animated scenery is added later. Expressions, blinking, stretch and rare sinister flashes are cosmetic. Replace or supplement artwork without changing collision rules.
- **Persistence:** The local save has a version tag. Add migrations before changing its structure; never assume local storage is available or permanent.

## Production build

Vite bundles all runtime dependencies and content. Its offline plugin writes a cache version derived from hashed output filenames and precaches the generated app shell. The worker serves same-origin GET requests from cache and provides a cached navigation fallback. Changing application output changes the cache version. No external font, audio, image or API request is required for play. Deployment currently assumes `/`; subdirectory hosting requires coordinated Vite, manifest and worker URL changes.
