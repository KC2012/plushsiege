import type { Level } from '../game/types';
import './menus.css';

type BestScore = { score: number; stars: number };
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
const svg = (body: string, cls = '') =>
  `<svg class="menu-symbol ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const arrow = (left = false) => svg(`<path d="M${left ? '15 5l-7 7 7 7' : '9 5l7 7-7 7'}"/>`);
const star = (earned = true) =>
  `<svg class="menu-star ${earned ? 'earned' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.85 5.78 6.38.93-4.62 4.5 1.1 6.35L12 17.07l-5.71 3 1.09-6.35-4.62-4.51 6.39-.93Z"/></svg>`;

/** Game-first title controls. The illustrated Phaser scene remains visible behind it. */
export function titleMenu(): string {
  return `<section class="title-menu" aria-label="Plush Siege main menu">
    <div class="title-emblem">
      <svg class="title-spark title-spark-left" viewBox="0 0 50 75" aria-hidden="true"><path d="m21 5 4 15 12 5-12 4-4 15-4-15-12-4 12-5Z" fill="#fff2ce" stroke="#242139" stroke-width="2"/><path d="m41 45 2 8 6 3-6 2-2 9-3-9-6-2 6-3Z" fill="#ff765c" stroke="#242139" stroke-width="2"/></svg>
      <h1 class="title-lettering"><span>PLUSH</span><span>SIEGE</span></h1>
      <svg class="title-spark title-spark-right" viewBox="0 0 50 75" aria-hidden="true"><path d="m23 5 4 15 12 5-12 4-4 15-4-15-12-4 12-5Z" fill="#fff2ce" stroke="#242139" stroke-width="2"/><path d="m12 49 2 7 6 3-6 2-2 9-3-9-6-2 6-3Z" fill="#ff765c" stroke="#242139" stroke-width="2"/></svg>
      <div class="title-ribbon"><span>MEADOW MISCHIEF</span></div>
    </div>
    <div class="title-controls">
      <button class="game-button title-play" data-action="continue" aria-label="Play Plush Siege"><svg viewBox="0 0 28 32" aria-hidden="true"><path d="M4 3q-3-2-3 2v22q0 4 3 2l21-11q4-2 0-4Z" fill="currentColor"/></svg><span>PLAY</span></button>
      <div class="title-secondary">
        <button class="game-button game-button-parchment" data-action="levels">${svg('<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16"/><path d="m12 10 2 2m0-2-2 2"/>')}<span>Level map</span></button>
        <button class="game-button game-button-parchment" data-action="editor">${svg('<path d="m4 20 9-9m-3-7 4-2 7 7-3 3-3-3-2 2-4-4Zm-5 16-2-2 2-2 2 2Z"/>')}<span>Workshop</span></button>
      </div>
    </div>
  </section>`;
}

const stops = [
  { x: 13, y: 28 },
  { x: 37, y: 38 },
  { x: 63, y: 26 },
  { x: 87, y: 32 },
  { x: 87, y: 72 },
  { x: 63, y: 78 },
  { x: 37, y: 66 },
  { x: 13, y: 75 },
];

/** Eight-node map pages keep all touch targets visible without campaign scrolling. */
export function campaignMenu(
  campaign: Level[],
  scores: Record<string, BestScore>,
  requestedPage: number,
): string {
  const pages = Math.max(1, Math.ceil(campaign.length / 8));
  const page = Math.max(0, Math.min(pages - 1, Math.trunc(requestedPage) || 0));
  const visible = campaign.slice(page * 8, page * 8 + 8);
  const earned = campaign.reduce(
    (total, level) => total + Math.max(0, Math.min(3, scores[level.id]?.stars || 0)),
    0,
  );
  const next = campaign.findIndex((level) => !scores[level.id]);
  return `<section class="campaign-menu" aria-label="Meadow Mischief level map">
    <div class="map-landscape" aria-hidden="true"><svg viewBox="0 0 1440 810" preserveAspectRatio="none">
      <path d="M0 0H1440V810H0Z" fill="#68d5cb"/>
      <path d="m1110 38 70 18 42 64-15 70-66 38-68-20-35-65 14-66Z" fill="#e4f160"/>
      <path d="M0 362 172 121 319 352 506 158 703 387 865 196 1037 376 1255 152 1440 370V810H0Z" fill="#ada2e1"/>
      <path d="m172 121 147 231-85-41-48-99-40 25ZM506 158l197 229-120-61-56-84-52 23ZM1255 152l185 218-99-32-67-97-64 19Z" fill="#8e87ca"/>
      <path d="M0 456 238 319 400 476 638 368 862 509 1087 357 1440 493V810H0Z" fill="#39bbaa"/>
      <path d="M0 657 265 555 471 644 696 524 936 634 1202 542 1440 629V810H0Z" fill="#9dd662"/>
      <path d="M0 748 246 681 568 744 865 662 1164 745 1440 681V810H0Z" fill="#bdea46"/>
      <g fill="#242139"><path d="m68 235 12 130 14 2-5-129Z"/><path d="m1322 482-11 149 15-3 12-146Z"/></g>
      <g fill="#299d91"><path d="m82 148-67 112 42-9-29 60 115-14-37-50 32 3Z"/><path d="m1324 382-66 108 42-7-28 59 112-14-37-45 35 3Z"/></g>
      <g fill="#fff2ce"><path d="m18 105 102-23 176 19 24 22-178 5-54-11-53 4Z"/><path d="m1126 280 111-17 203 14v19l-177 3-59-8-63 9Z"/></g>
      <g fill="#ff765c"><path d="m183 656 6-18 8 18 19 3-17 10-3 18-12-13-18 2 10-14Z"/><path d="m1237 215 5-13 7 13 14 3-13 6-3 14-10-10-13 1 8-10Z"/></g>
    </svg></div>
    <div class="map-heading"><span class="map-world-number">01</span><div class="map-world-ribbon"><span class="map-world-caption">THE COUNTRYSIDE</span><h1>Meadow Mischief</h1></div><div class="map-star-badge" aria-label="${earned} of ${campaign.length * 3} stars collected">${star()}<strong>${earned}<small> / ${campaign.length * 3}</small></strong></div></div>
    <div class="map-trail">
      <svg class="map-path" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><path d="M130 168C210 92 245 275 370 228S520 85 630 156S840 100 870 192C925 290 942 370 870 432S720 522 630 468S450 332 370 396S235 522 130 450" fill="none" stroke="#242139" stroke-width="35" stroke-linecap="round"/><path d="M130 168C210 92 245 275 370 228S520 85 630 156S840 100 870 192C925 290 942 370 870 432S720 522 630 468S450 332 370 396S235 522 130 450" fill="none" stroke="#fff2ce" stroke-width="27" stroke-linecap="round"/><path d="M130 168C210 92 245 275 370 228S520 85 630 156S840 100 870 192C925 290 942 370 870 432S720 522 630 468S450 332 370 396S235 522 130 450" fill="none" stroke="#27a99b" stroke-width="3" stroke-dasharray="3 13" stroke-linecap="round"/></svg>
      ${visible
        .map((level, index) => {
          const i = page * 8 + index;
          const stars = Math.max(0, Math.min(3, scores[level.id]?.stars || 0));
          const stop = stops[index];
          return `<button class="map-stop ${stars ? 'is-complete' : ''} ${i === next ? 'is-next' : ''}" data-level="${i}" style="--stop-x:${stop.x}%;--stop-y:${stop.y}%" aria-label="Level ${i + 1}: ${escape(level.name)}, ${stars} stars" ${i === next ? 'aria-current="step"' : ''}><span class="map-node"><span class="map-node-number">${i + 1}</span><span class="map-node-stars">${[1, 2, 3].map((n) => star(n <= stars)).join('')}</span>${i === next ? '<span class="map-ready-dot" aria-hidden="true"></span>' : ''}</span><span class="map-node-name">${escape(level.name)}</span></button>`;
        })
        .join('')}
    </div>
    <div class="map-footer"><button class="game-button game-button-parchment map-home" data-action="home">${arrow(true)}<span>Back</span></button><nav class="map-pages" aria-label="Level map pages"><button class="game-button map-page-arrow" data-action="map-prev" aria-label="Previous eight levels" ${page === 0 ? 'disabled' : ''}>${arrow(true)}</button><span class="map-page-indicator"><strong>${page + 1}<i>/</i>${pages}</strong><small>LEVELS ${page * 8 + 1}–${Math.min((page + 1) * 8, campaign.length)}</small></span><button class="game-button map-page-arrow" data-action="map-next" aria-label="Next eight levels" ${page === pages - 1 ? 'disabled' : ''}>${arrow()}</button></nav><button class="game-button game-button-parchment map-workshop" data-action="editor">${svg('<path d="m4 20 9-9m-3-7 4-2 7 7-3 3-3-3-2 2-4-4Z"/>')}<span>Workshop</span></button></div>
  </section>`;
}
