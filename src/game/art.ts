import type Phaser from 'phaser';
import type { BlockDef, StuffieKind } from './types';
import { getTheme } from '../content/themes';

type G = Phaser.GameObjects.Graphics;
type Point = { x: number; y: number };
const INK = 0x493e45;
const TAU = Math.PI * 2;

/** Small immediate-mode painter. Geometry, rather than display objects, is transformed,
 * so it is safe to draw many characters onto a shared Graphics layer. */
class Pen {
  constructor(
    public g: G,
    public x = 0,
    public y = 0,
    public angle = 0,
    public sx = 1,
    public sy = 1,
  ) {}
  point(x: number, y: number): Point {
    const c = Math.cos(this.angle),
      s = Math.sin(this.angle);
    return {
      x: this.x + x * this.sx * c - y * this.sy * s,
      y: this.y + x * this.sx * s + y * this.sy * c,
    };
  }
  polygon(points: number[][], color: number, stroke?: number, width = 1.5, alpha = 1) {
    const p = points.map(([x, y]) => this.point(x, y));
    this.g.fillStyle(color, alpha).fillPoints(p, true);
    if (stroke !== undefined) this.g.lineStyle(width, stroke, alpha).strokePoints(p, true);
  }
  line(points: number[][], color: number, width = 1.5, alpha = 1) {
    this.g.lineStyle(width, color, alpha).strokePoints(
      points.map(([x, y]) => this.point(x, y)),
      false,
    );
  }
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: number,
    stroke?: number,
    width = 1.5,
    alpha = 1,
  ) {
    const points: number[][] = [];
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * TAU;
      points.push([x + Math.cos(t) * rx, y + Math.sin(t) * ry]);
    }
    this.polygon(points, color, stroke, width, alpha);
  }
  roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: number,
    stroke?: number,
    width = 1.5,
    alpha = 1,
  ) {
    r = Math.min(w / 2, h / 2, r);
    const points: number[][] = [];
    const corners = [
      [x + w - r, y + r, -Math.PI / 2],
      [x + w - r, y + h - r, 0],
      [x + r, y + h - r, Math.PI / 2],
      [x + r, y + r, Math.PI],
    ];
    for (const [cx, cy, start] of corners)
      for (let i = 0; i <= 4; i++) {
        const a = start + ((i / 4) * Math.PI) / 2;
        points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    this.polygon(points, color, stroke, width, alpha);
  }
}

function cloud(g: G, x: number, y: number, scale: number, alpha = 0.68, color = 0xffffff) {
  g.fillStyle(color, alpha);
  g.fillEllipse(x, y + 12 * scale, 140 * scale, 39 * scale);
  g.fillCircle(x - 35 * scale, y + 1 * scale, 29 * scale);
  g.fillCircle(x + 4 * scale, y - 14 * scale, 38 * scale);
  g.fillCircle(x + 45 * scale, y + 1 * scale, 26 * scale);
}

function tree(
  g: G,
  x: number,
  y: number,
  scale: number,
  color: number,
  trunk = 0x8a8570,
  highlight = 0xffffff,
) {
  const p = new Pen(g, x, y, 0, scale, scale);
  p.polygon(
    [
      [-7, 0],
      [-5, -82],
      [3, -97],
      [9, 0],
    ],
    trunk,
  );
  p.line(
    [
      [0, -41],
      [-26, -77],
    ],
    trunk,
    6 * scale,
  );
  p.ellipse(-25, -92, 36, 44, color);
  p.ellipse(15, -116, 43, 50, color);
  p.ellipse(43, -85, 32, 37, color);
  p.ellipse(-4, -65, 43, 39, color);
  p.ellipse(-15, -112, 20, 14, highlight, undefined, 1, 0.07);
}

/** Original layered environment. Palette comes from the extensible world registry.
 * The scene may cache this drawing at time=0; passing time also supports animated scenery. */
