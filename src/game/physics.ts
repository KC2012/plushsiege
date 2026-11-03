import Matter from 'matter-js';
import type { Level, StuffieKind, BlockDef, MonsterDef } from './types';
import { MATERIALS, STUFFIES, PHYSICS } from './config';
const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;
export type Phase = 'aiming' | 'flying' | 'won' | 'lost';
export interface Entity {
  id: string;
  type: 'block' | 'monster' | 'projectile' | 'tnt';
  body: Matter.Body;
  health: number;
  maxHealth: number;
  def?: BlockDef | MonsterDef;
  kind?: StuffieKind;
  born: number;
}
export interface GameEvent {
  type:
    | 'impact'
    | 'break'
    | 'monster'
    | 'explosion'
    | 'ability'
    | 'launch'
    | 'ready'
    | 'won'
    | 'lost';
  x: number;
  y: number;
  material?: string;
  power?: number;
  points?: number;
}
export class Simulation {
  engine: Matter.Engine;
  entities = new Map<number, Entity>();
  phase: Phase = 'aiming';
  score = 0;
  shots = 0;
  time = 0;
  current?: Entity;
  abilityUsed = false;
  private pending = new Map<number, number>();
  private events: GameEvent[] = [];
  private quiet = 0;
  private shotStart = 0;
  private winQuiet = 0;
  private suppress = true;
  constructor(public level: Level) {
    this.engine = Engine.create({
      enableSleeping: true,
      positionIterations: 8,
      velocityIterations: 8,
    });
    Composite.add(this.engine.world, [
      Bodies.rectangle(
        level.bounds.width / 2,
        level.bounds.ground + 60,
        level.bounds.width + 500,
        120,
        { isStatic: true, friction: 0.9, label: 'ground' },
      ),
      Bodies.rectangle(-110, 300, 100, 1500, { isStatic: true }),
    ]);
    for (const d of level.blocks) {
      const m = MATERIALS[d.material];
      const b = Bodies.rectangle(d.x, d.y, d.w, d.h, {
        angle: d.angle || 0,
        isStatic: d.static || false,
        density: m.density,
        friction: m.friction,
        restitution: m.restitution,
        sleepThreshold: 55,
        chamfer: { radius: 2 },
      });
      this.add({
        id: d.id,
        type: 'block',
        body: b,
        def: d,
        health: m.health,
        maxHealth: m.health,
        born: 0,
      });
    }
    for (const d of level.monsters) {
      const b = Bodies.circle(d.x, d.y, d.radius || 18, {
        density: 0.002,
        friction: 0.8,
        restitution: 0.05,
        sleepThreshold: 50,
      });
      this.add({ id: d.id, type: 'monster', body: b, def: d, health: 4, maxHealth: 4, born: 0 });
    }
    for (const d of level.hazards) {
      const b = Bodies.rectangle(d.x, d.y, 40, 40, { density: 0.0018, friction: 0.7 });
      this.add({ id: d.id, type: 'tnt', body: b, health: 3.5, maxHealth: 3.5, born: 0 });
    }
    Events.on(this.engine, 'collisionStart', (ev: Matter.IEventCollision<Matter.Engine>) => {
      if (this.suppress) return;
      for (const p of ev.pairs) {
        const a = this.entities.get(p.bodyA.id),
          b = this.entities.get(p.bodyB.id);
        const v = Math.hypot(
          p.bodyA.velocity.x - p.bodyB.velocity.x,
          p.bodyA.velocity.y - p.bodyB.velocity.y,
        );
        if (v < 1.6) continue;
        for (const [hit, other] of [
          [a, p.bodyB],
          [b, p.bodyA],
        ] as const) {
          if (!hit || hit.type === 'projectile' || hit.body.isStatic) continue;
          const otherEntity = this.entities.get(other.id);
          const effectiveMass = other.isStatic ? hit.body.mass : Math.min(other.mass, 8);
          const damage = v * Math.min(2.8, 0.35 + effectiveMass * 0.48);
          if (hit.type === 'monster' && v > 2.1) this.pending.set(hit.body.id, 99);
          else if (damage > 1.2)
            this.pending.set(hit.body.id, (this.pending.get(hit.body.id) || 0) + damage);
          if (v > 3 && (otherEntity?.type === 'projectile' || hit.type === 'tnt'))
            this.events.push({
              type: 'impact',
              x: hit.body.position.x,
              y: hit.body.position.y,
              material: hit.type === 'block' ? (hit.def as BlockDef).material : hit.type,
              power: v,
            });
        }
      }
    });
    // Settle contacts without artificial construction damage before accepting input.
    for (let i = 0; i < 90; i++) Engine.update(this.engine, PHYSICS.step);
    this.suppress = false;
  }
  private add(e: Entity) {
    this.entities.set(e.body.id, e);
    Composite.add(this.engine.world, e.body);
    return e;
  }
  get remainingMonsters() {
    return [...this.entities.values()].filter((e) => e.type === 'monster').length;
  }
  get nextKind() {
    return this.level.projectiles[this.shots];
  }
  get unused() {
    return Math.max(0, this.level.projectiles.length - this.shots);
  }
  launch(pull: { x: number; y: number }, override?: StuffieKind) {
    if (this.phase !== 'aiming' || !this.nextKind) return false;
    const kind = override || this.nextKind,
      cfg = STUFFIES[kind];
    const length = Math.hypot(pull.x, pull.y);
    if (length < 9) return false;
    const scale = Math.min(1, PHYSICS.maxPull / length);
    const p = this.level.sling;
    const b = Bodies.circle(p.x, p.y, cfg.radius, {
      density: cfg.density,
      friction: 0.65,
      restitution: 0.27,
      frictionAir: 0.0015,
    });
    this.current = this.add({
      id: `shot-${this.shots}`,
      type: 'projectile',
      body: b,
      health: 999,
      maxHealth: 999,
      kind,
      born: this.time,
    });
    Body.setVelocity(b, {
      x: -pull.x * scale * PHYSICS.launchScale,
      y: -pull.y * scale * PHYSICS.launchScale,
    });
    Body.setAngularVelocity(b, -pull.x * 0.0006);
    this.shots++;
    this.phase = 'flying';
    this.abilityUsed = false;
    this.quiet = 0;
    this.shotStart = this.time;
    this.events.push({ type: 'launch', x: p.x, y: p.y });
    return true;
  }
  activate() {
    const e = this.current;
    if (this.phase !== 'flying' || !e || this.abilityUsed || this.time - e.born < 80) return false;
    this.abilityUsed = true;
    const b = e.body,
      v = b.velocity;
    if (e.kind === 'duck') Body.setVelocity(b, { x: Math.max(15, v.x * 1.75), y: v.y * 0.5 - 1 });
    if (e.kind === 'bear') {
      Body.setVelocity(b, { x: v.x * 0.5, y: 23 });
      Body.setDensity(b, 0.022);
    }
    if (e.kind === 'sheep') {
      Body.setVelocity(b, { x: v.x * 1.16, y: v.y - 4 });
    } // small buoyant hop
    if (e.kind === 'rabbit')
      for (const direction of [-1, 1]) {
        const c = Bodies.circle(b.position.x, b.position.y + direction * 28, 15, {
          density: 0.005,
          friction: 0.65,
          restitution: 0.3,
          frictionAir: 0.0015,
        });
        Body.setVelocity(c, { x: v.x * 1.03, y: v.y + direction * 4 });
        this.add({
          id: `split-${direction}-${this.shots}`,
          type: 'projectile',
          body: c,
          kind: 'rabbit',
          health: 999,
          maxHealth: 999,
          born: this.time,
        });
      }
    this.events.push({ type: 'ability', x: b.position.x, y: b.position.y, material: e.kind });
    return true;
  }
  step() {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.time += PHYSICS.step;
    Engine.update(this.engine, PHYSICS.step);
    for (const [id, damage] of this.pending) {
      const e = this.entities.get(id);
      if (e) {
        e.health -= damage;
        if (e.health <= 0) this.destroy(e);
      }
    }
    this.pending.clear();
    for (const e of [...this.entities.values()])
      if (
        e.body.position.y > this.level.bounds.height + 150 ||
        e.body.position.x > this.level.bounds.width + 140 ||
        e.body.position.x < -100
      ) {
        if (e.type === 'projectile') this.remove(e);
        else this.destroy(e);
      }
    if (this.phase !== 'flying') return;
    const moving = [...this.entities.values()].some(
      (e) =>
        !e.body.isStatic &&
        !e.body.isSleeping &&
        (e.body.speed > 0.32 || Math.abs(e.body.angularVelocity) > 0.04),
    );
    this.quiet = moving ? 0 : this.quiet + 1;
    if (!this.remainingMonsters) {
      this.winQuiet++;
      if (this.quiet > 24 || this.winQuiet > 150) {
        this.score += this.unused * 3000;
        this.phase = 'won';
        this.events.push({ type: 'won', x: 0, y: 0, points: this.score });
      }
      return;
    }
    // Long-lived, slow rolling bodies cannot hold up a retry indefinitely.
    const age = this.time - this.shotStart;
    if (
      (age > 900 && this.quiet > PHYSICS.settleFrames) ||
      (age > PHYSICS.maxShotMs && !moving) ||
      age > 22000
    ) {
      for (const e of [...this.entities.values()]) if (e.type === 'projectile') this.remove(e);
      this.current = undefined;
      this.phase = this.nextKind ? 'aiming' : 'lost';
      this.events.push({ type: this.phase === 'lost' ? 'lost' : 'ready', x: 0, y: 0 });
    }
  }
  private remove(e: Entity) {
    Composite.remove(this.engine.world, e.body);
    this.entities.delete(e.body.id);
  }
  private destroy(e: Entity) {
    if (!this.entities.has(e.body.id)) return;
    const { x, y } = e.body.position;
    this.remove(e);
    if (e.type === 'tnt') {
      this.events.push({ type: 'explosion', x, y, power: 20 });
      this.score += 1000;
      for (const other of this.entities.values()) {
        const dx = other.body.position.x - x,
          dy = other.body.position.y - y,
          d = Math.hypot(dx, dy);
        if (d > 210 || other.body.isStatic) continue;
        Sleeping.set(other.body, false);
        const f = (1 - d / 210) * 0.065;
        Body.applyForce(other.body, other.body.position, {
          x: (dx / (d || 1)) * f * other.body.mass,
          y: (dy / (d || 1) - 0.3) * f * other.body.mass,
        });
        if (other.type !== 'projectile')
          this.pending.set(
            other.body.id,
            (this.pending.get(other.body.id) || 0) + (1 - d / 210) * 35,
          );
      }
    } else if (e.type === 'monster') {
      this.score += 5000;
      this.events.push({ type: 'monster', x, y, points: 5000 });
    } else if (e.type === 'block') {
      const m = (e.def as BlockDef).material;
      this.score += MATERIALS[m].points;
      this.events.push({ type: 'break', x, y, material: m, points: MATERIALS[m].points });
    }
  }
  drainEvents() {
    const es = this.events;
    this.events = [];
    return es;
  }
  dispose() {
    Events.off(this.engine, 'collisionStart');
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.entities.clear();
  }
}
export function starsFor(score: number, thresholds: Level['thresholds']) {
  return score >= thresholds[2] ? 3 : score >= thresholds[1] ? 2 : 1;
}
