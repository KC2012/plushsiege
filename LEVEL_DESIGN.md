# Plush Siege: level design and production

## Reference, observation, and hypotheses

Reference games: Angry Birds Classic, Seasons, Rio, and Space. Public reference pointers are [Classic](https://en.wikipedia.org/wiki/Angry_Birds_(video_game)), [Seasons](https://en.wikipedia.org/wiki/Angry_Birds_Seasons), [Rio](https://en.wikipedia.org/wiki/Angry_Birds_Rio), and [Space](https://en.wikipedia.org/wiki/Angry_Birds_Space). Fresh external reference access was blocked during the preceding research pass (HTTP 403); this environment still provides no unrestricted browsing tool. No new footage review, proprietary constants, or exact layouts are claimed. The observations below describe established player-visible design patterns; the hypotheses are original production choices to test in Plush Siege.

| Established behavioral/design pattern | Original design hypothesis and production test |
| --- | --- |
| Early Classic levels teach the sling with small readable structures; later levels combine materials and protected targets. | Introduce one new physical idea in a clean composition, then combine it with a familiar weak point. A first-world newcomer should see the useful support without a written walkthrough. |
| Supports matter: breaking a small part can turn the whole structure into the attack. | A siege needs a structural argument, not just more blocks. Each accepted stage records its initiating weak point and intended chain in metadata. |
| Seasons varies the shapes, terrain and decorative language of the same core rules. | A frozen dock must actually slide; a haunted chandelier must actually swing. Changing colors is not enough to justify a new world. |
| Rio changes scenario framing and target arrangements while retaining destruction physics. | Distinct silhouettes, target protection, elevated perches and split objectives can create variety without adding unrelated mechanics. |
| Space makes local gravity and visible influence regions a strategic part of aiming. | Show gravity-field boundaries, preview the same force model used by real flight, and teach one planetoid before linked orbital structures. Do not hide essential forces. |
| Finite ammunition and unused-projectile bonuses reward efficient clears. | Provide a forgiving completion budget and a separate efficient-star target. Never require an unverified pixel-perfect shot just to reach the next stage. |
| Spectacle follows understandable physical events. | A boulder rolls, a latch breaks, a counterweight drops, a bridge swings, a tower falls. Use real bodies, constraints and forces; never script the monsters' deaths. |

These hypotheses are not findings that a generator or solver can prove fun. They guide authoring, browser review and later human playtesting.

## Composition before population

Design from a one-sentence physical idea: **verb → mechanism → consequence**. For example, “cut the suspension rope, drop the loaded bridge, bowl the ice cargo into the gatehouse.” Then choose the silhouette, terrain and camera framing around that idea. Add monsters where their protection makes the chain matter. Add ammunition last.

Use three scales: compact puzzles, multi-structure sieges, and occasional enormous spectacle levels. The 50/35/15 proportions are a diversity guide, not a mandate to repeat a template. Large levels should add spatial relationships, elevation changes and linked mechanisms, not empty distance or a wall of identical towers.

Readable weak points use consistent materials and load paths. Fragile ice under heavy masonry, a small wooden latch beside a counterweight, a rope with a clear anchor, and a rolling stone held above a ramp should explain their own function. Decorative scenery must not resemble these interactive objects.

## World teaching arcs

- **Meadow Mischief:** preserve the original 24-level introduction, then add bridges, suspended weight, boulder ramps and multi-stage countryside contraptions.
- **Frozen Folly:** demonstrate low friction and ice breakage, then sliding loads, ramps and compound collapses. Ice is a strategy, not merely cyan glass.
- **Molten Mayhem:** show a readable lava boundary and pressure vent before mixing heat-sensitive supports, explosive cargo and triggered machinery. Environmental weakening must be predictable and bounded; an idle level must not secretly auto-win.
- **Haunted Hooligans:** teach a hinged/suspended object, then swings, moving floors, rotating mechanisms and counterweights. “Possessed” motion must move a real physical platform or rotor.
- **Orbital Oddities:** show low/zero gravity and one local field, then planetoids, curved approaches and floating structural chains. Field direction and overview inspection must be visible before launch.

## Templates, candidates, and acceptance

Reusable templates are a production vocabulary: gatehouses, arches, loaded bridges, hanging cargo, counterweights, rotating beams and tiered forts. Their parameterized combinations produce **candidates**, not automatically approved campaign levels. Each accepted stage needs a distinct idea, metadata, supported geometry, a working mechanism where advertised, and a replayable solution under the actual simulator.

Validation layers:

1. Validate portable data, body/constraint/trigger references, spawn clearance, bounds and object budgets.
2. Run idle simulation against authored geometry. Distinguish deliberate periodic machinery from accidental collapse; no target may vanish into a free idle victory.
3. Exercise each new mechanism separately, including its failure/trigger behavior.
4. Search and independently replay shots. Record strength, angle, ability timing, score, remaining targets and peak bodies. Unsolved samples mean “not yet verified,” not “impossible.”
5. Inspect representative compact, siege and spectacle stages in a real browser. Confirm that camera inspection, the initiating shot and the chain are readable.
6. Review enjoyment and difficulty by human play. Automated stability or a successful numerical route is not an artistic approval.

Unverified candidates must stay out of the accepted campaign or be explicitly labeled as experimental authoring content. Do not lower durability or delete targets merely to make a solver succeed.

## Scale and performance

A level can extend horizontally and vertically. Overview, panning, zoom, sling focus and projectile tracking must make the full arrangement inspectable. The far objective must be reachable through an actual projectile path or physical chain; a wider canvas does not automatically create a playable large level.

Keep body/effect budgets, fixed physics steps, offscreen drawing culls and safe support-aware debris cleanup. Never pause offscreen simulation or remove a load-bearing object merely because the camera cannot see it. Keep constraints, materials and forces data-driven for larger future worlds.

## Quality review checklist

Can the player identify a promising weak point? Does the first collision produce useful feedback even when the shot is imperfect? Is there room for another viable approach? Does the advertised mechanism really cause the next event? Can the entire arrangement be inspected? Is ammunition forgiving enough for experimentation? Does the level contribute an idea absent from its neighbors? These are review questions, not a numerical “fun score.”

## Pass 5 revision

See [concrete research and design rules](LEVEL_DESIGN_RESEARCH.md). The new acceptance focus is a recognizable initiating action, a physically important weak point, varied load paths, useful world mechanics, protected targets that can actually be crushed, and meaningful interaction between architectural sections. A winning sample alone does not approve a composition's quality.
