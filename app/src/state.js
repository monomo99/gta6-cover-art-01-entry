// Neon Shore Cover Studio — shared poster state.
// A plain classic script: every top-level name here is visible to the
// scripts the page loads after it (cover.js, shots.js, main.js).

// The three bundled sample photos (free to use, shipped under app/samples/).
// `focus` marks where each photo's action lives, as fractions of the
// picture: when a panel is wider or taller than the photo, the crop
// window centers on that point instead of the dead middle, so the
// important part stays in frame. Club's dancing duo fills the middle
// of the frame under the disco ball, so its focus sits just below the
// middle at y 0.45. Jet Ski's two riders cut across the water with the
// sunset skyline behind them, so its focus sits a touch above the
// middle at y 0.4, keeping both riders' faces in a wide crop. Rooftop's
// duo crouches high in the frame while the helicopter sweeps the street
// below, so its focus rides up at y 0.35: a centered crop would push
// their heads out of a wide panel.
const SAMPLE_PHOTOS = {
  club: { label: 'Club', src: 'samples/club.jpg', focus: { x: 0.5, y: 0.45 } },
  jetski: { label: 'Jet Ski', src: 'samples/jetski.jpg', focus: { x: 0.5, y: 0.4 } },
  rooftop: { label: 'Rooftop', src: 'samples/rooftop.jpg', focus: { x: 0.5, y: 0.35 } },
};

// The order the samples rotate through the panels by default.
const SAMPLE_KEYS = ['club', 'jetski', 'rooftop'];

// Layouts: how many panels each one shows and what it is called in the UI.
const LAYOUTS = {
  'vice-grid': { panels: 3, label: 'Vice Grid', hint: 'A wide feature panel with two stacked beside it.' },
  nine: { panels: 9, label: 'Nine', hint: 'Nine panels in a 3 by 3 grid.' },
  snapshots: { panels: 3, label: 'Snapshots', hint: 'Three leaning snapshot prints in a row.' },
};

// Colour grades. Each grade carries the sky gradient for the lettering
// band, the tint washed over the photos, the caption colour and the
// accent colour used for the script subtitle and the frame's inner line.
const GRADES = {
  sunset: {
    label: 'Sunset',
    skyTop: '#ff9a3d', skyMid: '#ff5e7a', skyBottom: '#7a2d8f',
    tint: '#ff6a3d', tintAlpha: 0.16,
    caption: '#ffffff', accent: '#ffd166', band: '#1c0b2e',
  },
  neon: {
    label: 'Neon',
    skyTop: '#ff2e88', skyMid: '#7b2ff7', skyBottom: '#0b1035',
    tint: '#ff2e88', tintAlpha: 0.18,
    caption: '#ffffff', accent: '#2de2ff', band: '#0b1035',
  },
  golden: {
    label: 'Golden',
    skyTop: '#ffd166', skyMid: '#f4a259', skyBottom: '#8c4a1f',
    tint: '#ffb703', tintAlpha: 0.15,
    caption: '#fff8e7', accent: '#7a2d0e', band: '#3d1c07',
  },
  dusk: {
    label: 'Dusk',
    skyTop: '#5b4b8a', skyMid: '#2d2a6b', skyBottom: '#120e2e',
    tint: '#6c5ce7', tintAlpha: 0.17,
    caption: '#f2efff', accent: '#ff9ff3', band: '#120e2e',
  },
};

// The three post sizes the app exports.
const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape · 1920 × 1080' },
};

// One panel's crop settings. `photo` is a sample key or 'custom';
// a custom photo keeps its own loaded image on `customImg`.
function freshPanel(photo) {
  return { photo: photo, flip: false, zoom: 1, ox: 0, oy: 0, customImg: null, customName: '' };
}

// The live poster state. Nine panels are kept so every layout has enough;
// a layout simply uses the first of its panel count.
// Default cover caption: the cover reads as a GTA 6 cover — big "GTA VI"
// title with the script "vice city" above it.
const STATE = {
  layout: 'vice-grid',
  grade: 'sunset',
  size: '1080x1080',
  title: 'GTA VI',
  subtitle: 'vice city',
  frame: true,
  halftone: true,
  birds: true,
  panels: Array.from({ length: 9 }, (_, i) => freshPanel(SAMPLE_KEYS[i % SAMPLE_KEYS.length])),
};

// How many panels the current layout shows.
function activePanelCount() {
  return LAYOUTS[STATE.layout].panels;
}

// The panels the current layout actually draws.
function activePanels() {
  return STATE.panels.slice(0, activePanelCount());
}

// Reset every panel to the sample photos in rotation.
function resetPanels() {
  for (let i = 0; i < STATE.panels.length; i++) {
    STATE.panels[i] = freshPanel(SAMPLE_KEYS[i % SAMPLE_KEYS.length]);
  }
}
