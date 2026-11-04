# Campaign design review — Pass 5

Baseline: 70 published levels at `103f31648f498facc3aac4d23461c74495bd48d9`. Review covered the actual source geometry, load paths, target positions, ammo, terrain and mechanisms, using the research rubric in [LEVEL_DESIGN_RESEARCH.md](LEVEL_DESIGN_RESEARCH.md). This is an authoring review; automated clears alone cannot establish enjoyment.

Decision: retain 51 compositions, replace 19, preserve every existing ID and the first-stuffie unlock sequence. Add 15 individually gated stages, including five benchmarks, for an accepted 85-stage campaign. The optional 30–50 expansion target is not met in this pass; a larger pack needs more distinct designs and human playtesting.

The acceptance journal is produced by `npm run audit:siege`. A stage must validate, survive 20 idle seconds without free destruction, return control after two deliberate misses, and independently replay a winning route. Intro stages additionally require efficient three-star clears. Exact scores can change with the corrected physics and redesigned geometry; existing saved stars and IDs remain available.

| Original stage | Decision | Design reason |
|---|---|---|
| meadow-01 · A Soft Landing | Retain | Keep the first pull-and-release exercise small and readable. |
| meadow-02 · Double Trouble | Retain | Keep two separated targets to teach carrying momentum into a second structure. |
| meadow-03 · Top of the Morning | Retain | Keep the exposed rooftop guest as the first vertical targeting lesson. |
| meadow-04 · The Wobbly Duplex | Retain | Keep the first stacked load path: a foundation hit affects both floors. |
| meadow-05 · Through the Looking Glass | Retain | Keep the clean first glass comparison. |
| meadow-06 · Window Shopping | Retain | Keep a short glass demolition reward after the material lesson. |
| meadow-07 · Roof Service | Retain | Keep the three-floor collapse as early reinforcement. |
| meadow-08 · Express Delivery | Retain | Keep Pip’s first dash lesson and its existing unlock position. |
| meadow-09 · High Society | Replace | Replace another rectangular loft with a triangular tension frame. |
| meadow-10 · A Gap in the Market | Replace | Replace three repeated rooms with a hinged counterweight and fragile prop. |
| meadow-11 · Hard as a Rock | Retain | Keep the first heavy-ceiling material lesson. |
| meadow-12 · Bear Necessities | Retain | Keep Bruno’s first stomp and the established unlock order. |
| meadow-13 · The Glass Elevator | Replace | Replace the elevator stack with an actual suspended stone-roof room and broad glass fastener. |
| meadow-14 · Knock Knock | Retain | Keep the protected low entrance as a material/trajectory challenge. |
| meadow-15 · Three Is Company | Retain | Keep Clover’s first spread lesson unobstructed. |
| meadow-16 · Rabbit, Rabbit, Rabbit | Replace | Give the split shot two gabled structures on different terrain elevations. |
| meadow-17 · Pop Goes the Castle | Retain | Keep the first TNT demonstration clear and generous. |
| meadow-18 · A Chain of Bad Ideas | Retain | Keep the first linked blast lesson; later benchmarks use longer physical mechanisms. |
| meadow-19 · Little Towers, Big Feelings | Replace | Replace duplicate towers with a corbelled base carrying two wooden storeys. |
| meadow-20 · The Long Way Round | Retain | Keep the open lower room and upper loft as a change of aiming height. |
| meadow-21 · Fort Pillow | Retain | Keep a compact reinforced bunker as a harder material challenge. |
| meadow-22 · Cloud Nine | Replace | Replace another tall stack with three cable-stayed balconies and destructible couplers. |
| meadow-23 · The Bridge Club | Retain | Keep the shared roof as a short load-path reinforcement. |
| meadow-24 · Meadow Mayhem | Replace | Replace the repeated small-room finale with a real bowstring truss and a dependent hanging court; keep guests in its central bays. |
| meadow-25 · The Tollbooth | Retain | Keep the exposed trestle and separate gatehouse as the first larger bridge puzzle. |
| meadow-26 · Swinging Lunch | Retain | Keep the short linked suspension to teach breakable cables. |
| meadow-27 · An Unbalanced Friendship | Retain | Keep the larger counterweight and neighbor as an extension of the new picnic lever. |
| meadow-28 · Stone Delivery | Retain | Keep the parked stone, slope and postal structures as a rolling-mass exercise. |
| meadow-29 · The Crooked Aqueduct | Retain | Keep the corbel arch, uneven neighboring wings and heavy materials. |
| meadow-30 · The Meadow Machine | Retain | Keep one large classic arcade with real shared piers and underfloor powder; the new kingdom adds a different bridge silhouette. |
| frozen-01 · Skate Expectations | Retain | Keep the short introduction to fragile ice feet. |
| frozen-02 · The Glass Lake | Retain | Keep the broad brittle deck as an accessible bridge exercise. |
| frozen-03 · Curling Club | Retain | Keep the single curling stone to isolate low-friction momentum. |
| frozen-04 · Frostbite Ferry | Retain | Keep the moving ferry and fixed dock as a timing experiment. |
| frozen-05 · Icicle Express | Retain | Keep the ice suspension as brittle-deck reinforcement. |
| frozen-06 · Bank Shot Bay | Retain | Keep the slope and shield as a high/low trajectory choice. |
| frozen-07 · Cold Storage | Replace | Replace stacked metal lids with a steel gable, broad annex and movable delivery stone on ice. |
| frozen-08 · Avalanche Avenue | Retain | Keep the generous boulder/blast street as demolition relief, not the new world benchmark. |
| frozen-09 · The Long Slide | Replace | Replace similar storage towers with a mirrored counterweight sending a stone down an icy deck toward a receiving pavilion. |
| frozen-10 · Glacier Opera | Retain | Keep the city borne on three brittle arch caps and a connected skyway. |
| molten-01 · Toast of the Town | Retain | Keep the small introduction to pushing timber toward a heat band. |
| molten-02 · Mind the Gap | Retain | Keep the safe ledge above a clearly visible lava landing. |
| molten-03 · Pressure Problems | Retain | Keep the tested physical valve, vent and breaching-stone route. |
| molten-04 · Hot Potato | Replace | Make the advertised hot powder literal: release a powder-laden platform into lava beside the storehouse. |
| molten-05 · Basalt Bathtub | Replace | Replace a conventional room inside an arch with a sliding timber floor that carries the basalt vault into a heat failure. |
| molten-06 · Chimney Sweep | Retain | Keep the upper keep and updraft as a vertical aiming challenge. |
| molten-07 · Double Boiler | Retain | Keep the tested shared valve powering two physical stones. |
| molten-08 · The Red Carpet | Retain | Keep the broad powder street as a generous demolition interlude. |
| molten-09 · Magma Machine | Retain | Keep the tested triggered iron hammer as an introduction to driven machinery. |
| molten-10 · Volcano Orchestra | Retain | Keep the tall factory and alternate vent/stone breach; the new benchmark combines heat and suspension rather than repeating this arcade. |
| haunted-01 · Swing Vote | Retain | Keep the uncomplicated first chandelier suspension. |
| haunted-02 · The Pendulum Room | Retain | Keep one hanging stone to teach a secondary pendulum impact. |
| haunted-03 · Graveyard Shift | Retain | Keep the real traveling platform and fixed clocktower as a timing level. |
| haunted-04 · A Creak in the Floor | Retain | Keep the hinged trapdoor and counterweight. |
| haunted-05 · The Crooked Manor | Retain | Keep one substantial manor with shared floors and piers. |
| haunted-06 · Possessed Carousel | Retain | Keep the tested switch-driven carousel. |
| haunted-07 · Chain Letter | Replace | Replace world-anchored balcony repetition with five decks carried by physical pylons and destructible couplers. |
| haunted-08 · Spooky Action | Retain | Keep the gravity pocket as a clearly labeled experiment; its subjective usefulness still needs human playtesting. |
| haunted-09 · Midnight Bells | Replace | Replace the uniform music hall with a gabled cathedral, three rafter-mounted iron bells and a bolted destructible floor tie. |
| haunted-10 · The House That Fell | Replace | Replace the repeated giant arcade with a wide cable mansion above a crypt. |
| orbital-01 · A Little Less Gravity | Retain | Keep one flat low-gravity teaching stage before changing the support geometry. |
| orbital-02 · Moon Bounce | Retain | Keep the first moon bending the approach to a conventional landing zone. |
| orbital-03 · Two Small Worlds | Replace | Replace ground towers with targets actually standing on two curved moon surfaces. |
| orbital-04 · The Long Way Home | Retain | Keep the zero-gravity transit corridor and distant landing challenge. |
| orbital-05 · Satellite Dish | Replace | Replace anonymous world anchors with a real moon-mounted glass coupler carrying a wide communications deck over open space. |
| orbital-06 · Debris Belt | Replace | Replace two floor stations and a powder line with a floating dock tethered between two gravity wells. |
| orbital-07 · Gravity Staircase | Replace | Replace normal staircase houses with downward and sideways gravity colonies separated by open space. |
| orbital-08 · Tidal Trouble | Retain | Keep the tested rotating satellite and lateral field. |
| orbital-09 · The Slingshot Effect | Retain | Keep the shielded observatory and radial approach challenge. |
| orbital-10 · Orbits End | Replace | Replace the ordinary castle beneath decorative moons with two radial foundries and breakable asteroid clamps. |

