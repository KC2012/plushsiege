/** World appearance is data, separate from level geometry and physics.
 * Add/register reviewed palettes as worlds are developed; only the initial
 * countryside is defined here, so future art direction remains open. */
export interface EnvironmentTheme {
  id: string;
  name: string;
  palette: {
    skyTop: number;
    skyBottom: number;
    clouds: number;
    sun: { halo: number; glow: number; center: number };
    hills: readonly [number, number, number, number];
    path: number;
    landmark: { body: number; roof: number; blades: number; hub: number };
    foliage: readonly [number, number, number, number];
    trunk: number;
    leafHighlight: number;
    meadow: readonly [number, number];
    ground: {
      grassEdge: number;
      grassLip: number;
      topsoil: number;
      soil: number;
      seam: number;
      seamHighlight: number;
      speckles: readonly [number, number];
    };
    grass: number;
    flowers: { stem: number; petals: number; center: number };
  };
}

const countryside: EnvironmentTheme = {
  id: 'countryside',
  name: 'Meadow Mischief',
  palette: {
    skyTop: 0xd9edea,
    skyBottom: 0xf0f3d6,
    clouds: 0xffffff,
    sun: { halo: 0xfff9d9, glow: 0xfff8d8, center: 0xfffce8 },
    hills: [0xbed8cd, 0xc8ded0, 0xa3c7b7, 0xb4d2b7],
    path: 0xd0d7ae,
    landmark: { body: 0xe7e6ce, roof: 0x94aaa0, blades: 0xeceddb, hub: 0x8fae99 },
    foliage: [0x7faa93, 0x89b69a, 0x77a98f, 0xa0bd9d],
    trunk: 0x8a8570,
    leafHighlight: 0xffffff,
    meadow: [0x9bbd87, 0xa7c28c],
    ground: {
      grassEdge: 0x709b70,
      grassLip: 0xb3cd8d,
      topsoil: 0xe0c796,
      soil: 0xd7bb8a,
      seam: 0xc8ad80,
      seamHighlight: 0xe8d4b0,
      speckles: [0xb99a6b, 0xf2ddba],
    },
    grass: 0x6f986a,
    flowers: { stem: 0x71986a, petals: 0xfff3dc, center: 0xe9b957 },
  },
};

const registry = new Map<string, EnvironmentTheme>([[countryside.id, countryside]]);
/** Read-only registry view. Use registerTheme() for additions or art-direction updates. */
export const themes: ReadonlyMap<string, EnvironmentTheme> = registry;

/** Register any number of reviewed world palettes; there is no fixed world roster or cap. */
export function registerTheme(theme: EnvironmentTheme): void {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(theme.id) || !theme.name.trim()) {
    throw new Error('An environment theme needs a valid ID and display name.');
  }
  registry.set(theme.id, theme);
}

/** Unknown world IDs render with the initial palette until their theme is registered. */
export function getTheme(id = 'countryside'): EnvironmentTheme {
  return registry.get(id) || registry.get('countryside')!;
}
