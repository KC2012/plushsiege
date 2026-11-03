import type { ValidationIssue } from '../game/types';

type Shape = {
  path: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  angle?: number;
  r?: number;
};
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const tolerance = 0.65; // Accept flush construction joints and the solver's contact slop.
const vertices = (s: Shape) => {
  const c = Math.cos(s.angle || 0),
    t = Math.sin(s.angle || 0);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => ({
    x: s.x + ((a * s.w!) / 2) * c - ((b * s.h!) / 2) * t,
    y: s.y + ((a * s.w!) / 2) * t + ((b * s.h!) / 2) * c,
  }));
};
function overlap(a: Shape, b: Shape): boolean {
  if (a.r && b.r) return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - tolerance;
  if (a.r || b.r) {
    const circle = a.r ? a : b,
      rect = a.r ? b : a;
    const c = Math.cos(-(rect.angle || 0)),
      s = Math.sin(-(rect.angle || 0));
    const dx = circle.x - rect.x,
      dy = circle.y - rect.y;
    const x = dx * c - dy * s,
      y = dx * s + dy * c;
    const nearestX = Math.max(-rect.w! / 2, Math.min(rect.w! / 2, x));
    const nearestY = Math.max(-rect.h! / 2, Math.min(rect.h! / 2, y));
    return Math.hypot(x - nearestX, y - nearestY) < circle.r! - tolerance;
  }
  const av = vertices(a),
    bv = vertices(b);
  for (const v of [av, bv])
    for (let i = 0; i < 2; i++) {
      const p = v[i],
        q = v[i + 1],
        len = Math.hypot(q.x - p.x, q.y - p.y);
      const axis = { x: -(q.y - p.y) / len, y: (q.x - p.x) / len };
      const aa = av.map((p) => p.x * axis.x + p.y * axis.y),
        bb = bv.map((p) => p.x * axis.x + p.y * axis.y);
      if (
        Math.min(Math.max(...aa), Math.max(...bb)) - Math.max(Math.min(...aa), Math.min(...bb)) <=
        tolerance
      )
        return false;
    }
  return true;
}

