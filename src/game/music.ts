/** Original short scores, written as eighth-note motifs. No sampled/copyrighted music. */
export type WorldSound = 'countryside' | 'frozen' | 'molten' | 'haunted' | 'orbital';
export type MusicInstrument = 'toy' | 'bell' | 'reed' | 'ghost' | 'pulse';
export interface MusicTrack {
  id: WorldSound;
  title: string;
  bpm: number;
  beatsPerBar: number;
  root: number;
  swing: number;
  instrument: MusicInstrument;
  motif: readonly (number | null)[];
  bass: readonly number[];
  percussion: 'wood' | 'crystal' | 'drum' | 'rattle' | 'click';
}
export interface ScoreEvent {
  kind: 'melody' | 'bass' | 'kick' | 'tick' | 'snare';
  midi: number;
  duration: number;
  velocity: number;
}
export const MUSIC_TRACKS: Readonly<Record<WorldSound, MusicTrack>> = {
  countryside: {
    id: 'countryside',
    title: 'The Stuffie Stomp',
    bpm: 116,
    beatsPerBar: 4,
    root: 60,
    swing: 0.08,
    instrument: 'toy',
    percussion: 'wood',
    motif: [
      12,
      null,
      19,
      16,
      null,
      21,
      19,
      null,
      14,
      16,
      null,
      19,
      12,
      null,
      11,
      null,
      12,
      19,
      null,
      24,
      21,
      null,
      19,
      16,
      14,
      null,
      16,
      11,
      12,
      null,
      null,
      null,
    ],
    bass: [0, 7, 9, 5],
  },
  frozen: {
    id: 'frozen',
    title: 'Skating on a Secret',
    bpm: 96,
    beatsPerBar: 4,
    root: 62,
    swing: 0.02,
    instrument: 'bell',
    percussion: 'crystal',
    motif: [
      24,
      null,
      null,
      19,
      21,
      null,
      16,
      null,
      14,
      null,
      19,
      null,
      17,
      16,
      null,
      null,
      24,
      null,
      26,
      24,
      21,
      null,
      19,
      null,
      16,
      null,
      14,
      17,
      12,
      null,
      null,
      null,
    ],
    bass: [0, 5, 9, 7],
  },
  molten: {
    id: 'molten',
    title: 'Boiler Room Bounce',
    bpm: 132,
    beatsPerBar: 4,
    root: 50,
    swing: 0.04,
    instrument: 'reed',
    percussion: 'drum',
    motif: [
      12,
      null,
      15,
      19,
      null,
      22,
      null,
      19,
      17,
      15,
      null,
      12,
      10,
      null,
      7,
      null,
      12,
      15,
      null,
      24,
      null,
      22,
      19,
      null,
      17,
      null,
      15,
      10,
      12,
      7,
      null,
      null,
    ],
    bass: [0, 0, 5, 7],
  },
  haunted: {
    id: 'haunted',
    title: 'Three Steps Past Midnight',
    bpm: 104,
    beatsPerBar: 3,
    root: 60,
    swing: 0.06,
    instrument: 'ghost',
    percussion: 'rattle',
    motif: [
      12,
      null,
      15,
      18,
      19,
      null,
      24,
      23,
      null,
      19,
      18,
      null,
      17,
      null,
      15,
      14,
      11,
      null,
      12,
      19,
      15,
      11,
      12,
      null,
    ],
    bass: [0, 8, 5, 7],
  },
  orbital: {
    id: 'orbital',
    title: 'Zero-G Jitterbug',
    bpm: 108,
    beatsPerBar: 4,
    root: 64,
    swing: 0,
    instrument: 'pulse',
    percussion: 'click',
    motif: [
      24,
      null,
      19,
      null,
      16,
      19,
      null,
      26,
      24,
      null,
      21,
      19,
      null,
      16,
      14,
      null,
      24,
      28,
      null,
      26,
      21,
      null,
      19,
      16,
      14,
      19,
      null,
      21,
      12,
      null,
      null,
      null,
    ],
    bass: [0, 9, 5, 7],
  },
};
export function musicTrack(world: string): MusicTrack {
  return MUSIC_TRACKS[world as WorldSound] || MUSIC_TRACKS.countryside;
}
export const midiFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Repeatable arrangement, including sparse sections and original syncopated percussion. */
export function scoreEvents(track: MusicTrack, step: number): ScoreEvent[] {
  const events: ScoreEvent[] = [],
    perBar = track.beatsPerBar * 2;
  const bar = Math.floor(step / perBar),
    inBar = step % perBar;
  const phrase = Math.floor(step / track.motif.length) % 4;
  const motif = track.motif[step % track.motif.length];
  // The third phrase gives the ear a breather; the fourth answers the original motif.
  if (motif !== null && !(phrase === 2 && (inBar > 3 || bar % 2))) {
    const answer = phrase === 3 && inBar === perBar - 2 ? -12 : 0;
    events.push({
      kind: 'melody',
      midi: track.root + motif + answer,
      duration: track.instrument === 'bell' ? 0.9 : 0.42,
      velocity: inBar % 2 ? 0.065 : 0.08,
    });
  }
  if (inBar === 0 || (inBar === perBar - 2 && phrase !== 2)) {
    events.push({
      kind: 'bass',
      midi: track.root - 12 + track.bass[bar % track.bass.length] + (inBar ? 7 : 0),
      duration: 0.55,
      velocity: 0.065,
    });
  }
  if (inBar === 0 || (track.id === 'molten' && inBar === 5))
    events.push({
      kind: 'kick',
      midi: track.id === 'molten' ? 30 : 36,
      duration: 0.15,
      velocity: 0.075,
    });
  if ((inBar % 2 === 1 && phrase !== 2) || (track.id === 'orbital' && inBar === 4))
    events.push({ kind: 'tick', midi: 72 + (bar % 3) * 2, duration: 0.04, velocity: 0.025 });
  if (inBar === (track.beatsPerBar === 3 ? 4 : 4) && phrase !== 2)
    events.push({ kind: 'snare', midi: 58, duration: 0.1, velocity: 0.035 });
  return events;
}
