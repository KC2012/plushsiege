import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioSystem } from '../src/game/audio';
import { MUSIC_TRACKS, midiFrequency, musicTrack, scoreEvents } from '../src/game/music';

class Parameter {
  value = 0;
  setValueAtTime(v: number) {
    this.value = v;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
  }
  setTargetAtTime(v: number) {
    this.value = v;
  }
}
class Node {
  gain = new Parameter();
  frequency = new Parameter();
  playbackRate = new Parameter();
  type = 'sine';
  buffer: unknown;
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: number[] = [];
  disconnected = false;
  connect(_node: unknown) {
    return _node;
  }
  disconnect() {
    this.disconnected = true;
  }
  start(at = 0) {
    this.starts.push(at);
  }
  stop(at = 0) {
    this.stops.push(at);
  }
}
class Context {
  currentTime = 0;
  sampleRate = 8000;
  state = 'suspended';
  destination = new Node();
  sources: Node[] = [];
  gains: Node[] = [];
  createGain() {
    const n = new Node();
    this.gains.push(n);
    return n;
  }
  createOscillator() {
    const n = new Node();
    this.sources.push(n);
    return n;
  }
  createBufferSource() {
    const n = new Node();
    this.sources.push(n);
    return n;
  }
  createBiquadFilter() {
    return new Node();
  }
  createAnalyser() {
    return {
      ...new Node(),
      fftSize: 512,
      connect: () => {},
      disconnect: () => {},
      getFloatTimeDomainData: (values: Float32Array) => values.fill(0),
    };
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  async resume() {
    this.state = 'running';
  }
  async suspend() {
    this.state = 'suspended';
  }
  async close() {
    this.state = 'closed';
  }
}
const rig = () => {
  const ctx = new Context();
  let created = 0;
  const audio = new AudioSystem(() => {
    created++;
    return ctx as unknown as AudioContext;
  });
  return { audio, ctx, created: () => created };
};

test('music has five distinct original repeatable scores, varied rhythms, and bounded valid events', () => {
  assert.equal(Object.keys(MUSIC_TRACKS).length, 5);
  assert.equal(new Set(Object.values(MUSIC_TRACKS).map((t) => JSON.stringify(t.motif))).size, 5);
  assert.equal(MUSIC_TRACKS.haunted.beatsPerBar, 3);
  assert.equal(musicTrack('unknown').id, 'countryside');
  assert.ok(Math.abs(midiFrequency(69) - 440) < 0.0001);
  for (const track of Object.values(MUSIC_TRACKS)) {
    const counts = new Set<number>();
    for (let step = 0; step < track.motif.length * 4; step++) {
      const events = scoreEvents(track, step);
      counts.add(events.length);
      assert.deepEqual(events, scoreEvents(track, step), 'score variation must be deterministic');
      assert.ok(events.length <= 5);
      for (const event of events)
        assert.ok(
          Number.isFinite(event.midi) &&
            event.midi >= 20 &&
            event.midi <= 110 &&
            event.duration > 0 &&
            event.velocity > 0 &&
            event.velocity <= 0.1,
        );
    }
    assert.ok(counts.size > 2, 'score should contain both sparse and layered moments');
  }
});
test('audio never constructs a context or schedules sound before a gesture unlock', async () => {
  const { audio, created } = rig();
  audio.setWorld('orbital');
  audio.setVolumes(0.4, 0.5);
  audio.play('launch', 'duck');
  assert.equal(created(), 0);
  assert.equal(audio.diagnostics.activeVoices, 0);
  assert.equal(audio.diagnostics.schedulerRunning, false);
  await audio.unlock();
  assert.equal(created(), 1);
  assert.equal(audio.diagnostics.unlocked, true);
  assert.equal(audio.diagnostics.schedulerRunning, true);
  assert.ok(audio.diagnostics.scheduledNotes > 0);
  audio.dispose();
});
test('music and effects volume controls address separate channels and survive mute/unmute', async () => {
  const { audio, ctx } = rig();
  await audio.unlock();
  audio.setVolumes(0.15, 0.8);
  assert.equal(ctx.gains[1].gain.value, 0.15);
  assert.equal(ctx.gains[2].gain.value, 0.8);
  audio.enabled = false;
  assert.equal(ctx.gains[0].gain.value, 0);
  assert.equal(audio.diagnostics.schedulerRunning, false);
  assert.equal(audio.diagnostics.activeVoices, 0);
  audio.enabled = true;
  assert.equal(ctx.gains[0].gain.value, 0.8);
  assert.equal(audio.diagnostics.musicVolume, 0.15);
  assert.equal(audio.diagnostics.effectsVolume, 0.8);
  assert.equal(audio.diagnostics.schedulerRunning, true);
  audio.setVolumes(NaN, 2);
  assert.equal(audio.diagnostics.musicVolume, 0.15);
  assert.equal(audio.diagnostics.effectsVolume, 1);
  audio.dispose();
});
test('world switching uses a new score and pause stops scheduling and active voices', async () => {
  const { audio } = rig();
  await audio.unlock();
  audio.setWorld('haunted');
  assert.equal(audio.diagnostics.world, 'haunted');
  assert.equal(audio.diagnostics.title, 'Three Steps Past Midnight');
  audio.play('ability', 'rabbit');
  assert.ok(audio.diagnostics.activeVoices > 0);
  audio.setPaused(true);
  assert.equal(audio.diagnostics.schedulerRunning, false);
  assert.equal(audio.diagnostics.activeVoices, 0);
  audio.setPaused(false);
  assert.equal(audio.diagnostics.schedulerRunning, true);
  audio.dispose();
  assert.equal(audio.diagnostics.activeVoices, 0);
  assert.equal(audio.diagnostics.schedulerRunning, false);
});
test('layered effects remain within a strict voice budget under a dense destruction burst', async () => {
  const { audio, ctx } = rig();
  await audio.unlock();
  for (let i = 0; i < 80; i++) {
    ctx.currentTime += 0.05;
    audio.play(
      i % 4 ? 'break' : 'explosion',
      ['wood', 'ice', 'glass', 'metal', 'stone'][i % 5],
      20,
    );
  }
  assert.ok(audio.diagnostics.totalVoices > audio.diagnostics.voiceLimit);
  assert.ok(audio.diagnostics.activeVoices <= audio.diagnostics.voiceLimit);
  assert.ok(audio.diagnostics.peakVoices <= audio.diagnostics.voiceLimit);
  assert.ok(
    ctx.sources.some((n) => n.disconnected),
    'old voices must actually release their nodes',
  );
  audio.dispose();
});
test('zero effects volume prevents effect allocation while zero music volume stops the sequencer', async () => {
  const { audio } = rig();
  await audio.unlock();
  audio.setVolumes(0, 0);
  const count = audio.diagnostics.totalVoices;
  audio.play('explosion');
  assert.equal(audio.diagnostics.totalVoices, count);
  assert.equal(audio.diagnostics.schedulerRunning, false);
  audio.dispose();
});
