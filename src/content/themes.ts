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
    skyTop: 0x62cbce,
    skyBottom: 0xc7eccf,
    clouds: 0xfff6cf,
    sun: { halo: 0xffe09b, glow: 0xffd55e, center: 0xffe97c },
    hills: [0x5e9fae, 0x72b1b3, 0x87c8ac, 0x6fbaa1],
    path: 0xb9df9e,
    landmark: { body: 0xbcdfc1, roof: 0x57a49d, blades: 0xd8f0ce, hub: 0x6aa698 },
    foliage: [0x4e967b, 0x3c846f, 0x4f9a7c, 0x6caf8c],
    trunk: 0x2f6b63,
    leafHighlight: 0x9bd886,
    meadow: [0x84c477, 0x96ce82],
    ground: {
      grassEdge: 0x24594e,
      grassLip: 0x96d45e,
      topsoil: 0xe8aa65,
      soil: 0xd68c5a,
      seam: 0xa95955,
      seamHighlight: 0xf9cc80,
      speckles: [0xa66d4e, 0xf3c788],
    },
    grass: 0x2b7957,
    flowers: { stem: 0x256852, petals: 0xffef91, center: 0xff765c },
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
