// Vice City Cover Studio — state and look tables.
// Every grade, layout and sample below is original art direction for the
// fictional city of Vice City, Leonida: sunsets, beaches, neon nights.
// No Rockstar logo, artwork or fonts are used anywhere in this app.

// Five grades, each a full palette the renderer draws from.
export const GRADES = {
  ocean: {
    name: 'Ocean Drive',
    sky: ['#ff9a5a', '#ff5e8a', '#7b2ff7'],
    sea: '#12b5a5',
    sun: '#ffd166',
    ink: '#1c1033',
    accent: '#ff2e88',
    sunY: 0.34,
    palms: true,
  },
  beach: {
    name: 'Leonida Beach',
    sky: ['#7dd8ff', '#b8f1ff', '#fff3c4'],
    sea: '#00b3c6',
    sun: '#fff7ae',
    ink: '#0b2b3a',
    accent: '#ff7a1a',
    sunY: 0.26,
    palms: true,
  },
  nights: {
    name: 'Vice Nights',
    sky: ['#0d0620', '#2b1055', '#7597de'],
    sea: '#1b2a6b',
    sun: '#ff5da2',
    ink: '#f5f0ff',
    accent: '#00e5ff',
    sunY: 0.3,
    palms: false,
  },
  dusk: {
    name: 'Palm Dusk',
    sky: ['#2d1b4e', '#b13a7b', '#ff8c42'],
    sea: '#4a2b6d',
    sun: '#ffb347',
    ink: '#ffe9f3',
    accent: '#ffd166',
    sunY: 0.38,
    palms: true,
  },
  neon: {
    name: 'Neon Streets',
    sky: ['#12041f', '#3d0a5e', '#0d3b4d'],
    sea: '#0a2540',
    sun: '#ff2e88',
    ink: '#e8fff9',
    accent: '#39ff88',
    sunY: 0.3,
    palms: false,
  },
};

// Six multi-panel layouts. Each entry is a function of (W, H) returning
// panel rects in the same order as the state's panels array.
export const LAYOUTS = {
  hero: (W, H) => [{ x: 0, y: 0, w: W, h: H }],
  duo: (W, H) => [
    { x: 0, y: 0, w: W / 2, h: H },
    { x: W / 2, y: 0, w: W / 2, h: H },
  ],
  trio: (W, H) => [
    { x: 0, y: 0, w: W, h: H * 0.58 },
    { x: 0, y: H * 0.58, w: W / 2, h: H * 0.42 },
    { x: W / 2, y: H * 0.58, w: W / 2, h: H * 0.42 },
  ],
  quad: (W, H) => [
    { x: 0, y: 0, w: W / 2, h: H / 2 },
    { x: W / 2, y: 0, w: W / 2, h: H / 2 },
    { x: 0, y: H / 2, w: W / 2, h: H / 2 },
    { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
  ],
  strip: (W, H) => [0, 1, 2, 3].map((i) => ({ x: 0, y: (H / 4) * i, w: W, h: H / 4 })),
  columns: (W, H) => [
    { x: 0, y: 0, w: W * 0.34, h: H },
    { x: W * 0.34, y: 0, w: W * 0.33, h: H },
    { x: W * 0.67, y: 0, w: W * 0.33, h: H },
  ],
};

export const LAYOUT_NAMES = {
  hero: 'Hero',
  duo: 'Duo',
  trio: 'Trio',
  quad: 'Quad',
  strip: 'Strip',
  columns: 'Columns',
};

export const FONTS = [
  { id: 'anton', name: 'Anton', family: 'Anton' },
  { id: 'bebas', name: 'Bebas Neue', family: 'Bebas Neue' },
  { id: 'pacifico', name: 'Pacifico', family: 'Pacifico' },
];

// The three bundled samples: original art direction, drawn for this app.
export const SAMPLES = [
  { src: 'samples/ocean-drive.jpg', label: 'Ocean Drive' },
  { src: 'samples/leonida-beach.jpg', label: 'Leonida Beach' },
  { src: 'samples/neon-street.jpg', label: 'Neon Street' },
];

export const EXPORT_SIZES = [
  { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

// Fresh default state for a new cover.
export function defaultState() {
  return {
    layout: 'hero',
    grade: 'ocean',
    title: 'VICE CITY',
    subtitle: 'LEONIDA',
    tagline: 'Welcome back to paradise',
    titleFont: 'anton',
    subFont: 'bebas',
    titleColor: '#ffffff',
    banner: 'top',
    tilt: -4,
    titleSize: 1.0,
    panels: [
      { src: 'samples/ocean-drive.jpg', zoom: 1.0, panX: 0.5, panY: 0.5, flip: false },
      { src: 'samples/leonida-beach.jpg', zoom: 1.0, panX: 0.5, panY: 0.5, flip: false },
      { src: 'samples/neon-street.jpg', zoom: 1.0, panX: 0.5, panY: 0.5, flip: false },
    ],
    selected: 0,
  };
}
