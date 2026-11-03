import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Runs against `npm run dev`. PLAYWRIGHT_MODULE_PATH allows reuse of the cloud image's browser tools.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox'],
});
let passed = 0;
const check = (name, condition) => {
  assert.ok(condition, name);
  passed++;
  console.log(`PASS ${name}`);
};
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/__editor-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><title>Editor functional tests</title></head><body style="margin:0"></body></html>',
    }),
  );
  await page.goto(
    (process.env.GAME_URL || 'http://127.0.0.1:5173').replace(/\/$/, '') + '/__editor-test',
  );
  await page.evaluate(async () => {
    const { openEditor } = await import('/src/editor/editor.ts');
    const { campaign } = await import('/src/content/campaign.ts');
    const host = document.createElement('div');
    host.id = 'editor-browser-test';
    Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '1000' });
    document.body.append(host);
    window.__editorTestInitial = structuredClone(campaign[0]);
    window.__editorTestPlayed = 0;
    window.__editorTestCleanup = openEditor(
      host,
      campaign[0],
      () => window.__editorTestPlayed++,
      () => {},
    );
  });
  const button = (action) => page.locator(`.level-editor [data-action="${action}"]`);
  const exportLevel = async () => {
    const pending = page.waitForEvent('download');
    await button('export').click();
    const download = await pending;
    return JSON.parse(await readFile(await download.path(), 'utf8'));
  };
  check(
    'editor opens with original campaign data',
    (await page.locator('.ed-canvas [data-type="blocks"]').count()) > 0,
  );
  await button('play').click();
  check(
    'valid original level can playtest',
    await page.evaluate(() => window.__editorTestPlayed === 1),
  );

  const rect = page.locator('.ed-canvas [data-type="blocks"] rect').first();
  await rect.click();
  const before = await exportLevel();
  await page.locator('.ed-materials [data-material="stone"]').click();
  const materialChanged = await exportLevel();
  check('selected block material is editable', materialChanged.blocks[0].material === 'stone');
  await button('undo').click();
  const undone = await exportLevel();
  check(
    'undo restores selected block material',
    undone.blocks[0].material === before.blocks[0].material,
  );
  await button('redo').click();
  check('redo restores change', (await exportLevel()).blocks[0].material === 'stone');

  await page.locator('.ed-canvas [data-type="blocks"] rect').first().click();
  const box = await page.locator('.ed-canvas [data-type="blocks"] rect').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 - 12, { steps: 5 });
  await page.mouse.up();
  const moved = await exportLevel();
  check(
    'drag moves a selected block in world coordinates',
    moved.blocks[0].x !== before.blocks[0].x,
  );
  await button('undo').click();
  check(
    'undo restores drag as a single operation',
    (await exportLevel()).blocks[0].x === before.blocks[0].x,
  );

  await button('new').click();
  check(
    'new level clears pieces',
    (await page.locator('.ed-canvas [data-type="blocks"]').count()) === 0,
  );
  await button('play').click();
  check(
    'missing targets block playtest',
    await page.evaluate(() => window.__editorTestPlayed === 1),
  );
  await button('tower').click();
  await button('tower').click();
  await button('play').click();
  check(
    'overlapping structures block playtest',
    await page
      .locator('.ed-status')
      .innerText()
      .then((text) => text.includes('Overlaps')),
  );
  check(
    'invalid overlap never enters callback',
    await page.evaluate(() => window.__editorTestPlayed === 1),
  );

  const unsafeName = '<img src=x onerror="window.__badName=true">';
  await page.locator('[data-field="name"]').fill(unsafeName);
  await page.locator('[data-field="name"]').blur();
  check(
    'level name is rendered as input text',
    (await page.locator('[data-field="name"]').inputValue()) === unsafeName,
  );
  check(
    'level name never injects markup',
    await page.evaluate(() => !window.__badName && !document.querySelector('.level-editor img')),
  );
  await button('save').click();
  await button('new').click();
  await button('load').click();
  check(
    'incomplete local drafts can be recovered',
    (await page.locator('[data-field="name"]').inputValue()) === unsafeName,
  );

  const original = await page.evaluate(() => window.__editorTestInitial);
  const file = page.locator('[data-field="file"]');
  await file.setInputFiles({
    name: 'original.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await page.waitForFunction(
    (name) => document.querySelector('[data-field="name"]').value === name,
    original.name,
  );
  check('valid portable JSON imports', (await exportLevel()).name === original.name);
  const invalid = structuredClone(original);
  invalid.blocks[0].x = 'not a number';
  await file.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await page.waitForFunction(() =>
    document.querySelector('.ed-status').textContent.includes('Import rejected'),
  );
  check(
    'invalid external JSON is rejected',
    (await exportLevel()).blocks[0].x === original.blocks[0].x,
  );
  await page.evaluate(() => window.__editorTestCleanup());
  check('cleanup removes editor surface', (await page.locator('.level-editor').count()) === 0);
  check('editor produced no uncaught browser errors', errors.length === 0);
  console.log(`Editor: ${passed} checks passed.`);
} finally {
  await browser.close();
}
