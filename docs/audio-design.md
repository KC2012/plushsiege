# Original audio direction

The soundtrack is an original procedural score, defined as eighth-note motifs and a repeatable arrangement in `src/game/music.ts`. No commercial soundtrack, sample pack, external music API or downloaded recording is used. Sparse third phrases and answering fourth phrases vary each loop; melody, bass and offbeat percussion are scheduled with a short look-ahead rather than frame timing.

| World | Original cue | Meter / tempo | Identity |
| --- | --- | --- | --- |
| Meadow Mischief | The Stuffie Stomp | 4/4, 116 BPM | Jaunty toy-triangle melody, wooden clicks, warm plucked bass |
| Frozen Folly | Skating on a Secret | 4/4, 96 BPM | Spacious celesta-like sine partials, crystalline high ticks |
| Molten Mayhem | Boiler Room Bounce | 4/4, 132 BPM | Low reed-like filtered buzz, syncopated drums and bass |
| Haunted Hooligans | Three Steps Past Midnight | 3/4, 104 BPM | Playful chromatic waltz, sliding ghost tone and dry rattles |
| Orbital Oddities | Zero-G Jitterbug | 4/4, 108 BPM | Pentatonic pulse phrases, soft octave echoes and clipped clicks |

Sound effects combine short modal tones, filtered deterministic noise and pitch envelopes. Wood has a dry crack; glass and ice have different inharmonic crystalline patterns; stone has low thuds; metal rings; lava bubbles and heat hisses. Stuffie abilities and reactions use distinct chirps. Repeated effects vary modestly, and impact power controls level. Audio randomness never affects physics.

The system creates no AudioContext before a gesture. It exposes independent music/effects gains, a legacy master mute, world selection, pause and disposal. Background visibility stops scheduling and suspends the context; a later valid gesture can resume it if Safari requires that. Thirty-six active/future voices is the hard budget; buffers are reused and ended/stolen voices disconnect their nodes.

The existing version-1 save key and progress remain compatible. Old saves receive music/effects defaults of 0.22/0.75; malformed volumes are ignored and finite values are clamped to 0–1. No migration or score reset is needed.

Verification: targeted audio/save tests cover original score structure, gating, gain separation, pause/mute, budget/cleanup and legacy save loading. `scripts/audio-browser-test.mjs` imports the actual module, unlocks a native Web Audio context with a button gesture, measures nonzero output for all five cues, and checks mute, pause, bounds and disposal. These checks establish audio generation and controls, not subjective musical quality or physical-iPad latency. Human listening and an actual iPad Safari check remain part of polish review.
