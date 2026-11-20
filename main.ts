// Vice Cover Studio — entry program for make.fun's gta6-cover-art-01 bounty.
//
// It hands the app in: it copies app/ and screenshots/ from this repository
// into the output directory and writes dossier.json there with buildDossier
// from vendor/makefun-app.ts (the kit's copy, unchanged). Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output. Node 22, standard library only,
// no install and no build step.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function copyEntry(name: string): void {
  const from = join(REPO_ROOT, name);
  const to = join(OUTPUT_DIR, name);
  if (!existsSync(from)) throw new Error(`main.ts: ${name}/ is missing from the repository`);
  cpSync(from, to, { recursive: true });
}

rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(OUTPUT_DIR, { recursive: true });
copyEntry('app');
copyEntry('screenshots');

const dossier = buildDossier(OUTPUT_DIR, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
const appCount = readdirSync(join(OUTPUT_DIR, 'app'), { recursive: true }).length;
const shotCount = readdirSync(join(OUTPUT_DIR, 'screenshots')).length;
console.log(`Vice Cover Studio: wrote ${OUTPUT_DIR}/dossier.json (${dossier.length} bytes) from ${appCount} app entries and ${shotCount} screenshots`);
