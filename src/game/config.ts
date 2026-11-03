import type { MaterialKind, StuffieKind } from './types';
export const MATERIALS: Record<
  MaterialKind,
  {
    density: number;
    health: number;
    friction: number;
    restitution: number;
    color: number;
    points: number;
  }
> = {
  wood: {
    density: 0.0017,
    health: 7.5,
    friction: 0.65,
    restitution: 0.08,
    color: 0xc38b50,
    points: 500,
  },
  glass: {
    density: 0.0011,
    health: 3.6,
    friction: 0.45,
    restitution: 0.05,
    color: 0x88d9de,
    points: 600,
  },
  stone: {
    density: 0.0038,
    health: 21,
    friction: 0.8,
    restitution: 0.02,
    color: 0x8d96a2,
    points: 800,
  },
};
export const STUFFIES: Record<
  StuffieKind,
  {
    name: string;
    role: string;
    radius: number;
    density: number;
    color: string;
    evil: { chance: number; duration: number };
  }
> = {
  sheep: {
    name: 'Mallow',
    role: 'Tap in flight for a little hop.',
    radius: 23,
    density: 0.006,
    color: '#fff3d8',
    evil: { chance: 0.022, duration: 100 },
  },
  duck: {
    name: 'Pip',
    role: 'Tap in flight to dash.',
    radius: 22,
    density: 0.005,
    color: '#ffcf4a',
    evil: { chance: 0.025, duration: 95 },
  },
  bear: {
    name: 'Bruno',
    role: 'Tap in flight for a mighty stomp.',
    radius: 29,
    density: 0.012,
    color: '#b67b55',
    evil: { chance: 0.018, duration: 110 },
  },
  rabbit: {
    name: 'Clover',
    role: 'Tap in flight to split into three.',
    radius: 22,
    density: 0.005,
    color: '#e4bbd9',
    evil: { chance: 0.025, duration: 90 },
  },
};
export const PHYSICS = {
  step: 1000 / 60,
  maxPull: 102,
  launchScale: 0.215,
  settleFrames: 90,
  maxShotMs: 12500,
  debrisLimit: 140,
};
