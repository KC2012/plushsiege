# Plush Siege gameplay rules

## Reference and evidence boundary

The behavioral reference is the original **Angry Birds**, **Angry Birds Seasons**, and **Angry Birds Rio**. The reference column below records well-established, publicly described player-visible behavior, not a claim that we extracted their engine or reproduced proprietary constants. Rio's targets include caged birds/marmosets instead of the original pigs; Plush Siege consistently uses monsters.

Public descriptions intended for this pass: [original game](https://en.wikipedia.org/wiki/Angry_Birds_(video_game)), [Seasons](https://en.wikipedia.org/wiki/Angry_Birds_Seasons), and [Rio](https://en.wikipedia.org/wiki/Angry_Birds_Rio). **Fresh access to all three pages returned HTTP 403 in this environment.** No video/frame-by-frame reference capture or external numerical measurement was possible. Consequently these are reference pointers, not quotations from pages retrieved during this pass. Timing, exact friction, mass, damage thresholds, crush calculations and per-level star thresholds are our own tunable choices. A later hands-on comparison can refine feel without changing these rules.

| Area | Established reference behavior | Intended Plush Siege behavior / explicit implementation choice |
| --- | --- | --- |
| Sling | Drag a loaded character away from the target, then release; pull direction is opposite launch direction. | Mouse/touch drag; bounded pull, small-drag cancellation and ballistic guide. No second launch during an unresolved shot. |
| Flight | Gravity curves the trajectory; birds have different roles and some have a once-per-flight tap ability. | Mallow is balanced with a modest hop; Pip dashes along his velocity; Bruno is heavy and can stomp; Clover splits into three. These four animal designs/abilities are original combinations. |
| Material | Wood, glass/ice-like structures and stone differ in durability, weight and breakage. Pieces rotate and collapse; hitting a support may be better than hitting the target. | Matter rigid bodies, normal contact-energy damage, distinct materials, delayed fracture and collidable large fragments. Our densities, health, fragment limits and energy scale are not reference-game constants. |
| Targets | Ordinary targets are physical: they fall when unsupported and may die from debris, falls, collisions or explosions without a direct bird hit. | Every ordinary monster is a dynamic body. Sleeping is an optimization, not suspension: support loss must wake it. The renderer reads its live body position and angle. |
| Indirect damage | Falling beams, heavy blocks, collateral collisions, target falls and blasts can clear targets. Gentle contact alone is not a defeat condition. | Direct and indirect impacts share the same damage pipeline. Contact normal, closing speed, effective mass and angular motion matter. Landing impacts, qualified compression and blasts use that pipeline; resting contact does not accumulate damage. |
| Continuity | Destruction continues after the initial shot; disconnected structures remain dangerous. | Wake contact dependents when supports change; preserve momentum and collisions. Retain spent stuffies and load-bearing fragments between shots. No visual-only monster movement or arbitrary teleport to the ground. |
| Explosives | Explosions cause direct damage plus moving debris/chain reactions. | TNT applies radial impulse and attenuated damage; nearby blocks remain secondary physical hazards. Blast radius/strength are ours. |
| Resolution | A shot has time to finish its chain reactions. Victory requires eliminating the required targets; using the last projectile is not instant failure. | Wait for meaningful motion, support wakeups and pending fracture/damage to settle. No forced 22-second failure cutoff. Bonus applied once on completion. |
| Scoring | Destruction and target defeats score points; unused characters reward efficient clears; stars depend on the level's score thresholds. | Monsters 5,000; wood 500, glass 600, stone 800, TNT 1,000; **unused stuffies 3,000 each**. This bonus is a deliberate Plush Siege choice, not a claim of matching the reference. Only original structural pieces score, preventing fragment farming. |
| Progress | Levels are replayable; a better clear improves local records. | All 24 introductory levels remain available; preserve best score/stars and settings under the existing save key. No account, energy system or paid services. |

## Physics invariants

1. Ordinary monsters have finite mass, gravity, active collision filters, angular motion and collision health. They never become static to make a level easier.
2. Sleep cannot outlive support. Removing, fracturing or moving a supporting body must wake the affected physical contact island, including stacked targets.
3. A removed sleeping support cannot silently leave a floating target or allow a false failure result.
4. Significant direct, structural, landing and secondary impacts may damage a monster. Tangential sliding, a gentle drop and ordinary resting contact must not deal repeated damage.
5. Crushing requires meaningful dynamic compression/loading; a resting roof is not a timed death zone. Damage source and amount are inspectable in the scenario lab.
6. Large physical pieces persist until real fracture, leaving bounds or qualified settled-debris cleanup. Budget limits do not delete a large structural support.
7. Graphics follow the actual body's position/rotation. Impact, danger and defeat expressions are cosmetic and cannot change collision results.
8. All randomness is presentation-only. Physics verification uses reproducible fixtures and actual Matter steps.

## Verification

`npm test` covers headless rules and the ten monster scenarios. The visual physics lab (`physics-lab.html`) uses the same `Simulation` and `SiegeScene` as the game, with deterministic rig actions, stepping and body overlays. `npm run test:monsters` checks the rendered scenarios; the existing browser/input, destruction, editor and offline suites remain relevant. Lab support withdrawal and initial test impulses are explicit rig actions, never target teleportation or fake gravity.

These checks demonstrate the selected behavior; they do not establish exact reference-game timing, ideal difficulty, or physical iPad Safari performance. The 24-level campaign is retained as introductory/test content; sophisticated content production is deferred.
