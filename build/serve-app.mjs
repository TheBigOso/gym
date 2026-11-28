// Serve app/dist on http://localhost:<port> and open it in the default browser.
// Usage: npm run app (build + serve), or node build/serve-app.mjs [--port 5180] [--no-open]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const here = fileURLToPath(import.meta.url);
export const appRoot = path.join(path.dirname(here), '..', 'app', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png' };

// Start a static server for app/dist; resolves to { server, port, url }. Tries the next port if one is taken.
export function startAppServer(port = 5180, tries = 10) {
  if (!fs.existsSync(path.join(appRoot, 'index.html'))) throw new Error('app/dist is missing: run npm run app:build first');
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(appRoot, rel);
    if (!file.startsWith(appRoot + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(buf);
    });
  });
  return new Promise((resolve, reject) => {
    const attempt = (p, left) => {
      server.once('error', (e) => (e.code === 'EADDRINUSE' && left > 0 ? attempt(p + 1, left - 1) : reject(e)));
      server.listen(p, '127.0.0.1', () => resolve({ server, port: p, url: `http://localhost:${p}/` }));
    };
    attempt(port, tries);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  const args = process.argv.slice(2);
  const want = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 5180;
  const { url } = await startAppServer(want);
  console.log(`RepRig exercise library: ${url}  (Ctrl+C to stop)`);
  if (!args.includes('--no-open')) exec(process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`, () => {});
}
