// Neon Shore Cover Studio — a gta6-cover-art-01 entry (Node 22, standard library only).
// The app is this directory's app/ folder: plain static files a desktop browser loads
// offline (app/index.html and its ES modules, three SIL OFL fonts and two sample photos
// made for make.fun, no network request). This program hands it in: it copies app/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the
// summary the judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): app/ holds at most 993 files and
// directories and 48 MiB in all, screenshots/ at most 4 files of 256 KiB each. Refuse
// early, with a plain message, rather than handing in an entry the scorer refuses.
// A symlink anywhere in the handed-in trees is refused too: the gate only accepts
// plain files and directories, and a link could point outside the entry.
function checkTree(dir, maxFiles, maxBytes, label) {
  let files = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) throw new Error(`${label}: ${p} is a symlink, plain files only`);
      if (st.isDirectory()) { files += 1; walk(p); }
      else if (st.isFile()) { files += 1; bytes += st.size; }
    }
  };
  walk(dir);
  if (files > maxFiles) throw new Error(`${label}: ${files} entries, over the ${maxFiles} cap`);
  if (bytes > maxBytes) throw new Error(`${label}: ${bytes} bytes, over the ${maxBytes} cap`);
}

checkTree(join(here, 'app'), 993, 48 * 1024 * 1024, 'app/');
if (existsSync(join(here, 'screenshots'))) {
  checkTree(join(here, 'screenshots'), 4, 4 * 256 * 1024, 'screenshots/');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// buildDossier writes the judge's view of the entry from what was just copied, so the
// dossier always matches the handed-in files byte for byte.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// The gate caps dossier.json at 1.5 MiB: refuse a bloated one here, not at the scorer.
const dossierBytes = statSync(join(out, 'dossier.json')).size;
if (dossierBytes < 100) throw new Error('dossier.json came out suspiciously small');
if (dossierBytes > 1572864) throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
// The hand-in is only complete when the app's entry page landed in /output.
if (!existsSync(join(out, 'app', 'index.html'))) throw new Error('app/index.html did not land in /output');

// Say what was handed in, so a local run shows its result at a glance instead of
// failing silently when the dossier comes out empty.
console.log(`Neon Shore Cover Studio handed in: app/ + ${readdirSync(join(out, 'screenshots')).length} screenshot(s), dossier.json ${dossierBytes} bytes.`);
