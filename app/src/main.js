// Neon Shore Cover Studio — the editor wiring: load photos, crop and place them per
// panel, flip one panel's photo, pick a layout, grade and size, letter the caption
// and export PNGs. A `?shot=` query instead builds a fixed scene for a screenshot
// (see ./shots.js).

import { drawCover, GRADES, LAYOUTS, SIZES, lastPanels } from './cover.js';
import { freshState, panelsForLayout, serializeState, restoreState, makeHistory, clampPanelCrop, emptyPanel, resetPanelCrop, filledPanelCount } from './state.js';
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
  $('flip').classList.toggle('flip-on', !!(panel && panel.flip));
  $('flip').textContent = panel && panel.flip ? 'Flipped ✓' : 'Flip photo';
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
  state.panels[index] = { ...emptyPanel(), img, src };
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
  state.panels[state.selected] = emptyPanel();
  redraw();
  setStatus(`Cleared panel ${state.selected + 1}.`);
}

function flipPanel() {
  const panel = state.panels[state.selected];
  if (!panel || !panel.img) { setStatus('Load a photo into the selected panel first.'); return; }
  history.push(serializeState(state));
  panel.flip = !panel.flip;
  redraw();
  setStatus(panel.flip ? `Panel ${state.selected + 1} mirrored.` : `Panel ${state.selected + 1} back to normal.`);
}

function surpriseMe() {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  const layout = layouts[Math.floor(Math.random() * layouts.length)];
  const grade = grades[Math.floor(Math.random() * grades.length)];
  history.push(serializeState(state));
  state.layout = layout;
  state.grade = grade;
  state.panels = panelsForLayout(state, state.layout);
  state.selected = 0;
  syncButtons();
  redraw();
  setStatus(`Surprise: ${LAYOUTS[layout].label} + ${GRADES[grade].label}.`);
}

function resetCover() {
  history.push(serializeState(state));
  const keepSize = state.size;
  state = freshState();
  state.size = keepSize;
  state.panels = panelsForLayout(state, state.layout);
  syncInputs();
  redraw();
  setStatus('Cover reset — fresh Vice Grid, Sunset Strip.');
}

function exportSize(key, silent) {
  const size = SIZES[key];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, { ...state, selected: null });
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed — the canvas came back empty. Try again.');
        resolve(false);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-shore-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      if (!silent) setStatus(`Saved neon-shore-${size.w}x${size.h}.png`);
      resolve(true);
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
$('flip').addEventListener('click', flipPanel);
$('surprise').addEventListener('click', surpriseMe);
$('reset').addEventListener('click', resetCover);

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
$('frame').addEventListener('change', (e) => {
  history.push(serializeState(state));
  state.frame = e.target.checked;
  redraw();
  setStatus(state.frame ? 'Poster frame on.' : 'Poster frame off — edge to edge.');
});
$('zoom').addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Number(e.target.value) / 100;
  clampPanelCrop(panel);
  redraw();
});
// A slider drag is one undo step: commit when the drag ends, not on every tick.
$('zoom').addEventListener('change', () => { commit(); });
$('centerPhoto').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  history.push(serializeState(state));
  resetPanelCrop(panel);
  redraw();
  setStatus(`Panel ${state.selected + 1} re-centred.`);
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

function panelAt(p) {
  return lastPanels.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
}

let dragging = false;
let dragStart = null;
let dragPanel = null;

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const index = panelAt(p);
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
  clampPanelCrop(panel);
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

// Double-click a panel to cycle the selection through the panels.
canvas.addEventListener('dblclick', (e) => {
  const index = panelAt(canvasPoint(e));
  if (index < 0) return;
  state.selected = (state.selected + 1) % state.panels.length;
  redraw();
  setStatus(`Panel ${state.selected + 1} of ${state.panels.length} selected — ${filledPanelCount(state)} filled.`);
});

// A wheel burst is one undo step: commit once when a burst starts, then zoom freely.
let lastWheelCommit = 0;
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel || !panel.img) return;
  const now = Date.now();
  if (now - lastWheelCommit > 600) {
    history.push(serializeState(state));
    lastWheelCommit = now;
  }
  panel.zoom = (panel.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.93);
  clampPanelCrop(panel);
  redraw();
}, { passive: false });

// --- Keyboard: [ ] switch panel, arrows nudge the selected photo.

let lastNudgeCommit = 0;
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  const panel = state.panels[state.selected];
  if (e.key === '[' || e.key === ']') {
    const n = state.panels.length;
    state.selected = (state.selected + (e.key === ']' ? 1 : n - 1)) % n;
    redraw();
    return;
  }
  if (!panel || !panel.img) return;
  const step = 0.02;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const move = moves[e.key];
  if (!move) return;
  e.preventDefault();
  // Arrow-key nudges coalesce: one undo step per burst, like the wheel.
  const now = Date.now();
  if (now - lastNudgeCommit > 600) {
    history.push(serializeState(state));
    lastNudgeCommit = now;
  }
  panel.ox += move[0];
  panel.oy += move[1];
  clampPanelCrop(panel);
  redraw();
});

function syncButtons() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
}

function syncInputs() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('tagline').value = state.tagline;
  $('heat').value = String(state.heat);
  $('grain').checked = state.grain !== false;
  $('vignette').checked = state.vignette !== false;
  $('frame').checked = state.frame !== false;
  syncButtons();
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
