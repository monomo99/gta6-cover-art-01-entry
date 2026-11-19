// Neon Shore Cover Studio — the cover renderer.
// Draws the whole poster onto a canvas: photo panels, colour grade,
// halftone dots, bird silhouettes, caption lettering and the poster frame.
// Vanilla 2D canvas only; no libraries, no network.

// A tiny deterministic random generator so the grain looks the same on
// every render of the same poster.
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Panel rectangles for a layout, in canvas pixels. Each rect is
// {x, y, w, h, rot} — rot is a tilt in radians (snapshots only).
function panelRects(layout, W, H) {
  const g = Math.max(6, Math.round(W * 0.012));
  const band = Math.round(H * 0.17);
  const rects = [];
  if (layout === 'vice-grid') {
    const ch = H - band;
    const heroW = Math.round((W - 3 * g) * 0.62);
    rects.push({ x: g, y: g, w: heroW, h: ch - 2 * g, rot: 0 });
    const rx = g + heroW + g;
    const rw = W - rx - g;
    const rh = Math.round((ch - 3 * g) / 2);
    rects.push({ x: rx, y: g, w: rw, h: rh, rot: 0 });
    rects.push({ x: rx, y: g + rh + g, w: rw, h: rh, rot: 0 });
  } else if (layout === 'nine') {
    const ch = H - band;
    const cw = Math.round((W - 4 * g) / 3);
    const chh = Math.round((ch - 4 * g) / 3);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        rects.push({ x: g + c * (cw + g), y: g + r * (chh + g), w: cw, h: chh, rot: 0 });
      }
    }
  } else {
    // snapshots: three tilted prints with a white border, caption below.
    const pw = Math.round((W - 4 * g) / 3);
    const ph = Math.round(H * 0.58);
    const top = Math.round(H * 0.07);
    const tilts = [-0.035, 0.028, -0.02];
    for (let i = 0; i < 3; i++) {
      rects.push({ x: g + i * (pw + g), y: top, w: pw, h: ph, rot: tilts[i] });
    }
  }
  return rects;
}

// Where the caption band starts (its top edge) for a layout.
function captionBandTop(layout, H) {
  if (layout === 'snapshots') return Math.round(H * 0.72);
  return H - Math.round(H * 0.17);
}

