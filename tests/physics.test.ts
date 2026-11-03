import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { Simulation } from '../src/game/physics';
import { introCampaign as campaign } from '../src/content/campaign';
import { PHYSICS, MATERIALS, STUFFIES } from '../src/game/config';
import type { Level, MaterialKind, StuffieKind } from '../src/game/types';
const run = (s: Simulation, n = 1400) => {
  for (let i = 0; i < n && s.phase === 'flying'; i++) s.step();
};
const basic = (): Level => ({
  ...structuredClone(campaign[0]),
  blocks: [],
  hazards: [],
  monsters: [{ id: 'monster', x: 1300, y: 657, radius: 18 }],
  projectiles: ['sheep'],
});

test('all authored structures stay settled without damage for five idle seconds', () => {
  for (const level of campaign) {
    const sim = new Simulation(level);
    for (let i = 0; i < 300; i++) sim.step();
    assert.equal(sim.remainingMonsters, level.monsters.length, level.id);
    assert.equal(sim.score, 0, level.id);
    for (const e of sim.entities.values()) {
      assert.ok(Number.isFinite(e.body.position.x) && Number.isFinite(e.body.position.y));
      assert.ok(e.body.speed < 0.4, `${level.id} ${e.id} did not settle`);
    }
    sim.dispose();
  }
});
test('launch rejects tiny drags, clamps maximum pull and prevents a second launch in flight', () => {
  const sim = new Simulation(basic());
  assert.equal(sim.launch({ x: -3, y: 0 }), false);
  assert.equal(sim.shots, 0);
  assert.equal(sim.launch({ x: -500, y: 0 }), true);
  assert.ok(Math.abs(sim.current!.body.velocity.x - PHYSICS.maxPull * PHYSICS.launchScale) < 0.01);
  assert.equal(sim.launch({ x: -100, y: 0 }), false);
  assert.equal(sim.shots, 1);
  sim.dispose();
});
test('all four once-per-flight abilities have distinct physical behavior', () => {
  for (const kind of ['sheep', 'duck', 'bear', 'rabbit'] as StuffieKind[]) {
    const level = basic();
    level.projectiles = [kind];
    const sim = new Simulation(level);
    sim.launch({ x: -80, y: 30 });
    assert.equal(sim.activate(), false, 'ability should not fire during release debounce');
    for (let i = 0; i < 10; i++) sim.step();
    const before = { ...sim.current!.body.velocity };
    const count = sim.entities.size;
    assert.equal(sim.activate(), true);
    assert.equal(sim.activate(), false, 'only one ability per shot');
    if (kind === 'duck') assert.ok(sim.current!.body.velocity.x > before.x);
    if (kind === 'bear') {
      assert.equal(sim.current!.body.velocity.y, 24);
      assert.equal(sim.current!.body.density, STUFFIES.bear.density);
    }
    if (kind === 'rabbit') assert.equal(sim.entities.size, count + 2);
    if (kind === 'sheep') assert.ok(sim.current!.body.velocity.y < before.y);
    sim.dispose();
  }
});
test('direct impact defeats target, completes level and awards unused-stuffie bonus', () => {
  const sim = new Simulation(campaign[0]);
  assert.equal(sim.launch({ x: -102, y: 0 }), true);
  run(sim);
  assert.equal(sim.phase, 'won');
  assert.equal(sim.remainingMonsters, 0);
  assert.equal(sim.shots, 1);
  assert.ok(sim.score >= 8000);
  assert.ok(sim.drainEvents().some((e) => e.type === 'won'));
  const score = sim.score;
  sim.step();
  assert.equal(sim.score, score, 'bonus must only be awarded once');
  sim.dispose();
});
test('a missed final shot waits for simulation to resolve and then fails', () => {
  const sim = new Simulation(basic());
  sim.launch({ x: -10, y: 0 });
  assert.equal(sim.phase, 'flying');
  for (let i = 0; i < 10; i++) sim.step();
  assert.equal(sim.phase, 'flying');
  run(sim);
  assert.equal(sim.phase, 'lost');
  assert.equal(sim.remainingMonsters, 1);
  assert.equal(sim.score, 0);
  sim.dispose();
});
test('damage depends on material: matching strong impacts fracture glass while wood and stone remain physical', () => {
  const alive: Partial<Record<MaterialKind, boolean>> = {};
  for (const material of ['glass', 'wood', 'stone'] as MaterialKind[]) {
    const level = basic();
    level.blocks = [{ id: 'target', x: 600, y: 630, w: 40, h: 90, material }];
    const sim = new Simulation(level);
    for (let i = 0; i < 90; i++) sim.step();
    sim.launch({ x: -80, y: 0 });
    Matter.Body.setPosition(sim.current!.body, { x: 550, y: 620 });
    Matter.Body.setVelocity(sim.current!.body, { x: 12, y: 0 });
    for (let i = 0; i < 20; i++) sim.step();
    const target = [...sim.entities.values()].find((e) => e.id === 'target');
    alive[material] = !!target;
    if (target) assert.ok(target.health < MATERIALS[material].health);
    sim.dispose();
  }
  assert.equal(alive.glass, false);
  assert.equal(alive.wood, true);
  assert.equal(alive.stone, true);
});
test('TNT blasts chain to nearby boxes and can defeat nearby monsters', () => {
  const level = basic();
  level.hazards = [
    { id: 'first', x: 650, y: 655, kind: 'tnt' },
    { id: 'second', x: 750, y: 655, kind: 'tnt' },
  ];
  level.monsters = [{ id: 'monster', x: 830, y: 657 }];
  const sim = new Simulation(level);
  sim.launch({ x: -102, y: 0 });
  Matter.Body.setPosition(sim.current!.body, { x: 590, y: 655 });
  Matter.Body.setVelocity(sim.current!.body, { x: 15, y: 0 });
  run(sim);
  const events = sim.drainEvents();
  assert.equal(events.filter((e) => e.type === 'explosion').length, 2);
  assert.equal(sim.remainingMonsters, 0);
  assert.equal(sim.phase, 'won');
  sim.dispose();
});
test('restarting with a new simulation resets all run state', () => {
  const first = new Simulation(campaign[0]);
  first.launch({ x: -102, y: 0 });
  run(first);
  assert.equal(first.phase, 'won');
  first.dispose();
  const restart = new Simulation(campaign[0]);
  assert.equal(restart.phase, 'aiming');
  assert.equal(restart.score, 0);
  assert.equal(restart.shots, 0);
  assert.equal(restart.remainingMonsters, campaign[0].monsters.length);
  assert.equal(restart.current, undefined);
  restart.dispose();
});
