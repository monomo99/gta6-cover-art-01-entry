// Neon Shore Cover Studio — poster painter.
// Turns the live poster state into pixels on one canvas: photo panels
// under a colour grade, halftone dots, bird marks, film grain, the
// caption lettering and the poster border. Plain 2D canvas throughout,
// no libraries, nothing fetched from anywhere.

// A pocket deterministic random: the same seed always deals the same
// speckle, so a poster never shimmers from one render to the next.
function mulberry32(seed) {
  let n = seed >>> 0;
  return function () {
    n |= 0;
    n = (n + 0x6d2b79f5) | 0;
    let m = Math.imul(n ^ (n >>> 15), 1 | n);
    m = (m + Math.imul(m ^ (m >>> 7), 61 | m)) ^ m;
    return ((m ^ (m >>> 14)) >>> 0) / 4294967296;
  };
}

// Panel boxes for a layout, in canvas pixels. Every box carries
// {x, y, w, h, tilt} — tilt is a lean in radians, used by snapshots only.
function panelBoxes(kind, W, H) {
  const gap = Math.max(6, Math.round(W * 0.012));
  const band = Math.round(H * 0.17);
  const boxes = [];
  if (kind === 'vice-grid') {
    const photoH = H - band;
    const heroW = Math.round((W - 3 * gap) * 0.62);
    const sideX = gap + heroW + gap;
    const sideW = W - sideX - gap;
    const sideH = Math.round((photoH - 3 * gap) / 2);
    boxes.push({ x: gap, y: gap, w: heroW, h: photoH - 2 * gap, tilt: 0 });
    boxes.push({ x: sideX, y: gap, w: sideW, h: sideH, tilt: 0 });
    boxes.push({ x: sideX, y: gap + sideH + gap, w: sideW, h: sideH, tilt: 0 });
  } else if (kind === 'nine') {
    const photoH = H - band;
    const cellW = Math.round((W - 4 * gap) / 3);
    const cellH = Math.round((photoH - 4 * gap) / 3);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        boxes.push({ x: gap + col * (cellW + gap), y: gap + row * (cellH + gap), w: cellW, h: cellH, tilt: 0 });
      }
    }
  } else {
    // snapshots: three leaning prints with a white rim, lettering below.
    const printW = Math.round((W - 4 * gap) / 3);
    const printH = Math.round(H * 0.58);
    const printTop = Math.round(H * 0.07);
    const leans = [-0.035, 0.028, -0.02];
    for (let i = 0; i < 3; i++) {
      boxes.push({ x: gap + i * (printW + gap), y: printTop, w: printW, h: printH, tilt: leans[i] });
    }
  }
  return boxes;
}

// Where the lettering band starts (its top edge) for a layout.
function captionTop(kind, H) {
  if (kind === 'snapshots') return Math.round(H * 0.72);
  return H - Math.round(H * 0.17);
}

