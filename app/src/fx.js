// Vice City Cover Studio — sticker emblems and print distress.
// Stickers are small vector emblems stamped onto the poster (a star, a
// palm, a skull, a crown, dice, a bolt). The worn-print effect adds
// scratches, fold lines and a faded vignette so the cover looks like a
// poster that has lived on a wall. Everything here is drawn in code.

// A five-point star path centred on (0,0) with outer radius r.
function starPath(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Draw one sticker emblem of `kind` centred at (x, y), sized `s`
// (its bounding box), in `colour`, rotated `tilt` radians.
export function drawSticker(ctx, kind, x, y, s, colour, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt || 0);
  ctx.fillStyle = colour || '#ffd166';
  ctx.strokeStyle = colour || '#ffd166';
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (kind === 'star') {
    starPath(ctx, s * 0.5);
    ctx.fill();
  } else if (kind === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.5);
    ctx.lineTo(-s * 0.3, s * 0.08);
    ctx.lineTo(-s * 0.02, s * 0.08);
    ctx.lineTo(-s * 0.1, s * 0.5);
    ctx.lineTo(s * 0.3, -s * 0.08);
    ctx.lineTo(s * 0.02, -s * 0.08);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, s * 0.35);
    ctx.lineTo(-s * 0.45, -s * 0.1);
    ctx.lineTo(-s * 0.22, s * 0.12);
    ctx.lineTo(0, -s * 0.4);
    ctx.lineTo(s * 0.22, s * 0.12);
    ctx.lineTo(s * 0.45, -s * 0.1);
    ctx.lineTo(s * 0.45, s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-s * 0.45, s * 0.35, s * 0.9, s * 0.1);
  } else if (kind === 'dice') {
    const r = s * 0.12;
    ctx.beginPath();
    ctx.roundRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84, r);
    ctx.fill();
    ctx.fillStyle = '#12041f';
    const dot = (dx, dy) => {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
    };
    dot(-0.2, -0.2);
    dot(0.2, 0.2);
    dot(0.2, -0.2);
    dot(-0.2, 0.2);
    dot(0, 0);
  } else if (kind === 'skull') {
    ctx.beginPath();
    ctx.arc(0, -s * 0.08, s * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-s * 0.22, s * 0.12, s * 0.44, s * 0.26);
    ctx.fillStyle = '#12041f';
    const eye = (dx) => {
      ctx.beginPath();
      ctx.arc(dx * s, -s * 0.1, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    };
    eye(-0.13);
    eye(0.13);
    ctx.fillRect(-s * 0.02, s * 0.08, s * 0.04, s * 0.12);
  } else {
    // palm: a leaning trunk with six fronds.
    ctx.beginPath();
    ctx.moveTo(0, s * 0.5);
    ctx.quadraticCurveTo(s * 0.08, 0, s * 0.22, -s * 0.32);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * 0.12 - (i * Math.PI) / 7;
      const len = s * 0.42;
      ctx.beginPath();
      ctx.moveTo(s * 0.22, -s * 0.32);
      ctx.quadraticCurveTo(
        s * 0.22 + Math.cos(a) * len * 0.6,
        -s * 0.32 + Math.sin(a) * len * 0.6 - s * 0.08,
        s * 0.22 + Math.cos(a) * len,
        -s * 0.32 + Math.sin(a) * len + s * 0.14,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Deterministic pseudo-random in [0, 1) from an integer seed.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Worn print: scratches, two fold lines and a faded warm vignette.
export function paintDistress(ctx, W, H) {
  ctx.save();
  const rand = rng(Math.floor(W * 11 + H * 3));
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const len = H * (0.02 + rand() * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 10, y + len);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.max(2, H * 0.004);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.33);
  ctx.lineTo(W, H * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, H * 0.66);
  ctx.lineTo(W, H * 0.69);
  ctx.stroke();
  const vg = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vg.addColorStop(0, 'rgba(255,244,214,0)');
  vg.addColorStop(1, 'rgba(255,244,214,0.16)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Fine scanlines + a whisper of grain over the whole poster.
export function paintGrain(ctx, W, H) {
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.045;
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 0.05;
  const rand = rng(W * 7 + H * 13);
  const dots = Math.floor((W * H) / 9000);
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(rand() * W, rand() * H, 1.5, 1.5);
  }
  ctx.restore();
}