## New progression

Each world adds two experiments and one benchmark. The experiments introduce the relevant architectural or mechanical idea before the combined design. Existing easy teaching and generous demolition stages remain between the harder puzzles.

| World | Experiments | Benchmark |
|---|---|---|
| Meadow | Tension Twins; Coupler Crossing | Bowstring Kingdom: destructible bastions, triangulated span, crown ballast and dependent court |
| Frozen | Brake Check; Keelhaul Creek | Sliding Citadel: exposed ice winch releases an armored sled onto an icy incline and into the lower fort |
| Molten | Warm Hinge; Updraft Keep | Furnace Suspension: one valve powers two stones, two heat-sensitive fasteners, suspended workshops and lava landings |
| Haunted | Return to Sender; Long Trapdoor | Bell Engine: motor → bell → bell → hanging house above a chapel |
| Orbital | Crater Neighbors; Sideways Society | Twin Moon Foundry: radial settlements, clamp-braced foundations, fragile greenhouse joints and released asteroids |

## Remaining judgment and device work

The mechanical checks establish stability, physical routes and solvability. Human playtesting must still assess whether a weak point is understood without explanation, whether alternate plans feel rewarding, the rhythm of precision versus spectacle, and fatigue across a world. Desktop and iPad-sized Chromium checks do not establish real iPad frame rate, touch feel, thermals or battery use. No numerical fun score is assigned.
