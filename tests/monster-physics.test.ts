import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { Simulation } from '../src/game/physics';
import { physicsScenarios } from '../src/content/physics-scenarios';
import type { MaterialKind } from '../src/game/types';
const { Engine, Bodies, Body, Composite, Sleeping } = Matter;
const tick = (sim: Simulation, n: number) => {
  for (let i = 0; i < n; i++) sim.step();
};
const find = (sim: Simulation, id: string) => [...sim.entities.values()].find((e) => e.id === id)!;
const scenario = (id: string) => physicsScenarios.find((s) => s.id === id)!;

// Control regression: proves the upstream sleep lifecycle that caused floating targets,
// separately from the game's fix. Removing a support does not wake sleeping Matter bodies.
test('baseline Matter control reproduces a sleeping monster floating after support removal', () => {
  const engine = Engine.create({ enableSleeping: true });
  const plank = Bodies.rectangle(850, 500, 180, 18, { isStatic: true });
  const monster = Bodies.circle(850, 473, 18, { sleepThreshold: 50 });
  Composite.add(engine.world, [plank, monster]);
  for (let i = 0; i < 180; i++) Engine.update(engine, 1000 / 60);
  assert.equal(monster.isSleeping, true);
  const y = monster.position.y;
  Composite.remove(engine.world, plank);
  for (let i = 0; i < 180; i++) Engine.update(engine, 1000 / 60);
  assert.equal(monster.position.y, y, 'raw Matter leaves a sleeping body suspended');
  Sleeping.set(monster, false);
  for (let i = 0; i < 20; i++) Engine.update(engine, 1000 / 60);
  assert.ok(monster.position.y > y + 40, 'gravity works once the body wakes');
  Engine.clear(engine);
});
for (const fixture of physicsScenarios)
  test(`physics scenario: ${fixture.name}`, () => {
    const results = [];
    for (let replay = 0; replay < 2; replay++) {
      const sim = new Simulation(structuredClone(fixture.level));
      fixture.setup(sim);
      for (let frame = 0; frame < fixture.scenarioFrames; frame++) {
        sim.step();
        fixture.afterStep?.(sim, frame);
      }
      const result = fixture.verify(sim);
      assert.equal(result.passed, true, `${fixture.id}: ${result.detail}`);
      results.push({
        remaining: sim.remainingMonsters,
        score: sim.score,
        health: [...sim.entities.values()].filter((e) => e.type === 'monster').map((e) => e.health),
        damage: sim.damageHistory
          .filter((e) => e.type === 'damage')
          .map((e) => [e.source, e.amount]),
      });
      sim.dispose();
    }
    assert.deepEqual(results[0], results[1], 'verification scenario must replay deterministically');
  });
for (const material of ['wood', 'glass', 'stone'] as MaterialKind[])
  test(`a falling ${material} structural body defeats a monster without a projectile`, () => {
    const fixture = scenario('falling-stone'),
      l = structuredClone(fixture.level);
    l.blocks[0].material = material;
    const sim = new Simulation(l);
    fixture.setup(sim);
    tick(sim, 300);
    assert.equal(sim.remainingMonsters, 0);
    assert.ok(sim.damageHistory.some((e) => e.source === 'structure' && e.material === material));
    assert.equal(
      [...sim.entities.values()].some((e) => e.type === 'projectile'),
      false,
    );
    sim.dispose();
  });
