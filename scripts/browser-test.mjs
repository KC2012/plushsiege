import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox'],
});
let checks = 0;
const check = (name, value) => {
  assert.ok(value, name);
  console.log('PASS', name);
  checks++;
};
const url = process.env.GAME_URL || 'http://127.0.0.1:5173';
await mkdir('artifacts', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole('heading', { name: /Small heroes/ }).waitFor();
  check(
    'title menu loads with all four crew members',
    (await page.locator('.crew-card').count()) === 4,
  );
  await page.screenshot({ path: 'artifacts/home.png' });
  await page.getByRole('button', { name: 'Choose a level', exact: true }).click();
  check('all 24 levels are available', (await page.locator('.level-tile').count()) === 24);
  await page.locator('[data-level="0"]').click();
  check('first level starts with score zero', (await page.locator('#score').textContent()) === '0');
  await page.getByRole('button', { name: 'Pause game' }).click();
  check(
    'pause opens without launching a projectile',
    (await page.locator('.queue-item.used').count()) === 0 &&
      (await page.locator('.modal').count()) === 1,
  );
  await page.locator('[data-action="resume"]').click();
  const point = async (x, y) => {
    const b = await page.locator('canvas').boundingBox();
    return { x: b.x + (x * b.width) / 1440, y: b.y + (y * b.height) / 810 };
  };
  const launch = async (dx, dy) => {
    const a = await point(235, 530),
      b = await point(235 + dx, 530 + dy);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 });
    await page.mouse.up();
  };
  // Real mouse shot through Phaser input, matching the audited opening solution.
  await launch(-61.0509, -4.2691);
  await page.getByRole('heading', { name: 'Softies for the win.' }).waitFor({ timeout: 50000 });
  check(
    'actual slingshot shot destroys target and completes level',
    (await page.locator('.result-stars .earned').count()) === 3,
  );
  check(
    'victory awards an explicit unused-projectile bonus',
    await page
      .locator('.result-score')
      .textContent()
      .then((s) => s.includes('3,000')),
  );
  await page.screenshot({ path: 'artifacts/victory.png' });
  await page.locator('[data-action="next"]').click();
  check(
    'next-level navigation works',
    (await page.locator('#level-title').textContent()) === 'Double Trouble',
  );
  await page.getByRole('button', { name: 'Restart level' }).click();
  check(
    'instant restart resets score and queue',
    (await page.locator('#score').textContent()) === '0' &&
      (await page.locator('.queue-item.used').count()) === 0,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Choose a level', exact: true }).click();
  check(
    'progress survives page reload',
    (await page.locator('[data-level="0"] .earned').count()) === 3,
  );
  await page.locator('[data-level="0"]').click();
  // Cancelled aim must never become a shot on pointerup.
  const a = await point(235, 530),
    d = await point(170, 550);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(d.x, d.y);
  await page.locator('canvas').dispatchEvent('pointercancel');
  await page.mouse.up();
  check(
    'cancelled pointer gesture never launches',
    (await page.locator('.queue-item.used').count()) === 0,
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('[data-setting="trajectory"]').uncheck();
  await page.locator('[data-action="close-settings"]').click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  check(
    'settings save and reload',
    !(await page.locator('[data-setting="trajectory"]').isChecked()),
  );
  await page.locator('[data-action="close-settings"]').click();
  await page.getByRole('button', { name: 'Plush Siege home' }).click();
  await page.locator('[data-action="editor"]').click();
  check('workshop opens from main menu', (await page.locator('.level-editor').count()) === 1);
  await page.locator('.level-editor [data-action="play"]').click();
  check(
    'editor playtest enters game',
    (await page.locator('#level-chapter').textContent()) === 'WORKSHOP · PLAYTEST',
  );
  await page.locator('[data-action="return-editor"]').click();
  check(
    'playtest returns to retained editor draft',
    (await page.locator('.level-editor').count()) === 1,
  );
  await page.locator('.level-editor [data-action="back"]').click();
  check('no uncaught desktop browser errors', errors.length === 0);
  // iPad-size touch events exercise the real pointer path; this is Chromium, not Safari certification.
  const ctx = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const tablet = await ctx.newPage();
  const tabletErrors = [];
  tablet.on('pageerror', (e) => tabletErrors.push(e.message));
  await tablet.goto(url);
  await tablet.locator('[data-action="continue"]').click();
  const cdp = await ctx.newCDPSession(tablet);
  const bounds = await tablet.locator('canvas').boundingBox();
  const pos = (x, y) => ({
    x: bounds.x + (x * bounds.width) / 1440,
    y: bounds.y + (y * bounds.height) / 810,
  });
  const s = pos(235, 530),
    end = pos(173.9491, 525.7309);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [s] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tablet.getByRole('heading', { name: 'Softies for the win.' }).waitFor({ timeout: 50000 });
  check(
    'touch drag launches and wins on iPad-sized viewport',
    (await tablet.locator('.result-stars .earned').count()) === 3,
  );
  check('no uncaught touch browser errors', tabletErrors.length === 0);
  await tablet.screenshot({ path: 'artifacts/tablet.png' });
  await ctx.close();
  console.log(`\n${checks} integrated browser checks passed.`);
} finally {
  await browser.close();
}
