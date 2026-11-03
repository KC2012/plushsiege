export class AudioSystem {
  private ctx?: AudioContext;
  enabled = true;
  private last = 0;
  unlock() {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
    } catch {
      /* Audio may be unavailable in embedded browsers. */
    }
  }
  play(type: string, material?: string) {
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx,
      t = c.currentTime;
    if (type === 'impact' && t - this.last < 0.065) return;
    this.last = t;
    const melody =
      type === 'won'
        ? [523, 659, 784, 1046]
        : type === 'lost'
          ? [330, 294, 220]
          : type === 'monster'
            ? [650, 880]
            : type === 'launch'
              ? [220, 440]
              : type === 'ability'
                ? [440, 880, 1320]
                : [material === 'glass' ? 1200 : material === 'stone' ? 95 : 180];
    melody.forEach((f, i) => {
      const o = c.createOscillator(),
        g = c.createGain(),
        start = t + i * 0.085;
      o.type = type === 'break' ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, start);
      o.frequency.exponentialRampToValueAtTime(Math.max(35, f * 0.55), start + 0.15);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.075, start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      o.connect(g);
      g.connect(c.destination);
      o.start(start);
      o.stop(start + 0.25);
    });
    if (['break', 'explosion', 'impact'].includes(type)) {
      const duration = type === 'explosion' ? 0.42 : 0.12,
        buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate),
        d = buffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
      const n = c.createBufferSource(),
        g = c.createGain(),
        filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = material === 'glass' ? 6000 : 900;
      n.buffer = buffer;
      g.gain.value = type === 'explosion' ? 0.2 : 0.09;
      n.connect(filter);
      filter.connect(g);
      g.connect(c.destination);
      n.start();
    }
  }
}