test('withdrawn support wakes an entire dynamic block stack and the monster above it', () => {
  const l = structuredClone(scenario('stable-rest').level);
  l.blocks = [
    { id: 'plank', x: 850, y: 500, w: 180, h: 18, material: 'stone', static: true },
    { id: 'lower', x: 850, y: 476, w: 120, h: 30, material: 'wood' },
    { id: 'upper', x: 850, y: 446, w: 100, h: 30, material: 'wood' },
  ];
  l.monsters = [{ id: 'top', x: 850, y: 413 }];
  const sim = new Simulation(l);
  tick(sim, 240);
  const lower = find(sim, 'lower'),
    upper = find(sim, 'upper'),
    monster = find(sim, 'top');
  assert.equal(lower.body.isSleeping, true);
  assert.equal(upper.body.isSleeping, true);
  assert.equal(monster.body.isSleeping, true);
  const plank = find(sim, 'plank');
  Composite.remove(sim.engine.world, plank.body);
  sim.entities.delete(plank.body.id);
  assert.equal(lower.body.isSleeping, false);
  assert.equal(upper.body.isSleeping, false);
  assert.equal(monster.body.isSleeping, false);
  tick(sim, 300);
  assert.ok(
    monster.body.position.y > 550,
    'the target must descend with the released stack; cushioning may let it survive',
  );
  sim.dispose();
});
test('moving a static support wakes its sleeping monster and gravity takes over', () => {
  const l = structuredClone(scenario('stable-rest').level);
  l.blocks[0] = { id: 'plank', x: 850, y: 500, w: 180, h: 18, material: 'stone', static: true };
  l.monsters[0].y = 473;
  const sim = new Simulation(l);
  tick(sim, 180);
  const monster = find(sim, 'target');
  assert.equal(monster.body.isSleeping, true);
  Body.translate(find(sim, 'plank').body, { x: 240, y: 0 });
  sim.step();
  assert.equal(monster.body.isSleeping, false);
  const y = monster.body.position.y;
  tick(sim, 10);
  assert.ok(monster.body.position.y > y + 10);
  tick(sim, 240);
  assert.equal(sim.remainingMonsters, 0);
  sim.dispose();
});
test('tilting a support wakes a sleeping monster instead of leaving its body in the air', () => {
  const l = structuredClone(scenario('stable-rest').level);
  l.blocks[0] = { id: 'plank', x: 850, y: 500, w: 180, h: 18, material: 'stone', static: true };
  l.monsters[0].y = 473;
  const sim = new Simulation(l);
  tick(sim, 180);
  const monster = find(sim, 'target');
  assert.equal(monster.body.isSleeping, true);
  Body.setAngle(find(sim, 'plank').body, 1.1);
  sim.step();
  assert.equal(monster.body.isSleeping, false);
  tick(sim, 120);
  assert.ok(Math.hypot(monster.body.position.x - 850, monster.body.position.y - 473) > 15);
  sim.dispose();
});
test('fracturing a supporting plank wakes the sleeping bodies that rested on it', () => {
  const l = structuredClone(scenario('support-withdrawal').level),
    sim = new Simulation(l);
  tick(sim, 240);
  const plank = find(sim, 'plank'),
    monster = find(sim, 'target');
  assert.equal(monster.body.isSleeping, true);
  plank.health = 0;
  plank.fractureAt = sim.time;
  sim.step();
  assert.equal(sim.entities.has(plank.body.id), false);
  assert.equal(monster.body.isSleeping, false);
  assert.ok([...sim.entities.values()].some((e) => e.type === 'fragment'));
  tick(sim, 300);
  assert.ok(monster.body.position.y > 500, 'released target follows real falling debris');
  sim.dispose();
});
test('stable masonry and monsters retain sleep without repeated wake polling or damage', () => {
  const f = scenario('stable-rest'),
    sim = new Simulation(structuredClone(f.level));
  f.setup(sim);
  const monster = find(sim, 'target');
  assert.equal(monster.body.isSleeping, true);
  let sleepingFrames = 0;
  for (let i = 0; i < 1200; i++) {
    sim.step();
    if (monster.body.isSleeping) sleepingFrames++;
  }
  assert.equal(sleepingFrames, 1200);
  assert.equal(monster.health, monster.maxHealth);
  assert.equal(sim.damageHistory.length, 0);
  sim.dispose();
});
test('ordinary heavy resting pressure causes no crushing damage until new load moves', () => {
  const f = scenario('crushing-load'),
    sim = new Simulation(structuredClone(f.level));
  f.setup(sim);
  tick(sim, 600);
  const monster = find(sim, 'target');
  assert.equal(monster.health, monster.maxHealth);
  assert.ok(!sim.damageHistory.some((e) => e.source === 'crush'));
  sim.dispose();
});
test('gentle contact really nudges the monster and does not inflict damage', () => {
  const f = scenario('gentle-contact'),
    sim = new Simulation(structuredClone(f.level));
  f.setup(sim);
  const monster = find(sim, 'target'),
    x = monster.body.position.x;
  tick(sim, 120);
  assert.ok(
    monster.body.position.x > x + 0.01,
    'the harmless-contact test must actually touch the target',
  );
  assert.equal(monster.health, monster.maxHealth);
  sim.dispose();
});
test('reactivated sleeping contact captures its new impact before solver resolution', () => {
  const f = scenario('explosion'),
    sim = new Simulation(structuredClone(f.level));
  f.setup(sim);
  tick(sim, 180);
  assert.ok(
    sim.damageHistory.some((e) => e.source === 'structure' && e.material === 'wood'),
    'a touching ram must damage TNT on wake-up',
  );
  assert.ok(sim.damageHistory.some((e) => e.source === 'explosion'));
  assert.equal(sim.remainingMonsters, 0);
  sim.dispose();
});

