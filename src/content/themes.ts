/** World appearance is data, separate from level geometry and physics.
 * Add/register reviewed palettes as worlds are developed; five reviewed world motifs are defined here. Additional themes can register
 * a palette and a motif without changing level physics. */
export interface EnvironmentTheme {
  id: string;
  name: string;
  motif?: 'meadow' | 'glacier' | 'volcano' | 'haunted' | 'orbital';
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
  motif: 'meadow',
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

const frozen: EnvironmentTheme = {
  id:'frozen',name:'Frozen Folly',motif:'glacier',palette:{...countryside.palette,
    skyTop:0x435ec1,skyBottom:0xc0f4f4,clouds:0xf7ffff,
    sun:{halo:0xb6b2ff,glow:0xe3c8ff,center:0xfff4e0},
    hills:[0x759cd8,0xa0cce9,0x8ed5e9,0xbbeaf4],path:0x8ac8f0,
    foliage:[0x5689a9,0x477c9e,0x88bdd4,0x93cee2],trunk:0x4d6f97,leafHighlight:0xe0ffff,
    meadow:[0xc9f6f7,0xa4e6ed],
    ground:{grassEdge:0x395886,grassLip:0xf1ffff,topsoil:0xcaf7f7,soil:0x83d1e8,seam:0x678fc9,seamHighlight:0xe9ffff,speckles:[0xaddce8,0xe8ffff]},
    grass:0x5da9cc,flowers:{stem:0x6e8fc5,petals:0xd1faff,center:0xf7abde}
  }
};
const molten: EnvironmentTheme = {
  id:'molten',name:'Molten Mayhem',motif:'volcano',palette:{...countryside.palette,
    skyTop:0xf66e77,skyBottom:0xffdca5,clouds:0xffe5ad,
    sun:{halo:0xffb258,glow:0xffd143,center:0xffec81},
    hills:[0x935576,0xb96677,0xd98b83,0xc87b78],path:0xffb26a,
    foliage:[0x874b6d,0x734266,0xa26078,0xbe7c88],trunk:0x5b3c60,leafHighlight:0xff9a74,
    meadow:[0x9e6b7d,0xae7482],
    ground:{grassEdge:0x3d3152,grassLip:0xffc25c,topsoil:0x67516e,soil:0x4d3b5a,seam:0xff7850,seamHighlight:0xffc956,speckles:[0xa8747d,0xffa658]},
    grass:0xf88c4d,flowers:{stem:0x7d4e67,petals:0xffc550,center:0xff6c4e}
  }
};
const haunted: EnvironmentTheme = {
  id:'haunted',name:'Haunted Hooligans',motif:'haunted',palette:{...countryside.palette,
    skyTop:0x6451ac,skyBottom:0xd4bbe6,clouds:0xf0d8ee,
    sun:{halo:0xb8acd8,glow:0xebdca4,center:0xfff2b9},
    hills:[0x776197,0x987caf,0xb097c2,0x9d85b4],path:0xd0b4cf,
    foliage:[0x796296,0x665381,0x8b72a3,0xa082b8],trunk:0x5a4b79,leafHighlight:0xba9bc9,
    meadow:[0xa58db7,0xb49fc4],
    ground:{grassEdge:0x3e365e,grassLip:0xa9d6a1,topsoil:0x8d769f,soil:0x675780,seam:0xb08ab0,seamHighlight:0xd4b4d6,speckles:[0xa791b1,0xc8acc6]},
    grass:0x687d78,flowers:{stem:0x665482,petals:0xccecb2,center:0xffb38b}
  }
};
const orbital: EnvironmentTheme = {
  id:'orbital',name:'Orbital Oddities',motif:'orbital',palette:{...countryside.palette,
    skyTop:0x28306c,skyBottom:0x768bc6,clouds:0x96a8ef,
    sun:{halo:0x776cd3,glow:0xf2b2df,center:0xffd1ee},
    hills:[0x5b63a4,0x7777bf,0x8e92ce,0xa8a7dd],path:0xa2caeb,
    foliage:[0x6d7cad,0x6a669e,0xa298cd,0xbab3de],trunk:0x4f568e,leafHighlight:0xbad6ec,
    meadow:[0x9197c7,0xa7acd4],
    ground:{grassEdge:0x35365f,grassLip:0xe0d8f5,topsoil:0xa5a4ce,soil:0x7477ac,seam:0x54598d,seamHighlight:0xd8dcf1,speckles:[0x626998,0xd4cdec]},
    grass:0x9cb7e7,flowers:{stem:0x7a7fb2,petals:0xc9ebff,center:0xffcc86}
  }
};

const registry = new Map<string, EnvironmentTheme>(
  [countryside,frozen,molten,haunted,orbital].map(theme=>[theme.id,theme])
);
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
