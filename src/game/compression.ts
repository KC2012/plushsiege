import Matter from 'matter-js';
import type { Entity } from './physics';
import type { Point } from './types';
import type { DamageRecord } from './damage';
import { PHYSICS } from './config';

interface Contact {
  body: Matter.Body;
  reaction: number;
}
interface LoadState {
  elapsed: number;
  debt: number;
  baselineReaction: number;
  armed: boolean;
  filteredRatio: number;
}
export interface CompressionReading {
  supportedMass: number;
  weightRatio: number;
  durationMs: number;
  active: boolean;
  grounded: boolean;
}
/** Convex contact skin, used only to retain an already established support. */
export function convexBodiesNear(a: Matter.Body, b: Matter.Body, margin = 1.5) {
  if (a.bounds.min.x - b.bounds.max.x > margin || b.bounds.min.x - a.bounds.max.x > margin ||
      a.bounds.min.y - b.bounds.max.y > margin || b.bounds.min.y - a.bounds.max.y > margin) return false;
  for (const axis of [...a.axes, ...b.axes]) {
    let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
    for (const p of a.vertices) { const v = p.x * axis.x + p.y * axis.y; amin = Math.min(amin, v); amax = Math.max(amax, v); }
    for (const p of b.vertices) { const v = p.x * axis.x + p.y * axis.y; bmin = Math.min(bmin, v); bmax = Math.max(bmax, v); }
    if (Math.max(amin - bmax, bmin - amax) > margin) return false;
  }
  return true;
}

/** Static load is evaluated from the contact support graph, not sprite overlap.
 * A collapse/new loading must first qualify it; authored resting loads are safe.
 * Sleeping contacts retain the same weight and cannot shelter a buried target.
 */
export class CompressionSystem {
  readonly readings = new Map<number, CompressionReading>();
  readonly supportGraph = new Map<number, Set<Matter.Body>>();
  private states = new Map<number, LoadState>();
  private origins = new Map<number, { x: number; y: number; angle: number }>();
  private shares = new Map<number, Map<number, number>>();
  private recent = new Map<string, { at: number; normal: Point; reaction: number; a: Matter.Body; b: Matter.Body }>();
  pending = false;

  constructor(
    private engine: Matter.Engine,
    private entities: Map<number, Entity>,
    private accelerationAt: (point: Point) => Point,
    private constraints: () => Iterable<Matter.Constraint>,
    private damage: (entity: Entity, record: DamageRecord) => void,
  ) {
    for (const e of entities.values())
      this.origins.set(e.body.id, { ...e.body.position, angle: e.body.angle });
  }

