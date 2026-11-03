import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { Simulation, contactImpact } from '../src/game/physics';
import { MATERIALS, PHYSICS } from '../src/game/config';
import type { Level, MaterialKind } from '../src/game/types';
const { Bodies, Body, Composite, Sleeping } = Matter;
function level(): Level {
  return {
    version: 1,
    id: 'regression',
    name: 'Destruction fixture',
    subtitle: 'Deterministic impact replay',
    world: 'countryside',
    bounds: { width: 1440, height: 810, ground: 675 },
    sling: { x: 235, y: 530 },
    projectiles: ['sheep', 'sheep'],
    blocks: [],
    monsters: [{ id: 'distant', x: 1300, y: 657 }],
    hazards: [],
    thresholds: [5000, 8000, 10000],
  };
}
function tick(s: Simulation, count: number) {
  for (let i = 0; i < count; i++) s.step();
}
function impactBlock(material: MaterialKind, speed: number) {
  const l = level();
  l.blocks = [{ id: 'target', x: 600, y: 630, w: 40, h: 90, material }];
  const s = new Simulation(l);
  tick(s, 90);
  s.launch({ x: -80, y: 0 });
  Body.setPosition(s.current!.body, { x: 550, y: 620 });
  Body.setVelocity(s.current!.body, { x: speed, y: 0 });
  return s;
}

