import Phaser from 'phaser';
import { SiegeScene } from './game/scene';
import { ProgressStore } from './game/save';
import { starsFor } from './game/physics';
import { STUFFIES } from './game/config';
import { campaign } from './content/campaign';
import { openEditor } from './editor/editor';
import { portrait } from './ui/icons';
import type { Level, StuffieKind } from './game/types';
import './style.css';
import { titleMenu, campaignMenu } from './ui/menus';
import './ui/menus.css';
const ui = document.querySelector<HTMLElement>('#ui')!;
const store = new ProgressStore();
const scene = new SiegeScene();
let active = 0,
  custom: Level | undefined,
  editorDraft: Level | undefined,
  editorCleanup: (() => void) | undefined;
let screen = 'home';
let mapPage = 0;
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1440,
  height: 810,
  backgroundColor: '#e9eee1',
  transparent: false,
  antialias: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [scene],
  input: { activePointers: 2 },
  render: { powerPreference: 'high-performance' },
  audio: { noAudio: true },
});
scene.onState = () => {
  if (screen === 'game') updateHUD();
};
scene.onResult = result;
function settingsApply() {
  scene.audio.enabled = store.data.sound;
  scene.preview = store.data.trajectory;
  scene.reducedMotion = store.data.reducedMotion;
  ui.classList.toggle('gentle-motion', store.data.reducedMotion);
  document.querySelectorAll('.sound-button').forEach((b) => {
    b.textContent = store.data.sound ? '♪' : '♩';
    b.setAttribute('aria-label', store.data.sound ? 'Mute sound' : 'Enable sound');
  });
}
const svgIcon = (name: string) =>
  `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({ arrow: '<path d="M5 19L19 5M5 5h14v14"/>', settings: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>', pause: '<path stroke-width="3" d="M8 5v14m8-14v14"/>', restart: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>' } as Record<string, string>)[name]}</svg>`;
