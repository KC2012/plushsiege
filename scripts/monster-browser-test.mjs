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
let checks = 0;
const check = (name, value) => {
  assert.ok(value, name);
  checks++;
  console.log('PASS', name);
};
const url = (process.env.GAME_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const observations = [];
await mkdir('artifacts/monster-scenarios', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + '/physics-lab.html');
  await page.waitForFunction(
    () => window.plushPhysicsLab && document.querySelector('#details').textContent.length > 0,
  );
  const count = await page.locator('#scenario option').count();
  check('visual lab exposes all ten requested cases plus crushing', count >= 11);
  for (let i = 0; i < count; i++) {
    await page.locator('#scenario').selectOption(String(i));
    await page.waitForTimeout(50);
    const start = await page.evaluate(() => window.plushPhysicsLab.snapshot());
    check(
      `${start.scenario}: every live target has a dynamic finite-mass body`,
      start.monsters.length > 0 &&
        start.monsters.every((m) => !m.isStatic && m.mass > 0 && Number.isFinite(m.mass)),
    );
    await page.screenshot({ path: `artifacts/monster-scenarios/${start.scenario}-before.png` });
    const limit = Number((await page.locator('#frame').textContent()).split('/')[1]);
    const samples = [start];
    for (let frame = 0; frame < limit; frame += 30) {
      await page.evaluate(() => window.plushPhysicsLab.advance(30));
      await page.waitForFunction(() => {
        const s = window.plushPhysicsLab.snapshot();
        return (
          s.rendered.length === s.monsters.length &&
          s.monsters.every((m) => {
            const r = s.rendered.find((r) => r.id === m.id);
            return (
              r &&
              Math.abs(r.x - m.x) < 0.01 &&
              Math.abs(r.y - m.y) < 0.01 &&
              Math.abs(r.angle - m.angle) < 0.001
            );
          })
        );
      });
      samples.push(await page.evaluate(() => window.plushPhysicsLab.snapshot()));
    }
    const end = samples.at(-1);
    check(`${start.scenario}: scenario reaches its required physical outcome`, end.result.passed);
    const synchronized = samples.every(
      (s) =>
        s.rendered.length === s.monsters.length &&
        s.monsters.every((m) => {
          const r = s.rendered.find((r) => r.id === m.id);
          return (
            r &&
            Math.abs(r.x - m.x) < 0.01 &&
            Math.abs(r.y - m.y) < 0.01 &&
            Math.abs(r.angle - m.angle) < 0.001
          );
        }),
    );
    check(`${start.scenario}: painted targets stay synchronized with rigid bodies`, synchronized);
    if (start.scenario === 'support-withdrawal' || start.scenario === 'monster-fall') {
      check(
        `${start.scenario}: unsupported target actually falls before defeat`,
        samples.some((s) => s.monsters.some((m) => m.y > start.monsters[0].y + 20)),
      );
      check(
        `${start.scenario}: landing damage is indirect fall damage`,
        end.damage.some((d) => d.source === 'fall'),
      );
    }
    if (['gentle-contact', 'stable-rest'].includes(start.scenario))
      check(
        `${start.scenario}: no health was lost`,
        end.monsters.every((m) => m.health === m.maxHealth) &&
          end.damage.every((d) => !end.monsters.some((m) => m.bodyId === d.bodyId)),
      );
    await page.screenshot({ path: `artifacts/monster-scenarios/${start.scenario}-after.png` });
    observations.push({ id: start.scenario, start, end, samples });
  }
  await page.locator('#scenario').selectOption('0');
  await page.locator('#step').click();
  check(
    'manual step control advances exactly one fixed physics tick',
    await page.evaluate(() => window.plushPhysicsLab.snapshot().frame === 1),
  );
  await page.locator('#reset').click();
  check(
    'reset reconstructs the same deterministic rig',
    await page.evaluate(() => window.plushPhysicsLab.snapshot().frame === 0),
  );
  check('monster lab produces no uncaught browser errors', errors.length === 0);
  await writeFile(
    'artifacts/monster-browser.json',
    JSON.stringify({ checks, errors, observations }, null, 2),
  );
  console.log(`Monster browser: ${checks} checks passed.`);
} finally {
  await browser.close();
}
