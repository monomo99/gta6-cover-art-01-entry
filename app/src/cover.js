// Neon Shore Cover Studio — the cover engine, drawing the whole poster on a canvas.
// Four layouts of photo panels sit above a title band; a neon-sunset grade washes
// the photos; hand-drawn palm-and-sun sky art, a striped poster sun, bold gradient
// title lettering and a script subtitle finish it. Nothing here is Rockstar's: the
// lettering is Anton, Pacifico and Bebas Neue, all SIL OFL, under app/fonts/.

/** Grades: the wash over each photo plus the sky palette for the snapshot layout. */
export const GRADES = {
  sunset: {
    label: 'Sunset Strip',
    wash: 'rgba(255, 110, 60, 0.16)', top: 'rgba(255, 190, 90, 0.08)',
    bottom: 'rgba(255, 40, 120, 0.34)', sky: ['#2b1055', '#c62b7e', '#ff7e3d', '#ffd166'],
    sun: '#ffe9a8', accent: '#ff5e78',
  },
  neon: {
    label: 'Neon Nights',
    wash: 'rgba(0, 229, 255, 0.12)', top: 'rgba(255, 46, 136, 0.10)',
    bottom: 'rgba(120, 40, 255, 0.38)', sky: ['#0d0221', '#ff2e88', '#7b2fff', '#00e5ff'],
    sun: '#ff9de2', accent: '#00e5ff',
  },
  golden: {
    label: 'Golden Hour',
    wash: 'rgba(255, 170, 40, 0.18)', top: 'rgba(255, 220, 120, 0.10)',
    bottom: 'rgba(200, 90, 10, 0.30)', sky: ['#3a1c00', '#b25a1b', '#ff9a3d', '#ffe08a'],
    sun: '#fff3c4', accent: '#ffb347',
  },
  dusk: {
    label: 'Palm Dusk',
    wash: 'rgba(90, 60, 220, 0.16)', top: 'rgba(140, 90, 255, 0.10)',
    bottom: 'rgba(20, 10, 60, 0.40)', sky: ['#12083a', '#5b2a9d', '#c65a8a', '#ff8a5c'],
    sun: '#ffd9ec', accent: '#b388ff',
  },
  noir: {
    label: 'Mono Noir',
    wash: 'rgba(255, 255, 255, 0.05)', top: 'rgba(255, 255, 255, 0.04)',
    bottom: 'rgba(0, 0, 0, 0.42)', sky: ['#0c0c12', '#2a2a33', '#55555f', '#c9c9d1'],
    sun: '#f2f2f2', accent: '#e8e8ec',
  },
};

/** Layouts: how the photo panels sit above the title band. */
export const LAYOUTS = {
  'vice-grid': { label: 'Vice Grid', panels: 3 },
  nine: { label: 'Nine Lives', panels: 9 },
  bleed: { label: 'Full Bleed', panels: 1 },
  snapshots: { label: 'Snapshot Strip', panels: 3 },
};