function button(action: string, text: string, cls = '') {
  const labels: Record<string, string> = {
    sound: store.data.sound ? 'Mute sound' : 'Enable sound',
    settings: 'Settings',
    restart: 'Restart level',
    pause: 'Pause game',
  };
  return `<button data-action="${action}" class="${cls}" ${labels[action] ? `aria-label="${labels[action]}"` : ''}>${text.replaceAll('↗', svgIcon('arrow')).replaceAll('⚙', svgIcon('settings')).replaceAll('Ⅱ', svgIcon('pause')).replaceAll('↻', svgIcon('restart'))}</button>`;
}
function header(extra = '') {
  return `<header class="header"><button class="brand" data-action="home" aria-label="Plush Siege home"><span class="brand-symbol">${portrait('sheep')}</span><span>plush<span class="brand-light">siege</span></span></button><nav>${extra}${button('sound', store.data.sound ? '♪' : '♩', 'icon-button sound-button')}${button('settings', '⚙', 'icon-button')}</nav></header>`;
}
function home() {
  editorCleanup?.();
  editorCleanup = undefined;
  screen = 'home';
  custom = undefined;
  settingsApply();
  scene.loadLevel(campaign[23] || campaign[0], 'home');
  ui.className = 'home-screen title-screen' + (store.data.reducedMotion ? ' gentle-motion' : '');
  ui.innerHTML = header() + titleMenu();
}
function levels(page = mapPage) {
  screen = 'levels';
  scene.cancelAim();
  scene.paused = true;
  mapPage = Math.max(0, Math.min(Math.ceil(campaign.length / 8) - 1, page));
  ui.className = 'menu-screen campaign-screen' + (store.data.reducedMotion ? ' gentle-motion' : '');
  ui.innerHTML = header() + campaignMenu(campaign, store.data.scores, mapPage);
}
function play(index: number, level?: Level) {
  active = index;
  if (!level) mapPage = Math.floor(index / 8);
  custom = level;
  screen = 'game';
  ui.className = 'game-screen' + (store.data.reducedMotion ? ' gentle-motion' : '');
  settingsApply();
  scene.loadLevel(level || campaign[index]);
  ui.innerHTML = `${header(button('levels', '▦ <span>Levels</span>', 'pill-button'))}<div class="level-heading"><span class="eyebrow" id="level-chapter"></span><h2 id="level-title"></h2></div><div class="scoreboard"><span>SCORE</span><strong id="score">0</strong><div id="score-stars" class="score-stars">☆☆☆</div></div><div class="hud-bottom"><div class="queue-panel"><div class="hud-caption">YOUR LITTLE TROUBLEMAKERS</div><div id="queue"></div></div><div class="shot-message" id="shot-message" role="status"></div><div class="game-actions">${custom ? button('return-editor', '← Workshop', 'pill-button') : ''}${button('restart', '↻', 'icon-button')}${button('pause', 'Ⅱ', 'icon-button')}</div></div><div id="modal-root"></div>`;
  document.querySelector('#level-chapter')!.textContent = custom
    ? 'WORKSHOP · PLAYTEST'
    : `MEADOW MISCHIEF · ${String(index + 1).padStart(2, '0')} / 24`;
  document.querySelector('#level-title')!.textContent = (level || campaign[index]).name;
  updateHUD();
}
function updateHUD() {
  const sim = scene.sim;
  if (!sim) return;
  const score = document.querySelector('#score');
  if (!score) return;
  score.textContent = sim.score.toLocaleString();
  document.querySelector('#score-stars')!.textContent = [0, 1, 2]
    .map((i) => (sim.score >= sim.level.thresholds[i] ? '★' : '☆'))
    .join('');
  document.querySelector('#queue')!.innerHTML = sim.level.projectiles
    .map(
      (k, i) =>
        `<span class="queue-item ${i < sim.shots ? 'used' : ''} ${i === sim.shots ? 'next' : ''}" title="${STUFFIES[k].name}">${portrait(k)}</span>`,
    )
    .join('');
  const hint = document.querySelector('#shot-message')!;
  hint.textContent =
    sim.phase === 'aiming'
      ? sim.shots === 0 && sim.level.tutorial
        ? sim.level.tutorial
        : 'Drag your stuffie back. Release to launch.'
      : sim.phase === 'flying'
        ? sim.canActivate
          ? `${STUFFIES[sim.current?.kind || 'sheep'].name}: ${STUFFIES[sim.current?.kind || 'sheep'].role}`
          : sim.abilityUsed
            ? 'Ability used. Watch the castle come down…'
            : 'Watch the castle — falling pieces still count.'
        : sim.phase === 'won'
          ? 'A lovely bit of trouble.'
          : 'There’s always another way. Give it another go.';
}
function modal(content: string, cls = '') {
  const root =
    document.querySelector('#modal-root') ||
    ui.appendChild(Object.assign(document.createElement('div'), { id: 'modal-root' }));
  root.innerHTML = `<div class="modal-shade"><section class="modal ${cls}" role="dialog" aria-modal="true">${content}</section></div>`;
  setTimeout(() => root.querySelector<HTMLButtonElement>('button')?.focus(), 0);
}
function closeModal() {
  document.querySelector('#modal-root')?.remove();
  if (screen === 'game') scene.paused = false;
}
function result(won: boolean) {
  if (screen !== 'game' || !scene.sim) return;
  const sim = scene.sim;
  const stars = starsFor(sim.score, sim.level.thresholds);
  if (won && !custom) store.record(sim.level.id, sim.score, stars);
  modal(
    `<div class="result-face">${portrait(won ? sim.current?.kind || 'sheep' : 'rabbit')}</div><span class="eyebrow">${won ? 'A BEAUTIFUL LITTLE MESS' : 'ONE MORE LITTLE PULL?'}</span><h2>${won ? 'Softies for the win.' : 'Almost had them.'}</h2><p>${won ? 'The meadow is a little quieter. The stuffies look suspiciously pleased.' : 'Try a different angle, or tap in flight to use your stuffie’s ability.'}</p>${won ? `<div class="result-stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? 'earned' : ''}">★</span>`).join('')}</div><div class="result-score">${sim.score.toLocaleString()}<small>POINTS · ${sim.unused} UNUSED × 3,000 INCLUDED</small></div>` : ''}<div class="modal-actions">${won ? button(custom ? 'return-editor' : active < campaign.length - 1 ? 'next' : 'levels', custom ? 'Back to workshop' : active < campaign.length - 1 ? 'On to the next ↗' : 'Back to the meadow', 'primary') : button('restart', 'Give it another go ↻', 'primary')}${button(won ? 'restart' : 'levels', won ? 'Play it again' : 'Choose a level', 'text-button')}</div>${!store.available ? '<p class="save-warning">Browser storage is unavailable. Progress lasts for this visit.</p>' : ''}`,
    'result-modal',
  );
}
function settings() {
  const wasPaused = scene.paused;
  scene.paused = true;
  scene.cancelAim();
  modal(
    `<span class="eyebrow">MAKE YOURSELF COMFORTABLE</span><h2>The little details.</h2><p>All fun. No fuss.</p><div class="settings-list">${(['sound', 'trajectory', 'reducedMotion'] as const).map((key, i) => `<label><span>${['Sound effects', 'Show aiming guide', 'Gentle motion'][i]}</span><input type="checkbox" data-setting="${key}" ${store.data[key] ? 'checked' : ''}></label>`).join('')}</div><p class="settings-note">Glass 600 · Wood 500 · Stone 800<br>Monsters 5,000 · Unused stuffies 3,000<br>Progress saves on this device. No account needed.</p>${button('close-settings', 'All set ✓', 'primary')}`,
  );
  document.querySelector('[data-action="close-settings"]')?.addEventListener(
    'click',
    () => {
      closeModal();
      scene.paused = wasPaused;
    },
    { once: true },
  );
}
function editor(level = editorDraft || campaign[0]) {
  screen = 'editor';
  scene.paused = true;
  editorCleanup?.();
  ui.className = 'editor-screen';
  ui.innerHTML = '';
  editorCleanup = openEditor(
    ui,
    structuredClone(level),
    (draft) => {
      editorDraft = draft;
      editorCleanup?.();
      editorCleanup = undefined;
      play(0, draft);
    },
    () => {
      editorCleanup?.();
      editorCleanup = undefined;
      home();
    },
  );
}
ui.addEventListener('pointerdown', (e) => {
  if ((e.target as Element).closest('button,input,select,.modal,.level-editor'))
    scene.audio.unlock();
});
ui.addEventListener('click', (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-action],[data-level],[data-crew]');
  if (!el) return;
  scene.audio.unlock();
  if (el.dataset.level !== undefined) {
    play(Number(el.dataset.level));
    return;
  }
  if (el.dataset.crew) {
    const k = el.dataset.crew as StuffieKind;
    modal(
      `<div class="result-face">${portrait(k)}</div><span class="eyebrow">MEET THE CREW</span><h2>${STUFFIES[k].name}</h2><p>${STUFFIES[k].role}</p><p>Pull back to aim. Release to launch.<br>Tap the sky once during flight to use an ability.</p>${button('close', 'Lovely. Let’s play.', 'primary')}`,
    );
    return;
  }
  switch (el.dataset.action) {
    case 'home':
      home();
      break;
    case 'continue':
      play(
        Math.min(
          campaign.findIndex((l) => !store.data.scores[l.id]) < 0
            ? 0
            : campaign.findIndex((l) => !store.data.scores[l.id]),
          campaign.length - 1,
        ),
      );
      break;
    case 'map-prev':
      levels(mapPage - 1);
      break;
    case 'map-next':
      levels(mapPage + 1);
      break;
    case 'levels':
      if (screen === 'editor') break;
      levels();
      break;
    case 'restart':
      closeModal();
      play(active, custom);
      break;
    case 'next':
      play(Math.min(active + 1, campaign.length - 1));
      break;
    case 'pause':
      scene.paused = true;
      scene.cancelAim();
      modal(
        `<span class="eyebrow">TAKE A LITTLE BREATHER</span><h2>The chaos can wait.</h2><p>Your stuffies aren’t going anywhere.</p><div class="modal-actions">${button('resume', 'Back to the mischief ▶', 'primary')}${button('restart', 'Start fresh ↻', 'text-button')}${button('levels', 'Choose a level', 'text-button')}</div>`,
      );
      break;
    case 'resume':
    case 'close':
      closeModal();
      break;
    case 'settings':
      settings();
      break;
    case 'sound':
      store.data.sound = !store.data.sound;
      store.persist();
      settingsApply();
      document.querySelectorAll('.sound-button').forEach((b) => {
        b.textContent = store.data.sound ? '♪' : '♩';
        b.setAttribute('aria-label', store.data.sound ? 'Mute sound' : 'Enable sound');
      });
      break;
    case 'editor':
      editor();
      break;
    case 'return-editor':
      editor(editorDraft);
      break;
  }
});
ui.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement;
  const key = el.dataset.setting as 'sound' | 'trajectory' | 'reducedMotion' | undefined;
  if (key) {
    store.data[key] = el.checked;
    store.persist();
    settingsApply();
  }
});
window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).matches('input,textarea,select') || screen === 'editor') return;
  if (e.key === 'Escape' && screen === 'game') {
    if (scene.paused) closeModal();
    else document.querySelector<HTMLButtonElement>('[data-action="pause"]')?.click();
  }
  if (e.key.toLowerCase() === 'r' && screen === 'game') play(active, custom);
  if (e.code === 'Space' && screen === 'game' && !scene.paused) {
    e.preventDefault();
    scene.useAbility();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'game' && !scene.paused)
    document.querySelector<HTMLButtonElement>('[data-action="pause"]')?.click();
});
game.events.once('ready', home);
// The worker precaches the exact Vite output; it never depends on a CDN at play time.
if ('serviceWorker' in navigator && import.meta.env.PROD)
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
