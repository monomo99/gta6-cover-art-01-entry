// Vice Cover Studio — state: every knob the editor owns, as plain data.
// No DOM here, no drawing here: this file only describes a cover.

/** The three post sizes the app exports, in pixels. */
export const EXPORT_SIZES = {
  square: { id: 'square', label: 'Square', width: 1080, height: 1080, note: '1080 × 1080 · feed post' },
  portrait: { id: 'portrait', label: 'Portrait', width: 1080, height: 1350, note: '1080 × 1350 · feed portrait' },
  wide: { id: 'wide', label: 'Wide', width: 1920, height: 1080, note: '1920 × 1080 · story / banner' },
};

/** The panel layouts. Each rect is a fraction of the cover: x, y, w, h. */
export const LAYOUTS = {
  hero: {
    id: 'hero', label: 'Hero', panels: 1,
    rects: [[0, 0, 1, 1]],
  },
  duo: {
    id: 'duo', label: 'Duo', panels: 2,
    rects: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
  },
  trio: {
    id: 'trio', label: 'Trio', panels: 3,
    rects: [[0, 0, 0.55, 1], [0.55, 0, 0.45, 0.5], [0.55, 0.5, 0.45, 0.5]],
  },
  quad: {
    id: 'quad', label: 'Quad', panels: 4,
    rects: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
  },
  strip: {
    id: 'strip', label: 'Strip', panels: 3,
    rects: [[0, 0, 1, 0.62], [0, 0.62, 0.5, 0.38], [0.5, 0.62, 0.5, 0.38]],
  },
  columns: {
    id: 'columns', label: 'Columns', panels: 3,
    rects: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]],
  },
};

/** The colour grades. sky is a top-to-bottom gradient; ink is the silhouette colour. */
export const GRADES = {
  sunset: {
    id: 'sunset', label: 'Sunset', swatch: 'linear-gradient(135deg,#2b1055,#ff2e88 55%,#ff9a3d)',
    sky: ['#2b1055', '#ff2e88', '#ff9a3d'], sun: '#ffd319', sunCore: '#fff3b0',
    tint: '#ff5e3a', tintAlpha: 0.16, ink: '#160a2e',
  },
  neon: {
    id: 'neon', label: 'Neon', swatch: 'linear-gradient(135deg,#05001f,#7b2ff7 55%,#00e5ff)',
    sky: ['#05001f', '#7b2ff7', '#00e5ff'], sun: '#ff2fb3', sunCore: '#ffd7f2',
    tint: '#7b2ff7', tintAlpha: 0.2, ink: '#020010',
  },
  palm: {
    id: 'palm', label: 'Palm Dusk', swatch: 'linear-gradient(135deg,#062a33,#0e7c7b 55%,#ffb347)',
    sky: ['#062a33', '#0e7c7b', '#ffb347'], sun: '#ffe66d', sunCore: '#fffbe0',
    tint: '#0e7c7b', tintAlpha: 0.14, ink: '#041e24',
  },
  rose: {
    id: 'rose', label: 'Rose', swatch: 'linear-gradient(135deg,#3b0a2e,#e0218a 55%,#ffb6c1)',
    sky: ['#3b0a2e', '#e0218a', '#ffb6c1'], sun: '#ffd319', sunCore: '#fff3b0',
    tint: '#e0218a', tintAlpha: 0.16, ink: '#26041c',
  },
  noir: {
    id: 'noir', label: 'Noir', swatch: 'linear-gradient(135deg,#0a0a0a,#3a3a3a 55%,#e8e8e8)',
    sky: ['#0a0a0a', '#3d3d3d', '#cfcfcf'], sun: '#f5f5f5', sunCore: '#ffffff',
    tint: '#000000', tintAlpha: 0.1, ink: '#000000',
  },
};

/** The lettering choices. All three fonts ship under app/fonts/ (SIL OFL). */
export const FONTS = {
  Anton: { id: 'Anton', label: 'Anton — heavy block', family: "'Anton', 'Arial Narrow', sans-serif" },
  'Bebas Neue': { id: 'Bebas Neue', label: 'Bebas Neue — tall caps', family: "'Bebas Neue', 'Arial Narrow', sans-serif" },
  Pacifico: { id: 'Pacifico', label: 'Pacifico — neon script', family: "'Pacifico', cursive" },
};

/** The title colours offered in the editor. */
export const TITLE_COLORS = ['#ffffff', '#ffd319', '#ff2e88', '#00e5ff', '#ff9a3d', '#160a2e'];

/** The sample shots bundled with the app (free to use, made for make.fun). */
export const SAMPLE_PHOTOS = [
  { key: 'samples/rooftop.jpg', label: 'Rooftop' },
  { key: 'samples/club.jpg', label: 'Club' },
  { key: 'samples/jetski.jpg', label: 'Jet ski' },
];

/** One panel's photo placement. px/py are the focal point, 0..1 across the photo. */
export function freshPanel(photo) {
  return { photo, zoom: 1.15, px: 0.5, py: 0.45, flip: false };
}

/** The cover a fresh visitor sees: three sample shots in the Trio layout. */
export function defaultState() {
  return {
    sizeId: 'wide',
    layoutId: 'trio',
    gradeId: 'sunset',
    panels: [
      freshPanel('samples/rooftop.jpg'),
      freshPanel('samples/club.jpg'),
      freshPanel('samples/jetski.jpg'),
      freshPanel('samples/rooftop.jpg'),
      freshPanel('samples/club.jpg'),
    ],
    caption: {
      title: 'VICE CITY',
      sub: 'NEON NIGHTS',
      tag: 'a sunset story in three panels',
      font: 'Anton',
      color: '#ffffff',
      accent: '#ffd319',
      size: 1,
      tilt: -2,
      position: 'bottom',
    },
    effects: { sun: true, palms: true, halftone: true, grain: true, scanlines: false, frame: true },
  };
}

/** The panel rectangles of a layout in pixels, for a cover of width × height. */
export function panelRects(layoutId, width, height) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.trio;
  return layout.rects.map(([fx, fy, fw, fh]) => ({
    x: fx * width, y: fy * height, w: fw * width, h: fh * height,
  }));
}

/** How many panels a layout shows. */
export function panelCount(layoutId) {
  return (LAYOUTS[layoutId] ?? LAYOUTS.trio).panels;
}

/** A deep copy of a state, for shuffle / undo without aliasing. */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
