# Pass 4 — The Great Expansion (0.4.0)

The campaign grows from 24 to **70 verified levels across five playable worlds**. This is a quality-gated expansion, below the aspirational 150-level target. Forty-six new stages ship; no unproven candidates are included just to increase the count.

| World | Shipped levels | Main ideas |
| --- | ---: | --- |
| Meadow Mischief | 30 | Split trestle bridges, counterweights, boulder ramps, arches and a shared-pier castle |
| Frozen Folly | 10 | Low friction, brittle ice, skidding loads, a ferry and an arch-supported ice city |
| Molten Mayhem | 10 | Lava, heat-sensitive debris, triggered vents, breaching stones and a rotating hammer |
| Haunted Hooligans | 10 | Cable-linked balconies, pendulums, moving floors, hinged traps, bells and a crooked manor |
| Orbital Oddities | 10 | Low/zero gravity, visible radial wells, planetoids, a driven satellite and stronger landing fields |

All maps retain clear local numbering, stars and progress, with eight touch targets per page. World portals provide direct navigation. Existing level IDs and the version-1 save key remain intact. Old progress survives; separate music/effects gains receive compatible defaults. Scores from different physics revisions are not strictly comparable.

## Physics and level design

Indirect damage now accounts for the compressive energy transferred by a descending load when a monster is opposed by a support. This addresses a heavy falling object that previously lost too much effective impact energy to a freely recoiling-target assumption. Ordinary contact energy, angular motion, meaningful falls and secondary impacts still use the shared damage pipeline. There is no blanket health reduction or damage simply from resting against a body. Gentle drops and ordinary resting pressure remain harmless.

Terrain, ramps, boulders and planetoids are real colliders. Ropes, springs, hinges, break forces, motors, moving platforms and removal-triggered actuators act in the same Matter world. Vents apply force; they do not teleport objects or defeat targets. Heat/lava and local gravity fields are data-driven. Trajectory prediction samples the same local acceleration as live flight.

The finales use shared structural load paths. The ice city's upper turrets sit on a joined skyway carried by brittle arch caps. Haunted bells anchor to the building rather than arbitrary sky points. Gallery cables connect to actual castle floors. A trestle bridge has two deck halves, so its central support matters. Large layouts were rebuilt when they were mostly disconnected rooms and powder lines.

Final missed-shot checks caught empty galleries in the meadow and volcanic finales that could repeatedly wake the solver and prevent the next turn. Those decks were removed from the affected compositions; the load-bearing castles and volcanic pressure mechanism remain. Admission now also requires baseline misses to finish their turns within the verification window. The fix does not impose a gameplay timeout or end a real moving-target collapse early.

Periodic platform riders can resolve a turn only while actual support contact remains safe; dislodged targets continue resolving normally. Ordinary meaningful motion retains the uncapped rule. Space can finish victory after every target is defeated; isolated spent space projectiles fade after 30 seconds only when clear of nearby bodies, supports and constraints.

[LEVEL_DESIGN.md](../LEVEL_DESIGN.md) distinguishes established reference patterns from original hypotheses. External reference access remained restricted; no new footage study, copied layouts or proprietary tuning constants are claimed.

## Scale, presentation and authoring

Variable dimensions, horizontal/vertical inspection, smooth zoom, mouse/touch pan, pinch/wheel zoom, sling focus, overview and projectile tracking support the larger compositions. Camera buttons have 44-pixel minimum touch targets. Manual inspection interrupts tracking; aiming converts through the live camera transform. Gameplay scenery remains separate from the moving world camera. Campaign bounds reach 3,200 pixels wide and 1,585 high; the editor supports larger authoring bounds.

Each biome has different original geometry, silhouettes and atmosphere: frozen cliffs/lakes and aurora, volcanic cones/magma/geysers, crooked haunted manors/chandeliers, and orbital rings/stars/asteroids. Ice/metal blocks, fragments, props, field boundaries and mechanisms share the established bold cartoon language. The title, world portals, maps and HUD retain the original stuffies and readable outlined game pieces.

