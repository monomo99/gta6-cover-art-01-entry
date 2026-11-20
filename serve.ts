// Vice City Cover Studio — tiny static server for local preview.
// Serves app/ over HTTP so the page can be opened from a browser with a
// clean origin (fonts and samples load the same as from file://, but a
// server avoids file-URL quirks in some browsers). Nothing leaves the
// machine; the app itself never makes a network request.
// Usage: node serve.ts [port]   (default port 8080, serves ./app)
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

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
  '.txt': 'text/plain; charset=utf-8',
};

const appDir = join(process.cwd(), 'app');
const port = Number(process.argv[2] ?? 8080);

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = join(appDir, rel);
  if (!file.startsWith(appDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found\n');
    return;
  }
  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  res.end(readFileSync(file));
});

server.listen(port, () => {
  console.log(`Vice City Cover Studio at http://localhost:${port}/`);
});
