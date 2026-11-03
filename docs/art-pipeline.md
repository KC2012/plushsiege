# World artwork and rendering contracts

All artwork is original procedural vector geometry. It uses Phaser Graphics through the shared local-coordinate `Pen` helper in `src/game/art.ts`; no external image, font, character or reference-show asset is required. Stuffies, monsters, physical materials and new props share the same dark ink, angular facets and cloth-toy vocabulary.

The five world identities have separate scenery geometry, not just different palettes:

| World ID | Scenery motifs | Physical visual cues |
| --- | --- | --- |
| `countryside` | Faceted green hills, graphic sun, pines and a distant windmill | Orange wood, bright material facets, rolling boulders |
| `frozen` | Aurora ribbons, sharp glacier cliffs, frozen lake, icy crystals | Ice's pale face, blue fracture lines and low-friction zone sheen |
| `molten` | Broken volcano cones, magma channels, distant geysers and basalt strata | Clearly bounded lava areas, heat wisps, directional pressure-vent flow |
| `haunted` | Crooked mansion spires, a large moon, faint ghost wisps and chandelier silhouettes | Riveted metal, motor markers and physical mechanisms rendered separately from scenery |
| `orbital` | Star field, angular nebula, ringed distant planets and muted asteroids | Ink-outlined planetoids, gravity-field direction markers and floating metal platforms |

`src/content/themes.ts` stores the five palettes and their motif IDs. Registered themes can reuse a motif with a new reviewed palette; a completely new landscape family requires a new scenery branch. The registry has no fixed world count. Existing countryside IDs and character identities remain stable.

## Rendering order and coordinates

1. `drawBackground(g, timeMs, worldId, sceneryOnly)` draws a 1440 × 810 viewport backdrop. It is designed to be cached. Pass `true` for a camera-fixed backdrop so it does not invent a ground line at Y=675 in larger levels.
2. `drawWorldGround(g, level.bounds, worldId)` draws the actual world-space ground. Skip this for levels with `environment.ground === false`.
3. `drawZone(g, zone, timeMs)` marks environmental areas behind bodies. Zone X/Y are rectangle centers. Radial gravity uses `center`/`radius`; nonradial gravity uses directional arrows that agree with the configured vector.
4. `drawTerrain(g, terrain)`, `drawProp(g, prop, angle)`, and the existing material/character functions draw actual physical geometry. Pass current body positions and angles rather than initial content coordinates when bodies move.
5. `drawMechanism(g, mechanism, timeMs, active)` marks an actual actuator. For body-bound motors/platforms, resolve current body X/Y before drawing. Vent W/H are the force-region dimensions: the renderer draws a small nozzle at the upstream edge and flow within that region, rather than implying the whole region is a solid body.

Rectangles use center X/Y, full width/height and radians. Props use a circle center/radius. Main body geometry follows its collider; craters, stitchwork and material facets stay inside it. Horn tips, cloth ears and other small character ornaments are cosmetic. Decorative scenery has no gameplay ink outline, helping separate it from physical objects.

Ice and metal have dedicated intact and fragment artwork. Ice is pale cyan with white planes and crystalline blue cracking; metal uses steel-blue panels, dark seams, bright bevels and rivets. Existing wood/glass/stone identities remain recognizable. Fragments keep a broad silhouette matching their rectangular colliders instead of pretending to be narrow shards.

## Validation scope

The pass-4 art fixture renders each world with representative props, zones and materials in Phaser, with screenshots under `artifacts/pass4-art-*.png`. These fixtures are visual rendering checks, not evidence that their illustrative structures have passed gameplay simulation. Full campaign physics and camera integration are verified separately.

World geometry and effects are bounded: backgrounds are cached, star/decoration counts are fixed, zone markers use capped sample counts, and no image downloads occur during play. Visual markers do not apply forces or damage; those come from the shared simulation.
