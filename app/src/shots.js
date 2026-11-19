// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the exported cover alone. Query knobs: layout, grade, size, title,
// subtitle, tagline, heat, photo (one sample for every panel), panels (a comma list of
// samples, one per panel) and zooms (a comma list of zoom factors, one per panel).
// window.__shotReady is set once the cover is painted.

import { drawCover, SIZES } from './cover.js';
import { freshState, panelsForLayout, clampPanelCrop } from './state.js';

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
  const zooms = (query.get('zooms') || '').split(',').map(Number);
  const single = query.get('photo') || 'pier';
  // Load every panel photo in parallel: a shot waits on the slowest, not the sum.
  const loaded = await Promise.all(
    state.panels.map((_, i) => loadImage(`samples/${names[i] || single}.jpg`)),
  );
  loaded.forEach((img, i) => {
    const name = names[i] || single;
    const zoom = Number.isFinite(zooms[i]) && zooms[i] > 0 ? zooms[i] : 1;
    state.panels[i] = clampPanelCrop({ img, src: `sample:${name}`, zoom, ox: 0, oy: 0 });
  });
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
