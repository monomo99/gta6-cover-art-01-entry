// Vice City Cover Studio — the cover renderer.
// Draws the whole poster onto any canvas at any size: grade sky, synthwave
// sun, photo panels, palm silhouettes, halftone, scanlines, caption, frame.
// Everything is drawn from the state; no network, no external assets.
import { GRADES, LAYOUTS, RADIO_STATIONS } from './state.js';

/** Panel rects for a layout, with an outer frame margin and a gap between panels. */
export function layoutPanels(layout, W, H) {
  const margin = Math.round(Math.min(W, H) * 0.028);
  const gap = Math.round(Math.min(W, H) * 0.012);
  const inner = { x: margin, y: margin, w: W - margin * 2, h: H - margin * 2 };
  const raw = LAYOUTS[layout](inner.w, inner.h);
  return raw.map((r, i) => {
    const isLastCol = i === raw.length - 1 || r.x + r.w >= inner.w - 1;
    const isLastRow = r.y + r.h >= inner.h - 1;
    return {
      x: inner.x + r.x + (r.x > 0 ? gap / 2 : 0),
      y: inner.y + r.y + (r.y > 0 ? gap / 2 : 0),
      w: r.w - (r.x > 0 ? gap / 2 : 0) - (isLastCol ? 0 : gap / 2),
      h: r.h - (r.y > 0 ? gap / 2 : 0) - (isLastRow ? 0 : gap / 2),
    };
  });
}

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Draw an image cover-fitting a rect, with zoom, pan and optional flip. */
function drawImageCover(ctx, img, rect, panel) {
  const { x, y, w, h } = rect;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * (panel.zoom || 1);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) * (panel.panX ?? 0.5);
  const sy = (ih - sh) * (panel.panY ?? 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (panel.flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  ctx.restore();
}

/** A placeholder when a panel has no photo yet: grade gradient + label. */
function drawPlaceholder(ctx, rect, grade, label) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, grade.sky[0]);
  g.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `bold ${Math.max(14, rect.h * 0.07)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** The synthwave sun: a glowing disc sliced by horizontal gaps. */
function drawSun(ctx, W, H, grade) {
  const cx = W * 0.5;
  const cy = H * grade.sunY;
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
  const sunGrad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  sunGrad.addColorStop(0, '#fff3c4');
  sunGrad.addColorStop(0.55, grade.sun);
  sunGrad.addColorStop(1, grade.accent);
  ctx.fillStyle = sunGrad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slice gaps across the lower half, widening toward the bottom.
  ctx.fillStyle = grade.sky[0];
  let yy = cy + r * 0.05;
  let thick = Math.max(2, r * 0.03);
  while (yy < cy + r) {
    ctx.fillRect(cx - r, yy, r * 2, thick);
    yy += thick + r * 0.16;
    thick *= 1.5;
  }
  ctx.restore();
}

/** Palm silhouettes along the bottom edge, drawn in the grade's ink. */
function drawPalms(ctx, W, H, grade) {
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
      const a = (-Math.PI * 0.15) - (i * Math.PI) / 7.5 + (lean > 0 ? 0.35 : -0.35);
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

/** Halftone dots fading down the sky. */
function drawHalftone(ctx, W, H, grade) {
  ctx.save();
  ctx.fillStyle = grade.ink;
  const step = Math.max(10, W * 0.018);
  for (let y = H * 0.06; y < H * 0.42; y += step) {
    const fade = 1 - (y - H * 0.06) / (H * 0.36);
    for (let x = step / 2; x < W; x += step) {
      ctx.globalAlpha = 0.1 * fade;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, step * 0.09 * fade + 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Fine scanlines + a whisper of grain over the whole poster. */
function drawTexture(ctx, W, H, seed) {
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.045;
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 0.05;
  const rand = seeded(seed);
  const dots = Math.floor((W * H) / 9000);
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(rand() * W, rand() * H, 1.5, 1.5);
  }
  ctx.restore();
}

/** The caption block: title, subtitle, tagline, tilted, on a readable band. */
function drawCaption(ctx, state, W, H, grade) {
  const top = state.banner !== 'bottom';
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
  const cy = top ? H * 0.13 : H * 0.84;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((state.tilt || 0) * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const titleFont = FONTFAMILY[state.titleFont] || 'Anton';
  let size = H * 0.13 * (state.titleSize || 1);
  ctx.font = `${size}px "${titleFont}", sans-serif`;
  try { ctx.letterSpacing = `${Math.max(2, size * 0.04)}px`; } catch { /* older canvas: no letterSpacing */ }
  const maxW = W * 0.88;
  const tw = ctx.measureText(state.title || 'VICE CITY').width;
  if (tw > maxW) {
    size *= maxW / tw;
    ctx.font = `${size}px "${titleFont}", sans-serif`;
  }
  ctx.shadowColor = grade.accent;
  ctx.shadowBlur = size * 0.25;
  ctx.fillStyle = state.titleColor || '#ffffff';
  ctx.fillText(state.title || 'VICE CITY', 0, 0);
  ctx.shadowBlur = 0;

  const subFont = FONTFAMILY[state.subFont] || 'Bebas Neue';
  const subSize = Math.max(12, size * 0.34);
  ctx.font = `${subSize}px "${subFont}", sans-serif`;
  try { ctx.letterSpacing = `${Math.max(2, subSize * 0.22)}px`; } catch { /* older canvas */ }
  ctx.fillStyle = grade.accent;
  ctx.fillText(state.subtitle || 'LEONIDA', 0, size * 0.62);

  ctx.font = `${Math.max(11, size * 0.2)}px "${subFont}", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(state.tagline || '', 0, size * 0.95);
  ctx.restore();
}