// Draw one image so it covers a rect: cropped, zoomed, panned, flipped.
function drawPhotoCover(ctx, img, rect, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const cx = rect.x + rect.w / 2 + (panel.ox || 0) * rect.w * 0.5;
  const cy = rect.y + rect.h / 2 + (panel.oy || 0) * rect.h * 0.5;
  ctx.save();
  ctx.translate(cx, cy);
  if (panel.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

// A soft rounded-rectangle clip path.
function clipRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Wash one panel with the grade's tint colour.
function tintPanel(ctx, rect, grade) {
  ctx.save();
  ctx.globalAlpha = grade.tintAlpha;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// Halftone dots: a grid whose dots grow toward the bottom of the poster.
function drawHalftone(ctx, W, H) {
  const step = Math.max(10, Math.round(W / 72));
  ctx.save();
  ctx.fillStyle = '#000000';
  for (let y = step / 2; y < H; y += step) {
    const depth = y / H;
    for (let x = step / 2; x < W; x += step) {
      const r = Math.max(0.6, step * 0.16 * (0.4 + depth));
      ctx.globalAlpha = 0.05 + 0.09 * depth;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// A few bird silhouettes: two short curved strokes each, high in the sky.
function drawBirds(ctx, W, H) {
  const spots = [
    [0.16, 0.055, 1.0], [0.24, 0.085, 0.8], [0.31, 0.045, 0.65],
    [0.55, 0.07, 0.9], [0.68, 0.05, 0.7],
  ];
  ctx.save();
  ctx.strokeStyle = 'rgba(20, 8, 30, 0.85)';
  ctx.lineCap = 'round';
  for (const [fx, fy, s] of spots) {
    const x = fx * W;
    const y = fy * H;
    const w = Math.round(W * 0.022 * s);
    const h = Math.round(w * 0.45);
    ctx.lineWidth = Math.max(1.5, W * 0.0022);
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 0.45, y - h, x, y);
    ctx.quadraticCurveTo(x + w * 0.45, y - h, x + w, y);
    ctx.stroke();
  }
  ctx.restore();
}

// A sprinkle of film grain, seeded so it never flickers between renders.
function drawGrain(ctx, W, H) {
  const rnd = seededRandom(20261120);
  const count = Math.round((W * H) / 9000);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    ctx.globalAlpha = 0.03 + rnd() * 0.05;
    ctx.fillStyle = rnd() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.restore();
}

// The caption band: a sunset gradient, the big display title and the
// script subtitle, plus a thin accent rule above the title.
function drawCaption(ctx, W, H, state, grade) {
  const top = captionBandTop(state.layout, H);
  const bandH = H - top;
  const sky = ctx.createLinearGradient(0, top, 0, H);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, top, W, bandH);
  // A dark wash at the very bottom so the title always reads.
  const wash = ctx.createLinearGradient(0, top, 0, H);
  wash.addColorStop(0, 'rgba(0,0,0,0)');
  wash.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, top, W, bandH);

  const cx = W / 2;
  const title = (state.title || 'NEON SHORE').toUpperCase();
  // Fit the title to the width: shrink until it fits.
  let size = Math.round(bandH * 0.52);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  while (size > 20) {
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    if (ctx.measureText(title).width <= W * 0.92) break;
    size -= 4;
  }
  const titleY = top + bandH * 0.56;
  // Accent rule above the title.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(W * 0.5 - Math.round(W * 0.09), top + bandH * 0.14, Math.round(W * 0.18), Math.max(3, Math.round(H * 0.004)));
  // Subtitle in script lettering.
  if (state.subtitle) {
    ctx.font = `${Math.round(bandH * 0.2)}px Pacifico, cursive`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(state.subtitle, cx, top + bandH * 0.3);
  }
  // Title with a deep shadow for punch.
  ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(title, cx + size * 0.045, titleY + size * 0.06);
  ctx.fillStyle = grade.caption;
  ctx.fillText(title, cx, titleY);
}

// The bold poster frame: a white outer border and an accent inner line.
function drawFrame(ctx, W, H, grade) {
  const bw = Math.max(10, Math.round(W * 0.018));
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = bw;
  ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(2, Math.round(W * 0.003));
  ctx.strokeRect(bw + 6, bw + 6, W - 2 * bw - 12, H - 2 * bw - 12);
  ctx.restore();
}

// Render the whole poster onto `canvas` (sized from state.size).
// `images` maps sample keys to loaded <img> elements.
function renderCover(canvas, state, images) {
  const size = EXPORT_SIZES[state.size] || EXPORT_SIZES['1080x1080'];
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const W = size.w;
  const H = size.h;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const r = Math.max(4, Math.round(W * 0.008));

  // Backdrop: the grade's deep colour, so gaps read as poster, not blank.
  ctx.fillStyle = grade.band;
  ctx.fillRect(0, 0, W, H);

  const rects = panelRects(state.layout, W, H);
  const panels = activePanels();
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    const panel = panels[i] || freshPanel('boulevard');
    const img = panel.photo === 'custom' ? panel.customImg : images[panel.photo];
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
    } else {
      ctx.translate(rect.x, rect.y);
    }
    if (state.layout === 'snapshots') {
      // White print border around the photo.
      const bw = Math.max(8, Math.round(W * 0.012));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-bw, -bw, rect.w + 2 * bw, rect.h + 2 * bw + Math.round(H * 0.05));
      ctx.save();
      clipRoundRect(ctx, 0, 0, rect.w, rect.h, r);
      ctx.clip();
      if (img) drawPhotoCover(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, panel);
      ctx.restore();
      tintPanel(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, grade);
    } else {
      ctx.save();
      clipRoundRect(ctx, 0, 0, rect.w, rect.h, r);
      ctx.clip();
      if (img) drawPhotoCover(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, panel);
      ctx.restore();
      tintPanel(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, grade);
    }
    ctx.restore();
  }

  if (state.halftone) drawHalftone(ctx, W, H);
  drawGrain(ctx, W, H);
  if (state.birds) drawBirds(ctx, W, H);
  drawCaption(ctx, W, H, state, grade);
  if (state.frame) drawFrame(ctx, W, H, grade);
  return canvas;
}

// Render into a fresh offscreen canvas and hand it back (for export).
function renderExportCanvas(state, images) {
  const canvas = document.createElement('canvas');
  return renderCover(canvas, state, images);
}