export function drawBackground(g: G, time: number, theme = 'countryside'): void {
  const p = new Pen(g);
  const colors = getTheme(theme).palette;
  g.fillStyle(colors.skyBottom).fillRect(0, 0, 1440, 810);
  // A stepped gradient is fast and deterministic in both Canvas and WebGL renderers.
  for (let i = 0; i < 30; i++) {
    const mix = i / 29;
    const blend = (shift: number) =>
      Math.round(
        ((colors.skyTop >> shift) & 255) * (1 - mix) + ((colors.skyBottom >> shift) & 255) * mix,
      );
    const r = blend(16),
      green = blend(8),
      b = blend(0);
    g.fillStyle((r << 16) | (green << 8) | b).fillRect(0, i * 20, 1440, 21);
  }
  g.fillStyle(colors.sun.halo, 0.38).fillCircle(1165, 174, 93);
  g.fillStyle(colors.sun.glow, 0.8).fillCircle(1165, 174, 61);
  g.fillStyle(colors.sun.center).fillCircle(1165, 174, 46);
  const drift = Math.sin(time / 90000) * 14;
  cloud(g, 175 + drift, 152, 0.75, 0.62, colors.clouds);
  cloud(g, 630 + drift * 0.6, 205, 1.12, 0.7, colors.clouds);
  cloud(g, 998 + drift * 0.7, 104, 0.52, 0.52, colors.clouds);
  cloud(g, 1390 + drift, 267, 0.85, 0.65, colors.clouds);

  // Distant hedgerows and soft hill silhouettes.
  g.fillStyle(colors.hills[0]).fillEllipse(175, 543, 900, 460);
  g.fillStyle(colors.hills[1]).fillEllipse(1070, 575, 1090, 560);
  g.fillStyle(colors.hills[2]).fillEllipse(691, 652, 1190, 415);
  g.fillStyle(colors.hills[3]).fillEllipse(1409, 634, 700, 395);
  p.polygon(
    [
      [0, 566],
      [190, 570],
      [453, 675],
      [348, 675],
      [135, 592],
      [0, 586],
    ],
    colors.path,
    undefined,
    1,
    0.6,
  );
  // Faraway roof and windmill: scenery, never confused with level bodies.
  const mill = new Pen(g, 515, 498, -0.025);
  mill.polygon(
    [
      [-12, 28],
      [-7, -14],
      [8, -14],
      [13, 28],
    ],
    colors.landmark.body,
  );
  mill.polygon(
    [
      [-12, -12],
      [0, -26],
      [13, -12],
    ],
    colors.landmark.roof,
  );
  const rotor = new Pen(g, 515, 481, time / 35000);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const blade = new Pen(g, 515, 481, a + rotor.angle);
    blade.polygon(
      [
        [0, 0],
        [3, -34],
        [11, -35],
        [7, -9],
      ],
      colors.landmark.blades,
    );
  }
  g.fillStyle(colors.landmark.hub).fillCircle(515, 481, 3);
  tree(g, 78, 610, 0.91, colors.foliage[0], colors.trunk, colors.leafHighlight);
  tree(g, 1331, 610, 1.11, colors.foliage[1], colors.trunk, colors.leafHighlight);
  tree(g, 1424, 629, 0.75, colors.foliage[2], colors.trunk, colors.leafHighlight);
  tree(g, 1192, 576, 0.39, colors.foliage[3], colors.trunk, colors.leafHighlight);

  // Meadow: shape language echoes stitched fabric, with a clean collision edge.
  g.fillStyle(colors.meadow[0]).fillEllipse(265, 687, 1050, 150);
  g.fillStyle(colors.meadow[1]).fillEllipse(1110, 700, 1250, 188);
  g.fillStyle(colors.ground.grassEdge).fillRect(0, 669, 1440, 12);
  g.fillStyle(colors.ground.grassLip).fillRect(0, 670, 1440, 5);
  g.fillStyle(colors.ground.topsoil).fillRect(0, 681, 1440, 129);
  g.fillStyle(colors.ground.soil).fillRect(0, 690, 1440, 120);
  g.fillStyle(colors.ground.seam, 0.5).fillRect(0, 704, 1440, 2);
  g.fillStyle(colors.ground.seamHighlight, 0.7).fillRect(0, 706, 1440, 3);
  // Quiet ground speckles and grassy tufts use fixed positions, never random flicker.
  for (let i = 0; i < 44; i++) {
    const x = (i * 137 + 24) % 1440,
      y = 719 + ((i * 37) % 76);
    g.fillStyle(i % 3 ? colors.ground.speckles[0] : colors.ground.speckles[1], 0.35).fillEllipse(
      x,
      y,
      3 + (i % 4),
      2,
    );
  }
  for (let i = 0; i < 23; i++) {
    const x = (i * 157 + 45) % 1440;
    p.line(
      [
        [x - 5, 671],
        [x - 10, 659],
        [x - 3, 664],
        [x, 653],
        [x + 3, 664],
        [x + 9, 660],
        [x + 6, 671],
      ],
      colors.grass,
      1.7,
    );
  }
  // Scattered flower heads sit outside the main target zone.
  for (const [x, y] of [
    [35, 651],
    [102, 656],
    [374, 653],
    [421, 660],
    [1356, 653],
    [1408, 658],
  ]) {
    p.line(
      [
        [x, y + 15],
        [x, y],
      ],
      colors.flowers.stem,
      2,
    );
    g.fillStyle(colors.flowers.petals);
    for (let j = 0; j < 5; j++)
      g.fillCircle(x + Math.cos((j * TAU) / 5) * 3, y + Math.sin((j * TAU) / 5) * 3, 2.6);
    g.fillStyle(colors.flowers.center).fillCircle(x, y, 2);
  }
}

