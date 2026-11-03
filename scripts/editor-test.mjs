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
  args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.env.CANVAS_CI ? ['--disable-webgl'] : [])],
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
  // Production authoring through the visible controls, using a larger orbital canvas.
  await button('new').click();
  await page.locator('[data-field="world"]').selectOption('orbital');
  await page.locator('.ed-scoring > summary').click();
  const numberField = async (name, value) => { const input = page.getByLabel(name, { exact:true }); await input.fill(String(value)); await input.press('Tab'); };
  await numberField('World width', 2800); await numberField('World height', 1600); await numberField('Ground Y', 1400);
  await page.getByLabel('Ground', { exact:true }).selectOption('off'); await numberField('Gravity Y', 0);
  await page.locator('[data-field="idea"]').fill('Use a suspended bridge and localized gravity.'); await page.locator('[data-field="idea"]').press('Tab');
  await page.locator('[data-field="mechanics"]').fill('rope, gravity, bridge'); await page.locator('[data-field="mechanics"]').press('Tab');
  let production = await exportLevel();
  check('world, variable dimensions and ground-free environment export', production.world === 'orbital' && production.bounds.width === 2800 && production.bounds.height === 1600 && production.environment.ground === false && production.environment.gravity.y === 0);
  check('metadata authoring persists the central idea and mechanics', production.metadata.idea.includes('suspended') && production.metadata.mechanics.includes('gravity'));
  check('SVG viewBox follows the authored world dimensions', await page.locator('.ed-canvas').getAttribute('viewBox') === '0 0 2800 1600');
  await page.locator('.ed-tools details').filter({ has: page.locator('summary', { hasText:'Terrain & environment' }) }).locator('summary').click();
  const place = async (tool, x, y) => {
    await page.locator(`[data-tool="${tool}"]`).click();
    const canvas = page.locator('.ed-canvas'); await canvas.scrollIntoViewIfNeeded();
    const b = await canvas.boundingBox(); await page.mouse.click(b.x + x * b.width / 2800, b.y + y * b.height / 1600);
  };
  await place('ramp', 1000, 1100); await place('boulder', 650, 700); await place('planetoid', 1400, 900);
  await page.locator('[data-field="zone-kind"]').selectOption('zero-gravity'); await place('zone', 1650, 700); await place('vent', 2100, 900);
  production = await exportLevel();
  check('terrain ramp authors a real angled static body', production.terrain.length === 1 && production.terrain[0].angle < 0);
  check('boulders and planetoids author physical circular props', production.props.some(p => p.kind === 'boulder' && !p.static) && production.props.some(p => p.kind === 'planetoid' && p.static));
  check('environment sensors and pressure vents author runtime data', production.zones[0].kind === 'zero-gravity' && production.mechanisms.some(m => m.kind === 'vent' && m.force > 0));
  await page.locator('[data-template="bridge"]').click();
  const bridge = await exportLevel();
  await page.locator('.ed-canvas').scrollIntoViewIfNeeded();
  await page.screenshot({ path:'artifacts/workshop-production.png' });
  check('rope bridge template produces five planks, abutments and six real constraints', bridge.blocks.length === 5 && bridge.terrain.length === 3 && bridge.joints.length === 6 && bridge.monsters.length === 1);
  await button('copy').click(); await button('paste').click();
  const pasted = await exportLevel();
  const originalIds = new Set([...bridge.blocks, ...bridge.terrain, ...bridge.monsters].map(p => p.id));
  const copiedJoints = pasted.joints.slice(bridge.joints.length);
  const copiedIds = new Set([...pasted.blocks, ...pasted.terrain, ...pasted.monsters].filter(p => !originalIds.has(p.id)).map(p => p.id));
  check('assembly copy/paste duplicates objects and internal connections with new IDs', pasted.blocks.length === 10 && copiedJoints.length === 6 && copiedJoints.every(j => (!j.bodyA || copiedIds.has(j.bodyA)) && (!j.bodyB || copiedIds.has(j.bodyB))));
  const copiedBlock = pasted.blocks.find(p => copiedIds.has(p.id));
  const copiedRect = page.locator(`.ed-canvas [data-id="${copiedBlock.id}"] rect`);
  await copiedRect.scrollIntoViewIfNeeded(); const cb = await copiedRect.boundingBox();
  const canvasBox = await page.locator('.ed-canvas').boundingBox();
  await page.mouse.move(cb.x + cb.width/2, cb.y + cb.height/2); await page.mouse.down();
  await page.mouse.move(cb.x + cb.width/2 + 450*canvasBox.width/2800, cb.y + cb.height/2 - 300*canvasBox.height/1600, { steps:6 }); await page.mouse.up();
  const draggedAssembly = await exportLevel();
  check('multi-selected assembly drag moves all copied structural bodies', draggedAssembly.blocks.filter(p => copiedIds.has(p.id)).every(p => Math.abs(p.x - pasted.blocks.find(old => old.id === p.id).x - 450) < 1));
  const oldAnchor = copiedJoints.find(j => !j.bodyA); const movedAnchor = draggedAssembly.joints.find(j => j.id === oldAnchor.id);
  check('assembly drag translates world rope anchors with the structure', Math.abs(movedAnchor.pointA.x-oldAnchor.pointA.x-450)<1 && Math.abs(movedAnchor.pointA.y-oldAnchor.pointA.y+300)<1);
  await button('undo').click();
  check('group drag is one undo operation', (await exportLevel()).blocks.find(p => p.id === copiedBlock.id).x === copiedBlock.x);
  await button('redo').click();
  check('redo restores the group transform', Math.abs((await exportLevel()).blocks.find(p => p.id === copiedBlock.id).x-copiedBlock.x-450)<1);
  const beforePan = await exportLevel();
  await page.locator('[data-field="zoom"]').selectOption('2');
  await page.locator('[data-tool="pan"]').click();
  await page.locator('.ed-canvas-wrap').scrollIntoViewIfNeeded();
  const viewport = await page.locator('.ed-canvas-wrap').boundingBox();
  await page.mouse.move(viewport.x + viewport.width*.7, viewport.y + Math.min(100,viewport.height*.4)); await page.mouse.down();
  await page.mouse.move(viewport.x + viewport.width*.7 - 120, viewport.y + Math.min(100,viewport.height*.4), { steps:5 }); await page.mouse.up();
  check('zoomed canvas can be panned to inspect larger levels', await page.locator('.ed-canvas-wrap').evaluate(el => el.scrollLeft > 50));
  check('camera panning does not alter authored objects', JSON.stringify((await exportLevel()).blocks) === JSON.stringify(beforePan.blocks));
  await page.locator('[data-field="zoom"]').selectOption('1');
  // Select two separated circular objects with Shift, then align them without losing IDs.
  await page.locator('[data-tool="select"]').click();
  const propA = page.locator('.ed-canvas [data-type="props"]').first(); const propB = page.locator('.ed-canvas [data-type="props"]').nth(1);
  await propA.scrollIntoViewIfNeeded(); await propA.click(); await page.keyboard.down('Shift'); await propB.click(); await page.keyboard.up('Shift');
  check('Shift selection combines two authoring objects', await page.locator('.ed-selection').innerText().then(text => text.includes('2 selected')));
  await page.getByRole('button', { name:'center-y', exact:true }).click();
  const aligned = await exportLevel(); check('alignment acts on the whole selection', aligned.props[0].y === aligned.props[1].y);
  await button('undo').click();
  check('alignment is reversible', (await exportLevel()).props[0].y !== (await exportLevel()).props[1].y);
  await page.locator('[data-field="multi"]').check();
  await propA.scrollIntoViewIfNeeded(); await propA.click(); await propB.click();
  check('touch-friendly Multi-select checkbox combines objects without a keyboard', await page.locator('.ed-selection').innerText().then(text => text.includes('2 selected')));
  await page.locator('[data-field="multi"]').uncheck();
  // Templates are exported/imported as the same structured runtime data, never decorative-only SVG.
  for (const name of ['arch','suspended','counterweight','moving']) {
    await button('new').click(); await page.locator(`[data-template="${name}"]`).click();
    const template = await exportLevel();
    const issues = await page.evaluate(async value => { const { validateLevel }=await import('/src/content/validate.ts'); return validateLevel(value); }, template);
    check(`${name} template passes portable level validation`, issues.length === 0);
    const runtime = await page.evaluate(async value => {
      const { Simulation }=await import('/src/game/physics.ts'); const sim=new Simulation(value);
      const start = [...sim.entities.values()].find(entity => entity.id === value.blocks[0].id)?.body.position.x;
      const constraints = sim.engine.world.constraints.length;
      for(let frame=0;frame<120;frame++)sim.step();
      const end = [...sim.entities.values()].find(entity => entity.id === value.blocks[0].id)?.body.position.x;
      const finite = [...sim.entities.values()].every(entity => Number.isFinite(entity.body.position.x) && Number.isFinite(entity.body.position.y));
      sim.dispose(); return { constraints, moved: Math.abs((end ?? 0)-(start ?? 0)), finite };
    }, template);
    check(`${name} template loads into the actual physics engine with its real constraints`, runtime.finite && runtime.constraints === (template.joints?.length || 0));
    if(name === 'moving') check('authored moving platform actually moves in runtime physics', runtime.moved > 20);

    if (name === 'suspended') check('suspended deck uses two body-connected ropes', template.joints.length === 2 && template.joints.every(j => j.bodyB));
    if (name === 'counterweight') check('counterweight template has a real pivot and ballast', template.joints.some(j => j.kind === 'hinge') && template.blocks.some(b => b.material === 'stone'));
    if (name === 'moving') check('moving platform has a real actuator', template.mechanisms.some(m => m.kind === 'platform' && m.body));
  }
  await button('play').click();
  check('advanced authored level enters the same playtest callback', await page.evaluate(() => window.__editorTestPlayed === 2));
  await page.locator('.ed-advanced > summary').click(); await button('refresh-advanced').click();
  const raw = JSON.parse(await page.locator('[data-field="advanced"]').inputValue()); raw.mechanisms[0].body = 'missing';
  await page.locator('[data-field="advanced"]').fill(JSON.stringify(raw)); await button('apply-advanced').click();
  check('advanced data inspector rejects broken body references', await page.locator('.ed-status').innerText().then(text => text.includes('Advanced data rejected')));
  await page.evaluate(() => window.__editorTestCleanup());
  check('cleanup removes editor surface', (await page.locator('.level-editor').count()) === 0);
  check('editor produced no uncaught browser errors', errors.length === 0);
  console.log(`Editor: ${passed} checks passed.`);
} finally {
  await browser.close();
}
