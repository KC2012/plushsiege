import Matter from 'matter-js';
import { Simulation } from '../game/physics';
import type { Level, BlockDef } from '../game/types';
const { Body, Composite } = Matter;
export interface PhysicsScenario {
  id: string;
  name: string;
  description: string;
  level: Level;
  scenarioFrames: number;
  setup(sim: Simulation): void;
  afterStep?(sim: Simulation, frame: number): void;
  verify(sim: Simulation): { passed: boolean; detail: string };
}
function base(id: string): Level {
  return {
    version: 1,
    id,
    name: id,
    subtitle: 'Deterministic physics verification',
    world: 'countryside',
    bounds: { width: 1440, height: 810, ground: 675 },
    sling: { x: 235, y: 530 },
    projectiles: ['sheep'],
    blocks: [],
    monsters: [{ id: 'target', x: 850, y: 657, radius: 18, kind: 'horn' }],
    hazards: [],
    thresholds: [5000, 8000, 10000],
  };
}
function block(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  material: BlockDef['material'] = 'wood',
  staticBody = false,
): BlockDef {
  return { id, x, y, w, h, material, ...(staticBody ? { static: true } : {}) };
}
function entity(sim: Simulation, id: string) {
  return [...sim.entities.values()].find((e) => e.id === id);
}
function warm(sim: Simulation) {
  for (let i = 0; i < 180; i++) sim.step();
}
/** Withdraw a physical test-rig support. Ordinary objects are never visually teleported. */
function withdraw(sim: Simulation, id: string) {
  const e = entity(sim, id);
  if (!e) throw new Error(`Missing fixture support ${id}`);
  Composite.remove(sim.engine.world, e.body);
  sim.entities.delete(e.body.id);
}
function defeated(sim: Simulation) {
  return {
    passed: sim.remainingMonsters === 0,
    detail: `${sim.remainingMonsters} monsters remain; ${sim.damageHistory
      .filter((e) => e.type === 'damage')
      .slice(-6)
      .map((e) => `${e.source}:${e.amount?.toFixed(2)}`)
      .join(', ')}`,
  };
}
function intact(sim: Simulation) {
  const m = entity(sim, 'target');
  return {
    passed: !!m && m.health === m.maxHealth,
    detail: m
      ? `Health ${m.health.toFixed(2)}/${m.maxHealth}; y=${m.body.position.y.toFixed(2)}, asleep=${m.body.isSleeping}`
      : 'Monster was incorrectly defeated',
  };
}
const plank = base('support-withdrawal');
plank.blocks = [
  block('plank', 850, 500, 180, 18),
  block('left-rig', 775, 592, 18, 166, 'stone', true),
  block('right-rig', 925, 592, 18, 166, 'stone', true),
];
plank.monsters[0].y = 473;
const stone = base('falling-stone');
stone.blocks = [
  block('stone', 850, 420, 90, 60, 'stone'),
  block('shelf', 850, 460, 150, 20, 'stone', true),
];
const side = base('sideways-wood');
side.blocks = [block('beam', 750, 664, 130, 22)];
const fall = base('monster-fall');
fall.blocks = [block('shelf', 850, 300, 150, 20, 'stone', true)];
fall.monsters[0].y = 272;
const ledge = base('push-off-ledge');
ledge.blocks = [block('ledge', 800, 450, 260, 20, 'stone', true)];
ledge.monsters[0].y = 422;
const chain = base('falling-chain');
chain.blocks = [
  block('stone', 850, 300, 90, 82, 'stone'),
  block('release-shelf', 850, 350, 150, 18, 'stone', true),
  block('beam', 850, 480, 180, 20, 'glass'),
  block('left-rig', 775, 582.5, 18, 185, 'stone', true),
  block('right-rig', 925, 582.5, 18, 185, 'stone', true),
];
const blast = base('explosion');
blast.hazards = [{ id: 'tnt', x: 760, y: 655, kind: 'tnt' }];
blast.blocks = [block('ram', 710, 660, 60, 30), block('loose-stone', 950, 650, 40, 50, 'stone')];
const collapse = base('collapse-around');
collapse.blocks = [
  block('left-support', 750, 592, 18, 166, 'glass'),
  block('right-support', 950, 592, 18, 166, 'glass'),
  block('roof', 850, 500, 240, 18),
];
collapse.monsters[0].x = 780;
const gentle = base('gentle-contact');
gentle.blocks = [block('small-wood', 817, 665, 30, 20)];
const rest = base('stable-rest');
rest.blocks = [block('foundation', 850, 655, 140, 40, 'stone', true)];
rest.monsters[0].y = 617;
const crush = base('crushing-load');
crush.blocks = [block('load', 850, 610, 120, 60, 'stone')];
export const physicsScenarios: PhysicsScenario[] = [
  {
    id: plank.id,
    name: 'The missing plank',
    description:
      'A dynamic sleeping monster rests on a dynamic plank. The plank is withdrawn; gravity must resume without a teleport.',
    level: plank,
    scenarioFrames: 240,
    setup: (s) => {
      warm(s);
      withdraw(s, 'plank');
    },
    verify: defeated,
  },
  {
    id: stone.id,
    name: 'Stone from above',
    description:
      'Withdraw a shelf beneath a sleeping stone block. Its weight and landing energy must defeat the monster below.',
    level: stone,
    scenarioFrames: 240,
    setup: (s) => {
      warm(s);
      withdraw(s, 'shelf');
    },
    verify: defeated,
  },
  {
    id: side.id,
    name: 'A sideways wooden beam',
    description:
      'A mechanical test impulse launches a wooden beam along the ground into a monster. No stuffie touches the target.',
    level: side,
    scenarioFrames: 240,
    setup: (s) => {
      warm(s);
      Body.setVelocity(entity(s, 'beam')!.body, { x: 16, y: 0 });
      Matter.Sleeping.set(entity(s, 'beam')!.body, false);
    },
    verify: defeated,
  },
  {
    id: fall.id,
    name: 'A substantial monster fall',
    description: 'A sleeping monster loses a high shelf and takes damage only on landing.',
    level: fall,
    scenarioFrames: 240,
    setup: (s) => {
      warm(s);
      withdraw(s, 'shelf');
    },
    verify: defeated,
  },
  {
    id: ledge.id,
    name: 'Pushed over the edge',
    description:
      'A mechanical horizontal impulse pushes the monster off a raised ledge. Its subsequent fall is physically simulated.',
    level: ledge,
    scenarioFrames: 360,
    setup: (s) => {
      warm(s);
      const monster = entity(s, 'target')!;
      Body.applyForce(monster.body, monster.body.position, { x: monster.body.mass * 0.02, y: 0 });
    },
    verify: (s) => ({
      passed: s.remainingMonsters === 0 && s.damageHistory.some((e) => e.source === 'fall'),
      detail: `Targets ${s.remainingMonsters}; substantial landing damage ${s.damageHistory.some((e) => e.source === 'fall')}`,
    }),
  },
  {
    id: chain.id,
    name: 'A chain of falling blocks',
    description: 'A released stone hits a glass beam; both remain dangerous to the monster below.',
    level: chain,
    scenarioFrames: 360,
    setup: (s) => {
      warm(s);
      withdraw(s, 'release-shelf');
    },
    verify: defeated,
  },
  {
    id: blast.id,
    name: 'Blast and knockback',
    description:
      'A wooden ram strikes TNT. The blast damages the monster and physically pushes nearby stone.',
    level: blast,
    scenarioFrames: 300,
    setup: (s) => {
      warm(s);
      Body.setVelocity(entity(s, 'ram')!.body, { x: 15, y: 0 });
      Matter.Sleeping.set(entity(s, 'ram')!.body, false);
    },
    verify: (s) => {
      const moved = entity(s, 'loose-stone');
      return {
        passed:
          s.remainingMonsters === 0 &&
          s.damageHistory.some((e) => e.source === 'explosion') &&
          (!moved || Math.abs(moved.body.position.x - 950) > 5),
        detail: `Targets ${s.remainingMonsters}; explosion damage ${s.damageHistory.some((e) => e.source === 'explosion')}; stone x=${moved?.body.position.x.toFixed(1) || 'fractured'}`,
      };
    },
  },
  {
    id: collapse.id,
    name: 'Collapse around a monster',
    description:
      'Withdraw one structural support. The intact roof tilts and falls onto the sheltered monster, without a direct stuffie hit.',
    level: collapse,
    scenarioFrames: 360,
    setup: (s) => {
      warm(s);
      withdraw(s, 'left-support');
    },
    verify: defeated,
  },
  {
    id: gentle.id,
    name: 'A harmless nudge',
    description:
      'A small wooden block receives a low-energy push. Gentle rolling contact should leave the monster healthy.',
    level: gentle,
    scenarioFrames: 300,
    setup: (s) => {
      warm(s);
      Body.setVelocity(entity(s, 'small-wood')!.body, { x: 1.3, y: 0 });
      Matter.Sleeping.set(entity(s, 'small-wood')!.body, false);
    },
    verify: (s) => {
      const safe = intact(s),
        m = entity(s, 'target');
      return {
        passed: safe.passed && !!m && m.body.position.x > 850.01,
        detail: safe.detail + `; nudge x=${m?.body.position.x.toFixed(2)}`,
      };
    },
  },
  {
    id: rest.id,
    name: 'Ordinary resting contact',
    description:
      'A monster rests on stable masonry for several seconds. Resting pressure is not damage.',
    level: rest,
    scenarioFrames: 600,
    setup: warm,
    verify: intact,
  },
  {
    id: crush.id,
    name: 'A newly descending heavy load',
    description:
      'After stable resting contact, a mechanical actuator applies downward force to the heavy stone for 15 ticks. A pinned monster can be crushed by real compression work.',
    level: crush,
    scenarioFrames: 180,
    setup: warm,
    afterStep: (s, frame) => {
      const load = entity(s, 'load');
      if (load && frame < 15)
        Body.applyForce(load.body, load.body.position, { x: 0, y: load.body.mass * 0.002 });
    },
    verify: (s) => ({
      passed: s.remainingMonsters === 0 && s.damageHistory.some((e) => e.source === 'crush'),
      detail: `Targets ${s.remainingMonsters}; crush events ${s.damageHistory.filter((e) => e.source === 'crush').length}`,
    }),
  },
];
