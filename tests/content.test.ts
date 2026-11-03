import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaign, worlds } from '../src/content/campaign';
import { validateLevel } from '../src/content/validate';
import solutions from './fixtures/campaign-solutions.json';

test('all 24 authored levels validate, have unique IDs and belong to a world', () => {
  assert.equal(campaign.length, 24);
  assert.equal(new Set(campaign.map((l) => l.id)).size, 24);
  for (const level of campaign) {
    assert.deepEqual(
      validateLevel(level),
      [],
      `${level.id}: ${JSON.stringify(validateLevel(level))}`,
    );
    assert.ok(worlds.some((w) => w.id === level.world));
  }
});
test('campaign gradually introduces every stuffie, material and explosive', () => {
  assert.deepEqual(campaign[0].projectiles, ['sheep', 'sheep']);
  assert.equal(
    campaign.findIndex((l) => l.projectiles.includes('duck')),
    7,
  );
  assert.equal(
    campaign.findIndex((l) => l.projectiles.includes('bear')),
    11,
  );
  assert.equal(
    campaign.findIndex((l) => l.projectiles.includes('rabbit')),
    14,
  );
  assert.deepEqual(
    new Set(campaign.flatMap((l) => l.blocks.map((b) => b.material))),
    new Set(['wood', 'glass', 'stone']),
  );
  assert.ok(campaign.some((l) => l.hazards.length > 1));
});
test('invalid imports are rejected without throwing', () => {
  for (const value of [
    null,
    undefined,
    [],
    1,
    'level',
    {},
    { version: 1, blocks: [null], monsters: [{ x: NaN }] },
  ])
    assert.ok(validateLevel(value).length);
});
test('validator rejects nonfinite coordinates, missing targets and unknown types', () => {
  const l = structuredClone(campaign[0]);
  l.blocks[0].x = Infinity;
  l.monsters = [];
  l.projectiles = ['dragon' as never];
  l.blocks[1].material = 'steel' as never;
  const result = validateLevel(l);
  for (const path of ['blocks[0]', 'monsters', 'projectiles[0]', 'blocks[1].material'])
    assert.ok(
      result.some((i) => i.path === path),
      path,
    );
});
test('bounds, duplicate IDs and invalid thresholds are caught', () => {
  const l = structuredClone(campaign[0]);
  l.blocks[0].x = -3;
  l.monsters[0].id = l.blocks[0].id;
  l.thresholds = [4, 3, 2];
  const result = validateLevel(l);
  assert.ok(result.some((i) => i.message.includes('bounds')));
  assert.ok(result.some((i) => i.message.includes('unique')));
  assert.ok(result.some((i) => i.path === 'thresholds'));
});
test('touching structural joints are legal, overlapping bodies are not', () => {
  const l = structuredClone(campaign[0]);
  assert.deepEqual(validateLevel(l), []);
  l.blocks[1].x = l.blocks[0].x;
  l.blocks[1].y = l.blocks[0].y;
  assert.ok(validateLevel(l).some((i) => i.message.includes('Overlaps')));
});
test('rotated blocks are tested using polygon bounds and separating axes', () => {
  const l = structuredClone(campaign[0]);
  l.blocks = [
    { id: 'b1', x: 700, y: 400, w: 120, h: 12, angle: Math.PI / 4, material: 'wood' },
    { id: 'b2', x: 700, y: 400, w: 120, h: 12, angle: -Math.PI / 4, material: 'wood' },
  ];
  assert.ok(validateLevel(l).some((i) => i.message.includes('Overlaps')));
  l.blocks[1].x = 900;
  assert.deepEqual(validateLevel(l), []);
  l.blocks[0].y = 10;
  assert.ok(validateLevel(l).some((i) => i.message.includes('bounds')));
});

test('authored campaign geometry stays stable before and after simulation warm-up', async () => {
  const { auditStability } = await import('../scripts/validate');
  for (const level of campaign) {
    const audit = auditStability(level);
    assert.equal(audit.stable, true, `${level.id}: ${JSON.stringify(audit)}`);
  }
});
test('stability audit catches collapse hidden by constructor settling', async () => {
  const { auditStability } = await import('../scripts/validate');
  const level = structuredClone(campaign[0]);
  level.blocks = [{ id: 'unsupported-roof', x: 800, y: 300, w: 150, h: 20, material: 'wood' }];
  level.monsters = [{ id: 'untouched-target', x: 1200, y: 657, radius: 18, kind: 'blob' }];
  const audit = auditStability(level);
  assert.equal(audit.stable, false);
  assert.ok(audit.maxDisplacement > 100 || audit.missing.includes('unsupported-roof'));
});

test('all24 campaign solution fixtures replay efficient three-star wins with real abilities', async () => {
  const { Simulation, starsFor } = await import('../src/game/physics');
  const { finishShot } = await import('../scripts/validate');
  assert.equal(solutions.levels.length, campaign.length);
  for (const fixture of solutions.levels) {
    const level = campaign.find(level => level.id === fixture.id);
    assert.ok(level, `Missing campaign level ${fixture.id}`);
    const sim = new Simulation(level);
    assert.ok(fixture.shots.length <= (level.par || level.projectiles.length), `${level.id}: inefficient solution`);
    for (const shot of fixture.shots) {
      assert.equal(sim.phase, 'aiming', `${level.id}: prior shot must settle`);
      assert.equal(finishShot(sim, shot), true, `${level.id}: unresolved shot`);
      if (shot.abilityAt !== null) assert.equal(sim.abilityUsed, true, `${level.id}: promised ability did not activate`);
    }
    assert.equal(sim.phase, 'won', `${level.id}: solution failed`);
    assert.equal(starsFor(sim.score, level.thresholds), 3, `${level.id}: ${sim.score} points below three-star threshold`);
    sim.dispose();
  }
});
