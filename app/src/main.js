// Vice Cover Studio — editor wiring: uploads, layout, caption, grade and export.
// The drawing lives in cover.js, the knobs in state.js; this file only connects
// them to the page and keeps the live preview fresh after every change.

import {
  EXPORT_SIZES, FONTS, GRADES, LAYOUTS, SAMPLE_PHOTOS, TITLE_COLORS,
  cloneState, defaultState, panelCount, panelRects,
} from './state.js';
import { drawCover, exportCover } from './cover.js';

const $ = (id) => document.getElementById(id);

const state = defaultState();
let selectedPanel = 0;
const photoImages = new Map(); // photo key -> loaded HTMLImageElement
const uploads = []; // { key, label } in the order they were added
let uploadCount = 0;

/** Load an image and keep it under its key; resolves false when it cannot load. */
function loadPhoto(key, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { photoImages.set(key, img); resolve(true); };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/** The live preview: redraw the cover at the chosen export size. */
function renderPreview() {
  drawCover($('previewCanvas'), state, photoImages);
  const size = EXPORT_SIZES[state.sizeId];
  $('stageLabel').textContent = `Live preview · ${size.label} ${size.width} × ${size.height}`;
  $('exportNote').textContent = `Exports the ${size.label.toLowerCase()} ${size.width} × ${size.height} cover as a PNG download.`;
  window.__viceReady = true;
}

/** The photo tray: samples first, then the visitor's uploads. */
function buildTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  const entries = [...SAMPLE_PHOTOS, ...uploads];
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tray-empty';
    empty.textContent = 'No photos yet — add your own above.';
    tray.appendChild(empty);
    return;
  }
  for (const { key, label } of entries) {
    const img = document.createElement('img');
    img.src = key.startsWith('upload:') ? photoImages.get(key)?.src ?? '' : key;
    img.alt = label;
    img.title = `${label} — click to put in panel ${selectedPanel + 1}`;
    img.setAttribute('role', 'option');
    img.addEventListener('click', () => {
      state.panels[selectedPanel].photo = key;
      markTraySelection();
      renderPreview();
    });
    tray.appendChild(img);
  }
  markTraySelection();
}

/** Highlight the tray photo that fills the selected panel. */
function markTraySelection() {
  const current = state.panels[selectedPanel]?.photo;
  for (const img of $('photoTray').querySelectorAll('img')) {
    img.classList.toggle('selected', img.src.endsWith(current ?? '\n'));
  }
}

/** The five layout buttons, each with its little panel glyph. */
function buildLayouts() {
  const grid = $('layoutGrid');
  grid.innerHTML = '';
  for (const layout of Object.values(LAYOUTS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn';
    btn.setAttribute('aria-pressed', String(state.layoutId === layout.id));
    const glyph = document.createElement('span');
    glyph.className = `glyph ${layout.id}`;
    glyph.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < layout.panels; i++) glyph.appendChild(document.createElement('i'));
    btn.appendChild(glyph);
    btn.appendChild(document.createTextNode(layout.label));
    btn.addEventListener('click', () => {
      state.layoutId = layout.id;
      selectedPanel = Math.min(selectedPanel, panelCount(layout.id) - 1);
      buildLayouts();
      buildPanelTabs();
      syncPanelEditor();
      renderPreview();
    });
    grid.appendChild(btn);
  }
}

/** The P1..Pn tabs for the panels the current layout shows. */
function buildPanelTabs() {
  const tabs = $('panelTabs');
  tabs.innerHTML = '';
  for (let i = 0; i < panelCount(state.layoutId); i++) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'panel-tab';
    tab.textContent = `Panel ${i + 1}`;
    tab.setAttribute('aria-pressed', String(selectedPanel === i));
    tab.addEventListener('click', () => {
      selectedPanel = i;
      buildPanelTabs();
      syncPanelEditor();
      markTraySelection();
      renderPreview();
    });
    tabs.appendChild(tab);
  }
}

