// Load an exported GLB with three's GLTFLoader in a clean scene, play a clip and screenshot it.
import fs from 'fs';
import { openPlayer } from './serve.mjs';
const id = process.argv[2] || 'quadruped-thoracic-rotation', clipSide = process.argv[3] || 'right', t = +(process.argv[4] || 4.4);
const { browser, page, errors } = await openPlayer({ viewport: { width: 900, height: 600 } });
const b64 = fs.readFileSync(`exports/${id}.glb`).toString('base64');
await page.setContent('<html><body style="margin:0;background:#222"><canvas id="c" width="900" height="600"></canvas><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script></body></html>');
const info = await page.evaluate(async ([b64, id, side, t]) => {
  const THREE = await import('three'); const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(bin, '', res, rej));
  const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true }); r.setClearColor(0x2a2e35);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2)); const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(2, 3, 2); sc.add(d);
  sc.add(gltf.scene); const mixer = new THREE.AnimationMixer(gltf.scene); const clip = gltf.animations.find((a) => a.name.endsWith(side));
  mixer.clipAction(clip).play(); mixer.setTime(t);
  const cam = new THREE.PerspectiveCamera(30, 1.5, 0.05, 20); cam.position.set(2.2, 1.3, 2.6); cam.lookAt(0, 0.35, 0.1);
  r.render(sc, cam);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  return { clips: gltf.animations.map((a) => `${a.name} ${a.duration.toFixed(2)}s`), size: box.getSize(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2)) };
}, [b64, id, clipSide, t]);
await page.screenshot({ path: `/tmp/glb-${id}-${clipSide}.png` });
console.log(JSON.stringify(info), 'errors', JSON.stringify(errors)); await browser.close();
