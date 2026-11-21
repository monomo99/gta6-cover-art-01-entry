// Vice City Cover Studio — studio wiring.
// Loads the bundled samples, runs face detection on them, binds every
// control to the poster state, paints the preview, and exports real PNGs
// at the four post sizes. Photos a user uploads are read with FileReader
// and never leave this machine.
import {
  freshPoster,
  GRADES,
  LAYOUTS,
  TYPEFACES,
  SAMPLES,
  DISTRICTS,
  STATIONS,
  HEISTS,
  STICKERS,
  TITLE_STYLES,
  EXPORTS,
  stationById,
} from './data.js';
import { renderPoster, panelRects } from './render.js';
import { detectPanelFace, faceCropWindow } from './faceCrop.js';

const poster = freshPoster();
const imgs = {};
const stage = document.getElementById('stage');
const sctx = stage.getContext('2d');
const PREVIEW = 960;

let armedSticker = null;
let faceMode = false;

function $(id) {
  return document.getElementById(id);
}

function paint() {
  stage.width = PREVIEW;
  stage.height = PREVIEW;
  renderPoster(sctx, poster, imgs, PREVIEW, PREVIEW);
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
    const img = await loadImage(s.file);
    if (img) imgs[s.file] = img;
  }
  // Face-aware crop: find each panel's face once the photo is in.
  for (const p of poster.panels) {
    const img = imgs[p.src];
    if (img) detectPanelFace(p, img);
  }
}

function currentPanel() {
  return poster.panels[poster.selected % poster.panels.length];
}

function markPicked(container, value) {
  for (const el of container.querySelectorAll('[data-pick]')) {
    el.classList.toggle('picked', el.dataset.pick === value);
  }
}

function mountLayoutPicker() {
  const box = $('layout-pick');
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.textContent = l.label;
    b.dataset.pick = l.id;
    b.onclick = () => {
      poster.layout = l.id;
      markPicked(box, l.id);
      paint();
    };
    box.appendChild(b);
  }
  markPicked(box, poster.layout);
}

function mountGradePicker() {
  const box = $('grade-pick');
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.title = g.label;
    b.dataset.pick = g.id;
    b.style.background = `linear-gradient(135deg, ${g.top}, ${g.mid} 55%, ${g.accent})`;
    b.onclick = () => {
      poster.grade = g.id;
      markPicked(box, g.id);
      paint();
    };
    box.appendChild(b);
  }
  markPicked(box, poster.grade);
}

function mountSamples() {
  const box = $('sample-pick');
  for (const s of SAMPLES) {
    const wrap = document.createElement('div');
    wrap.className = 'thumb';
    const img = document.createElement('img');
    img.src = s.file;
    img.alt = s.label;
    img.title = `${s.label} — ${s.role}`;
    const role = document.createElement('span');
    role.textContent = s.role;
    wrap.appendChild(img);
    wrap.appendChild(role);
    wrap.onclick = () => {
      currentPanel().src = s.file;
      const loaded = imgs[s.file];
      if (loaded) {
        currentPanel().focus = null;
        detectPanelFace(currentPanel(), loaded);
      }
      for (const t of box.querySelectorAll('.thumb')) t.classList.toggle('picked', t === wrap);
      paint();
    };
    box.appendChild(wrap);
  }
}

function mountCaption() {
  const titleFace = $('title-face');
  const subFace = $('sub-face');
  for (const f of TYPEFACES) {
    for (const sel of [titleFace, subFace]) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.label;
      sel.appendChild(opt);
    }
  }
  titleFace.value = poster.titleFont;
  subFace.value = poster.subFont;

  const styleSel = $('title-style');
  for (const st of TITLE_STYLES) {
    const opt = document.createElement('option');
    opt.value = st.id;
    opt.textContent = st.label;
    styleSel.appendChild(opt);
  }
  styleSel.value = poster.titleStyle;

  const colours = ['#ffffff', '#ffd166', '#ff2e88', '#00e5ff', '#39ff88', '#1c1033'];
  const colourBox = $('title-colors');
  for (const c of colours) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.title = c;
    b.dataset.pick = c;
    b.style.background = c;
    b.onclick = () => {
      poster.titleColor = c;
      markPicked(colourBox, c);
      paint();
    };
    colourBox.appendChild(b);
  }
  markPicked(colourBox, poster.titleColor);
}

