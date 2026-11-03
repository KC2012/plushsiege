import data from './campaign.json';
import type { Level } from '../game/types';

/** Hand-authored launch campaign. JSON is the portable production format. */
export const campaign: Level[] = data as Level[];
export const worlds = [
  {
    id: 'countryside',
    name: 'Meadow Mischief',
    subtitle: 'A little trouble in the countryside',
    description: 'Sunny hills, wobbly forts, and a few very unwelcome neighbors.',
    color: '#80b6a0',
    levelIds: campaign.map((level) => level.id),
  },
];