  update(time: number) {
    this.pending = false;
    this.readings.clear();
    this.supportGraph.clear();
    const bodies = Matter.Composite.allBodies(this.engine.world);
    const live = new Set(bodies.map(b => b.id));
    const below = new Map<number, Contact[]>();
    const above = new Map<number, Contact[]>();
    const gravity = new Map<number, Point>();
    const direction = (b: Matter.Body) => {
      let g = gravity.get(b.id);
      if (!g) {
        const a = this.accelerationAt(b.position), m = Math.hypot(a.x, a.y);
        g = m > 1e-5 ? { x: a.x / m, y: a.y / m } : { x: 0, y: 1 };
        gravity.set(b.id, g);
      }
      return g;
    };
    const connect = (upper: Matter.Body, lower: Matter.Body, reaction: number) => {
      if (upper.isStatic) return;
      const supports = below.get(upper.id) || [];
      supports.push({ body: lower, reaction });
      below.set(upper.id, supports);
      const loads = above.get(lower.id) || [];
      loads.push({ body: upper, reaction });
      above.set(lower.id, loads);
      const dependents = this.supportGraph.get(lower.id) || new Set<Matter.Body>();
      dependents.add(upper); this.supportGraph.set(lower.id, dependents);
    };
    const joined = new Set<string>();
    const link = (id: string, a: Matter.Body, b: Matter.Body, n: Point, reaction: number) => {
      const ga = direction(a), gb = direction(b);
      if (n.x * ga.x + n.y * ga.y < -.45) connect(a, b, reaction);
      if (n.x * gb.x + n.y * gb.y > .45) connect(b, a, reaction);
      joined.add(id);
    };
    for (const pair of this.engine.pairs.list) {
      const { parentA: a, parentB: b } = pair.collision;
      if (pair.isSensor || !live.has(a.id) || !live.has(b.id)) continue;
      let n = pair.collision.normal;
      const active = pair.isActive || ((a.isSleeping || a.isStatic) && (b.isSleeping || b.isStatic));
      const cached = this.recent.get(pair.id);
      // A loaded rigid contact can alternate active/inactive as the position
      // solver corrects slop. Preserve at most 100ms of its actual contact,
      // only while convex hulls remain within 1.5px and are not separating fast.
      const retained = cached && time - cached.at <= 100 &&
        Math.abs((a.velocity.x - b.velocity.x) * cached.normal.x + (a.velocity.y - b.velocity.y) * cached.normal.y) < .65 && convexBodiesNear(a, b);
      if (!(active && Matter.Bounds.overlaps(a.bounds, b.bounds)) && !retained) continue;
      if (!active && retained) n = cached.normal;
      // Resolver impulses are apportioned reactions, not extra damage pulses.
      const contacts = pair.contacts as unknown as { normalImpulse?: number }[];
      const reaction = active ? contacts.reduce((sum, c) => sum + Math.abs(c?.normalImpulse || 0), 0) : cached?.reaction || 0;
      if (active) this.recent.set(pair.id, { at: time, normal: { ...n }, reaction, a, b });
      link(pair.id, a, b, n, reaction);
    }
    // Matter can remove an awake pair entirely on its separating correction
    // tick, rather than leave an inactive pair in the list.
    for (const [id, c] of this.recent) {
      if (joined.has(id) || time - c.at > 100 || !live.has(c.a.id) || !live.has(c.b.id)) continue;
      if (Math.abs((c.a.velocity.x - c.b.velocity.x) * c.normal.x + (c.a.velocity.y - c.b.velocity.y) * c.normal.y) >= .65) continue;
      if (convexBodiesNear(c.a, c.b)) link(id, c.a, c.b, c.normal, c.reaction);
    }

    for (const [id, supports] of below) {
      const total = supports.reduce((n, s) => n + s.reaction, 0);
      if (total > 1e-7) this.shares.set(id, new Map(supports.map(s => [s.body.id, s.reaction / total])));
      else {
        const old = this.shares.get(id);
        const retained = supports.reduce((n, s) => n + (old?.get(s.body.id) || 0), 0);
        this.shares.set(id, new Map(supports.map(s => [s.body.id, retained > 0 ? (old?.get(s.body.id) || 0) / retained : 1 / supports.length])));
      }
    }
    const anchored = new Set<number>();
    for (const c of this.constraints()) {
      if (c.bodyA) anchored.add(c.bodyA.id);
      if (c.bodyB) anchored.add(c.bodyB.id);
    }
    // Reverse reachability is exact even when local gravity makes a contact
    // cycle. Enumerating all possible support paths becomes exponential in rubble.
    const grounded=new Set(bodies.filter(b=>b.isStatic).map(b=>b.id)),queue=[...grounded];
    for(let i=0;i<queue.length;i++)for(const upper of above.get(queue[i])||[])if(!grounded.has(upper.body.id)){grounded.add(upper.body.id);queue.push(upper.body.id);}
    const memo=new Map<number,{mass:number;disturbed:boolean}>(),visiting=new Set<number>();
    const load = (body: Matter.Body, recipient: number): { mass: number; disturbed: boolean } => {
      if (body.isStatic || visiting.has(body.id)) return { mass: 0, disturbed: false };
      const entity = this.entities.get(body.id);
      if (!entity || !['block', 'fragment', 'prop'].includes(entity.type)) return { mass: 0, disturbed: false };
      let total=memo.get(body.id);
      if(!total){
        visiting.add(body.id);
        const g = direction(body), origin = this.origins.get(body.id);
        total={mass:body.mass,disturbed:!origin || entity.type === 'fragment' ||
          (body.position.x - origin.x) * g.x + (body.position.y - origin.y) * g.y > 10 ||
          Math.abs(body.angle - origin.angle) > .16};
        for (const parent of above.get(body.id) || []) {
          // Cut a feedback edge conservatively; never count a circulating load
          // repeatedly. Acyclic split/recombined load paths retain their shares.
          const upper = load(parent.body, body.id);
          total.mass+=upper.mass;total.disturbed ||= upper.disturbed;
        }
        visiting.delete(body.id);memo.set(body.id,total);
      }
      let mass=total.mass;const disturbed=total.disturbed;
      // A rope/hinge can carry the body rather than the monster. Its contact
      // reaction is the evidence of how much load actually reaches the target.
      if (anchored.has(body.id)) {
        const reaction = (below.get(body.id) || []).find(s => s.body.id === recipient)?.reaction || 0;
        const a = this.accelerationAt(body.position), magnitude = Math.hypot(a.x, a.y);
        mass = Math.min(mass, reaction / Math.max(magnitude, .01));
      }
      return { mass: mass * (this.shares.get(body.id)?.get(recipient) || 0), disturbed };
    };

    for (const monster of this.entities.values()) {
      if (monster.type !== 'monster') continue;
      const id = monster.body.id;
      const state = this.states.get(id) || { elapsed: 0, debt: 0, baselineReaction: 0, armed: false, filteredRatio: 0 };
      this.states.set(id, state);
      const roots = above.get(id) || [];
      const supported = grounded.has(monster.body.id);
      const opposed = roots.length > 0 && supported;
      let mass = 0, disturbed = false, reaction = 0;
      for (const upper of roots) {
        const portion = load(upper.body, id);
        mass += portion.mass; disturbed ||= portion.disturbed; reaction += upper.reaction;
      }
      const a = this.accelerationAt(monster.body.position);
      const acceleration = Math.hypot(a.x, a.y);
      const reference = .001 * PHYSICS.step * PHYSICS.step;
      const weightRatio = mass * acceleration / reference / monster.body.mass;
      const measured = reaction / reference / monster.body.mass;
      if (!disturbed && time < 600) state.baselineReaction = Math.max(state.baselineReaction, measured);
      // Increased measured compression also detects a new actuator load that
      // cannot move far because the target is pinned against its support.
      const forced = time > 600 && measured > state.baselineReaction + PHYSICS.compressionLoadRatio / 2;
      const ratio = Math.max(weightRatio, forced ? measured : 0);
      if (opposed && (disturbed || forced)) state.armed = true;
      state.filteredRatio = opposed ? state.filteredRatio + (ratio - state.filteredRatio) * .2 : 0;
      // Contact impulses fluctuate while a stack settles. Hysteresis preserves
      // one continuous overload rather than restarting its grace every other
      // tick; losing the opposing contacts still releases it immediately.
      const threshold = state.elapsed > 0 ? PHYSICS.compressionLoadRatio * .75 : PHYSICS.compressionLoadRatio;
      const active = opposed && state.armed && state.filteredRatio >= threshold;
      if (active) {
        state.elapsed += PHYSICS.step;
        this.pending = true;
        if (state.elapsed >= PHYSICS.compressionDelayMs) {
          state.debt += (state.filteredRatio - 3) * PHYSICS.compressionDamageRate * PHYSICS.step / 1000;
          if (state.debt >= .15) {
            this.damage(monster, { amount: state.debt, source: 'crush', supportedMass: mass, pressureRatio: state.filteredRatio, compressionMs: state.elapsed });
            state.debt = 0;
          }
        }
      } else {
        state.elapsed = 0; state.debt = 0;
        if (!opposed) state.armed = false;
      }
      this.readings.set(id, { supportedMass: mass, weightRatio: ratio, durationMs: state.elapsed, active, grounded: supported });
    }
    for (const id of this.states.keys()) if (!this.entities.has(id)) this.states.delete(id);
    for (const id of this.shares.keys()) if (!live.has(id)) this.shares.delete(id);
    for (const [id, contact] of this.recent) if (time - contact.at > 100) this.recent.delete(id);
  }
}
