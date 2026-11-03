/** Reproducible headless content audit. Uses the SAME Simulation as the game.
 * Sampled solutions are evidence of solvability; misses do not prove impossibility or fun.
 */
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { introCampaign as campaign } from '../src/content/campaign';
import solutionFixtures from '../tests/fixtures/campaign-solutions.json';
import { validateLevel } from '../src/content/validate';
import { Simulation } from '../src/game/physics';
import type { Level, StuffieKind } from '../src/game/types';

export type Shot = { x: number; y: number; abilityAt: number | null };
/** Compare against authored coordinates, including movement hidden by constructor warm-up. */
export function auditStability(level: Level, frames = 300) {
  const authored = new Map(
    [...level.blocks, ...level.monsters, ...level.hazards].map((def) => [def.id, def]),
  );
  const observed = new Map<string, { displacement: number; rotation: number }>();
  const sim = new Simulation(level);
  let maxBodies = sim.entities.size;
  let initialDisplacement = 0;
  const sample = () => {
    maxBodies = Math.max(maxBodies, sim.entities.size);
    for (const entity of sim.entities.values()) {
      const def = authored.get(entity.id);
      if (!def) continue;
      const previous = observed.get(entity.id) || { displacement: 0, rotation: 0 };
      const displacement = Math.hypot(
        entity.body.position.x - def.x,
        entity.body.position.y - def.y,
      );
      // Round monsters may roll harmlessly; rotation measures only structural bodies.
      const authoredAngle = 'angle' in def ? def.angle || 0 : 0;
      const rotation = entity.type === 'monster' ? 0 : Math.abs(entity.body.angle - authoredAngle);
      observed.set(entity.id, {
        displacement: Math.max(previous.displacement, displacement),
        rotation: Math.max(previous.rotation, rotation),
      });
    }
  };
  sample();
  initialDisplacement = Math.max(0, ...[...observed.values()].map((value) => value.displacement));
  for (let frame = 0; frame < frames; frame++) {
    sim.step();
    sample();
  }
  const displaced = [...observed]
    .filter(([, value]) => value.displacement > 8 || value.rotation > 0.12)
    .map(([id, value]) => ({ id, ...value }));
  const currentIds = new Set([...sim.entities.values()].map((entity) => entity.id));
  const missing = [...authored.keys()].filter((id) => !currentIds.has(id));
  const result = {
    stable:
      sim.remainingMonsters === level.monsters.length &&
      sim.score === 0 &&
      displaced.length === 0 &&
      missing.length === 0,
    initialDisplacement,
    maxDisplacement: Math.max(0, ...[...observed.values()].map((value) => value.displacement)),
    maxRotation: Math.max(0, ...[...observed.values()].map((value) => value.rotation)),
    displaced,
    missing,
    maxBodies,
  };
  sim.dispose();
  return result;
}
export function finishShot(sim: Simulation, shot: Shot, limit = 3600) {
  if (!sim.launch(shot)) throw new Error('Solution replay failed to launch.');
  for (let frame = 0; frame < limit && sim.phase === 'flying'; frame++) {
    if (frame === shot.abilityAt) sim.activate();
    sim.step();
  }
  return sim.phase !== 'flying';
}
function candidates(kind: StuffieKind): Shot[] {
  const shots: Shot[] = [];
  for (const strength of [0.6, 0.8, 1, 0.9])
    for (const degrees of [-4, 0, 7, 14, 22, 32, 45, 58]) {
      const angle = (degrees * Math.PI) / 180;
      for (const abilityAt of [
        null,
        ...(kind === 'bear' ? [35, 45] : kind === 'sheep' ? [20, 35, 50] : [20, 35]),
      ])
        shots.push({
          x: -102 * strength * Math.cos(angle),
          y: 102 * strength * Math.sin(angle),
          abilityAt,
        });
    }
  return shots;
}
export function solve(level: Level) {
  const known = solutionFixtures.levels.find((fixture) => fixture.id === level.id);
  if (known) {
    const replay = new Simulation(level);
    let accepted = true;
    for (const shot of known.shots) {
      if (
        replay.phase !== 'aiming' ||
        !finishShot(replay, shot) ||
        (shot.abilityAt !== null && !replay.abilityUsed)
      ) {
        accepted = false;
        break;
      }
    }
    const valid =
      accepted &&
      replay.phase === 'won' &&
      replay.score >= level.thresholds[2] &&
      known.shots.length <= (level.par || level.projectiles.length);
    const score = replay.score;
    replay.dispose();
    if (valid)
      return {
        solved: true,
        score,
        shots: known.shots,
        attempts: 1,
        timedOutAttempts: 0,
        threeStars: true,
        source: 'verified regression fixture',
      };
  }

  let beam: Shot[][] = [[]];
  let attempts = 0,
    timedOutAttempts = 0;
  let bestWin: { solved: boolean; score: number; shots: Shot[] } | undefined;
  let bestPartial: Shot[] = [];
  for (let shotIndex = 0; shotIndex < level.projectiles.length; shotIndex++) {
    const next: { shots: Shot[]; value: number }[] = [];
    for (const chosen of beam)
      for (const shot of candidates(level.projectiles[shotIndex])) {
        const sim = new Simulation(level);
        let resolved = true;
        for (const previous of chosen)
          if (!finishShot(sim, previous)) {
            resolved = false;
            break;
          }
        if (resolved) resolved = finishShot(sim, shot);
        attempts++;
        if (!resolved) {
          timedOutAttempts++;
          sim.dispose();
          continue;
        }
        const route = [...chosen, shot];
        if (sim.phase === 'won') {
          const win = { solved: true, score: sim.score, shots: route };
          if (!bestWin || win.score > bestWin.score) bestWin = win;
          if (sim.score >= level.thresholds[2]) {
            sim.dispose();
            return {
              ...win,
              attempts,
              timedOutAttempts,
              threeStars: true,
              source: 'finite sampled search',
            };
          }
        } else if (sim.phase === 'aiming') {
          const injured = [...sim.entities.values()]
            .filter((entity) => entity.type === 'monster')
            .reduce((sum, entity) => sum + 1 - Math.max(0, entity.health) / entity.maxHealth, 0);
          const value =
            (level.monsters.length - sim.remainingMonsters) * 1000000 +
            injured * 150000 +
            sim.score;
          next.push({ shots: route, value });
        }
        sim.dispose();
      }
    next.sort((a, b) => b.value - a.value);
    // Keep several distinct first-shot strategies rather than commit to one greedy shot.
    const selected = [];
    const seen = new Set<string>();
    for (const candidate of next) {
      const signature = candidate.shots
        .map((shot) => `${Math.round(shot.x / 8)},${Math.round(shot.y / 8)},${shot.abilityAt}`)
        .join(';');
      if (seen.has(signature)) continue;
      seen.add(signature);
      selected.push(candidate.shots);
      if (selected.length === 3) break;
    }
    if (!selected.length) break;
    beam = selected;
    bestPartial = selected[0];
  }
  return bestWin
    ? { ...bestWin, attempts, timedOutAttempts, threeStars: false, source: 'finite sampled search' }
    : {
        solved: false,
        score: null,
        shots: bestPartial,
        attempts,
        timedOutAttempts,
        threeStars: false,
        source: 'finite sampled search',
      };
}
export function runAudit() {
  const started = performance.now();
  const report = [];
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
    const stability = auditStability(level);
    if (!stability.stable) unstable++;
    const search = solve(level);
    // Replay the reported full sequence independently and preserve real ability acceptance.
    const replay = new Simulation(level);
    const fullSequence = [];
    const stepCosts: number[] = [];
    let peakBodies = replay.engine.world.bodies.length,
      peakFragments = 0;
    const replayStarted = performance.now();
    for (let i = 0; i < search.shots.length; i++) {
      const shot = search.shots[i];
      const kind = replay.nextKind;
      let abilityActivated = false;
      if (!replay.launch(shot))
        throw new Error(`${level.id}: reported shot ${i + 1} failed to launch`);
      for (let frame = 0; frame < 3600 && replay.phase === 'flying'; frame++) {
        if (frame === shot.abilityAt) abilityActivated = replay.activate();
        const stepStarted = performance.now();
        replay.step();
        stepCosts.push(performance.now() - stepStarted);
        peakBodies = Math.max(peakBodies, replay.engine.world.bodies.length);
        peakFragments = Math.max(
          peakFragments,
          [...replay.entities.values()].filter((entity) => entity.type === 'fragment').length,
        );
      }
      fullSequence.push({
        index: i + 1,
        kind,
        ...shot,
        abilityAfterMs: shot.abilityAt === null ? null : (shot.abilityAt * 1000) / 60,
        abilityActivated,
        resultingPhase: replay.phase,
        remainingMonsters: replay.remainingMonsters,
        score: replay.score,
      });
    }
    const replayVerified = search.solved
      ? replay.phase === 'won' && replay.score === search.score
      : null;
    const sortedCosts = [...stepCosts].sort((a, b) => a - b);
    const solutionMetrics = {
      fixedSteps: stepCosts.length,
      simulationMs: replay.time,
      wallMs: performance.now() - replayStarted,
      peakBodies,
      peakFragments,
      avgStepMs: stepCosts.reduce((sum, cost) => sum + cost, 0) / (stepCosts.length || 1),
      p95StepMs: sortedCosts[Math.floor(sortedCosts.length * 0.95)] || 0,
    };
    replay.dispose();
    report.push({
      id: level.id,
      name: level.name,
      valid: true,
      ...stability,
      ...search,
      fullSequence,
      replayVerified,
      efficient: search.shots.length <= (level.par || level.projectiles.length),
      solutionMetrics,
    });
    console.log(
      `${level.id} ${level.name}: schema PASS; authored stability ${stability.stable ? 'PASS' : 'FAIL'} (peak ${stability.maxDisplacement.toFixed(2)}px); sampled solution ${search.solved ? `FOUND (${search.shots.length} shots, ${search.score} points, ${search.threeStars ? '3 stars' : 'under 3 stars'})` : 'NOT FOUND'}; ${search.attempts} attempts`,
    );
  }
  fs.mkdirSync('artifacts', { recursive: true });
  const solved = report.filter((result) => 'solved' in result && result.solved).length;
  const threeStars = report.filter((result) => 'threeStars' in result && result.threeStars).length;
  const replayFailures = report.filter(
    (result) => 'replayVerified' in result && result.replayVerified === false,
  ).length;
  const inefficient = report.filter((result) => 'efficient' in result && !result.efficient).length;
  const peakBodies = Math.max(
    0,
    ...report.map((result) =>
      'solutionMetrics' in result ? result.solutionMetrics.peakBodies : 0,
    ),
  );
  const maxP95StepMs = Math.max(
    0,
    ...report.map((result) => ('solutionMetrics' in result ? result.solutionMetrics.p95StepMs : 0)),
  );
  const summary = {
    levels: campaign.length,
    invalid,
    unstable,
    solved,
    threeStars,
    inefficient,
    unsolved: campaign.length - solved,
    replayFailures,
    peakBodies,
    maxP95StepMs,
  };
  fs.writeFileSync(
    'artifacts/campaign-validation.json',
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started),
        summary,
        note: 'Finite sampled width-three beam search, including real ability activation. Every reported win is independently replayed. Stability compares authored positions before any constructor warm-up. A search miss is unproven solvability, not proof of impossibility. Human playtesting is still required.',
        levels: report,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `\n${campaign.length} levels: ${invalid} invalid, ${unstable} unstable, ${solved} sampled solutions, ${threeStars} three-star routes. Report: artifacts/campaign-validation.json`,
  );
  if (
    invalid ||
    unstable ||
    solved !== campaign.length ||
    threeStars !== campaign.length ||
    replayFailures ||
    inefficient
  )
    process.exitCode = 1;
  return { summary, levels: report };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runAudit();
