// Vice City Cover Studio — the poster painter.
// Paints the whole cover onto any canvas at any size: grade sky, synthwave
// sun, photo panels (face-aware crop), palm silhouettes, halftone, caption
// (solid / retro-chrome / outline titles), a GTA HUD, role tags on the
// panels, a billing block and a studio seal. Everything is drawn from the
// poster state; no network, no external assets.
import { gradeById, layoutById, faceById, stationById, SAMPLES } from './data.js';
import { faceCropWindow } from './faceCrop.js';
import { paintTitle } from './chromeTitle.js';
import { drawSticker, paintDistress, paintGrain } from './fx.js';

// Rounded-rect path helper.
function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// Truncate text with an ellipsis so it fits maxW.
function fitLine(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

// Panel rects for a layout: fractional cells scaled into the inner poster,
// with an outer frame margin and a gap between panels.
export function panelRects(layout, W, H) {
  const margin = Math.round(Math.min(W, H) * 0.028);
  const gap = Math.round(Math.min(W, H) * 0.012);
  const inner = { x: margin, y: margin, w: W - margin * 2, h: H - margin * 2 };
  return layout.cells.map((c) => {
    const x = inner.x + c.x * inner.w;
    const y = inner.y + c.y * inner.h;
    const w = c.w * inner.w;
    const h = c.h * inner.h;
    const lastCol = c.x + c.w >= 0.999;
    const lastRow = c.y + c.h >= 0.999;
    return {
      x: x + (c.x > 0 ? gap / 2 : 0),
      y: y + (c.y > 0 ? gap / 2 : 0),
      w: w - (c.x > 0 ? gap / 2 : 0) - (lastCol ? 0 : gap / 2),
      h: h - (c.y > 0 ? gap / 2 : 0) - (lastRow ? 0 : gap / 2),
    };
  });
}

// The sky: a three-stop vertical gradient from the grade.
function paintSky(ctx, grade, W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.top);
  sky.addColorStop(0.55, grade.mid);
  sky.addColorStop(1, grade.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
}

// The synthwave sun: a glowing disc sliced by gaps, with a reflection
// column shimmering down the water below it.
function paintSun(ctx, grade, W, H) {
  const cx = W * 0.5;
  const cy = H * grade.sunH;
  const r = Math.min(W, H) * 0.17;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
  glow.addColorStop(0, grade.sun + 'cc');
  glow.addColorStop(1, grade.sun + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const body = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  body.addColorStop(0, '#fff3c4');
  body.addColorStop(0.55, grade.sun);
  body.addColorStop(1, grade.accent);
  ctx.fillStyle = body;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slice gaps across the lower half, wider toward the bottom.
  ctx.fillStyle = grade.top;
  let yy = cy + r * 0.05;
  let thick = Math.max(2, r * 0.03);
  while (yy < cy + r) {
    ctx.fillRect(cx - r, yy, r * 2, thick);
    yy += thick + r * 0.16;
    thick *= 1.5;
  }
  ctx.restore();
  // Reflection: a soft vertical streak under the sun.
  const streak = ctx.createLinearGradient(cx, cy + r, cx, H * 0.95);
  streak.addColorStop(0, grade.sun + '55');
  streak.addColorStop(1, grade.sun + '00');
  ctx.fillStyle = streak;
  ctx.fillRect(cx - r * 0.28, cy + r, r * 0.56, H * 0.95 - (cy + r));
}

// The sea band along the bottom third.
function paintSea(ctx, grade, W, H) {
  const sea = ctx.createLinearGradient(0, H * 0.66, 0, H);
  sea.addColorStop(0, grade.water + '00');
  sea.addColorStop(1, grade.water);
  ctx.fillStyle = sea;
  ctx.fillRect(0, H * 0.66, W, H * 0.34);
}

// Halftone dots in a staggered grid, fading down the sky.
function paintDots(ctx, grade, W, H) {
  ctx.save();
  ctx.fillStyle = grade.ink;
  const step = Math.max(10, W * 0.018);
  let row = 0;
  for (let y = H * 0.06; y < H * 0.42; y += step) {
    const fade = 1 - (y - H * 0.06) / (H * 0.36);
    const offset = row % 2 === 0 ? 0 : step / 2;
    for (let x = step / 2 + offset; x < W; x += step) {
      ctx.globalAlpha = 0.1 * fade;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, step * 0.09 * fade + 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    row++;
  }
  ctx.restore();
}

// One photo panel: the image cover-fitted with the face-aware crop, an
// optional flip, and a white keyline. A missing photo gets a grade
// placeholder so the poster never renders blank.
function paintPanel(ctx, img, rect, panel, grade, label) {
  const { x, y, w, h } = rect;
  if (img && (img.complete || img.naturalWidth)) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const win = faceCropWindow(iw, ih, rect, panel);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (panel.flip) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, win.sx, win.sy, win.sw, win.sh, 0, 0, w, h);
    } else {
      ctx.drawImage(img, win.sx, win.sy, win.sw, win.sh, x, y, w, h);
    }
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, grade.top);
    g.addColorStop(1, grade.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.max(14, h * 0.07)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.004);
  ctx.strokeRect(x, y, w, h);
}

