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
export function portrait(kind: string) {
  const colors: Record<string, string> = {
    sheep: '#f8edcf',
    duck: '#ffd15d',
    bear: '#b27a51',
    rabbit: '#e4bfd8',
  };
  const c = colors[kind] || colors.sheep;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="85" rx="31" ry="6" fill="#164a4314"/>${kind === 'rabbit' ? '<ellipse cx="37" cy="27" rx="10" ry="25" fill="#e4bfd8" stroke="#52615a" stroke-width="2" transform="rotate(-12 37 27)"/><ellipse cx="64" cy="27" rx="10" ry="25" fill="#e4bfd8" stroke="#52615a" stroke-width="2" transform="rotate(12 64 27)"/>' : kind === 'bear' ? '<circle cx="25" cy="32" r="14" fill="#b27a51" stroke="#52615a" stroke-width="2"/><circle cx="75" cy="32" r="14" fill="#b27a51" stroke="#52615a" stroke-width="2"/>' : ''}<ellipse cx="50" cy="57" rx="34" ry="30" fill="${c}" stroke="#52615a" stroke-width="2"/>${kind === 'sheep' ? '<g fill="#fff7e3" stroke="#d9d3bd" stroke-width="1.5"><circle cx="28" cy="36" r="13"/><circle cx="45" cy="28" r="13"/><circle cx="63" cy="29" r="13"/><circle cx="77" cy="40" r="11"/></g><ellipse cx="50" cy="57" rx="21" ry="19" fill="#77766a"/>' : ''}<circle cx="40" cy="53" r="3" fill="${kind === 'sheep' ? '#fff6dc' : '#344f46'}"/><circle cx="61" cy="53" r="3" fill="${kind === 'sheep' ? '#fff6dc' : '#344f46'}"/>${kind === 'duck' ? '<ellipse cx="55" cy="65" rx="17" ry="8" fill="#e78b45"/>' : '<path d="M44 66q6 7 12 0" fill="none" stroke="#344f46" stroke-width="2.5" stroke-linecap="round"/>'}<path d="M24 68l6 3m-3-6l-2 7" stroke="#65746a" stroke-width="1.3" opacity=".5"/></svg>`;
}