/** Validate untrusted imported JSON before it can enter the editor or simulation. */
export function validateLevel(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const issue = (path: string, message: string) => issues.push({ path, message });
  if (!object(input)) return [{ path: '$', message: 'Expected a level object.' }];
  const l = input;
  if (l.version !== 1) issue('version', 'Only level format version 1 is supported.');
  for (const key of ['id', 'name', 'world', 'subtitle'])
    if (typeof l[key] !== 'string' || !(l[key] as string).trim())
      issue(key, 'Expected a non-empty string.');
  if (typeof l.id === 'string' && !/^[a-zA-Z0-9_-]{1,80}$/.test(l.id))
    issue('id', 'Use 1–80 letters, numbers, hyphens or underscores.');
  let width = 1440,
    height = 810,
    ground = 675;
  if (!object(l.bounds)) issue('bounds', 'Expected width, height and ground.');
  else {
    for (const k of ['width', 'height', 'ground'])
      if (!finite(l.bounds[k]) || l.bounds[k] <= 0)
        issue(`bounds.${k}`, 'Expected a positive finite number.');
    if (finite(l.bounds.width)) width = l.bounds.width;
    if (finite(l.bounds.height)) height = l.bounds.height;
    if (finite(l.bounds.ground)) ground = l.bounds.ground;
    if (width < 400 || width > 10000 || height < 300 || height > 3000 || ground > height)
      issue('bounds', 'Bounds must fit a supported playfield, with ground inside its height.');
  }
  if (!object(l.sling) || !finite(l.sling.x) || !finite(l.sling.y))
    issue('sling', 'Expected finite x and y coordinates.');
  else if (l.sling.x < 30 || l.sling.x > width - 30 || l.sling.y < 30 || l.sling.y > ground - 25)
    issue('sling', 'Slingshot must be safely inside the playfield and above the ground.');
  if (!Array.isArray(l.projectiles) || !l.projectiles.length || l.projectiles.length > 12)
    issue('projectiles', 'Provide between 1 and 12 stuffies.');
  else
    l.projectiles.forEach((p, i) => {
      if (!['sheep', 'duck', 'bear', 'rabbit'].includes(p))
        issue(`projectiles[${i}]`, 'Unknown stuffie type.');
    });
  if (
    !Array.isArray(l.thresholds) ||
    l.thresholds.length !== 3 ||
    !l.thresholds.every((v, i, a) => finite(v) && v >= 0 && (!i || v > a[i - 1]))
  )
    issue('thresholds', 'Provide three ascending finite non-negative score thresholds.');
  if (l.par !== undefined && (!finite(l.par) || !Number.isInteger(l.par) || l.par < 1))
    issue('par', 'Par must be a positive integer.');
  if (l.tutorial !== undefined && typeof l.tutorial !== 'string')
    issue('tutorial', 'Tutorial text must be a string.');
  const ids = new Set<string>(),
    shapes: Shape[] = [];
  for (const collection of ['blocks', 'monsters', 'hazards']) {
    const entries = l[collection];
    if (!Array.isArray(entries)) {
      issue(collection, 'Expected an array.');
      continue;
    }
    if (collection === 'monsters' && !entries.length)
      issue(collection, 'At least one monster is required.');
    if (entries.length > 400) {
      issue(collection, 'Too many objects (maximum 400 per collection).');
      continue;
    }
    entries.forEach((d, i) => {
      const path = `${collection}[${i}]`;
      if (!object(d)) {
        issue(path, 'Expected an object.');
        return;
      }
      if (typeof d.id !== 'string' || !d.id.trim())
        issue(`${path}.id`, 'Every object needs an ID.');
      else if (ids.has(d.id)) issue(`${path}.id`, 'Object IDs must be unique across the level.');
      else ids.add(d.id);
      if (!finite(d.x) || !finite(d.y)) {
        issue(path, 'Coordinates must be finite numbers.');
        return;
      }
      let shape: Shape = { path, x: d.x, y: d.y };
      if (collection === 'blocks') {
        if (!finite(d.w) || !finite(d.h) || d.w < 4 || d.h < 4 || d.w > width || d.h > height) {
          issue(path, 'Block width and height must be finite and at least 4.');
          return;
        }
        if (!['wood', 'glass', 'stone'].includes(d.material as string))
          issue(`${path}.material`, 'Unknown structural material.');
        if (d.angle !== undefined && !finite(d.angle)) {
          issue(`${path}.angle`, 'Rotation must be finite radians.');
          return;
        }
        if (d.static !== undefined && typeof d.static !== 'boolean')
          issue(`${path}.static`, 'Static must be a boolean.');
        shape = { ...shape, w: d.w, h: d.h, angle: (d.angle as number) || 0 };
      } else if (collection === 'monsters') {
        const radius = d.radius === undefined ? 18 : d.radius;
        if (!finite(radius) || radius < 6 || radius > 60) {
          issue(`${path}.radius`, 'Monster radius must be between 6 and 60.');
          return;
        }
        if (d.kind !== undefined && !['horn', 'blob', 'bat'].includes(d.kind as string))
          issue(`${path}.kind`, 'Unknown monster appearance.');
        shape = { ...shape, r: radius };
      } else {
        if (d.kind !== 'tnt') issue(`${path}.kind`, 'Unknown hazard type.');
        shape = { ...shape, w: 40, h: 40 };
      }
      const points = shape.r
        ? [
            { x: shape.x - shape.r, y: shape.y - shape.r },
            { x: shape.x + shape.r, y: shape.y + shape.r },
          ]
        : vertices(shape);
      if (points.some((p) => p.x < 0 || p.x > width || p.y < 0 || p.y > ground + tolerance))
        issue(path, 'Object extends beyond the level bounds or below ground.');
      shapes.push(shape);
    });
  }
  if (shapes.length > 400) issue('$', 'Maximum 400 physics objects per level.');
  else
    for (let i = 0; i < shapes.length; i++)
      for (let j = i + 1; j < shapes.length; j++)
        if (overlap(shapes[i], shapes[j]))
          issue(shapes[i].path, `Overlaps ${shapes[j].path}. Flush touching joints are allowed.`);
  return issues;
}
