// Neon Shore Cover Studio — editor state: one cover, its panels and its history.
// A panel photo is { img, src, zoom, ox, oy }: img is the loaded Image, src is the
// serialisable form ('sample:<name>' or a data: URL), zoom/ox/oy crop and position it.

import { LAYOUTS } from './cover.js';

/** A fresh cover: Vice Grid, Sunset Strip grade, square size, empty panels. */
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
    selected: 0,
    panels: [],
  };
}

/** Panel slots for a layout, each an empty photo slot. */
export function emptyPanels(layout) {
  const n = (LAYOUTS[layout] || LAYOUTS['vice-grid']).panels;
  return Array.from({ length: n }, () => ({ img: null, src: null, zoom: 1, ox: 0, oy: 0 }));
}

/** Resize the panel list when the layout changes, keeping photos that still fit. */
export function panelsForLayout(state, layout) {
  const n = (LAYOUTS[layout] || LAYOUTS['vice-grid']).panels;
  const kept = state.panels.slice(0, n);
  while (kept.length < n) kept.push({ img: null, src: null, zoom: 1, ox: 0, oy: 0 });
  return kept;
}

/** Serialisable state (images as src strings) for undo history. */
export function serializeState(state) {
  return JSON.stringify({
    ...state,
    panels: state.panels.map((p) => ({ src: p.src, zoom: p.zoom, ox: p.ox, oy: p.oy })),
  });
}

/** Restores a serialised state; `resolve` turns a src back into a loaded Image. */
export async function restoreState(json, resolve) {
  const raw = JSON.parse(json);
  const state = { ...raw, panels: [] };
  for (const p of raw.panels) {
    const img = p.src ? await resolve(p.src) : null;
    state.panels.push({ img, src: p.src, zoom: p.zoom ?? 1, ox: p.ox ?? 0, oy: p.oy ?? 0 });
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