/** The post sizes the app exports. */
export const SIZES = {
  '1080x1080': { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  '1080x1350': { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  '1920x1080': { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

const INK = '#160a24';
const PAPER = '#fff8ee';

/** The panel rectangles from the last draw, for click hit-testing. Set by drawCover. */
export let lastPanels = [];
/** The title band rectangle from the last draw. */
export let lastBand = null;

/** A hex colour (#rgb or #rrggbb) with a safe alpha — never built by string concat. */
export function hexA(hex, alpha) {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(String(hex || '').trim());
  if (!m) return `rgba(255, 255, 255, ${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function bandHeight(w, h) {
  return h * (w > h ? 0.26 : w === h ? 0.21 : 0.19);
}

/** The panel rectangles for a layout, in canvas pixels. */
export function layoutPanels(layout, w, h) {
  const band = bandHeight(w, h);
  const top = h - band;
  const g = Math.max(6, Math.round(w * 0.014));
  const area = { x: 0, y: 0, w, h: top };
  if (layout === 'bleed') return [{ x: 0, y: 0, w, h, rot: 0 }];
  if (layout === 'nine') {
    const cols = 3, rows = 3;
    const cw = (area.w - g * (cols + 1)) / cols;
    const ch = (area.h - g * (rows + 1)) / rows;
    const out = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({ x: g + c * (cw + g), y: g + r * (ch + g), w: cw, h: ch, rot: 0 });
      }
    }
    return out;
  }
  if (layout === 'snapshots') {
    const pw = w * 0.34, ph = top * 0.62;
    const cy = top * 0.44;
    return [
      { x: w * 0.06, y: cy - ph / 2, w: pw, h: ph, rot: -0.10 },
      { x: w * 0.33, y: cy - ph / 2 - top * 0.03, w: pw, h: ph, rot: 0.045 },
      { x: w * 0.60, y: cy - ph / 2, w: pw, h: ph, rot: -0.03 },
    ];
  }
  // Vice Grid: one big hero panel on the left, two stacked panels on the right.
  const heroW = w * 0.60;
  const colX = heroW + g;
  const colW = w - colX - g;
  const ch = (top - g * 3) / 2;
  return [
    { x: g, y: g, w: heroW - g, h: top - g * 2, rot: 0 },
    { x: colX, y: g, w: colW, h: ch, rot: 0 },
    { x: colX, y: g * 2 + ch, w: colW, h: ch, rot: 0 },
  ];
}

function fitFont(ctx, text, maxWidth, startSize, family, weight = '') {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.94);
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawPhotoPanel(ctx, panel, photo, grade, noir) {
  ctx.save();
  if (panel.rot) {
    ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.rotate(panel.rot);
    ctx.translate(-panel.w / 2, -panel.h / 2);
  } else {
    ctx.translate(panel.x, panel.y);
  }
  // Tilted snapshot panels get a wide polaroid-style white edge; the rest get ink.
  const frame = panel.rot ? Math.max(8, panel.w * 0.045) : Math.max(3, panel.w * 0.006);
  ctx.fillStyle = panel.rot ? PAPER : INK;
  ctx.fillRect(-frame, -frame, panel.w + frame * 2, panel.h + frame * 2);
  ctx.beginPath();
  ctx.rect(0, 0, panel.w, panel.h);
  ctx.clip();
  if (photo && photo.img) {
    const iw = photo.img.naturalWidth, ih = photo.img.naturalHeight;
    const base = Math.max(panel.w / iw, panel.h / ih);
    const s = base * (photo.zoom || 1);
    const dw = iw * s, dh = ih * s;
    const dx = (panel.w - dw) / 2 + (photo.ox || 0) * panel.w;
    const dy = (panel.h - dh) / 2 + (photo.oy || 0) * panel.h;
    ctx.save();
    // Flipping mirrors only the photo; the wash and frame stay where they are.
    if (photo.flip) { ctx.translate(panel.w, 0); ctx.scale(-1, 1); }
    if (noir) ctx.filter = 'grayscale(1) contrast(1.18) brightness(1.04)';
    ctx.drawImage(photo.img, dx, dy, dw, dh);
    ctx.restore();
  } else {
    // No photo yet: a sunset placeholder keeps the grid reading as a poster.
    const ph = ctx.createLinearGradient(0, 0, panel.w, panel.h);
    ph.addColorStop(0, '#3a1c5c');
    ph.addColorStop(1, '#7a2a6d');
    ctx.fillStyle = ph;
    ctx.fillRect(0, 0, panel.w, panel.h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `${Math.max(14, panel.w * 0.055)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', panel.w / 2, panel.h / 2);
  }
  // The grade wash: warm light at the top, deep colour at the foot of the panel.
  const wash = ctx.createLinearGradient(0, 0, 0, panel.h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, panel.w, panel.h);
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, panel.w, panel.h);
  // An inked inner edge makes each panel read as a printed poster tile.
  ctx.strokeStyle = 'rgba(22,10,36,0.55)';
  ctx.lineWidth = Math.max(2, panel.w * 0.006);
  ctx.strokeRect(0, 0, panel.w, panel.h);
  ctx.restore();
}

/** One palm silhouette: a curving trunk with five fronds. */
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -60, 4, -118);
  ctx.stroke();
  ctx.translate(4, -118);
  ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    const a = (-Math.PI * 0.15) - i * (Math.PI * 0.18);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * 52, Math.sin(a) * 52 - 18, Math.cos(a) * 96, Math.sin(a) * 96 + 26);
    ctx.stroke();
  }
  ctx.restore();
}

