// Vice City Cover Studio — chrome and outline title treatments.
// The covers that win paint their titles like chrome: a bright gradient,
// thin horizontal stripes and a hard extrusion behind the letters, so
// the word reads as a solid metal sign. This module paints a title onto
// an offscreen canvas (so the stripes clip to the letter shapes) and
// stamps the result onto the poster. It also paints a hollow outline
// title for the third treatment.

// Paint `text` in `font` at `size` into a fresh canvas and return it.
// `paint` draws the letters; the caller composes the result.
function letterCanvas(text, font, size) {
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `${size}px ${font}`;
  let ls = 0;
  try {
    ls = parseFloat(getComputedStyle(document.body).letterSpacing) || 0;
  } catch {
    ls = 0;
  }
  const spacing = Math.max(2, size * 0.04);
  const tw = measure.measureText(text).width + spacing * Math.max(0, text.length - 1);
  const pad = Math.ceil(size * 0.35);
  const c = document.createElement('canvas');
  c.width = Math.ceil(tw + pad * 2);
  c.height = Math.ceil(size * 1.7);
  const ctx = c.getContext('2d');
  ctx.font = `${size}px ${font}`;
  try {
    ctx.letterSpacing = `${spacing}px`;
  } catch {
    /* older canvas: no letterSpacing */
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  return { canvas: c, ctx, pad, tw };
}

// A chrome title: dark extrusion copies stacked down-right, then the
// letters filled with a bright vertical chrome gradient, then thin dark
// stripes clipped to the letters, then a hairline highlight on top.
export function chromeTitle(text, font, size, colour) {
  const { canvas, ctx, pad } = letterCanvas(text, font, size);
  const cy = canvas.height / 2;
  const depth = Math.max(2, Math.round(size * 0.07));
  // Extrusion: the same word, stepped down-right in near-black.
  ctx.fillStyle = 'rgba(12,4,28,0.9)';
  for (let i = depth; i >= 1; i--) {
    ctx.fillText(text, pad + i * 0.6, cy + i);
  }
  // Chrome fill: bright top, deep middle, bright bottom edge.
  const grad = ctx.createLinearGradient(0, cy - size * 0.5, 0, cy + size * 0.5);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, colour || '#ffd166');
  grad.addColorStop(0.55, '#8a5a2b');
  grad.addColorStop(0.75, '#ffe9a8');
  grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad;
  ctx.fillText(text, pad, cy);
  // Stripes clipped to the letters: keep only what overlaps the fill.
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(10,4,24,0.28)';
  const stripeH = Math.max(2, size * 0.045);
  for (let y = cy - size * 0.5; y < cy + size * 0.5; y += stripeH * 2.4) {
    ctx.fillRect(0, y, canvas.width, stripeH);
  }
  ctx.globalCompositeOperation = 'source-over';
  // Top hairline highlight.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(1, size * 0.015);
  ctx.strokeText(text, pad, cy - size * 0.06);
  return canvas;
}

// A hollow outline title: thick coloured stroke, transparent middle,
// so the photo shows through the letters.
export function outlineTitle(text, font, size, colour) {
  const { canvas, ctx, pad } = letterCanvas(text, font, size);
  const cy = canvas.height / 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colour || '#ffffff';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeText(text, pad, cy);
  ctx.fillStyle = 'rgba(8,2,18,0.35)';
  ctx.fillText(text, pad, cy);
  return canvas;
}

// A solid title: flat fill with a soft neon shadow baked in.
export function solidTitle(text, font, size, colour, glow) {
  const { canvas, ctx, pad } = letterCanvas(text, font, size);
  const cy = canvas.height / 2;
  ctx.shadowColor = glow || '#ff2e88';
  ctx.shadowBlur = size * 0.22;
  ctx.fillStyle = colour || '#ffffff';
  ctx.fillText(text, pad, cy);
  return canvas;
}

// Pick the treatment by style id. Returns a canvas the poster can stamp.
export function paintTitle(text, font, size, style, colour, glow) {
  if (style === 'chrome') return chromeTitle(text, font, size, colour);
  if (style === 'outline') return outlineTitle(text, font, size, colour);
  return solidTitle(text, font, size, colour, glow);
}
