// Vice City Cover Studio — UI wiring.
// Loads the bundled samples, binds every control to the state, renders the
// preview, and exports real PNGs at the three post sizes. Photos a user
// uploads are read with FileReader and never leave this machine.
import { defaultState, GRADES, LAYOUT_NAMES, FONTS, SAMPLES, EXPORT_SIZES } from './state.js';
import { drawCover, layoutPanels } from './cover.js';

const state = defaultState();
const images = {};
const stage = document.getElementById('stage');
const sctx = stage.getContext('2d');
const PREVIEW = 960;

function $(id) {
  return document.getElementById(id);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function preloadSamples() {
  for (const s of SAMPLES) {
    const img = await loadImage(s.src);
    if (img) images[s.src] = img;
  }
}

function render() {
  stage.width = PREVIEW;
  stage.height = PREVIEW;
  drawCover(sctx, state, images, PREVIEW, PREVIEW);
}

function selectedPanel() {
  return state.panels[state.selected % state.panels.length];
}

function markActive(container, value) {
  for (const el of container.querySelectorAll('[data-value]')) {
    el.classList.toggle('active', el.dataset.value === value);
  }
}

function buildControls() {
  const layoutBox = $('layout-buttons');
  for (const [id, name] of Object.entries(LAYOUT_NAMES)) {
    const b = document.createElement('button');
    b.textContent = name;
    b.dataset.value = id;
    b.onclick = () => {
      state.layout = id;
      markActive(layoutBox, id);
      render();
    };
    layoutBox.appendChild(b);
  }
  markActive(layoutBox, state.layout);

  const gradeBox = $('grade-swatches');
  for (const [id, g] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.title = g.name;
    b.dataset.value = id;
    b.style.background = `linear-gradient(135deg, ${g.sky[0]}, ${g.sky[1]} 55%, ${g.accent})`;
    b.onclick = () => {
      state.grade = id;
      markActive(gradeBox, id);
      render();
    };
    gradeBox.appendChild(b);
  }
  markActive(gradeBox, state.grade);

  const thumbBox = $('sample-thumbs');
  for (const s of SAMPLES) {
    const img = document.createElement('img');
    img.src = s.src;
    img.alt = s.label;
    img.title = s.label;
    img.onclick = () => {
      selectedPanel().src = s.src;
      for (const t of thumbBox.querySelectorAll('img')) t.classList.toggle('active', t === img);
      render();
    };
    thumbBox.appendChild(img);
  }

  const titleFont = $('title-font');
  const subFont = $('sub-font');
  for (const f of FONTS) {
    for (const sel of [titleFont, subFont]) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      sel.appendChild(opt);
    }
  }
  titleFont.value = state.titleFont;
  subFont.value = state.subFont;

  const colors = ['#ffffff', '#ffd166', '#ff2e88', '#00e5ff', '#39ff88', '#1c1033'];
  const colorBox = $('title-colors');
  for (const c of colors) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.title = c;
    b.dataset.value = c;
    b.style.background = c;
    b.onclick = () => {
      state.titleColor = c;
      markActive(colorBox, c);
      render();
    };
    colorBox.appendChild(b);
  }
  markActive(colorBox, state.titleColor);
}

function bindInputs() {
  $('title-input').value = state.title;
  $('title-input').addEventListener('input', (e) => {
    state.title = e.target.value;
    render();
  });
  $('subtitle-input').value = state.subtitle;
  $('subtitle-input').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    render();
  });
  $('tagline-input').value = state.tagline;
  $('tagline-input').addEventListener('input', (e) => {
    state.tagline = e.target.value;
    render();
  });
  $('title-font').addEventListener('change', (e) => {
    state.titleFont = e.target.value;
    render();
  });
  $('sub-font').addEventListener('change', (e) => {
    state.subFont = e.target.value;
    render();
  });
  $('size-range').addEventListener('input', (e) => {
    state.titleSize = parseFloat(e.target.value);
    render();
  });
  $('tilt-range').addEventListener('input', (e) => {
    state.tilt = parseFloat(e.target.value);
    render();
  });
  $('banner-select').addEventListener('change', (e) => {
    state.banner = e.target.value;
    render();
  });
  $('zoom-range').addEventListener('input', (e) => {
    selectedPanel().zoom = parseFloat(e.target.value);
    render();
  });
  $('flip-button').addEventListener('click', () => {
    const p = selectedPanel();
    p.flip = !p.flip;
    render();
  });
  $('fill-button').addEventListener('click', () => {
    const src = selectedPanel().src;
    for (const p of state.panels) p.src = src;
    render();
  });
  $('upload-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const key = `upload:${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        images[key] = img;
        selectedPanel().src = key;
        render();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
  const exportBox = $('export-buttons');
  for (const size of EXPORT_SIZES) {
    const b = document.createElement('button');
    b.className = 'primary';
    b.textContent = `Export ${size.label}`;
    b.onclick = () => exportPNG(size.w, size.h);
    exportBox.appendChild(b);
  }
}

async function exportPNG(w, h) {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('80px "Bebas Neue"'),
      document.fonts.load('80px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* fonts fall back to system sans; export still works */ }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state, images, w, h);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// Drag on the stage pans the selected panel; the wheel zooms it.
function bindStage() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = stage.getBoundingClientRect();
    const p = selectedPanel();
    const scale = PREVIEW / rect.width;
    p.panX = Math.min(1, Math.max(0, p.panX + ((e.clientX - lastX) * scale) / PREVIEW));
    p.panY = Math.min(1, Math.max(0, p.panY + ((e.clientY - lastY) * scale) / PREVIEW));
    lastX = e.clientX;
    lastY = e.clientY;
    render();
  });
  const stop = () => { dragging = false; };
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = selectedPanel();
    p.zoom = Math.min(3, Math.max(0.6, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    $('zoom-range').value = String(p.zoom);
    render();
  }, { passive: false });
  stage.addEventListener('click', (e) => {
    const rect = stage.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * PREVIEW;
    const y = ((e.clientY - rect.top) / rect.height) * PREVIEW;
    const rects = layoutPanels(state.layout, PREVIEW, PREVIEW);
    const hit = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (hit >= 0) {
      state.selected = hit % state.panels.length;
      $('panel-label').textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
      $('zoom-range').value = String(selectedPanel().zoom);
      render();
    }
  });
}

buildControls();
bindInputs();
bindStage();
preloadSamples().then(() => {
  document.fonts.ready.then(render).catch(render);
  render();
});
