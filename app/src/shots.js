// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the exported cover alone. Query knobs: layout, grade, size, title,
// subtitle, tagline, heat, photo (one sample for every panel) and panels (a comma list
// of samples, one per panel). window.__shotReady is set once the cover is painted.

import { drawCover, SIZES } from './cover.js';
import { freshState, panelsForLayout } from './state.js';

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch (_) { /* fall back to system fonts */ }
}

/** Builds the scene state from the query and paints it. `apply` hands the state to the editor. */
export async function runShot(shot, query, apply) {
  const state = freshState();
  state.layout = query.get('layout') || 'vice-grid';
  state.grade = query.get('grade') || 'sunset';
  state.size = query.get('size') || '1080x1080';
  state.title = query.get('title') || 'NEON SHORE';
  state.subtitle = query.get('subtitle') ?? 'a sunset story';
  state.tagline = query.get('tagline') ?? 'EST. 2026 · SUNSET STATE';
  state.heat = Number(query.get('heat') || 5);
  state.panels = panelsForLayout(state, state.layout);
  const names = (query.get('panels') || '').split(',').filter(Boolean);
  const single = query.get('photo') || 'pier';
  for (let i = 0; i < state.panels.length; i++) {
    const name = names[i] || single;
    const img = await loadImage(`samples/${name}.jpg`);
    state.panels[i] = { img, src: `sample:${name}`, zoom: 1, ox: 0, oy: 0 };
  }
  // Keep the shot crops neutral: cover-fit at zoom 1, centred, so faces stay in frame.
  state.panels.forEach((p) => { p.zoom = 1; p.ox = 0; p.oy = 0; });
  await loadFonts();
  const size = SIZES[state.size] || SIZES['1080x1080'];
  const canvas = document.getElementById('cover');
  canvas.width = size.w;
  canvas.height = size.h;
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    drawCover(canvas, { ...state, selected: null });
  } else {
    apply(state);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
