// Shared Playwright launcher: serves player.html and maps the jsDelivr three.js URLs to node_modules.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// The library app (app/dist, built by npm run app:build) served over HTTP, with the same three.js and font routing.
export async function openApp(opts = {}) {
  const { startAppServer } = await import('../build/serve-app.mjs');
  const { server, url } = await startAppServer(5190);
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.location().url || '')) errors.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', (route) => {
    const rel = route.request().url().split('three@0.160.0/')[1];
    route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'text/javascript' });
  });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('**/favicon.ico', (r) => r.fulfill({ status: 204, body: '' }));
  await page.goto(url + (opts.hash || ''));
  await page.waitForFunction(() => window.__app, null, { timeout: 180000 });
  return { browser, page, errors, server, url };
}
export async function openPlayer(opts = {}) {
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p)); // undefined: Playwright's bundled Chromium (CI)
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', (route) => {
    const rel = route.request().url().split('three@0.160.0/')[1];
    route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'text/javascript' });
  });
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('file://' + path.join(root, 'player.html'));
  await page.waitForFunction(() => window.__rr, null, { timeout: 180000 }); // the page carries every exercise; give it time on slow machines
  await page.waitForTimeout(400);
  return { browser, page, errors, root };
}