/** The poster sun: a glowing disc cut by horizontal slits, loading-screen style. */
function drawStripedSun(ctx, x, y, r, color, skyTop) {
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.4);
  glow.addColorStop(0, color);
  glow.addColorStop(0.35, hexA(color, 0.33));
  glow.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // The slits widen toward the sun's foot, so it fades into the horizon.
  ctx.fillStyle = skyTop;
  for (let i = 0; i < 4; i++) {
    const sy = y + r * (0.05 + i * 0.22);
    ctx.fillRect(x - r, sy, r * 2, r * (0.05 + i * 0.03));
  }
  ctx.restore();
}

/** Sun rays fanning out behind the sun, faint enough to sit under the panels. */
function drawSunRays(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.10;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 3.2, -r * 0.16);
    ctx.lineTo(r * 3.2, r * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** A few distant birds: two-stroke chevrons drifting across the sky. */
function drawBirds(ctx, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, w * 0.002);
  ctx.lineCap = 'round';
  const birds = [
    [0.16, 0.14, 1.0], [0.24, 0.10, 0.7], [0.30, 0.17, 0.85],
    [0.52, 0.08, 0.6], [0.60, 0.13, 0.9], [0.86, 0.11, 0.75],
  ];
  for (const [fx, fy, s] of birds) {
    const x = w * fx, y = h * fy, r = Math.min(w, h) * 0.012 * s;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.8, x, y);
    ctx.quadraticCurveTo(x + r * 0.4, y - r * 0.8, x + r, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSky(ctx, w, h, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sunR = Math.min(w, h) * 0.16;
  const sunX = w * 0.72, sunY = h * 0.30;
  drawSunRays(ctx, sunX, sunY, sunR, grade.sun);
  drawStripedSun(ctx, sunX, sunY, sunR, grade.sun, grade.sky[0]);
  drawBirds(ctx, w, h, 'rgba(22,10,36,0.55)');
  // Soft horizon haze bands.
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 3; i++) ctx.fillRect(0, h * (0.55 + i * 0.05), w, h * 0.012);
  drawPalm(ctx, w * 0.03, h * 0.98, Math.min(w, h) * 0.0022, 'rgba(16,4,32,0.85)');
  drawPalm(ctx, w * 0.97, h * 0.99, Math.min(w, h) * 0.0019, 'rgba(16,4,32,0.8)');
}

let grainTile = null;
function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 140; t.height = 140;
  const c = t.getContext('2d');
  const img = c.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTile = ctx.createPattern(t, 'repeat');
  return grainTile;
}

