// Export every exercise (or only the ids given as arguments) as a binary glTF (.glb) with a skinned mesh and right/left
// animation clips. Usage: node build/export-gltf.mjs [id ...]
import fs from 'fs';
import path from 'path';
import { openPlayer } from '../test/serve.mjs';
const { browser, page, errors, root } = await openPlayer();
const n = await page.evaluate(() => RR_DATA.exercises.length);
fs.mkdirSync(path.join(root, 'exports'), { recursive: true });
const only = new Set(process.argv.slice(2)), ids = await page.evaluate(() => RR_DATA.exercises.map((e) => e.exercise.id));
for (let i = 0; i < n; i++) {
  if (only.size && !only.has(ids[i])) continue;
  const { id, b64 } = await page.evaluate(async (i) => {
    const buf = await __rr.exportGLB(i); const u8 = new Uint8Array(buf); let s = '';
    for (let k = 0; k < u8.length; k += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000));
    return { id: RR_DATA.exercises[i].exercise.id, b64: btoa(s) };
  }, i);
  const f = path.join(root, 'exports', `${id}.glb`);
  fs.writeFileSync(f, Buffer.from(b64, 'base64'));
  console.log(`exports/${id}.glb ${fs.statSync(f).size} bytes`);
}
if (errors.length) console.log('page errors', errors);
await browser.close();
