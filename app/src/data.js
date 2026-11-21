// Vice City Cover Studio — poster data.
// Every look, layout, sample, station and heist line below is original art
// direction for the fictional city of Vice City, Leonida: sunsets, beaches,
// neon nights, palm courts. No Rockstar logo, artwork or fonts anywhere.

// Five grades. Each one is a full palette the painter draws from: a
// three-stop sky, a water band, a sun colour, an ink for silhouettes and
// a neon accent. sunH is where the sun sits (0 = top, 1 = bottom).
export const GRADES = [
  {
    id: 'ocean',
    label: 'Ocean Drive',
    top: '#ff8c42',
    mid: '#ff5e8a',
    bottom: '#6a1fb5',
    water: '#0fb5a3',
    sun: '#ffd166',
    ink: '#1c1033',
    accent: '#ff2e88',
    sunH: 0.34,
    palms: true,
  },
  {
    id: 'beach',
    label: 'Leonida Beach',
    top: '#6ec6ff',
    mid: '#b3ecff',
    bottom: '#fff1b8',
    water: '#00a8c0',
    sun: '#fff7ae',
    ink: '#0b2b3a',
    accent: '#ff7a1a',
    sunH: 0.26,
    palms: true,
  },
  {
    id: 'nights',
    label: 'Vice Nights',
    top: '#0a0518',
    mid: '#24104d',
    bottom: '#6a86d8',
    water: '#16265e',
    sun: '#ff5da2',
    ink: '#f5f0ff',
    accent: '#00e5ff',
    sunH: 0.3,
    palms: false,
  },
  {
    id: 'dusk',
    label: 'Palm Dusk',
    top: '#2a1748',
    mid: '#a8346e',
    bottom: '#ff8c42',
    water: '#452a66',
    sun: '#ffb347',
    ink: '#ffe9f3',
    accent: '#ffd166',
    sunH: 0.38,
    palms: true,
  },
  {
    id: 'neon',
    label: 'Neon Streets',
    top: '#0f0320',
    mid: '#360a55',
    bottom: '#0c3547',
    water: '#0a2540',
    sun: '#ff2e88',
    ink: '#e8fff9',
    accent: '#39ff88',
    sunH: 0.3,
    palms: false,
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Eight multi-panel layouts. Cells are fractions of the inner poster
// (0..1), so the same layout works at any export size. `pop` marks the
// Pop-Out layout, where the hero photo breaks out of the frame.
export const LAYOUTS = [
  { id: 'hero', label: 'Hero', pop: false, cells: [{ x: 0, y: 0, w: 1, h: 1 }] },
  {
    id: 'duo',
    label: 'Duo',
    pop: false,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: 'trio',
    label: 'Trio',
    pop: false,
    cells: [
      { x: 0, y: 0, w: 1, h: 0.58 },
      { x: 0, y: 0.58, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0.58, w: 0.5, h: 0.42 },
    ],
  },
  {
    id: 'quad',
    label: 'Quad',
    pop: false,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'strip',
    label: 'Strip',
    pop: false,
    cells: [0, 1, 2, 3].map((i) => ({ x: 0, y: i / 4, w: 1, h: 0.25 })),
  },
  {
    id: 'columns',
    label: 'Columns',
    pop: false,
    cells: [
      { x: 0, y: 0, w: 0.34, h: 1 },
      { x: 0.34, y: 0, w: 0.33, h: 1 },
      { x: 0.67, y: 0, w: 0.33, h: 1 },
    ],
  },
  {
    id: 'mosaic',
    label: 'Mosaic',
    pop: false,
    cells: [
      { x: 0, y: 0, w: 0.55, h: 1 },
      { x: 0.55, y: 0, w: 0.45, h: 0.25 },
      { x: 0.55, y: 0.25, w: 0.45, h: 0.25 },
      { x: 0.55, y: 0.5, w: 0.45, h: 0.25 },
      { x: 0.55, y: 0.75, w: 0.45, h: 0.25 },
    ],
  },
  { id: 'popout', label: 'Pop-Out', pop: true, cells: [{ x: 0, y: 0, w: 1, h: 1 }] },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// The three display faces, all under the SIL Open Font License.
export const TYPEFACES = [
  { id: 'anton', label: 'Anton', family: 'Anton' },
  { id: 'bebas', label: 'Bebas Neue', family: 'Bebas Neue' },
  { id: 'pacifico', label: 'Pacifico', family: 'Pacifico' },
];

export function faceById(id) {
  return TYPEFACES.find((f) => f.id === id) || TYPEFACES[0];
}

// The six bundled samples: original art direction, drawn for this app.
// `role` is the name tag painted on the panel itself in the poster.
export const SAMPLES = [
  { file: 'samples/ocean-drive.jpg', label: 'Ocean Drive', role: 'THE KINGPIN' },
  { file: 'samples/leonida-beach.jpg', label: 'Leonida Beach', role: 'THE LOOKOUT' },
  { file: 'samples/neon-street.jpg', label: 'Neon Street', role: 'THE DEALER' },
  { file: 'samples/palm-court.jpg', label: 'Palm Court', role: 'THE FIXER' },
  { file: 'samples/yacht-club.jpg', label: 'Yacht Club', role: 'THE GETAWAY' },
  { file: 'samples/midnight-diner.jpg', label: 'Midnight Diner', role: 'THE WHEELMAN' },
];

// Vice City districts for the location stamp.
export const DISTRICTS = [
  'Ocean Drive',
  'Leonida Beach',
  'Vice Point',
  'Palm Court',
  'Yacht Club',
  'Midnight Diner',
];

// Fictional Vice City radio stations with a default now-playing track each.
export const STATIONS = [
  { id: 'vicefm', name: 'Vice City FM 98.7', track: 'Sunset Strip — “Pink Horizon”' },
  { id: 'leonida', name: 'Radio Leonida 102.4', track: 'Wave Riders — “Salt Air”' },
  { id: 'oceanam', name: 'Ocean Drive AM 640', track: 'The Flamingos — “Hotel Row”' },
  { id: 'neon', name: 'Neon Nights 89.1', track: 'Night Drive — “Chrome Rain”' },
];

export function stationById(id) {
  return STATIONS.find((s) => s.id === id) || STATIONS[0];
}

// Heist-story pools for the "Spin a heist" button: all original lines.
// A spin picks one name, one objective, one reward and one tagline.
export const HEISTS = {
  names: [
    'The Starfish Heist',
    'The Marlin Job',
    'The Pink Flamingo Score',
    'The Causeway Run',
    'The Diner Double-Cross',
    'The Yacht Club Caper',
  ],
  objectives: [
    'Steal the pink convertible from the hotel valet',
    'Swap the briefcase on the marina dock',
    'Crack the safe behind the diner counter',
    'Drive the getaway boat under the causeway',
    'Photograph the crew without showing a face',
    'Lift the diamonds from the penthouse',
  ],
  rewards: ['$310,000', '$150,000', '$500,000', '$80,000', '$1,200,000', '$45,000'],
  taglines: [
    'The city never sleeps, and neither do we',
    'Every sunset is a getaway',
    'Six friends, one long night',
    'Paradise has a price',
    'Get in, get rich, get out',
    'Welcome back to Leonida',
  ],
};

// Sticker emblems the user can stamp onto the poster. Each kind is drawn
// in code (see fx.js) — no image assets needed.
export const STICKERS = [
  { id: 'star', label: 'Star' },
  { id: 'palm', label: 'Palm' },
  { id: 'skull', label: 'Skull' },
  { id: 'crown', label: 'Crown' },
  { id: 'dice', label: 'Dice' },
  { id: 'bolt', label: 'Bolt' },
];

// Title treatments. `solid` is a flat fill with a neon shadow, `chrome`
// is a striped retro-chrome extrusion, `outline` is a hollow stroke.
export const TITLE_STYLES = [
  { id: 'solid', label: 'Solid' },
  { id: 'chrome', label: 'Retro chrome' },
  { id: 'outline', label: 'Outline' },
];

// Export sizes. The first three are the required post sizes; Story is a
// bonus vertical format for social stories.
export const EXPORTS = [
  { id: 'square', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
  { id: 'story', label: 'Story 1080 × 1920', w: 1080, h: 1920 },
];

// Fresh poster state for a new cover. `focus` on a panel is the face-aware
// crop point (0..1 in image space) or null; `stickers` are emblem stamps
// in poster space (0..1); `accent` overrides the grade accent when set.
export function freshPoster() {
  return {
    layout: 'hero',
    grade: 'ocean',
    title: 'VICE CITY',
    subtitle: 'LEONIDA',
    tagline: 'Welcome back to Leonida',
    titleFont: 'anton',
    subFont: 'bebas',
    titleColor: '#ffffff',
    titleStyle: 'chrome',
    accent: null,
    banner: 'top',
    tilt: -4,
    titleSize: 1.0,
    // GTA HUD: wanted stars, health/armor, district stamp, mission card,
    // radio ticker, end-card stamp, worn print. All drawn in code.
    wanted: 3,
    health: 78,
    armor: 45,
    district: 'Ocean Drive',
    missionName: 'The Starfish Heist',
    missionObjective: 'Steal the pink convertible from the hotel valet',
    missionReward: '$310,000',
    radio: 'vicefm',
    nowPlaying: 'Sunset Strip — “Pink Horizon”',
    stamp: 'none',
    worn: false,
    // Poster extras: billing block + studio seal, sticker stamps, HUD on/off.
    hud: true,
    billing: true,
    stickers: [],
    panels: SAMPLES.map((s) => ({
      src: s.file,
      zoom: 1.0,
      panX: 0.5,
      panY: 0.5,
      flip: false,
      focus: null,
    })),
    selected: 0,
  };
}
