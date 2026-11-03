import Matter from 'matter-js';
import type { Level, StuffieKind, BlockDef, MonsterDef } from './types';
import { MATERIALS, STUFFIES, PHYSICS } from './config';
import { contactImpact, impactDamage, type DamageRecord } from './damage';
const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;
export type Phase = 'aiming' | 'flying' | 'won' | 'lost';
export interface Entity {
  id: string;
  type: 'block' | 'fragment' | 'monster' | 'projectile' | 'tnt';
  body: Matter.Body;
  health: number;
  maxHealth: number;
  def?: BlockDef | MonsterDef;
  kind?: StuffieKind;
  born: number;
  /** Large fracture pieces keep the original material, dimensions and rigid body. */
  parentId?: string;
  depth?: number;
  fractureAt?: number;
  /** An ability is available only before the first solid impact. */
  airborne?: boolean;
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
    | 'lost'
    | 'damage';
  x: number;
  y: number;
  material?: string;
  power?: number;
  points?: number;
  bodyId?: number;
  projectileId?: number;
  projectileKind?: StuffieKind;
  source?: DamageRecord['source'];
  sourceBodyId?: number;
  amount?: number;
  remainingHealth?: number;
  normalSpeed?: number;
  energy?: number;
}

export { contactImpact } from './damage';

export class Simulation {
  engine: Matter.Engine;
  entities = new Map<number, Entity>();
  phase: Phase = 'aiming';
  score = 0;
  shots = 0;
  time = 0;
  current?: Entity;
  abilityUsed = false;
  private pending = new Map<number, DamageRecord[]>();
  private supportDependents = new Map<number, Set<Matter.Body>>();
  private supportPoses = new Map<number, { x: number; y: number; angle: number }>();
  private impactTimes = new Map<string, number>();
  private disposed = false;
  private supportWakePending = false;
  private events: GameEvent[] = [];
  /** Bounded diagnostic history, independent of the render event queue. */
  damageHistory: GameEvent[] = [];
  private quiet = 0;
  private shotStart = 0;

