import type Phaser from 'phaser';
import type { BlockDef, StuffieKind, TerrainDef, PropDef, ZoneDef, MechanismDef } from './types';
import { getTheme } from '../content/themes';

type G = Phaser.GameObjects.Graphics;
type Point = { x: number; y: number };
const INK = 0x242139;
const CREAM = 0xfff2ce;
const TAU = Math.PI * 2;

/** One coherent vector asset pipeline: all local geometry follows the same body
 * transform. Stroke weight scales with the character, including menu/title sizes. */
class Pen {
  constructor(
    public g: G,
    public x = 0,
    public y = 0,
    public angle = 0,
    public sx = 1,
    public sy = 1,
    public opacity = 1,
  ) {}
  point(x: number, y: number): Point {
    const c = Math.cos(this.angle),
      s = Math.sin(this.angle);
    return {
      x: this.x + x * this.sx * c - y * this.sy * s,
      y: this.y + x * this.sx * s + y * this.sy * c,
    };
  }
  get weight() {
    return Math.sqrt(Math.abs(this.sx * this.sy));
  }
  polygon(points: number[][], color: number, stroke?: number, width = 1.5, alpha = 1) {
    const p = points.map(([x, y]) => this.point(x, y));
    this.g.fillStyle(color, alpha * this.opacity).fillPoints(p, true);
    if (stroke !== undefined)
      this.g.lineStyle(width * this.weight, stroke, alpha * this.opacity).strokePoints(p, true);
  }
  line(points: number[][], color: number, width = 1.5, alpha = 1) {
    this.g.lineStyle(width * this.weight, color, alpha * this.opacity).strokePoints(
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
    const p: number[][] = [];
    for (let i = 0; i < 20; i++) {
      const a = (i * TAU) / 20;
      p.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
    }
    this.polygon(p, color, stroke, width, alpha);
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
    for (const [cx, cy, start] of [
      [x + w - r, y + r, -Math.PI / 2],
      [x + w - r, y + h - r, 0],
      [x + r, y + h - r, Math.PI / 2],
      [x + r, y + r, Math.PI],
    ])
      for (let i = 0; i <= 3; i++) {
        const a = start + (i * Math.PI) / 6;
        points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    this.polygon(points, color, stroke, width, alpha);
  }
}

function graphicTree(
  g: G,
  x: number,
  y: number,
  size: number,
  color: number,
  trunk: number,
  highlight: number,
  lean = 0,
) {
  const p = new Pen(g, x, y, lean, size, size);
  p.polygon(
    [
      [-6, 0],
      [-4, -108],
      [4, -112],
      [8, 0],
    ],
    trunk,
  );
  p.line(
    [
      [1, -43],
      [-22, -68],
    ],
    trunk,
    5,
  );
  p.polygon(
    [
      [-38, -53],
      [-14, -82],
      [-36, -77],
      [-8, -113],
      [-22, -108],
      [6, -158],
      [24, -112],
      [12, -115],
      [38, -74],
      [17, -80],
      [42, -47],
    ],
    color,
  );
  p.polygon(
    [
      [6, -158],
      [12, -112],
      [3, -118],
      [-6, -83],
      [-18, -83],
    ],
    highlight,
    undefined,
    1,
    0.45,
  );
}

/** Bold geometric countryside. Decorative silhouettes avoid the central target
 * area and have no gameplay ink outline. The scene caches this by world ID. */
export function drawBackground(g: G, time: number, theme = 'countryside', sceneryOnly = false): void {
  if (drawThemedScenery(g,time,theme,sceneryOnly)) return;
  const p = new Pen(g),
    c = getTheme(theme).palette;
  g.fillStyle(c.skyBottom).fillRect(0, 0, 1440, 810);
  for (let i = 0; i < 20; i++) {
    const t = i / 19,
      blend = (shift: number) =>
        Math.round(((c.skyTop >> shift) & 255) * (1 - t) + ((c.skyBottom >> shift) & 255) * t);
    g.fillStyle((blend(16) << 16) | (blend(8) << 8) | blend(0)).fillRect(0, i * 31, 1440, 32);
  }
  // A large graphic sun and cut-paper rays establish a bright, mischievous day.
  const sun = new Pen(g, 1168, 172);
  sun.polygon(
    [
      [0, -92],
      [25, -49],
      [66, -66],
      [49, -23],
      [93, 0],
      [51, 23],
      [68, 67],
      [25, 51],
      [0, 94],
      [-24, 50],
      [-66, 67],
      [-50, 24],
      [-94, 0],
      [-50, -24],
      [-67, -65],
      [-24, -50],
    ],
    c.sun.halo,
  );
  sun.ellipse(0, 0, 57, 57, c.sun.glow);
  sun.ellipse(-7, -8, 43, 43, c.sun.center);
  const drift = Math.sin(time / 90000) * 12;
  const cloud = (x: number, y: number, s: number) => {
    const q = new Pen(g, x, y, 0, s, s);
    q.polygon(
      [
        [-81, 10],
        [-57, -4],
        [-37, -3],
        [-20, -24],
        [3, -24],
        [23, -6],
        [49, -12],
        [79, 10],
        [40, 14],
        [-16, 13],
      ],
      c.clouds,
      undefined,
      1,
      0.85,
    );
    q.line(
      [
        [-28, 2],
        [12, 2],
        [23, 9],
      ],
      c.skyBottom,
      2,
      0.6,
    );
  };
  cloud(157 + drift, 132, 0.95);
  cloud(648 + drift * 0.7, 178, 1.2);
  cloud(979 + drift * 0.4, 80, 0.55);
  cloud(1388 + drift, 278, 0.8);
  // Exaggerated angular peaks occupy the edges. Pale facets keep active bodies legible.
  p.polygon(
    [
      [0, 486],
      [80, 352],
      [158, 416],
      [261, 241],
      [414, 459],
      [566, 361],
      [768, 544],
      [0, 630],
    ],
    c.hills[0],
  );
  p.polygon(
    [
      [261, 241],
      [287, 390],
      [331, 365],
      [414, 459],
      [350, 401],
    ],
    c.hills[1],
  );
  p.polygon(
    [
      [1440, 343],
      [1339, 279],
      [1230, 403],
      [1124, 330],
      [958, 510],
      [1440, 617],
    ],
    c.hills[1],
  );
  p.polygon(
    [
      [1339, 279],
      [1358, 420],
      [1392, 392],
      [1440, 470],
      [1440, 343],
    ],
    c.hills[0],
  );
  p.polygon(
    [
      [0, 566],
      [188, 477],
      [358, 519],
      [513, 440],
      [693, 533],
      [934, 476],
      [1116, 539],
      [1320, 454],
      [1440, 527],
      [1440, 675],
      [0, 675],
    ],
    c.hills[2],
  );
  p.polygon(
    [
      [0, 615],
      [249, 557],
      [478, 607],
      [723, 552],
      [957, 598],
      [1204, 552],
      [1440, 608],
      [1440, 675],
      [0, 675],
    ],
    c.hills[3],
  );
  p.polygon(
    [
      [0, 588],
      [178, 583],
      [464, 675],
      [335, 675],
      [142, 609],
      [0, 608],
    ],
    c.path,
  );
  // Quiet, small landmark. It never shares the heavy outlines of a physics object.
  const mill = new Pen(g, 499, 482, -0.03);
  mill.polygon(
    [
      [-14, 46],
      [-7, -13],
      [9, -13],
      [18, 46],
    ],
    c.landmark.body,
  );
  mill.polygon(
    [
      [-15, -13],
      [1, -31],
      [17, -13],
    ],
    c.landmark.roof,
  );
  for (let i = 0; i < 4; i++) {
    const blade = new Pen(g, 500, 467, (i * Math.PI) / 2 + time / 35000);
    blade.polygon(
      [
        [0, 0],
        [3, -32],
        [12, -32],
        [7, -8],
      ],
      c.landmark.blades,
    );
  }
  g.fillStyle(c.landmark.hub).fillCircle(500, 467, 3);
  graphicTree(g, 66, 625, 1.17, c.foliage[0], c.trunk, c.leafHighlight, -0.04);
  graphicTree(g, 1388, 632, 1.24, c.foliage[1], c.trunk, c.leafHighlight, 0.07);
  graphicTree(g, 1312, 596, 0.53, c.foliage[2], c.trunk, c.leafHighlight, -0.13);
  p.polygon(
    [
      [0, 647],
      [126, 620],
      [291, 638],
      [431, 612],
      [631, 644],
      [832, 618],
      [1035, 644],
      [1254, 615],
      [1440, 639],
      [1440, 675],
      [0, 675],
    ],
    c.meadow[0],
  );
  p.polygon(
    [
      [0, 665],
      [214, 650],
      [415, 660],
      [626, 642],
      [881, 662],
      [1131, 646],
      [1440, 659],
      [1440, 678],
      [0, 678],
    ],
    c.meadow[1],
  );
  if (!sceneryOnly) drawWorldGround(g,{width:1440,height:810,ground:675},theme);
  else g.fillStyle(c.meadow[1]).fillRect(0,674,1440,136);
}

export interface StuffieExpression {
  alpha?: number;
  stretch?: number;
  evil?: boolean;
  blink?: boolean;
  celebrate?: boolean;
  impact?: boolean;
}
function patch(p: Pen, x: number, y: number, w: number, h: number, color: number) {
  p.polygon(
    [
      [x - w / 2, y - h / 2],
      [x + w / 2 - 1, y - h / 2 - 1],
      [x + w / 2, y + h / 2],
      [x - w / 2 + 1, y + h / 2 + 1],
    ],
    color,
    INK,
    1.1,
  );
  for (const side of [-1, 1]) {
    p.line(
      [
        [x + side * w * 0.5 - 1.3, y - 2],
        [x + side * w * 0.5 + 1.3, y - 1],
      ],
      INK,
      0.85,
    );
    p.line(
      [
        [x + side * w * 0.5 - 1.3, y + 2],
        [x + side * w * 0.5 + 1.3, y + 3],
      ],
      INK,
      0.85,
    );
  }
}
function eyes(p: Pen, y: number, spread: number, state: StuffieExpression, white = CREAM) {
  if (state.impact) {
    for (const side of [-1, 1]) {
      const x = side * spread;
      p.line(
        [
          [x - 3, y - 3],
          [x + 3, y + 3],
        ],
        INK,
        2.3,
      );
      p.line(
        [
          [x + 3, y - 3],
          [x - 3, y + 3],
        ],
        INK,
        2.3,
      );
    }
    return;
  }
  if (state.blink || state.celebrate) {
    for (const side of [-1, 1]) {
      const x = side * spread;
      p.line(
        [
          [x - 3.5, y + 1],
          [x, y - 2],
          [x + 3.5, y + 1],
        ],
        INK,
        2.1,
      );
    }
    return;
  }
  if (state.evil) {
    p.polygon(
      [
        [-spread - 4, y - 4],
        [-spread + 4, y - 1],
        [-spread + 2, y + 3],
        [-spread - 3, y + 2],
      ],
      0xff3459,
      INK,
      1,
    );
    p.polygon(
      [
        [spread - 4, y - 1],
        [spread + 4, y - 4],
        [spread + 3, y + 2],
        [spread - 2, y + 3],
      ],
      0xff3459,
      INK,
      1,
    );
    p.line(
      [
        [-spread - 5, y - 7],
        [-spread + 4, y - 3],
      ],
      INK,
      2.7,
    );
    p.line(
      [
        [spread - 4, y - 3],
        [spread + 5, y - 7],
      ],
      INK,
      2.7,
    );
    return;
  }
  p.ellipse(-spread, y, 5.8, 7.2, white, INK, 1.4);
  p.ellipse(spread, y - 0.3, 5.1, 6.4, white, INK, 1.4);
  p.ellipse(-spread + 1.3, y + 0.6, 2.4, 3.7, INK);
  p.ellipse(spread + 1.1, y + 0.4, 2.3, 3.3, INK);
  p.ellipse(-spread + 2, y - 0.8, 0.8, 1.2, 0xffffff);
  p.ellipse(spread + 1.7, y - 1, 0.7, 1.1, 0xffffff);
}
function evilFace(p: Pen) {
  p.polygon(
    [
      [-18, -16],
      [-20, -31],
      [-10, -22],
    ],
    0xff3459,
    INK,
    1.5,
  );
  p.polygon(
    [
      [10, -22],
      [20, -31],
      [18, -16],
    ],
    0xff3459,
    INK,
    1.5,
  );
  p.polygon(
    [
      [-10, 9],
      [0, 12],
      [11, 7],
      [7, 16],
      [-5, 18],
    ],
    INK,
  );
  p.polygon(
    [
      [-6, 11],
      [-1, 12],
      [-3, 15],
    ],
    CREAM,
  );
  p.polygon(
    [
      [3, 11],
      [8, 9],
      [6, 14],
    ],
    CREAM,
  );
}

/** Four original cloth-toy silhouettes share bold ink, fabric patches and seams. */
export function drawStuffie(
  g: G,
  x: number,
  y: number,
  r: number,
  kind: StuffieKind,
  angle: number,
  state: StuffieExpression = {},
): void {
  const stretch = Math.max(-0.4, Math.min(0.65, state.stretch || 0)),
    scale = r / 24;
  const p = new Pen(g, x, y, angle, scale * (1 + stretch), scale / (1 + stretch * 0.8));
  p.opacity = Math.max(0, Math.min(1, state.alpha ?? 1));
  if (kind === 'sheep') {
    p.polygon(
      [
        [-16, 16],
        [-8, 17],
        [-8, 26],
        [-15, 25],
      ],
      0x39344c,
      INK,
      2.2,
    );
    p.polygon(
      [
        [7, 17],
        [15, 16],
        [16, 25],
        [8, 26],
      ],
      0x39344c,
      INK,
      2.2,
    );
    p.polygon(
      [
        [-23, -5],
        [-27, -13],
        [-19, -17],
        [-18, -24],
        [-8, -24],
        [-2, -28],
        [7, -24],
        [17, -25],
        [20, -16],
        [27, -11],
        [24, -3],
        [27, 7],
        [20, 13],
        [16, 23],
        [6, 23],
        [0, 27],
        [-9, 23],
        [-19, 23],
        [-21, 14],
        [-28, 8],
      ],
      CREAM,
      INK,
      2.8,
    );
    p.polygon(
      [
        [-24, 7],
        [-17, 11],
        [-14, 20],
        [-5, 20],
        [1, 24],
        [8, 21],
        [16, 21],
        [21, 13],
        [18, 23],
        [6, 23],
        [0, 27],
        [-9, 23],
        [-19, 23],
        [-21, 14],
      ],
      0xe6d6ad,
    );
    p.polygon(
      [
        [-17, -6],
        [-28, -9],
        [-26, 0],
        [-17, 4],
      ],
      0x39344c,
      INK,
      2,
    );
    p.polygon(
      [
        [17, -6],
        [27, -10],
        [27, -1],
        [17, 5],
      ],
      0x39344c,
      INK,
      2,
    );
    p.polygon(
      [
        [-14, -9],
        [-5, -14],
        [10, -12],
        [16, -5],
        [14, 14],
        [5, 20],
        [-7, 18],
        [-14, 9],
      ],
      0x39344c,
      INK,
      2.3,
    );
    p.polygon(
      [
        [-15, -12],
        [-10, -18],
        [-4, -14],
        [2, -20],
        [8, -15],
        [15, -17],
        [15, -10],
        [4, -8],
        [-3, -9],
      ],
      CREAM,
      INK,
      1.8,
    );
    eyes(p, 0, 6.3, state);
    p.ellipse(-11, 9, 2.8, 1.6, 0xff8a87);
    p.ellipse(11, 9, 2.8, 1.6, 0xff8a87);
    p.polygon(
      [
        [-3, 8],
        [3, 8],
        [0, 11],
      ],
      0x1b172e,
    );
    p.line(
      [
        [0, 11],
        [0, 14],
        [-4, 15],
      ],
      0x1b172e,
      1.4,
    );
    p.line(
      [
        [0, 14],
        [4, 15],
      ],
      0x1b172e,
      1.4,
    );
    patch(p, 18, 10, 8, 10, 0xff765c);
    p.line(
      [
        [-19, -10],
        [-17, -5],
        [-21, -1],
      ],
      0xc7b587,
      1,
    );
  } else if (kind === 'duck') {
    p.polygon(
      [
        [-15, 17],
        [-5, 18],
        [-7, 25],
        [-20, 24],
      ],
      0xff8b3d,
      INK,
      2,
    );
    p.polygon(
      [
        [5, 18],
        [14, 17],
        [21, 23],
        [7, 25],
      ],
      0xff8b3d,
      INK,
      2,
    );
    p.polygon(
      [
        [-12, -18],
        [-15, -31],
        [-6, -25],
        [-1, -33],
        [6, -24],
        [13, -24],
        [16, -16],
      ],
      0xffd44e,
      INK,
      2.4,
    );
    p.polygon(
      [
        [-22, -9],
        [-12, -22],
        [9, -22],
        [22, -12],
        [24, 7],
        [15, 21],
        [-4, 24],
        [-20, 15],
        [-25, 2],
      ],
      0xffd44e,
      INK,
      2.8,
    );
    p.polygon(
      [
        [-22, 5],
        [-12, 15],
        [9, 20],
        [20, 12],
        [15, 21],
        [-4, 24],
        [-20, 15],
      ],
      0xe5a839,
    );
    p.polygon(
      [
        [-20, 0],
        [-12, 6],
        [-13, 15],
        [-20, 11],
      ],
      0xf1b638,
      INK,
      1.8,
    );
    eyes(p, -6, 7.2, state);
    p.ellipse(-15, 3, 2.6, 1.4, 0xff9976);
    p.ellipse(15, 3, 2.6, 1.4, 0xff9976);
    p.polygon(
      [
        [-6, 4],
        [11, 2],
        [22, 8],
        [11, 13],
        [-5, 11],
      ],
      0xff8b3d,
      INK,
      2.1,
    );
    p.line(
      [
        [-4, 8],
        [11, 8],
        [19, 8],
      ],
      INK,
      1.3,
    );
    p.ellipse(5, 5, 1, 0.7, INK);
    p.ellipse(10, 5, 1, 0.7, INK);
    patch(p, -9, 15, 9, 8, 0x4497ef);
    p.line(
      [
        [8, 18],
        [12, 16],
        [15, 19],
      ],
      0x9b772f,
      1,
    );
  } else if (kind === 'bear') {
    p.polygon(
      [
        [-23, -12],
        [-27, -23],
        [-20, -29],
        [-10, -25],
        [-8, -16],
      ],
      0xdf9253,
      INK,
      2.5,
    );
    p.polygon(
      [
        [10, -23],
        [21, -29],
        [29, -23],
        [26, -13],
        [17, -12],
      ],
      0xdf9253,
      INK,
      2.5,
    );
    p.polygon(
      [
        [-21, -23],
        [-17, -25],
        [-12, -21],
        [-16, -16],
      ],
      0xffdda4,
    );
    p.polygon(
      [
        [17, -23],
        [22, -25],
        [25, -21],
        [21, -16],
      ],
      0xffdda4,
    );
    p.polygon(
      [
        [-14, 16],
        [-5, 18],
        [-5, 26],
        [-17, 25],
        [-21, 20],
      ],
      0xc77b42,
      INK,
      2.1,
    );
    p.polygon(
      [
        [6, 18],
        [16, 16],
        [22, 21],
        [17, 26],
        [6, 26],
      ],
      0xc77b42,
      INK,
      2.1,
    );
    p.polygon(
      [
        [-22, -10],
        [-12, -23],
        [10, -24],
        [22, -13],
        [25, 8],
        [14, 23],
        [-10, 24],
        [-23, 12],
      ],
      0xdf9253,
      INK,
      2.8,
    );
    p.polygon(
      [
        [-22, 4],
        [-12, 15],
        [8, 19],
        [22, 10],
        [14, 23],
        [-10, 24],
        [-23, 12],
      ],
      0xc87b46,
    );
    p.polygon(
      [
        [-23, -1],
        [-16, 2],
        [-18, 12],
        [-24, 10],
      ],
      0xd0844a,
      INK,
      1.8,
    );
    p.polygon(
      [
        [20, -1],
        [26, 3],
        [23, 14],
        [17, 10],
      ],
      0xd0844a,
      INK,
      1.8,
    );
    p.polygon(
      [
        [-13, 1],
        [-3, -2],
        [11, 1],
        [15, 8],
        [10, 16],
        [-8, 17],
        [-15, 10],
      ],
      0xffdda4,
      INK,
      1.8,
    );
    eyes(p, -7, 8.2, state);
    p.polygon(
      [
        [-5, 4],
        [4, 3],
        [6, 6],
        [0, 10],
        [-5, 8],
      ],
      INK,
    );
    p.line(
      [
        [0, 9],
        [0, 13],
        [-5, 14],
      ],
      INK,
      1.5,
    );
    p.line(
      [
        [0, 13],
        [5, 13],
      ],
      INK,
      1.5,
    );
    patch(p, -13, 14, 8, 10, 0x27c5bd);
    p.line(
      [
        [1, -23],
        [1, -16],
      ],
      0x975838,
      1.3,
    );
    p.line(
      [
        [-2, -20],
        [4, -20],
      ],
      INK,
      1.2,
    );
  } else {
    p.polygon(
      [
        [-17, -11],
        [-25, -35],
        [-23, -49],
        [-15, -53],
        [-9, -42],
        [-7, -14],
      ],
      0xc29aee,
      INK,
      2.6,
    );
    p.polygon(
      [
        [-17, -24],
        [-21, -39],
        [-18, -45],
        [-14, -38],
        [-12, -22],
      ],
      0xf98db4,
    );
    p.polygon(
      [
        [5, -17],
        [7, -45],
        [16, -52],
        [25, -43],
        [26, -31],
        [19, -26],
        [17, -12],
      ],
      0xc29aee,
      INK,
      2.6,
    );
    p.polygon(
      [
        [11, -25],
        [12, -42],
        [16, -45],
        [21, -39],
        [21, -33],
        [16, -29],
      ],
      0xf98db4,
    );
    p.polygon(
      [
        [-14, 17],
        [-5, 18],
        [-5, 25],
        [-19, 25],
        [-21, 21],
      ],
      0xae81d8,
      INK,
      2,
    );
    p.polygon(
      [
        [5, 18],
        [14, 17],
        [21, 22],
        [18, 26],
        [5, 25],
      ],
      0xae81d8,
      INK,
      2,
    );
    p.polygon(
      [
        [-22, -10],
        [-11, -23],
        [11, -23],
        [22, -10],
        [24, 9],
        [13, 23],
        [-10, 24],
        [-23, 12],
      ],
      0xc29aee,
      INK,
      2.8,
    );
    p.polygon(
      [
        [-22, 7],
        [-11, 15],
        [9, 19],
        [23, 10],
        [13, 23],
        [-10, 24],
        [-23, 12],
      ],
      0xa77ad4,
    );
    p.polygon(
      [
        [-11, 3],
        [0, 0],
        [13, 4],
        [15, 12],
        [7, 18],
        [-8, 17],
        [-15, 11],
      ],
      0xf4d7f0,
      INK,
      1.5,
    );
    eyes(p, -6, 7.4, state);
    p.ellipse(-14, 4, 3, 1.5, 0xee76a8);
    p.ellipse(14, 4, 3, 1.5, 0xee76a8);
    p.polygon(
      [
        [-3, 4],
        [3, 4],
        [0, 8],
      ],
      0xb64682,
      INK,
      1,
    );
    p.line(
      [
        [0, 8],
        [0, 12],
        [-4, 13],
      ],
      INK,
      1.3,
    );
    p.line(
      [
        [0, 12],
        [4, 13],
      ],
      INK,
      1.3,
    );
    p.line(
      [
        [-21, 5],
        [-16, 7],
      ],
      INK,
      1,
    );
    p.line(
      [
        [16, 7],
        [22, 4],
      ],
      INK,
      1,
    );
    patch(p, -14, 13, 8, 9, 0xf98db4);
  }
  if (state.evil) evilFace(p);
}

export interface MonsterReaction {
  falling?: boolean;
  hit?: boolean;
  healthRatio?: number;
  defeated?: boolean;
}
/** The main silhouette remains within the physics radius. Horn tips are decorative;
 * all posing, facial reactions and tumble rotate around the true rigid-body center. */
export function drawMonster(
  g: G,
  x: number,
  y: number,
  r: number,
  kind = 'horn',
  angle = 0,
  nervous = false,
  reaction: MonsterReaction = {},
): void {
  const p = new Pen(g, x, y, angle, r / 24, r / 24),
    falling = !!reaction.falling,
    hurt = !!reaction.hit;
  const color = kind === 'blob' ? 0xbdea46 : kind === 'bat' ? 0xff765c : 0xb08be8;
  const shade = kind === 'blob' ? 0x85bb3c : kind === 'bat' ? 0xd95050 : 0x835bbc;
  if (kind === 'horn') {
    p.polygon(
      [
        [-18, -10],
        [-24, -29],
        [-12, -24],
        [-8, -15],
      ],
      CREAM,
      INK,
      2.3,
    );
    p.polygon(
      [
        [7, -16],
        [14, -29],
        [21, -31],
        [22, -13],
      ],
      CREAM,
      INK,
      2.3,
    );
    p.polygon(
      [
        [-23, -5],
        [-14, -20],
        [8, -23],
        [22, -10],
        [23, 8],
        [13, 20],
        [-9, 23],
        [-22, 11],
      ],
      color,
      INK,
      2.7,
    );
  } else if (kind === 'blob') {
    p.polygon(
      [
        [-18, -13],
        [-19, -30],
        [-9, -24],
        [-6, -16],
      ],
      0x8bbe3b,
      INK,
      2.1,
    );
    p.polygon(
      [
        [3, -17],
        [6, -30],
        [12, -23],
        [17, -26],
        [17, -12],
      ],
      0x8bbe3b,
      INK,
      2.1,
    );
    p.polygon(
      [
        [-22, -8],
        [-11, -22],
        [8, -23],
        [23, -7],
        [20, 12],
        [7, 23],
        [-13, 20],
        [-24, 4],
      ],
      color,
      INK,
      2.7,
    );
  } else {
    p.polygon(
      [
        [-17, -7],
        [-28, -23],
        [-8, -19],
      ],
      color,
      INK,
      2.2,
    );
    p.polygon(
      [
        [7, -18],
        [28, -25],
        [20, -4],
      ],
      color,
      INK,
      2.2,
    );
    p.polygon(
      [
        [-23, -5],
        [-12, -21],
        [11, -22],
        [23, -6],
        [20, 14],
        [7, 23],
        [-15, 18],
      ],
      color,
      INK,
      2.7,
    );
  }
  p.polygon(
    [
      [-22, 6],
      [-8, 14],
      [9, 16],
      [21, 8],
      [16, 17],
      [7, 23],
      [-13, 20],
    ],
    shade,
  );
  // The eyes are deliberately unequal: expressive, original silhouettes at tiny sizes.
  if (reaction.defeated) {
    for (const side of [-1, 1]) {
      const xx = side * 8;
      p.line(
        [
          [xx - 4, -8],
          [xx + 4, 0],
        ],
        INK,
        2.5,
      );
      p.line(
        [
          [xx + 4, -8],
          [xx - 4, 0],
        ],
        INK,
        2.5,
      );
    }
  } else if (hurt) {
    p.line(
      [
        [-15, -5],
        [-8, -9],
        [-3, -4],
      ],
      INK,
      2.6,
    );
    p.line(
      [
        [2, -5],
        [9, -9],
        [15, -4],
      ],
      INK,
      2.6,
    );
  } else {
    p.polygon(
      [
        [-17, -10],
        [-8, -13],
        [-1, -8],
        [-2, 3],
        [-11, 5],
        [-17, 0],
      ],
      CREAM,
      INK,
      1.7,
    );
    p.polygon(
      [
        [2, -9],
        [12, -13],
        [18, -8],
        [16, 2],
        [6, 4],
        [2, 0],
      ],
      CREAM,
      INK,
      1.7,
    );
    const ey = falling ? -3 : nervous ? 0 : -1;
    p.ellipse(-8, ey, 2.7, falling ? 4.1 : 3.4, INK);
    p.ellipse(9, ey - 0.5, 2.5, falling ? 3.9 : 3.1, INK);
    p.ellipse(-7.3, ey - 1, 0.7, 1, 0xffffff);
    p.ellipse(9.7, ey - 1.4, 0.7, 1, 0xffffff);
    if (nervous || falling) {
      p.line(
        [
          [-17, -15],
          [-8, -17],
        ],
        INK,
        2.2,
      );
      p.line(
        [
          [7, -17],
          [17, -15],
        ],
        INK,
        2.2,
      );
    } else {
      p.line(
        [
          [-18, -15],
          [-2, -10],
        ],
        INK,
        2.8,
      );
      p.line(
        [
          [3, -11],
          [18, -15],
        ],
        INK,
        2.8,
      );
    }
  }
  if (falling || hurt || reaction.defeated) {
    p.polygon(
      [
        [-8, 8],
        [-3, 5],
        [6, 6],
        [10, 12],
        [5, 18],
        [-5, 17],
      ],
      INK,
    );
    p.polygon(
      [
        [-5, 7],
        [-1, 7],
        [-3, 11],
      ],
      CREAM,
    );
    p.polygon(
      [
        [3, 7],
        [7, 9],
        [3, 11],
      ],
      CREAM,
    );
  } else {
    p.polygon(
      [
        [-11, 7],
        [-2, 11],
        [12, 5],
        [7, 15],
        [-5, 17],
      ],
      INK,
    );
    p.polygon(
      [
        [-8, 9],
        [-3, 11],
        [-6, 14],
      ],
      CREAM,
    );
    p.polygon(
      [
        [3, 10],
        [8, 8],
        [6, 13],
      ],
      CREAM,
    );
  }
  if ((reaction.healthRatio ?? 1) < 0.55) {
    p.polygon(
      [
        [12, 6],
        [19, 4],
        [22, 9],
        [16, 12],
      ],
      0x77538e,
      undefined,
      1,
      0.75,
    );
    p.line(
      [
        [14, 7],
        [19, 9],
      ],
      CREAM,
      1.1,
    );
  } else {
    p.ellipse(-17, 8, 2.5, 1.4, shade);
    p.ellipse(17, 6, 2.3, 1.3, shade);
  }
}

function beveled(p: Pen, w: number, h: number, color: number, outline = INK, width = 2.4) {
  const x = w / 2,
    y = h / 2,
    b = Math.min(3, w * 0.12, h * 0.12);
  p.polygon(
    [
      [-x + b, -y],
      [x - b, -y],
      [x, -y + b],
      [x, y - b],
      [x - b, y],
      [-x + b, y],
      [-x, y - b],
      [-x, -y + b],
    ],
    color,
    outline,
    width,
  );
}
export function drawBlock(g: G, def: BlockDef, healthRatio = 1): void {
  const p = new Pen(g, def.x, def.y, def.angle || 0),
    { w, h, material } = def,
    x = w / 2,
    y = h / 2;
  const edge = Math.min(2.6, Math.min(w, h) * 0.14 + 0.8);
  if (material === 'wood') {
    beveled(p, w, h, 0xe7a04c, INK, edge);
    p.polygon(
      [
        [-x + 2, y - Math.min(6, h * 0.25)],
        [x - 2, y - Math.min(6, h * 0.25)],
        [x - 2, y - 2],
        [-x + 2, y - 2],
      ],
      0xbe733d,
    );
    p.line(
      [
        [-x + 4, -y + 3],
        [x - 4, -y + 3],
      ],
      0xffd274,
      1.5,
    );
    if (w >= h) {
      for (let i = 0; i < Math.min(3, Math.floor(h / 7)); i++) {
        const yy = -y + 8 + i * 7;
        p.line(
          [
            [-x + 7, yy],
            [-w * 0.18, yy - 1],
            [w * 0.2, yy + 1],
            [x - 7, yy],
          ],
          0x9b5438,
          1.1,
        );
      }
      if (w > 55) p.ellipse(w * 0.17, -1, 7, Math.min(3, h * 0.14), 0xc87a3c, 0x9b5438, 1);
    } else {
      for (let i = 0; i < Math.min(3, Math.floor(w / 6)); i++) {
        const xx = -x + 7 + i * 6;
        p.line(
          [
            [xx, -y + 7],
            [xx - 1, 0],
            [xx + 1, y - 7],
          ],
          0x9b5438,
          1.1,
        );
      }
      if (h > 55) p.ellipse(0, h * 0.13, Math.min(3, w * 0.14), 7, 0xc87a3c, 0x9b5438, 1);
    }
    for (const [xx, yy] of [
      [-x + 5, -y + 5],
      [x - 5, y - 5],
    ]) {
      p.ellipse(xx, yy, 1.8, 1.8, INK);
      p.line(
        [
          [xx - 1, yy],
          [xx + 1, yy],
        ],
        0xffd274,
        0.7,
      );
    }
  } else if (material === 'glass') {
    beveled(p, w, h, 0x5dd7e3, INK, edge);
    p.polygon(
      [
        [-x + 2, -y + 2],
        [-x + w * 0.45, -y + 2],
        [-x + w * 0.24, y - 2],
        [-x + 2, y - 2],
      ],
      0xc8fff0,
      undefined,
      1,
      0.65,
    );
    p.polygon(
      [
        [x - w * 0.3, -y + 2],
        [x - 2, -y + 2],
        [x - 2, y - 2],
        [x - w * 0.53, y - 2],
      ],
      0x29a9c6,
      undefined,
      1,
      0.7,
    );
    p.line(
      [
        [-x + 4, y - 4],
        [-x + 4, -y + 4],
        [x - 4, -y + 4],
      ],
      0xeaffec,
      1.8,
    );
    if (w > 50)
      p.line(
        [
          [-w * 0.1, -y + 4],
          [w * 0.08, y - 4],
        ],
        0xe8fff2,
        2,
      );
  } else if (material === 'ice') {
    beveled(p,w,h,0xa6eff8,0x315b90,edge);
    p.polygon([[-x+2,-y+2],[-w*.05,-y+2],[-w*.27,y-2],[-x+2,y-2]],0xe5ffff);
    p.polygon([[w*.1,-y+2],[x-2,-y+2],[x-2,y-2],[-w*.1,y-2]],0x78cde7);
    p.line([[-x+4,-y+4],[x-4,-y+4]],0xf7ffff,2);
    p.line([[-w*.16,-y],[-w*.04,-h*.05],[w*.1,h*.05],[w*.2,y]],0x599fd0,1.2);
    p.line([[-w*.04,-h*.05],[-w*.32,h*.13]],0xf3ffff,1.3);
    if(w>35&&h>12){p.line([[w*.26,-h*.24],[w*.26,h*.2]],0xeaffff,1);p.line([[w*.2,-h*.1],[w*.32,h*.06]],0xeaffff,1);}
  } else if (material === 'metal') {
    beveled(p,w,h,0x839aab,INK,edge);
    p.polygon([[-x+2,-y+2],[x-2,-y+2],[x-2,-y+Math.min(6,h*.25)],[-x+2,-y+Math.min(6,h*.25)]],0xd1e4e5);
    p.polygon([[-x+2,y-Math.min(6,h*.25)],[x-2,y-Math.min(6,h*.25)],[x-2,y-2],[-x+2,y-2]],0x4e647e);
    for(const[xx,yy]of[[-x+5,-y+5],[x-5,y-5]]){p.ellipse(xx,yy,2.7,2.7,INK);p.ellipse(xx-.5,yy-.5,1.2,1.2,0xc8dfdf);}
    if(w>h){p.line([[-x+12,0],[x-12,0]],0x60778e,1.5);p.line([[-x+12,-2],[x-12,-2]],0xabc2ca,.8);}
    else{p.line([[0,-y+12],[0,y-12]],0x60778e,1.5);p.line([[-2,-y+12],[-2,y-12]],0xabc2ca,.8);}
  } else {
    beveled(p, w, h, 0xa29ab9, INK, edge);
    p.polygon(
      [
        [-x + 2, y - Math.min(8, h * 0.3)],
        [x - 2, y - Math.min(5, h * 0.2)],
        [x - 2, y - 2],
        [-x + 2, y - 2],
      ],
      0x78718f,
    );
    p.line(
      [
        [-x + 4, -y + 4],
        [x - 4, -y + 4],
      ],
      0xd0c8df,
      1.6,
    );
    if (w >= h)
      for (let i = 1; i < w / 43; i++)
        p.line(
          [
            [-x + i * 43, -y + 2],
            [-x + i * 43 - 3, y - 2],
          ],
          0x69617c,
          1.5,
        );
    else
      for (let i = 1; i < h / 37; i++)
        p.line(
          [
            [-x + 2, -y + i * 37],
            [x - 2, -y + i * 37 + 2],
          ],
          0x69617c,
          1.5,
        );
    p.polygon(
      [
        [-w * 0.2, -h * 0.07],
        [-w * 0.12, -h * 0.15],
        [-w * 0.08, h * 0.03],
        [-w * 0.19, h * 0.08],
      ],
      0x867d9e,
    );
  }
  if (healthRatio < 0.76) {
    const crack = material === 'glass' ? 0x146a8d : INK;
    p.line(
      [
        [-w * 0.18, -y + 1],
        [-w * 0.05, -h * 0.15],
        [-w * 0.13, h * 0.04],
        [w * 0.12, h * 0.22],
      ],
      crack,
      1.6,
    );
    if (healthRatio < 0.4) {
      p.line(
        [
          [-w * 0.05, -h * 0.15],
          [w * 0.23, -h * 0.02],
          [x - 1, -h * 0.14],
        ],
        crack,
        1.6,
      );
      p.line(
        [
          [-w * 0.13, h * 0.04],
          [-w * 0.26, y - 1],
        ],
        crack,
        1.5,
      );
    }
  }
  if (def.static)
    for (const xx of [-x + 6, x - 6]) {
      p.ellipse(xx, -y + 6, 2.4, 2.4, INK);
      p.ellipse(xx - 0.5, -y + 5.5, 0.7, 0.7, CREAM);
    }
}

/** Physical fragments use the same material ink/facets as their parent blocks. */
export function drawFragment(g: G, def: BlockDef, healthRatio = 1): void {
  const vertical = def.h > def.w,
    p = new Pen(g, def.x, def.y, (def.angle || 0) + (vertical ? Math.PI / 2 : 0));
  const l = Math.max(def.w, def.h) / 2,
    t = Math.min(def.w, def.h) / 2,
    b = Math.min(4, l * 0.16, Math.max(1, t * 0.4)),
    stroke = Math.min(2.1, 0.7 + t * 0.16);
  if (def.material === 'wood') {
    p.polygon(
      [
        [-l + b * 0.3, -t],
        [l - b * 0.6, -t],
        [l, -t * 0.65],
        [l - b, -t * 0.2],
        [l, t * 0.2],
        [l - b * 0.6, t * 0.5],
        [l, t],
        [-l + b * 0.6, t],
        [-l, t * 0.55],
        [-l + b, t * 0.05],
        [-l, -t * 0.25],
        [-l + b * 0.6, -t * 0.5],
      ],
      0xe7a04c,
      INK,
      stroke,
    );
    p.polygon(
      [
        [-l + b * 0.6, t * 0.5],
        [l - b * 0.6, t * 0.5],
        [l, t],
        [-l + b * 0.6, t],
        [-l, t * 0.55],
      ],
      0xbe733d,
    );
    p.line(
      [
        [-l + b, -t + 1],
        [l - b, -t + 1],
      ],
      0xffd274,
      1.1,
    );
    for (let i = 0; i < 2; i++) {
      const yy = -t * 0.3 + i * t * 0.65;
      p.line(
        [
          [-l + b * 1.7, yy],
          [-l * 0.2, yy - 0.5],
          [l * 0.3, yy + 0.5],
          [l - b * 1.7, yy],
        ],
        0x995336,
        1,
      );
    }
    p.line(
      [
        [-l + b * 0.5, -t * 0.2],
        [-l + Math.min(l * 0.5, b * 3.5), t * 0.15],
        [-l + Math.min(l * 0.7, b * 5), t * 0.05],
      ],
      INK,
      1,
    );
    p.polygon(
      [
        [l - b * 0.4, -t * 0.6],
        [l - b * 2, t * 0.05],
        [l - b * 0.4, t * 0.65],
        [l - b * 0.1, t * 0.2],
      ],
      0xffc56c,
    );
  } else if (def.material === 'glass') {
    p.polygon(
      [
        [-l + b, -t],
        [l - b, -t],
        [l, -t * 0.35],
        [l, t * 0.65],
        [l - b, t],
        [-l + b * 0.7, t],
        [-l, t * 0.3],
        [-l, -t * 0.4],
      ],
      0x5dd7e3,
      INK,
      stroke,
    );
    p.polygon(
      [
        [-l + b, -t + 0.8],
        [l * 0.35, -t + 0.8],
        [-l * 0.2, t * 0.8],
        [-l + b * 0.5, t * 0.4],
      ],
      0xd2fff0,
      undefined,
      1,
      0.8,
    );
    p.polygon(
      [
        [l * 0.2, -t * 0.6],
        [l - b * 0.8, -t * 0.8],
        [l - b * 0.3, t * 0.5],
        [l * 0.65, t * 0.75],
      ],
      0x28a8c7,
    );
    p.line(
      [
        [-l, t * 0.3],
        [-l * 0.2, -t * 0.2],
        [l * 0.2, t * 0.15],
        [l * 0.6, -t],
      ],
      0x14728e,
      1.2,
    );
    p.line(
      [
        [-l + b, -t + 1],
        [l - b, -t + 1],
      ],
      0xecfff0,
      1.2,
    );
  } else if (def.material === 'ice') {
    p.polygon([[-l+b,-t],[l-b,-t],[l,-t*.45],[l,t*.6],[l-b,t],[-l+b,t],[-l,t*.2],[-l,-t*.5]],0xa6eff8,0x315b90,stroke);
    p.polygon([[-l+b,-t+1],[l*.25,-t+1],[-l*.15,t*.7],[-l+b,t*.4]],0xeeffff);
    p.polygon([[l*.2,-t*.6],[l-b,-t*.5],[l-b,t*.6],[l*.55,t*.8]],0x64badc);
    p.line([[-l*.35,-t],[-l*.12,0],[l*.12,t]],0x4a94c6,1.1);
    p.line([[-l*.12,0],[l*.5,-t*.5]],0xeeffff,1.2);
  } else if (def.material === 'metal') {
    p.polygon([[-l+b*.4,-t],[l-b,-t],[l,-t*.55],[l-b*.5,t*.3],[l,t*.8],[l-b,t],[-l,t],[-l+b*.4,t*.15],[-l,-t*.5]],0x839aab,INK,stroke);
    p.line([[-l+b,-t+1],[l-b,-t+1]],0xcce2e3,1.5);
    p.polygon([[-l+b,t*.5],[l-b,t*.45],[l-b,t],[-l,t]],0x4e647e);
    p.line([[-l*.65,0],[l*.6,-t*.05]],0x50657e,1.2);
    if(l>8){p.ellipse(-l*.65,0,1.8,1.8,INK);p.ellipse(-l*.65-.3,-.4,.7,.7,0xcce2e3);}
  } else {
    p.polygon(
      [
        [-l + b, -t],
        [-l * 0.1, -t + t * 0.08],
        [l - b * 0.7, -t],
        [l, -t * 0.65],
        [l - b * 0.15, t * 0.7],
        [l - b, t],
        [-l * 0.35, t * 0.9],
        [-l + b * 0.35, t],
        [-l, t * 0.65],
        [-l + b * 0.1, -t * 0.7],
      ],
      0xa29ab9,
      INK,
      stroke,
    );
    p.polygon(
      [
        [-l + b * 0.3, t * 0.45],
        [l - b * 0.3, t * 0.4],
        [l - b, t],
        [-l * 0.35, t * 0.9],
        [-l + b * 0.35, t],
        [-l, t * 0.65],
      ],
      0x78718f,
    );
    p.line(
      [
        [-l + b, -t + 1],
        [l - b, -t + 1],
      ],
      0xd0c8df,
      1.3,
    );
    p.line(
      [
        [-l * 0.1, -t],
        [-l * 0.07, -t * 0.1],
        [l * 0.1, t * 0.3],
        [-l * 0.04, t],
      ],
      INK,
      1.2,
    );
    p.line(
      [
        [l * 0.1, t * 0.3],
        [l * 0.5, -t * 0.05],
        [l * 0.75, -t * 0.6],
      ],
      0x615873,
      1.1,
    );
  }
  if (healthRatio < 0.4)
    p.line(
      [
        [-l * 0.3, -t],
        [-l * 0.12, 0],
        [l * 0.12, t * 0.6],
      ],
      INK,
      1.2,
    );
}

export function drawHazard(g: G, x: number, y: number, angle = 0): void {
  const p = new Pen(g, x, y, angle);
  beveled(p, 40, 40, 0xff765c, INK, 2.8);
  p.polygon(
    [
      [-17, 10],
      [17, 6],
      [17, 17],
      [-17, 17],
    ],
    0xd94d53,
  );
  p.polygon(
    [
      [-19, -14],
      [19, -14],
      [19, -7],
      [-19, -7],
    ],
    0xffd456,
    INK,
    1.3,
  );
  p.polygon(
    [
      [-19, 8],
      [19, 8],
      [19, 15],
      [-19, 15],
    ],
    0xffd456,
    INK,
    1.3,
  );
  for (const yy of [-14, 8])
    for (const xx of [-15, -3, 9])
      p.polygon(
        [
          [xx, yy],
          [xx + 5, yy],
          [xx + 9, yy + 7],
          [xx + 4, yy + 7],
        ],
        INK,
      );
  p.polygon(
    [
      [1, -6],
      [-7, 2],
      [-1, 1],
      [-2, 8],
      [7, -1],
      [1, 0],
    ],
    CREAM,
    INK,
    1,
  );
  p.line(
    [
      [3, -20],
      [5, -29],
      [12, -31],
      [15, -26],
    ],
    INK,
    3,
  );
  p.polygon(
    [
      [15, -32],
      [17, -28],
      [22, -29],
      [19, -24],
      [20, -20],
      [15, -23],
      [10, -21],
      [12, -26],
      [9, -29],
    ],
    0xffcf4e,
  );
}

export function drawSling(g: G, anchor: Point, pouch?: Point, front = false): void {
  const { x, y } = anchor,
    aim = pouch || anchor;
  if (!front) {
    g.fillStyle(0x245949, 0.2).fillEllipse(x + 2, 674, 104, 14);
    const p = new Pen(g, x, y);
    p.polygon(
      [
        [-12, 141],
        [-13, 66],
        [-29, 34],
        [-33, -11],
        [-20, -16],
        [-15, 27],
        [0, 54],
        [14, 26],
        [20, -15],
        [34, -10],
        [28, 35],
        [11, 67],
        [13, 141],
      ],
      0xd58c44,
      INK,
      3.4,
    );
    p.polygon(
      [
        [0, 59],
        [9, 68],
        [11, 139],
        [3, 139],
      ],
      0xac583e,
    );
    p.line(
      [
        [-6, 134],
        [-6, 68],
        [-22, 29],
        [-26, -7],
      ],
      0xffc96c,
      3,
    );
    p.line(
      [
        [6, 70],
        [20, 34],
        [25, -5],
      ],
      0xf2ad53,
      2,
    );
    p.ellipse(-2, 100, 4, 7, 0xb96c3d, INK, 1);
    p.line(
      [
        [-11, 125],
        [11, 122],
      ],
      INK,
      1.2,
    );
    p.polygon(
      [
        [17, -10],
        [36, -8],
        [36, 2],
        [16, 0],
      ],
      0xffd165,
      INK,
      1.6,
    );
    p.line(
      [
        [18, -6],
        [34, -4],
      ],
      0xfff2ce,
      1.4,
    );
    g.lineStyle(9, INK).lineBetween(x + 25, y - 3, aim.x, aim.y + 4);
    g.lineStyle(4, 0xf27859).lineBetween(x + 25, y - 4, aim.x, aim.y + 3);
  } else {
    g.lineStyle(9, INK).lineBetween(x - 25, y - 4, aim.x, aim.y + 7);
    g.lineStyle(4, 0xff9467).lineBetween(x - 25, y - 5, aim.x, aim.y + 6);
    const p = new Pen(g, x, y);
    p.polygon(
      [
        [-37, -12],
        [-15, -10],
        [-16, 1],
        [-36, -1],
      ],
      0xffd165,
      INK,
      1.8,
    );
    p.line(
      [
        [-34, -8],
        [-18, -6],
      ],
      CREAM,
      1.5,
    );
    new Pen(g, aim.x, aim.y).line(
      [
        [-12, 14],
        [-6, 20],
        [6, 20],
        [12, 14],
      ],
      INK,
      5,
    );
  }
}

function skyGradient(g:G,top:number,bottom:number) {
  for(let i=0;i<24;i++){
    const t=i/23,part=(shift:number)=>Math.round(((top>>shift)&255)*(1-t)+((bottom>>shift)&255)*t);
    g.fillStyle((part(16)<<16)|(part(8)<<8)|part(0)).fillRect(0,i*34,1440,35);
  }
}
function orbitLine(p:Pen,rx:number,ry:number,color:number,width:number,start=0,end=TAU,alpha=1) {
  const points:number[][]=[];
  for(let i=0;i<=40;i++){const a=start+(end-start)*i/40;points.push([Math.cos(a)*rx,Math.sin(a)*ry]);}
  p.line(points,color,width,alpha);
}
/** Distinct silhouette families, not palette replacements of the meadow geometry. */
function drawThemedScenery(g:G,time:number,id:string,sceneryOnly:boolean):boolean {
  const theme=getTheme(id),motif=theme.motif||'meadow',c=theme.palette,p=new Pen(g);
  if(motif==='meadow')return false;
  skyGradient(g,c.skyTop,c.skyBottom);
  if(motif==='glacier'){
    // Broad aurora ribbons stay high above the readable playfield.
    p.polygon([[0,89],[155,131],[343,55],[536,104],[726,50],[925,88],[1080,17],[1241,60],[1440,23],[1440,74],[1238,111],[1080,70],[922,140],[726,100],[534,151],[342,98],[157,174],[0,129]],0x70eacb,undefined,1,.47);
    p.polygon([[0,125],[187,183],[386,108],[572,164],[818,110],[1009,159],[1193,86],[1440,126],[1440,153],[1195,115],[1007,192],[818,141],[572,195],[385,137],[187,213],[0,157]],0xd3a7ff,undefined,1,.34);
    g.fillStyle(c.sun.halo,.3).fillCircle(1194,176,91);g.fillStyle(c.sun.center).fillCircle(1194,176,57);
    for(let i=0;i<21;i++){const x=(i*173+30)%1440,y=54+(i*67)%215;g.fillStyle(0xe9ffff,.5).fillCircle(x,y,i%4===0?2:1);}
    p.polygon([[0,543],[63,345],[132,410],[220,249],[287,476],[350,441],[467,608],[0,810]],c.hills[0]);
    p.polygon([[220,249],[237,435],[271,415],[287,476],[331,534],[315,414],[263,386]],c.hills[1]);
    p.polygon([[63,345],[67,493],[106,466],[132,410],[113,434]],c.hills[2]);
    p.polygon([[1440,485],[1380,279],[1306,376],[1236,235],[1184,455],[1093,403],[984,604],[1440,810]],c.hills[0]);
    p.polygon([[1236,235],[1247,468],[1281,431],[1306,376],[1272,393]],c.hills[1]);
    p.polygon([[1380,279],[1372,465],[1411,529],[1440,485]],c.hills[2]);
    p.polygon([[0,617],[212,583],[395,626],[628,574],[845,615],[1116,578],[1440,609],[1440,810],[0,810]],c.meadow[0]);
    p.polygon([[0,663],[291,633],[481,675],[736,622],[1036,664],[1276,623],[1440,651],[1440,810],[0,810]],c.meadow[1]);
    p.line([[0,690],[284,670],[454,692],[700,655],[981,690],[1210,665],[1440,680]],0xe9ffff,3,.7);
    p.line([[318,745],[583,710],[719,721]],0x77bbd8,2,.5);p.line([[921,745],[1140,709],[1342,731]],0x77bbd8,2,.5);
    for(const[x,y,s]of[[44,628,1],[1390,630,.9],[109,657,.55]]){
      const q=new Pen(g,x,y,0,s,s);q.polygon([[-17,0],[-10,-58],[0,-76],[16,-26],[26,0]],0x92d5ec);q.polygon([[0,-76],[3,-9],[16,-26]],0xe8ffff);
    }
  }else if(motif==='volcano'){
    g.fillStyle(c.sun.halo,.7).fillCircle(1163,171,103);g.fillStyle(c.sun.center).fillCircle(1163,171,61);
    p.polygon([[0,142],[166,110],[278,139],[466,110],[654,143],[842,127],[1056,145],[1440,119],[1440,152],[1056,168],[841,148],[650,166],[465,136],[274,161],[165,135],[0,163]],c.clouds,undefined,1,.65);
    // Broken volcanic cones and visible magma channels define a new terrain silhouette.
    p.polygon([[0,566],[114,435],[203,315],[239,341],[278,313],[397,524],[512,485],[624,646],[0,810]],c.hills[0]);
    p.polygon([[203,315],[239,341],[278,313],[271,358],[255,354],[264,401],[244,426],[266,463],[250,504],[286,559],[278,615],[218,615],[239,556],[218,505],[236,462],[221,421],[237,394],[223,355],[207,359]],0xf78b67);
    p.polygon([[220,336],[238,347],[265,335],[249,358],[245,391],[235,400],[239,361]],0xffd56b);
    p.polygon([[1440,526],[1374,396],[1282,297],[1247,315],[1213,295],[1114,470],[1061,451],[932,638],[1440,810]],c.hills[1]);
    p.polygon([[1282,297],[1247,315],[1213,295],[1225,342],[1243,349],[1234,392],[1255,427],[1248,468],[1275,513],[1264,565],[1301,568],[1291,512],[1272,468],[1280,426],[1258,389],[1265,350]],0xf49c73);
    p.polygon([[0,648],[225,568],[409,618],[617,565],[821,623],[1073,570],[1243,620],[1440,589],[1440,810],[0,810]],c.hills[2]);
    p.polygon([[0,698],[224,664],[450,704],[706,644],[920,694],[1180,649],[1440,687],[1440,810],[0,810]],c.meadow[0]);
    p.polygon([[0,750],[267,722],[471,751],[751,703],[972,744],[1215,705],[1440,737],[1440,763],[1210,737],[974,774],[750,732],[470,779],[265,748],[0,777]],0xf89c69,undefined,1,.65);
    // Distant geyser silhouettes have no gameplay outline; active vents are drawn separately.
    for(const[x,y,s]of[[78,570,.8],[1360,571,1]]){const q=new Pen(g,x,y,0,s,s);q.polygon([[-25,30],[-13,5],[-17,-24],[-8,-62],[3,-40],[8,-9],[25,7],[17,30]],0xeea17c,undefined,1,.55);q.polygon([[-30,30],[-18,5],[13,4],[28,30]],c.hills[0]);}
  }else if(motif==='haunted'){
    g.fillStyle(c.sun.halo,.4).fillCircle(1150,180,100);g.fillStyle(c.sun.center).fillCircle(1150,180,68);g.fillStyle(c.skyTop,.12).fillCircle(1125,162,17);g.fillStyle(c.skyTop,.12).fillCircle(1172,199,13);
    p.polygon([[0,165],[198,133],[327,152],[451,131],[684,164],[851,145],[1011,165],[1440,133],[1440,172],[1013,194],[850,175],[681,190],[451,159],[327,176],[197,158],[0,191]],c.clouds,undefined,1,.35);
    p.polygon([[0,579],[191,462],[373,552],[561,478],[738,571],[970,476],[1163,549],[1334,455],[1440,538],[1440,810],[0,810]],c.hills[1]);
    const mansion=(x:number,y:number,scale:number,mirror=1)=>{
      const q=new Pen(g,x,y,0,scale*mirror,scale);
      q.polygon([[-88,87],[-80,-21],[-57,-35],[-42,-111],[-34,-75],[-24,-34],[5,-40],[34,-69],[67,-55],[69,12],[95,31],[96,87]],c.hills[0]);
      q.polygon([[-97,-17],[-52,-62],[-30,-27],[-14,-30],[-44,-109],[-47,-151],[-28,-176],[-20,-137],[-28,-120],[-2,-31],[33,-87],[79,-48],[96,-31],[67,-34],[35,-64],[7,-22]],c.trunk);
      q.polygon([[-65,9],[-62,-8],[-49,-11],[-48,9]],0xd1e7af,undefined,1,.7);q.polygon([[24,-6],[27,-25],[41,-29],[42,-9]],0xe3dca8,undefined,1,.7);q.polygon([[51,33],[53,17],[66,20],[65,36]],0xd1e7af,undefined,1,.7);
      q.polygon([[-11,87],[-9,49],[6,39],[20,49],[23,87]],c.trunk);
    };
    mansion(192,486,1.2);mansion(1323,493,1.1,-1);
    // Tiny ghost-shaped wisps stay in the sky, far from physical monster targets.
    for(const[x,y,s]of[[887,230,.65],[1033,323,.45],[379,270,.4]]){const q=new Pen(g,x,y,0,s,s);q.polygon([[-22,20],[-20,-4],[-13,-19],[2,-24],[17,-15],[22,9],[33,21],[17,18],[12,27],[2,19],[-5,28],[-12,20]],0xe2f1dc,undefined,1,.35);q.ellipse(-7,-4,2.3,4,c.hills[0],undefined,1,.5);q.ellipse(5,-6,2.2,3.7,c.hills[0],undefined,1,.5);}
    for(const[x,y]of[[495,108],[797,68]]){const q=new Pen(g,x,y);q.line([[0,-115],[0,18]],c.trunk,2,.35);q.line([[-28,8],[-19,22],[0,27],[20,20],[28,5]],c.trunk,3,.35);for(const xx of[-23,0,23]){q.line([[xx,20],[xx,-1]],c.trunk,2,.35);q.ellipse(xx,-5,2,5,0xe6efb4,undefined,1,.45);}}
    p.polygon([[0,658],[211,602],[455,646],[716,602],[930,649],[1186,603],[1440,641],[1440,810],[0,810]],c.meadow[0]);
    p.polygon([[0,722],[242,673],[443,709],[747,663],[981,712],[1220,669],[1440,696],[1440,810],[0,810]],c.meadow[1]);
  }else if(motif==='orbital'){
    p.polygon([[0,102],[305,32],[602,162],[852,120],[1113,225],[1440,165],[1440,255],[1110,302],[850,192],[599,242],[305,105],[0,180]],0xc195f0,undefined,1,.12);
    for(let i=0;i<67;i++){
      const x=(i*173+29)%1440,y=32+(i*89)%716,s=i%5===0?2:1;
      if(i%9===0){p.line([[x-4,y],[x+4,y]],0xc8efff,1,.7);p.line([[x,y-4],[x,y+4]],0xc8efff,1,.7);}
      else g.fillStyle(i%3?0xe4efff:0xffcfec,.55+(i%3)*.13).fillCircle(x,y,s);
    }
    const ring=new Pen(g,1243,208,-.3);orbitLine(ring,190,49,0xb7b4ed,7,0,TAU,.5);
    const planet=new Pen(g,1243,208);planet.ellipse(0,0,111,111,0xa3a1d6);planet.polygon([[-101,-42],[-15,-76],[99,-50],[111,-6],[15,-27],[-109,2]],0xc6b3e2);planet.polygon([[-91,62],[-4,43],[97,61],[65,93],[-18,108]],0x8d8ec7);
    orbitLine(ring,190,49,0xe2d0f0,7,0,Math.PI,.65);
    const little=new Pen(g,202,171,.22);little.ellipse(0,0,52,52,0x76c9c9);little.polygon([[-47,-17],[9,-35],[50,-11],[49,12],[6,-12],[-50,4]],0x98e4d7);little.ellipse(-20,16,9,7,0x5fa8b9);little.ellipse(16,25,6,5,0x5fa8b9);
    // These low-contrast distant rocks do not use the dark outline of real planetoids.
    for(const[x,y,r]of[[94,607,46],[1339,608,63],[409,738,23]]){const q=new Pen(g,x,y);q.polygon([[-r*.9,-r*.35],[-r*.3,-r],[r*.65,-r*.68],[r,-r*.05],[r*.65,r*.8],[-r*.25,r],[-r,r*.3]],c.hills[0]);q.ellipse(-r*.25,-r*.1,r*.19,r*.14,c.hills[1]);}
  }
  if(!sceneryOnly)drawWorldGround(g,{width:1440,height:810,ground:675},id);
  return true;
}

/** Real terrain contact surface, in world coordinates rather than viewport space. */
export function drawWorldGround(g:G,bounds:{width:number;height:number;ground:number},theme='countryside',originX=0):void {
  const p=new Pen(g,originX,0),c=getTheme(theme).palette,motif=getTheme(theme).motif||'meadow';
  const w=bounds.width,y=bounds.ground,bottom=Math.max(bounds.height,y+160);
  g.fillStyle(c.ground.topsoil).fillRect(originX,y,w,bottom-y);
  g.fillStyle(c.ground.soil).fillRect(originX,y+29,w,Math.max(0,bottom-y-29));
  const top:number[][]=[[0,y+31]],seam:number[][]=[[0,y+88]];
  for(let x=0;x<=w+180;x+=180){top.push([Math.min(x,w),y+26+((x/180)%2)*13]);seam.push([Math.min(x,w),y+88+((x/180)%2)*16]);}
  p.line(top,c.ground.seamHighlight,3);p.line(seam,c.ground.seam,8);
  g.fillStyle(c.ground.grassEdge).fillRect(originX,y,w,7);g.fillStyle(c.ground.grassLip).fillRect(originX,y,w,3);
  for(let i=0;i<Math.min(100,Math.ceil(w/78));i++){
    const x=(i*137+31)%w,yy=y+49+(i*31)%95;
    p.polygon([[x-3,yy],[x+2,yy-2],[x+6,yy+1],[x,yy+3]],c.ground.speckles[i%2]);
  }
  if(motif==='glacier')for(let x=18;x<w;x+=155){p.line([[x,y+5],[x+20,y+16],[x+12,y+34],[x+37,y+49]],0x5ba7cc,1.5);p.line([[x+20,y+16],[x+45,y+13]],0xeaffff,1.5);}
  else if(motif==='volcano')for(let x=25;x<w;x+=173){p.line([[x,y+8],[x+12,y+25],[x+7,y+43],[x+35,y+65]],0xff9b4e,3);p.line([[x+12,y+25],[x+43,y+32]],0xffcf63,1.5);}
  else if(motif==='meadow')for(let x=22;x<w;x+=173)p.polygon([[x-8,y],[x-13,y-12],[x-2,y-5],[x+3,y-20],[x+6,y-4],[x+14,y-12],[x+10,y]],c.grass);
  else if(motif==='orbital')for(let x=80;x<w;x+=259){p.ellipse(x,y+67,28,10,c.ground.seam,undefined,1,.6);p.line([[x-26,y+64],[x-8,y+58],[x+20,y+62]],c.ground.seamHighlight,2);}
}

/** Terrain dimensions and rotation exactly follow the static rectangle collider. */
export function drawTerrain(g:G,def:TerrainDef):void {
  drawBlock(g,{...def,material:def.material||'stone',static:true});
  const p=new Pen(g,def.x,def.y,def.angle||0);
  if(def.w>65&&def.h>14)p.line([[-def.w/2+10,-def.h/2+5],[def.w/2-10,-def.h/2+5]],CREAM,1,.5);
}

/** Readable rolling boulders and circular planetoids. Decorative craters remain
 * inside the same radius as the physics body; rings are reserved for field zones. */
export function drawProp(g:G,def:PropDef,angle=0):void {
  const p=new Pen(g,def.x,def.y,angle),r=def.radius,ice=def.material==='ice',metal=def.material==='metal';
  const color=ice?0xa6eff8:metal?0x839aab:def.kind==='planetoid'?0xa0a9d6:0xaaa0bb;
  const shade=ice?0x66bddc:metal?0x526d85:def.kind==='planetoid'?0x717cb0:0x7b7392;
  const points:number[][]=[];
  for(let i=0;i<20;i++){const a=i*TAU/20,rr=r*(i%3===0?.96:1);points.push([Math.cos(a)*rr,Math.sin(a)*rr]);}
  p.polygon(points,color,INK,Math.max(2.3,Math.min(4,r*.055)));
  p.polygon([[-r*.9,r*.2],[-r*.3,r*.55],[r*.45,r*.55],[r*.91,r*.2],[r*.7,r*.69],[r*.2,r*.96],[-r*.45,r*.86]],shade);
  p.line([[-r*.83,-r*.27],[-r*.54,-r*.69],[-r*.05,-r*.88]],ice?0xeeffff:0xd4d6e4,2);
  if(def.kind==='planetoid'){
    p.ellipse(-r*.29,-r*.18,r*.22,r*.17,shade,INK,1.2);p.line([[-r*.46,-r*.19],[-r*.28,-r*.29],[-r*.1,-r*.23]],0xcad2e8,1.5);
    p.ellipse(r*.37,r*.1,r*.13,r*.16,shade);p.ellipse(r*.13,-r*.55,r*.08,r*.07,shade);
    p.line([[-r*.21,r*.66],[r*.07,r*.52],[r*.31,r*.61]],INK,1.2,.6);
  }else{
    p.line([[-r*.28,-r*.8],[-r*.12,-r*.24],[r*.19,r*.03],[r*.07,r*.48],[r*.3,r*.88]],ice?0x3879ac:INK,1.7);
    p.line([[r*.19,r*.03],[r*.61,-r*.12],[r*.8,-r*.4]],ice?0xe9ffff:INK,1.4);
    p.polygon([[-r*.59,r*.12],[-r*.43,r*.02],[-r*.24,r*.16],[-r*.37,r*.28]],shade);
  }
}

/** Areas are drawn behind bodies. x/y are zone centers, matching physics bounds. */
export function drawZone(g:G,def:ZoneDef,time:number):void {
  const p=new Pen(g),left=def.x-def.w/2,top=def.y-def.h/2,right=left+def.w,bottom=top+def.h;
  if(def.kind==='lava'){
    g.fillStyle(0xff6e4f,.14).fillRect(left,top,def.w,def.h);g.fillStyle(0xffb94f,.45).fillRect(left,bottom-Math.min(14,def.h*.45),def.w,Math.min(14,def.h*.45));
    const wave:number[][]=[[left,bottom],[left,top+5]],count=Math.min(24,Math.max(3,Math.ceil(def.w/36)));
    for(let i=0;i<=count;i++){const x=left+i*def.w/count,y=top+6+Math.sin(time/450+i*1.8)*3;wave.push([x,y]);}
    wave.push([right,bottom]);p.polygon(wave,0xff7450,0x9c4158,1.8,.72);
    for(let i=0;i<Math.min(7,count);i++){const x=left+(i+.5)*def.w/Math.min(7,count),y=top+def.h*.55+Math.sin(time/520+i)*def.h*.1;p.ellipse(x,y,4+i%2,2.7,0xffdd73);}
    p.line([[left+2,top+7],[right-2,top+7]],0xffdf78,2,.8);
  }else if(def.kind==='heat'){
    g.fillStyle(0xffb25f,.07).fillRect(left,top,def.w,def.h);
    for(let i=0;i<Math.min(7,Math.ceil(def.w/45));i++){const x=left+(i+.5)*def.w/Math.min(7,Math.ceil(def.w/45)),h=Math.min(35,def.h*.7);p.line([[x,bottom-4],[x-4,bottom-h*.4],[x+4,bottom-h*.75],[x,bottom-h]],0xed9857,1.8,.4);}
  }else if(def.kind==='ice'){
    g.fillStyle(0x8debf2,.18).fillRect(left,top,def.w,def.h);g.lineStyle(1.5,0xe4ffff,.7).strokeRect(left,top,def.w,def.h);
    for(let x=left+15;x<right;x+=Math.max(50,def.w/12))p.line([[x,top+4],[Math.min(x+19,right-2),bottom-4]],0xf1ffff,2,.65);
  }else{
    const zero=def.kind==='zero-gravity',color=zero?0xd6b9ff:0x91e7e9;
    g.fillStyle(color,.055).fillRect(left,top,def.w,def.h);
    if(!zero&&!def.center){
      const vector=def.gravity||{x:0,y:def.strength??.25},angle=Math.atan2(vector.y,vector.x);
      if(Math.hypot(vector.x,vector.y)>.001)for(let i=0;i<3;i++)for(let j=0;j<2;j++){
        const x=left+(i+.5)*def.w/3,y=top+(j+.5)*def.h/2,arrow=new Pen(g,x,y,angle);
        arrow.line([[-9,0],[8,0]],color,1.7,.55);arrow.line([[2,-5],[8,0],[2,5]],color,1.7,.55);
      }
      return;
    }
    const center=def.center||{x:def.x,y:def.y},radius=def.radius||Math.min(def.w,def.h)/2;
    const q=new Pen(g,center.x,center.y);
    if(!zero){orbitLine(q,radius,radius,color,1.5,0,TAU,.42);orbitLine(q,radius*.6,radius*.6,color,1,0,TAU,.2);}
    for(let i=0;i<8;i++){
      const a=i*TAU/8+(zero?time/15000:0),r=radius*(zero?.55:.79),x=center.x+Math.cos(a)*r,y=center.y+Math.sin(a)*r;
      if(zero){p.polygon([[x-2,y],[x,y-3],[x+2,y],[x,y+3]],color,undefined,1,.65);}
      else{const arrow=new Pen(g,x,y,a+Math.PI);arrow.line([[-7,0],[6,0]],color,1.7,.65);arrow.line([[1,-4],[6,0],[1,4]],color,1.7,.65);}
    }
    if(zero){p.line([[left+8,top+16],[left+8,top+8],[left+16,top+8]],color,1.5,.5);p.line([[right-16,bottom-8],[right-8,bottom-8],[right-8,bottom-16]],color,1.5,.5);}
  }
}

/** Mechanical markers represent real actuators; a body-bound marker is only drawn
 * after the scene resolves its current body position into x/y. */
export function drawMechanism(g:G,def:MechanismDef,time:number,active=true):void {
  if(def.x===undefined||def.y===undefined)return;
  const p=new Pen(g,def.x,def.y),w=def.w||52,h=def.h||18;
  if(def.kind==='vent'){
    // w/h describe a force region, not a giant solid block. Put the small nozzle
    // at its upstream boundary and show flow inside the actual affected region.
    const horizontal=def.axis==='x',direction=def.speed===undefined?(horizontal?1:-1):Math.sign(def.speed)||1;
    const extent=horizontal?(def.w||100):(def.h||140),cross=horizontal?(def.h||140):(def.w||100);
    const x=def.x-(horizontal?direction*extent/2:0),y=def.y-(horizontal?0:direction*extent/2);
    const rotation=horizontal?(direction>0?Math.PI/2:-Math.PI/2):(direction>0?Math.PI:0);
    const nozzle=new Pen(g,x,y,rotation),nozzleWidth=Math.min(90,cross),rise=Math.min(72,extent*.75);
    beveled(nozzle,nozzleWidth,14,active?0x8c859e:0x6f758a,INK,2.3);
    for(let xx=-nozzleWidth/2+8;xx<nozzleWidth/2-4;xx+=9)nozzle.line([[xx,-4],[xx,4]],INK,2);
    if(active)for(const dx of[-nozzleWidth*.24,0,nozzleWidth*.24]){
      const height=rise*(.75+(Math.sin(time/280+dx)*.5+.5)*.25);
      nozzle.line([[dx,-10],[dx-3,-height*.45],[dx+3,-height]],0xffbd69,2,.65);
      nozzle.polygon([[dx-4,-height+3],[dx,-height-3],[dx+4,-height+3]],0xffdc86,undefined,1,.6);
    }
  }else if(def.kind==='motor'){
    const q=new Pen(g,def.x,def.y,active?time/1700:0),r=10,points:number[][]=[];
    for(let i=0;i<24;i++){const a=i*TAU/24,rr=i%3===0?r+3:r;points.push([Math.cos(a)*rr,Math.sin(a)*rr]);}
    q.polygon(points,active?0xffc968:0x8296ad,INK,1.8);q.ellipse(0,0,3.5,3.5,INK);
  }else{
    const color=active?0x7bd8c3:0x8296ad;
    for(const side of[-1,1]){const q=new Pen(g,def.x+side*w*.25,def.y);const horizontal=def.axis!=='y';q.line(horizontal?[[-7,-3],[0,3],[7,-3]]:[[-3,-7],[3,0],[-3,7]],color,2);}
  }
}
