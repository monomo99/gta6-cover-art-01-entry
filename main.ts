// Neon Shore Cover Studio — entrypoint program.
// Node 22, standard library only. Copies app/ and screenshots/ from this
// repository into the output directory (/output, or MAKEFUN_OUTPUT_DIR
// when set) and writes /output/dossier.json with buildDossier from
// vendor/makefun-app.ts. Running it twice writes identical bytes: the copy
// is a plain recursive copy with no timestamps recorded anywhere, and
// buildDossier is deterministic for a given input tree.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO_ROOT = resolve(join(fileURLToPath(import.meta.url), '..'));
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

// The two trees this entry hands in, in a fixed order.
const TREES = ['app', 'screenshots'];

// Count the plain files under a directory, for the handover summary.
function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) n += countFiles(p);
    else if (entry.isFile()) n += 1;
  }
  return n;
}

// Copy one tree (app/ or screenshots/) into the output directory,
// replacing any earlier copy so a stale file can never survive.
function copyTree(name) {
  const src = join(REPO_ROOT, name);
  if (!existsSync(src) || !statSync(src).isDirectory()) {
    throw new Error(`main.ts: ${name}/ is missing from the repository`);
  }
  const dst = join(OUT_DIR, name);
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}

mkdirSync(OUT_DIR, { recursive: true });
for (const name of TREES) copyTree(name);

const dossier = buildDossier(OUT_DIR, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);

const appFiles = countFiles(join(OUT_DIR, 'app'));
const shotFiles = countFiles(join(OUT_DIR, 'screenshots'));
console.log(`Neon Shore Cover Studio handed in to ${OUT_DIR}`);
console.log(`  app/: ${appFiles} files, screenshots/: ${shotFiles} files, dossier.json written`);