function mountHud() {
  const districtSel = $('district-pick');
  for (const d of DISTRICTS) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    districtSel.appendChild(opt);
  }
  districtSel.value = poster.district;

  const radioSel = $('radio-pick');
  for (const st of STATIONS) {
    const opt = document.createElement('option');
    opt.value = st.id;
    opt.textContent = st.name;
    radioSel.appendChild(opt);
  }
  radioSel.value = poster.radio;
}

function mountStickers() {
  const box = $('sticker-pick');
  for (const st of STICKERS) {
    const b = document.createElement('button');
    b.textContent = st.label;
    b.dataset.pick = st.id;
    b.onclick = () => {
      armedSticker = armedSticker === st.id ? null : st.id;
      markPicked(box, armedSticker || '');
      $('sticker-note').textContent = armedSticker
        ? `Tap the cover to stamp a ${st.label}.`
        : 'Pick a sticker, then tap the cover to stamp it.';
    };
    box.appendChild(b);
  }
  $('sticker-clear').onclick = () => {
    poster.stickers = [];
    armedSticker = null;
    markPicked(box, '');
    paint();
  };
}

// Surprise me: a whole new poster in one tap — random layout, grade,
// heist, title treatment and accent, plus one random sticker.
function surprise() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  poster.layout = pick(LAYOUTS).id;
  poster.grade = pick(GRADES).id;
  poster.titleStyle = pick(TITLE_STYLES).id;
  poster.accent = pick(['#ff2e88', '#00e5ff', '#ffd166', '#39ff88', '#ff7a1a', null]);
  poster.missionName = pick(HEISTS.names);
  poster.missionObjective = pick(HEISTS.objectives);
  poster.missionReward = pick(HEISTS.rewards);
  poster.tagline = pick(HEISTS.taglines);
  const kinds = STICKERS.map((s) => s.id);
  poster.stickers = [
    {
      kind: pick(kinds),
      x: 0.15 + Math.random() * 0.7,
      y: 0.2 + Math.random() * 0.5,
      size: 0.09,
      color: poster.accent || '#ffd166',
      tilt: (Math.random() - 0.5) * 0.6,
    },
  ];
  syncInputs();
  paint();
}

function spinHeist() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  poster.missionName = pick(HEISTS.names);
  poster.missionObjective = pick(HEISTS.objectives);
  poster.missionReward = pick(HEISTS.rewards);
  poster.tagline = pick(HEISTS.taglines);
  $('job-name').value = poster.missionName;
  $('job-goal').value = poster.missionObjective;
  $('job-reward').value = poster.missionReward;
  $('tagline-text').value = poster.tagline;
  paint();
}

// Push the poster state back into every input after a random change.
function syncInputs() {
  markPicked($('layout-pick'), poster.layout);
  markPicked($('grade-pick'), poster.grade);
  $('title-style').value = poster.titleStyle;
  $('accent-pick').value = poster.accent || '#ff2e88';
  $('job-name').value = poster.missionName;
  $('job-goal').value = poster.missionObjective;
  $('job-reward').value = poster.missionReward;
  $('tagline-text').value = poster.tagline;
  $('title-text').value = poster.title;
  $('subtitle-text').value = poster.subtitle;
}

