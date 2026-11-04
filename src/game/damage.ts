import type Matter from 'matter-js';
import { PHYSICS } from './config';
export type DamageSource = 'projectile' | 'structure' | 'fall' | 'monster' | 'explosion' | 'crush' | 'lava' | 'heat';
export interface DamageRecord {
  amount: number;
  source: DamageSource;
  sourceBodyId?: number;
  normalSpeed?: number;
  energy?: number;
  material?: string;
  supportedMass?: number;
  pressureRatio?: number;
  compressionMs?: number;
}

/** Contact-space energy before Matter resolves an impact. The normal points B → A.
 * Tangential sliding contributes no fracture energy; angular closing motion does.
 * Effective mass includes the contact lever arm and rotational inertia.
 */
export function contactImpact(
  a: Matter.Body,
  b: Matter.Body,
  point: Matter.Vector,
  normal: Matter.Vector,
) {
  const ra = { x: point.x - a.position.x, y: point.y - a.position.y };
  const rb = { x: point.x - b.position.x, y: point.y - b.position.y };
  const va = {
    x: a.velocity.x - a.angularVelocity * ra.y,
    y: a.velocity.y + a.angularVelocity * ra.x,
  };
  const vb = {
    x: b.velocity.x - b.angularVelocity * rb.y,
    y: b.velocity.y + b.angularVelocity * rb.x,
  };
  const closing = Math.max(0, -((va.x - vb.x) * normal.x + (va.y - vb.y) * normal.y));
  const ca = ra.x * normal.y - ra.y * normal.x;
  const cb = rb.x * normal.y - rb.y * normal.x;
  const inverse =
    a.inverseMass + b.inverseMass + ca * ca * a.inverseInertia + cb * cb * b.inverseInertia;
  const mass = inverse > 0 ? 1 / inverse : 0;
  return { closing, mass, energy: 0.5 * mass * closing * closing };
}

export function impactDamage(
  energy: number,
  closing: number,
  monster: boolean,
  source?: DamageSource,
) {
  const floor =
    monster && source === 'fall' ? PHYSICS.monsterFallSpeedFloor : PHYSICS.damageSpeedFloor;
  return closing < floor
    ? 0
    : energy * PHYSICS.damageEnergyScale * (monster ? PHYSICS.monsterDamageScale : 1);
}

/** A supported target cannot freely recoil away from an incoming vertical load.
 * Use the striking body's contact inertia, rather than the two-free-body reduced
 * mass, for the compressive work transferred into an opposed support reaction. */
export function pinnedImpactEnergy(striker:Matter.Body,point:Matter.Vector,normal:Matter.Vector,closing:number) {
  const r={x:point.x-striker.position.x,y:point.y-striker.position.y};
  const cross=r.x*normal.y-r.y*normal.x;
  const inverse=striker.inverseMass+cross*cross*striker.inverseInertia;
  return inverse>0?.5*closing*closing/inverse:0;
}
