> Historical pass 1 report. See [Development Pass 2](pass-2-report.md) for the current destruction system, campaign audit, and game menus.

# Initial vertical slice: development report

This build establishes a playable countryside campaign and reusable production foundation. It is a milestone for review, not a claim that the final 600-level game or final commercial presentation is complete.

## Delivered

- Four original playable stuffies: sheep, speed-burst duck, heavy stomp bear, and splitting rabbit; sheep also has a modest flight hop.
- Drag/release slingshot, optional dotted trajectory guide, touch/mouse input, fixed-step Matter.js simulation, material damage, rotating structures and TNT chain reactions.
- Monster defeat, delayed turn resolution, win/fail flow, per-level score thresholds, unused-projectile bonuses, local best scores/stars, restart, pause and next-level navigation.
- **24 authored levels** in Meadow Mischief with gradual introductions of materials, stuffies and explosives. All levels are open for replay; no currency, energy, accounts, ads or paid services.
- Original procedural countryside/plush/monster artwork, character expressions, material damage cracks, bounded particles, modest camera feedback, synthesized sound effects, and rare cosmetic sinister flashes. A palette registry supports future reviewed themes; the static background is cached to reduce per-frame drawing work.
- A visual workshop with placement, dragging, rotation/resize, materials, a reusable tower template, projectile queues, immediate playtesting, local drafts, JSON import/export, and undo/redo.
- Versioned level types, JSON Schema, runtime geometric validation, shared-simulator campaign audit, unit/physics tests and browser test scripts.
- Type-checked static build, PWA manifest/icon and generated offline service worker.

## Verification evidence

Run results belong to the current checkout and current machine. Re-run the commands after changing content, mechanics or dependencies.

| Check | Evidence and scope |
| --- | --- |
| TypeScript/build | `npm run build` performs the strict type check before generating `dist/`. |
| Core tests | `npm test` exercises authored content, geometry validation, structural stability, launch limits, once-per-flight abilities, damage differentiation, TNT chains, win/fail, reset, and persistence where present in the current suite. Read the command's final totals rather than treating this document as a fixed test count. |
| Campaign audit | The current `artifacts/campaign-validation.json` reports 24 valid levels, zero unstable levels, sampled winning sequences for all 24, and three-star examples for all 24. The audit checks five further seconds of idle stability after construction settling. |
| Editor browser tests | `npm run test:editor`, with Vite running, exercises editing, drag, undo/redo, incomplete-draft recovery, JSON round trips, validation blocking and safe text handling. |
| Integrated browser tests | `npm run test:browser`, with Vite running, checks the integrated game. Its terminal result and any generated artifacts are the source of truth for completed checks. |
| Offline | `npm run test:offline` passed 16 production browser checks: activated worker, cached bundles/icons, offline startup, all levels, a real three-star shot, restart, and saved progress after offline reload. No external runtime requests or uncaught errors. |

The campaign audit's sampled search is finite and greedy. It demonstrates concrete solutions; it does not establish that each level has ideal difficulty, multiple interesting solutions, or a satisfying three-star challenge. Human playtesting remains necessary.

The current run passed **19 unit/physics tests, 17 integrated browser checks, 18 editor browser checks, and 16 production offline checks**. Mouse and iPad-sized touch input both completed the first level through actual pointer events. These browser runs use Chromium and do not establish physical Safari compatibility. `npm audit` reports zero known vulnerabilities after updating Vite to its patched 6.4.5 release.

## Known limitations and review needs

- Physical **iPad Safari** has not been tested. Browser emulation is useful for layout/input checks but cannot establish device performance, audio unlock, touch feel, memory behavior or home-screen installation reliability.
- The user remains final art director. Character designs, evil-flash frequency/readability, animation style, color language and sound character need review. The current artwork and synthesized sounds are original, self-contained production foundations rather than a declaration of final asset quality.
- A single countryside world is implemented. An extensible palette registry and level world IDs support future themes, but a full multi-world selection flow, distinct biome scenery, 15 complete themes, and roughly 600 polished levels are future work. No final world roster is chosen.
- The workshop has one tower template and fixed countryside terrain/sling; bridge/arch/suspension/moving-structure libraries, richer terrain tooling, campaign packaging and bulk production workflows remain to be built.
- Rope, constraints/joints, springs, compound special objects, ice and metal are not exposed as gameplay or authoring features in this slice. There is no custom physics engine.
- Material breaks remove the main rigid body and create cosmetic particles. Shards are bounded visual feedback, not persistent simulated fracture geometry.
- Responsive landscape presentation is the target. The game is not a screen-reader-accessible physics experience; keyboard support is supplementary to aiming with touch/mouse.
- Progress and workshop drafts belong to the current browser/origin. There is no save synchronization, account, or automatic external backup. JSON export preserves authored levels.
- Static deployment assumes the origin root; subdirectory deployment is not configured. Real device offline installation and a fresh cloud-task restoration need independent verification.

## Recommended next milestone

Run a focused feel-and-art review on an actual iPad before expanding the campaign. Tune sling resistance, flight/impact pacing, material thresholds, audio, ability readability and character animation against several representative levels. Record frame-time/body/effect budgets on that device, then turn the strongest structural ideas into reviewed editor templates. Only after that review should production expand into additional worlds and a larger campaign.

No cloud environment publication or site deployment is part of this implementation.
