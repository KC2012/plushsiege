import Phaser from 'phaser';
import { Simulation } from './physics';
import { drawBackground, drawStuffie, drawMonster, drawBlock, drawHazard, drawSling } from './art';
import { PHYSICS, STUFFIES } from './config';
import { Effects } from './effects';
import { AudioSystem } from './audio';
import type { Level, BlockDef, MonsterDef } from './types';
import { getTheme } from '../content/themes';
export class SiegeScene extends Phaser.Scene {
  sim?: Simulation;
  mode: 'home' | 'play' = 'home';
  paused = false;
  preview = true;
  reducedMotion = false;
  onState: () => void = () => {};
  onResult: (won: boolean) => void = () => {};
  audio = new AudioSystem();
  private background!: Phaser.GameObjects.Image;
  private objects!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private effects = new Effects();
  private accumulator = 0;
  private pull?: { x: number; y: number };
  private pointerId?: number;
  private resultSent = false;
  private lastState = '';
  private evilUntil = 0;
  private elapsed = 0;
  constructor() {
    super('siege');
  }
  create() {
    const backdrop = this.add.graphics();
    drawBackground(backdrop, 0);
    backdrop.generateTexture('plush-bg-countryside', 1440, 810);
    backdrop.destroy();
    this.background = this.add.image(0, 0, 'plush-bg-countryside').setOrigin(0);
    this.objects = this.add.graphics();
    this.fx = this.add.graphics();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.mode !== 'play' || this.paused || !this.sim || this.pointerId !== undefined) return;
      this.audio.unlock();
      if (this.sim.phase === 'flying') {
        this.sim.activate();
        return;
      }
      if (
        this.sim.phase === 'aiming' &&
        Math.hypot(p.x - this.sim.level.sling.x, p.y - this.sim.level.sling.y) < 78
      ) {
        this.pointerId = p.id;
        this.pull = { x: 0, y: 0 };
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.pointerId !== p.id || !this.pull || !this.sim) return;
      this.setPull(p.x, p.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.pointerId !== p.id || !this.pull || !this.sim) return;
      this.setPull(p.x, p.y);
      this.sim.launch(this.pull);
      this.cancelAim();
      this.onState();
    });
    this.input.on('gameout', () => this.cancelAim());
    this.game.canvas.addEventListener('pointercancel', () => this.cancelAim());
    this.game.events.emit('ready');
  }
  private setPull(x: number, y: number) {
    if (!this.sim) return;
    const p = this.sim.level.sling,
      dx = x - p.x,
      dy = y - p.y,
      l = Math.hypot(dx, dy),
      s = Math.min(1, PHYSICS.maxPull / (l || 1));
    this.pull = { x: dx * s, y: dy * s };
  }
  cancelAim() {
    this.pull = undefined;
    this.pointerId = undefined;
  }
  loadLevel(level: Level, mode: 'home' | 'play' = 'play') {
    this.time.removeAllEvents();
    this.sim?.dispose();
    this.sim = new Simulation(structuredClone(level));
    this.mode = mode;
    const bgKey = 'plush-bg-' + getTheme(level.world).id;
    if (!this.textures.exists(bgKey)) {
      const painted = this.add.graphics();
      drawBackground(painted, 0, level.world);
      painted.generateTexture(bgKey, 1440, 810);
      painted.destroy();
    }
    this.background.setTexture(bgKey);
    this.paused = false;
    this.resultSent = false;
    this.accumulator = 0;
    this.effects.clear();
    this.cancelAim();
    this.lastState = '';
    this.onState();
  }
  update(_time: number, delta: number) {
    if (!this.background) return;
    this.elapsed += delta;
    const sim = this.sim;
    if (!sim) return;
    if (this.mode === 'play' && !this.paused) {
      this.accumulator += Math.min(delta, 65);
      while (this.accumulator >= PHYSICS.step) {
        sim.step();
        this.accumulator -= PHYSICS.step;
      }
      for (const e of sim.drainEvents()) {
        if (['impact', 'break', 'monster', 'explosion'].includes(e.type)) {
          if (!this.reducedMotion) this.effects.burst(e);
          if (!this.reducedMotion && (e.type === 'explosion' || e.type === 'monster'))
            this.cameras.main.shake(90, 0.0025);
          if ((e.type === 'explosion' || e.type === 'monster') && sim.current?.kind) {
            const evil = STUFFIES[sim.current.kind].evil;
            if (Math.random() < evil.chance) this.evilUntil = this.elapsed + evil.duration;
          }
        }
        this.audio.play(e.type, e.material);
      }
      const state = `${sim.phase}:${sim.score}:${sim.shots}:${sim.remainingMonsters}:${sim.abilityUsed}`;
      if (state !== this.lastState) {
        this.lastState = state;
        this.onState();
      }
      if ((sim.phase === 'won' || sim.phase === 'lost') && !this.resultSent) {
        this.resultSent = true;
        this.time.delayedCall(500, () => this.onResult(sim.phase === 'won'));
      }
    }
    const g = this.objects;
    g.clear();
    for (const e of sim.entities.values()) {
      const p = e.body.position;
      if (e.type === 'block')
        drawBlock(
          g,
          { ...(e.def as BlockDef), x: p.x, y: p.y, angle: e.body.angle },
          e.health / e.maxHealth,
        );
      if (e.type === 'monster')
        drawMonster(
          g,
          p.x,
          p.y,
          (e.def as MonsterDef).radius || 18,
          (e.def as MonsterDef).kind,
          e.body.angle,
          e.body.speed > 0.4,
        );
      if (e.type === 'tnt') drawHazard(g, p.x, p.y, e.body.angle);
      if (e.type === 'projectile')
        drawStuffie(g, p.x, p.y, e.body.circleRadius || 23, e.kind!, e.body.angle, {
          evil: this.elapsed < this.evilUntil,
          stretch: e.body.speed > 9 ? 0.12 : 0,
          blink: Math.sin(this.elapsed / 330) > 0.995,
        });
    }
    const anchor = sim.level.sling;
    if (this.mode === 'home') {
      // The title-screen crew lives on the same illustrated meadow as the playable scene.
      drawStuffie(g, 815, 620, 47, 'sheep', -0.13, { blink: Math.sin(this.elapsed / 400) > 0.99 });
      drawStuffie(g, 907, 624, 36, 'duck', 0.1);
      drawStuffie(g, 1280, 622, 46, 'bear', -0.07);
      drawStuffie(g, 1370, 614, 34, 'rabbit', 0.1);
    } else {
      const pouch = { x: anchor.x + (this.pull?.x || 0), y: anchor.y + (this.pull?.y || 0) };
      drawSling(g, anchor, pouch, false);
      if (sim.phase === 'aiming' && sim.nextKind) {
        drawStuffie(g, pouch.x, pouch.y, STUFFIES[sim.nextKind].radius, sim.nextKind, 0, {
          stretch: this.pull ? Math.hypot(this.pull.x, this.pull.y) / 350 : 0,
          blink: Math.sin(this.elapsed / 400) > 0.998,
        });
      }
      drawSling(g, anchor, pouch, true);
      sim.level.projectiles
        .slice(sim.shots + 1)
        .forEach((kind, i) =>
          drawStuffie(g, 140 - i * 48, 652, 18, kind, Math.sin(this.elapsed / 600 + i) * 0.04),
        );
      if (this.pull && this.preview) {
        let x = anchor.x,
          y = anchor.y,
          vx = -this.pull.x * PHYSICS.launchScale,
          vy = -this.pull.y * PHYSICS.launchScale;
        for (let i = 0; i < 100; i++) {
          vx *= 0.9985;
          vy = vy * 0.9985 + 0.2778;
          x += vx;
          y += vy;
          if (i % 5 === 0 && y < 675) {
            g.fillStyle(0x355c53, Math.max(0.08, 0.55 - i / 200));
            g.fillCircle(x, y, 4 - i * 0.025);
          }
          if (y > 700) break;
        }
        g.lineStyle(1, 0x50796b, 0.18);
        g.strokeCircle(anchor.x, anchor.y, PHYSICS.maxPull);
      }
    }
    this.fx.clear();
    if (!this.paused) this.effects.draw(this.fx, delta);
  }
}