export interface StuffieExpression {
  stretch?: number;
  evil?: boolean;
  blink?: boolean;
  celebrate?: boolean;
}

function eyes(p: Pen, y: number, spread: number, state: StuffieExpression, scale = 1) {
  if (state.blink || state.celebrate) {
    p.line(
      [
        [-spread - 2 * scale, y],
        [-spread, y - 1.4 * scale],
        [-spread + 2 * scale, y],
      ],
      INK,
      1.8,
    );
    p.line(
      [
        [spread - 2 * scale, y],
        [spread, y - 1.4 * scale],
        [spread + 2 * scale, y],
      ],
      INK,
      1.8,
    );
  } else {
    p.ellipse(-spread, y, 2.15 * scale, 3 * scale, state.evil ? 0xce344e : INK);
    p.ellipse(spread, y, 2.15 * scale, 3 * scale, state.evil ? 0xce344e : INK);
    if (!state.evil) {
      p.ellipse(-spread - 0.65 * scale, y - 1 * scale, 0.7 * scale, 0.9 * scale, 0xffffff);
      p.ellipse(spread - 0.65 * scale, y - 1 * scale, 0.7 * scale, 0.9 * scale, 0xffffff);
    } else {
      p.line(
        [
          [-spread - 3, y - 7],
          [-spread + 3, y - 4],
        ],
        0x692c41,
        2.3,
      );
      p.line(
        [
          [spread - 3, y - 4],
          [spread + 3, y - 7],
        ],
        0x692c41,
        2.3,
      );
    }
  }
}

/** Original plush character art. A circular body remains readable while ears, seams,
 * cheeks, small limbs and squash/stretch give the projectile a toy-like personality. */
