import type Phaser from 'phaser';
import type { GameEvent } from './physics';
import { PHYSICS } from './config';
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: number;
  angle: number;
  spin: number;
  shape: 'dust' | 'shard' | 'splinter' | 'confetti' | 'chip';
}
/** Cosmetic shards are deliberately separate from the large, collidable physics fragments. */
export class Effects {
  particles: Particle[] = [];
  burst(e: GameEvent) {
    const ability = e.type === 'ability';
    const count =
      e.type === 'won'
        ? 40
        : e.type === 'explosion'
          ? 28
          : e.type === 'monster'
            ? 18
            : ability
              ? 14
              : e.type === 'impact'
                ? 6
                : 16;
    const colors =
      e.type === 'monster' || e.type === 'won'
        ? [0xb9d6a6, 0xf5d15a, 0xf2b295, 0xffffff]
        : ability
          ? [0xffefd0, 0xe2b4d6, 0xe8c552]
          : e.material === 'glass'
            ? [0x7bcad2, 0xc1edef, 0xffffff]
            : e.material === 'stone'
              ? [0x929d9a, 0x6d7e7a]
              : [0xb17b45, 0xddad70, 0xf2d2a5];
    for (let i = 0; i < count && this.particles.length < PHYSICS.debrisLimit; i++) {
      const a = Math.random() * Math.PI * 2,
        s = (e.type === 'impact' ? 1 : 2) + Math.random() * (e.type === 'explosion' ? 7 : 4),
        life = 25 + Math.random() * 25;
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 2,
        life,
        max: life,
        r: 2 + Math.random() * 4,
        color: colors[i % colors.length],
        angle: a,
        spin: (Math.random() - 0.5) * 0.15,
        shape:
          e.type === 'won' || e.type === 'monster' || ability
            ? 'confetti'
            : i % 3 === 0
              ? 'dust'
              : e.material === 'glass'
                ? 'shard'
                : e.material === 'stone'
                  ? 'chip'
                  : 'splinter',
      });
    }
    if (e.type === 'break' || e.type === 'explosion')
      for (let i = 0; i < 6 && this.particles.length < PHYSICS.debrisLimit; i++) {
        this.particles.push({
          x: e.x + (i - 3) * 5,
          y: e.y,
          vx: (i - 2.5) * 0.6,
          vy: -0.6 - Math.random(),
          life: 34,
          max: 34,
          r: 7 + (i % 3) * 2,
          color: 0xe7dbc4,
          angle: 0,
          spin: 0,
          shape: 'dust',
        });
      }
  }
  draw(g: Phaser.GameObjects.Graphics, delta: number) {
    const d = Math.min(delta / 16.667, 4);
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.life -= d;
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.vy += (p.shape === 'dust' ? -0.008 : 0.13) * d;
      p.angle += p.spin * d;
      const alpha = Math.max(0, p.life / p.max);
      g.fillStyle(p.color, p.shape === 'dust' ? alpha * 0.22 : Math.min(1, alpha * 2));
      if (p.shape === 'dust') {
        g.fillCircle(p.x, p.y, p.r + (1 - alpha) * 9);
        continue;
      }
      const dx = Math.cos(p.angle) * p.r,
        dy = Math.sin(p.angle) * p.r;
      if (p.shape === 'splinter') {
        g.lineStyle(2, p.color, alpha);
        g.lineBetween(p.x - dx * 1.7, p.y - dy * 1.7, p.x + dx * 1.7, p.y + dy * 1.7);
      } else if (p.shape === 'shard')
        g.fillTriangle(p.x + dx, p.y + dy, p.x - dy * 0.6, p.y + dx * 0.6, p.x - dx, p.y - dy);
      else g.fillTriangle(p.x + dx, p.y + dy, p.x - dy, p.y + dx, p.x - dx, p.y - dy);
    }
  }
  clear() {
    this.particles = [];
  }
}
