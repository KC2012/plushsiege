export type StuffieKind = 'sheep' | 'duck' | 'bear' | 'rabbit';
export type MaterialKind = 'wood' | 'glass' | 'stone';
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
}
export interface ValidationIssue {
  path: string;
  message: string;
}
export const VIEW = { width: 1440, height: 810, ground: 675 };
