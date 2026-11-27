// Chin-Up (GymVisual 2896, movement reference only; page not readable at authoring time): underhand (supinated) grip,
// palms facing the body, hands about shoulder width (a little narrower than the pull-up) on a free-standing pull-up bar
// (EQ.pullupBar). From a dead hang set the shoulder blades down, pull with the elbows travelling down and forward of the
// trunk until the chin clears the bar, hold briefly, lower under control to a full hang. Legs hang with a slight knee
// bend. Bilateral. Built on author-pull-up.js. The hands are planted on the bar with arm contacts (fixed targets at the bar,
// world-locked underhand orientation, weight 1); the body hangs below them, so each key is solved by setting the root
// height that gives the wanted elbow angle for the shoulder-to-hand distance, and the root X that keeps the face and chest
// clear of the bar. Stored arm channels are fitted to the IK solution (as push-up hands on the floor).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const meta = require('./meta/chin-up.json');

const env = (k, d) => +(process.env[k] ?? d);
const BAR_H = env('BAR_H', 212);          // bar centre height (cm): feet clear the floor in the dead hang
const GZ = env('GZ', 17);                 // grip point |z| (cm): hands about shoulder width, a little inside the shoulder joints (|z| 20)
const TILT = env('TILT', 2);              // fingers lean out from vertical (deg): close to vertical with the narrower grip
const CLEAR = env('CLEAR', 3);            // face / chest clearance from the bar at the top (cm)
const PB = EQ.pullupBar({ height: BAR_H, width: 120 });
const bar = PB.bar;

// Underhand hand frame (palm toward the body, fingers up over the bar from the front, thumbs lateral); left built
// directly, right mirrored
const D2R = Math.PI / 180;
const fl = [0, Math.cos(TILT * D2R), -Math.sin(TILT * D2R)];                  // left fingers (up, leaning out to -Z)
const XL = [-1, 0, 0], YL = V.scale(fl, -1), ZL = V.cross(XL, YL);
const rotL = Q.fromBasis(XL, YL, ZL), rotR = Q.mirrorZ(rotL);
const qArr = (q) => q.map((v) => +v.toFixed(6));
const POLE = JSON.parse(process.env.POLE || '[1, -0.3, 0.45]');                 // elbows forward and a little out (underhand)
const contacts = ['r', 'l'].map((s) => Object.assign(L.handContact(s), { pole: [POLE[0], POLE[1], s === 'r' ? POLE[2] : -POLE[2]], handRot: qArr(s === 'r' ? rotR : rotL) }));
// wrist targets: grip point (handle centre, EQ.gripPoint) on the bar centre line
const grip = { r: [bar.c[0], BAR_H, GZ], l: [bar.c[0], BAR_H, -GZ] };
const wristT = (s) => { const q = s === 'r' ? rotR : rotL; return V.sub(grip[s], Q.rot(q, [2.2, -7.2, 0])).map((v) => +v.toFixed(2)); };
const WT = { r: wristT('r'), l: wristT('l') };

