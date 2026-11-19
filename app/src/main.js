// Neon Shore Cover Studio — wires the editor: pick photos, crop and position them per
// panel, choose a layout, grade and size, letter the caption, export PNGs. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCover, GRADES, LAYOUTS, SIZES, lastPanels } from './cover.js';
import { freshState, panelsForLayout, serializeState, restoreState, makeHistory } from './state.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const $ = (id) => document.getElementById(id);
const status = $('status');

let state = freshState();
state.panels = panelsForLayout(state, state.layout);
const history = makeHistory();

function sizeOf() {
  return SIZES[state.size] || SIZES['1080x1080'];
}

function redraw() {
  const size = sizeOf();
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state, { selection: true });
  $('undo').disabled = !history.canUndo;
  $('redo').disabled = !history.canRedo;
  const panel = state.panels[state.selected];
  $('zoom').value = panel ? String(Math.round((panel.zoom || 1) * 100)) : '100';
  $('zoomLabel').textContent = `${$('zoom').value}%`;
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
}

function commit() {
  history.push(serializeState(state));
  redraw();
}

function setStatus(text) {
  status.textContent = text;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function resolveSrc(src) {
  if (!src) return null;
  if (src.startsWith('sample:')) return loadImage(`samples/${src.slice(7)}.jpg`);
  return loadImage(src);
}

function setPanelPhoto(index, img, src) {
  history.push(serializeState(state));
  state.panels[index] = { img, src, zoom: 1, ox: 0, oy: 0 };
  redraw();
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  setPanelPhoto(state.selected, img, `sample:${name}`);
  setStatus(`Loaded sample ${name} into panel ${state.selected + 1}.`);
}

function fillAllPanels() {
  const source = state.panels[state.selected];
  if (!source || !source.img) { setStatus('Load a photo into the selected panel first.'); return; }
  history.push(serializeState(state));
  state.panels = state.panels.map(() => ({ ...source }));
  redraw();
  setStatus('Filled every panel with the selected photo.');
}

function clearPanel() {
  history.push(serializeState(state));
  state.panels[state.selected] = { img: null, src: null, zoom: 1, ox: 0, oy: 0 };
  redraw();
  setStatus(`Cleared panel ${state.selected + 1}.`);
}

function exportSize(key, silent) {
  const size = SIZES[key];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, { ...state, selected: null });
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-shore-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      if (!silent) setStatus(`Saved neon-shore-${size.w}x${size.h}.png`);
      resolve();
    }, 'image/png');
  });
}

async function exportAllSizes() {
  for (const key of Object.keys(SIZES)) await exportSize(key, true);
  setStatus('Saved all three sizes: 1080×1080, 1080×1350, 1920×1080.');
}

// --- Controls ---------------------------------------------------------------

$('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  setPanelPhoto(state.selected, img, url);
  setStatus(`Loaded ${file.name} into panel ${state.selected + 1}. Photos never leave this machine.`);
  e.target.value = '';
});

document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', () => loadSample(btn.dataset.sample));
});
$('fillAll').addEventListener('click', fillAllPanels);
$('clearPanel').addEventListener('click', clearPanel);

document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (state.layout === btn.dataset.layout) return;
    history.push(serializeState(state));
    state.layout = btn.dataset.layout;
    state.panels = panelsForLayout(state, state.layout);
    state.selected = 0;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
    setStatus(`Layout: ${LAYOUTS[state.layout].label}.`);
  });
});

document.querySelectorAll('[data-grade]').forEach((btn) => {
  btn.addEventListener('click', () => {
    history.push(serializeState(state));
    state.grade = btn.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
    setStatus(`Grade: ${GRADES[state.grade].label}.`);
  });
});

document.querySelectorAll('[data-size]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
    setStatus(`Export size: ${SIZES[state.size].label}.`);
  });
});

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
$('heat').addEventListener('input', (e) => { state.heat = Number(e.target.value); redraw(); });
$('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
$('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });
$('zoom').addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Number(e.target.value) / 100;
  redraw();
});
$('centerPhoto').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  history.push(serializeState(state));
  panel.ox = 0; panel.oy = 0; panel.zoom = 1;
  redraw();
});

$('undo').addEventListener('click', async () => {
  const prev = history.undo(serializeState(state));
  if (!prev) return;
  state = await restoreState(prev, resolveSrc);
  syncInputs();
  redraw();
});
$('redo').addEventListener('click', async () => {
  const next = history.redo(serializeState(state));
  if (!next) return;
  state = await restoreState(next, resolveSrc);
  syncInputs();
  redraw();
});

$('export').addEventListener('click', () => exportSize(state.size));
$('exportAll').addEventListener('click', exportAllSizes);

// --- Canvas interaction: click a panel to select it, drag to pan, wheel to zoom.

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

let dragging = false;
let dragStart = null;
let dragPanel = null;

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const index = lastPanels.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  if (index < 0) return;
  if (index !== state.selected) {
    state.selected = index;
    redraw();
  }
  dragging = true;
  dragStart = p;
  dragPanel = { ...state.panels[index] };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging || !dragPanel) return;
  const p = canvasPoint(e);
  const panel = state.panels[state.selected];
  const rect = lastPanels[state.selected];
  if (!panel || !rect) return;
  panel.ox = dragPanel.ox + (p.x - dragStart.x) / rect.w;
  panel.oy = dragPanel.oy + (p.y - dragStart.y) / rect.h;
  panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox));
  panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy));
  redraw();
});

canvas.addEventListener('pointerup', () => {
  if (dragging && dragPanel) {
    const panel = state.panels[state.selected];
    if (panel && (panel.ox !== dragPanel.ox || panel.oy !== dragPanel.oy)) {
      // Rewind to the pre-drag crop, then commit the move as one undo step.
      const moved = { ...panel };
      state.panels[state.selected] = dragPanel;
      history.push(serializeState(state));
      state.panels[state.selected] = moved;
      redraw();
    }
  }
  dragging = false;
  dragPanel = null;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel || !panel.img) return;
  panel.zoom = Math.max(1, Math.min(4, (panel.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

function syncInputs() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('tagline').value = state.tagline;
  $('heat').value = String(state.heat);
  $('grain').checked = state.grain !== false;
  $('vignette').checked = state.vignette !== false;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
}

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
  } catch (_) { /* system fonts are the fallback */ }
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, (shotState) => {
      state = shotState;
      syncInputs();
      redraw();
    });
  } else {
    syncInputs();
    redraw();
  }
}

boot();
