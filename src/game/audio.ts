import { midiFrequency, musicTrack, scoreEvents, type MusicTrack } from './music';

type Channel = 'music' | 'effects';
interface Voice {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  filter?: BiquadFilterNode;
  channel: Channel;
  at: number;
}
const clamp = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const MAX_VOICES = 36;

/** Gesture-unlocked, self-contained original music and layered cartoon sound effects. */
export class AudioSystem {
  private ctx?: AudioContext;
  private master?: GainNode;
  private meter?: AnalyserNode;
  private meterValues = new Float32Array(512);
  private musicGain?: GainNode;
  private effectsGain?: GainNode;
  private voices = new Set<Voice>();
  private timer?: ReturnType<typeof setInterval>;
  private buffers = new Map<string, AudioBuffer>();
  private track: MusicTrack = musicTrack('countryside');
  private step = 0;
  private nextStepAt = 0;
  private _enabled = true;
  private paused = false;
  private hidden = false;
  private disposed = false;
  private unlocked = false;
  private musicVolume = 0.22;
  private effectsVolume = 0.75;
  private nextMaterialSound = 0;
  private effectIndex = 0;
  private scheduledNotes = 0;
  private totalVoices = 0;
  private peakVoices = 0;
  private visibility = () => {
    this.hidden = typeof document !== 'undefined' && document.hidden;
    this.updatePlayback();
  };
  constructor(private contextFactory?: () => AudioContext) {
    if (typeof document !== 'undefined') {
      this.hidden = document.hidden;
      document.addEventListener('visibilitychange', this.visibility);
    }
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(value: boolean) {
    this._enabled = !!value;
    this.updatePlayback();
  }
  get diagnostics() {
    this.meter?.getFloatTimeDomainData(this.meterValues);
    const outputRms = this.meter
      ? Math.sqrt(this.meterValues.reduce((sum, v) => sum + v * v, 0) / this.meterValues.length)
      : 0;
    return {
      world: this.track.id,
      outputRms,
      title: this.track.title,
      contextState: this.ctx?.state || 'locked',
      unlocked: this.unlocked,
      paused: this.paused,
      hidden: this.hidden,
      enabled: this.enabled,
      musicVolume: this.musicVolume,
      effectsVolume: this.effectsVolume,
      activeVoices: this.voices.size,
      voiceLimit: MAX_VOICES,
      peakVoices: this.peakVoices,
      scheduledNotes: this.scheduledNotes,
      totalVoices: this.totalVoices,
      schedulerRunning: this.timer !== undefined,
      step: this.step,
    };
  }
  async unlock(): Promise<void> {
    if (this.disposed) return;
    try {
      if (!this.ctx) {
        const AudioCtor =
          globalThis.AudioContext ||
          (globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!this.contextFactory && !AudioCtor) return;
        this.ctx = this.contextFactory ? this.contextFactory() : new AudioCtor!();
        this.master = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.effectsGain = this.ctx.createGain();
        this.musicGain.connect(this.master);
        this.effectsGain.connect(this.master);
        this.meter = this.ctx.createAnalyser();
        this.meter.fftSize = 512;
        this.master.connect(this.meter);
        this.meter.connect(this.ctx.destination);
      }
      this.unlocked = true;
      if (this.ctx.state !== 'running') await this.ctx.resume();
      this.updatePlayback();
    } catch {
      /* Browser audio can remain locked; a later user gesture can retry. */
    }
  }
  setWorld(world: string) {
    const next = musicTrack(world);
    if (next.id === this.track.id) return;
    this.track = next;
    this.step = 0;
    this.nextStepAt = (this.ctx?.currentTime || 0) + 0.04;
    this.stopChannel('music');
    this.updatePlayback();
  }
  setVolumes(music: number, effects: number) {
    this.musicVolume = clamp(music, this.musicVolume);
    this.effectsVolume = clamp(effects, this.effectsVolume);
    this.updatePlayback();
  }
  setPaused(value: boolean) {
    this.paused = !!value;
    this.updatePlayback();
  }
  private updatePlayback() {
    const ctx = this.ctx;
    if (!ctx || this.disposed) return;
    const at = ctx.currentTime;
    this.master?.gain.setTargetAtTime(this.enabled && !this.hidden ? 0.8 : 0, at, 0.02);
    this.musicGain?.gain.setTargetAtTime(!this.paused ? this.musicVolume : 0, at, 0.03);
    this.effectsGain?.gain.setTargetAtTime(this.effectsVolume, at, 0.02);
    const running =
      this.enabled && this.unlocked && !this.paused && !this.hidden && this.musicVolume > 0;
    if (running) {
      if (ctx.state === 'suspended')
        void ctx
          .resume()
          .then(() => this.startScheduler())
          .catch(() => {});
      else this.startScheduler();
    } else {
      this.stopScheduler();
      this.stopChannel('music');
      if (!this.enabled || this.hidden || this.paused) this.stopChannel('effects');
      if (this.hidden && ctx.state === 'running') void ctx.suspend().catch(() => {});
    }
  }
  private startScheduler() {
    if (
      this.timer !== undefined ||
      !this.ctx ||
      this.ctx.state !== 'running' ||
      !this.enabled ||
      this.hidden ||
      this.paused ||
      this.musicVolume <= 0
    )
      return;
    this.nextStepAt = Math.max(this.nextStepAt, this.ctx.currentTime + 0.035);
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 45);
  }
  private stopScheduler() {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || this.disposed || ctx.state !== 'running') return;
    const eighth = 30 / this.track.bpm;
    if (this.nextStepAt < ctx.currentTime - 0.1) this.nextStepAt = ctx.currentTime + 0.025;
    for (let n = 0; n < 8 && this.nextStepAt < ctx.currentTime + 0.16; n++) {
      const delay = this.step % 2 ? eighth * this.track.swing : 0;
      for (const event of scoreEvents(this.track, this.step)) {
        const at = this.nextStepAt + delay;
        if (event.kind === 'melody')
          this.musicNote(event.midi, at, (event.duration * 60) / this.track.bpm, event.velocity);
        else if (event.kind === 'bass')
          this.tone(
            midiFrequency(event.midi),
            at,
            (event.duration * 60) / this.track.bpm,
            event.velocity,
            'triangle',
            'music',
          );
        else if (event.kind === 'kick')
          this.tone(midiFrequency(event.midi), at, 0.14, event.velocity, 'sine', 'music', 30);
        else if (event.kind === 'snare')
          this.noise(
            at,
            0.075,
            event.velocity,
            this.track.id === 'molten' ? 1200 : 2200,
            'highpass',
            'music',
          );
        else if (this.track.percussion === 'wood')
          this.tone(760, at, 0.045, event.velocity, 'triangle', 'music', 500);
        else if (this.track.percussion === 'crystal')
          this.tone(2800, at, 0.06, event.velocity * 0.55, 'sine', 'music');
        else
          this.noise(
            at,
            0.025,
            event.velocity,
            this.track.percussion === 'drum' ? 900 : 4200,
            'highpass',
            'music',
          );
        this.scheduledNotes++;
      }
      this.step++;
      this.nextStepAt += eighth;
    }
  }
  private musicNote(midi: number, at: number, duration: number, gain: number) {
    const f = midiFrequency(midi),
      instrument = this.track.instrument;
    if (instrument === 'bell') {
      this.tone(f, at, duration, gain, 'sine', 'music');
      this.tone(f * 2.76, at, duration * 0.45, gain * 0.2, 'sine', 'music');
    } else if (instrument === 'reed')
      this.tone(f, at, duration, gain * 0.75, 'sawtooth', 'music', f * 0.98, 1800);
    else if (instrument === 'ghost') {
      this.tone(f * 0.985, at, duration, gain, 'sine', 'music', f);
      this.tone(f * 2, at + 0.02, duration * 0.6, gain * 0.15, 'sine', 'music');
    } else if (instrument === 'pulse') {
      this.tone(f, at, duration * 0.7, gain * 0.65, 'square', 'music', f, 2600);
      this.tone(f * 0.5, at + 0.06, duration * 0.5, gain * 0.15, 'sine', 'music');
    } else {
      this.tone(f, at, duration, gain, 'triangle', 'music');
      this.tone(f * 3, at, duration * 0.25, gain * 0.12, 'sine', 'music');
    }
  }
  private register(
    source: AudioScheduledSourceNode,
    gain: GainNode,
    channel: Channel,
    at: number,
    filter?: BiquadFilterNode,
  ) {
    if (!this.ctx) return;
    while (this.voices.size >= MAX_VOICES) {
      const oldest =
        [...this.voices].find((v) => v.channel === 'music') || this.voices.values().next().value;
      if (!oldest) break;
      this.release(oldest);
    }
    const voice: Voice = { source, gain, filter, channel, at };
    this.voices.add(voice);
    this.totalVoices++;
    this.peakVoices = Math.max(this.peakVoices, this.voices.size);
    source.onended = () => this.release(voice, false);
  }
  private release(voice: Voice, stop = true) {
    if (!this.voices.delete(voice)) return;
    voice.source.onended = null;
    if (stop)
      try {
        voice.source.stop();
      } catch {
        /* Already ended. */
      }
    voice.source.disconnect();
    voice.gain.disconnect();
    voice.filter?.disconnect();
  }
  private stopChannel(channel: Channel) {
    for (const v of [...this.voices]) if (v.channel === channel) this.release(v);
  }
  private tone(
    frequency: number,
    at: number,
    duration: number,
    gain: number,
    wave: OscillatorType,
    channel: Channel,
    end = frequency,
    cutoff?: number,
  ) {
    const ctx = this.ctx,
      destination = channel === 'music' ? this.musicGain : this.effectsGain;
    if (!ctx || !destination) return;
    const source = ctx.createOscillator(),
      envelope = ctx.createGain();
    source.type = wave;
    source.frequency.setValueAtTime(Math.max(20, frequency), at);
    source.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(gain, at + 0.007);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(envelope);
    let filter: BiquadFilterNode | undefined;
    if (cutoff) {
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      envelope.connect(filter);
      filter.connect(destination);
    } else envelope.connect(destination);
    this.register(source, envelope, channel, at, filter);
    source.start(at);
    source.stop(at + duration + 0.02);
  }
  private noise(
    at: number,
    duration: number,
    gain: number,
    frequency: number,
    kind: BiquadFilterType,
    channel: Channel,
  ) {
    const ctx = this.ctx,
      destination = channel === 'music' ? this.musicGain : this.effectsGain;
    if (!ctx || !destination) return;
    const key = String(Math.ceil(duration * 100));
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
      const values = buffer.getChannelData(0);
      let seed = 17321;
      for (let i = 0; i < values.length; i++) {
        seed = (seed * 16807) % 2147483647;
        values[i] = (seed / 1073741823.5 - 1) * (1 - i / values.length) ** 1.5;
      }
      this.buffers.set(key, buffer);
    }
    const source = ctx.createBufferSource(),
      envelope = ctx.createGain(),
      filter = ctx.createBiquadFilter();
    source.buffer = buffer;
    source.playbackRate.value = 0.96 + (this.effectIndex % 5) * 0.02;
    filter.type = kind;
    filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(gain, at);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    this.register(source, envelope, channel, at, filter);
    source.start(at);
    source.stop(at + duration + 0.04);
  }
  play(type: string, material?: string, power = 8) {
    const ctx = this.ctx;
    if (
      !ctx ||
      ctx.state !== 'running' ||
      !this.enabled ||
      this.hidden ||
      this.disposed ||
      this.effectsVolume <= 0
    )
      return;
    if (['ready', 'launch-ready', 'damage', 'won-ready'].includes(type)) return;
    const at = ctx.currentTime + 0.002,
      strength = Number.isFinite(power) ? Math.max(0.45, Math.min(1.7, power / 8)) : 1;
    if (['impact', 'break'].includes(type)) {
      if (at < this.nextMaterialSound) return;
      this.nextMaterialSound = at + 0.045;
    }
    this.effectIndex++;
    const variation = 1 + (((this.effectIndex * 7) % 9) - 4) * 0.012;
    const tone = (
      f: number,
      d: number,
      g = 0.08,
      wave: OscillatorType = 'sine',
      offset = 0,
      end = f,
    ) => this.tone(f * variation, at + offset, d, g * strength, wave, 'effects', end * variation);
    const noise = (
      d: number,
      g: number,
      f: number,
      kind: BiquadFilterType = 'lowpass',
      offset = 0,
    ) => this.noise(at + offset, d, g * strength, f, kind, 'effects');
    if (type === 'menu') {
      tone(740, 0.035, 0.035, 'triangle', 0, 520);
      return;
    }
    if (type === 'stretch') {
      tone(110 + strength * 50, 0.09, 0.03, 'triangle', 0, 85);
      noise(0.045, 0.02, 1300);
      return;
    }
    if (type === 'launch') {
      noise(0.16, 0.055, 2800, 'highpass');
      tone(220, 0.16, 0.045, 'triangle', 0.01, 560);
      tone(
        material === 'bear' ? 170 : material === 'duck' ? 700 : material === 'rabbit' ? 560 : 420,
        0.1,
        0.045,
        'sine',
        0.06,
        310,
      );
      return;
    }
    if (type === 'ability') {
      const notes =
        material === 'bear'
          ? [180, 110, 65]
          : material === 'duck'
            ? [620, 980, 1480]
            : material === 'rabbit'
              ? [660, 830, 990]
              : [440, 550, 740];
      notes.forEach((f, i) =>
        tone(f, 0.15, 0.065, material === 'bear' ? 'triangle' : 'sine', i * 0.045),
      );
      if (material === 'bear') noise(0.2, 0.1, 450);
      return;
    }
    if (type === 'won' || type === 'lost') {
      const steps = type === 'won' ? [0, 4, 7, 12, 9, 12] : [3, 2, -3, -5];
      steps.forEach((n, i) =>
        tone(midiFrequency(this.track.root + 12 + n), 0.25, 0.07, 'triangle', i * 0.09),
      );
      return;
    }
    if (type === 'monster' || type === 'vocal') {
      tone(620, 0.18, 0.07, 'triangle', 0, 170);
      tone(880, 0.12, 0.025, 'sine', 0.02, 220);
      noise(0.045, 0.02, 1700, 'highpass');
      return;
    }
    if (type === 'explosion') {
      tone(95, 0.5, 0.17, 'sine', 0, 27);
      noise(0.55, 0.17, 1100);
      noise(0.15, 0.055, 4200, 'highpass');
      return;
    }
    if (type === 'lava' || material === 'lava' || material === 'heat') {
      tone(95, 0.16, 0.04, 'sine', 0, 160);
      tone(70, 0.13, 0.03, 'sine', 0.075, 95);
      noise(0.11, 0.03, material === 'heat' ? 3600 : 650);
      return;
    }
    if (!['impact', 'break', 'joint-break'].includes(type)) return;
    if (material === 'glass' || material === 'ice') {
      noise(0.13, 0.045, 3200, 'highpass');
      const notes = material === 'ice' ? [880, 1330, 2180] : [1200, 1870, 3260];
      notes.forEach((f, i) =>
        tone(f, type === 'break' ? 0.3 : 0.12, 0.035 / (i + 1), 'sine', i * 0.008, f * 0.92),
      );
    } else if (material === 'stone') {
      tone(90, 0.15, 0.11, 'sine', 0, 45);
      noise(0.14, 0.11, 650);
      tone(260, 0.055, 0.03, 'triangle');
    } else if (material === 'metal') {
      [260, 449, 711].forEach((f, i) => tone(f, 0.45, 0.05 / (i + 1), 'triangle', 0, f * 0.98));
      noise(0.05, 0.035, 2300, 'highpass');
    } else {
      tone(210, 0.1, 0.08, 'triangle', 0, 145);
      tone(353, 0.06, 0.035, 'triangle', 0.015, 240);
      noise(type === 'break' ? 0.2 : 0.08, 0.08, 1700);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stopScheduler();
    this.stopChannel('music');
    this.stopChannel('effects');
    this.buffers.clear();
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', this.visibility);
    this.master?.disconnect();
    this.meter?.disconnect();
    this.musicGain?.disconnect();
    this.effectsGain?.disconnect();
    if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close().catch(() => {});
  }
}
