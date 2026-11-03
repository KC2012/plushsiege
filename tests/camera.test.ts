import test from 'node:test';
import assert from 'node:assert/strict';
import { CameraRig } from '../src/game/camera';
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test('legacy camera preserves original 1440x810 input coordinates', () => {
  const r = new CameraRig();
  close(r.zoom, 1);
  const p = r.screenToWorld({ x: 235, y: 530 });
  close(p.x, 235);
  close(p.y, 530);
});
test('overview fits a very large horizontal and vertical world', () => {
  const r = new CameraRig({ width: 4800, height: 2100 });
  close(r.minZoom, 0.3);
  const a = r.worldToScreen({ x: 0, y: 0 }),
    b = r.worldToScreen({ x: 4800, y: 2100 });
  assert.ok(a.x >= 0 && a.y >= 0 && b.x <= 1440 && b.y <= 810);
});
test('screen/world round trips after zoom and panning', () => {
  const r = new CameraRig({ width: 4800, height: 2100 });
  r.zoomAt(3, { x: 650, y: 400 });
  r.panBy(-350, 120);
  const p = { x: 875, y: 470 },
    w = r.screenToWorld(p),
    s = r.worldToScreen(w);
  close(s.x, p.x);
  close(s.y, p.y);
});
test('pan and zoom stay inside sensible camera boundaries', () => {
  const r = new CameraRig({ width: 3200, height: 1600 });
  r.zoomAt(100);
  r.panBy(100000, 100000);
  assert.ok(r.x >= 720 / r.zoom && r.y >= 405 / r.zoom);
  r.panBy(-200000, -200000);
  assert.ok(r.x <= 3200 - 720 / r.zoom && r.y <= 1600 - 405 / r.zoom);
  r.zoomAt(0.00001);
  close(r.zoom, r.minZoom);
});
test('pointer anchored zoom preserves the inspected location away from borders', () => {
  const r = new CameraRig({ width: 4800, height: 2100 });
  const p = { x: 720, y: 405 },
    before = r.screenToWorld(p);
  r.zoomAt(2, p);
  const after = r.screenToWorld(p);
  close(before.x, after.x);
  close(before.y, after.y);
});
test('manual inspection interrupts automatic following and overview restores whole world', () => {
  const r = new CameraRig({ width: 4800, height: 2100 });
  r.focusSling({ x: 235, y: 1500 }, 1, true);
  r.tracking = true;
  r.follow({ x: 2300, y: 800 });
  for (let i = 0; i < 40; i++) r.update(16.7);
  assert.ok(r.x > 1000);
  r.panBy(20, 0);
  assert.equal(r.tracking, false);
  r.overview(true);
  close(r.zoom, r.minZoom);
  close(r.x, 2400);
  close(r.y, 1050);
});
