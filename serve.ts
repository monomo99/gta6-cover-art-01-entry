// Neon Shore Cover Studio — tiny static server for app/.
// Node 22, standard library only. Serves http://localhost:8080 with correct
// MIME types, HEAD support, and a hard refusal to serve anything outside
// app/ (no parent traversal, no symlinks escaping it).

import { createServer } from 'node:http';
import { createReadStream, lstatSync, realpathSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = realpathSync(resolve(join(fileURLToPath(import.meta.url), '..', 'app')));
const PORT = 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

// Resolve a request path to a file inside app/:
//   { file }        the file to serve
//   { missing: true } the path is inside app/ but no such file (404)
//   null            the path escapes app/ (403)
// A missing file must not read as an escape: realpathSync throws for a
// path that does not exist, so existence is checked first.
function resolveInsideApp(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const clean = decoded.split('?')[0].split('#')[0];
  const joined = resolve(APP_ROOT, '.' + clean);
  if (joined !== APP_ROOT && !joined.startsWith(APP_ROOT + '/')) return null;
  try {
    lstatSync(joined);
  } catch {
    return { missing: true };
  }
  let real;
  try {
    real = realpathSync(joined);
  } catch {
    return { missing: true };
  }
  if (real !== APP_ROOT && !real.startsWith(APP_ROOT + '/')) return null;
  return { file: real };
}

const server = createServer((req, res) => {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed\n');
    return;
  }
  let path = '/';
  try {
    path = new URL(req.url || '/', 'http://localhost').pathname;
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Bad request\n');
    return;
  }
  if (path === '/') path = '/index.html';
  const resolved = resolveInsideApp(path);
  if (resolved === null) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden\n');
    return;
  }
  if (resolved.missing) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found\n');
    return;
  }
  const file = resolved.file;
  let st;
  try {
    st = lstatSync(file);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found\n');
    return;
  }
  if (!st.isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found\n');
    return;
  }
  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'content-length': st.size });
  if (method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Neon Shore Cover Studio at http://localhost:${PORT}`);
});