  constructor(public level: Level) {
    this.engine = Engine.create({
      enableSleeping: true,
      positionIterations: 10,
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
        chamfer: { radius: 1 },
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
      this.add({
        id: d.id,
        type: 'monster',
        body: b,
        def: d,
        health: PHYSICS.monsterHealth,
        maxHealth: PHYSICS.monsterHealth,
        born: 0,
      });
    }
    for (const d of level.hazards)
      this.add({
        id: d.id,
        type: 'tnt',
        body: Bodies.rectangle(d.x, d.y, 40, 40, { density: 0.0018, friction: 0.7 }),
        health: 5,
        maxHealth: 5,
        born: 0,
      });
    Events.on(this.engine, 'beforeSolve', () => {
      // Existing contact pairs need their pre-solver velocities too: collisionActive
      // fires after resolution and collisionStart alone misses renewed loading.
      const live = new Set(Composite.allBodies(this.engine.world).map((body) => body.id));
      for (const pair of this.engine.pairs.list) {
        const a = pair.collision.parentA,
          b = pair.collision.parentB;
        if (!live.has(a.id) || !live.has(b.id) || !Matter.Bounds.overlaps(a.bounds, b.bounds))
          continue;
        // A sleeping pair can resume contact without a collisionStart event.
        // Re-test geometry so wake-up impacts are sampled before their impulse.
        const collision = Matter.Collision.collides(a, b);
        if (collision) this.sampleImpact({ ...pair, collision });
      }
    });
    Events.on(this.engine, 'collisionStart', (ev: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of ev.pairs) this.sampleImpact(pair);
    });
    Events.on(this.engine.world, 'afterRemove', (event: { object: unknown }) => {
      const removed = Array.isArray(event.object) ? event.object : [event.object];
      for (const object of removed) {
        if (object && typeof object === 'object' && 'type' in object && object.type === 'body')
          this.wakeDependents((object as Matter.Body).id);
        else if (
          object &&
          typeof object === 'object' &&
          'type' in object &&
          object.type === 'composite'
        )
          for (const body of Composite.allBodies(object as Matter.Composite))
            this.wakeDependents(body.id);
      }
    });
    // No hidden construction simulation: the first visible frame is the authored geometry.
  }
  private queueDamage(entity: Entity, damage: DamageRecord) {
    if (damage.amount <= 0.12 || entity.body.isStatic || entity.type === 'projectile') return;
    const list = this.pending.get(entity.body.id) || [];
    list.push(damage);
    this.pending.set(entity.body.id, list);
  }
  private sampleImpact(pair: Matter.Pair) {
    if (pair.isSensor) return;
    const a = pair.collision.parentA,
      b = pair.collision.parentB;
    const ea = this.entities.get(a.id),
      eb = this.entities.get(b.id);
    if (ea?.type === 'projectile') ea.airborne = false;
    if (eb?.type === 'projectile') eb.airborne = false;
    const supports = pair.collision.supports.filter((p): p is Matter.Vector => !!p);
    const point = supports.length
      ? {
          x: supports.reduce((n, p) => n + p.x, 0) / supports.length,
          y: supports.reduce((n, p) => n + p.y, 0) / supports.length,
        }
      : { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };
    const impact = contactImpact(a, b, point, pair.collision.normal);
    if (this.impactTimes.get(pair.id) === this.time) return;
    let damaged = false;
    for (const [hit, other, body] of [
      [ea, eb, b],
      [eb, ea, a],
    ] as const) {
      if (!hit || hit.type === 'projectile' || hit.body.isStatic) continue;
      const landing =
        hit.type === 'monster' &&
        hit.body.position.y < body.position.y &&
        hit.body.velocity.y - body.velocity.y > 0.5 &&
        Math.abs(pair.collision.normal.y) > 0.6;
      const source = landing
        ? 'fall'
        : other?.type === 'projectile'
          ? 'projectile'
          : other?.type === 'block' || other?.type === 'fragment'
            ? 'structure'
            : other?.type === 'monster'
              ? 'monster'
              : 'fall';
      const amount = impactDamage(impact.energy, impact.closing, hit.type === 'monster', source);
      if (amount > 0.12) {
        this.queueDamage(hit, {
          amount,
          source,
          sourceBodyId: body.id,
          normalSpeed: impact.closing,
          energy: impact.energy,
          material: other?.def && 'material' in other.def ? other.def.material : undefined,
        });
        damaged = true;
      }
      // A newly descending heavy load can crush a grounded/pinned monster even
      // when solver-limited closing speed is below the ordinary impact threshold.
      // This is work from moving load, never damage from a contact timer.
      if (
        hit.type === 'monster' &&
        (other?.type === 'block' || other?.type === 'fragment') &&
        !body.isStatic &&
        Math.abs(pair.collision.normal.y) > 0.65 &&
        body.position.y < hit.body.position.y &&
        body.mass > hit.body.mass * PHYSICS.crushMassRatio &&
        impact.closing >= PHYSICS.crushSpeedFloor &&
        impact.closing < PHYSICS.damageSpeedFloor &&
        body.velocity.y > PHYSICS.crushSpeedFloor &&
        this.isSupported(hit.body.id, body.id)
      ) {
        const energy = 0.5 * body.mass * impact.closing * impact.closing;
        const crush = energy * PHYSICS.damageEnergyScale * PHYSICS.monsterDamageScale;
        if (crush > 0.12) {
          this.queueDamage(hit, {
            amount: crush,
            source: 'crush',
            sourceBodyId: body.id,
            normalSpeed: impact.closing,
            energy,
            material: (other.def as BlockDef).material,
          });
          damaged = true;
        }
      }
    }
    if (damaged) this.impactTimes.set(pair.id, this.time);
    if (impact.closing > 2.2 && damaged) {
      const target = ea?.type === 'projectile' ? eb : ea || eb,
        projectile = ea?.type === 'projectile' ? ea : eb?.type === 'projectile' ? eb : undefined;
      this.events.push({
        type: 'impact',
        x: point.x,
        y: point.y,
        material:
          target?.type === 'block' || target?.type === 'fragment'
            ? (target.def as BlockDef).material
            : target?.type,
        power: impact.closing,
        bodyId: target?.body.id,
        projectileId: projectile?.body.id,
        projectileKind: projectile?.kind,
      });
    }
  }
  private isSupported(id: number, excluding: number) {
    for (const [support, dependents] of this.supportDependents)
      if (support !== excluding && [...dependents].some((body) => body.id === id)) return true;
    return false;
  }
  private wakeDependents(id: number, seen = new Set<number>()) {
    if (seen.has(id) || this.disposed) return;
    seen.add(id);
    for (const body of this.supportDependents.get(id) || []) {
      if (!body.isStatic) {
        if (body.isSleeping) this.supportWakePending = true;
        Sleeping.set(body, false);
      }
      this.wakeDependents(body.id, seen);
    }
  }
  private wakeMovedSupports() {
    const bodies = Composite.allBodies(this.engine.world),
      live = new Set(bodies.map((body) => body.id));
    for (const [id] of this.supportPoses)
      if (!live.has(id)) {
        this.wakeDependents(id);
        this.supportPoses.delete(id);
      }
    for (const body of bodies) {
      const old = this.supportPoses.get(body.id);
      if (!old) {
        this.supportPoses.set(body.id, { ...body.position, angle: body.angle });
        continue;
      }
      if (
        Math.hypot(body.position.x - old.x, body.position.y - old.y) > 0.25 ||
        Math.abs(body.angle - old.angle) > 0.006
      ) {
        if (!body.isStatic && body.isSleeping) {
          this.supportWakePending = true;
          Sleeping.set(body, false);
        }
        this.wakeDependents(body.id);
        this.supportPoses.set(body.id, { ...body.position, angle: body.angle });
      }
    }
  }
  private refreshSupports() {
    const graph = new Map<number, Set<Matter.Body>>(),
      live = new Set(Composite.allBodies(this.engine.world).map((body) => body.id));
    const connect = (support: Matter.Body, dependent: Matter.Body) => {
      if (dependent.isStatic) return;
      const set = graph.get(support.id) || new Set<Matter.Body>();
      set.add(dependent);
      graph.set(support.id, set);
    };
    for (const pair of this.engine.pairs.list) {
      const a = pair.collision.parentA,
        b = pair.collision.parentB;
      if (
        pair.isSensor ||
        !live.has(a.id) ||
        !live.has(b.id) ||
        (!pair.isActive && !((a.isSleeping || a.isStatic) && (b.isSleeping || b.isStatic)))
      )
        continue;
      if (pair.collision.normal.y < -0.2) connect(b, a);
      if (pair.collision.normal.y > 0.2) connect(a, b);
    }
    for (const [support, dependents] of this.supportDependents)
      for (const body of dependents)
        if (!graph.get(support)?.has(body) && body.isSleeping) this.wakeDependents(support);
    this.supportDependents = graph;
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
  get canActivate() {
    const e = this.current;
    return (
      this.phase === 'flying' &&
      !!e &&
      this.entities.has(e.body.id) &&
      !!e.airborne &&
      !this.abilityUsed &&
      this.time - e.born >= 120
    );
  }
  launch(pull: { x: number; y: number }, override?: StuffieKind) {
    if (
      this.phase !== 'aiming' ||
      !this.nextKind ||
      !Number.isFinite(pull.x) ||
      !Number.isFinite(pull.y)
    )
      return false;
    const kind = override || this.nextKind,
      cfg = STUFFIES[kind];
    if (!cfg) return false;
    const length = Math.hypot(pull.x, pull.y);
    if (length < 9) return false;
    const scale = Math.min(1, PHYSICS.maxPull / length),
      p = this.level.sling;
    const body = Bodies.circle(p.x, p.y, cfg.radius, {
      density: cfg.density,
      friction: 0.65,
      restitution: 0.23,
      frictionAir: 0.0015,
      sleepThreshold: 55,
    });
    this.current = this.add({
      id: `shot-${this.shots}`,
      type: 'projectile',
      body,
      health: 999,
      maxHealth: 999,
      kind,
      born: this.time,
      airborne: true,
    });
    Body.setVelocity(body, {
      x: -pull.x * scale * PHYSICS.launchScale,
      y: -pull.y * scale * PHYSICS.launchScale,
    });
    Body.setAngularVelocity(body, -pull.x * 0.0006);
    this.shots++;
    this.phase = 'flying';
    this.abilityUsed = false;
    this.quiet = 0;
    this.shotStart = this.time;
    this.events.push({
      type: 'launch',
      x: p.x,
      y: p.y,
      projectileId: body.id,
      projectileKind: kind,
    });
    return true;
  }
  activate() {
    if (!this.canActivate) return false;
    const e = this.current!,
      b = e.body,
      v = { ...b.velocity };
    this.abilityUsed = true;
    if (e.kind === 'duck') {
      const speed = Math.hypot(v.x, v.y),
        boost = Math.min(34, Math.max(17, speed * 1.65));
      const direction =
        speed > 0.1
          ? { x: v.x / speed, y: v.y / speed }
          : { x: Math.cos(b.angle), y: Math.sin(b.angle) };
      Body.setVelocity(b, { x: direction.x * boost, y: direction.y * boost });
    }
    if (e.kind === 'bear') Body.setVelocity(b, { x: v.x * 0.55, y: 24 });
    if (e.kind === 'sheep') Body.setVelocity(b, { x: v.x * 1.12, y: v.y - 5 });
    if (e.kind === 'rabbit') {
      const mass = b.mass,
        radius = b.circleRadius || STUFFIES.rabbit.radius,
        smallRadius = 15;
      const speed = Math.hypot(v.x, v.y) || 1,
        side = { x: -v.y / speed, y: v.x / speed };
      const group = Body.nextGroup(true);
      Body.scale(b, smallRadius / radius, smallRadius / radius);
      Body.setMass(b, mass / 3);
      b.collisionFilter.group = group;
      for (const direction of [-1, 1]) {
        const child = Bodies.circle(
          b.position.x + side.x * 32 * direction,
          b.position.y + side.y * 32 * direction,
          smallRadius,
          { friction: 0.65, restitution: 0.23, frictionAir: 0.0015, collisionFilter: { group } },
        );
        Body.setMass(child, mass / 3);
        Body.setVelocity(child, {
          x: v.x + side.x * direction * 3.5,
          y: v.y + side.y * direction * 3.5,
        });
        Body.setAngularVelocity(child, b.angularVelocity);
        this.add({
          id: `split-${direction}-${this.shots}`,
          type: 'projectile',
          body: child,
          kind: 'rabbit',
          health: 999,
          maxHealth: 999,
          born: this.time,
          airborne: true,
        });
      }
    }
    this.events.push({
      type: 'ability',
      x: b.position.x,
      y: b.position.y,
      material: e.kind,
      projectileId: b.id,
      projectileKind: e.kind,
    });
    return true;
  }
  step() {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.time += PHYSICS.step;
    this.impactTimes.clear();
    this.wakeMovedSupports();
    Engine.update(this.engine, PHYSICS.step);
    this.refreshSupports();
    // Process TNT chains without dropping damage queued by another explosion in the same tick.
    for (let round = 0; this.pending.size && round < 8; round++) {
      const damage = [...this.pending];
      this.pending.clear();
      for (const [id, records] of damage) {
        const e = this.entities.get(id);
        if (!e) continue;
        for (const record of records) {
          e.health -= record.amount;
          const event: GameEvent = {
            type: 'damage',
            x: e.body.position.x,
            y: e.body.position.y,
            bodyId: id,
            amount: record.amount,
            remainingHealth: Math.max(0, e.health),
            source: record.source,
            sourceBodyId: record.sourceBodyId,
            normalSpeed: record.normalSpeed,
            energy: record.energy,
            material: record.material,
          };
          this.events.push(event);
          this.damageHistory.push(event);
          if (this.damageHistory.length > 256) this.damageHistory.shift();
        }
        if (e.health <= 0) {
          if (e.type === 'block' || e.type === 'fragment')
            e.fractureAt ??= this.time + PHYSICS.fractureDelayMs;
          else this.destroy(e);
        }
      }
    }
    for (const e of [...this.entities.values()]) {
      const p = e.body.position;
      if (
        p.y > this.level.bounds.height + 150 ||
        p.x > this.level.bounds.width + 140 ||
        p.x < -100
      ) {
        this.destroy(e, false);
        continue;
      }
      if (e.fractureAt !== undefined && this.time >= e.fractureAt) this.fracture(e);
    }
    const moving =
      this.supportWakePending ||
      [...this.entities.values()].some(
        (e) =>
          !e.body.isStatic &&
          !e.body.isSleeping &&
          (e.body.speed > 0.32 ||
            Math.abs(e.body.angularVelocity) > 0.04 ||
            e.fractureAt !== undefined),
      );
    this.supportWakePending = false;
    this.quiet = moving ? 0 : this.quiet + 1;
    // Large fragments disappear only after a long, settled lifetime, never in mid-collapse.
    if (this.quiet > PHYSICS.settleFrames)
      for (const e of [...this.entities.values()]) {
        if (
          e.type === 'fragment' &&
          e.body.isSleeping &&
          this.time - e.born > PHYSICS.fragmentLifetimeMs &&
          !this.supportsBody(e)
        )
          this.remove(e);
      }
    if (this.phase !== 'flying') return;
    if (!this.remainingMonsters) {
      if (this.quiet > 36) {
        this.score += this.unused * 3000;
        this.phase = 'won';
        this.events.push({ type: 'won', x: 0, y: 0, points: this.score });
      }
      return;
    }
    // A long flight is never force-ended while meaningful physical motion continues.
    if (this.time - this.shotStart > 900 && this.quiet > PHYSICS.settleFrames) {
      // Spent stuffies remain real supports / debris for subsequent shots.
      this.current = undefined;
      this.phase = this.nextKind ? 'aiming' : 'lost';
      this.events.push({ type: this.phase === 'lost' ? 'lost' : 'ready', x: 0, y: 0 });
    }
  }
  private supportsBody(e: Entity) {
    const a = e.body.bounds;
    return [...this.entities.values()].some(
      (other) =>
        other !== e &&
        !other.body.isStatic &&
        Math.abs(other.body.bounds.max.y - a.min.y) < 12 &&
        Math.min(other.body.bounds.max.x, a.max.x) - Math.max(other.body.bounds.min.x, a.min.x) > 4,
    );
  }
  private remove(e: Entity) {
    Composite.remove(this.engine.world, e.body);
    this.entities.delete(e.body.id);
    if (this.current === e) this.current = undefined;
  }
  /** Split a failed structural body along its long axis. Child velocities preserve the
   * parent's linear and angular motion; there are no random fracture explosions. */
  private fracture(e: Entity) {
    if (!e.def || e.body.isStatic) return;
    const d = e.def as BlockDef,
      m = MATERIALS[d.material],
      depth = e.depth || 0;
    const count = d.material === 'glass' ? 3 : 2;
    const long = Math.max(d.w, d.h),
      short = Math.min(d.w, d.h);
    if (depth >= 2 || long / count < PHYSICS.minFragmentSize || short < 7) {
      // These pieces are already small: one material-specific visual break is enough.
      this.destroy(e, false);
      return;
    }
    const fragments = [...this.entities.values()].filter((n) => n.type === 'fragment').length;
    if (fragments - Number(e.type === 'fragment') + count > PHYSICS.fragmentLimit) {
      // At the physical-debris budget retain a cracked rigid body, rather than make
      // a large structural piece disappear just to satisfy the performance cap.
      e.fractureAt = undefined;
      e.health = Math.max(0.5, e.maxHealth * 0.08);
      return;
    }
    const horizontal = d.w >= d.h,
      { x, y } = e.body.position,
      angle = e.body.angle;
    const velocity = { ...e.body.velocity },
      omega = e.body.angularVelocity,
      mass = e.body.mass;
    this.destroy(e, false);
    for (let i = 0; i < count; i++) {
      const local = (i - (count - 1) / 2) * (long / count),
        dx = (horizontal ? Math.cos(angle) : -Math.sin(angle)) * local,
        dy = (horizontal ? Math.sin(angle) : Math.cos(angle)) * local;
      const w = horizontal ? d.w / count - 0.6 : d.w,
        h = horizontal ? d.h : d.h / count - 0.6;
      const body = Bodies.rectangle(x + dx, y + dy, w, h, {
        angle,
        density: m.density,
        friction: m.friction,
        restitution: m.restitution,
        sleepThreshold: 55,
        chamfer: { radius: 0.6 },
      });
      Body.setMass(body, mass / count);
      Body.setVelocity(body, { x: velocity.x - omega * dy, y: velocity.y + omega * dx });
      Body.setAngularVelocity(body, omega);
      const health = Math.max(2, m.health * Math.pow(0.45, depth + 1));
      this.add({
        id: `${e.id}:f${i}`,
        parentId: e.parentId || e.id,
        depth: depth + 1,
        type: 'fragment',
        body,
        def: { ...d, id: `${e.id}:f${i}`, x: x + dx, y: y + dy, w, h, angle },
        health,
        maxHealth: health,
        born: this.time,
      });
    }
  }
  private destroy(e: Entity, spawnFragments = false) {
    if (!this.entities.has(e.body.id)) return;
    if (spawnFragments && (e.type === 'block' || e.type === 'fragment')) {
      this.fracture(e);
      return;
    }
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
        const f = (1 - d / 210) * 0.055;
        Body.applyForce(other.body, other.body.position, {
          x: (dx / (d || 1)) * f * other.body.mass,
          y: (dy / (d || 1) - 0.3) * f * other.body.mass,
        });
        if (other.type !== 'projectile')
          this.queueDamage(other, {
            amount: (1 - d / 210) * 95,
            source: 'explosion',
            sourceBodyId: e.body.id,
          });
      }
    } else if (e.type === 'monster') {
      this.score += 5000;
      this.events.push({ type: 'monster', x, y, points: 5000, bodyId: e.body.id });
    } else if (e.type === 'block' || e.type === 'fragment') {
      const material = (e.def as BlockDef).material,
        points = e.type === 'block' ? MATERIALS[material].points : 0;
      this.score += points;
      this.events.push({ type: 'break', x, y, material, points, bodyId: e.body.id });
    }
  }
  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
  dispose() {
    this.disposed = true;
    Events.off(this.engine, 'collisionStart');
    Events.off(this.engine, 'beforeSolve');
    Events.off(this.engine.world, 'afterRemove');
    this.supportDependents.clear();
    this.supportPoses.clear();
    this.impactTimes.clear();
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.entities.clear();
    this.pending.clear();
    this.events = [];
    this.damageHistory = [];
  }
}
export function starsFor(score: number, thresholds: Level['thresholds']) {
  return score >= thresholds[2] ? 3 : score >= thresholds[1] ? 2 : 1;
}
