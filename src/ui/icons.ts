export const icon = (name: string) =>
  ({
    back: '←',
    close: '×',
    restart: '↻',
    pause: 'Ⅱ',
    sound: '♪',
    play: '▶',
    settings: '⚙',
    star: '★',
    levels: '▦',
    arrow: '→',
    check: '✓',
  })[name] || name;

/** Original vector plush portraits share the in-game character palette and stitch language. */
export function portrait(kind: string): string {
  const ink = '#242139';
  const eye = (x: number, y: number, r = 7) =>
    `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r + 1}" fill="#fff8e8"/><ellipse cx="${x + 1}" cy="${y + 1}" rx="3.3" ry="4.7" fill="${ink}"/><circle cx="${x + 2}" cy="${y - 1}" r="1.1" fill="#fff"/>`;
  let body: string;
  if (kind === 'duck') {
    body = `<path d="M25 79 14 67 17 45 26 32 36 29 33 15 44 25 51 12 59 28 72 32 83 49 82 70 70 83 46 89Z" fill="#ffd44e"/><path d="M23 62Q34 54 40 67L36 80 25 77Z" fill="#4497ef"/><path d="m26 63 9 2-1 11-9-3Z" fill="none" stroke-dasharray="2 3" stroke-width="1.5"/>${eye(42, 45, 7)}${eye(65, 46, 8)}<path d="M46 58 73 56 88 65 73 73 45 69 39 64Z" fill="#ff8b3d"/><path d="m47 65 28-1" fill="none" stroke-width="2.2"/><path d="m33 34 9-3m17 0 10 4" stroke-width="3"/><path d="m53 78 5 3 5-2" fill="none" stroke-width="2"/>`;
  } else if (kind === 'bear') {
    body = `<path d="M21 38Q8 28 17 18 28 7 37 25L62 25Q71 8 82 19 94 31 79 41L84 67 76 82 57 89 33 87 18 74 16 54Z" fill="#df9253"/><path d="M20 29Q19 20 28 23L30 32ZM70 30Q72 20 80 26L77 34Z" fill="#ffdda4" stroke-width="2"/>${eye(36, 49, 7)}${eye(64, 48, 8)}<path d="M33 62Q48 51 66 59L70 73 62 82 41 81 30 73Z" fill="#ffdda4"/><path d="m43 62 15-1-6 8Z" fill="${ink}" stroke-width="2"/><path d="m51 68-1 7m-8-2q7 8 16 0" fill="none" stroke-width="2.4"/><path d="m20 61 11-3 3 12-11 3Z" fill="#27c5bd" stroke-width="2"/><path d="m21 64 11 5m-7-9 3 12" stroke-width="1.2"/><path d="m28 37 10-3m21 0 11 2" fill="none" stroke-width="3"/>`;
  } else if (kind === 'rabbit') {
    body = `<path d="M26 42 18 17Q17 3 26 4L44 33 55 34 64 7Q70-1 77 7L72 42 84 54 82 74 65 88 39 88 20 77 16 59Z" fill="#c29aee"/><path d="m26 14 10 21-7-2-5-17ZM69 12 65 36 61 35Z" fill="#f98db4" stroke-width="2"/>${eye(36, 54, 8)}${eye(63, 53, 7)}<path d="M35 68Q48 56 65 65L67 76 54 83 40 80Z" fill="#f4d7f0" stroke-width="2"/><path d="m45 65 12 1-6 6Z" fill="#f98db4" stroke-width="2"/><path d="m51 72-1 4m-8-1q8 6 16-1" fill="none" stroke-width="2.3"/><path d="m20 65 10-5 6 10-11 6Z" fill="#f98db4" stroke-width="2"/><path d="m23 63 10 9m-7-10 1 11" stroke-width="1.2"/><path d="m28 43 11-3m20-1 10 4" fill="none" stroke-width="3"/>`;
  } else {
    body = `<path d="M17 40Q6 32 16 23Q17 12 31 16Q38 2 50 14Q63 3 72 17Q87 13 88 28Q101 40 87 49Q94 64 81 72Q79 87 64 84Q51 98 39 86Q22 94 18 78Q4 77 10 63Q0 51 17 40Z" fill="#fff2ce"/><path d="M24 48Q8 37 8 49Q10 59 25 58M73 47Q91 34 91 48Q89 59 75 58" fill="#39344c" stroke-width="3"/><path d="M30 43 45 36 66 40 76 54 69 74 54 83 37 75 27 58Z" fill="#39344c"/>${eye(41, 53, 7)}${eye(63, 53, 7)}<path d="m46 66 10-1-4 6Z" fill="#e6d6ad" stroke-width="1.5"/><path d="m43 72q9 7 18-1" fill="none" stroke="#fff2ce" stroke-width="2"/><path d="M73 62 85 60 86 73 75 76Z" fill="#ff765c" stroke-width="2"/><path d="m75 64 9 8m-6-10 2 12" stroke-width="1.2"/><path d="M43 26 50 20 57 28 62 23" fill="none" stroke="#e6d6ad" stroke-width="3"/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="${ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
}