// Body keys. flex: elbow angle; sc: shoulder blades; pitch: whole-body lean (+ = top back, away from the bar); spine
// flex per segment (- = extension); legs hanging (hip flex, knee flex, ankle dorsi)
const legs = (hip, knee, ankle) => ({ hip, knee, ankle });
const KEY = {
  hang: { flex: 8, sc: { protract: 4, elevate: 26 }, pitch: 0, spine: [0, 0, 0], neck: [0, 0], legs: legs(4, 16, -28) },
  scap: { flex: 10, sc: { protract: 0, elevate: 8 }, pitch: 3, spine: [-1, -2, -2], neck: [-2, -2], legs: legs(6, 18, -28) },
  m1: { flex: 55, sc: { protract: -6, elevate: 2 }, pitch: 4, spine: [-2, -3, -3], neck: [-3, -3], legs: legs(10, 22, -28) },
  m2: { flex: 95, sc: { protract: -12, elevate: -2 }, pitch: 6, spine: [-2, -4, -5], neck: [-4, -4], legs: legs(14, 26, -28) },
  m3: { flex: 118, sc: { protract: -14, elevate: -6 }, pitch: 6.5, spine: [-2, -5, -6], neck: [-3, -3], legs: legs(15, 27, -28) },
  top: { flex: env('TOPFLEX', 142), sc: { protract: -16, elevate: -10 }, pitch: env('TOPPITCH', 7), spine: [-2, -5, -6], neck: [-3, -3], legs: legs(16, 28, -28) },
};
const st = L.POSES.standing();
function bodyPose(k, x, y) {
  const p = clone(st.pose); delete p.ik;
  p.root.pos = [x, y, 0]; p.root.rot = { pitch: k.pitch };
  ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j] = { rot: 0, latFlex: 0, flex: k.spine[i] }; });
  p.ch.neck_c7 = { rot: 0, flex: k.neck[0] }; p.ch.head_c1 = { rot: 0, flex: k.neck[1] };
  p.ch.sc_r = clone(k.sc); p.ch.sc_l = clone(k.sc);
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: k.legs.hip, abd: 2, rot: 0 }; p.ch[`knee_${s}`] = { flex: k.legs.knee }; p.ch[`ankle_${s}`] = { dorsi: k.legs.ankle }; }
  p.ch.shoulder_r = { plane: 45, elev: 160, axial: 0 }; p.ch.shoulder_l = clone(p.ch.shoulder_r); p.ch.elbow_r = { flex: k.flex }; p.ch.elbow_l = { flex: k.flex };
  return p;
}
// root height for the elbow angle (shoulder-to-wrist distance = reach(flex)); the shoulder rises with the root
function rootY(k, x) {
  const want = L.reach(k.flex); let a = 60, b = 200;
  for (let i = 0; i < 40; i++) { const y = (a + b) / 2, S = L.fk(bodyPose(k, x, y)).shoulder_r.p; if (S[1] < WT.r[1] && V.len(V.sub(S, WT.r)) > want) a = y; else b = y; } // shoulders stay below the hands
  return r1((a + b) / 2 * 10) / 10;
}
// body clearance from the bar (hands and thumbs hold it)
const barA = V.sub(bar.c, [0, 0, 60]), barB = V.add(bar.c, [0, 0, 60]);
const barClear = (W, skip = /^(hand|thumb)_/) => EQ.segmentClear(W, barA, barB, bar.r, { skip, n: 24 });
const TRUNK = /^(hand|thumb|forearm|upperarm|biceps|deltoid)_/; // face, neck, chest, trunk and legs
const guessArm = (k) => [50, 75].flatMap((pl) => [{ shoulder_r: { plane: pl, elev: 180 - k.flex * 0.8, axial: 0 }, elbow_r: { flex: k.flex }, shoulder_l: { plane: pl, elev: 180 - k.flex * 0.8, axial: 0 }, elbow_l: { flex: k.flex } }]);
function solveKey(name, k, x) {
  const y = rootY(k, x);
  let p = bodyPose(k, x, y);
  p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 } };
  for (const s of ['r', 'l']) { const c = contacts.find((cc) => cc.id === `arm_${s}`); const g = guessArm(k).map((o) => ({ [`shoulder_${s}`]: o[`shoulder_${s}`], [`elbow_${s}`]: o[`elbow_${s}`] })); p = H.fitArm(p, s, c, WT[s], g); delete p.__cost; }
  return p;
}
// root X per key: the body hangs under the bar (x = 0 puts the pelvis below it); at the top the bar must clear the face
// and chest by CLEAR cm, so the root moves back (-X) until it does
const X0 = env('X0', -3);
function placeX(k, minClear) {
  let x = X0;
  for (let i = 0; i < 40; i++) { const W = L.fk(bodyPose(k, x, rootY(k, x))); const c = barClear(W, TRUNK).d; if (c >= minClear) break; x -= 0.5; }
  return x;
}
const X = {}; for (const n of Object.keys(KEY)) X[n] = placeX(KEY[n], CLEAR);
const poses = {}; for (const n of Object.keys(KEY)) poses[n] = solveKey(n, KEY[n], X[n]);
const keyframes = [['hang', 0], ['hang', 0.8], ['scap', 1.1], ['m1', 1.5], ['m2', 1.8], ['m3', 2.0], ['top', 2.2], ['top', 2.6], ['m3', 2.95], ['m2', 3.3], ['m1', 3.75], ['scap', 4.3], ['hang', 4.6], ['hang', 5.2]].map(([pose, t]) => ({ t, pose }));

const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [PB.prop];
// pin each pose's ik (same targets everywhere: the hands never move)
for (const p of Object.values(ex.poses)) p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 } };

