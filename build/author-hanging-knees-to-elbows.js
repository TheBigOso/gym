// Hanging Knees to Elbows (GymVisual 13961, movement reference only; page not readable at authoring time): dead hang from
// a free-standing pull-up bar (EQ.pullupBar), overhand grip a little wider than the shoulders. Set the shoulder blades,
// then drive the bent knees up while the pelvis curls (posterior tilt, the whole spine rounding) and the straight arms
// press the bar toward the hips (shoulder extension), so the trunk tips back and the knees travel up to meet the elbows;
// pause, lower under control to the hang without swinging. Bilateral. Built on author-hanging-leg-hip-raise.js: same grip,
// hand contacts and per-key root solve (arm length, shoulder offset from under the bar, centre of mass under the hands),
// with a knee-to-elbow term added at the top keys.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const HB = require('./families/b5-barkb');
const meta = require('./meta/hanging-knees-to-elbows.json');

const env = (k, d) => +(process.env[k] ?? d);
const BAR_H = env('BAR_H', 214);          // bar centre height (cm): straight legs clear the floor in the dead hang
const GZ = env('GZ', 32);                 // grip point |z| (cm): a wide overhand grip (shoulder joints at |z| 20) so the knees come up inside the arms
const PB = EQ.pullupBar({ height: BAR_H, width: 120 });
const bar = PB.bar;
const G = HB.overhandGrip({ bar, barH: BAR_H, gz: GZ, tilt: 5 });
const { WT, contacts, grip } = G;

