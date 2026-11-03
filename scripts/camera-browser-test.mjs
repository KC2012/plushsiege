import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.env.CANVAS_CI ? ['--disable-webgl'] : [])],
});
const url = (process.env.GAME_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
let checks = 0;
const report = [];
const check = (name, value) => {
  assert.ok(value, name);
  checks++;
  console.log('PASS', name);
};
await mkdir('artifacts', { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/__camera-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><style>body{margin:0}canvas{display:block;touch-action:none}</style></head><body><div id="game"></div></body></html>',
    }),
  );
  await page.goto(url + '/__camera-test');
  const source = await page.request.get(url + '/src/game/scene.ts').then((r) => r.text()),
    phaserPath = source.match(/from ["']([^"']*phaser[^"']*)["']/)?.[1];
  assert.ok(phaserPath);
  await page.evaluate(async (phaserPath) => {
    const [{ default: Phaser }, { SiegeScene }] = await Promise.all([
      import(phaserPath),
      import('/src/game/scene.ts'),
    ]);
    const scene = new SiegeScene();
    window.__cameraScene = scene;
    window.__cameraGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: 1440,
      height: 810,
      scene: [scene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { activePointers: 2 },
      audio: { noAudio: true },
    });
    window.__cameraGame.events.once('ready', () => (window.__cameraReady = true));
    scene.audio.enabled = false;
    scene.onState = () => {
      if (window.__freezeShot && scene.sim?.shots) {
        scene.paused = true;
        window.__freezeShot = false;
      }
    };
  }, phaserPath);
  await page.waitForFunction(() => window.__cameraReady);
  const level = {
    version: 1,
    id: 'large-camera-proof',
    name: 'Camera proof',
    subtitle: 'A large playable physical world',
    world: 'countryside',
    bounds: { width: 4000, height: 1800, ground: 1600 },
    sling: { x: 235, y: 1455 },
    projectiles: ['sheep', 'duck'],
    blocks: [
      { id: 'post1', x: 2200, y: 1530, w: 22, h: 140, material: 'wood' },
      { id: 'post2', x: 2340, y: 1530, w: 22, h: 140, material: 'wood' },
      { id: 'roof', x: 2270, y: 1450, w: 190, h: 20, material: 'stone' },
    ],
    monsters: [{ id: 'target', x: 2270, y: 1582, radius: 18, kind: 'horn' }],
    hazards: [],
    thresholds: [5000, 8500, 11000],
    camera: { start: 'overview', zoom: 1.2 },
  };
  await page.evaluate((l) => window.__cameraScene.loadLevel(l), level);
  await page.waitForTimeout(150);
  let state = await page.evaluate(() => window.__cameraScene.viewState);
  check(
    'large world starts in a whole-level overview',
    Math.abs(state.zoom - 0.36) < 0.001 && state.isOverview,
  );
  await page.screenshot({ path: 'artifacts/camera-large-overview.png' });
  await page.mouse.move(720, 405);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(80);
  state = await page.evaluate(() => window.__cameraScene.viewState);
  check(
    'mouse wheel zooms the world without launching',
    state.zoom > 0.5 && (await page.evaluate(() => window.__cameraScene.sim.shots === 0)),
  );
  const before = state.x;
  await page.mouse.move(1000, 300);
  await page.mouse.down();
  await page.mouse.move(650, 320, { steps: 6 });
  await page.mouse.up();
  state = await page.evaluate(() => window.__cameraScene.viewState);
  check(
    'dragging empty scenery pans without launching',
    Math.abs(state.x - before) > 100 &&
      (await page.evaluate(() => window.__cameraScene.sim.shots === 0)),
  );
  check(
    'decorative background stays fixed while the world camera moves',
    await page.evaluate(() => {
      const s = window.__cameraScene;
      return (
        s.cameras.cameras[0].zoom === 1 &&
        s.cameras.cameras[0].scrollX === 0 &&
        s.cameras.cameras[0].scrollY === 0
      );
    }),
  );
  const cdp = await context.newCDPSession(page);
  const zoom = state.zoom;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 500, y: 200, id: 1 },
      { x: 800, y: 200, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: 450, y: 200, id: 1 },
      { x: 850, y: 200, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(80);
  state = await page.evaluate(() => window.__cameraScene.viewState);
  check(
    'two-finger pinch zooms without a launch or ability',
    state.zoom > zoom &&
      (await page.evaluate(
        () => window.__cameraScene.sim.shots === 0 && !window.__cameraScene.sim.abilityUsed,
      )),
  );
  await page.evaluate(() => window.__cameraScene.focusSling());
  await page.waitForFunction(() => {
    const r = window.__cameraScene.cameraRig;
    return (
      Math.abs(r.zoom - 1.2) < 0.0001 &&
      Math.abs(r.x - r.targetX) < 0.03 &&
      Math.abs(r.y - r.targetY) < 0.03
    );
  });
  const anchor = await page.evaluate(() =>
    window.__cameraScene.cameraRig.worldToScreen(window.__cameraScene.sim.level.sling),
  );
  check(
    'sling focus brings the loaded projectile into the viewport',
    anchor.x > 50 && anchor.x < 1390 && anchor.y > 50 && anchor.y < 760,
  );
  await page.evaluate(() => (window.__freezeShot = true));
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x - 72, anchor.y, { steps: 6 });
  await page.mouse.up();
  const shot = await page.evaluate(() => ({
    shots: window.__cameraScene.sim.shots,
    v: window.__cameraScene.sim.current?.body.velocity,
    state: window.__cameraScene.viewState,
  }));
  check(
    'aiming uses world coordinates at non-unit zoom',
    shot.shots === 1 && Math.abs(shot.v.x - 60 * 0.215) < 0.22 && Math.abs(shot.v.y) < 0.22,
  );
  check('a shot enables camera tracking', shot.state.tracking);
  await page.evaluate(() => (window.__cameraScene.paused = false));
  await page.waitForFunction(() => window.__cameraScene.viewState.x > 750, null, {
    timeout: 20000,
  });
  await page.mouse.move(1000, 200);
  await page.mouse.down();
  await page.mouse.move(780, 200, { steps: 6 });
  await page.mouse.up();
  check(
    'manual inspection interrupts projectile tracking',
    await page.evaluate(() => !window.__cameraScene.viewState.tracking),
  );
  await page.evaluate(() => window.__cameraScene.overview());
  await page.waitForFunction(() => Math.abs(window.__cameraScene.viewState.zoom - 0.36) < 0.003);
  check(
    'overview can be restored during the same shot',
    await page.evaluate(() => window.__cameraScene.sim.shots === 1),
  );
  await page.screenshot({ path: 'artifacts/camera-follow-overview.png' });
  const legacy = {
    ...level,
    bounds: { width: 1440, height: 810, ground: 675 },
    sling: { x: 235, y: 530 },
    blocks: [],
    monsters: [{ id: 'target', x: 1200, y: 657 }],
    camera: undefined,
  };
  await page.evaluate((l) => window.__cameraScene.loadLevel(l), legacy);
  const old = await page.evaluate(() => window.__cameraScene.toWorld(235, 530));
  check(
    'legacy level pointer mapping remains unchanged',
    Math.abs(old.x - 235) < 0.001 && Math.abs(old.y - 530) < 0.001,
  );
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.evaluate(
    (l) => window.__cameraScene.loadLevel({ ...l, camera: { start: 'sling', zoom: 1.2 } }),
    level,
  );
  await page.waitForTimeout(120);
  const scaledAnchor = await page.evaluate(() =>
    window.__cameraScene.cameraRig.worldToScreen(window.__cameraScene.sim.level.sling),
  );
  const canvas = await page.locator('canvas').boundingBox();
  const scaledPoint = (x, y) => ({
    x: canvas.x + (x * canvas.width) / 1440,
    y: canvas.y + (y * canvas.height) / 810,
  });
  const down = scaledPoint(scaledAnchor.x, scaledAnchor.y),
    up = scaledPoint(scaledAnchor.x - 72, scaledAnchor.y);
  await page.evaluate(() => (window.__freezeShot = true));
  await page.mouse.move(down.x, down.y);
  await page.mouse.down();
  await page.mouse.move(up.x, up.y, { steps: 6 });
  await page.mouse.up();
  const scaled = await page.evaluate(() => ({
    shots: window.__cameraScene.sim.shots,
    v: window.__cameraScene.sim.current?.body.velocity,
  }));
  check(
    'iPad-sized FIT canvas preserves zoom-correct world aiming',
    scaled.shots === 1 && Math.abs(scaled.v.x - 12.9) < 0.22 && Math.abs(scaled.v.y) < 0.22,
  );
  check('camera integration has no uncaught browser errors', errors.length === 0);
  report.push({ checks, errors });
  await writeFile('artifacts/camera-browser.json', JSON.stringify(report, null, 2));
  console.log(`Camera browser: ${checks} checks passed.`);
  await context.close();
} finally {
  await browser.close();
}
