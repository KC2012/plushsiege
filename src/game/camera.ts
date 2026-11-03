import type { Level, Point } from './types';
export const CAMERA_VIEW = { width: 1440, height: 810 };
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  minZoom: number;
  tracking: boolean;
  isOverview: boolean;
}
/** Pure camera geometry, independent of Phaser, so pointer transforms and bounds
 * can be tested without a renderer. Positions are world-space view centers. */
export class CameraRig {
  x = 720;
  y = 405;
  zoom = 1;
  targetX = 720;
  targetY = 405;
  targetZoom = 1;
  minZoom = 1;
  maxZoom = 1.65;
  tracking = false;
  constructor(public bounds = { width: 1440, height: 810 }) {
    this.reset(bounds);
  }
  reset(bounds: { width: number; height: number }) {
    this.bounds = { ...bounds };
    this.minZoom = Math.min(
      1,
      CAMERA_VIEW.width / bounds.width,
      CAMERA_VIEW.height / bounds.height,
    );
    this.x = this.targetX = bounds.width / 2;
    this.y = this.targetY = bounds.height / 2;
    this.zoom = this.targetZoom = this.minZoom;
    this.tracking = false;
    this.constrain(true);
  }
  get state(): CameraState {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom,
      minZoom: this.minZoom,
      tracking: this.tracking,
      isOverview: this.zoom <= this.minZoom * 1.08 && this.minZoom < 0.9,
    };
  }
  screenToWorld(p: Point): Point {
    return { x: this.x + (p.x - 720) / this.zoom, y: this.y + (p.y - 405) / this.zoom };
  }
  worldToScreen(p: Point): Point {
    return { x: (p.x - this.x) * this.zoom + 720, y: (p.y - this.y) * this.zoom + 405 };
  }
  private bounded(x: number, y: number, zoom: number): Point {
    const hw = 720 / zoom,
      hh = 405 / zoom;
    return {
      x:
        this.bounds.width <= hw * 2
          ? this.bounds.width / 2
          : Math.max(hw, Math.min(this.bounds.width - hw, x)),
      y:
        this.bounds.height <= hh * 2
          ? this.bounds.height / 2
          : Math.max(hh, Math.min(this.bounds.height - hh, y)),
    };
  }
  private constrain(current = false) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom));
    const p = this.bounded(this.targetX, this.targetY, this.targetZoom);
    this.targetX = p.x;
    this.targetY = p.y;
    if (current) {
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
      const c = this.bounded(this.x, this.y, this.zoom);
      this.x = c.x;
      this.y = c.y;
    }
  }
  overview(immediate = false) {
    this.tracking = false;
    this.targetZoom = this.minZoom;
    this.targetX = this.bounds.width / 2;
    this.targetY = this.bounds.height / 2;
    this.constrain();
    if (immediate) this.snap();
  }
  focusSling(sling: Point, zoom = 1, immediate = false) {
    this.tracking = false;
    this.targetZoom = Math.max(this.minZoom, Math.min(1.2, zoom));
    this.targetX = sling.x + 360 / this.targetZoom;
    this.targetY = sling.y - 80 / this.targetZoom;
    this.constrain();
    if (immediate) this.snap();
  }
  follow(p: Point) {
    if (!this.tracking) return;
    this.targetZoom = Math.max(this.minZoom, Math.min(1, this.targetZoom));
    this.targetX = p.x + 210 / this.targetZoom;
    this.targetY = p.y - 80 / this.targetZoom;
    this.constrain();
  }
  panBy(screenDx: number, screenDy: number) {
    this.tracking = false;
    this.freeze();
    this.x -= screenDx / this.zoom;
    this.y -= screenDy / this.zoom;
    this.targetX = this.x;
    this.targetY = this.y;
    this.constrain(true);
    this.targetX = this.x;
    this.targetY = this.y;
  }
  zoomAt(factor: number, screen: Point = { x: 720, y: 405 }) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.tracking = false;
    this.freeze();
    const anchor = this.screenToWorld(screen);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    this.x = anchor.x - (screen.x - 720) / this.zoom;
    this.y = anchor.y - (screen.y - 405) / this.zoom;
    this.targetZoom = this.zoom;
    this.targetX = this.x;
    this.targetY = this.y;
    this.constrain(true);
    this.targetX = this.x;
    this.targetY = this.y;
  }
  freeze() {
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetZoom = this.zoom;
    this.tracking = false;
  }
  snap() {
    this.x = this.targetX;
    this.y = this.targetY;
    this.zoom = this.targetZoom;
    this.constrain(true);
  }
  update(delta: number) {
    const a = 1 - Math.exp(-Math.max(0, Math.min(delta, 100)) * 0.009);
    this.zoom += (this.targetZoom - this.zoom) * a;
    this.x += (this.targetX - this.x) * a;
    this.y += (this.targetY - this.y) * a;
    this.constrain(true);
  }
  begin(level: Level, mode: 'home' | 'play') {
    this.reset(mode === 'home' ? { width: 1440, height: 810 } : level.bounds);
    if (mode === 'home') {
      this.zoom = this.targetZoom = 1;
      this.x = this.targetX = 720;
      this.y = this.targetY = 405;
    } else if (level.camera?.start === 'sling')
      this.focusSling(level.sling, level.camera.zoom || 1, true);
    else if (this.minZoom >= 0.99) this.focusSling(level.sling, 1, true);
  }
}