export function drawStuffie(
  g: G,
  x: number,
  y: number,
  r: number,
  kind: StuffieKind,
  angle: number,
  state: StuffieExpression = {},
): void {
  const stretch = Math.max(-0.4, Math.min(0.7, state.stretch || 0));
  const size = r / 24;
  const p = new Pen(g, x, y, angle, size * (1 + stretch), size / (1 + stretch * 0.75));
  if (kind === 'sheep') {
    // Tiny fabric legs, ears and a soft scalloped wool silhouette.
    p.ellipse(-11, 20, 5, 7, 0x72605a, INK, 1.4);
    p.ellipse(11, 20, 5, 7, 0x72605a, INK, 1.4);
    p.ellipse(0, 0, 23, 23, 0xf1e5cd, 0x9b8976, 1.6);
    for (let i = 0; i < 10; i++) {
      const a = (i * TAU) / 10;
      p.ellipse(Math.cos(a) * 17.5, Math.sin(a) * 17.5, 8.2, 8.2, 0xfff8e6, 0xb6a18c, 1.1);
    }
    p.ellipse(0, 0, 20, 19, 0xfff8e6);
    p.ellipse(-20, -2, 7, 4.8, 0x8d7a70, INK, 1.2);
    p.ellipse(20, -2, 7, 4.8, 0x8d7a70, INK, 1.2);
    p.ellipse(0, 4, 14.5, 15.5, 0x78675e, INK, 1.5);
    p.ellipse(-4, -10, 8, 6.5, 0xfff8e6);
    p.ellipse(5, -10, 7, 6, 0xfff8e6);
    // Light eye sockets prevent dark facial features disappearing into the muzzle.
    p.ellipse(-6, 1, 4.5, 5.8, 0xfff9e7);
    p.ellipse(6, 1, 4.5, 5.8, 0xfff9e7);
    eyes(p, 1, 6, state, 0.8);
    p.ellipse(-10, 8, 3, 1.8, 0xdc9e97, undefined, 1, 0.7);
    p.ellipse(10, 8, 3, 1.8, 0xdc9e97, undefined, 1, 0.7);
    p.polygon(
      [
        [-2, 7],
        [2, 7],
        [0, 10],
      ],
      0x483c3c,
    );
    p.line(
      [
        [-4, 12],
        [-1, 14],
        [2, 14],
        [5, 11],
      ],
      0x493b3a,
      1.2,
    );
    // A sewn little curl.
    p.line(
      [
        [-10, -15],
        [-14, -13],
        [-13, -9],
      ],
      0xdac8b1,
      1.2,
    );
  } else if (kind === 'duck') {
    p.ellipse(-10, 20, 8, 4, 0xe7a046, 0xa4713d, 1.2);
    p.ellipse(9, 20, 8, 4, 0xe7a046, 0xa4713d, 1.2);
    p.polygon(
      [
        [-8, -19],
        [-11, -30],
        [-3, -25],
        [0, -32],
        [7, -25],
        [12, -20],
      ],
      0xffd64d,
      0xad8237,
      1.5,
    );
    p.ellipse(0, 0, 24, 23, 0xf6c84e, 0x9d783c, 1.8);
    p.ellipse(-4, -5, 18, 16, 0xffdb68);
    p.ellipse(-17, 7, 6, 10, 0xf2b747, 0xd49c3d, 1);
    p.line(
      [
        [-19, 5],
        [-15, 11],
      ],
      0xffdb68,
      1.4,
    );
    p.ellipse(16, 8, 5, 9, 0xf2b747, 0xd49c3d, 1);
    eyes(p, -4, 7.3, state);
    p.ellipse(-13, 4, 3.5, 2, 0xf2a176, undefined, 1, 0.8);
    p.ellipse(13, 4, 3.5, 2, 0xf2a176, undefined, 1, 0.8);
    p.ellipse(3, 7, 10, 5.5, 0xf0a142, 0xb87735, 1.3);
    p.line(
      [
        [-5, 7],
        [11, 7],
      ],
      0xb87735,
      1.1,
    );
    p.ellipse(0, 4, 1, 0.6, 0xb87735);
    p.ellipse(5, 4, 1, 0.6, 0xb87735);
    p.line(
      [
        [-4, 19],
        [-2, 16],
        [2, 18],
        [4, 15],
        [7, 17],
      ],
      0xcda24c,
      1.1,
    );
  } else if (kind === 'bear') {
    p.ellipse(-17, -18, 9, 10, 0xb7805b, 0x755344, 1.7);
    p.ellipse(17, -18, 9, 10, 0xb7805b, 0x755344, 1.7);
    p.ellipse(-17, -19, 5, 6, 0xdeaf85);
    p.ellipse(17, -19, 5, 6, 0xdeaf85);
    p.ellipse(-13, 19, 8, 7, 0xb07953, 0x755344, 1.4);
    p.ellipse(13, 19, 8, 7, 0xb07953, 0x755344, 1.4);
    p.ellipse(0, 0, 24, 24, 0xb9825c, 0x755344, 1.8);
    p.ellipse(-5, -7, 17, 15, 0xc28e67);
    p.ellipse(-21, 5, 5, 9, 0xa67150, 0x755344, 1.2);
    p.ellipse(21, 5, 5, 9, 0xa67150, 0x755344, 1.2);
    p.ellipse(0, 7, 13, 10, 0xe9c6a1, 0x9b7256, 1);
    eyes(p, -4, 8, state);
    p.ellipse(-14, 4, 3, 1.8, 0xd59e87);
    p.ellipse(14, 4, 3, 1.8, 0xd59e87);
    p.polygon(
      [
        [-4, 4],
        [4, 4],
        [3, 7],
        [0, 9],
        [-3, 7],
      ],
      0x59413b,
    );
    p.line(
      [
        [0, 8],
        [0, 12],
        [-4, 14],
      ],
      0x785448,
      1.2,
    );
    p.line(
      [
        [0, 12],
        [4, 14],
      ],
      0x785448,
      1.2,
    );
    p.line(
      [
        [-1, -22],
        [-1, -17],
      ],
      0x835e49,
      1,
    );
    p.line(
      [
        [-4, -20],
        [2, -20],
      ],
      0x835e49,
      1,
    );
    p.line(
      [
        [-3, 20],
        [3, 20],
      ],
      0x835e49,
      1,
    );
    p.line(
      [
        [0, 17],
        [0, 23],
      ],
      0x835e49,
      1,
    );
  } else {
    // Floppy ears have contrasting fabric panels and individually tilted tips.
    p.polygon(
      [
        [-15, -13],
        [-22, -31],
        [-21, -44],
        [-15, -47],
        [-10, -39],
        [-8, -15],
      ],
      0xe4c8df,
      0x9a7895,
      1.5,
    );
    p.polygon(
      [
        [-17, -21],
        [-18, -35],
        [-16, -40],
        [-13, -34],
        [-12, -20],
      ],
      0xc79cbe,
    );
    p.polygon(
      [
        [6, -17],
        [9, -41],
        [15, -46],
        [21, -42],
        [23, -30],
        [17, -25],
        [15, -15],
      ],
      0xe4c8df,
      0x9a7895,
      1.5,
    );
    p.polygon(
      [
        [12, -23],
        [13, -36],
        [16, -39],
        [18, -33],
        [16, -27],
      ],
      0xc79cbe,
    );
    p.ellipse(-11, 20, 7, 5, 0xd5afd0, 0x9a7895, 1.4);
    p.ellipse(11, 20, 7, 5, 0xd5afd0, 0x9a7895, 1.4);
    p.ellipse(0, 0, 23, 23, 0xe4c8df, 0x9a7895, 1.8);
    p.ellipse(-4, -5, 17, 16, 0xefdaea);
    p.ellipse(0, 9, 13, 9, 0xf8e9ef);
    eyes(p, -3, 7.5, state);
    p.ellipse(-14, 5, 3.5, 2.3, 0xd598b5, undefined, 1, 0.7);
    p.ellipse(14, 5, 3.5, 2.3, 0xd598b5, undefined, 1, 0.7);
    p.polygon(
      [
        [-3, 5],
        [3, 5],
        [0, 8],
      ],
      0xb47799,
    );
    p.line(
      [
        [0, 8],
        [0, 11],
        [-4, 13],
      ],
      0x94718c,
      1.1,
    );
    p.line(
      [
        [0, 11],
        [4, 13],
      ],
      0x94718c,
      1.1,
    );
    p.line(
      [
        [-21, 5],
        [-15, 7],
      ],
      0xb79bab,
      0.9,
    );
    p.line(
      [
        [15, 7],
        [21, 5],
      ],
      0xb79bab,
      0.9,
    );
    p.line(
      [
        [-5, 20],
        [-2, 18],
        [1, 21],
        [4, 18],
      ],
      0xb79bab,
      1,
    );
  }
  if (state.evil) {
    p.polygon(
      [
        [-17, -18],
        [-19, -31],
        [-9, -23],
      ],
      0x942f49,
      0x6b283b,
      1,
    );
    p.polygon(
      [
        [9, -23],
        [19, -31],
        [17, -18],
      ],
      0x942f49,
      0x6b283b,
      1,
    );
  }
}