Five original composed cues use distinct motifs, instrumentation and rhythm, including a haunted waltz. Material/impact effects are layered and varied. Music/effects have independent gains and a master mute. Gesture unlock, pause, background visibility, reusable noise buffers, cleanup and a 36-voice budget are implemented. See [audio design](audio-design.md) and [art pipeline](art-pipeline.md).

The workshop now includes variable bounds/ground/sling, all worlds, terrain/ramps, props and zones, real joints/actuators, structural templates, multi-selection, copy/paste with reference remapping, alignment, snapping, pan/zoom, undo/redo, drafts, import/export and immediate actual-physics playtesting. Detailed anchors, break forces and some advanced properties use a validated JSON supplement. The SVG preview is schematic. Public campaign registration remains curated source data.

The [production workflow](content-production.md) separates deterministic candidate generation from accepted content. Validation checks types, geometry, spawn clearance, IDs/references, initial stability, trivial destruction, object budgets and actual winning routes. A search miss means unproven solvability, not impossibility. Automated clears do not establish fun, optimal difficulty or all possible strategies.

## Verification

The production build/type check, **119 automated tests**, and **380 browser checks** pass.

| Browser suite | Checks |
| --- | ---: |
| Actual mouse/touch game loop, scores, navigation and restart | 19 |
| Advanced workshop | 50 |
| Rendered destruction and ability gestures | 36 |
| Monster rigs and body/character synchronization | 43 |
| Four responsive presentation sizes | 40 |
| Camera transforms, gestures and tracking | 13 |
| Native Web Audio output/lifecycle | 13 |
| Five-world navigation, progress, volumes and 44px camera controls | 140 |
| Production offline/PWA and physics lab | 18 |
| Rendered large castles and ice-city winning route | 8 |

All 70 levels have real-engine winning replays. The original 24 retain efficient three-star routes. Of the 46 new witnesses, 44 earn three stars; Orbital 3/10 have verified two-star routes. Higher-star optimization for those two is not claimed.

All 46 new stages pass schema/geometry checks, twenty seconds of idle stability, deliberate backward/downward misses without free points or target loss, and independent winning replay. Trigger-route fixtures additionally prove actual vent/rotor activation and downstream collision damage. Physics tests cover stronger falling loads, gentle contact, world forces, constraints, triggered motion, periodic riders, long resolution, cleanup, saved progress and independent audio gains.

A rendered Chromium ice-city route uses a follow-up bear where the Node witness clears with one duck. Contact outcomes can vary slightly across runtimes and input timings; the queue allows follow-up play. The rendered route is recorded separately rather than presented as a bit-identical cross-browser replay. The showcase test advances actual fixed steps; the separate game/camera suites verify real pointer input.

Headless verification uses both WebGL and the supported Canvas renderer. Chromium's headless GPU stalled during concurrent readback; those interrupted checks were rerun successfully using Canvas. That tooling issue is not counted as a game pass. Physical iPad Safari performance, audio latency, installation UX and extended human balance/listening tests remain outstanding.

The hard budgets are 240 entities, 72 fragments and 140 cosmetic particles. Final replay sampling peaks at 100 entities and 50 fragments. CPU-step timings are recorded in [performance evidence](verification/performance-pass-4.json); they measure this cloud host, not iPad frame rate. Offscreen objects continue simulating while their drawing is culled; load-bearing debris is retained.

Screenshots: [title](screenshots/pass4-title.png), [world portals](screenshots/pass4-worlds.png), [large campaign overview](screenshots/pass4-campaign-frozen.png), [physical ice collapse](screenshots/pass4-ice-collapse.png), and [production workshop](screenshots/pass4-workshop.png). Machine-readable totals are in [verification summary](verification/pass-4-summary.json).

## Delivery and remaining work

The source and production browser ZIP are included in the GitHub release commit. Run `npm ci` before `npm run dev` after extracting source. The browser ZIP requires a root HTTP/HTTPS origin; direct `file://` opening is unsupported. No paid services, external runtime API, downloaded commercial soundtrack or copyrighted reference artwork are required.

The 150-level milestone still needs **80 additional reviewed levels**, principally another twenty in each new biome. The five-world architecture is ready for that production work. Prioritize human difficulty/alternative-route review, stronger teaching sequences, physical iPad verification, and more distinct contraptions before increasing the count. The longer 15-world/600-level ambition remains future production work.
