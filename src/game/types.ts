export type StuffieKind = 'sheep' | 'duck' | 'bear' | 'rabbit';
export type MaterialKind = 'wood' | 'glass' | 'stone' | 'ice' | 'metal';
export interface BlockDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
  material: MaterialKind;
  static?: boolean;
}
export interface MonsterDef {
  id: string;
  x: number;
  y: number;
  radius?: number;
  kind?: 'horn' | 'blob' | 'bat';
}
export interface HazardDef {
  id: string;
  x: number;
  y: number;
  kind: 'tnt';
}
export interface Point { x:number; y:number }
export interface TerrainDef { id:string; x:number; y:number; w:number; h:number; angle?:number; material?:MaterialKind; friction?:number }
export interface PropDef { id:string; x:number; y:number; kind:'boulder'|'planetoid'; radius:number; material?:MaterialKind; static?:boolean }
/** Constraint points are local offsets when a body ID is supplied; otherwise world anchors. */
export interface JointDef { id:string; kind:'rope'|'hinge'|'spring'; bodyA?:string; bodyB?:string; pointA:Point; pointB:Point; length?:number; stiffness?:number; damping?:number; breakForce?:number }
/** A trigger names a physical object: its removal releases the actuator, not a scripted collapse. */
export interface MechanismDef { id:string; kind:'motor'|'platform'|'vent'; body?:string; x?:number; y?:number; w?:number; h?:number; speed?:number; range?:number; axis?:'x'|'y'; force?:number; trigger?:string }
export interface ZoneDef { id:string; kind:'ice'|'lava'|'heat'|'gravity'|'zero-gravity'; x:number; y:number; w:number; h:number; gravity?:Point; center?:Point; strength?:number; radius?:number; rate?:number }
export interface Level {
  version: 1;
  id: string;
  name: string;
  subtitle: string;
  world: string;
  bounds: { width: number; height: number; ground: number };
  sling: { x: number; y: number };
  projectiles: StuffieKind[];
  blocks: BlockDef[];
  monsters: MonsterDef[];
  hazards: HazardDef[];
  thresholds: [number, number, number];
  par?: number;
  tutorial?: string;
  terrain?:TerrainDef[];
  props?:PropDef[];
  joints?:JointDef[];
  mechanisms?:MechanismDef[];
  zones?:ZoneDef[];
  environment?:{ gravity?:Point; groundFriction?:number; ground?:boolean };
  camera?:{ start?:'overview'|'sling'; zoom?:number };
  metadata?:{ category:'puzzle'|'siege'|'spectacle'; idea:string; mechanics:string[]; author?:string };

}
export interface ValidationIssue {
  path: string;
  message: string;
}
export const VIEW = { width: 1440, height: 810, ground: 675 };