export function drawMonster(
  g: G,
  x: number,
  y: number,
  r: number,
  kind = 'horn',
  angle = 0,
  nervous = false,
): void {
  const p = new Pen(g, x, y, angle, r / 21, r / 21);
  const color = kind === 'blob' ? 0x81bcb0 : kind === 'bat' ? 0xdba59c : 0xada0ca;
  const shade = kind === 'blob' ? 0x559588 : kind === 'bat' ? 0xb77e7e : 0x83759f;
  const outline = kind === 'blob' ? 0x42796f : kind === 'bat' ? 0x98646b : 0x726282;
  p.ellipse(-11, 19, 8, 5, shade, outline, 1.5);
  p.ellipse(11, 19, 8, 5, shade, outline, 1.5);
  if (kind === 'bat') {
    p.polygon(
      [
        [-15, -5],
        [-35, -16],
        [-29, 0],
        [-22, 0],
        [-20, 9],
        [-13, 4],
      ],
      color,
      outline,
      1.5,
    );
    p.polygon(
      [
        [15, -5],
        [35, -16],
        [29, 0],
        [22, 0],
        [20, 9],
        [13, 4],
      ],
      color,
      outline,
      1.5,
    );
  }
  if (kind === 'horn') {
    p.polygon(
      [
        [-18, -10],
        [-22, -31],
        [-12, -25],
        [-8, -17],
      ],
      0xf2dba7,
      outline,
      1.5,
    );
    p.polygon(
      [
        [8, -17],
        [12, -25],
        [22, -31],
        [18, -10],
      ],
      0xf2dba7,
      outline,
      1.5,
    );
  } else if (kind === 'blob') {
    p.ellipse(-10, -20, 5, 8, color, outline, 1.5);
    p.ellipse(7, -23, 5, 9, color, outline, 1.5);
  }
  p.ellipse(0, 0, 22, 22, color, outline, 1.8);
  p.ellipse(-6, -7, 14, 12, 0xffffff, undefined, 1, 0.1);
  p.ellipse(-17, 8, 3, 2.2, shade, undefined, 1, 0.5);
  p.ellipse(16, 7, 3.2, 2.4, shade, undefined, 1, 0.5);
  const ey = nervous ? -4 : -3;
  for (const side of [-1, 1]) {
    p.ellipse(side * 8, ey, 6.5, nervous ? 8 : 7.2, 0xfff9e6, outline, 1);
    p.ellipse(side * 8 - 1.2, ey + (nervous ? 1.5 : 1), 2.5, 3.5, INK);
    p.ellipse(side * 8 - 2, ey, 0.8, 1.1, 0xffffff);
  }
  if (nervous) {
    p.ellipse(0, 11, 4.5, 5.3, 0x654c6b, outline, 1);
    p.line(
      [
        [-15, -17],
        [-8, -19],
      ],
      outline,
      1.7,
    );
    p.line(
      [
        [8, -19],
        [15, -17],
      ],
      outline,
      1.7,
    );
    p.polygon(
      [
        [25, -13],
        [29, -7],
        [25, -3],
        [22, -7],
      ],
      0x9cced4,
      0x72afb6,
      1,
    );
  } else {
    p.line(
      [
        [-8, 9],
        [-5, 13],
        [0, 15],
        [5, 13],
        [8, 9],
      ],
      outline,
      1.7,
    );
    p.polygon(
      [
        [-5, 11],
        [-1, 12],
        [-3, 16],
      ],
      0xfffae3,
      outline,
      0.7,
    );
    p.polygon(
      [
        [2, 12],
        [6, 10],
        [5, 15],
      ],
      0xfffae3,
      outline,
      0.7,
    );
  }
}

