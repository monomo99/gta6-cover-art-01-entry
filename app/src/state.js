// Neon Shore Cover Studio — the editor's state, kept apart from the drawing.
// A cover is one plain object: its layout, grade, export size, caption words, a
// heat rating, three effect switches, which panel is selected, and the panels
// themselves. One panel's photo is { img, src, zoom, ox, oy, flip } — img is the
// live Image element, src is the form that survives a save ('sample:<name>' or a
// data: URL), zoom/ox/oy place and crop the photo, and flip mirrors it.

import { LAYOUTS } from './cover.js';

/** A brand-new cover: Vice Grid, the Sunset Strip grade, square, frame switched on. */
export function freshState() {
  return {
    layout: 'vice-grid',
    size: '1080x1080',
    grade: 'sunset',
    title: 'NEON SHORE',
    subtitle: 'a sunset story',
    tagline: 'EST. 2026 · SUNSET STATE',
    heat: 5,
    grain: true,
    vignette: true,
    frame: true,
    selected: 0,
    panels: [],
  };
}

/** A single empty photo slot, mirror switch off. */
export function emptyPanel() {
  return { img: null, src: null, zoom: 1, ox: 0, oy: 0, flip: false };
}

/** How many photo slots a given layout shows. */
export function panelCountForLayout(layout) {
  return (LAYOUTS[layout] || LAYOUTS['vice-grid']).panels;
}

/** A fresh set of empty slots for a layout. */
export function emptyPanels(layout) {
  return Array.from({ length: panelCountForLayout(layout) }, () => emptyPanel());
}

/** Grow or shrink the panel list when the layout changes, keeping photos that fit. */
export function panelsForLayout(state, layout) {
  const n = panelCountForLayout(layout);
  const kept = state.panels.slice(0, n);
  while (kept.length < n) kept.push(emptyPanel());
  return kept;
}

/** Keep a panel's crop inside its frame: the photo can never be dragged out of view. */
export function clampPanelCrop(panel) {
  panel.zoom = Math.max(1, Math.min(4, panel.zoom || 1));
  panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox || 0));
  panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy || 0));
  panel.flip = !!panel.flip;
  return panel;
}

/** Back to the full photo, centred — the mirror switch stays as it was. */
export function resetPanelCrop(panel) {
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  return panel;
}

/** How many panels currently hold a photo. */
export function filledPanelCount(state) {
  return state.panels.filter((p) => p && p.img).length;
}

/** The serialisable form of a cover (images as src strings) for the undo history. */
export function serializeState(state) {
  return JSON.stringify({
    ...state,
    panels: state.panels.map((p) => ({ src: p.src, zoom: p.zoom, ox: p.ox, oy: p.oy, flip: !!p.flip })),
  });
}

/** Rebuild a cover from its serialised form; `resolve` turns a src back into an Image. */
export async function restoreState(json, resolve) {
  const raw = JSON.parse(json);
  const state = { ...raw, frame: raw.frame !== false, panels: [] };
  for (const p of raw.panels) {
    const img = p.src ? await resolve(p.src) : null;
    state.panels.push(clampPanelCrop({ img, src: p.src, zoom: p.zoom ?? 1, ox: p.ox ?? 0, oy: p.oy ?? 0, flip: !!p.flip }));
  }
  return state;
}

/** A small undo/redo history over serialised covers. */
export function makeHistory(limit = 30) {
  let past = [];
  let future = [];
  return {
    push(serialised) {
      past.push(serialised);
      if (past.length > limit) past.shift();
      future = [];
    },
    undo(current) {
      if (!past.length) return null;
      future.push(current);
      return past.pop();
    },
    redo(current) {
      if (!future.length) return null;
      past.push(current);
      return future.pop();
    },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
  };
}