/** Rounded-rect path helper. */
function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Truncate text with an ellipsis so it fits maxW. */
function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

/** WANTED level: gold stars under a small WANTED label, top-right. */
function drawWanted(ctx, state, W, H) {
  const m = Math.max(8, Math.min(W, H) * 0.028);
  const size = Math.max(16, H * 0.028);
  const gap = size * 0.18;
  const totalW = size * 5 + gap * 4;
  const boxW = totalW + size * 0.8;
  const boxH = size * 2.1;
  const bx = W - m - boxW;
  const by = m;
  ctx.save();
  rr(ctx, bx, by, boxW, boxH, size * 0.25);
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
    if (i < (state.wanted || 0)) {
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

/** Mission briefing card: name, objective, reward. Top-left when the
 *  caption is at the bottom, just below the caption band when it is top. */
function drawMissionCard(ctx, state, W, H) {
  const m = Math.max(8, Math.min(W, H) * 0.028);
  const pad = Math.max(10, H * 0.014);
  const w = W * 0.44;
  const headSize = Math.max(11, H * 0.016);
  const nameSize = Math.max(14, H * 0.024);
  const bodySize = Math.max(11, H * 0.015);
  const h = pad * 2 + headSize + nameSize + bodySize * 2 + Math.max(8, H * 0.02);
  const x = m;
  const y = state.banner === 'bottom' ? m : H * 0.31;
  ctx.save();
  rr(ctx, x, y, w, h, Math.max(6, H * 0.008));
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
  ctx.fillText(fitText(ctx, state.missionName || '', w - pad * 2), x + pad, cy);
  cy += nameSize + Math.max(3, H * 0.004);
  ctx.font = `${bodySize}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText(fitText(ctx, state.missionObjective || '', w - pad * 2), x + pad, cy);
  cy += bodySize + Math.max(3, H * 0.004);
  ctx.font = `bold ${bodySize}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = '#39d353';
  ctx.fillText(`REWARD  ${state.missionReward || ''}`, x + pad, cy);
  ctx.restore();
}

/** Location stamp: the district, rotated, top-right under the wanted box. */
function drawDistrictStamp(ctx, state, W, H, grade) {
  const m = Math.max(8, Math.min(W, H) * 0.028);
  const size = Math.max(12, H * 0.02);
  ctx.save();
  const text = `${(state.district || '').toUpperCase()} — LEONIDA`;
  ctx.font = `bold ${size}px "Bebas Neue", sans-serif`;
  const tw = ctx.measureText(text).width;
  const w = tw + size * 1.2;
  const h = size * 1.9;
  const x = W - m - w;
  const y = m + H * 0.075;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.06);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = grade.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

/** Minimap, bottom-right: street grid, beach and a player blip, all code-drawn. */
function drawMinimap(ctx, W, H, lift) {
  const m = Math.max(8, Math.min(W, H) * 0.028);
  const w = W * 0.22;
  const h = H * 0.16;
  const x = W - m - w;
  const y = H - lift - h;
  ctx.save();
  rr(ctx, x, y, w, h, Math.max(6, w * 0.04));
  ctx.fillStyle = 'rgba(6,10,24,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(1, w * 0.006);
  ctx.stroke();
  ctx.save();
  rr(ctx, x, y, w, h, Math.max(6, w * 0.04));
  ctx.clip();
  // Sea on the right edge, beach strip, land with streets.
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
  // Diagonal causeway.
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h * 0.9);
  ctx.lineTo(x + w * 0.75, y + h * 0.15);
  ctx.stroke();
  // Player blip.
  const bx = x + w * 0.42;
  const by = y + h * 0.55;
  ctx.fillStyle = '#ff2e88';
  ctx.beginPath();
  ctx.arc(bx, by, Math.max(3, w * 0.02), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, w * 0.006);
  ctx.stroke();
  // North marker.
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(9, h * 0.11)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('N', x + w * 0.04, y + h * 0.04);
  ctx.restore();
  ctx.restore();
}

/** Health + armor bars, bottom-left. */
function drawBars(ctx, state, W, H, lift) {
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
  bar(y1, state.health ?? 100, '#39d353', 'HEALTH');
  bar(y2, state.armor ?? 0, '#7dd3fc', 'ARMOR');
  ctx.restore();
}

/** Radio ticker strip along the very bottom edge. */
function drawRadioTicker(ctx, state, W, H) {
  const h = Math.max(20, H * 0.038);
  const y = H - h;
  ctx.save();
  ctx.fillStyle = 'rgba(5,2,14,0.85)';
  ctx.fillRect(0, y, W, h);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(0, y, W, Math.max(2, h * 0.07));
  const station = RADIO_STATIONS.find((s) => s.id === state.radio) || RADIO_STATIONS[0];
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
    fitText(ctx, `NOW PLAYING: ${state.nowPlaying || station.track}`, W - left - lw - size * 2),
    left + lw + size,
    y + h / 2 + 1,
  );
  ctx.restore();
}