// Keys. hip/knee/ankle: legs (both the same); spine flex per segment (+ = flexion: the pelvis curls up); sc: shoulder
// blades; shX: shoulder joint x relative to the hands (- = behind the bar); flex: elbow (arms nearly straight)
const KEY = {
  hang: { hip: 3, knee: 8, ankle: -12, spine: [0, 0, 0], neck: [0, 0], sc: { protract: 4, elevate: 22 }, shX: null, flex: 6 },
  set: { hip: 6, knee: 12, ankle: -12, spine: [0, 0, 0], neck: [0, 0], sc: { protract: 0, elevate: 8 }, shX: null, flex: 6 },
  r1: { hip: 45, knee: 55, ankle: -18, spine: [6, 3, 1], neck: [2, 2], sc: { protract: 0, elevate: 6 }, shX: null, pitch: env('P1', 6), flex: 7 },
  r2: { hip: 85, knee: 95, ankle: -22, spine: [16, 10, 5], neck: [5, 4], sc: { protract: 2, elevate: 4 }, shX: null, pitch: env('P2', 18), flex: 9 },
  r3: { hip: 115, knee: 110, ankle: -25, spine: [28, 18, 10], neck: [8, 6], sc: { protract: 4, elevate: 3 }, shX: null, pitch: env('P3', 30), flex: 20, abd: 6 },
  top: { hip: env('TOPHIP', 130), knee: env('TOPKNEE', 110), ankle: -28, spine: [env('L5', 44), env('T12', 29), env('T6', 23)], neck: [12, 10], sc: { protract: 6, elevate: 2 }, shX: null, pitch: env('P4', 45), pitchW: env('PW', 0.5), comW: env('COMW', 0.3), k2e: env('K2E', 0.5), flex: 12, abd: env('ABD', 4), rot: env('ROT', 0) },
};
const st = L.POSES.standing();
function bodyPose(k, root = [0, 100, 0], pitch = 0) {
  const p = clone(st.pose); delete p.ik;
  p.root.pos = root.slice(); p.root.rot = { pitch };
  ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j] = { rot: 0, latFlex: 0, flex: k.spine[i] }; });
  p.ch.neck_c7 = { rot: 0, flex: k.neck[0] }; p.ch.head_c1 = { rot: 0, flex: k.neck[1] };
  p.ch.sc_r = clone(k.sc); p.ch.sc_l = clone(k.sc);
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: k.hip, abd: k.abd ?? 1, rot: k.rot ?? 0 }; p.ch[`knee_${s}`] = { flex: k.knee }; p.ch[`ankle_${s}`] = { dorsi: k.ankle }; }
  p.ch.shoulder_r = { plane: 20, elev: 170, axial: 0 }; p.ch.shoulder_l = clone(p.ch.shoulder_r); p.ch.elbow_r = { flex: k.flex }; p.ch.elbow_l = { flex: k.flex };
  return p;
}
// root (x, y, pitch): arm length, centre of mass under the hands (weight comW; lighter at the top, where the body swings
// back behind the bar), trunk pitch target, and at the top keys the knees drawn toward the elbows (the elbow taken on the
// straight shoulder-to-hand line at upper-arm length, which is where the fitted arm puts it)
const UAL = V.len(rig.byId.elbow_r.offset);
const elbowAt = (W, s) => V.add(W[`shoulder_${s}`].p, V.scale(V.norm(V.sub(WT[s], W[`shoulder_${s}`].p)), UAL));
function placeKey(k) {
  const want = L.reach(k.flex);
  const objs = [
    (W) => [(V.len(V.sub(W.shoulder_r.p, WT.r)) - want) * 3, k.shX == null ? 0 : (W.shoulder_r.p[0] - (WT.r[0] + k.shX)) * 2, (HB.comX(W) - WT.r[0]) * (k.comW ?? 2), Math.max(0, W.shoulder_r.p[1] - WT.r[1] + 20) * 5],
    (W, q) => [k.pitch != null ? (q.root.rot.pitch - k.pitch) * (k.pitchW ?? 0.5) : k.shX == null ? q.root.rot.pitch * 0.5 : 0], // dead hang: body vertical; raise keys: trunk tipped back
    (W) => (k.k2e ? V.sub(W.knee_r.p, V.add(elbowAt(W, 'r'), [env('KFX', 10), env('KFY', -4), 0])).slice(0, 2).map((v) => v * k.k2e) : [0]), // knee just in front of the elbow
  ];
  const s = L.solvePose(bodyPose(k, [0, 110, 0], 0), ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], objs, { iters: 400 });
  return s;
}
const poses = {}, place = {};
const solveNamed = (n, k) => { const s = placeKey(k); place[n] = { cost: +s.cost.toFixed(4), pitch: s.pose.root.rot.pitch }; poses[n] = G.fitArms(s.pose, k.flex); };
for (const [n, k] of Object.entries(KEY)) solveNamed(n, k);
// in-between keys: solved from blended key settings (so the hands stay planted and the balance holds between keys)
const lerpN = (a, b, f) => (a == null || b == null ? null : a + (b - a) * f);
function lerpKey(a, b, f) {
  const o = { spine: a.spine.map((v, i) => v + (b.spine[i] - v) * f), neck: a.neck.map((v, i) => v + (b.neck[i] - v) * f), sc: { protract: lerpN(a.sc.protract, b.sc.protract, f), elevate: lerpN(a.sc.elevate, b.sc.elevate, f) } };
  for (const c of ['hip', 'knee', 'ankle', 'flex']) o[c] = lerpN(a[c], b[c], f);
  o.abd = lerpN(a.abd ?? 1, b.abd ?? 1, f); o.rot = lerpN(a.rot ?? 0, b.rot ?? 0, f);
  o.shX = a.shX == null && b.shX == null ? null : lerpN(a.shX ?? 0, b.shX ?? 0, f);
  o.pitch = a.pitch == null && b.pitch == null ? null : lerpN(a.pitch ?? 0, b.pitch ?? 0, f);
  return o;
}
const SEQ = [['hang', 0], ['hang', 0.6], ['set', 0.9], ['r1', 1.3], ['r2', 1.65], ['r3', 2.0], ['top', 2.3], ['top', 2.7], ['r3', 3.15], ['r2', 3.6], ['r1', 4.1], ['set', 4.6], ['hang', 4.9], ['hang', 5.6]];
const keyframes = [];
SEQ.forEach(([n, t], i) => {
  if (i > 0 && SEQ[i - 1][0] !== n) { // three solved in-between keys per segment keep the hands on the bar between keys
    const [pn, pt] = SEQ[i - 1];
    for (const f of [0.25, 0.5, 0.75]) {
      const [a, b, g] = pn < n ? [pn, n, f] : [n, pn, 1 - f], nm = `${a}_${b}_${Math.round(g * 100)}`;
      if (!poses[nm]) solveNamed(nm, lerpKey(KEY[a], KEY[b], g));
      keyframes.push({ t: +(pt + (t - pt) * f).toFixed(3), pose: nm });
    }
  }
  keyframes.push({ t, pose: n });
});

const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [PB.prop];
for (const p of Object.values(ex.poses)) p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 } };

