// Neon Shore Cover Studio — editor state: one cover, its panels and its history.
// A panel photo is { img, src, zoom, ox, oy, flip }: img is the loaded Image, src is
// the serialisable form ('sample:<name>' or a data: URL), zoom/ox/oy crop and position
// it, flip mirrors it horizontally. The cover also carries a poster `frame` toggle.

import { LAYOUTS } from './cover.js';

/** A fresh cover: Vice Grid, Sunset Strip grade, square size, empty panels, frame on. */
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

/** One empty photo slot, with the flip switch off. */
export function emptyPanel() {
  return { img: null, src: null, zoom: 1, ox: 0, oy: 0, flip: false };
}

/** How many photo slots a layout shows. */
export function panelCountForLayout(layout) {
  return (LAYOUTS[layout] || LAYOUTS['vice-grid']).panels;
}

/** Panel slots for a layout, each an empty photo slot. */
export function emptyPanels(layout) {
  return Array.from({ length: panelCountForLayout(layout) }, () => emptyPanel());
}

/** Resize the panel list when the layout changes, keeping photos that still fit. */
export function panelsForLayout(state, layout) {
  const n = panelCountForLayout(layout);
  const kept = state.panels.slice(0, n);
  while (kept.length < n) kept.push(emptyPanel());
  return kept;
}

/** Clamps a panel's crop so the photo can never be dragged out of its frame. */
export function clampPanelCrop(panel) {
  panel.zoom = Math.max(1, Math.min(4, panel.zoom || 1));
  panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox || 0));
  panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy || 0));
  panel.flip = !!panel.flip;
  return panel;
}

/** Resets a panel's crop to the full photo, centred — the mirror switch stays put. */
export function resetPanelCrop(panel) {
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  return panel;
}

/** How many panels hold a photo. */
export function filledPanelCount(state) {
  return state.panels.filter((p) => p && p.img).length;
}

/** Serialisable state (images as src strings) for undo history. */
export function serializeState(state) {
  return JSON.stringify({
    ...state,
    panels: state.panels.map((p) => ({ src: p.src, zoom: p.zoom, ox: p.ox, oy: p.oy, flip: !!p.flip })),
  });
}

/** Restores a serialised state; `resolve` turns a src back into a loaded Image. */
export async function restoreState(json, resolve) {
  const raw = JSON.parse(json);
  const state = { ...raw, frame: raw.frame !== false, panels: [] };
  for (const p of raw.panels) {
    const img = p.src ? await resolve(p.src) : null;
    state.panels.push(clampPanelCrop({ img, src: p.src, zoom: p.zoom ?? 1, ox: p.ox ?? 0, oy: p.oy ?? 0, flip: !!p.flip }));
  }
  return state;
}

/** Small undo/redo history over serialised states. */
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
