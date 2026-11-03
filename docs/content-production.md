# Campaign production

The original introduction lives in `src/content/campaign.json`. New content follows a separate, reviewable path:

1. `templates.ts` supplies rooms, corbelled arches, two-part trestle bridges, counterweights, suspension assemblies and shared-pier arcades.
2. `generator.ts` composes named candidates with explicit physical ideas, materials, ammunition, world mechanics and metadata. Repeated seeds are not used to inflate the shipped count.
3. `npm run produce:levels` exports five `*.candidates.json` authoring collections. These are not imported by the game.
4. `npm run audit:expansion` checks geometry, references, spawn clearance and budgets; twenty seconds of idle stability; two deliberate misses; a finite actual-physics shot search; and an independent winning replay. Optional level IDs after `--` restrict a repair. `EXPANSION_ATTEMPTS` adjusts the finite search budget.
5. Only accepted candidates enter `expansion/accepted.json`, with their shot witnesses in `tests/fixtures/expansion-solutions.json`. Registered world maps derive their counts and star totals from that accepted collection.
6. `npm test` replays shipped solutions and repeats idle/miss checks. Representative compositions also need rendered inspection and human playtesting.

Joint anchors are local to referenced bodies or world coordinates when no body is referenced. Zone rectangles use center coordinates. Later overlapping gravity fields take precedence; broad lanes must precede local wells. Triggers reference physical objects whose removal starts an actuator; they never directly remove monsters. Ice and metal are actual materials, not recolored wood.

An idle test rejects missing objects, target loss, free points, and excess displacement in undriven structures. Intentional motors/platforms are excluded only for their own driven body; an actuator cannot hide a collapse elsewhere. Small settling tolerance scales with structure height, capped at twenty pixels. Periodic riders may move while remaining alive and safely supported. Deliberate misses must cause no target loss or score and must return control within the sixty-second verification window; successful clears must resolve through the real turn state machine.

A search miss means unproven solvability. Automated clears do not establish enjoyable difficulty, an optimal solution, three-star reachability, or a useful advertised mechanism. Trigger-route fixtures separately verify that vents/rotors activate and their real bodies cause downstream collision damage. The 24 original levels retain efficient three-star regression routes; expansion witnesses report the stars actually achieved.

The workshop supports variable bounds and sling position, five worlds, terrain/ramps, props, environmental zones, real joints and actuators, templates, multiple selection, alignment, copy/paste with ID remapping, snapping, undo/redo, JSON import/export, drafts and immediate actual-engine playtesting. Detailed anchors, break forces and some advanced properties use the validated JSON supplement. Its SVG preview is schematic; registration in the public campaign remains a curated source change.

Before adding more worlds or filling the 150-level target, review playtest difficulty, alternative routes, physical-device performance, audio comfort and repeated structural motifs. Large canvases, object counts and JSON file counts are not quality measures.
