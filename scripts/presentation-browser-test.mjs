import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

// Production verification: npm run build; npm run preview -- --port 4173.
// No browser routing or hot-reload filtering: these are the actual shipped assets.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.env.CANVAS_CI ? ['--disable-webgl'] : [])],
});
const url = process.env.GAME_URL || 'http://127.0.0.1:4173';
const reports = [];
let checks = 0;
const check = (name, value) => {
  assert.ok(value, name);
  checks++;
  console.log('PASS', name);
};
await mkdir('artifacts', { recursive: true });
try {
  for (const [width, height] of [
    [1440, 900],
    [1180, 820],
    [844, 390],
    [390, 844],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const inside = (selector) =>
      page.locator(selector).evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const box = node.getBoundingClientRect();
            return box.width > 0 && box.height > 0;
          })
          .every((node) => {
            const box = node.getBoundingClientRect();
            return (
              box.x >= -1 &&
              box.y >= -1 &&
              box.right <= innerWidth + 1 &&
              box.bottom <= innerHeight + 1
            );
          }),
      );
    await page.goto(url);
    await page.locator('.title-menu').waitFor();
    check(
      `${width}x${height} title controls fit the viewport`,
      await inside('.title-menu button,.header button'),
    );
    const playBox = await page.locator('.title-play').boundingBox();
    check(
      `${width}x${height} primary Play target is touch-friendly`,
      playBox && playBox.width >= 44 && playBox.height >= 44,
    );
    await page.screenshot({ path: `artifacts/pass3-home-${width}.png` });
    await page.locator('[data-action="levels"]').click();
    check(
      `${width}x${height} map has exactly eight touch nodes`,
      (await page.locator('.map-stop').count()) === 8,
    );
    check(
      `${width}x${height} map buttons and labels fit the viewport`,
      await inside('.campaign-menu button,.map-node-name'),
    );
    check(
      `${width}x${height} map labels do not overlap`,
      await page.locator('.map-node-name').evaluateAll((nodes) => {
        const boxes = nodes.map((node) => node.getBoundingClientRect());
        return !boxes.some((a, i) =>
          boxes.some(
            (b, j) =>
              j > i &&
              Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
              Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top),
          ),
        );
      }),
    );
    await page.screenshot({ path: `artifacts/pass3-map-${width}.png` });
    await page.locator('[data-level="0"]').click();
    await page.locator('#level-title').waitFor();
    check(
      `${width}x${height} gameplay HUD and queue fit the viewport`,
      await inside(
        '.game-screen .header button,.queue-panel,.game-actions button,.shot-message,.scoreboard,.level-heading',
      ),
    );
    check(
      `${width}x${height} home control remains visible in gameplay`,
      await page.locator('.game-screen [data-action="home"]').isVisible(),
    );
    await page.screenshot({ path: `artifacts/pass3-hud-${width}.png` });
    await page.locator('[data-action="settings"]').click();
    check(`${width}x${height} settings dialog fits the viewport`, await inside('.modal'));
    await page.screenshot({ path: `artifacts/pass3-settings-${width}.png` });
    await page.locator('[data-action="close-settings"]').click();
    await page.locator('[data-action="home"]').click();
    await page.locator('.title-menu [data-action="editor"]').click();
    check(
      `${width}x${height} workshop canvas and placement tools render`,
      (await page.locator('.ed-canvas').isVisible()) &&
        (await page.locator('.ed-tool-grid button').count()) === 6,
    );
    await page.screenshot({ path: `artifacts/pass3-editor-${width}.png` });
    check(`${width}x${height} no uncaught browser errors`, errors.length === 0);
    reports.push({ width, height, errors });
    await context.close();
  }
  console.log(`Responsive presentation: ${checks} checks passed.`);
  await writeFile(
    'artifacts/pass3-ui-checks.json',
    JSON.stringify(
      { generatedAt: new Date().toISOString(), checks, url, viewports: reports },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
