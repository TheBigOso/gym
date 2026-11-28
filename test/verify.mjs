// Checks every exercise module and the built player:
// schema validity, planted contacts, floor clearance, joint limits, GLB contents, page errors.
import { createRequire } from 'module';
import fs from 'fs';
import { openPlayer, openApp } from './serve.mjs';
const require = createRequire(import.meta.url);
const L = require('../build/lib.js');
const { R, V, rig } = L;
const Ajv = require('ajv/dist/2020');
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset);
const validate = new Ajv({ strict: false }).compile(require('../src/schema.json'));
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fail++; };
for (const f of fs.readdirSync('src/exercises')) {
  const ex = JSON.parse(fs.readFileSync(`src/exercises/${f}`, 'utf8')), id = ex.exercise.id, tl = R.buildTimeline(ex);
  check(validate(ex), `${id}: validates against schema`);
  const ck = ex.checks || {}, W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  const still = ck.stillJoints || [], planted = ck.plantedContacts || [];
  let slide = 0, drift = 0, floor = 1e9, peak = -1e9;
  const measure = (W, pose) => {
    const m = ck.measure && ck.measure.name; if (!m) return null;
    if (m === 'shoulderLineIncl') return R.measures(W).shoulderLineIncl;
    if (m === 'kneeFlexion') return Math.max(R.measures(W).knee, 180 - V.angle(V.sub(W.hip_l.p, W.knee_l.p), V.sub(W.ankle_l.p, W.knee_l.p)));
    if (m === 'hipFlexion') return Math.max(pose.ch.hip_r?.flex ?? 0, pose.ch.hip_l?.flex ?? 0);
    if (m === 'trunkFlexion') return V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
    if (m === 'rootTravel') return V.len(V.sub(W.pelvis.p, W0.pelvis.p));
  };
  let prev = null; const legViol = new Set();
  for (let i = 0; i <= 800; i++) {
    const t = (i / 800) * tl.duration, pose = tl.pose(t), W = R.evalPose(rig, pose, ex.contacts);
    for (const id of planted) {
      const k = pose.ik && pose.ik[id]; if (!k || (k.weight ?? 1) < 0.999) continue;
      const c = ex.contacts.find((x) => x.id === id), end = W[c.chain[2]].p;
      slide = Math.max(slide, V.len(V.sub(end, k.target)));
      if (prev && prev[id] && (prev[id].weight ?? 1) >= 0.999) slide = Math.max(slide, V.len(V.sub(k.target, prev[id].target)));
    }
    prev = pose.ik ? JSON.parse(JSON.stringify(pose.ik)) : null;
    for (const j of still) drift = Math.max(drift, V.len(V.sub(W[j].p, W0[j].p)));
    floor = Math.min(floor, L.shapeMinY(W).y);
    // Contact-driven legs: check the solved knee and ankle against the rig limits (stored channels can't show these).
    for (const c of ex.contacts || []) {
      if (!c.chain[0].startsWith('hip_')) continue;
      const k = pose.ik && pose.ik[c.id]; if (!k || (k.weight ?? 1) < 0.5) continue;
      const [h, kn, an, to] = c.chain, kneeFlex = 180 - V.angle(V.sub(W[h].p, W[kn].p), V.sub(W[an].p, W[kn].p));
      const dorsi = ANKLE_REST - V.angle(V.sub(W[kn].p, W[an].p), V.sub(W[to].p, W[an].p));
      const kl = rig.byId[kn].limits.flex, al = rig.byId[an].limits.dorsi;
      if (kneeFlex > kl[1] + 0.5) legViol.add(`${c.id} knee ${kneeFlex.toFixed(0)}° at ${t.toFixed(2)}s`);
      if (dorsi < al[0] - 1 || dorsi > al[1] + 1) legViol.add(`${c.id} ankle ${dorsi.toFixed(0)}° at ${t.toFixed(2)}s`);
    }
    const mv = measure(W, pose); if (mv != null) peak = Math.max(peak, mv);
  }
  if (planted.length) check(slide < 0.05, `${id}: planted contacts (${planted.join(', ')}) do not slide (max ${slide.toFixed(3)} cm)`);
  if (still.length) check(drift < 0.05, `${id}: still joints (${still.join(', ')}) stay put (max ${drift.toFixed(3)} cm)`);
  check(floor > -(ck.floorTolerance ?? 0.5), `${id}: nothing below the floor (lowest ${floor.toFixed(2)} cm)`);
  if (ck.measure) check(peak >= ck.measure.min && peak <= ck.measure.max, `${id}: peak ${ck.measure.name} ${peak.toFixed(1)} (expected ${ck.measure.min}–${ck.measure.max})`);
  check(legViol.size === 0, `${id}: contact-driven legs within knee/ankle limits${legViol.size ? ': ' + [...legViol].slice(0, 3).join('; ') : ''}`);
  check(!!ex.exercise.safety, `${id}: has safety notes`);
  const viol = [];
  for (const [name, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${name}.${j}.${c}=${p.ch[j][c]}`); }
  check(!viol.length, `${id}: joint limits ${viol.length ? viol.join(', ') : 'respected'}`);
  // two-hand equipment (barbell, kettlebell by the horns, cable bar / rope, band in both hands): the hands stay on it
  const twoHand = (ex.props || []).filter((pr) => pr.attach && pr.attach.joint && pr.attach.with && pr.kind !== 'band'); // a band stretches between the hands
  if (twoHand.length) {
    const EQ = require('../build/families/equip.js'); let wMin = 1e9, wMax = -1e9;
    for (let k = 0; k <= 120; k++) { const W = R.evalPose(rig, tl.pose((tl.duration * k) / 120), ex.contacts), w = EQ.barAt(W, twoHand[0].attach.grip || (twoHand[0].kind === 'barbell' ? 'bar' : 'handle')).width; wMin = Math.min(wMin, w); wMax = Math.max(wMax, w); }
    check(wMax - wMin <= 1.5, `${id}: hands stay on the two-hand ${twoHand.map((p) => p.kind).join(', ')} (grip width ${wMin.toFixed(1)}-${wMax.toFixed(1)} cm)`);
  }
  check(fs.existsSync(`exports/${id}.glb`), `${id}: exports/${id}.glb present`);
}
const { browser, page, errors } = await openPlayer();
// Speed (checked first, on a freshly loaded page): compare animation time against the player's own frame clock (S.clock), so a slow
// machine that stalls frames cannot skew the ratio. Also require that playback actually advanced.
await page.evaluate(() => { const S = __rr.S; S.t = 0; S.speed = 1.5; S.playing = true; window.__c0 = S.clock; window.__w0 = performance.now(); });
// Wait until the player has actually drawn about a second of frames (slow CI GPUs can stall early frames), up to 20 s.
for (let i = 0; i < 80; i++) { await page.waitForTimeout(250); const c = await page.evaluate(() => __rr.S.clock - window.__c0); if (c > 1.0 && i >= 5) break; }
const sp = await page.evaluate(() => { const S = __rr.S; const c = S.clock - window.__c0; const out = { r: S.t / c, c, wall: (performance.now() - window.__w0) / 1000 }; S.playing = false; return out; });
check(sp.c > 0.3 && Math.abs(sp.r - 1.5) < 0.05, `1.5× speed plays at ${sp.r.toFixed(2)}× of the player clock (${sp.c.toFixed(2)} s of frames in ${sp.wall.toFixed(2)} s wall)`);
// Load every exercise in batches of 50 so the page can yield between batches (one long synchronous
// loop over hundreds of exercises can starve the browser's frame scheduling on slow CI runners).
const res = []; res.bad = [];
const nEx = await page.evaluate(() => { __rr.S.playing = false; return RR_DATA.exercises.length; });
for (let s0 = 0; s0 < nEx; s0 += 50) {
  const r = await page.evaluate(([a, b]) => { const out = [], bad = []; for (let i = a; i < b; i++) { __rr.load(i); __rr.setT(4.4); const title = document.getElementById('title').textContent; out.push(title); if (/\bundefined\b|\bNaN\b/.test(document.body.innerText)) bad.push(title); } return { out, bad }; }, [s0, Math.min(nEx, s0 + 50)]);
  res.push(...r.out); res.bad.push(...r.bad);
}
check(res.length === fs.readdirSync('src/exercises').length, `player loads all exercises: ${res.join(' | ')}`);
check(!res.bad.length, `player text has no 'undefined' or 'NaN'${res.bad.length ? ': ' + res.bad.join(', ') : ''}`);
// Athlete: the Studio clay body is on stage, the target muscles light up, and the female variant is ready.
const ath = await page.evaluate(() => { __rr.load(0); __rr.setT(4.4); const A = __rr.athlete, g = A.mesh.geometry.attributes.aGlow.array; let lit = 0; for (let i = 3; i < g.length; i += 4) if (g[i] > 0.05) lit++; return { name: A.mesh.name, skinned: A.mesh.isSkinnedMesh, verts: A.mesh.geometry.attributes.position.count, lit, key: A.key, variants: Object.keys(RR_DATA.character.variants) }; });
check(ath.name === 'Body' && ath.skinned && ath.verts > 10000, `Studio clay athlete on stage (${ath.verts} vertices, ${ath.key === 'm' ? 'male' : ath.key})`);
check(ath.lit > 200, `target and synergist muscles glow on the athlete (${ath.lit} vertices lit)`);
check(ath.variants.includes('f'), 'female variant ships in the character data for a later switch');
check(!errors.length, `no page errors ${errors.length ? JSON.stringify(errors) : ''}`);
await browser.close();
// Library app (app/dist): it loads with a small first page, every exercise opens on demand, filters and test mode work.
if (fs.existsSync('app/dist/index.html')) {
  const firstMB = fs.statSync('app/dist/index.html').size / 1048576;
  check(firstMB < 3, `app first load is small (${firstMB.toFixed(2)} MB; exercises load on demand)`);
  const exFiles = fs.readdirSync('app/dist/ex').filter((f) => f.endsWith('.json')).length;
  check(exFiles === fs.readdirSync('src/exercises').length, `app has one data file per exercise (${exFiles})`);
  const appT = await openApp();
  const ap = appT.page;
  const cat = await ap.evaluate(() => ({ n: RR_CATALOG.length, listed: document.querySelectorAll('#list li[data-i]').length, loaded: RR_DATA.exercises.filter(Boolean).length }));
  check(cat.n === exFiles && cat.listed === cat.n, `app library lists all ${cat.n} exercises`);
  check(cat.loaded <= 1, `app loads only the opening exercise up front (${cat.loaded} loaded)`);
  // open every exercise through the library, in batches so the page can draw between them
  const opened = [], badOpen = [];
  for (let s0 = 0; s0 < cat.n; s0 += 25) {
    const r = await ap.evaluate(async ([a, b]) => {
      const out = [], bad = [];
      for (let i = a; i < b; i++) {
        await RR_FETCH(i); window.__app.open(i);
        await new Promise((res) => { const t0 = performance.now(); (function wait() { if (__rr.S.ex === i || performance.now() - t0 > 4000) res(); else setTimeout(wait, 5); })(); });
        const title = document.getElementById('title').textContent;
        if (__rr.S.ex !== i || title !== RR_CATALOG[i].name || /\bundefined\b|\bNaN\b/.test(document.querySelector('.panel').innerText)) bad.push(RR_CATALOG[i].id); else out.push(RR_CATALOG[i].id);
      }
      return { out, bad };
    }, [s0, Math.min(cat.n, s0 + 25)]);
    opened.push(...r.out); badOpen.push(...r.bad);
  }
  check(!badOpen.length && opened.length === cat.n, `app opens every exercise (${opened.length} of ${cat.n})${badOpen.length ? ': failed ' + badOpen.join(', ') : ''}`);
  const flow = await ap.evaluate(async () => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.onchange ? el.onchange() : el.dispatchEvent(new Event('input')); };
    set('fEquip', 'Barbell'); const barbell = window.__app.view.length;
    const allBarbell = window.__app.view.every((i) => RR_CATALOG[i].equip.includes('Barbell'));
    document.getElementById('fReset').click();
    document.getElementById('tAuto').checked = false;
    window.__app.open(window.__app.view[3]); await new Promise((r) => setTimeout(r, 300));
    window.__app.mark('pass'); const id = RR_CATALOG[__rr.S.ex].id; const saved = JSON.parse(localStorage.getItem('reprig-tests') || '{}')[id];
    const counts = document.getElementById('cTested').textContent;
    window.__app.mark('pass'); const cleared = !JSON.parse(localStorage.getItem('reprig-tests') || '{}')[id];
    return { barbell, allBarbell, saved: saved && saved.status, counts, cleared, cams: document.querySelectorAll('#camSeg button').length };
  });
  check(flow.barbell > 0 && flow.allBarbell, `app equipment filter works (${flow.barbell} barbell exercises)`);
  check(flow.saved === 'pass' && /^1 tested/.test(flow.counts) && flow.cleared, `app test mode saves a Pass to localStorage and counts it (${flow.counts})`);
  check(flow.cams >= 2, `app shows the camera presets (${flow.cams})`);
  check(!appT.errors.length, `app has no page errors ${appT.errors.length ? JSON.stringify(appT.errors.slice(0, 5)) : ''}`);
  await appT.browser.close(); appT.server.close();
} else check(false, 'app/dist/index.html present (run npm run app:build)');
process.exit(fail ? 1 : 0);
