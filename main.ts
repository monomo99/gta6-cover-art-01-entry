// Vice City Cover Studio — make.fun entrypoint (Node 22, stdlib only).
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json from them with the kit's vendor/makefun-app.ts.
// The app: 6 layouts, 5 grades, 3 OFL fonts, 6 original samples, and a
// GTA HUD drawn on the poster (wanted stars, minimap, health/armor bars,
// mission card, radio ticker, district stamp, end-card stamps, worn print).
// Usage: MAKEFUN_OUTPUT_DIR=<dir> node main.ts   (defaults to ./out)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const root = process.env.MAKEFUN_BOT_DIR ?? process.cwd();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? join(root, 'out');

const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');

if (!existsSync(appDir)) throw new Error('app/: no such directory');
if (!existsSync(join(appDir, 'index.html'))) throw new Error('app/index.html: missing');
if (!existsSync(shotsDir)) throw new Error('screenshots/: no such directory');

// Refuse anything that is not a real PNG or JPEG in screenshots/: the
// dossier only accepts those, and a stray file (or an HTML error page
// saved as .jpg) would fail the build later with a worse message.
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const isImage = (bytes) =>
  PNG_MAGIC.every((b, i) => bytes[i] === b) || JPEG_MAGIC.every((b, i) => bytes[i] === b);
const shotNames = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
if (shotNames.length === 0) throw new Error('screenshots/: no images (need 3 or 4)');
if (shotNames.length > 4) throw new Error(`screenshots/: ${shotNames.length} images, at most 4`);
for (const name of shotNames) {
  const bytes = readFileSync(join(shotsDir, name));
  if (bytes.length > 262144) throw new Error(`screenshots/${name}: ${bytes.length} bytes, over the 262144 allowed`);
  if (!isImage(bytes)) throw new Error(`screenshots/${name}: not a PNG or JPEG`);
}

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// Round 9 rebuild guard: the counted assets must all be present — the 3
// OFL fonts and the 6 original samples. If any is missing the entry would
// fail transcripts_witnessed, so fail fast here with a clear message.
const fontNames = ['Anton-Regular.ttf', 'BebasNeue-Regular.ttf', 'Pacifico-Regular.ttf'];
for (const name of fontNames) {
  if (!existsSync(join(appDir, 'fonts', name))) throw new Error(`app/fonts/${name}: missing (re-download the OFL fonts)`);
}
const sampleNames = ['ocean-drive.jpg', 'leonida-beach.jpg', 'neon-street.jpg', 'palm-court.jpg', 'yacht-club.jpg', 'midnight-diner.jpg'];
for (const name of sampleNames) {
  if (!existsSync(join(appDir, 'samples', name))) throw new Error(`app/samples/${name}: missing (regenerate the samples)`);
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Vice City Cover Studio (6 samples, 5 grades, GTA HUD): ${shotNames.length} screenshots, dossier ${dossier.length} bytes -> ${outDir}`);
