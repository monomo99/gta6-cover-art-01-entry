// Neon Shore Cover Studio — editor wiring.
// Loads the sample photos and fonts, renders the live preview, wires every
// control, and exports the poster as a PNG. Photos never leave the machine.

// Loaded sample images, keyed by sample key.
const IMAGES = {};
let selectedPanel = 0;
let previewDirty = true;

// Load one image from a URL; resolves with the <img> (or null on failure).
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Load every bundled sample photo, then render.
async function loadSamples() {
  const entries = Object.entries(SAMPLE_PHOTOS);
  for (const [key, photo] of entries) {
    const img = await loadImage(photo.src);
    if (img) IMAGES[key] = img;
  }
}

// Wait for the display fonts, then draw the first preview.
async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    // Fonts are decorative; the poster still renders with fallbacks.
  }
}

// Draw the live preview from the current state.
function renderPreview() {
  const canvas = document.getElementById('preview');
  renderCover(canvas, STATE, IMAGES);
  const size = EXPORT_SIZES[STATE.size];
  document.getElementById('sizeNote').textContent = size.label;
  previewDirty = false;
}

function requestRender() {
  if (previewDirty) return;
  previewDirty = true;
  requestAnimationFrame(() => {
    if (previewDirty) renderPreview();
  });
}

// --- control helpers -------------------------------------------------

function markActive(container, attr, value) {
  for (const btn of container.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset[attr] === value);
  }
}

function syncLayoutUI() {
  markActive(document.getElementById('layoutSeg'), 'layout', STATE.layout);
  document.getElementById('layoutHint').textContent = LAYOUTS[STATE.layout].hint;
  rebuildPanelSelect();
}

function syncGradeUI() {
  markActive(document.getElementById('gradeSwatches'), 'grade', STATE.grade);
}

function rebuildPanelSelect() {
  const sel = document.getElementById('panelSelect');
  const count = activePanelCount();
  if (selectedPanel >= count) selectedPanel = 0;
  sel.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Panel ${i + 1}`;
    sel.appendChild(opt);
  }
  sel.value = String(selectedPanel);
  syncPanelUI();
}

function syncPanelUI() {
  const panel = STATE.panels[selectedPanel];
  document.getElementById('photoSelect').value = panel.photo;
  document.getElementById('flipToggle').checked = panel.flip;
  document.getElementById('zoomRange').value = String(panel.zoom);
  document.getElementById('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
  document.getElementById('oxRange').value = String(panel.ox);
  document.getElementById('oxVal').textContent = panel.ox.toFixed(2);
  document.getElementById('oyRange').value = String(panel.oy);
  document.getElementById('oyVal').textContent = panel.oy.toFixed(2);
}

// --- photo uploads ---------------------------------------------------

// Read a user file into the selected panel as a custom photo.
function handlePhotoFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const panel = STATE.panels[selectedPanel];
      panel.photo = 'custom';
      panel.customImg = img;
      panel.customName = file.name;
      document.getElementById('photoSelect').value = 'custom';
      requestRender();
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

// --- export ----------------------------------------------------------

// Render the poster at export size and download it as a PNG.
function exportCover() {
  const canvas = renderExportCanvas(STATE, IMAGES);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon-shore-${STATE.size}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

// --- boot ------------------------------------------------------------

function wireControls() {
  document.getElementById('layoutSeg').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-layout]');
    if (!btn) return;
    STATE.layout = btn.dataset.layout;
    syncLayoutUI();
    requestRender();
  });

  document.getElementById('gradeSwatches').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-grade]');
    if (!btn) return;
    STATE.grade = btn.dataset.grade;
    syncGradeUI();
    requestRender();
  });

  document.getElementById('titleInput').addEventListener('input', (ev) => {
    STATE.title = ev.target.value;
    requestRender();
  });
  document.getElementById('subtitleInput').addEventListener('input', (ev) => {
    STATE.subtitle = ev.target.value;
    requestRender();
  });

  document.getElementById('panelSelect').addEventListener('change', (ev) => {
    selectedPanel = Number(ev.target.value) || 0;
    syncPanelUI();
  });

  document.getElementById('photoSelect').addEventListener('change', (ev) => {
    const panel = STATE.panels[selectedPanel];
    if (ev.target.value === 'custom') {
      document.getElementById('photoFile').click();
      return;
    }
    panel.photo = ev.target.value;
    panel.customImg = null;
    requestRender();
  });

  document.getElementById('photoFile').addEventListener('change', (ev) => {
    handlePhotoFile(ev.target.files && ev.target.files[0]);
    ev.target.value = '';
  });

  document.getElementById('flipToggle').addEventListener('change', (ev) => {
    STATE.panels[selectedPanel].flip = ev.target.checked;
    requestRender();
  });

  document.getElementById('zoomRange').addEventListener('input', (ev) => {
    STATE.panels[selectedPanel].zoom = Number(ev.target.value);
    syncPanelUI();
    requestRender();
  });
  document.getElementById('oxRange').addEventListener('input', (ev) => {
    STATE.panels[selectedPanel].ox = Number(ev.target.value);
    syncPanelUI();
    requestRender();
  });
  document.getElementById('oyRange').addEventListener('input', (ev) => {
    STATE.panels[selectedPanel].oy = Number(ev.target.value);
    syncPanelUI();
    requestRender();
  });

  document.getElementById('applyAllBtn').addEventListener('click', () => {
    const src = STATE.panels[selectedPanel];
    for (const p of STATE.panels) {
      p.photo = src.photo;
      p.customImg = src.customImg;
      p.customName = src.customName;
    }
    requestRender();
  });

  document.getElementById('sizeSelect').addEventListener('change', (ev) => {
    STATE.size = ev.target.value;
    requestRender();
  });

  document.getElementById('frameToggle').addEventListener('change', (ev) => {
    STATE.frame = ev.target.checked;
    requestRender();
  });
  document.getElementById('halftoneToggle').addEventListener('change', (ev) => {
    STATE.halftone = ev.target.checked;
    requestRender();
  });
  document.getElementById('birdsToggle').addEventListener('change', (ev) => {
    STATE.birds = ev.target.checked;
    requestRender();
  });

  document.getElementById('exportBtn').addEventListener('click', exportCover);
  document.getElementById('exportBtn2').addEventListener('click', exportCover);
}

// Expose the live pieces the shot driver and the console can use.
window.__neonShore = { STATE, IMAGES, renderPreview, exportCover };

async function boot() {
  const shot = applyShotParams();
  setupShotMode(shot);
  wireControls();
  // Sync the controls with the (possibly shot-driven) state.
  document.getElementById('titleInput').value = STATE.title;
  document.getElementById('subtitleInput').value = STATE.subtitle;
  document.getElementById('sizeSelect').value = STATE.size;
  document.getElementById('frameToggle').checked = STATE.frame;
  document.getElementById('halftoneToggle').checked = STATE.halftone;
  document.getElementById('birdsToggle').checked = STATE.birds;
  syncLayoutUI();
  syncGradeUI();
  syncPanelUI();
  await loadFonts();
  await loadSamples();
  renderPreview();
  markShotReady();
}

boot();
