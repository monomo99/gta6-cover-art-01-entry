// Neon Shore Cover Studio — shared poster state.
// Plain classic script: every top-level name here is visible to the later
// scripts the page loads (cover.js, shots.js, main.js).

// The two bundled sample photos (free to use, shipped under app/samples/).
const SAMPLE_PHOTOS = {
  boulevard: { label: 'Boulevard', src: 'samples/boulevard.jpg' },
  pier: { label: 'Pier', src: 'samples/pier.jpg' },
};

// Layouts: how many panels each one shows and what it is called in the UI.
const LAYOUTS = {
  'vice-grid': { panels: 3, label: 'Vice Grid', hint: 'One wide feature panel plus two stacked panels.' },
  nine: { panels: 9, label: 'Nine', hint: 'A 3 by 3 grid of panels.' },
  snapshots: { panels: 3, label: 'Snapshots', hint: 'Three tilted snapshot prints in a row.' },
};

// Colour grades. Each grade carries the sky gradient for the caption band,
// the tint washed over the photos, the caption colour and the accent colour
// used for the script subtitle and the frame's inner line.
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
const STATE = {
  layout: 'vice-grid',
  grade: 'sunset',
  size: '1080x1080',
  title: 'NEON SHORE',
  subtitle: 'vice city nights',
  frame: true,
  halftone: true,
  birds: true,
  panels: [
    freshPanel('boulevard'),
    freshPanel('pier'),
    freshPanel('boulevard'),
    freshPanel('pier'),
    freshPanel('boulevard'),
    freshPanel('pier'),
    freshPanel('boulevard'),
    freshPanel('pier'),
    freshPanel('boulevard'),
  ],
};

// How many panels the current layout shows.
function activePanelCount() {
  return LAYOUTS[STATE.layout].panels;
}

// The panels the current layout actually draws.
function activePanels() {
  return STATE.panels.slice(0, activePanelCount());
}

// Reset every panel to the alternating sample photos.
function resetPanels() {
  const keys = ['boulevard', 'pier'];
  for (let i = 0; i < STATE.panels.length; i++) {
    STATE.panels[i] = freshPanel(keys[i % 2]);
  }
}