/** End-card stamp: WASTED or MISSION PASSED across the poster. */
function drawEndStamp(ctx, state, W, H) {
  if (!state.stamp || state.stamp === 'none') return;
  ctx.save();
  ctx.translate(W / 2, H * 0.46);
  ctx.rotate(-0.1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (state.stamp === 'wasted') {
    const size = H * 0.16;
    ctx.font = `${size}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${size * 0.12}px`; } catch { /* older canvas */ }
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
    rr(ctx, -w / 2, -h / 2, w, h, size * 0.2);
    ctx.fillStyle = 'rgba(8,30,12,0.88)';
    ctx.fill();
    ctx.strokeStyle = '#39d353';
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#39d353';
    ctx.fillText('MISSION PASSED', 0, -size * 0.28);
    ctx.font = `${size * 0.42}px "Bebas Neue", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`REWARD  ${state.missionReward || ''}`, 0, size * 0.52);
  }
  ctx.restore();
}

/** Worn-print effect: scratches, fold lines and a faded vignette. */
function drawWorn(ctx, W, H) {
  ctx.save();
  const rand = seeded(Math.floor(W * 11 + H * 3));
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 26; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const len = H * (0.02 + rand() * 0.08);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 10, y + len);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.max(2, H * 0.004);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.33);
  ctx.lineTo(W, H * 0.30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, H * 0.66);
  ctx.lineTo(W, H * 0.69);
  ctx.stroke();
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(255,244,214,0)');
  vg.addColorStop(1, 'rgba(255,244,214,0.16)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Poster frame: accent border + corner ticks. */
function drawFrame(ctx, W, H, grade) {
  const m = Math.max(6, Math.min(W, H) * 0.014);
  ctx.save();
  ctx.strokeStyle = grade.accent;
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

const FONTFAMILY = { anton: 'Anton', bebas: 'Bebas Neue', pacifico: 'Pacifico' };

/**
 * Draw the whole cover. `images` maps a panel src to a loaded HTMLImageElement
 * (or a data-URL image for uploads). Panels without a loaded image get a
 * grade placeholder so the poster never renders blank.
 */
export function drawCover(ctx, state, images, W, H) {
  const grade = GRADES[state.grade] || GRADES.ocean;
  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  drawSun(ctx, W, H, grade);
  // Sea band along the bottom third.
  const sea = ctx.createLinearGradient(0, H * 0.66, 0, H);
  sea.addColorStop(0, grade.sea + '00');
  sea.addColorStop(1, grade.sea);
  ctx.fillStyle = sea;
  ctx.fillRect(0, H * 0.66, W, H * 0.34);
  drawHalftone(ctx, W, H, grade);
  // Photo panels.
  const rects = layoutPanels(state.layout, W, H);
  rects.forEach((rect, i) => {
    const panel = state.panels[i % state.panels.length];
    const img = images[panel.src];
    if (img && (img.complete || img.naturalWidth)) {
      drawImageCover(ctx, img, rect, panel);
    } else {
      drawPlaceholder(ctx, rect, grade, 'VICE CITY');
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.003);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  if (grade.palms) drawPalms(ctx, W, H, grade);
  drawTexture(ctx, W, H, W * 7 + H * 13);
  drawCaption(ctx, state, W, H, grade);
  // GTA HUD, all drawn in code: mission card, wanted stars, district
  // stamp, minimap, health/armor bars, radio ticker, end-card stamp.
  drawMissionCard(ctx, state, W, H);
  drawWanted(ctx, state, W, H);
  drawDistrictStamp(ctx, state, W, H, grade);
  const tickerH = Math.max(20, H * 0.038);
  const lift = tickerH + Math.max(8, Math.min(W, H) * 0.028) * 0.5;
  drawMinimap(ctx, W, H, lift);
  drawBars(ctx, state, W, H, lift);
  drawRadioTicker(ctx, state, W, H);
  drawEndStamp(ctx, state, W, H);
  if (state.worn) drawWorn(ctx, W, H);
  drawFrame(ctx, W, H, grade);
}