export function drawBlock(g: G, def: BlockDef, healthRatio = 1): void {
  const { x, y, w, h, material } = def;
  const p = new Pen(g, x, y, def.angle || 0);
  const left = -w / 2,
    top = -h / 2;
  if (material === 'wood') {
    p.roundRect(left, top, w, h, 3, 0xbb8551, 0x815737, 2);
    p.roundRect(left + 2, top + 2, w - 4, h - 4, 2, 0xd6a26b);
    p.line(
      [
        [left + 4, top + 4],
        [left + w - 4, top + 4],
      ],
      0xf2c68c,
      1.5,
    );
    if (w >= h) {
      for (let j = 0; j < Math.min(4, Math.floor(h / 6)); j++) {
        const py = top + 9 + j * 7;
        p.line(
          [
            [left + 8, py],
            [left + w * 0.3, py - 1],
            [left + w * 0.62, py + 1],
            [left + w - 8, py],
          ],
          0xae7946,
          1,
          0.65,
        );
      }
      if (w > 60) p.ellipse(w * 0.19, 1, 7, Math.min(3, h / 6), 0xb88450, 0xa67344, 0.8);
    } else {
      for (let j = 0; j < Math.min(4, Math.floor(w / 6)); j++) {
        const px = left + 8 + j * 6;
        p.line(
          [
            [px, top + 7],
            [px - 1, 0],
            [px + 1, h / 2 - 7],
          ],
          0xae7946,
          1,
          0.6,
        );
      }
      if (h > 60) p.ellipse(1, h * 0.15, Math.min(3, w / 6), 6, 0xb88450, 0xa67344, 0.8);
    }
    for (const [px, py] of [
      [left + 5, top + 5],
      [w / 2 - 5, h / 2 - 5],
    ]) {
      p.ellipse(px, py, 1.7, 1.7, 0x8e694a);
      p.ellipse(px - 0.4, py - 0.4, 0.6, 0.6, 0xe7bd88);
    }
  } else if (material === 'glass') {
    p.roundRect(left, top, w, h, 3, 0x86cbd2, 0x4b929f, 2);
    p.roundRect(left + 3, top + 3, w - 6, h - 6, 1, 0xb7e8e7);
    p.line(
      [
        [left + 5, h / 2 - 5],
        [left + 5, top + 5],
        [w / 2 - 5, top + 5],
      ],
      0xeffff3,
      2,
    );
    p.polygon(
      [
        [left + w * 0.22, top + 3],
        [left + w * 0.4, top + 3],
        [left + w * 0.65, h / 2 - 3],
        [left + w * 0.49, h / 2 - 3],
      ],
      0xf2fff5,
      undefined,
      1,
      0.52,
    );
    if (w > 70)
      p.line(
        [
          [w * 0.27, top + 6],
          [w * 0.39, h / 2 - 6],
        ],
        0xf4fff9,
        2,
        0.7,
      );
  } else {
    p.roundRect(left, top, w, h, 4, 0x8c939c, 0x636b78, 2);
    p.roundRect(left + 3, top + 3, w - 6, h - 6, 2, 0xa7adb1);
    p.line(
      [
        [left + 5, h / 2 - 4],
        [w / 2 - 5, h / 2 - 4],
      ],
      0x858d97,
      2,
    );
    p.line(
      [
        [left + 5, top + 5],
        [w / 2 - 5, top + 5],
      ],
      0xcbd0ca,
      1.5,
    );
    if (w >= h) {
      for (let i = 1; i < w / 42; i++)
        p.line(
          [
            [left + i * 42, top + 3],
            [left + i * 42 - 3, h / 2 - 3],
          ],
          0x7e8791,
          1.5,
        );
    } else {
      for (let i = 1; i < h / 36; i++)
        p.line(
          [
            [left + 3, top + i * 36],
            [w / 2 - 3, top + i * 36 + 2],
          ],
          0x7e8791,
          1.5,
        );
    }
    p.ellipse(left + w * 0.28, top + h * 0.4, 2, 1.4, 0x8c949b);
    p.ellipse(left + w * 0.69, top + h * 0.67, 1.4, 1.6, 0x8c949b);
  }
  if (healthRatio < 0.76) {
    const crack = material === 'glass' ? 0x468f9d : material === 'wood' ? 0x775033 : 0x65717b;
    p.line(
      [
        [left + w * 0.35, top + 1],
        [left + w * 0.48, top + h * 0.3],
        [left + w * 0.4, top + h * 0.5],
        [left + w * 0.6, top + h * 0.72],
      ],
      crack,
      1.3,
    );
    if (healthRatio < 0.38) {
      p.line(
        [
          [left + w * 0.48, top + h * 0.3],
          [left + w * 0.8, top + h * 0.45],
          [w / 2, top + h * 0.35],
        ],
        crack,
        1.5,
      );
      p.line(
        [
          [left + w * 0.4, top + h * 0.5],
          [left + w * 0.25, h / 2],
        ],
        crack,
        1.2,
      );
    }
  }
  if (def.static) {
    for (const xx of [-w / 2 + 7, w / 2 - 7]) p.ellipse(xx, -h / 2 + 7, 2, 2, 0x69777c);
  }
}