// Self-check over the loop
const barA = V.sub(bar.c, [0, 0, 60]), barB = V.add(bar.c, [0, 0, 60]);
const barClear = (W) => EQ.segmentClear(W, barA, barB, bar.r, { skip: /^(hand|thumb)_/, n: 24 });
const tl = R.buildTimeline(ex), Dur = ex.timeline.duration;
const rep = { slide: 0, floor: 1e9, floorAt: null, bar: 1e9, barAt: null, gripErr: 0, comX: 0 };
for (let i = 0; i <= 1080; i++) {
  const t = (i / 1080) * Dur, W = R.evalPose(rig, tl.pose(t), ex.contacts);
  for (const s of ['r', 'l']) { rep.slide = Math.max(rep.slide, V.len(V.sub(W[`wrist_${s}`].p, WT[s]))); rep.gripErr = Math.max(rep.gripErr, V.len(V.sub(EQ.gripPoint(W, s).p, grip[s]))); }
  const f = L.shapeMinY(W); if (f.y < rep.floor) { rep.floor = f.y; rep.floorAt = [f.id, +t.toFixed(2)]; }
  const c = barClear(W); if (c.d < rep.bar) { rep.bar = c.d; rep.barAt = [c.id, +t.toFixed(2)]; }
  rep.comX = Math.max(rep.comX, Math.abs(HB.comX(W) - WT.r[0]));
}
const viol = HB.limitViolations(ex);
for (const k of ['slide', 'floor', 'bar', 'gripErr', 'comX']) rep[k] = +rep[k].toFixed(3);
const Wh = L.fk(poses.hang, contacts), Wt = L.fk(poses.top, contacts);
// leg angle above horizontal at the top (pelvis-to-ankle line), pelvis tilt change (thigh from trunk)
const legAng = (W) => Math.round(Math.atan2(W.ankle_r.p[1] - W.hip_r.p[1], Math.abs(W.ankle_r.p[0] - W.hip_r.p[0])) / R.DEG);
const trunkBack = (W) => Math.round(Math.atan2(W.pelvis.p[0] - W.neck_c7.p[0], W.neck_c7.p[1] - W.pelvis.p[1]) / R.DEG);
const spineTop = KEY.top.spine.reduce((a, b) => a + b, 0);
const k2e = (W) => Math.min(V.len(V.sub(W.knee_r.p, W.elbow_r.p)), V.len(V.sub(W.knee_l.p, W.elbow_l.p)));
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${KEY.hang.hip}° in the dead hang`); set('Hip flexion', 'peak', `≈${KEY.top.hip}° at the top (joint channel); thighs ${legAng(Wt)}° above horizontal (hip to ankle line)`);
set('Knee flexion', 'setup', `Nearly straight (≈${Math.round(H.kneeOf(Wh, 'r'))}°)`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Pelvis and low back', 'setup', 'Neutral in the hang'); set('Pelvis and low back', 'peak', `Pelvis curls up: about ${spineTop}° of spinal flexion (low back ${KEY.top.spine[0]}°); trunk ${trunkBack(Wt)}° back from vertical, centre of mass within ${rep.comX.toFixed(1)} cm of under the hands`);
set('Knee to elbow distance', 'setup', `${Math.round(k2e(Wh))} cm (knee joint to elbow joint) in the hang`); set('Knee to elbow distance', 'peak', `${Math.round(k2e(Wt))} cm joint to joint at the top: the knees arrive just below and inside the elbows (knee ${r1(Wt.elbow_r.p[1] - Wt.knee_r.p[1])} cm lower), elbows bent about ${Math.round(poses.top.ch.elbow_r.flex)}°`);
set('Tempo', 'setup', 'Hang 0.6 s, set the shoulders 0.3 s'); set('Tempo', 'peak', 'About 1.4 s up, 0.4 s hold, 2.2 s down, 0.7 s hang');
ex.checks.measure = { name: 'hipFlexion', min: KEY.top.hip - 5, max: KEY.top.hip + 5 };
console.log(`Hanging Knees to Elbows: k2e ${k2e(Wt).toFixed(1)} elbows ${Wt.elbow_r.p.map(r1)} knees ${Wt.knee_r.p.map(r1)} wrote ${L.write(ex)}\n  place ${JSON.stringify(place)}\n  ${JSON.stringify(rep)}\n  legs ${legAng(Wt)}° above horizontal, trunk back ${trunkBack(Wt)}°, feet ${L.shapeMinY(Wh).y.toFixed(1)} cm off the floor in the hang\n  limits ${viol.length ? viol.join(', ') : 'ok'}`);
if (rep.slide > 0.05) { console.error('FAIL: hands slide on the bar'); process.exitCode = 1; }
if (rep.floor < 0) { console.error('FAIL: feet touch the floor'); process.exitCode = 1; }
if (rep.bar < 0.5) { console.error('FAIL: body through the bar'); process.exitCode = 1; }
if (viol.length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
