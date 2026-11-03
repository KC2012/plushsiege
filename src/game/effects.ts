import type Phaser from 'phaser';
import type { GameEvent } from './physics';
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
}
export class Effects {
  particles: Particle[] = [];
  burst(e: GameEvent) {
    const count = e.type === 'explosion' ? 30 : e.type === 'monster' ? 20 : 12;
    const colors =
      e.type === 'monster'
        ? [0xb9d6a6, 0xf5d15a, 0xffffff]
        : e.material === 'glass'
          ? [0x7bcad2, 0xc1edef, 0xffffff]
          : e.material === 'stone'
            ? [0x929d9a, 0x6d7e7a]
            : [0xb17b45, 0xddad70, 0xf2d2a5];
    for (let i = 0; i < count && this.particles.length < 140; i++) {
      const a = Math.random() * Math.PI * 2,
        s = 2 + Math.random() * 5;
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 2,
        life: 35 + Math.random() * 20,
        max: 55,
        r: 2 + Math.random() * 5,
        color: colors[i % colors.length],
        angle: Math.random() * 6,
      });
    }
  }
  draw(g: Phaser.GameObjects.Graphics, delta: number) {
    const d = Math.min(delta / 16.667, 2);
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.life -= d;
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.vy += 0.13 * d;
      g.fillStyle(p.color, Math.min(1, p.life / 15));
      g.fillCircle(p.x, p.y, p.r);
    }
  }
  clear() {
    this.particles = [];
  }
}