// Paint one photo so it covers a box: cropped, zoomed, panned, flipped.
// The crop window centers on the photo's focal point (see SAMPLE_PHOTOS)
// instead of the dead middle, so a tall portrait still shows its faces
// and guns inside a wide panel; the panel's own pan then shifts from
// there. The shift is clamped to the picture's slack, so no bare edge
// can ever show.
function paintPhoto(ctx, img, box, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const fit = Math.max(box.w / iw, box.h / ih);
  const zoomed = fit * (panel.zoom || 1);
  const pw = iw * zoomed;
  const ph = ih * zoomed;
  const focal = (panel.photo && SAMPLE_PHOTOS[panel.photo] && SAMPLE_PHOTOS[panel.photo].focus) || null;
  let fx = focal ? focal.x : 0.5;
  const fy = focal ? focal.y : 0.5;
  if (panel.flip) fx = 1 - fx;
  const slackX = Math.max(0, (pw - box.w) / 2);
  const slackY = Math.max(0, (ph - box.h) / 2);
  let dx = (0.5 - fx) * pw + (panel.ox || 0) * box.w * 0.5;
  let dy = (0.5 - fy) * ph + (panel.oy || 0) * box.h * 0.5;
  dx = Math.max(-slackX, Math.min(slackX, dx));
  dy = Math.max(-slackY, Math.min(slackY, dy));
  const px = box.x + box.w / 2 + dx;
  const py = box.y + box.h / 2 + dy;
  ctx.save();
  ctx.translate(px, py);
  if (panel.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
  ctx.restore();
}

// A soft rounded-rectangle clip path.
function roundClip(ctx, left, top, wide, tall, rad) {
  ctx.beginPath();
  ctx.moveTo(left + rad, top);
  ctx.arcTo(left + wide, top, left + wide, top + tall, rad);
  ctx.arcTo(left + wide, top + tall, left, top + tall, rad);
  ctx.arcTo(left, top + tall, left, top, rad);
  ctx.arcTo(left, top, left + wide, top, rad);
  ctx.closePath();
}

// Wash one panel with the grade's tint colour.
function washPanel(ctx, box, grade) {
  ctx.save();
  ctx.globalAlpha = grade.tintAlpha;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

// Halftone dots: a grid whose dots swell toward the poster's foot.
function dotScreen(ctx, W, H) {
  const gap = Math.max(10, Math.round(W / 72));
  ctx.save();
  ctx.fillStyle = '#000000';
  for (let yy = gap / 2; yy < H; yy += gap) {
    const depth = yy / H;
    const dot = Math.max(0.6, gap * 0.16 * (0.4 + depth));
    ctx.globalAlpha = 0.05 + 0.09 * depth;
    for (let xx = gap / 2; xx < W; xx += gap) {
      ctx.beginPath();
      ctx.arc(xx, yy, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// A few bird marks: two short curved strokes each, high in the sky.
function birdMarks(ctx, W, H) {
  const marks = [
    [0.16, 0.055, 1.0], [0.24, 0.085, 0.8], [0.31, 0.045, 0.65],
    [0.55, 0.07, 0.9], [0.68, 0.05, 0.7],
  ];
  ctx.save();
  ctx.strokeStyle = 'rgba(20, 8, 30, 0.85)';
  ctx.lineCap = 'round';
  for (let i = 0; i < marks.length; i++) {
    const spot = marks[i];
    const bx = spot[0] * W;
    const by = spot[1] * H;
    const bw = Math.round(W * 0.022 * spot[2]);
    const bh = Math.round(bw * 0.45);
    ctx.lineWidth = Math.max(1.5, W * 0.0022);
    ctx.beginPath();
    ctx.moveTo(bx - bw, by);
    ctx.quadraticCurveTo(bx - bw * 0.45, by - bh, bx, by);
    ctx.quadraticCurveTo(bx + bw * 0.45, by - bh, bx + bw, by);
    ctx.stroke();
  }
  ctx.restore();
}

// A sprinkle of film grain, seeded so it never flickers between renders.
function grainSpeckle(ctx, W, H) {
  const rnd = mulberry32(20261120);
  const total = Math.round((W * H) / 9000);
  ctx.save();
  for (let n = 0; n < total; n++) {
    const gx = rnd() * W;
    const gy = rnd() * H;
    ctx.globalAlpha = 0.03 + rnd() * 0.05;
    ctx.fillStyle = rnd() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(gx, gy, 1.5, 1.5);
  }
  ctx.restore();
}

// The lettering band: a sunset gradient, the big display title and the
// script subtitle, with a thin accent rule between them.
//
// The band is stacked in three lanes that never share a row: the script
// subtitle rides near the top, the accent rule divides the band, and the
// display title fills the lower lane on its own. Nothing in one lane
// reaches into another, so the subtitle can never sit on the title.
function paintLettering(ctx, W, H, state, grade) {
  const top = captionTop(state.layout, H);
  const bandH = H - top;
  const mid = W / 2;

  const sky = ctx.createLinearGradient(0, top, 0, H);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, top, W, bandH);
  // A dark wash at the very bottom so the title always reads.
  const shade = ctx.createLinearGradient(0, top, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, top, W, bandH);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = (state.title || 'NEON SHORE').toUpperCase();
  // Fit the title to the width: shrink until it fits.
  let titleSize = Math.round(bandH * 0.4);
  ctx.font = `${titleSize}px Anton, 'Arial Black', sans-serif`;
  while (titleSize > 20 && ctx.measureText(words).width > W * 0.92) {
    titleSize -= 4;
    ctx.font = `${titleSize}px Anton, 'Arial Black', sans-serif`;
  }

  // Lane one, top of the band: the script subtitle, on its own.
  if (state.subtitle) {
    ctx.font = `${Math.round(bandH * 0.17)}px Pacifico, cursive`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(state.subtitle, mid, top + bandH * 0.15);
  }
  // Lane two, the divider: a thin accent rule between subtitle and title.
  ctx.fillStyle = grade.accent;
  const ruleW = Math.round(W * 0.18);
  ctx.fillRect(mid - ruleW / 2, top + bandH * 0.31, ruleW, Math.max(3, Math.round(H * 0.004)));
  // Lane three, the lower band: the title with a deep shadow for punch.
  const titleY = top + bandH * 0.66;
  ctx.font = `${titleSize}px Anton, 'Arial Black', sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(words, mid + titleSize * 0.045, titleY + titleSize * 0.06);
  ctx.fillStyle = grade.caption;
  ctx.fillText(words, mid, titleY);
}

// The bold poster frame: a white outer border and an accent inner line.
function posterBorder(ctx, W, H, grade) {
  const edge = Math.max(10, Math.round(W * 0.018));
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = edge;
  ctx.strokeRect(edge / 2, edge / 2, W - edge, H - edge);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(2, Math.round(W * 0.003));
  ctx.strokeRect(edge + 6, edge + 6, W - 2 * edge - 12, H - 2 * edge - 12);
  ctx.restore();
}

// Paint the whole poster onto `canvas` (sized from state.size).
// `images` maps sample keys to loaded <img> elements.
function renderCover(canvas, state, images) {
  const pick = EXPORT_SIZES[state.size] || EXPORT_SIZES['1080x1080'];
  canvas.width = pick.w;
  canvas.height = pick.h;
  const ctx = canvas.getContext('2d');
  const W = pick.w;
  const H = pick.h;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const corner = Math.max(4, Math.round(W * 0.008));

  // Backdrop: the grade's deep colour, so gaps read as poster, not blank.
  ctx.fillStyle = grade.band;
  ctx.fillRect(0, 0, W, H);

  const boxes = panelBoxes(state.layout, W, H);
  const panels = activePanels();
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    const panel = panels[i] || freshPanel('boulevard');
    const img = panel.photo === 'custom' ? panel.customImg : images[panel.photo];
    ctx.save();
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
    if (box.tilt) ctx.rotate(box.tilt);
    ctx.translate(-box.w / 2, -box.h / 2);
    if (state.layout === 'snapshots') {
      // White print border around the photo.
      const rim = Math.max(8, Math.round(W * 0.012));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-rim, -rim, box.w + 2 * rim, box.h + 2 * rim + Math.round(H * 0.05));
    }
    ctx.save();
    roundClip(ctx, 0, 0, box.w, box.h, corner);
    ctx.clip();
    if (img) paintPhoto(ctx, img, { x: 0, y: 0, w: box.w, h: box.h }, panel);
    ctx.restore();
    washPanel(ctx, { x: 0, y: 0, w: box.w, h: box.h }, grade);
    ctx.restore();
  }

  if (state.halftone) dotScreen(ctx, W, H);
  grainSpeckle(ctx, W, H);
  if (state.birds) birdMarks(ctx, W, H);
  paintLettering(ctx, W, H, state, grade);
  if (state.frame) posterBorder(ctx, W, H, grade);
  return canvas;
}

// Paint into a fresh offscreen canvas and hand it back (for export).
function renderExportCanvas(state, images) {
  return renderCover(document.createElement('canvas'), state, images);
}