/** Push the selected panel's zoom/pan into the sliders and outputs. */
function syncPanelEditor() {
  const panel = state.panels[selectedPanel];
  $('zoomRange').value = String(panel.zoom);
  $('zoomOut').textContent = `${panel.zoom.toFixed(2)}×`;
  $('panXRange').value = String(Math.round(panel.px * 100));
  $('panXOut').textContent = `${Math.round(panel.px * 100)}%`;
  $('panYRange').value = String(Math.round(panel.py * 100));
  $('panYOut').textContent = `${Math.round(panel.py * 100)}%`;
  $('flipBtn').setAttribute('aria-pressed', String(panel.flip));
}

/** The title-colour swatches under the caption section. */
function buildTitleSwatches() {
  const box = $('titleSwatches');
  box.innerHTML = '';
  for (const color of TITLE_COLORS) {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch';
    sw.style.background = color;
    sw.title = color;
    sw.setAttribute('aria-label', `Title colour ${color}`);
    sw.setAttribute('aria-pressed', String(state.caption.color === color));
    sw.addEventListener('click', () => {
      state.caption.color = color;
      buildTitleSwatches();
      renderPreview();
    });
    box.appendChild(sw);
  }
}

/** The five grade swatches, each painted with its own gradient. */
function buildGradeSwatches() {
  const box = $('gradeSwatches');
  box.innerHTML = '';
  for (const grade of Object.values(GRADES)) {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch';
    sw.style.background = grade.swatch;
    sw.title = grade.label;
    sw.setAttribute('aria-label', `Grade ${grade.label}`);
    sw.setAttribute('aria-pressed', String(state.gradeId === grade.id));
    sw.addEventListener('click', () => {
      state.gradeId = grade.id;
      buildGradeSwatches();
      renderPreview();
    });
    box.appendChild(sw);
  }
}

