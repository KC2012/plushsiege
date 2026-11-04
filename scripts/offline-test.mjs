import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

// Run `npm run build`, then `npm run preview -- --port 4173` before this test.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.env.CANVAS_CI ? ['--disable-webgl'] : [])],
});
const url = process.env.GAME_URL || 'http://127.0.0.1:4173';
const origin = new URL(url).origin;
let passed = 0;
const check = (name, value) => {
  assert.ok(value, name);
  passed++;
  console.log('PASS', name);
};
await mkdir('artifacts', { recursive: true });
try {
  // Fresh storage proves this run installed the production worker and populated its own cache.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'allow',
  });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.error('Browser error:', error.message);
  });
  page.on('requestfailed', (request) =>
    console.error('Request failed:', request.url(), request.failure()?.errorText),
  );
  context.on('request', (request) => {
    const address = new URL(request.url());
    if (['http:', 'https:'].includes(address.protocol) && address.origin !== origin)
      externalRequests.push(request.url());
  });
  await page.goto(url);
  await page.getByRole('heading', { name: /PLUSH/ }).waitFor();
  check(
    'production home renders with its gameplay canvas',
    (await page.locator('canvas').count()) === 1 &&
      (await page.locator('[data-action="continue"]').count()) === 1,
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const installed = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const keys = (await caches.keys()).filter((key) => key.startsWith('plush-siege-'));
    const cache = await caches.open(keys[0]);
    return {
      active: registration.active?.state,
      keys,
      files: (await cache.keys()).map((request) => new URL(request.url).pathname),
    };
  });
  check(
    'new production worker activates and controls the page',
    installed.active === 'activated' && installed.keys.length === 1,
  );
  check(
    'worker cached the HTML shell and local game bundles',
    installed.files.includes('/index.html') &&
      installed.files.includes('/') &&
      installed.files.some((file) => /\/assets\/.*\.js$/.test(file)) &&
      installed.files.some((file) => /\/assets\/.*\.css$/.test(file)),
  );
  check(
    'precache includes install manifest and both raster icons',
    ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png'].every((file) =>
      installed.files.includes(file),
    ),
  );
  console.log(`Precache: ${installed.files.length} assets in ${installed.keys[0]}`);
  console.log(installed.files.join('\n'));
  const iconSizes = await page.evaluate(async () => {
    const manifest = await fetch('/manifest.webmanifest').then((response) => response.json());
    return Promise.all(
      manifest.icons.map(async (icon) => {
        const response = await fetch(icon.src);
        const bitmap = await createImageBitmap(await response.blob());
        const result = {
          ok: response.ok,
          width: bitmap.width,
          height: bitmap.height,
          expected: icon.sizes,
        };
        bitmap.close();
        return result;
      }),
    );
  });
  check(
    'manifest PNG icons fetch and decode at their declared sizes',
    iconSizes.length === 2 &&
      iconSizes.every((icon) => icon.ok && `${icon.width}x${icon.height}` === icon.expected),
  );
  await page.reload();
  await page.getByRole('heading', { name: /PLUSH/ }).waitFor();
  check(
    'online reload remains controlled by production worker',
    await page.evaluate(() => !!navigator.serviceWorker.controller),
  );
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: /PLUSH/ }).waitFor();
  check(
    'fresh offline navigation renders game title and PLAY',
    (await page.locator('[data-action="continue"]').count()) === 1 &&
      (await page.locator('canvas').count()) === 1,
  );
  check(
    'browser reports offline for the functional test',
    await page.evaluate(() => navigator.onLine === false),
  );
  await page.screenshot({ path: 'artifacts/offline-home.png' });
  const offlineIcons = await page.evaluate(async () => {
    const manifest = await fetch('/manifest.webmanifest').then((response) => response.json());
    const results = await Promise.all(
      manifest.icons.map((icon) => fetch(icon.src).then((response) => response.ok)),
    );
    return results.every(Boolean);
  });
  check('manifest and raster icons also remain available offline', offlineIcons);
  await page.getByRole('button', { name: 'Level map', exact: true }).click();
  check(
    'paged campaign map is selectable offline',
    (await page.locator('[data-level]').count()) === 8,
  );
  await page.locator('[data-level="0"]').click();
  await page.locator('#score').waitFor();
  check(
    'first offline level starts with unused projectiles',
    (await page.locator('#score').textContent()) === '0' &&
      (await page.locator('.queue-item.used').count()) === 0,
  );
  const bounds = await page.locator('canvas').boundingBox();
  const point = (x, y) => ({
    x: bounds.x + (x * bounds.width) / 1440,
    y: bounds.y + (y * bounds.height) / 810,
  });
  const start = point(235, 530),
    end = point(235 - 102, 530);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  await page.getByRole('heading', { name: 'Softies for the win.' }).waitFor({ timeout: 50000 });
  check(
    'real offline slingshot shot wins through running physics',
    (await page.locator('.result-stars .earned').count()) === 3,
  );
  await page.screenshot({ path: 'artifacts/offline.png' });
  await page.locator('.modal [data-action="restart"]').click();
  check(
    'offline restart resets the game',
    (await page.locator('#score').textContent()) === '0' &&
      (await page.locator('.queue-item.used').count()) === 0,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Level map', exact: true }).click();
  check(
    'offline earned stars survive reload',
    (await page.locator('[data-level="0"] .map-node .earned').count()) === 3,
  );
  await page.goto(url.replace(/\/$/, '') + '/physics-lab.html');
  await page.waitForFunction(() => window.plushPhysicsLab && document.querySelector('#details').textContent.length > 0);
  check('physics lab and all eighteen scenario definitions load offline', await page.locator('#scenario option').count() === 18);
  await page.locator('#step').click();
  check('offline physics lab steps the real simulation', await page.evaluate(() => window.plushPhysicsLab.snapshot().frame === 1));
  check('production play made no external runtime requests', externalRequests.length === 0);
  check('online and offline play produced no uncaught browser errors', errors.length === 0);
  console.log(`Offline production: ${passed} checks passed.`);
  await context.close();
} finally {
  await browser.close();
}