test('moderate glancing speed does not become huge fracture energy', () => {
  const a = Bodies.rectangle(0, 0, 30, 30, { mass: 4 }),
    b = Bodies.rectangle(40, 0, 30, 30, { mass: 4 });
  Body.setVelocity(a, { x: 1, y: 25 });
  const glancing = contactImpact(a, b, { x: 20, y: 0 }, { x: -1, y: 0 });
  assert.equal(glancing.closing, 1);
  assert.equal(glancing.energy, 1);
  Body.setVelocity(a, { x: 25, y: 1 });
  const direct = contactImpact(a, b, { x: 20, y: 0 }, { x: -1, y: 0 });
  assert.ok(direct.energy > glancing.energy * 500);
  Body.setVelocity(a, { x: -25, y: 0 });
  assert.equal(
    contactImpact(a, b, { x: 20, y: 0 }, { x: -1, y: 0 }).closing,
    0,
    'separating bodies cause no impact damage',
  );
});
test('contact closing speed includes angular motion and contact inertia', () => {
  const a = Bodies.rectangle(0, 0, 20, 100, { mass: 4 }),
    b = Bodies.rectangle(30, 0, 20, 100, { isStatic: true });
  Body.setAngularVelocity(a, 0.2);
  const atTip = contactImpact(a, b, { x: 10, y: 40 }, { x: 1, y: 0 });
  assert.ok(atTip.closing > 7.9);
  assert.ok(atTip.mass < a.mass, 'lever arm reduces normal effective mass');
  assert.equal(contactImpact(a, b, { x: 10, y: 0 }, { x: 1, y: 0 }).closing, 0);
});
test('wood visibly translates and rotates after an off-center impact without disappearing', () => {
  const s = impactBlock('wood', 8),
    target = [...s.entities.values()].find((e) => e.id === 'target')!;
  tick(s, 20);
  assert.ok(s.entities.has(target.body.id), 'moderate impact must leave the original block active');
  assert.ok(target.body.position.x > 620, 'impact transfers linear momentum');
  assert.ok(Math.abs(target.body.angle) > 0.15, 'off-center impact transfers angular momentum');
  assert.ok(
    target.health > 0 && target.health < MATERIALS.wood.health,
    'damage remains visible on a live body',
  );
  assert.equal(s.score, 0);
  s.dispose();
});
test('a failed glass block moves before fracturing into persistent mass-conserving rigid pieces', () => {
  const s = impactBlock('glass', 12),
    target = [...s.entities.values()].find((e) => e.id === 'target')!;
  const initialMass = target.body.mass;
  let damagedAt = -1,
    fracturedAt = -1;
  for (let frame = 0; frame < 60; frame++) {
    s.step();
    if (target.health <= 0 && damagedAt < 0) {
      damagedAt = frame;
      assert.ok(
        s.entities.has(target.body.id),
        'failed body stays physical during crack animation',
      );
    }
    if (!s.entities.has(target.body.id)) {
      fracturedAt = frame;
      break;
    }
  }
  assert.ok(damagedAt >= 0 && fracturedAt > damagedAt);
  assert.ok(target.body.position.x > 605, 'the parent must move before fracture');
  const fragments = [...s.entities.values()].filter((e) => e.type === 'fragment');
  assert.equal(fragments.length, 3);
  assert.ok(Math.abs(fragments.reduce((sum, e) => sum + e.body.mass, 0) - initialMass) < 1e-8);
  assert.ok(
    Math.abs(
      fragments.reduce((sum, e) => sum + e.body.mass * e.body.velocity.x, 0) -
        initialMass * target.body.velocity.x,
    ) < 1e-7,
  );
  assert.ok(
    fragments.every(
      (e) => Composite.allBodies(s.engine.world).includes(e.body) && e.body.speed > 0,
    ),
  );
  const ids = fragments.map((e) => e.body.id);
  tick(s, 4);
  assert.ok(
    ids.some((id) => s.entities.has(id)),
    'large pieces persist beyond one render frame',
  );
  assert.equal(s.score, MATERIALS.glass.points, 'fracture scores the source block only once');
  s.dispose();
});
test('breaking one support causes roof translation/rotation and secondary structural collapse', () => {
  const l = level();
  l.blocks = [
    { id: 'left', x: 600, y: 625, w: 18, h: 100, material: 'glass' },
    { id: 'right', x: 720, y: 625, w: 18, h: 100, material: 'glass' },
    { id: 'roof', x: 660, y: 566, w: 160, h: 18, material: 'wood' },
  ];
  l.monsters = [{ id: 'inside', x: 660, y: 657 }];
  const s = new Simulation(l);
  tick(s, 90);
  const roof = [...s.entities.values()].find((e) => e.id === 'roof')!;
  s.launch({ x: -90, y: 0 });
  Body.setPosition(s.current!.body, { x: 550, y: 640 });
  Body.setVelocity(s.current!.body, { x: 16, y: 0 });
  tick(s, 180);
  assert.ok(
    ![...s.entities.values()].some((e) => e.id === 'left'),
    'the struck glass support fractures',
  );
  assert.ok(roof.body.position.y > 610, 'unsupported roof must actually fall');
  assert.ok(Math.abs(roof.body.angle) > 0.1, 'collapse must include rotation');
  assert.equal(s.remainingMonsters, 0, 'falling structure / fragment chain defeats the monster');
  s.dispose();
});
test('large fracture pieces independently damage monsters after the original projectile is removed', () => {
  const l = level();
  l.projectiles = ['bear'];
  l.blocks = [
    { id: 'a', x: 569, y: 592, w: 18, h: 166, material: 'wood' },
    { id: 'b', x: 731, y: 592, w: 18, h: 166, material: 'wood' },
    { id: 'roof', x: 650, y: 500, w: 180, h: 18, material: 'glass' },
  ];
  l.monsters = [{ id: 'under', x: 650, y: 657 }];
  const s = new Simulation(l);
  tick(s, 90);
  s.launch({ x: -90, y: 0 });
  Body.setPosition(s.current!.body, { x: 650, y: 440 });
  Body.setVelocity(s.current!.body, { x: 0, y: 12 });
  for (let i = 0; i < 30 && ![...s.entities.values()].some((e) => e.type === 'fragment'); i++)
    s.step();
  assert.ok([...s.entities.values()].some((e) => e.type === 'fragment'));
  assert.equal(s.remainingMonsters, 1, 'monster is still alive when the roof fractures');
  // Isolate debris interaction: no projectile remains to hit this target.
  const projectile = s.current!;
  Composite.remove(s.engine.world, projectile.body);
  s.entities.delete(projectile.body.id);
  s.current = undefined;
  tick(s, 160);
  assert.equal(s.remainingMonsters, 0);
  assert.equal(s.phase, 'won');
  assert.equal(s.score, 5600, 'secondary pieces do not farm block points');
  s.dispose();
});
test('repeated independent impacts accumulate damage before wood fractures', () => {
  const s = impactBlock('wood', 8);
  const target = [...s.entities.values()].find((e) => e.id === 'target')!;
  tick(s, 20);
  const firstHealth = target.health;
  assert.ok(firstHealth > 0);
  const shot = s.current!;
  // Reset only the physical test rig between strikes; health remains untouched.
  for (let strike = 0; strike < 8 && s.entities.has(target.body.id); strike++) {
    Body.setPosition(target.body, { x: 600, y: 630 });
    Body.setAngle(target.body, 0);
    Body.setVelocity(target.body, { x: 0, y: 0 });
    Body.setAngularVelocity(target.body, 0);
    Sleeping.set(target.body, false);
    Body.setPosition(shot.body, { x: 500, y: 620 });
    Body.setVelocity(shot.body, { x: 0, y: 0 });
    tick(s, 2); // release previous contact manifold
    Body.setPosition(shot.body, { x: 550, y: 620 });
    Body.setVelocity(shot.body, { x: 8, y: 0 });
    Sleeping.set(shot.body, false);
    tick(s, 20);
  }
  assert.ok(!s.entities.has(target.body.id));
  assert.ok([...s.entities.values()].some((e) => e.type === 'fragment'));
  assert.equal(s.score, MATERIALS.wood.points);
  s.dispose();
});
test('idle construction starts at authored coordinates without hidden settling or fracture', () => {
  const l = level();
  l.blocks = [
    { id: 'base', x: 850, y: 625, w: 18, h: 100, material: 'wood' },
    { id: 'base2', x: 970, y: 625, w: 18, h: 100, material: 'wood' },
    { id: 'roof', x: 910, y: 566, w: 160, h: 18, material: 'stone' },
  ];
  const s = new Simulation(l);
  for (const e of s.entities.values())
    if (e.def) assert.deepEqual(e.body.position, { x: e.def.x, y: e.def.y });
  tick(s, 600);
  assert.equal(s.score, 0);
  assert.equal(s.remainingMonsters, 1);
  for (const e of s.entities.values())
    assert.equal(e.health, e.maxHealth, 'gravity resting contacts must not damage material');
  s.dispose();
});
test('last-shot failure is deferred past 22 seconds while a target continues moving', () => {
  const l = level();
  l.projectiles = ['sheep'];
  const s = new Simulation(l);
  s.launch({ x: -10, y: 0 });
  const target = [...s.entities.values()].find((e) => e.type === 'monster')!;
  for (let frame = 0; frame < 1450; frame++) {
    // A deterministic moving-target rig keeps meaningful motion alive beyond the old hard timeout.
    Body.setPosition(target.body, { x: 1250, y: 450 });
    Body.setVelocity(target.body, { x: 1, y: 0 });
    Sleeping.set(target.body, false);
    s.step();
  }
  assert.ok(s.time > 22000);
  assert.equal(s.phase, 'flying');
  Body.setPosition(target.body, { x: 1250, y: 657 });
  Body.setVelocity(target.body, { x: 0, y: 0 });
  tick(s, 600);
  assert.equal(s.phase, 'lost');
  s.dispose();
});
test('spent stuffies stay physical between shots and cannot activate abilities after landing or removal', () => {
  const s = new Simulation(level());
  s.launch({ x: -10, y: 0 });
  const shot = s.current!;
  tick(s, 50);
  assert.equal(s.canActivate, false);
  assert.equal(s.activate(), false);
  tick(s, 500);
  assert.equal(s.phase, 'aiming');
  assert.ok(s.entities.has(shot.body.id));
  assert.ok(Composite.allBodies(s.engine.world).includes(shot.body));
  s.launch({ x: -80, y: 20 });
  tick(s, 10);
  assert.equal(s.canActivate, true);
  Body.setPosition(s.current!.body, { x: 1700, y: 300 });
  s.step();
  assert.equal(s.current, undefined);
  assert.equal(s.activate(), false);
  s.dispose();
});
test('duck preserves flight direction; rabbit splitting conserves total mass and linear momentum', () => {
  const duck = level();
  duck.projectiles = ['duck'];
  let s = new Simulation(duck);
  s.launch({ x: -80, y: 20 });
  tick(s, 10);
  Body.setVelocity(s.current!.body, { x: -6, y: -3 });
  assert.equal(s.activate(), true);
  assert.ok(s.current!.body.velocity.x < 0 && s.current!.body.velocity.y < 0);
  s.dispose();
  const rabbit = level();
  rabbit.projectiles = ['rabbit'];
  s = new Simulation(rabbit);
  s.launch({ x: -80, y: 20 });
  tick(s, 10);
  const mass = s.current!.body.mass,
    v = { ...s.current!.body.velocity };
  s.activate();
  const group = [...s.entities.values()].filter((e) => e.type === 'projectile');
  assert.equal(group.length, 3);
  assert.ok(Math.abs(group.reduce((n, e) => n + e.body.mass, 0) - mass) < 1e-8);
  for (const axis of ['x', 'y'] as const)
    assert.ok(
      Math.abs(
        group.reduce((n, e) => n + e.body.mass * e.body.velocity[axis], 0) - mass * v[axis],
      ) < 1e-7,
    );
  s.dispose();
});
test('fragment creation stays bounded during dense explosive destruction', () => {
  const l = level();
  l.blocks = Array.from({ length: 40 }, (_, i) => ({
    id: `pane-${i}`,
    x: 720 + (i % 8) * 28,
    y: 300 + Math.floor(i / 8) * 50,
    w: 20,
    h: 36,
    material: 'glass',
  }));
  l.hazards = [{ id: 'blast', x: 820, y: 400, kind: 'tnt' }];
  const s = new Simulation(l);
  s.launch({ x: -80, y: 0 });
  Body.setPosition(s.current!.body, { x: 760, y: 400 });
  Body.setVelocity(s.current!.body, { x: 20, y: 0 });
  let peak = 0;
  for (let i = 0; i < 300; i++) {
    s.step();
    const count = [...s.entities.values()].filter((e) => e.type === 'fragment').length;
    peak = Math.max(peak, count);
    assert.ok(count <= PHYSICS.fragmentLimit);
  }
  assert.ok(peak > 10, 'fixture must actually produce physical debris');
  s.dispose();
});

