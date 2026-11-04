# Slingshot destruction design research — Pass 5

## What was actually inspected

On November 4, 2026, the configured proxy rejected a CONNECT request to the [Angry Birds Classic Wikipedia page](https://en.wikipedia.org/wiki/Angry_Birds_(video_game)) with HTTP 403. Fresh commercial gameplay footage, walkthroughs and developer interviews were not accessible through the available tools. No frame-by-frame study of unavailable Classic, Seasons, Rio, Space or Angry Birds 2 levels is claimed here.

The public [Science Birds research game](https://github.com/lucasnfe/Science-Birds), described by its authors as a cover version of Angry Birds, **was accessible**. I inspected its README, actual level definitions 1–4, and its Level1 screenshot at commit `2b253dd36cc9cbc14ee79095c4899adc3888fd20`. This is a research game's composition evidence, not proof of the layouts or exact rules in Rovio's commercial games. The source screenshot and level files are not included in Plush Siege, and their arrangements are not reproduced in the campaign.

Inspected sources, pinned to the inspected revision:

- [Project explanation, materials, ammunition and generation citation](https://github.com/lucasnfe/Science-Birds/blob/2b253dd36cc9cbc14ee79095c4899adc3888fd20/README.md).
- [Level 1 definition](https://github.com/lucasnfe/Science-Birds/blob/2b253dd36cc9cbc14ee79095c4899adc3888fd20/Assets/Resources/Levels/level-1.xml) and [actual screenshot](https://github.com/lucasnfe/Science-Birds/blob/2b253dd36cc9cbc14ee79095c4899adc3888fd20/Docs/Level1.png).
- [Level 2 definition](https://github.com/lucasnfe/Science-Birds/blob/2b253dd36cc9cbc14ee79095c4899adc3888fd20/Assets/Resources/Levels/level-2.xml).
- [Level 3 definition](https://github.com/lucasnfe/Science-Birds/blob/2b253dd36cc9cbc14ee79095c4899adc3888fd20/Assets/Resources/Levels/level-3.xml).
- [Level 4 definition](https://github.com/lucasnfe/Science-Birds/blob/2b253dd36cc9cbc14ee79095c4899adc3888fd20/Assets/StreamingAssets/Levels/level-4.xml).

The README cites Ferreira and Toledo, *A Search-based Approach for Generating Angry Birds Levels*, CIG 2014. That citation was inspected; the paper itself was not retrieved or treated as newly read evidence.

## Concrete composition observations and conclusions

| Inspected composition | Visible/data evidence | Actionable conclusion for our original designs |
| --- | --- | --- |
| Science Birds 1: one exposed elevated target, a narrow vertical timber on a wider foot, and a powder crate to the left | The screenshot agrees with the compact level definition: only a few objects, generous empty space, distinct elevation and an obvious support. The source ammunition is two regular shots and a splitting shot. | A teaching stage needs a clear relation between target and support. Direct attack, toppling and nearby powder suggest alternatives; this geometry alone does not establish which shots actually win. Use compact readable stages between harder sieges. |
| Science Birds 2: a target above a large static platform | The definition separates high target elevation from the slingshot and provides four different projectile types. The platform is static rather than a pile of destructible scenery. | Terrain can change the attack problem without adding many blocks. Teach high/low approaches, exposed perches and useful trajectory inspection. Avoid treating every large obstacle as destructible. |
| Science Birds 3: two narrow columns built from repeated timber, enclosing a dense vertical cluster of twelve targets | Six timber pieces form each side; the protected targets occupy the space between them at several heights. | A load path can protect many objectives with a small amount of architecture. It also exposes the rubble-excavation failure mode: if collapsed material cannot finish a trapped target, an apparently successful demolition becomes frustrating. Separate target protection from artificial survival. Do not reuse dense cages as the default pattern. |
| Science Birds 4: a compact central mixed-material structure flanked by narrow elevated timber stacks | Three targets occupy three distinct architectural sections. Stone protects the center, timber carries the side perches, and ammunition alternates explosive and regular shots. | Give different sections different jobs and vulnerabilities. Let an opening shot choose between an easier flank and the protected core. A skyline, separated target groups and meaningful material placement create variety without a single enormous rectangular grid. |

These are geometry observations and design deductions, not claims that I played or solved those reference levels. Proposed attack routes are hypotheses unless tested in our own simulator.

## Reference-family principles and confidence

The following are established broad descriptions, rather than newly inspected commercial level examples. Links are reference pointers for later footage review, not evidence that those pages were accessible in this session.

| Reference | Broad principle | Original application; verification needed |
| --- | --- | --- |
| [Angry Birds Classic](https://en.wikipedia.org/wiki/Angry_Birds_(video_game)) | Readable support failures, finite ammunition and projectile/material affordances make observation rewarding. | A weak foot, brace or fastener should be physically important and broad enough to attack. Record a successful initiating route and show what its destruction actually releases. |
| [Angry Birds Seasons](https://en.wikipedia.org/wiki/Angry_Birds_Seasons) | Theme and terrain can change a familiar destruction grammar. | Frozen Folly's sliding floors are an original mechanic, not a claim that seasonal artwork automatically changes reference-game friction. Make its momentum path indispensable to a useful route. |
| [Angry Birds Rio](https://en.wikipedia.org/wiki/Angry_Birds_Rio) | Objective framing and target placement can change while launch fundamentals stay familiar. | Place objectives on perches, inside suspended chambers and across elevations. Do not increase difficulty merely by stacking more protected targets in one shaft. |
| [Angry Birds Space](https://en.wikipedia.org/wiki/Angry_Birds_Space) | Local gravity makes path planning and approach direction central. | Put targets around curved surfaces, suspended loads in wells and debris between fields. Show field boundaries. An ordinary tower with a space backdrop does not meet this goal. |
| [Angry Birds 2](https://en.wikipedia.org/wiki/Angry_Birds_2) | A sequence of encounters and changing resources can create a campaign rhythm. | Alternate teaching, reinforcement, experiments, challenge, spectacle and mastery. Our fixed queue remains our own system; no card-deck behavior is claimed or copied. |
| Science Birds and its generation workflow | Level data can express geometry, materials, terrain and ammunition independently of artwork. | Reusable assemblies assist authoring. A generated candidate is not accepted until its stability, real mechanism and winning route are verified. A solver is not a fun evaluator. |

## Plush Siege design rules

1. **Start with a verb and a consequence.** Release a weight, slide a sled, cut a coupler, open a sluice, swing a bell, bend a shot. The architecture should make that causal plan visible.
2. **Protect targets with useful failure paths.** Their shelter should become the attack when it collapses. Genuine pinned rubble should defeat them; a monster that escapes should remain alive.
3. **Make mechanisms earn their space.** Record a causal route that actually uses the advertised force, joint or hazard. A direct alternative is welcome; a decorative machine with no useful effect is not.
4. **Change the load path and silhouette.** Domes, articulated arches, triangular frames, cable-stayed decks, counterbalances, cliffs, bunkers and radial stations should fail differently. Different heights in the same post-and-roof grid are insufficient.
5. **Give the player room to experiment.** Large weak regions, useful imperfect shots, a forgiving completion queue and separate efficiency goals are preferable to arbitrary pixel shots. Demonstrations can be easy and still memorable.
6. **Build scale through interaction.** Multiple architectural sections need a transfer of weight, collision, suspension, momentum or environment between them. Empty distance and a row of unrelated powder crates are not a chain reaction.
7. **Keep the player oriented.** Start large sieges in overview, keep sling focus immediate, preserve predictable camera behavior, and distinguish foreground interactive parts from background art.
8. **Judge the result honestly.** Initial stability, winning witnesses, causal depth, material/shape variety and affected sections are useful evidence. They do not establish enjoyment, pacing or multiple human-discoverable solutions.

## Required review for each composition

Record its premise, progression role, architectural family, weak points, structural sections and intended physical route. Identify whether the world mechanic is essential, helpful or merely present. Inspect the rendered silhouette and a real destruction sequence. Check initial stability, harmless misses, turn completion, target survival/crushing, useful alternate approaches and body/particle budgets. Retain successful early teaching stages; replace redundant later arrangements rather than protecting them because they already exist.

Remaining research: fresh commercial gameplay/screenshot walkthrough study, physical iPad play, human difficulty/choice review, and listening/comfort review. These remain explicitly unverified where access or hardware is unavailable.
