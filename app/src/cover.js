// Vice Cover Studio — cover renderer. Every pixel of the poster is drawn here
// on a <canvas>: sky, sun, photo panels, palms, halftone, grain and caption.
// Nothing here reads the network; photos come from the caller's image map.

import { EXPORT_SIZES, GRADES, LAYOUTS, panelRects } from './state.js';

/** A tiny deterministic random stream, so grain looks the same on every export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The cover's gutter between panels, in pixels. */
function gutterOf(width, height) {
  return Math.max(4, Math.round(Math.min(width, height) * 0.012));
}

/** The sky: a three-stop sunset gradient for the grade. */
function drawSky(ctx, grade, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
}

/** The synthwave sun: a glowing disc cut by horizontal slices near its base. */
function drawSun(ctx, grade, width, height) {
  const cx = width * 0.5;
  const cy = height * 0.42;
  const r = Math.min(width, height) * 0.26;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(0.35, grade.sun + '55');
  glow.addColorStop(1, grade.sun + '00');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.1, cy - r * 2.1, r * 4.2, r * 4.2);
  ctx.globalAlpha = 1;
  const disc = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, grade.sunCore);
  disc.addColorStop(1, grade.sun);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Slice the sun's lower half with sky-coloured bars, widening toward the base.
  ctx.fillStyle = grade.sky[1];
  let y = cy + r * 0.05;
  let bar = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, bar);
    y += bar + r * 0.14;
    bar *= 1.45;
  }
}

/** A photo drawn cover-fit into a rect, honouring zoom, focal point and flip. */
function drawPhotoCover(ctx, img, rect, panel) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!img || img.naturalWidth === 0) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3a2364');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(2, w * 0.008);
    for (let i = -h; i < w; i += Math.max(24, w * 0.08)) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(Math.min(w, h) * 0.07)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD PHOTO', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const dx = x + w / 2 - dw * panel.px;
  const dy = y + h / 2 - dh * panel.py;
  if (panel.flip) {
    ctx.translate(x + w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(x + w / 2), 0);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** The photo panels, with white gutters and a grade tint over each photo. */
function drawPanels(ctx, state, photos, width, height) {
  const rects = panelRects(state.layoutId, width, height);
  const grade = GRADES[state.gradeId] ?? GRADES.sunset;
  const gap = gutterOf(width, height);
  const frame = state.effects.frame ? gap * 1.6 : gap;
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    const inner = {
      x: rect.x + (rect.x === 0 ? frame : gap / 2),
      y: rect.y + (rect.y === 0 ? frame : gap / 2),
      w: rect.w - (rect.x === 0 ? frame : gap / 2) - (rect.x + rect.w >= width ? frame : gap / 2),
      h: rect.h - (rect.y === 0 ? frame : gap / 2) - (rect.y + rect.h >= height ? frame : gap / 2),
    };
    drawPhotoCover(ctx, photos.get(panel.photo), inner, panel);
    ctx.fillStyle = grade.tint;
    ctx.globalAlpha = grade.tintAlpha;
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, gap * 0.55);
    ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);
  });
}

/** One palm silhouette: a leaning trunk with six filled frond blades.
 * Local +y is up (the caller flips y), so the crown rises from the base. */
function drawPalm(ctx, x, y, size, flip, ink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -size : size, -size);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';
  // Trunk, leaning gently inward from the corner.
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(0.1, 0.55, 0.3, 0.92);
  ctx.stroke();
  // Fronds: filled blades fanning from the crown, each bowed out and back.
  const crownX = 0.3;
  const crownY = 0.92;
  const blades = [
    { tip: [-0.55, 0.78], bow: [-0.28, 1.06] },
    { tip: [-0.3, 1.05], bow: [-0.02, 1.22] },
    { tip: [0.02, 1.18], bow: [0.3, 1.28] },
    { tip: [0.38, 1.14], bow: [0.62, 1.18] },
    { tip: [0.72, 0.96], bow: [0.86, 1.02] },
    { tip: [0.92, 0.7], bow: [0.98, 0.82] },
  ];
  for (const { tip, bow } of blades) {
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(bow[0], bow[1], tip[0], tip[1]);
    ctx.quadraticCurveTo((bow[0] + crownX) / 2, (bow[1] + crownY) / 2 - 0.12, crownX, crownY);
    ctx.fill();
  }
  ctx.restore();
}

/** Palm silhouettes leaning in from the bottom corners. */
function drawPalms(ctx, grade, width, height) {
  const s = Math.min(width, height) * 0.3;
  drawPalm(ctx, width * 0.02, height * 1.01, s, false, grade.ink);
  drawPalm(ctx, width * 0.98, height * 1.01, s * 0.8, true, grade.ink);
}