test('settled fragments supporting another fragment and a monster survive the 45-second cleanup age', () => {
  const l = level();
  l.monsters = [{ id: 'perched', x: 700, y: 607 }];
  const s = new Simulation(l);
  // A physical support-chain rig uses the same fragment entity contract as fracture output.
  for (const [id, y, h] of [
    ['bottom', 660, 30],
    ['top', 635, 20],
  ] as const) {
    const body = Bodies.rectangle(700, y, 40, h, {
      density: MATERIALS.wood.density,
      friction: 0.65,
      sleepThreshold: 55,
    });
    const fragment = {
      id,
      type: 'fragment' as const,
      body,
      def: { id, x: 700, y, w: 40, h, material: 'wood' as const },
      health: 10,
      maxHealth: 10,
      born: 0,
      depth: 1,
    };
    s.entities.set(body.id, fragment);
    Composite.add(s.engine.world, body);
  }
  tick(s, 3000);
  assert.ok(s.time > PHYSICS.fragmentLifetimeMs);
  assert.ok(
    [...s.entities.values()].some((e) => e.id === 'bottom'),
    'a fragment supporting another fragment must remain',
  );
  assert.ok(
    [...s.entities.values()].some((e) => e.id === 'top'),
    'a fragment directly supporting a monster must remain',
  );
  assert.equal(s.remainingMonsters, 1);
  assert.equal(s.score, 0);
  const monster = [...s.entities.values()].find((e) => e.type === 'monster')!;
  assert.ok(
    Math.abs(monster.body.position.y - 607) < 3,
    'cleanup must not cause a delayed collapse',
  );
  s.dispose();
});