export function drawHazard(g: G, x: number, y: number, angle = 0): void {
  const p = new Pen(g, x, y, angle);
  p.roundRect(-19, -20, 38, 40, 4, 0xc56759, 0x8d4d47, 2);
  p.roundRect(-15, -17, 30, 34, 2, 0xde8671);
  p.line(
    [
      [-10, -17],
      [-10, 17],
    ],
    0xb76759,
    1.2,
  );
  p.line(
    [
      [10, -17],
      [10, 17],
    ],
    0xb76759,
    1.2,
  );
  p.roundRect(-20, -12, 40, 7, 1, 0xeadab9, 0xab8f70, 1);
  p.roundRect(-20, 7, 40, 7, 1, 0xeadab9, 0xab8f70, 1);
  // Original fuse + skull-free lightning warning.
  p.line(
    [
      [3, -20],
      [5, -29],
      [12, -31],
      [15, -26],
    ],
    0x665345,
    2.5,
  );
  p.polygon(
    [
      [1, -3],
      [-5, 4],
      [0, 3],
      [-1, 8],
      [6, 0],
      [1, 1],
    ],
    0xffedbc,
  );
  p.ellipse(15, -26, 2.4, 2.4, 0xf9d177);
  p.line(
    [
      [18, -28],
      [21, -30],
    ],
    0xe7b36c,
    1.3,
  );
}

