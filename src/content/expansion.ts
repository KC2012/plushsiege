import accepted from './expansion/accepted.json';
import type { Level } from '../game/types';
/** Only strict schema/idle/miss/winning-replay accepted production content ships. */
export const expansionLevels: Level[] = accepted as unknown as Level[];
