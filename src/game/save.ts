export interface RecordScore {
  score: number;
  stars: number;
}
export interface SaveData {
  version: 1;
  scores: Record<string, RecordScore>;
  sound: boolean;
  musicVolume: number;
  effectsVolume: number;
  trajectory: boolean;
  reducedMotion: boolean;
}
const KEY = 'plush-siege-v1';
const fresh = (): SaveData => ({
  version: 1,
  scores: {},
  sound: true,
  musicVolume: 0.22,
  effectsVolume: 0.75,
  trajectory: true,
  reducedMotion: false,
});
export class ProgressStore {
  data: SaveData = fresh();
  available = true;
  constructor(private storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      if (!this.storage && typeof window !== 'undefined') this.storage = window.localStorage;
      const s = JSON.parse(this.storage?.getItem(KEY) || 'null');
      if (s?.version === 1 && s.scores && typeof s.scores === 'object') {
        for (const [id, r] of Object.entries(s.scores)) {
          const v = r as RecordScore;
          if (
            Number.isFinite(v.score) &&
            v.score >= 0 &&
            Number.isInteger(v.stars) &&
            v.stars >= 1 &&
            v.stars <= 3
          )
            this.data.scores[id] = { score: v.score, stars: v.stars };
        }
        for (const key of ['sound', 'trajectory', 'reducedMotion'] as const)
          if (typeof s[key] === 'boolean') this.data[key] = s[key];
        for (const key of ['musicVolume', 'effectsVolume'] as const)
          if (typeof s[key] === 'number' && Number.isFinite(s[key]))
            this.data[key] = Math.max(0, Math.min(1, s[key]));
      }
    } catch {
      this.available = false;
    }
  }
  record(id: string, score: number, stars: number) {
    if (!Number.isFinite(score) || score < 0 || !Number.isInteger(stars) || stars < 1 || stars > 3)
      return;
    const old = this.data.scores[id];
    this.data.scores[id] = {
      score: Math.max(old?.score || 0, score),
      stars: Math.max(old?.stars || 0, stars),
    };
    this.persist();
  }
  persist() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
      if (!this.storage) this.available = false;
    } catch {
      this.available = false;
    }
  }
}
