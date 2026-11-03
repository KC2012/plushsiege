import type Phaser from 'phaser';
import type { BlockDef, StuffieKind } from './types';
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
    this.g.fillStyle(color, alpha).fillPoints(p, true);
    if (stroke !== undefined)
      this.g.lineStyle(width * this.weight, stroke, alpha).strokePoints(p, true);
  }
  line(points: number[][], color: number, width = 1.5, alpha = 1) {
    this.g.lineStyle(width * this.weight, color, alpha).strokePoints(
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
export function drawBackground(g: G, time: number, theme = 'countryside'): void {
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
  // Actual contact surface is y=675. Decorative cuts below it do not imply ledges.
  g.fillStyle(c.ground.grassEdge).fillRect(0, 673, 1440, 9);
  g.fillStyle(c.ground.grassLip).fillRect(0, 671, 1440, 4);
  g.fillStyle(c.ground.topsoil).fillRect(0, 682, 1440, 128);
  p.polygon(
    [
      [0, 706],
      [150, 721],
      [324, 707],
      [489, 730],
      [688, 716],
      [901, 733],
      [1121, 714],
      [1290, 733],
      [1440, 718],
      [1440, 810],
      [0, 810],
    ],
    c.ground.soil,
  );
  p.polygon(
    [
      [0, 753],
      [226, 769],
      [415, 748],
      [664, 773],
      [920, 756],
      [1141, 776],
      [1440, 752],
      [1440, 767],
      [1138, 790],
      [920, 768],
      [663, 785],
      [416, 761],
      [224, 781],
      [0, 765],
    ],
    c.ground.seam,
  );
  p.line(
    [
      [0, 698],
      [198, 711],
      [364, 698],
      [544, 714],
      [716, 703],
      [913, 719],
      [1131, 703],
      [1325, 718],
      [1440, 707],
    ],
    c.ground.seamHighlight,
    3,
  );
  for (let i = 0; i < 29; i++) {
    const x = (i * 137 + 31) % 1440,
      y = 726 + ((i * 31) % 78);
    p.polygon(
      [
        [x - 3, y],
        [x + 2, y - 2],
        [x + 6, y + 1],
        [x, y + 3],
      ],
      c.ground.speckles[i % 2],
    );
  }
  for (const x of [22, 119, 358, 441, 583, 1338, 1423]) {
    p.polygon(
      [
        [x - 9, 673],
        [x - 15, 659],
        [x - 3, 666],
        [x + 2, 649],
        [x + 6, 667],
        [x + 16, 659],
        [x + 12, 673],
      ],
      c.grass,
    );
  }
  for (const [x, y] of [
    [38, 650],
    [399, 658],
    [1371, 648],
  ]) {
    p.line(
      [
        [x, y + 21],
        [x, y],
      ],
      c.flowers.stem,
      2.5,
    );
    p.polygon(
      [
        [x, y - 7],
        [x + 3, y - 2],
        [x + 9, y],
        [x + 3, y + 3],
        [x, y + 9],
        [x - 3, y + 3],
        [x - 9, y],
        [x - 3, y - 2],
      ],
      c.flowers.petals,
    );
    p.ellipse(x, y, 2.5, 2.5, c.flowers.center);
  }
}

export interface StuffieExpression {
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