/** Halftone dots fading across the lower sky. */
function drawHalftone(ctx, width, height) {
  const step = Math.max(10, Math.round(width * 0.014));
  ctx.fillStyle = '#ffffff';
  for (let row = 0; row < 9; row++) {
    const y = height * 0.86 + row * step * 0.9;
    const r = Math.max(1, step * (0.32 - row * 0.03));
    ctx.globalAlpha = Math.max(0.04, 0.5 - row * 0.055);
    for (let x = width * 0.55; x < width * 0.99; x += step) {
      ctx.beginPath();
      ctx.arc(x + (row % 2 ? step / 2 : 0), y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Film grain: faint speckles from a fixed seed, identical on every export. */
function drawGrain(ctx, width, height) {
  const rand = mulberry32(20261120);
  ctx.fillStyle = '#ffffff';
  const dots = Math.round((width * height) / 900);
  for (let i = 0; i < dots; i++) {
    ctx.globalAlpha = 0.03 + rand() * 0.06;
    const s = 1 + rand() * 2;
    ctx.fillRect(rand() * width, rand() * height, s, s);
  }
  ctx.globalAlpha = 1;
}

/** Horizontal scanlines over the whole cover. */
function drawScanlines(ctx, width, height) {
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.07;
  for (let y = 0; y < height; y += 5) ctx.fillRect(0, y, width, 1);
  ctx.globalAlpha = 1;
}

/** Shrink a font until the text fits maxWidth, then return the font string. */
function fitFont(ctx, text, maxWidth, family, startPx, weight) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px = Math.round(px * 0.94);
  }
  return `${weight} ${px}px ${family}`;
}

/** The caption: title, subtitle and tagline on a scrim banner, or bare on the art. */
function drawCaption(ctx, state, width, height) {
  const { caption } = state;
  const grade = GRADES[state.gradeId] ?? GRADES.sunset;
  const pad = Math.round(width * 0.045);
  const bannerH = Math.round(height * (caption.position === 'none' ? 0.3 : 0.26));
  const bottom = caption.position !== 'top';
  const by = bottom ? height - bannerH : 0;

  if (caption.position !== 'none') {
    const scrim = ctx.createLinearGradient(0, by, 0, by + bannerH);
    if (bottom) {
      scrim.addColorStop(0, 'rgba(10,4,24,0)');
      scrim.addColorStop(0.45, 'rgba(10,4,24,0.72)');
      scrim.addColorStop(1, 'rgba(10,4,24,0.88)');
    } else {
      scrim.addColorStop(0, 'rgba(10,4,24,0.88)');
      scrim.addColorStop(0.55, 'rgba(10,4,24,0.72)');
      scrim.addColorStop(1, 'rgba(10,4,24,0)');
    }
    ctx.fillStyle = scrim;
    ctx.fillRect(0, by, width, bannerH);
  }

  const maxW = width - pad * 2;
  const titlePx = Math.round(height * 0.115 * caption.size);
  const fontDef = {
    Anton: { family: "'Anton', 'Arial Narrow', sans-serif", weight: 400 },
    'Bebas Neue': { family: "'Bebas Neue', 'Arial Narrow', sans-serif", weight: 400 },
    Pacifico: { family: "'Pacifico', cursive", weight: 400 },
  }[caption.font] ?? { family: "'Anton', sans-serif", weight: 400 };

  ctx.save();
  const titleCenterY = bottom ? height - Math.round(bannerH * 0.52) : Math.round(bannerH * 0.48);
  ctx.translate(width / 2, titleCenterY);
  ctx.rotate((caption.tilt * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fitFont(ctx, caption.title, maxW, fontDef.family, titlePx, fontDef.weight);
  // Accent rule centred above the title, tilting with it.
  const barW = Math.round(width * 0.09);
  const barH = Math.max(4, Math.round(height * 0.008));
  ctx.fillStyle = caption.accent;
  ctx.fillRect(-barW / 2, -Math.round(titlePx * 0.78), barW, barH);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, titlePx * 0.09);
  ctx.strokeStyle = grade.ink;
  ctx.strokeText(caption.title, 0, 0);
  ctx.fillStyle = caption.color;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(titlePx * 0.12);
  ctx.shadowOffsetY = Math.round(titlePx * 0.045);
  ctx.fillText(caption.title, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.restore();

  const subY = bottom ? height - Math.round(bannerH * 0.24) : Math.round(bannerH * 0.76);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.round(width * 0.008)}px`; } catch { /* older canvas: no letter-spacing */ }
  ctx.font = `700 ${Math.round(height * 0.026)}px system-ui, sans-serif`;
  ctx.fillStyle = caption.accent;
  ctx.fillText(caption.sub, width / 2, subY);
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  ctx.restore();

  if (caption.tag.trim() !== '') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic 500 ${Math.round(height * 0.02)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const tagY = bottom ? height - Math.round(bannerH * 0.12) : Math.round(bannerH * 0.89);
    ctx.fillText(caption.tag, width / 2, tagY);
    ctx.restore();
  }
}

/** A thin white poster frame around the whole cover. */
function drawFrame(ctx, width, height) {
  const w = Math.max(4, Math.round(Math.min(width, height) * 0.008));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = w;
  ctx.strokeRect(w / 2, w / 2, width - w, height - w);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(1, w * 0.18);
  ctx.strokeRect(w * 2.2, w * 2.2, width - w * 4.4, height - w * 4.4);
}

/**
 * Draw a cover onto a canvas sized to the state's export size.
 * `photos` maps a photo key (sample path or upload id) to a loaded image.
 */
export function drawCover(canvas, state, photos) {
  const size = EXPORT_SIZES[state.sizeId] ?? EXPORT_SIZES.wide;
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const { width, height } = size;
  const grade = GRADES[state.gradeId] ?? GRADES.sunset;
  const fx = state.effects;

  drawSky(ctx, grade, width, height);
  if (fx.sun) drawSun(ctx, grade, width, height);
  drawPanels(ctx, state, photos, width, height);
  if (fx.palms) drawPalms(ctx, grade, width, height);
  if (fx.halftone) drawHalftone(ctx, width, height);
  if (fx.scanlines) drawScanlines(ctx, width, height);
  drawCaption(ctx, state, width, height);
  if (fx.grain) drawGrain(ctx, width, height);
  if (fx.frame) drawFrame(ctx, width, height);
  return canvas;
}

/** Render a cover at its export size on a fresh canvas and return it. */
export function exportCover(state, photos) {
  return drawCover(document.createElement('canvas'), state, photos);
}

/** The layouts this build offers, for the editor's buttons. */
export function layoutList() {
  return Object.values(LAYOUTS);
}