// Role tag painted on a panel: the sample's crew role in a small dark
// chip on the panel's left edge, vertically centred — clear of the HUD,
// which owns the poster's corners (mission card, wanted stars, minimap,
// health bars, ticker).
function paintRoleTag(ctx, rect, role, W, H) {
  if (!role) return;
  const size = Math.max(10, Math.min(W, H) * 0.016);
  ctx.save();
  ctx.font = `bold ${size}px "Bebas Neue", sans-serif`;
  const tw = ctx.measureText(role).width;
  const pad = size * 0.7;
  const bw = tw + pad * 2;
  const bh = size * 1.7;
  const bx = rect.x + Math.max(6, rect.w * 0.02);
  const by = rect.y + rect.h / 2 - bh / 2;
  roundRect(ctx, bx, by, bw, bh, size * 0.3);
  ctx.fillStyle = 'rgba(8,2,18,0.72)';
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, bx + pad, by + bh / 2 + 1);
  ctx.restore();
}

// Palm silhouettes along the bottom edge, drawn in the grade's ink.
function paintPalms(ctx, grade, W, H) {
  const ink = grade.ink;
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.9;
  ctx.lineCap = 'round';
  const palm = (bx, by, s, lean) => {
    ctx.lineWidth = Math.max(3, s * 0.045);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + lean * s * 0.4, by - s * 0.55, bx + lean * s * 0.55, by - s);
    ctx.stroke();
    const tx = bx + lean * s * 0.55;
    const ty = by - s;
    ctx.lineWidth = Math.max(2, s * 0.03);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * 0.15 - (i * Math.PI) / 7.5 + (lean > 0 ? 0.35 : -0.35);
      const len = s * (0.42 - Math.abs(i - 2.5) * 0.045);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(
        tx + Math.cos(a) * len * 0.6,
        ty + Math.sin(a) * len * 0.6 - s * 0.1,
        tx + Math.cos(a) * len,
        ty + Math.sin(a) * len + s * 0.22,
      );
      ctx.stroke();
    }
  };
  palm(W * 0.06, H * 1.02, H * 0.16, 1);
  palm(W * 0.94, H * 1.02, H * 0.13, -1);
  palm(W * 0.84, H * 1.01, H * 0.09, 1);
  ctx.restore();
}

