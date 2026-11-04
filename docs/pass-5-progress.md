# Pass 5 checkpoint

Baseline: published 0.4.0 at `103f31648f498facc3aac4d23461c74495bd48d9` (70 levels). The assignment is saved in the workspace attachments, not shipped in this repository.

Completed authoring and physics milestones:

- Sustained compression follows actual opposing contacts, supported weight shares and measured reactions. It handles sleeping rubble and release without overlap damage. Load traversal uses bounded graph reachability and conservative memoized paths through cycles.
- The physics lab has 18 rigs, including seven compression/impact/fall controls. Live-target turns have no global timeout. A result appears after the objective is physically complete even if harmless rubble continues moving. Contact-supported debris is retained in local gravity.
- All 70 prior stages were reviewed: 51 retained, 19 redesigned with stable IDs. Fifteen additions include five world benchmarks. Campaign total: 85 (Meadow 33, each other world 13).
- All 85 passed schema, idle, miss, budget and winning-replay gates before promotion. New mechanism tests use real projectile inputs and disabled-mechanic controls.
- New gable, bowstring and cable templates are available in the workshop. Import preserves design notes; subsequent edits remove stale references, and undo restores them.
- The camera follows significant collapse activity after the stuffie lands and respects manual inspection. Heat and radial-field presentation received small readability improvements.
- Research and the complete review are in `LEVEL_DESIGN_RESEARCH.md` and `LEVEL_DESIGN_REVIEW.md`. No third-party layouts or artwork were copied.

Current verified checkpoint: 154 unit/content checks passed; the workshop passed 59 browser checks; the five showcases cleared in the actual scene at desktop and iPad-sized layouts (44 checks). Browser ice and orbital routes used an available follow-up shot; both stayed within their launch queues. Exact Node/browser contact outcomes are not claimed identical. The final-shot heat regression verifies that a stationary burning fastener can finish its physical release before the turn ends.

The broader game, destruction, monster, camera, audio and retained-showcase browser regressions passed. Five-world navigation passed 185 checks, production offline play passed 18, and responsive presentation passed 40. All 85 winning Node replays peaked at 90 entities and 46 fragments; the maximum per-level p95 physics step cost was 1.924 ms on this host. Evidence is archived in `docs/verification/pass-5/`.

Real-animation-loop measurements also completed: 53.3–60.1 mean FPS in short scene-only software-Canvas samples, with host stalls retained. These exclude HUD/audio and are not device performance guarantees.

Remaining release work: build and verify the 0.5.0 browser ZIP, and publish the tested source to GitHub. Do not publish a cloud environment or website.

Human follow-up: physical iPad performance/touch/audio/offline installation and subjective campaign playtesting. The optional 30–50 new-level target was reduced to 15 verified additions; further expansion should use fresh premises and playtest evidence.
