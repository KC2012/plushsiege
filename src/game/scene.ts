import Phaser from 'phaser';
import { Simulation } from './physics';
import {
  drawBackground,
  drawStuffie,
  drawMonster,
  drawBlock,
  drawFragment,
  drawHazard,
  drawSling,
} from './art';
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
  private abilityTap?: { id: number; x: number; y: number; at: number };
  private releaseAt = -1000;
  private heldPointers = new Set<number>();
  private abilityUntil = 0;
  private reactions = new Map<number, number>();
  private trails: { x: number; y: number; at: number; color: number }[] = [];
  private trailAt = 0;
  /** Coordinates passed to the real monster painter, for visual/physics regression inspection. */
  renderedMonsters: { id: string; x: number; y: number; angle: number; healthRatio: number }[] = [];
  private monsterLooks = new Map<number, { kind: string; radius: number; angle: number }>();
  private monsterGhosts: {
    x: number;
    y: number;
    kind: string;
    radius: number;
    angle: number;
    at: number;
  }[] = [];
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
      if (this.mode !== 'play' || this.paused || !this.sim) return;
      this.heldPointers.add(p.id);
      if (this.heldPointers.size > 1) {
        this.pull = undefined;
        this.pointerId = undefined;
        this.abilityTap = undefined;
        return;
      }
      if (this.pointerId !== undefined || this.abilityTap) return;
      if (p.event instanceof MouseEvent && p.button !== 0) return;
      this.audio.unlock();
      if (this.sim.phase === 'flying') {
        if (this.elapsed - this.releaseAt > 180 && this.sim.canActivate)
          this.abilityTap = { id: p.id, x: p.x, y: p.y, at: this.elapsed };
        return;
      }
      if (
        this.sim.phase === 'aiming' &&
        Math.hypot(p.x - this.sim.level.sling.x, p.y - this.sim.level.sling.y) < 65
      ) {
        this.pointerId = p.id;
        this.pull = { x: 0, y: 0 };
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (
        this.abilityTap?.id === p.id &&
        Math.hypot(p.x - this.abilityTap.x, p.y - this.abilityTap.y) > 14
      )
        this.abilityTap = undefined;
      if (this.pointerId === p.id && this.pull && this.sim) this.setPull(p.x, p.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.heldPointers.delete(p.id);
      if (this.abilityTap?.id === p.id) {
        const tap = this.abilityTap;
        this.abilityTap = undefined;
        if (this.elapsed - tap.at < 450 && Math.hypot(p.x - tap.x, p.y - tap.y) < 14)
          this.useAbility();
        return;
      }
      if (this.pointerId !== p.id || !this.pull || !this.sim) return;
      this.setPull(p.x, p.y);
      if (this.sim.launch(this.pull)) this.releaseAt = this.elapsed;
      this.cancelAim();
      this.onState();
    });
    this.input.on('gameout', () => this.cancelAim());
    const cancel = () => this.cancelAim();
    this.game.canvas.addEventListener('pointercancel', cancel);
    this.events.once('shutdown', () =>
      this.game.canvas.removeEventListener('pointercancel', cancel),
    );
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
  useAbility() {
    if (this.paused || this.mode !== 'play') return false;
    const activated = this.sim?.activate() || false;
    if (activated) this.onState();
    return activated;
  }
  cancelAim() {
    this.heldPointers.clear();
    this.abilityTap = undefined;
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
    this.reactions.clear();
    this.renderedMonsters = [];
    this.monsterLooks.clear();
    this.monsterGhosts = [];
    this.trails = [];
    this.abilityUntil = 0;
    this.evilUntil = 0;
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
        if ((e.type === 'impact' || (e.type as string) === 'damage') && e.bodyId !== undefined)
          this.reactions.set(e.bodyId, this.elapsed);
        if (e.type === 'monster' && e.bodyId !== undefined) {
          const look = this.monsterLooks.get(e.bodyId);
          if (look && !this.reducedMotion)
            this.monsterGhosts.push({ ...look, x: e.x, y: e.y, at: this.elapsed });
          this.monsterLooks.delete(e.bodyId);
        }
        if (e.type === 'impact' && e.projectileId !== undefined)
          this.reactions.set(e.projectileId, this.elapsed);
        if (e.type === 'ability') {
          this.abilityUntil = this.elapsed + 650;
          if (!this.reducedMotion) this.effects.burst(e);
        }
        if (e.type === 'won' && !this.reducedMotion) this.effects.burst({ ...e, x: 720, y: 330 });
        if (['impact', 'break', 'monster', 'explosion'].includes(e.type)) {
          if (!this.reducedMotion) this.effects.burst(e);
          if (!this.reducedMotion && (e.type === 'explosion' || e.type === 'monster'))
            this.cameras.main.shake(90, 0.0025);
          if ((e.type === 'explosion' || e.type === 'monster') && sim.current?.kind) {
            const evil = STUFFIES[sim.current.kind].evil;
            if (Math.random() < evil.chance) this.evilUntil = this.elapsed + evil.duration;
          }
        }
        if ((e.type as string) === 'damage') this.audio.play('impact', e.material);
        else this.audio.play(e.type, e.material);
      }
      const state = `${sim.phase}:${sim.score}:${sim.shots}:${sim.remainingMonsters}:${sim.abilityUsed}:${sim.canActivate}`;
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
    this.renderedMonsters = [];
    this.trails = this.trails.filter((p) => this.elapsed - p.at < 300);
    if (!this.reducedMotion && this.mode === 'play') {
      if (this.elapsed - this.trailAt > 30 && !this.paused) {
        this.trailAt = this.elapsed;
        for (const e of sim.entities.values())
          if (e.type === 'projectile' && e.body.speed > 5) {
            this.trails.push({
              x: e.body.position.x,
              y: e.body.position.y,
              at: this.elapsed,
              color: e.kind === 'duck' ? 0xffd44e : e.kind === 'rabbit' ? 0xc29aee : 0xfff2ce,
            });
          }
        this.trails = this.trails.slice(-30);
      }
      for (const t of this.trails) {
        g.fillStyle(t.color, (1 - (this.elapsed - t.at) / 300) * 0.4);
        g.fillCircle(t.x, t.y, 5);
      }
    }
    for (const e of sim.entities.values()) {
      const p = e.body.position;
      if (e.type === 'block' || e.type === 'fragment')
        (e.type === 'fragment' ? drawFragment : drawBlock)(
          g,
          { ...(e.def as BlockDef), x: p.x, y: p.y, angle: e.body.angle },
          e.health / e.maxHealth,
        );
      if (e.type === 'monster') {
        const d = e.def as MonsterDef,
          r = d.radius || 18;
        const renderY =
          p.y +
          (this.mode === 'home' && !this.reducedMotion
            ? Math.sin(this.elapsed / 650 + p.x) * 1.5
            : 0);
        const hit = this.elapsed - (this.reactions.get(e.body.id) || -10000) < 250;
        const danger = [...sim.entities.values()].some(
          (other) =>
            other.type !== 'monster' &&
            other.body.speed > 2 &&
            Math.hypot(other.body.position.x - p.x, other.body.position.y - p.y) < 160,
        );
        drawMonster(g, p.x, renderY, r, d.kind, e.body.angle, danger, {
          falling: !e.body.isSleeping && e.body.velocity.y > 1.2,
          hit,
          healthRatio: Math.max(0, e.health / e.maxHealth),
        });
        this.renderedMonsters.push({
          id: e.id,
          x: p.x,
          y: renderY,
          angle: e.body.angle,
          healthRatio: e.health / e.maxHealth,
        });
        this.monsterLooks.set(e.body.id, {
          kind: d.kind || 'horn',
          radius: r,
          angle: e.body.angle,
        });
      }
      if (e.type === 'tnt') drawHazard(g, p.x, p.y, e.body.angle);
      if (e.type === 'projectile')
        drawStuffie(g, p.x, p.y, e.body.circleRadius || 23, e.kind!, e.body.angle, {
          evil: this.elapsed < this.evilUntil,
          stretch:
            this.elapsed - (this.reactions.get(e.body.id) || -10000) < 300
              ? -0.27 *
                Math.cos((this.elapsed - this.reactions.get(e.body.id)!) / 95) *
                Math.max(0, 1 - (this.elapsed - this.reactions.get(e.body.id)!) / 300)
              : e.body.speed > 9
                ? 0.12
                : 0,
          celebrate: sim.phase === 'won',
          impact: this.elapsed - (this.reactions.get(e.body.id) || -10000) < 140,
          blink: Math.sin(this.elapsed / 330) > 0.995,
        });
    }
    this.monsterGhosts = this.monsterGhosts.filter((m) => this.elapsed - m.at < 220).slice(-20);
    for (const m of this.monsterGhosts) {
      const age = (this.elapsed - m.at) / 220;
      drawMonster(
        g,
        m.x,
        m.y - age * 15,
        m.radius * (1 - age * 0.7),
        m.kind,
        m.angle + age * 0.4,
        false,
        { defeated: true },
      );
    }
    const anchor = sim.level.sling;
    if (this.mode === 'home') {
      const idle = this.reducedMotion ? 0 : this.elapsed;
      const crew = [
        ['sheep', 190, 58],
        ['duck', 310, 46],
        ['bear', 430, 61],
        ['rabbit', 555, 47],
      ] as const;
      for (const [kind, x, r] of crew)
        drawStuffie(
          g,
          x,
          669 - r + Math.sin(idle / 600 + x) * 2,
          r,
          kind,
          Math.sin(idle / 1100 + x) * 0.035,
          {
            blink: Math.sin(idle / 400 + x) > 0.985,
            celebrate: kind === 'duck' && Math.sin(idle / 1800) > 0.92,
          },
        );
      // Two little pennants make the physical towers read as a monster castle.
      for (const [x, y] of [
        [825, 432],
        [1130, 405],
      ]) {
        g.lineStyle(4, 0x242139);
        g.lineBetween(x, y + 5, x, y - 60);
        g.fillStyle(0xff765c);
        g.fillTriangle(x, y - 60, x + 45, y - 48 + Math.sin(idle / 700) * 3, x, y - 35);
      }
      // A few lightweight ambient sprites over the cached countryside, never a redraw of the scenery.
      if (!this.reducedMotion) {
        for (let i = 0; i < 3; i++) {
          const x = 320 + i * 360 + Math.sin(idle / 3500 + i) * 24,
            y = 390 + Math.sin(idle / 1900 + i) * 25;
          g.fillStyle(i % 2 ? 0xffd44e : 0x965fea, 0.7);
          g.fillEllipse(x - 3, y, 7, Math.abs(Math.sin(idle / 140)) * 9 + 2);
          g.fillEllipse(x + 3, y, 7, Math.abs(Math.sin(idle / 140)) * 9 + 2);
        }
      }
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
            g.fillStyle(0x242139, Math.max(0.08, 0.55 - i / 200));
            g.fillCircle(x, y, 4 - i * 0.025);
          }
          if (y > 700) break;
        }
        g.lineStyle(1, 0x242139, 0.18);
        g.strokeCircle(anchor.x, anchor.y, PHYSICS.maxPull);
      }
    }
    if (sim.current && this.elapsed < this.abilityUntil && !this.reducedMotion) {
      const p = sim.current.body.position,
        kind = sim.current.kind,
        fade = (this.abilityUntil - this.elapsed) / 650;
      g.lineStyle(
        3,
        kind === 'duck'
          ? 0xffd44e
          : kind === 'rabbit'
            ? 0xc29aee
            : kind === 'bear'
              ? 0xdf9253
              : 0xffedc3,
        fade,
      );
      g.strokeCircle(p.x, p.y, (sim.current.body.circleRadius || 24) + 10 + (1 - fade) * 25);
      if (kind === 'duck') {
        for (let i = 0; i < 3; i++)
          g.lineBetween(p.x - 30 - i * 9, p.y - 12 + i * 12, p.x - 65 - i * 9, p.y - 12 + i * 12);
      }
      if (kind === 'bear') {
        g.lineBetween(p.x, p.y + 34, p.x, p.y + 68);
        g.lineBetween(p.x, p.y + 68, p.x - 10, p.y + 56);
        g.lineBetween(p.x, p.y + 68, p.x + 10, p.y + 56);
      }
    }
    this.fx.clear();
    this.effects.draw(this.fx, this.paused ? 0 : delta);
  }
}