test('a monster survives gentle 8px and 15px drops onto terrain without any injury', () => {
  for (const drop of [8, 15]) {
    const l = structuredClone(scenario('stable-rest').level);
    l.blocks = [];
    l.monsters[0].y = 657 - drop;
    const sim = new Simulation(l),
      monster = find(sim, 'target');
    tick(sim, 300);
    assert.ok(monster.body.position.y > 656, 'the target must physically land on the ground');
    assert.equal(monster.health, monster.maxHealth, `${drop}px drop must be harmless`);
    assert.ok(!sim.damageHistory.some((e) => e.bodyId === monster.body.id));
    sim.dispose();
  }
});

test('gentle drops onto static and dynamic wooden planks use the same harmless landing rule', () => {
  for (const staticBody of [false, true])
    for (const drop of [8, 15]) {
      const l = structuredClone(scenario('stable-rest').level);
      const y = staticBody ? 620 : 655;
      l.blocks = [
        { id: 'landing-plank', x: 850, y, w: 140, h: 40, material: 'wood', static: staticBody },
      ];
      const restY = y - 20 - 18;
      l.monsters[0].y = restY - drop;
      const sim = new Simulation(l),
        monster = find(sim, 'target');
      tick(sim, 300);
      assert.ok(monster.body.position.y > restY - 1, 'the monster must land on its actual plank');
      assert.equal(
        monster.health,
        monster.maxHealth,
        `${drop}px drop onto ${staticBody ? 'static' : 'dynamic'} plank must be harmless`,
      );
      assert.ok(!sim.damageHistory.some((e) => e.bodyId === monster.body.id));
      sim.dispose();
    }
});

test('support loss at the final-shot quiet boundary defers failure until gravity and landing resolve', () => {
  const l = structuredClone(scenario('stable-rest').level);
  l.projectiles = ['sheep'];
  l.blocks = [{ id: 'plank', x: 850, y: 500, w: 180, h: 18, material: 'stone', static: true }];
  l.monsters[0].y = 473;
  const control = new Simulation(structuredClone(l));
  tick(control, 180);
  control.launch({ x: -10, y: 0 });
  let endFrame = 0;
  while (control.phase === 'flying' && endFrame < 3000) {
    control.step();
    endFrame++;
  }
  assert.equal(control.phase, 'lost');
  assert.ok(endFrame > 100);
  control.dispose();
  const sim = new Simulation(l);
  tick(sim, 180);
  sim.launch({ x: -10, y: 0 });
  tick(sim, endFrame - 1);
  assert.equal(sim.phase, 'flying');
  const target = find(sim, 'target');
  assert.equal(target.body.isSleeping, true);
  const plank = find(sim, 'plank');
  Composite.remove(sim.engine.world, plank.body);
  sim.entities.delete(plank.body.id);
  sim.step();
  assert.equal(
    sim.phase,
    'flying',
    'a newly unsupported target must get time to fall before resolving the miss',
  );
  tick(sim, 300);
  assert.equal(sim.remainingMonsters, 0);
  assert.equal(sim.phase, 'won');
  sim.dispose();
});
