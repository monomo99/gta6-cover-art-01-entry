// Vice City Cover Studio — face-aware crop.
// The top cover-art entries keep faces in frame when they crop a photo
// into a panel. There is no network here and no face model to download,
// so this module finds the face the cheap honest way: skin-toned pixels
// cluster where a person stands. It scans a small copy of the photo,
// scores each grid cell by how many skin pixels it holds, and returns
// the centre of the densest cluster as the crop focus (0..1 in image
// space). The user can also tap a panel to set the focus by hand — that
// always wins over the automatic guess.

// A pixel counts as skin when it is warm, red-dominant and saturated
// enough. The band is deliberately wide: it catches a range of skin
// tones in sun, shade and neon light, and it ignores the sky and sea.
function isSkin(r, g, b) {
  if (r < 90 || g < 35 || b < 18) return false;
  if (r <= g || r <= b) return false;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread < 14) return false;
  if (r - g < 12) return false;
  return true;
}

// Find the face focus of a loaded image. Returns {x, y, score} in 0..1,
// or null when no skin cluster is strong enough to trust.
export function analyseFace(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  const probe = document.createElement('canvas');
  const pw = 120;
  const ph = Math.max(30, Math.round((120 * h) / w));
  probe.width = pw;
  probe.height = ph;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  if (!pctx) return null;
  pctx.drawImage(img, 0, 0, pw, ph);
  let data;
  try {
    data = pctx.getImageData(0, 0, pw, ph).data;
  } catch {
    return null;
  }
  // Grid the probe into cells and count skin pixels per cell.
  const cols = 10;
  const rows = 8;
  const counts = new Array(cols * rows).fill(0);
  let total = 0;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      if (isSkin(data[i], data[i + 1], data[i + 2])) {
        const c = Math.min(cols - 1, Math.floor((x / pw) * cols));
        const r = Math.min(rows - 1, Math.floor((y / ph) * rows));
        counts[r * cols + c] += 1;
        total += 1;
      }
    }
  }
  // Need a real cluster, not a few stray warm pixels.
  if (total < 40) return null;
  // Densest cell wins; then average the skin pixels around it so the
  // focus lands on the middle of the face, not on a cell corner.
  let best = 0;
  let bestCount = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > bestCount) {
      bestCount = counts[i];
      best = i;
    }
  }
  const bc = best % cols;
  const br = Math.floor(best / cols);
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const c = Math.min(cols - 1, Math.floor((x / pw) * cols));
      const r = Math.min(rows - 1, Math.floor((y / ph) * rows));
      if (Math.abs(c - bc) > 1 || Math.abs(r - br) > 1) continue;
      const i = (y * pw + x) * 4;
      if (isSkin(data[i], data[i + 1], data[i + 2])) {
        sx += x + 0.5;
        sy += y + 0.5;
        n += 1;
      }
    }
  }
  if (n < 12) return null;
  return {
    x: Math.min(0.95, Math.max(0.05, sx / n / pw)),
    y: Math.min(0.95, Math.max(0.05, sy / n / ph)),
    score: Math.min(1, bestCount / 120),
  };
}

// The crop window (source rect) for a panel. When the panel has a face
// focus, the window centres on it so the face stays in frame; otherwise
// it uses the panel's pan point. `view` is the panel rect on the poster.
export function faceCropWindow(imgW, imgH, view, panel) {
  const zoom = panel.zoom || 1;
  const scale = Math.max(view.w / imgW, view.h / imgH) * zoom;
  const sw = view.w / scale;
  const sh = view.h / scale;
  const focus = panel.focus || { x: panel.panX ?? 0.5, y: panel.panY ?? 0.5 };
  // Centre the window on the focus, then clamp it inside the image.
  let sx = focus.x * imgW - sw / 2;
  let sy = focus.y * imgH - sh / 2;
  sx = Math.min(Math.max(0, sx), Math.max(0, imgW - sw));
  sy = Math.min(Math.max(0, sy), Math.max(0, imgH - sh));
  return { sx, sy, sw, sh };
}

// Run the detector on a panel's image and store the focus on the panel.
// Returns the focus (or null). Safe to call on every load: a manual
// focus set by the user is never overwritten.
export function detectPanelFace(panel, img) {
  if (!img || panel.focus) return panel.focus;
  const found = analyseFace(img);
  if (found) panel.focus = { x: found.x, y: found.y };
  return panel.focus;
}