function bindInputs() {
  $('title-text').value = poster.title;
  $('title-text').addEventListener('input', (e) => {
    poster.title = e.target.value;
    paint();
  });
  $('subtitle-text').value = poster.subtitle;
  $('subtitle-text').addEventListener('input', (e) => {
    poster.subtitle = e.target.value;
    paint();
  });
  $('tagline-text').value = poster.tagline;
  $('tagline-text').addEventListener('input', (e) => {
    poster.tagline = e.target.value;
    paint();
  });
  $('title-face').addEventListener('change', (e) => {
    poster.titleFont = e.target.value;
    paint();
  });
  $('sub-face').addEventListener('change', (e) => {
    poster.subFont = e.target.value;
    paint();
  });
  $('title-style').addEventListener('change', (e) => {
    poster.titleStyle = e.target.value;
    paint();
  });
  $('accent-pick').addEventListener('input', (e) => {
    poster.accent = e.target.value;
    paint();
  });
  $('accent-reset').addEventListener('click', () => {
    poster.accent = null;
    $('accent-pick').value = '#ff2e88';
    paint();
  });
  $('size-slider').addEventListener('input', (e) => {
    poster.titleSize = parseFloat(e.target.value);
    paint();
  });
  $('tilt-slider').addEventListener('input', (e) => {
    poster.tilt = parseFloat(e.target.value);
    paint();
  });
  $('banner-pick').addEventListener('change', (e) => {
    poster.banner = e.target.value;
    paint();
  });
  $('wanted-pick').value = String(poster.wanted);
  $('wanted-pick').addEventListener('change', (e) => {
    poster.wanted = parseInt(e.target.value, 10);
    paint();
  });
  $('health-slider').value = String(poster.health);
  $('health-slider').addEventListener('input', (e) => {
    poster.health = parseInt(e.target.value, 10);
    paint();
  });
  $('armor-slider').value = String(poster.armor);
  $('armor-slider').addEventListener('input', (e) => {
    poster.armor = parseInt(e.target.value, 10);
    paint();
  });
  $('district-pick').addEventListener('change', (e) => {
    poster.district = e.target.value;
    paint();
  });
  $('job-name').value = poster.missionName;
  $('job-name').addEventListener('input', (e) => {
    poster.missionName = e.target.value;
    paint();
  });
  $('job-goal').value = poster.missionObjective;
  $('job-goal').addEventListener('input', (e) => {
    poster.missionObjective = e.target.value;
    paint();
  });
  $('job-reward').value = poster.missionReward;
  $('job-reward').addEventListener('input', (e) => {
    poster.missionReward = e.target.value;
    paint();
  });
  $('heist-btn').addEventListener('click', spinHeist);
  $('surprise-btn').addEventListener('click', surprise);
  $('radio-pick').addEventListener('change', (e) => {
    poster.radio = e.target.value;
    const station = stationById(poster.radio);
    poster.nowPlaying = station.track;
    $('track-text').value = poster.nowPlaying;
    paint();
  });
  $('track-text').value = poster.nowPlaying;
  $('track-text').addEventListener('input', (e) => {
    poster.nowPlaying = e.target.value;
    paint();
  });
  $('stamp-pick').value = poster.stamp;
  $('stamp-pick').addEventListener('change', (e) => {
    poster.stamp = e.target.value;
    paint();
  });
  $('worn-toggle').checked = poster.worn;
  $('worn-toggle').addEventListener('change', (e) => {
    poster.worn = e.target.checked;
    paint();
  });
  $('hud-toggle').checked = poster.hud;
  $('hud-toggle').addEventListener('change', (e) => {
    poster.hud = e.target.checked;
    paint();
  });
  $('billing-toggle').checked = poster.billing;
  $('billing-toggle').addEventListener('change', (e) => {
    poster.billing = e.target.checked;
    paint();
  });
  $('zoom-slider').addEventListener('input', (e) => {
    currentPanel().zoom = parseFloat(e.target.value);
    paint();
  });
  $('flip-btn').addEventListener('click', () => {
    const p = currentPanel();
    p.flip = !p.flip;
    paint();
  });
  $('fill-btn').addEventListener('click', () => {
    const src = currentPanel().src;
    for (const p of poster.panels) p.src = src;
    paint();
  });
  $('face-mode-btn').addEventListener('click', () => {
    faceMode = !faceMode;
    armedSticker = null;
    $('face-mode-btn').classList.toggle('picked', faceMode);
    $('face-note').textContent = faceMode
      ? 'Face focus on — tap a face on the cover to keep it in frame.'
      : 'Face focus off.';
  });
  $('face-detect-btn').addEventListener('click', () => {
    for (const p of poster.panels) {
      const img = imgs[p.src];
      if (img) {
        p.focus = null;
        detectPanelFace(p, img);
      }
    }
    paint();
  });
  $('upload-file').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const key = `upload:${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        imgs[key] = img;
        const p = currentPanel();
        p.src = key;
        p.focus = null;
        detectPanelFace(p, img);
        paint();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
  const exportBox = $('export-row');
  for (const size of EXPORTS) {
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
  } catch {
    /* fonts fall back to system sans; export still works */
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  renderPoster(ctx, poster, imgs, w, h);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// Drag on the stage pans the selected panel; the wheel zooms it; a click
// selects a panel — or, in face mode, sets the face focus, and with a
// sticker armed, stamps the sticker where you tap.
function mountStage() {
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
    const p = currentPanel();
    const scale = PREVIEW / rect.width;
    p.panX = Math.min(1, Math.max(0, p.panX + ((e.clientX - lastX) * scale) / PREVIEW));
    p.panY = Math.min(1, Math.max(0, p.panY + ((e.clientY - lastY) * scale) / PREVIEW));
    lastX = e.clientX;
    lastY = e.clientY;
    paint();
  });
  const stop = () => {
    dragging = false;
  };
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = currentPanel();
    p.zoom = Math.min(3, Math.max(0.6, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    $('zoom-slider').value = String(p.zoom);
    paint();
  }, { passive: false });
  stage.addEventListener('click', (e) => {
    const rect = stage.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * PREVIEW;
    const y = ((e.clientY - rect.top) / rect.height) * PREVIEW;
    // A sticker armed: stamp it where tapped, in poster space.
    if (armedSticker) {
      poster.stickers.push({
        kind: armedSticker,
        x: x / PREVIEW,
        y: y / PREVIEW,
        size: 0.09,
        color: poster.accent || '#ffd166',
        tilt: (Math.random() - 0.5) * 0.6,
      });
      paint();
      return;
    }
    const rects = panelRects(
      LAYOUTS.find((l) => l.id === poster.layout) || LAYOUTS[0],
      PREVIEW,
      PREVIEW,
    );
    const hit = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (hit < 0) return;
    const p = poster.panels[hit % poster.panels.length];
    if (faceMode) {
      // Convert the tap (poster space) into the image's own coordinates
      // through the current crop window, and pin the face focus there.
      const img = imgs[p.src];
      if (img && (img.complete || img.naturalWidth)) {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const win = faceCropWindow(iw, ih, rects[hit], p);
        const fx = (win.sx + ((x - rects[hit].x) / rects[hit].w) * win.sw) / iw;
        const fy = (win.sy + ((y - rects[hit].y) / rects[hit].h) * win.sh) / ih;
        p.focus = {
          x: Math.min(0.98, Math.max(0.02, fx)),
          y: Math.min(0.98, Math.max(0.02, fy)),
        };
      }
      paint();
      return;
    }
    poster.selected = hit % poster.panels.length;
    $('panel-note').textContent = `Panel ${poster.selected + 1} of ${poster.panels.length}`;
    $('zoom-slider').value = String(currentPanel().zoom);
    paint();
  });
}

mountLayoutPicker();
mountGradePicker();
mountSamples();
mountCaption();
mountHud();
mountStickers();
bindInputs();
mountStage();
preloadSamples().then(() => {
  document.fonts.ready.then(paint).catch(paint);
  paint();
});
