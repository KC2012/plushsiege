import type { BlockDef, Level, MaterialKind, StuffieKind } from '../game/types';
import { validateLevel } from '../content/validate';
import './editor.css';

type Selection = { type: 'blocks' | 'monsters' | 'hazards'; id: string } | null;
type Tool = 'select' | 'beam' | 'post' | 'square' | 'monster' | 'tnt';
const NS = 'http://www.w3.org/2000/svg';
const SAVE_KEY = 'plush-siege-editor-v1';
const palette = { wood: '#c38b50', glass: '#97e2e5', stone: '#9aa4ac' };
const copy = <T>(value: T): T => structuredClone(value);

/** Standalone authoring surface. The returned function releases listeners and removes its DOM. */
export function openEditor(
  container: HTMLElement,
  initial: Level,
  onPlay: (level: Level) => void,
  onClose: () => void,
): () => void {
  let level = copy(initial);
  let selected: Selection = null;
  let tool: Tool = 'select';
  let material: MaterialKind = 'wood';
  let snap = true;
  let history: Level[] = [];
  let future: Level[] = [];
  let drag: { start: Level; x: number; y: number; dx: number; dy: number; moved: boolean } | null =
    null;
  const controller = new AbortController();
  const root = document.createElement('section');
  root.className = 'level-editor';
  root.setAttribute('aria-label', 'Plush Siege level workshop');
  root.innerHTML = `<header class="ed-header"><div><span class="ed-eyebrow">PLUSH SIEGE · CREATOR TOOLS</span><h1>The workshop<span>Build a little trouble.</span></h1></div><div class="ed-header-actions"><button data-action="back">← Back</button><button data-action="play" class="ed-primary">▶ Playtest</button></div></header>
  <div class="ed-layout"><aside class="ed-tools"><label class="ed-field">Level name<input data-field="name" maxlength="80"></label><button data-action="new" class="ed-wide">＋ New blank level</button><p class="ed-caption">1. Pick a piece, then tap the scene.</p><div class="ed-tool-grid"><button data-tool="select">↖<span>Select</span></button><button data-tool="beam">━<span>Beam</span></button><button data-tool="post">┃<span>Post</span></button><button data-tool="square">▣<span>Block</span></button><button data-tool="monster">☻<span>Monster</span></button><button data-tool="tnt">✹<span>TNT</span></button></div><p class="ed-caption">Material</p><div class="ed-materials"><button data-material="wood">Wood</button><button data-material="glass">Glass</button><button data-material="stone">Stone</button></div><label class="ed-check"><input type="checkbox" data-field="snap" checked> Snap to 5 px grid</label><button data-action="tower" class="ed-wide">＋ Add tower template</button><div class="ed-selection"></div><p class="ed-caption">Your launch queue</p><div class="ed-roster"></div><select data-field="stuffie" aria-label="Stuffie to add"><option value="sheep">Sheep · balanced</option><option value="duck">Duck · dash</option><option value="bear">Bear · heavy</option><option value="rabbit">Rabbit · split</option></select><button data-action="add-stuffie" class="ed-wide">＋ Add stuffie</button></aside>
  <div class="ed-main"><div class="ed-toolbar"><div><button data-action="undo" title="Undo">↶ Undo</button><button data-action="redo" title="Redo">↷ Redo</button></div><span>Drag to move · select to rotate</span></div><div class="ed-canvas-wrap"><svg class="ed-canvas" viewBox="0 0 1440 810" role="img" aria-label="Interactive level layout"></svg></div><div class="ed-status" role="status"></div><div class="ed-files"><button data-action="save">Save draft</button><button data-action="load">Load draft</button><button data-action="export">Export JSON ↓</button><button data-action="import">Import JSON ↑</button><input type="file" accept=".json,application/json" data-field="file" hidden></div><details class="ed-scoring"><summary>Scoring thresholds &amp; level details</summary><div class="ed-score-fields"><label>★<input type="number" data-score="0" min="0" step="500"></label><label>★★<input type="number" data-score="1" min="0" step="500"></label><label>★★★<input type="number" data-score="2" min="0" step="500"></label></div><label class="ed-field">Description<input data-field="subtitle" maxlength="180"></label><p>World: Meadow Mischief. Terrain and slingshot remain fixed in this first workshop.</p></details></div></div>`;
  container.append(root);
  const $ = <T extends Element = HTMLElement>(selector: string): T => root.querySelector(selector)!;
  const svg = $<SVGSVGElement>('.ed-canvas');
  const status = $('.ed-status');
  const listen = (target: EventTarget, name: string, fn: EventListener) =>
    target.addEventListener(name, fn, { signal: controller.signal });
  const message = (text: string, bad = false) => {
    status.textContent = text;
    status.classList.toggle('ed-error', bad);
  };
  const remember = (previous: Level) => {
    history.push(previous);
    if (history.length > 100) history.shift();
    future = [];
  };
  const commit = (change: () => void) => {
    remember(copy(level));
    change();
    render();
  };
  const entity = () =>
    selected ? level[selected.type].find((item) => item.id === selected!.id) : undefined;
  const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  const rounded = (value: number) => (snap ? Math.round(value / 5) * 5 : Math.round(value));
  const point = (event: PointerEvent) => {
    const matrix = svg.getScreenCTM();
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix!.inverse());
    return { x: rounded(p.x), y: rounded(p.y) };
  };
  function node(
    tag: string,
    attrs: Record<string, string | number>,
    parent: Element = svg,
  ): SVGElement {
    const result = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => result.setAttribute(key, String(value)));
    parent.append(result);
    return result;
  }
  function mark(
    item: { id: string; x: number; y: number },
    type: NonNullable<Selection>['type'],
    group: SVGElement,
  ) {
    group.dataset.id = item.id;
    group.dataset.type = type;
    if (selected?.id === item.id) {
      node('circle', {
        cx: item.x,
        cy: item.y,
        r: type === 'blocks' ? 10 : 34,
        fill: 'none',
        stroke: '#e86745',
        'stroke-width': 4,
        'stroke-dasharray': '6 4',
        'pointer-events': 'none',
      });
    }
  }
  function renderScene() {
    svg.replaceChildren();
    node('rect', { width: 1440, height: 810, fill: '#e5f1e7' });
    node('path', {
      d: 'M0 585 Q180 365 400 545 Q650 330 880 540 Q1160 360 1440 515 L1440 810H0Z',
      fill: '#c3d4b1',
    });
    node('rect', {
      x: 0,
      y: level.bounds.ground,
      width: 1440,
      height: 810 - level.bounds.ground,
      fill: '#4c8068',
    });
    node('path', {
      d: `M${level.sling.x - 18} ${level.bounds.ground}L${level.sling.x - 12} ${level.sling.y - 20}M${level.sling.x - 12} ${level.sling.y + 15}L${level.sling.x + 25} ${level.sling.y - 20}`,
      stroke: '#8c613e',
      'stroke-width': 16,
      'stroke-linecap': 'round',
      fill: 'none',
    });
    const guide = node('text', {
      x: 45,
      y: 65,
      fill: '#698477',
      'font-size': 25,
      'font-family': 'sans-serif',
    });
    guide.textContent = 'MEADOW MISCHIEF  /  LEVEL WORKSHOP';
    for (const block of level.blocks) {
      const group = node('g', {});
      node(
        'rect',
        {
          x: block.x - block.w / 2,
          y: block.y - block.h / 2,
          width: block.w,
          height: block.h,
          rx: 3,
          transform: `rotate(${((block.angle ?? 0) * 180) / Math.PI} ${block.x} ${block.y})`,
          fill: palette[block.material],
          stroke: block.material === 'wood' ? '#83582f' : '#647d87',
          'stroke-width': 3,
        },
        group,
      );
      mark(block, 'blocks', group);
    }
    for (const monster of level.monsters) {
      const group = node('g', {});
      const r = monster.radius ?? 18;
      node(
        'circle',
        {
          cx: monster.x,
          cy: monster.y,
          r,
          fill: monster.kind === 'blob' ? '#71b59d' : '#ad8bbd',
          stroke: '#5a4b6e',
          'stroke-width': 3,
        },
        group,
      );
      for (const offset of [-r * 0.32, r * 0.32])
        node('circle', { cx: monster.x + offset, cy: monster.y - 3, r: 4, fill: '#29362e' }, group);
      node(
        'path',
        {
          d: `M${monster.x - 5} ${monster.y + 6}Q${monster.x} ${monster.y + 12} ${monster.x + 5} ${monster.y + 6}`,
          stroke: '#29362e',
          fill: 'none',
          'stroke-width': 2,
        },
        group,
      );
      mark(monster, 'monsters', group);
    }
    for (const hazard of level.hazards) {
      const group = node('g', {});
      node(
        'rect',
        {
          x: hazard.x - 20,
          y: hazard.y - 20,
          width: 40,
          height: 40,
          rx: 4,
          fill: '#d96950',
          stroke: '#9d4036',
          'stroke-width': 3,
        },
        group,
      );
      const label = node(
        'text',
        {
          x: hazard.x,
          y: hazard.y + 5,
          'text-anchor': 'middle',
          fill: '#fff6da',
          'font-size': 14,
          'font-weight': 800,
        },
        group,
      );
      label.textContent = 'TNT';
      mark(hazard, 'hazards', group);
    }
  }
  function numericField(label: string, value: number, onChange: (value: number) => void, step = 5) {
    const field = document.createElement('label');
    field.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(Math.round(value * 100) / 100);
    input.step = String(step);
    input.addEventListener('change', () => {
      const n = Number(input.value);
      if (Number.isFinite(n)) commit(() => onChange(n));
    });
    field.append(input);
    return field;
  }
  function renderSelection() {
    const panel = $('.ed-selection');
    panel.replaceChildren();
    const item = entity();
    if (!item || !selected) {
      const tip = document.createElement('p');
      tip.className = 'ed-caption';
      tip.textContent = 'Select a piece to resize, rotate, or duplicate it.';
      panel.append(tip);
      return;
    }
    const fields = document.createElement('div');
    fields.className = 'ed-object-fields';
    fields.append(
      numericField('X', item.x, (n) => (item.x = Math.max(0, Math.min(1440, n)))),
      numericField('Y', item.y, (n) => (item.y = Math.max(0, Math.min(810, n)))),
    );
    if (selected.type === 'blocks') {
      const block = item as BlockDef;
      fields.append(
        numericField('Width', block.w, (n) => (block.w = Math.max(10, Math.min(500, n)))),
        numericField('Height', block.h, (n) => (block.h = Math.max(10, Math.min(500, n)))),
      );
      fields.append(
        numericField(
          'Angle °',
          ((block.angle ?? 0) * 180) / Math.PI,
          (n) => (block.angle = (n * Math.PI) / 180),
          15,
        ),
      );
    }
    panel.append(fields);
    const actions = document.createElement('div');
    actions.className = 'ed-object-actions';
    for (const [text, action] of [
      [
        '↻ 15°',
        () => {
          if (selected?.type === 'blocks')
            commit(
              () => ((item as BlockDef).angle = ((item as BlockDef).angle ?? 0) + Math.PI / 12),
            );
        },
      ],
      [
        'Duplicate',
        () =>
          commit(() => {
            const duplicate = { ...copy(item), id: uid('piece'), x: item.x + 35, y: item.y - 35 };
            (level[selected!.type] as (typeof item)[]).push(duplicate);
            selected = { type: selected!.type, id: duplicate.id };
          }),
      ],
      [
        'Delete',
        () =>
          commit(() => {
            const list = level[selected!.type];
            const i = list.findIndex((it) => it.id === selected!.id);
            list.splice(i, 1);
            selected = null;
          }),
      ],
    ] as const) {
      const button = document.createElement('button');
      button.textContent = text;
      button.addEventListener('click', action);
      actions.append(button);
    }
    panel.append(actions);
  }
  function renderRoster() {
    const panel = $('.ed-roster');
    panel.replaceChildren();
    level.projectiles.forEach((kind, index) => {
      const button = document.createElement('button');
      button.textContent = `${index + 1}. ${kind} ×`;
      button.title = 'Remove this stuffie';
      button.addEventListener('click', () => commit(() => level.projectiles.splice(index, 1)));
      panel.append(button);
    });
  }
  function render() {
    renderScene();
    renderSelection();
    renderRoster();
    $<HTMLInputElement>('[data-field="name"]').value = level.name;
    $<HTMLInputElement>('[data-field="subtitle"]').value = level.subtitle;
    root
      .querySelectorAll<HTMLButtonElement>('[data-tool]')
      .forEach((button) => button.classList.toggle('ed-active', button.dataset.tool === tool));
    root
      .querySelectorAll<HTMLButtonElement>('[data-material]')
      .forEach((button) =>
        button.classList.toggle('ed-active', button.dataset.material === material),
      );
    root
      .querySelectorAll<HTMLInputElement>('[data-score]')
      .forEach((input) => (input.value = String(level.thresholds[Number(input.dataset.score)])));
    $<HTMLButtonElement>('[data-action="undo"]').disabled = !history.length;
    $<HTMLButtonElement>('[data-action="redo"]').disabled = !future.length;
    const issues = validateLevel(level);
    message(
      issues.length
        ? `${issues.length} issue${issues.length === 1 ? '' : 's'} · ${issues[0].path}: ${issues[0].message}`
        : `${level.blocks.length} pieces · ${level.monsters.length} monsters · Ready to playtest`,
      issues.length > 0,
    );
  }
  function addPiece(x: number, y: number) {
    commit(() => {
      if (tool === 'monster') {
        const id = uid('monster');
        level.monsters.push({
          id,
          x,
          y: Math.min(y, level.bounds.ground - 18),
          radius: 18,
          kind: 'horn',
        });
        selected = { type: 'monsters', id };
      } else if (tool === 'tnt') {
        const id = uid('tnt');
        level.hazards.push({ id, x, y: Math.min(y, level.bounds.ground - 20), kind: 'tnt' });
        selected = { type: 'hazards', id };
      } else {
        const id = uid('block');
        const w = tool === 'beam' ? 140 : tool === 'post' ? 20 : 50;
        const h = tool === 'beam' ? 20 : tool === 'post' ? 100 : 50;
        level.blocks.push({ id, x, y: Math.min(y, level.bounds.ground - h / 2), w, h, material });
        selected = { type: 'blocks', id };
      }
    });
  }
  listen(svg, 'pointerdown', ((event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const p = point(event);
    if (tool !== 'select') {
      addPiece(p.x, p.y);
      return;
    }
    const target = (event.target as Element).closest<SVGElement>('[data-id]');
    selected = target
      ? { id: target.dataset.id!, type: target.dataset.type as NonNullable<Selection>['type'] }
      : null;
    const item = entity();
    if (item) {
      drag = {
        start: copy(level),
        x: p.x,
        y: p.y,
        dx: item.x - p.x,
        dy: item.y - p.y,
        moved: false,
      };
      svg.setPointerCapture(event.pointerId);
    }
    render();
  }) as EventListener);
  listen(svg, 'pointermove', ((event: PointerEvent) => {
    const item = entity();
    if (!drag || !item) return;
    const p = point(event);
    if (Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y) > 2) drag.moved = true;
    item.x = Math.max(10, Math.min(1430, p.x + drag.dx));
    item.y = Math.max(20, Math.min(790, p.y + drag.dy));
    renderScene();
    renderSelection();
  }) as EventListener);
  const endDrag = () => {
    if (!drag) return;
    if (drag.moved) remember(drag.start);
    drag = null;
    render();
  };
  listen(svg, 'pointerup', endDrag);
  listen(svg, 'pointercancel', endDrag);
  listen(svg, 'lostpointercapture', endDrag);
  listen(root, 'click', ((event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.tool) {
      tool = button.dataset.tool as Tool;
      render();
      return;
    }
    if (button.dataset.material) {
      material = button.dataset.material as MaterialKind;
      if (selected?.type === 'blocks') commit(() => ((entity() as BlockDef).material = material));
      else render();
      return;
    }
    switch (button.dataset.action) {
      case 'back':
        onClose();
        break;
      case 'new':
        commit(() => {
          level = {
            ...copy(initial),
            id: uid('custom'),
            name: 'Untitled trouble',
            subtitle: 'A little castle, a lot of mischief.',
            blocks: [],
            monsters: [],
            hazards: [],
            projectiles: ['sheep', 'duck', 'bear', 'rabbit'],
            thresholds: [5000, 9000, 14000],
          };
          selected = null;
        });
        break;
      case 'play': {
        const issues = validateLevel(level);
        if (issues.length) {
          message(`Cannot playtest · ${issues[0].path}: ${issues[0].message}`, true);
          break;
        }
        onPlay(copy(level));
        break;
      }
      case 'undo':
        if (history.length) {
          future.push(copy(level));
          level = history.pop()!;
          selected = null;
          render();
        }
        break;
      case 'redo':
        if (future.length) {
          history.push(copy(level));
          level = future.pop()!;
          selected = null;
          render();
        }
        break;
      case 'tower':
        commit(() => {
          const x = 1030;
          const floor = level.bounds.ground;
          for (const dx of [-60, 60])
            level.blocks.push({
              id: uid('post'),
              x: x + dx,
              y: floor - 50,
              w: 20,
              h: 100,
              material,
            });
          level.blocks.push({ id: uid('beam'), x, y: floor - 110, w: 160, h: 20, material });
          level.monsters.push({ id: uid('monster'), x, y: floor - 18, radius: 18, kind: 'blob' });
        });
        break;
      case 'add-stuffie':
        if (level.projectiles.length < 12)
          commit(() =>
            level.projectiles.push(
              $<HTMLSelectElement>('[data-field="stuffie"]').value as StuffieKind,
            ),
          );
        break;
      case 'save':
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(level));
          message('Draft saved on this device.');
        } catch {
          message('Device storage is unavailable. Export JSON to keep your draft.', true);
        }
        break;
      case 'load':
        try {
          const value = localStorage.getItem(SAVE_KEY);
          if (!value) {
            message('No saved draft on this device.');
            break;
          }
          load(value, 'Draft loaded.', true);
        } catch {
          message('The saved draft could not be read. Try importing JSON.', true);
        }
        break;
      case 'export': {
        const blob = new Blob([JSON.stringify(level, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${level.id.replace(/[^a-z0-9_-]/gi, '-')}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        message('Level exported as portable JSON.');
        break;
      }
      case 'import':
        $<HTMLInputElement>('[data-field="file"]').click();
        break;
    }
  }) as EventListener);
  function load(raw: string, success: string, allowIncompleteDraft = false) {
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      message('This file is not valid JSON.', true);
      return;
    }
    const issues = validateLevel(input);
    // Locally saved drafts may be mid-construction; only allow shape-safe authoring errors.
    const blocking = allowIncompleteDraft
      ? issues.filter((issue) => {
          if (
            issue.message.startsWith('Overlaps ') ||
            issue.message.startsWith('Object extends beyond')
          )
            return false;
          if (issue.path === 'monsters' && issue.message === 'At least one monster is required.')
            return false;
          if (issue.path === 'projectiles' && (input as Level).projectiles?.length === 0)
            return false;
          if (
            issue.path === 'thresholds' &&
            Array.isArray((input as Level).thresholds) &&
            (input as Level).thresholds.length === 3 &&
            (input as Level).thresholds.every((n) => Number.isFinite(n) && n >= 0)
          )
            return false;
          return true;
        })
      : issues;
    if (blocking.length) {
      message(`Import rejected · ${blocking[0].path}: ${blocking[0].message}`, true);
      return;
    }
    commit(() => {
      level = copy(input as Level);
      selected = null;
    });
    message(success);
  }
  listen(root, 'change', ((event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.field === 'name')
      commit(() => (level.name = input.value.trim() || 'Untitled trouble'));
    if (input.dataset.field === 'subtitle')
      commit(() => (level.subtitle = input.value.trim() || 'A little castle, a lot of mischief.'));
    if (input.dataset.field === 'snap') snap = input.checked;
    if (input.dataset.score !== undefined) {
      const n = Number(input.value);
      if (Number.isFinite(n))
        commit(() => (level.thresholds[Number(input.dataset.score)] = Math.max(0, n)));
    }
    if (input.dataset.field === 'file' && input.files?.[0]) {
      const file = input.files[0];
      if (file.size > 2_000_000) {
        message('Choose a level JSON file smaller than 2 MB.', true);
        return;
      }
      file
        .text()
        .then((raw) => {
          if (!controller.signal.aborted) load(raw, 'Level imported.');
        })
        .catch(() => message('Could not read this file.', true));
      input.value = '';
    }
  }) as EventListener);
  render();
  return () => {
    controller.abort();
    drag = null;
    root.remove();
  };
}
