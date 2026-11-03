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

test('legacy saves retain progress and receive separate music/effects defaults', () => {
  const s = storage();
  s.setItem(
    'plush-siege-v1',
    JSON.stringify({
      version: 1,
      scores: { 'meadow-01': { score: 8500, stars: 3 } },
      sound: false,
      trajectory: false,
    }),
  );
  const a = new ProgressStore(s);
  assert.equal(a.data.sound, false);
  assert.equal(a.data.trajectory, false);
  assert.deepEqual(a.data.scores['meadow-01'], { score: 8500, stars: 3 });
  assert.equal(a.data.musicVolume, 0.22);
  assert.equal(a.data.effectsVolume, 0.75);
  a.data.musicVolume = 0.4;
  a.data.effectsVolume = 0.7;
  a.persist();
  const b = new ProgressStore(s);
  assert.equal(b.data.musicVolume, 0.4);
  assert.equal(b.data.effectsVolume, 0.7);
  assert.deepEqual(b.data.scores, a.data.scores);
});
test('loaded volume values are finite and clamped without resetting other save data', () => {
  const s = storage();
  s.setItem(
    'plush-siege-v1',
    JSON.stringify({ version: 1, scores: {}, musicVolume: -5, effectsVolume: 9 }),
  );
  const a = new ProgressStore(s);
  assert.equal(a.data.musicVolume, 0);
  assert.equal(a.data.effectsVolume, 1);
  s.setItem(
    'plush-siege-v1',
    JSON.stringify({ version: 1, scores: {}, musicVolume: 'loud', effectsVolume: null }),
  );
  const b = new ProgressStore(s);
  assert.equal(b.data.musicVolume, 0.22);
  assert.equal(b.data.effectsVolume, 0.75);
});
