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
const check = (name, value) => {
  assert.ok(value, name);
  console.log('PASS', name);
  checks++;
};
await mkdir('artifacts', { recursive: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // This isolated page imports the actual audio module but starts no sound until the button gesture.
  await page.route('**/__audio-check', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><button id="unlock">Unlock original score</button>',
    }),
  );
  await page.goto(url + '/__audio-check');
  await page.evaluate(async () => {
    const { AudioSystem } = await import('/src/game/audio.ts');
    window.__audioTest = new AudioSystem();
    document.querySelector('#unlock').onclick = () => window.__audioTest.unlock();
  });
  check(
    'no context is constructed before a gesture',
    await page.evaluate(() => window.__audioTest.diagnostics.contextState === 'locked'),
  );
  await page.click('#unlock');
  await page.waitForTimeout(250);
  check(
    'real context unlocks and original score scheduling begins',
    await page.evaluate(
      () =>
        window.__audioTest.diagnostics.contextState === 'running' &&
        window.__audioTest.diagnostics.schedulerRunning,
    ),
  );
  const tracks = [];
  for (const id of ['countryside', 'frozen', 'molten', 'haunted', 'orbital']) {
    await page.evaluate((id) => window.__audioTest.setWorld(id), id);
    let peak = 0;
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(120);
      peak = Math.max(peak, await page.evaluate(() => window.__audioTest.diagnostics.outputRms));
    }
    const state = await page.evaluate(() => window.__audioTest.diagnostics);
    check(`${id} produces nonzero real audio output`, peak > 0.00001 && state.world === id);
    tracks.push({ ...state, measuredPeakRms: peak });
  }
  await page.evaluate(() => {
    window.__audioTest.setVolumes(0.15, 0.85);
    window.__audioTest.play('explosion', 'stone', 12);
  });
  check(
    'separate volume gains retain their selected values',
    await page.evaluate(
      () =>
        window.__audioTest.diagnostics.musicVolume === 0.15 &&
        window.__audioTest.diagnostics.effectsVolume === 0.85,
    ),
  );
  await page.evaluate(() => window.__audioTest.setPaused(true));
  check(
    'pause stops scheduling and releases active sound nodes',
    await page.evaluate(
      () =>
        !window.__audioTest.diagnostics.schedulerRunning &&
        window.__audioTest.diagnostics.activeVoices === 0,
    ),
  );
  await page.evaluate(() => {
    window.__audioTest.setPaused(false);
    window.__audioTest.enabled = false;
  });
  await page.waitForTimeout(100);
  check(
    'master mute silences output and cancels scheduling',
    await page.evaluate(
      () =>
        window.__audioTest.diagnostics.outputRms < 0.000001 &&
        !window.__audioTest.diagnostics.schedulerRunning,
    ),
  );
  await page.evaluate(() => {
    window.__audioTest.enabled = true;
    for (let i = 0; i < 100; i++) window.__audioTest.play('ability', 'rabbit', 20);
  });
  check(
    'dense real effects respect the voice budget',
    await page.evaluate(
      () => window.__audioTest.diagnostics.peakVoices <= window.__audioTest.diagnostics.voiceLimit,
    ),
  );
  await page.evaluate(() => window.__audioTest.dispose());
  check(
    'dispose closes the real context and releases all voices',
    await page.evaluate(
      () =>
        window.__audioTest.diagnostics.contextState === 'closed' &&
        window.__audioTest.diagnostics.activeVoices === 0,
    ),
  );
  check('audio produces no uncaught browser errors', errors.length === 0);
  await writeFile(
    'artifacts/audio-browser.json',
    JSON.stringify({ checks, errors, tracks }, null, 2),
  );
  console.log(`Audio browser: ${checks} checks passed.`);
} finally {
  await browser.close();
}