// The caption block: title (solid / retro-chrome / outline), subtitle,
// tagline, tilted, on a readable band. For the Pop-Out layout the title
// sits lower, under the hero medallion.
function paintCaption(ctx, poster, grade, W, H, accent) {
  const top = poster.banner !== 'bottom';
  const pop = layoutById(poster.layout).pop;
  const bandH = H * 0.3;
  const bandY = top ? 0 : H - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (top) {
    band.addColorStop(0, 'rgba(10,4,24,0.72)');
    band.addColorStop(1, 'rgba(10,4,24,0)');
  } else {
    band.addColorStop(0, 'rgba(10,4,24,0)');
    band.addColorStop(1, 'rgba(10,4,24,0.72)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, bandH);

  const cx = W / 2;
  const cy = pop ? H * 0.44 : top ? H * 0.13 : H * 0.84;
  const titleFont = faceById(poster.titleFont).family;
  const subFont = faceById(poster.subFont).family;
  let size = H * 0.13 * (poster.titleSize || 1);
  const maxW = W * 0.88;
  // Measure with the title font so the chrome canvas can be scaled to fit.
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `${size}px "${titleFont}", sans-serif`;
  const tw = probe.measureText(poster.title || 'VICE CITY').width;
  if (tw > maxW) size *= maxW / tw;
  const titleCanvas = paintTitle(
    poster.title || 'VICE CITY',
    titleFont,
    size,
    poster.titleStyle || 'solid',
    poster.titleColor || '#ffffff',
    accent,
  );
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((poster.tilt || 0) * Math.PI) / 180);
  ctx.drawImage(titleCanvas, -titleCanvas.width / 2, -titleCanvas.height / 2);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((poster.tilt || 0) * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const subSize = Math.max(12, size * 0.34);
  ctx.font = `${subSize}px "${subFont}", sans-serif`;
  try {
    ctx.letterSpacing = `${Math.max(2, subSize * 0.22)}px`;
  } catch {
    /* older canvas */
  }
  ctx.fillStyle = accent;
  ctx.fillText(poster.subtitle || 'LEONIDA', 0, size * 0.62);
  ctx.font = `${Math.max(11, size * 0.2)}px "${subFont}", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(poster.tagline || '', 0, size * 0.95);
  ctx.restore();
}

// Pop-out hero medallion: the hero photo's face, cut into a big circle
// that overlaps the top frame border, with a white ring and a drop
// shadow — the hero breaks out of the frame.
function paintPopMedallion(ctx, poster, imgs, W, H) {
  const panel = poster.panels[poster.selected % poster.panels.length];
  const img = imgs[panel.src];
  if (!img || !(img.complete || img.naturalWidth)) return;
  const r = Math.min(W, H) * 0.2;
  const cx = W / 2;
  const cy = H * 0.14;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const focus = panel.focus || { x: panel.panX ?? 0.5, y: panel.panY ?? 0.5 };
  const side = Math.min(iw, ih) * 0.9;
  let sx = focus.x * iw - side / 2;
  let sy = focus.y * ih - side / 2;
  sx = Math.min(Math.max(0, sx), Math.max(0, iw - side));
  sy = Math.min(Math.max(0, sy), Math.max(0, ih - side));
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = r * 0.25;
  ctx.shadowOffsetY = r * 0.06;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.clip();
  if (panel.flip) {
    ctx.translate(cx + r * 0.92, cy - r * 0.92);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, r * 1.84, r * 1.84);
  } else {
    ctx.drawImage(img, sx, sy, side, side, cx - r * 0.92, cy - r * 0.92, r * 1.84, r * 1.84);
  }
  ctx.restore();
}

// WANTED level: gold stars under a small WANTED label, top-right.
function paintWanted(ctx, poster, W, H) {
  const m = Math.max(8, Math.min(W, H) * 0.028);
  const size = Math.max(16, H * 0.028);
  const gap = size * 0.18;
  const totalW = size * 5 + gap * 4;
  const boxW = totalW + size * 0.8;
  const boxH = size * 2.1;
  const bx = W - m - boxW;
  const by = m;
  ctx.save();
  roundRect(ctx, bx, by, boxW, boxH, size * 0.25);
  ctx.fillStyle = 'rgba(8,2,18,0.55)';
  ctx.fill();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = `bold ${Math.max(10, size * 0.45)}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('WANTED', W - m - size * 0.4, by + size * 0.14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px sans-serif`;
  const x0 = bx + size * 0.4;
  const starY = by + size * 1.35;
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * (size + gap);
    if (i < (poster.wanted || 0)) {
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ff9a00';
      ctx.shadowBlur = size * 0.25;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.shadowBlur = 0;
    }
    ctx.fillText('★', x, starY);
  }
  ctx.restore();
}

// Mission briefing card: name, objective, reward — with the studio seal
// stamped in its top-right corner. When the banner is on top the card
// sits below the caption band; in the Pop-Out layout the title sits low
// (under the hero medallion), so the card parks above the health bars
// instead of covering the title.
function paintJobCard(ctx, poster, W, H) {
  const m = Math.max(8, Math.min(W, H) * 0.028);
  const pad = Math.max(10, H * 0.014);
  const w = W * 0.44;
  const headSize = Math.max(11, H * 0.016);
  const nameSize = Math.max(14, H * 0.024);
  const bodySize = Math.max(11, H * 0.015);
  const h = pad * 2 + headSize + nameSize + bodySize * 2 + Math.max(8, H * 0.02);
  const x = m;
  let y;
  if (poster.banner === 'bottom') {
    y = m;
  } else if (layoutById(poster.layout).pop) {
    const tickerH = Math.max(20, H * 0.038);
    const lift = tickerH + Math.max(8, Math.min(W, H) * 0.028) * 0.5;
    const barH = Math.max(8, H * 0.014);
    const gap = Math.max(6, H * 0.012);
    y = H - lift - barH * 2 - gap - h - gap;
  } else {
    y = H * 0.31;
  }
  ctx.save();
  roundRect(ctx, x, y, w, h, Math.max(6, H * 0.008));
  ctx.fillStyle = 'rgba(8,2,18,0.78)';
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = Math.max(1.5, H * 0.002);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let cy = y + pad;
  ctx.font = `bold ${headSize}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = '#ffd166';
  ctx.fillText('MISSION BRIEFING', x + pad, cy);
  cy += headSize + Math.max(3, H * 0.004);
  ctx.font = `${nameSize}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(fitLine(ctx, poster.missionName || '', w - pad * 2), x + pad, cy);
  cy += nameSize + Math.max(3, H * 0.004);
  ctx.font = `${bodySize}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText(fitLine(ctx, poster.missionObjective || '', w - pad * 2), x + pad, cy);
  cy += bodySize + Math.max(3, H * 0.004);
  ctx.font = `bold ${bodySize}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = '#39d353';
  ctx.fillText(`REWARD  ${poster.missionReward || ''}`, x + pad, cy);
  ctx.restore();
  paintSeal(ctx, x + w - pad - H * 0.016, y + pad + H * 0.016, H * 0.016);
}

// Studio seal: a small double-ringed circle with a star, stamped on the
// mission card — the movie-poster studio stamp.
function paintSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r * 0.42 : r * 0.19;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Location stamp: the district, rotated, top-right under the wanted box.
function paintPlaceStamp(ctx, poster, W, H, accent) {
  const m = Math.max(8, Math.min(W, H) * 0.028);
  const size = Math.max(12, H * 0.02);
  ctx.save();
  const text = `${(poster.district || '').toUpperCase()} — LEONIDA`;
  ctx.font = `bold ${size}px "Bebas Neue", sans-serif`;
  const tw = ctx.measureText(text).width;
  const w = tw + size * 1.2;
  const h = size * 1.9;
  const x = W - m - w;
  const y = m + H * 0.075;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.06);
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

// Minimap, bottom-right: street grid, beach and a player blip.
function paintMiniMap(ctx, W, H, lift) {
  const m = Math.max(8, Math.min(W, H) * 0.028);
  const w = W * 0.22;
  const h = H * 0.16;
  const x = W - m - w;
  const y = H - lift - h;
  ctx.save();
  roundRect(ctx, x, y, w, h, Math.max(6, w * 0.04));
  ctx.fillStyle = 'rgba(6,10,24,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(1, w * 0.006);
  ctx.stroke();
  ctx.save();
  roundRect(ctx, x, y, w, h, Math.max(6, w * 0.04));
  ctx.clip();
  ctx.fillStyle = '#0e4a6b';
  ctx.fillRect(x + w * 0.78, y, w * 0.22, h);
  ctx.fillStyle = '#e8c98a';
  ctx.fillRect(x + w * 0.72, y, w * 0.06, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, w * 0.008);
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (w * 0.72 * i) / 5, y);
    ctx.lineTo(x + (w * 0.72 * i) / 5, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + (h * i) / 5);
    ctx.lineTo(x + w * 0.72, y + (h * i) / 5);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h * 0.9);
  ctx.lineTo(x + w * 0.75, y + h * 0.15);
  ctx.stroke();
  const bx = x + w * 0.42;
  const by = y + h * 0.55;
  ctx.fillStyle = '#ff2e88';
  ctx.beginPath();
  ctx.arc(bx, by, Math.max(3, w * 0.02), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, w * 0.006);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(9, h * 0.11)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('N', x + w * 0.04, y + h * 0.04);
  ctx.restore();
  ctx.restore();
}

// Health + armor bars, bottom-left.
function paintVitals(ctx, poster, W, H, lift) {
  const m = Math.max(8, Math.min(W, H) * 0.028);
  const w = W * 0.3;
  const barH = Math.max(8, H * 0.014);
  const gap = Math.max(6, H * 0.012);
  const labelW = Math.max(46, W * 0.055);
  const y2 = H - lift - barH;
  const y1 = y2 - gap - barH;
  ctx.save();
  ctx.font = `bold ${Math.max(10, barH * 0.95)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const bar = (y, value, color, label) => {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(m + labelW, y, w - labelW, barH);
    ctx.fillStyle = color;
    ctx.fillRect(m + labelW, y, (w - labelW) * Math.min(1, Math.max(0, value / 100)), barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(m + labelW, y, w - labelW, barH);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, m, y + barH / 2 + 1);
  };
  bar(y1, poster.health ?? 100, '#39d353', 'HEALTH');
  bar(y2, poster.armor ?? 0, '#7dd3fc', 'ARMOR');
  ctx.restore();
}

// Billing block: tiny movie-poster credits centred just above the radio
// ticker, naming the whole crew.
function paintBilling(ctx, poster, W, H, tickerH) {
  const size = Math.max(9, H * 0.011);
  const y = H - tickerH - size * 1.4;
  ctx.save();
  ctx.font = `${size}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const crew = SAMPLES.map((s) => s.role).join('  ·  ');
  ctx.fillText(`LEONIDA PICTURES presents  —  STARRING ${crew}`, W / 2, y - size * 0.9);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('A LEONIDA PRODUCTION  ·  FAN-MADE TOOL, NOT AFFILIATED WITH ROCKSTAR GAMES', W / 2, y + size * 0.9);
  ctx.restore();
}

// Radio ticker strip along the very bottom edge.
function paintAirwave(ctx, poster, W, H) {
  const h = Math.max(20, H * 0.038);
  const y = H - h;
  ctx.save();
  ctx.fillStyle = 'rgba(5,2,14,0.85)';
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(0, y, W, Math.max(2, h * 0.07));
  const station = stationById(poster.radio);
  const size = Math.max(11, h * 0.42);
  const left = Math.max(8, W * 0.02);
  ctx.font = `${size}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd166';
  const label = `ON AIR · ${station.name}`;
  ctx.fillText(label, left, y + h / 2 + 1);
  const lw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(
    fitLine(ctx, `NOW PLAYING: ${poster.nowPlaying || station.track}`, W - left - lw - size * 2),
    left + lw + size,
    y + h / 2 + 1,
  );
  ctx.restore();
}

// End-card stamp: WASTED or MISSION PASSED across the poster.
function paintEndCard(ctx, poster, W, H) {
  if (!poster.stamp || poster.stamp === 'none') return;
  ctx.save();
  ctx.translate(W / 2, H * 0.46);
  ctx.rotate(-0.1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (poster.stamp === 'wasted') {
    const size = H * 0.16;
    ctx.font = `${size}px Anton, sans-serif`;
    try {
      ctx.letterSpacing = `${size * 0.12}px`;
    } catch {
      /* older canvas */
    }
    ctx.fillStyle = 'rgba(220,220,220,0.92)';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = size * 0.2;
    ctx.fillText('WASTED', 0, 0);
  } else {
    const size = H * 0.075;
    ctx.font = `${size}px Anton, sans-serif`;
    const tw = ctx.measureText('MISSION PASSED').width;
    const pad = size * 0.6;
    const w = tw + pad * 2;
    const h = size * 2.1;
    roundRect(ctx, -w / 2, -h / 2, w, h, size * 0.2);
    ctx.fillStyle = 'rgba(8,30,12,0.88)';
    ctx.fill();
    ctx.strokeStyle = '#39d353';
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#39d353';
    ctx.fillText('MISSION PASSED', 0, -size * 0.28);
    ctx.font = `${size * 0.42}px "Bebas Neue", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`REWARD  ${poster.missionReward || ''}`, 0, size * 0.52);
  }
  ctx.restore();
}

// Sticker stamps, in poster space (0..1), drawn in poster order.
function paintStickers(ctx, poster, W, H) {
  for (const st of poster.stickers || []) {
    const size = Math.min(W, H) * (st.size || 0.09);
    drawSticker(ctx, st.kind, st.x * W, st.y * H, size, st.color || '#ffd166', st.tilt || 0);
  }
}

// Poster frame: accent border + corner ticks.
function paintFrame(ctx, W, H, accent) {
  const m = Math.max(6, Math.min(W, H) * 0.014);
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = m * 0.45;
  ctx.strokeRect(m / 2, m / 2, W - m, H - m);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, m * 0.28);
  const tick = Math.min(W, H) * 0.045;
  const corners = [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + dx * tick, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * tick);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Paint the whole cover. `imgs` maps a panel src to a loaded
 * HTMLImageElement (or a data-URL image for uploads). Panels without a
 * loaded image get a grade placeholder so the poster never renders blank.
 */
export function renderPoster(ctx, poster, imgs, W, H) {
  const grade = gradeById(poster.grade);
  const layout = layoutById(poster.layout);
  const accent = poster.accent || grade.accent;
  paintSky(ctx, grade, W, H);
  paintSun(ctx, grade, W, H);
  paintSea(ctx, grade, W, H);
  paintDots(ctx, grade, W, H);
  // Photo panels.
  const rects = panelRects(layout, W, H);
  rects.forEach((rect, i) => {
    const panel = poster.panels[i % poster.panels.length];
    const img = imgs[panel.src];
    const sample = SAMPLES.find((s) => s.file === panel.src);
    paintPanel(ctx, img, rect, panel, grade, 'VICE CITY');
    paintRoleTag(ctx, rect, sample ? sample.role : '', W, H);
  });
  if (grade.palms) paintPalms(ctx, grade, W, H);
  paintGrain(ctx, W, H);
  paintCaption(ctx, poster, grade, W, H, accent);
  // GTA HUD, all drawn in code. Hide it entirely for a clean art-only
  // compare when the user flips the HUD switch off.
  if (poster.hud !== false) {
    paintJobCard(ctx, poster, W, H);
    paintWanted(ctx, poster, W, H);
    paintPlaceStamp(ctx, poster, W, H, accent);
    const tickerH = Math.max(20, H * 0.038);
    const lift = tickerH + Math.max(8, Math.min(W, H) * 0.028) * 0.5;
    paintMiniMap(ctx, W, H, lift);
    paintVitals(ctx, poster, W, H, lift);
    if (poster.billing) paintBilling(ctx, poster, W, H, tickerH);
    paintAirwave(ctx, poster, W, H);
    paintEndCard(ctx, poster, W, H);
  }
  paintStickers(ctx, poster, W, H);
  if (poster.worn) paintDistress(ctx, W, H);
  paintFrame(ctx, W, H, accent);
  // Pop-out hero medallion last, so it breaks over the frame border.
  if (layout.pop) paintPopMedallion(ctx, poster, imgs, W, H);
}