/** The three export-size buttons. */
function buildSizeButtons() {
  const grid = $('sizeGrid');
  grid.innerHTML = '';
  for (const size of Object.values(EXPORT_SIZES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'size-btn';
    btn.setAttribute('aria-pressed', String(state.sizeId === size.id));
    btn.innerHTML = `<b>${size.label}</b>${size.width} × ${size.height}`;
    btn.addEventListener('click', () => {
      state.sizeId = size.id;
      buildSizeButtons();
      renderPreview();
    });
    grid.appendChild(btn);
  }
}

/** Export the current cover as a PNG download at the chosen size. */
function downloadPng() {
  const canvas = exportCover(state, photoImages);
  const size = EXPORT_SIZES[state.sizeId];
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${size.id}-${size.width}x${size.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

/** Shuffle the look: a new layout, grade, font and title colour, photos kept. */
function shuffleLook() {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  const fonts = Object.keys(FONTS);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layoutId = pick(layouts);
  state.gradeId = pick(grades);
  state.caption.font = pick(fonts);
  state.caption.color = pick(TITLE_COLORS);
  state.caption.tilt = Math.round(Math.random() * 10 - 5);
  selectedPanel = 0;
  $('fontSelect').value = state.caption.font;
  $('tiltRange').value = String(state.caption.tilt);
  $('tiltOut').textContent = `${state.caption.tilt}°`;
  buildLayouts();
  buildPanelTabs();
  buildGradeSwatches();
  buildTitleSwatches();
  syncPanelEditor();
  renderPreview();
}

/** Clicking the preview selects the panel under the pointer. */
function wirePreviewClicks() {
  $('previewCanvas').addEventListener('click', (event) => {
    const canvas = $('previewCanvas');
    const box = canvas.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * canvas.width;
    const y = ((event.clientY - box.top) / box.height) * canvas.height;
    const rects = panelRects(state.layoutId, canvas.width, canvas.height);
    const hit = rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    if (hit >= 0) {
      selectedPanel = hit;
      buildPanelTabs();
      syncPanelEditor();
      markTraySelection();
      renderPreview();
    }
  });
}

/** Wire every control on the page to the state it owns. */
function wireControls() {
  $('photoInput').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      uploadCount += 1;
      const key = `upload:${uploadCount}:${file.name}`;
      const url = URL.createObjectURL(file);
      await loadPhoto(key, url);
      uploads.push({ key, label: file.name });
      state.panels[selectedPanel].photo = key;
    }
    event.target.value = '';
    buildTray();
    renderPreview();
  });

  $('zoomRange').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    $('zoomOut').textContent = `${state.panels[selectedPanel].zoom.toFixed(2)}×`;
    renderPreview();
  });
  $('panXRange').addEventListener('input', (e) => {
    state.panels[selectedPanel].px = Number(e.target.value) / 100;
    $('panXOut').textContent = `${e.target.value}%`;
    renderPreview();
  });
  $('panYRange').addEventListener('input', (e) => {
    state.panels[selectedPanel].py = Number(e.target.value) / 100;
    $('panYOut').textContent = `${e.target.value}%`;
    renderPreview();
  });
  $('flipBtn').addEventListener('click', () => {
    const panel = state.panels[selectedPanel];
    panel.flip = !panel.flip;
    syncPanelEditor();
    renderPreview();
  });
  $('fillAllBtn').addEventListener('click', () => {
    const photo = state.panels[selectedPanel].photo;
    for (const panel of state.panels) panel.photo = photo;
    renderPreview();
  });

  $('titleInput').addEventListener('input', (e) => { state.caption.title = e.target.value.toUpperCase(); renderPreview(); });
  $('subInput').addEventListener('input', (e) => { state.caption.sub = e.target.value.toUpperCase(); renderPreview(); });
  $('tagInput').addEventListener('input', (e) => { state.caption.tag = e.target.value; renderPreview(); });
  $('fontSelect').addEventListener('change', (e) => { state.caption.font = e.target.value; renderPreview(); });
  $('sizeRange').addEventListener('input', (e) => {
    state.caption.size = Number(e.target.value) / 100;
    $('sizeOut').textContent = `${e.target.value}%`;
    renderPreview();
  });
  $('tiltRange').addEventListener('input', (e) => {
    state.caption.tilt = Number(e.target.value);
    $('tiltOut').textContent = `${e.target.value}°`;
    renderPreview();
  });
  $('captionPos').addEventListener('change', (e) => { state.caption.position = e.target.value; renderPreview(); });

  const fx = (id, key) => $(id).addEventListener('change', (e) => { state.effects[key] = e.target.checked; renderPreview(); });
  fx('fxSun', 'sun');
  fx('fxPalms', 'palms');
  fx('fxHalftone', 'halftone');
  fx('fxGrain', 'grain');
  fx('fxScan', 'scanlines');
  fx('fxFrame', 'frame');

  $('exportBtn').addEventListener('click', downloadPng);
  $('exportBtnTop').addEventListener('click', downloadPng);
  $('shuffleBtn').addEventListener('click', shuffleLook);
  // Keyboard shortcuts: E exports, S shuffles — ignored while typing in a field.
  document.addEventListener('keydown', (event) => {
    const tag = (event.target.tagName ?? '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || event.metaKey || event.ctrlKey) return;
    if (event.key === 'e' || event.key === 'E') downloadPng();
    if (event.key === 's' || event.key === 'S') shuffleLook();
  });
  wirePreviewClicks();
}

/** Load the bundled fonts, then the sample photos, then paint the first cover. */
async function init() {
  buildLayouts();
  buildPanelTabs();
  buildTitleSwatches();
  buildGradeSwatches();
  buildSizeButtons();
  syncPanelEditor();
  wireControls();
  try {
    await Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load('400 100px "Bebas Neue"'),
      document.fonts.load('400 100px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch { /* system fallbacks still render */ }
  await Promise.all(SAMPLE_PHOTOS.map(({ key }) => loadPhoto(key, key)));
  buildTray();
  renderPreview();
  // A handle for testing and screenshots: render or export any state on demand.
  window.__viceStudio = {
    state,
    photos: photoImages,
    cloneState,
    drawCover,
    exportCover,
    renderPreview,
    sizes: EXPORT_SIZES,
  };
}

init();