function drawStars(ctx, x, y, size, count, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const cx = x + i * size * 1.5;
    ctx.globalAlpha = i < count ? 1 : 0.28;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? size : size * 0.45;
      const a = -Math.PI / 2 + k * (Math.PI / 5);
      const px = cx + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A halftone dot strip across the title band's top, under the neon rule. */
function drawHalftone(ctx, w, y0, band, color) {
  const dot = Math.max(2, band * 0.02);
  const gap = dot * 3.4;
  const rows = 2;
  ctx.save();
  for (let r = 0; r < rows; r++) {
    const y = y0 + band * 0.055 + r * gap;
    ctx.fillStyle = hexA(color, 0.5 - r * 0.2);
    for (let x = gap / 2 + (r % 2) * gap / 2; x < w; x += gap) {
      ctx.beginPath();
      ctx.arc(x, y, dot * (1 - r * 0.25), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTitleBand(ctx, w, h, state, grade) {
  const band = bandHeight(w, h);
  const y0 = h - band;
  lastBand = { x: 0, y: y0, w, h: band };
  if (state.layout === 'bleed') {
    const scrim = ctx.createLinearGradient(0, y0 - band * 0.7, 0, h);
    scrim.addColorStop(0, 'rgba(22,10,36,0)');
    scrim.addColorStop(1, 'rgba(22,10,36,0.94)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, y0 - band * 0.7, w, band * 1.7);
  } else {
    ctx.fillStyle = INK;
    ctx.fillRect(0, y0, w, band);
  }
  // The neon rule above the band.
  const rule = ctx.createLinearGradient(0, 0, w, 0);
  rule.addColorStop(0, '#ff2e88');
  rule.addColorStop(0.5, '#ff9a3d');
  rule.addColorStop(1, '#00e5ff');
  ctx.fillStyle = rule;
  ctx.fillRect(0, y0, w, Math.max(3, band * 0.03));
  drawHalftone(ctx, w, y0, band, grade.sun);

  const title = (state.title || 'NEON SHORE').trim().toUpperCase();
  const pad = w * 0.045;
  const titleSize = fitFont(ctx, title, w - pad * 2, band * 0.52, 'Anton, sans-serif');
  const grad = ctx.createLinearGradient(0, y0 + band * 0.08, 0, y0 + band * 0.72);
  grad.addColorStop(0, '#fff7ae');
  grad.addColorStop(0.45, '#ff9a3d');
  grad.addColorStop(1, grade.accent);
  ctx.save();
  ctx.translate(w / 2, y0 + band * 0.52);
  ctx.rotate(-0.018);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // A hard offset shadow first, so the letters lift off the band.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(title, titleSize * 0.045, titleSize * 0.06);
  ctx.strokeStyle = '#14041f';
  ctx.lineWidth = titleSize * 0.09;
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // Script subtitle, right-aligned above the tagline so the two never collide.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const subSize = fitFont(ctx, sub, w * 0.52, band * 0.26, 'Pacifico, cursive');
    ctx.save();
    ctx.translate(w - pad, y0 + band * 0.78);
    ctx.rotate(-0.05);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,46,136,0.9)';
    ctx.shadowBlur = subSize * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, 0, 0);
    ctx.restore();
  }
  // Tagline in small caps at the band's foot, on the left.
  const tag = (state.tagline || '').trim().toUpperCase();
  if (tag) {
    ctx.save();
    try { ctx.letterSpacing = `${Math.max(2, w * 0.004)}px`; } catch (_) { /* older canvas */ }
    ctx.font = `${Math.max(12, band * 0.13)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,248,238,0.85)';
    ctx.fillText(tag, pad, y0 + band * 0.88);
    ctx.restore();
  }
  // Heat meter: stars at the band's top-right, clear of the script subtitle.
  const starSize = Math.max(7, band * 0.075);
  drawStars(ctx, w - pad - starSize * 7.2, y0 + band * 0.10, starSize, state.heat || 5, grade.sun);
  // Year badge in the cover's top-left corner.
  const badgeR = Math.max(20, w * 0.035);
  const bx = badgeR + w * 0.02, by = badgeR + w * 0.02;
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(22,10,36,0.82)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, badgeR * 0.07);
  ctx.strokeStyle = grade.sun;
  ctx.stroke();
  ctx.fillStyle = grade.sun;
  ctx.font = `${badgeR * 0.62}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ 26 ★', bx, by + badgeR * 0.05);
  ctx.restore();
}

/** A thin white poster frame around the whole cover. */
function drawPosterFrame(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,248,238,0.9)';
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.restore();
}

/**
 * Draws the whole cover for `state` onto `canvas` (sized to the export size).
 * `opts.selection` draws the selected panel's ring — editor preview only, never export.
 */
export function drawCover(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const noir = state.grade === 'noir';
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  if (state.layout === 'snapshots') drawSky(ctx, w, h - bandHeight(w, h), grade);
  const panels = layoutPanels(state.layout, w, h);
  lastPanels = panels;
  panels.forEach((p, i) => drawPhotoPanel(ctx, p, state.panels[i], grade, noir));
  if (opts.selection && state.selected != null && panels[state.selected]) {
    const p = panels[state.selected];
    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.setLineDash([w * 0.012, w * 0.008]);
    ctx.strokeRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
    ctx.restore();
  }
  drawTitleBand(ctx, w, h, state, grade);
  if (state.vignette !== false) {
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(10,0,20,0)');
    v.addColorStop(1, 'rgba(10,0,20,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain !== false) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  // The poster frame is a cover-level switch: off leaves the art edge to edge.
  if (state.frame !== false) drawPosterFrame(ctx, w, h);
}
