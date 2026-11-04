# Plush Siege 0.5.0 — The Great Siege

The campaign now has 85 stages: 19 of the previous 70 were redesigned, 51 were retained, and 15 new stages were added. Every existing ID and the first-stuffie unlock sequence remain intact. Saved stars persist, although old scores are not directly comparable with changed layouts and physics.

Heavy displaced rubble can now defeat a genuinely pinned monster through sustained compression. Supported weight is shared across real contact paths; anchored structures contribute measured reactions. Sleeping bodies continue to be evaluated. Harmless authored rest, gentle collisions, short drops, freefall and release have separate regression coverage. Contact loops no longer enumerate exponentially many load paths. Moving targets and a stationary burning structural fastener still defer last-shot failure; the victory grace applies only after every target has been physically defeated. Sleeping debris supporting a monster is retained during cleanup, including in sideways gravity.

The new structural vocabulary includes triangulated gables, bowstring trusses, destructible cable couplers, mortised hanging rooms, breakable pins, large rotating decks, radial settlements and gravity-oriented load paths. The large kingdom's wooden pins have actual stress limits so broken sections can separate and settle. The workshop exposes three new assembly templates.

| Benchmark | Physical premise |
|---|---|
| Meadow 33 · Bowstring Kingdom | Glass-footed bastions carry a triangulated bridge, crown ballast and a dependent lower court. |
| Frozen 13 · Sliding Citadel | An exposed ice winch releases the armored sled onto an incline and into the lower fortress. |
| Molten 13 · Furnace Suspension | One valve powers two pressure stones, which push load-bearing wooden fasteners into heat and release their workshops into lava. |
| Haunted 13 · Bell Engine | A motor strikes one pendulum, which transfers motion through a second bell into the hanging house above the chapel. |
| Orbital 13 · Twin Moon Foundry | Curved settlements, brace clamps, fragile greenhouse connections, released cargo and two radial gravity fields. |

The collapse camera now frames important moving structural bodies after the projectile lands. Manual panning, zoom and overview retain control. Heat is easier to see, and bounded radial fields display circular influence regions. The approved cartoon art direction is preserved.

## Verification

All 85 stages passed portable validation, 20-second idle stability, two harmless misses, body-budget and independently replayed clear gates before campaign promotion. The introductory 24 also have efficient three-star routes and the stricter legacy stability check. `npm run build` passes TypeScript and produces the optimized offline-capable game.

| Check | Result |
|---|---|
| Unit/content suite | 154 passing, including real mechanisms and disabled-mechanic comparisons |
| Integrated game | 19 browser checks |
| Destruction and abilities | 36 browser checks |
| Monster lab | 64 browser checks |
| Camera / Web Audio | 13 / 13 browser checks |
| Retained large showcases | 8 browser checks |
| Five-world navigation and progress | 185 checks across five viewport sizes |
| Workshop, import/edit/undo and templates | 59 browser checks |
| Five new benchmarks | 44 rendered-scene checks at 1440×810 and 1024×768 |
| Production responsive presentation | 40 checks across four viewport sizes |
| Production offline play | 18 checks, including a real winning shot, persistence and all 18 lab rigs |

Logs, the complete acceptance journal, timing measurements and representative screenshots are in [the evidence directory](verification/pass-5/README.md). The rendered-scene benchmark exercises actual graphics, events and camera updates at fixed physics steps; it is not a frame-rate test. Production tests use the built assets without development modules. Browser checks used Chromium with software Canvas on this cloud host.

Ice and orbital browser clears used one available follow-up beyond their Node witness. All clears fit their authored queues. These are separate verified runtime routes; bit-identical cross-runtime contact outcomes are not claimed.

All 85 winning Node replays stayed below the 240-entity cap: the observed peak was 90 entities, including at most 46 fragments. The slowest per-level 95th-percentile physics step was 1.924 ms on this cloud host. These are physics CPU costs, not complete game frame times. The separate first-shot animation-loop samples averaged 53.3–60.1 FPS in headless software Canvas. Median frame intervals were 16.7 ms; per-sample p95 intervals ranged from 16.7 to 33.3 ms. Startup/host stalls are retained in the totals. These eight-second scene samples exclude the HTML HUD and audio, do not cover complete multi-shot clears, and do not establish sustained device performance.

## Scope and remaining work

The optional 30–50 new stages were reduced to 15 individually verified additions. Further expansion needs more distinct designs and human playtesting. Automated metrics measure materials, angles, target spread, moving/destructed objects, secondary impacts, affected sections, chronological unique-object paths and actual environmental activity. They do not rate fun or prove causal chains by themselves. The mechanism checks verify selected physical links directly.

Reference access limitations and concrete inspected examples are documented in [the research](../LEVEL_DESIGN_RESEARCH.md); all original-stage decisions are in [the review](../LEVEL_DESIGN_REVIEW.md). No proprietary assets or exact reference layouts ship.

Physical iPad frame rate, touch feel, thermals, battery use, Web Audio unlock and Safari offline installation still need device testing. Viewport emulation and cloud CPU measurements do not establish those properties.
