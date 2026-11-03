import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressStore } from '../src/game/save';
function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) || null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}
test('best score and stars survive reload and never regress', () => {
  const s = storage(),
    a = new ProgressStore(s);
  a.record('meadow-01', 8000, 3);
  a.record('meadow-01', 5000, 1);
  const b = new ProgressStore(s);
  assert.deepEqual(b.data.scores['meadow-01'], { score: 8000, stars: 3 });
});
test('corrupt and obsolete saves recover without crashing', () => {
  for (const v of ['oops', '{"version":9,"scores":{}}', 'null']) {
    const a = new ProgressStore({ getItem: () => v, setItem: () => {} });
    assert.deepEqual(a.data.scores, {});
  }
});
test('unavailable storage preserves in-memory play and signals persistence failure', () => {
  const a = new ProgressStore({
    getItem: () => {
      throw Error('blocked');
    },
    setItem: () => {
      throw Error('quota');
    },
  });
  a.record('x', 3000, 1);
  assert.equal(a.data.scores.x.score, 3000);
  assert.equal(a.available, false);
});
test('nonfinite or malformed scores are rejected on load and record', () => {
  const s = storage();
  s.setItem(
    'plush-siege-v1',
    JSON.stringify({
      version: 1,
      scores: { bad: { score: 'hacked', stars: 99 }, good: { score: 5000, stars: 1 } },
    }),
  );
  const a = new ProgressStore(s);
  a.record('x', NaN, 2);
  a.record('y', 1000, 4);
  assert.deepEqual(Object.keys(a.data.scores), ['good']);
});
