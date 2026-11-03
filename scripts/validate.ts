/** Reproducible headless content audit. Uses the SAME Simulation as the game.
 * Sampled solutions are evidence of solvability; misses do not prove impossibility or fun.
 */
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { campaign } from '../src/content/campaign';
import { validateLevel } from '../src/content/validate';
import { Simulation } from '../src/game/physics';
import type { Level, StuffieKind } from '../src/game/types';

type Shot = { x: number; y: number; abilityAt: number | null };
function finishShot(sim: Simulation, shot: Shot) {
  if (!sim.launch(shot)) throw new Error('Solution replay failed to launch.');
  for (let frame = 0; frame < 1400 && sim.phase === 'flying'; frame++) {
    if (frame === shot.abilityAt) sim.activate();
    sim.step();
  }
  if (sim.phase === 'flying') throw new Error('Simulation did not resolve within 1400 frames.');
}
function candidates(kind: StuffieKind): Shot[] {
  const shots: Shot[] = [];
  for (const strength of [0.6, 0.8, 1])
    for (const degrees of [-4, 0, 7, 14, 22, 32, 45, 58]) {
      const a = (degrees * Math.PI) / 180;
      for (const abilityAt of kind === 'sheep' ? [null] : [null, kind === 'bear' ? 35 : 20])
        shots.push({
          x: -102 * strength * Math.cos(a),
          y: 102 * strength * Math.sin(a),
          abilityAt,
        });
    }
  return shots;
}
function solve(level: Level) {
  const chosen: Shot[] = [];
  let attempts = 0;
  let bestWin: { solved: boolean; score: number; shots: Shot[]; attempts: number } | undefined;
  for (let shotIndex = 0; shotIndex < level.projectiles.length; shotIndex++) {
    let best: { shot: Shot; value: number } | undefined;
    for (const shot of candidates(level.projectiles[shotIndex])) {
      const sim = new Simulation(level);
      for (const previous of chosen) finishShot(sim, previous);
      finishShot(sim, shot);
      attempts++;
      const value = (level.monsters.length - sim.remainingMonsters) * 100000 + sim.score;
      if (sim.phase !== 'won' && (!best || value > best.value)) best = { shot, value };
      if (sim.phase === 'won') {
        const result = { solved: true, score: sim.score, shots: [...chosen, shot], attempts };
        if (!bestWin || result.score > bestWin.score) bestWin = result;
        if (sim.score >= level.thresholds[2]) {
          sim.dispose();
          return { ...result, threeStars: true };
        }
      }
      sim.dispose();
    }
    if (best) chosen.push(best.shot);
    else break;
  }
  return bestWin
    ? { ...bestWin, attempts, threeStars: false }
    : { solved: false, score: null, shots: chosen, attempts, threeStars: false };
}
const started = performance.now(),
  report = [];
let invalid = 0,
  unstable = 0;
for (const level of campaign) {
  const issues = validateLevel(level);
  if (issues.length) {
    invalid++;
    console.error(level.id, issues);
    report.push({ id: level.id, issues });
    continue;
  }
  const sim = new Simulation(level);
  const initial = new Map(
    [...sim.entities.values()].map((e) => [e.id, { x: e.body.position.x, y: e.body.position.y }]),
  );
  let maxBodies = sim.entities.size;
  for (let i = 0; i < 300; i++) {
    sim.step();
    maxBodies = Math.max(maxBodies, sim.entities.size);
  }
  const displaced = [...sim.entities.values()]
    .filter((e) => {
      const p = initial.get(e.id)!;
      return Math.hypot(e.body.position.x - p.x, e.body.position.y - p.y) > 8;
    })
    .map((e) => e.id);
  const stable =
    sim.remainingMonsters === level.monsters.length && sim.score === 0 && displaced.length === 0;
  if (!stable) unstable++;
  sim.dispose();
  const search = solve(level);
  report.push({
    id: level.id,
    name: level.name,
    valid: true,
    stable,
    displaced,
    maxBodies,
    ...search,
  });
  console.log(
    `${level.id} ${level.name}: schema PASS; stability ${stable ? 'PASS' : 'FAIL'}; sampled solution ${search.solved ? `FOUND (${search.shots.length} shots, ${search.score} points, ${search.threeStars ? '3 stars' : 'under 3 stars'})` : 'NOT FOUND'}; ${search.attempts} attempts`,
  );
}
fs.mkdirSync('artifacts', { recursive: true });
const solved = report.filter((r) => 'solved' in r && r.solved).length;
const threeStars = report.filter((r) => 'threeStars' in r && r.threeStars).length;
fs.writeFileSync(
  'artifacts/campaign-validation.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started),
      summary: {
        levels: campaign.length,
        invalid,
        unstable,
        solved,
        threeStars,
        unsolved: campaign.length - solved,
      },
      note: 'Greedy finite sampled search. A miss is unproven solvability, not proof of impossibility. Human playtesting is still required.',
      levels: report,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `\n${campaign.length} levels: ${invalid} invalid, ${unstable} unstable, ${solved} sampled solutions found. Report: artifacts/campaign-validation.json`,
);
if (invalid || unstable) process.exitCode = 1;