// Self-check over the loop: hands planted, floor, bar clearance, chin over the bar at the top, joint limits, grip
const tl = R.buildTimeline(ex), Dur = ex.timeline.duration;
const rep = { slide: 0, slideAt: null, floor: 1e9, floorAt: null, bar: 1e9, barAt: null, gripErr: 0, elbow: [999, -999] };
for (let i = 0; i <= 1040; i++) {
  const t = (i / 1040) * Dur, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
  for (const s of ['r', 'l']) { const d = V.len(V.sub(W[`wrist_${s}`].p, WT[s])); if (d > rep.slide) { rep.slide = d; rep.slideAt = [s, +t.toFixed(2)]; } rep.gripErr = Math.max(rep.gripErr, V.len(V.sub(EQ.gripPoint(W, s).p, grip[s]))); }
  const f = L.shapeMinY(W); if (f.y < rep.floor) { rep.floor = f.y; rep.floorAt = [f.id, +t.toFixed(2)]; }
  const c = barClear(W); if (c.d < rep.bar) { rep.bar = c.d; rep.barAt = [c.id, +t.toFixed(2)]; }
  const e = 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p)); rep.elbow = [Math.min(rep.elbow[0], e), Math.max(rep.elbow[1], e)];
}
const viol = [];
for (const [n, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${n}.${j}.${c}=${p.ch[j][c]}`); }
for (const k of ['slide', 'floor', 'bar', 'gripErr']) rep[k] = +rep[k].toFixed(3); rep.elbow = rep.elbow.map(Math.round);
const Wh = L.fk(poses.hang, contacts), Wt = L.fk(poses.top, contacts);
const chin = H.bottomOf(Wt, 'jaw') - BAR_H, travel = V.len(V.sub(Wt.pelvis.p, Wh.pelvis.p));
const shW = V.len(V.sub(Wh.shoulder_r.p, Wh.shoulder_l.p));
const elbowOf = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const set = H.setKin(ex);
set('Elbow flexion', 'setup', `≈${Math.round(elbowOf(Wh))}° in the dead hang`); set('Elbow flexion', 'peak', `≈${Math.round(elbowOf(Wt))}° at the top`);
set('Grip width', 'setup', `Underhand, grip points ${2 * GZ} cm apart (shoulder joints ${Math.round(shW)} cm in the hang): about ${Math.round(100 * 2 * GZ / shW)}% of shoulder width`); set('Grip width', 'peak', 'Unchanged (hands planted on the bar)');
set('Chin height', 'setup', `Chin ${Math.round(-(H.bottomOf(Wh, 'jaw') - BAR_H))} cm below the bar in the dead hang`); set('Chin height', 'peak', `Chin ${chin.toFixed(1)} cm above the bar at the top; body rises ${Math.round(travel)} cm`);
set('Shoulder blades', 'setup', `Elevated (${KEY.hang.sc.elevate}) in the hang`); set('Shoulder blades', 'peak', `Depressed and retracted (elevate ${KEY.top.sc.elevate}, protract ${KEY.top.sc.protract}) at the top`);
set('Tempo', 'setup', 'Hang 0.8 s, set the shoulders 0.3 s'); set('Tempo', 'peak', 'About 1.1 s up, 0.4 s hold, 2 s down');
console.log(`Chin-Up: wrote ${L.write(ex)}\n  X ${JSON.stringify(X)} rootY ${JSON.stringify(Object.fromEntries(Object.entries(poses).map(([n, p]) => [n, p.root.pos[1]])))}\n  ${JSON.stringify(rep)}\n  chin over bar ${chin.toFixed(1)} cm, pelvis travel ${travel.toFixed(1)} cm, feet ${L.shapeMinY(Wh).y.toFixed(1)} cm off the floor in the hang\n  limits ${viol.length ? viol.join(', ') : 'ok'}`);
if (rep.slide > 0.05) { console.error('FAIL: hands slide on the bar'); process.exitCode = 1; }
if (rep.floor < 0) { console.error('FAIL: feet touch the floor'); process.exitCode = 1; }
if (rep.bar < 0.5) { console.error('FAIL: body through the bar'); process.exitCode = 1; }
if (chin < 0) { console.error('FAIL: chin does not clear the bar'); process.exitCode = 1; }
if (viol.length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
