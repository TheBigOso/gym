// Checks every exercise module and the built player:
// schema validity, planted contacts, floor clearance, joint limits, GLB contents, page errors.
import { createRequire } from 'module';
import fs from 'fs';
import { openPlayer } from './serve.mjs';
const require = createRequire(import.meta.url);
const L = require('../build/lib.js');
const { R, V, rig } = L;
const Ajv = require('ajv/dist/2020');
const validate = new Ajv({ strict: false }).compile(require('../src/schema.json'));
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fail++; };
for (const f of fs.readdirSync('src/exercises')) {
  const ex = JSON.parse(fs.readFileSync(`src/exercises/${f}`, 'utf8')), id = ex.exercise.id, tl = R.buildTimeline(ex);
  check(validate(ex), `${id}: validates against schema`);
  const tgt = Object.values(ex.poses)[0].ik.arm_l.target, W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  let slide = 0, knee = 0, pelvis = 0, floor = 1e9, peak = -99;
  for (let i = 0; i <= 800; i++) {
    const t = (i / 800) * tl.duration, W = R.evalPose(rig, tl.pose(t), ex.contacts);
    slide = Math.max(slide, V.len(V.sub(W.wrist_l.p, tgt)));
    knee = Math.max(knee, V.len(V.sub(W.knee_r.p, W0.knee_r.p)), V.len(V.sub(W.knee_l.p, W0.knee_l.p)));
    pelvis = Math.max(pelvis, V.len(V.sub(W.pelvis.p, W0.pelvis.p)));
    floor = Math.min(floor, L.shapeMinY(W).y); peak = Math.max(peak, R.measures(W).shoulderLineIncl);
  }
  check(slide < 0.05, `${id}: support hand stays planted (max ${slide.toFixed(3)} cm)`);
  check(knee < 0.05 && pelvis < 0.05, `${id}: knees and pelvis still (knees ${knee.toFixed(3)} cm, pelvis ${pelvis.toFixed(3)} cm)`);
  check(floor > -0.5, `${id}: nothing below the floor (lowest ${floor.toFixed(2)} cm)`);
  check(peak > 38 && peak < 55, `${id}: peak shoulder-line rotation ${peak.toFixed(1)}° (expected 38–55°)`);
  const viol = [];
  for (const [name, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${name}.${j}.${c}=${p.ch[j][c]}`); }
  check(!viol.length, `${id}: joint limits ${viol.length ? viol.join(', ') : 'respected'}`);
  check(fs.existsSync(`exports/${id}.glb`), `${id}: exports/${id}.glb present`);
}
const { browser, page, errors } = await openPlayer();
const res = await page.evaluate(() => { __rr.S.playing = false; const out = []; for (let i = 0; i < RR_DATA.exercises.length; i++) { __rr.load(i); __rr.setT(4.4); out.push(document.getElementById('title').textContent); } return out; });
check(res.length === 2, `player loads both exercises: ${res.join(' | ')}`);
await page.evaluate(() => { const S = __rr.S; S.t = 0; S.speed = 1.5; S.playing = true; window.__w0 = performance.now(); });
await page.waitForTimeout(1500);
const ratio = await page.evaluate(() => { const S = __rr.S; const r = S.t / ((performance.now() - window.__w0) / 1000); S.playing = false; return r; });
check(ratio > 1.3 && ratio < 1.7, `1.5× speed plays at ${ratio.toFixed(2)}× wall-clock`);
check(!errors.length, `no page errors ${errors.length ? JSON.stringify(errors) : ''}`);
await browser.close();
process.exit(fail ? 1 : 0);
