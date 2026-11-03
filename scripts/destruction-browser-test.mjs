import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox'],
});
const url = (process.env.GAME_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
let checks = 0;
const check = (name, condition) => {
  assert.ok(condition, name);
  checks++;
  console.log('PASS', name);
};
await mkdir('artifacts', { recursive: true });
const observations = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Isolated HTML loads the exact real Phaser / SiegeScene modules and their real pointer handlers.
  await page.route('**/__destruction-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><title>Destruction replay fixture</title><style>body{margin:0;background:#e9eee1}canvas{display:block;touch-action:none}</style></head><body><div id="game"></div></body></html>',
    }),
  );
  await page.goto(`${url}/__destruction-test`);
  const sceneSource = await page.request
    .get(`${url}/src/game/scene.ts`)
    .then((response) => response.text());
  const phaserPath = sceneSource.match(/from ["']([^"']*phaser[^"']*)["']/)?.[1];
  assert.ok(phaserPath, 'Vite resolves the real Phaser module');
  await page.evaluate(async (phaserPath) => {
    const [{ default: Phaser }, { SiegeScene }] = await Promise.all([
      import(phaserPath),
      import('/src/game/scene.ts'),
    ]);
    const scene = new SiegeScene();
    scene.audio.enabled = false;
    window.__scene = scene;
    window.__game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: 1440,
      height: 810,
      backgroundColor: '#e9eee1',
      antialias: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [scene],
      input: { activePointers: 2 },
      audio: { noAudio: true },
    });
    window.__game.events.once('ready', () => (window.__ready = true));
    const snapshot = () => ({
      time: scene.sim?.time,
      phase: scene.sim?.phase,
      abilityUsed: scene.sim?.abilityUsed,
      canActivate: scene.sim?.canActivate,
      shots: scene.sim?.shots,
      entities: [...(scene.sim?.entities.values() || [])].map((e) => ({
        id: e.id,
        parentId: e.parentId,
        type: e.type,
        material: e.def?.material,
        x: e.body.position.x,
        y: e.body.position.y,
        angle: e.body.angle,
        speed: e.body.speed,
        health: e.health,
        maxHealth: e.maxHealth,
        fractureAt: e.fractureAt,
        sleeping: e.body.isSleeping,
      })),
    });
    window.__snapshot = snapshot;
    window.__loadFixture = (level) => {
      scene.loadLevel(level);
      window.__captured = null;
      window.__freezeAt = null;
    };
    window.__game.events.on('poststep', () => {
      if (!scene.sim || scene.paused || !window.__freezeAt) return;
      const body = [...scene.sim.entities.values()].find((e) => e.id === 'support');
      const projectile = scene.sim.current;
      const fragments = [...scene.sim.entities.values()].filter((e) => e.type === 'fragment');
      const roof = [...scene.sim.entities.values()].find((e) => e.id === 'b3');
      const support = [...scene.sim.entities.values()].find((e) => e.id === 'b1');
      const hit =
        window.__freezeAt === 'castle'
          ? roof?.type === 'block' &&
            (Math.abs(roof.body.angle) > 0.08 ||
              Math.hypot(roof.body.position.x - 920, roof.body.position.y - 566) > 8) &&
            (!support || Math.abs(support.body.position.x - 869) > 12)
          : window.__freezeAt === 'flight'
            ? projectile?.body.position.x > 540
            : window.__freezeAt === 'intact'
              ? body && Math.abs(body.body.angle) > 0.06
              : window.__freezeAt === 'fracture'
                ? fragments.length > 0
                : false;
      if (hit) {
        window.__captured = snapshot();
        window.__freezeAt = null;
        scene.paused = true;
      }
    });
  }, phaserPath);
  await page.waitForFunction(() => window.__ready);
  const fixture = (material, kind = 'sheep') => ({
    version: 1,
    id: `replay-${material}`,
    name: 'Physical destruction replay',
    subtitle: 'A repeatable real-input collision',
    world: 'countryside',
    bounds: { width: 1440, height: 810, ground: 675 },
    sling: { x: 235, y: 530 },
    blocks: material ? [{ id: 'support', x: 800, y: 600, w: 30, h: 150, material }] : [],
    monsters: [{ id: 'spectator', x: 1300, y: 657, radius: 18, kind: 'blob' }],
    hazards: [],
    projectiles: [kind, kind],
    thresholds: [5000, 5500, 8000],
  });
  const point = async (x, y) => {
    const bounds = await page.locator('canvas').boundingBox();
    return { x: bounds.x + (x * bounds.width) / 1440, y: bounds.y + (y * bounds.height) / 810 };
  };
  const launch = async (x = -85, y = 10) => {
    const start = await point(235, 530),
      end = await point(235 + x, 530 + y);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  };
  const freeze = async (stage) => {
    await page.evaluate((stage) => {
      window.__captured = null;
      window.__freezeAt = stage;
      window.__scene.paused = false;
    }, stage);
    await page.waitForFunction(() => !!window.__captured, null, { timeout: 15000 });
    return page.evaluate(() => window.__captured);
  };
  for (const material of ['wood', 'glass', 'stone']) {
    await page.evaluate((level) => window.__loadFixture(level), fixture(material));
    await page.evaluate(() => (window.__freezeAt = 'flight'));
    await launch();
    await page.waitForFunction(() => !!window.__captured);
    const before = await page.evaluate(() => window.__captured);
    check(
      `${material}: pointer drag launches once and intact target is visible before contact`,
      before.shots === 1 &&
        before.entities.some((e) => e.id === 'support' && e.health === e.maxHealth),
    );
    await page.screenshot({ path: `artifacts/destruction-${material}-before.png` });
    const intact = await freeze('intact');
    const block = intact.entities.find((e) => e.id === 'support');
    check(
      `${material}: struck block remains a rotating, displaced rigid body`,
      block?.type === 'block' &&
        Math.abs(block.angle) > 0.06 &&
        Math.abs(block.x - 800) > 5 &&
        block.health < block.maxHealth,
    );
    await page.screenshot({ path: `artifacts/destruction-${material}-rotation.png` });
    if (material !== 'stone') {
      const fractured = await freeze('fracture');
      const fragments = fractured.entities.filter((e) => e.type === 'fragment');
      check(
        `${material}: fracture replaces failed support with substantial moving physical pieces`,
        !fractured.entities.some((e) => e.id === 'support') &&
          fragments.length >= (material === 'glass' ? 3 : 2) &&
          fragments.every((e) => e.parentId === 'support' && e.material === material) &&
          fragments.some((e) => e.speed > 0.5),
      );
      await page.screenshot({ path: `artifacts/destruction-${material}-fracture.png` });
      await page.evaluate(() => (window.__scene.paused = false));
      await page.waitForFunction(
        (initial) =>
          [...window.__scene.sim.entities.values()]
            .filter((e) => e.type === 'fragment')
            .some((e) => {
              const old = initial.find((p) => p.id === e.id);
              return old && Math.hypot(e.body.position.x - old.x, e.body.position.y - old.y) > 20;
            }),
        fragments,
      );
      await page.evaluate(() => (window.__scene.paused = true));
      check(`${material}: large fragments keep moving after their fracture frame`, true);
      await page.screenshot({ path: `artifacts/destruction-${material}-debris.png` });
      observations.push({
        material,
        before,
        intact,
        fractured,
        later: await page.evaluate(() => window.__snapshot()),
      });
    } else {
      await page.evaluate(() => (window.__scene.paused = false));
      await page.waitForFunction(() => {
        const block = [...window.__scene.sim.entities.values()].find((e) => e.id === 'support');
        return block && Math.abs(block.body.angle) > 1;
      });
      await page.evaluate(() => (window.__scene.paused = true));
      const after = await page.evaluate(() => window.__snapshot());
      check(
        'stone: medium shot tips the damaged block instead of deleting it',
        after.entities.some(
          (e) =>
            e.id === 'support' &&
            e.type === 'block' &&
            e.health > 0 &&
            e.health < e.maxHealth &&
            Math.abs(e.angle) > 1,
        ),
      );
      await page.screenshot({ path: 'artifacts/destruction-stone-toppled.png' });
      observations.push({ material, before, intact, later: after });
    }
  }
  // Original campaign castle: the roof falls as a rigid body when its support gives way.
  await page.evaluate(async () => {
    const { campaign } = await import('/src/content/campaign.ts');
    window.__loadFixture(campaign[0]);
    window.__freezeAt = 'castle';
  });
  await launch(-102, 0);
  await page.waitForFunction(() => !!window.__captured, null, { timeout: 15000 });
  const castleCollapse = await page.evaluate(() => window.__captured);
  const roof = castleCollapse.entities.find((entity) => entity.id === 'b3');
  check(
    'campaign castle: failed support makes the intact physical roof fall and rotate',
    roof?.type === 'block' &&
      (Math.abs(roof.angle) > 0.08 || Math.hypot(roof.x - 920, roof.y - 566) > 8),
  );
  await page.screenshot({ path: 'artifacts/destruction-castle-collapse.png' });
  await page.evaluate(() => (window.__scene.paused = false));
  await page.waitForFunction(() => window.__scene.sim.phase === 'won', null, { timeout: 30000 });
  const castleWon = await page.evaluate(() => window.__snapshot());
  check(
    'campaign castle: real collapse resolves target defeat and victory with one actual shot',
    castleWon.shots === 1 && !castleWon.entities.some((entity) => entity.type === 'monster'),
  );
  await page.screenshot({ path: 'artifacts/destruction-castle-victory.png' });
  observations.push({
    scenario: 'campaign-support-collapse',
    during: castleCollapse,
    after: castleWon,
  });

  // Every ability is triggered through a deliberate actual pointer-up tap, never a direct activate call.
  const freshAbilityFlight = async (kind) => {
    await page.evaluate((level) => window.__loadFixture(level), fixture(null, kind));
    await launch(-45, 90);
    await page.waitForFunction(
      () =>
        window.__scene.sim.canActivate &&
        window.__scene.sim.time - window.__scene.sim.current.born >= 250,
    );
  };
  for (const kind of ['sheep', 'duck', 'bear', 'rabbit']) {
    await freshAbilityFlight(kind);
    const tap = await point(450, 150);
    await page.mouse.move(tap.x, tap.y);
    await page.mouse.down();
    await page.mouse.move(tap.x + 50, tap.y + 5, { steps: 3 });
    await page.mouse.up();
    check(
      `${kind}: a flight drag does not spend the ability`,
      await page.evaluate(() => !window.__scene.sim.abilityUsed && window.__scene.sim.canActivate),
    );
    await freshAbilityFlight(kind);
    await page.mouse.move(tap.x, tap.y);
    await page.mouse.down();
    await page.locator('canvas').dispatchEvent('pointercancel');
    await page.mouse.up();
    check(
      `${kind}: canceled gesture does not spend the ability`,
      await page.evaluate(() => !window.__scene.sim.abilityUsed && window.__scene.sim.canActivate),
    );
    await freshAbilityFlight(kind);
    await page.mouse.click(tap.x, tap.y);
    await page.waitForFunction(() => window.__scene.sim.abilityUsed, null, { timeout: 1500 });
    check(
      `${kind}: a deliberate flight tap activates exactly one ability`,
      await page.evaluate(() => window.__scene.sim.abilityUsed),
    );
    const count = await page.evaluate(
      () => [...window.__scene.sim.entities.values()].filter((e) => e.type === 'projectile').length,
    );
    check(
      `${kind}: correct physical projectile count after ability`,
      count === (kind === 'rabbit' ? 3 : 1),
    );
    await page.mouse.click(tap.x, tap.y);
    check(
      `${kind}: repeated tap does not create extra projectiles`,
      await page.evaluate(
        (count) =>
          [...window.__scene.sim.entities.values()].filter((e) => e.type === 'projectile')
            .length === count,
        count,
      ),
    );
  }
  await page.evaluate((level) => window.__loadFixture(level), fixture(null, 'sheep'));
  await launch(-45, 90);
  await page.waitForFunction(
    () =>
      window.__scene.sim.canActivate &&
      window.__scene.sim.time - window.__scene.sim.current.born >= 250,
  );
  const cdp = await context.newCDPSession(page);
  const touchA = await point(450, 150),
    touchB = await point(520, 150);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { ...touchA, id: 1 },
      { ...touchB, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check(
    'two-finger flight gesture cannot accidentally trigger an ability',
    await page.evaluate(() => !window.__scene.sim.abilityUsed),
  );
  await page.evaluate((level) => window.__loadFixture(level), fixture(null, 'sheep'));
  await launch(-10, 0);
  await page.waitForFunction(
    () => window.__scene.sim.current && !window.__scene.sim.current.airborne,
  );
  const sky = await point(450, 150);
  await page.mouse.click(sky.x, sky.y);
  check(
    'landed stuffie rejects a late ability tap',
    await page.evaluate(() => !window.__scene.sim.abilityUsed),
  );
  check(
    'real scene destruction and pointer abilities produce no uncaught errors',
    errors.length === 0,
  );
  await writeFile(
    'artifacts/destruction-browser.json',
    JSON.stringify(
      { generatedAt: new Date().toISOString(), checks, errors, observations },
      null,
      2,
    ),
  );
  await context.close();
  console.log(`Destruction browser: ${checks} checks passed.`);
} finally {
  await browser.close();
}