export function drawSling(g: G, anchor: Point, pouch?: Point, front = false): void {
  const { x, y } = anchor;
  const aim = pouch || anchor;
  if (!front) {
    g.fillStyle(0x4c7051, 0.18).fillEllipse(x + 2, 674, 104, 14);
    const p = new Pen(g, x, y);
    p.polygon(
      [
        [-11, 141],
        [-12, 66],
        [-27, 35],
        [-31, -10],
        [-20, -14],
        [-15, 29],
        [1, 55],
        [14, 27],
        [21, -12],
        [32, -9],
        [27, 36],
        [10, 67],
        [12, 141],
      ],
      0x9f704a,
      0x654b3a,
      3,
    );
    p.line(
      [
        [-5, 132],
        [-4, 67],
        [-20, 29],
        [-24, -5],
      ],
      0xc49663,
      3,
    );
    p.line(
      [
        [6, 71],
        [19, 36],
        [24, -3],
      ],
      0xc49663,
      2,
    );
    p.ellipse(-2, 98, 4, 7, 0x946442, 0x7b553b, 1);
    p.line(
      [
        [-11, 125],
        [11, 122],
      ],
      0x7b553b,
      1.1,
    );
    // Two wraps attach the elastic to the fork.
    p.roundRect(16, -8, 20, 10, 3, 0xd1b18a, 0x987757, 1);
    p.line(
      [
        [17, -5],
        [34, -5],
      ],
      0xe6c69a,
      1,
    );
    g.lineStyle(8, 0x6d4a45).lineBetween(x + 25, y - 3, aim.x, aim.y + 4);
    g.lineStyle(3, 0x9d6c59).lineBetween(x + 25, y - 5, aim.x, aim.y + 2);
  } else {
    g.lineStyle(8, 0x704b43).lineBetween(x - 25, y - 4, aim.x, aim.y + 7);
    g.lineStyle(2, 0xb17c60).lineBetween(x - 25, y - 6, aim.x, aim.y + 5);
    const p = new Pen(g, x, y);
    p.roundRect(-36, -11, 21, 11, 3, 0xd1b18a, 0x987757, 1.3);
    p.line(
      [
        [-34, -7],
        [-16, -7],
      ],
      0xe7c99c,
      1,
    );
    // Pouch lies under the loaded character and travels with the pull.
    const q = new Pen(g, aim.x, aim.y);
    q.line(
      [
        [-11, 14],
        [-5, 20],
        [5, 20],
        [12, 14],
      ],
      0x6d4940,
      5,
    );
  }
}
