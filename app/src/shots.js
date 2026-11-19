// Neon Shore Cover Studio — screenshot mode.
// Reads URL query params (?shot=cover|editor plus layout, grade, size,
// title, subtitle, panels, zooms, flips, frame, oxs, oys) and applies them
// to STATE on load, so screenshots are driven deterministically.
// In cover mode the editor chrome is hidden and only the poster shows.

// Split a comma list, dropping empty pieces.
function splitList(value) {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

// Apply the page's query string to STATE. Returns the shot kind:
// 'cover', 'editor', or '' when no ?shot param was given.
function applyShotParams() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot') || '';
  if (q.get('layout') && LAYOUTS[q.get('layout')]) STATE.layout = q.get('layout');
  if (q.get('grade') && GRADES[q.get('grade')]) STATE.grade = q.get('grade');
  if (q.get('size') && EXPORT_SIZES[q.get('size')]) STATE.size = q.get('size');
  if (q.get('title') !== null && q.get('title') !== '') STATE.title = q.get('title');
  if (q.get('subtitle') !== null) STATE.subtitle = q.get('subtitle');
  if (q.get('frame') !== null) STATE.frame = q.get('frame') !== 'false' && q.get('frame') !== '0';
  if (q.get('halftone') !== null) STATE.halftone = q.get('halftone') !== 'false';
  if (q.get('birds') !== null) STATE.birds = q.get('birds') !== 'false';

  const panels = splitList(q.get('panels'));
  const zooms = splitList(q.get('zooms')).map(Number);
  const flips = splitList(q.get('flips'));
  const oxs = splitList(q.get('oxs')).map(Number);
  const oys = splitList(q.get('oys')).map(Number);
  for (let i = 0; i < STATE.panels.length; i++) {
    const p = STATE.panels[i];
    if (panels[i] && (SAMPLE_PHOTOS[panels[i]] || panels[i] === 'custom')) p.photo = panels[i];
    if (Number.isFinite(zooms[i]) && zooms[i] > 0) p.zoom = zooms[i];
    if (flips[i] !== undefined) p.flip = flips[i] === '1' || flips[i] === 'true';
    if (Number.isFinite(oxs[i])) p.ox = Math.max(-0.5, Math.min(0.5, oxs[i]));
    if (Number.isFinite(oys[i])) p.oy = Math.max(-0.5, Math.min(0.5, oys[i]));
  }
  return shot;
}

// Switch the page into the shot's presentation: cover shots show only the
// poster, editor shots show the full editor with a photo loaded.
function setupShotMode(shot) {
  document.body.dataset.shot = shot || 'live';
  if (shot === 'cover') document.body.classList.add('cover-only');
  else document.body.classList.remove('cover-only');
}

// Mark the page ready for a screenshot once the fonts are in and the
// preview has been drawn. The shot driver waits on window.__shotReady.
function markShotReady() {
  window.__shotReady = true;
  document.body.dataset.ready = 'yes';
}
