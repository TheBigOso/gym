// Negative Dragon Flag (GymVisual #11349; page not readable here, movement from the name and standard coaching). Supine on
// a flat bench, head toward the -X end, hands gripping the bench edges beside the head (planted hand contacts). Start at
// the top: the body straight and nearly vertical, balanced on the upper back and shoulder blades (neck flexed so the head
// rests lightly on the pad, never loaded). Lower the rigid body slowly (hips and knees straight, about 4 s) until it hovers
// just above the bench, then bend the hips and knees, roll back up on the upper back in a tuck and straighten the body to
// vertical again. The upper back stays where it is on the pad (the mid-back joint keeps its x). Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const CB = require('./families/core-b');
const H = require('./families/hips');
const DBH = require('./families/dumbbell');
const F = require('./families/b6-20');
const meta = require('./meta/negative-dragon-flag.json');

const TOP = 45;                                           // bench top
const BENCH = DBH.bench({ x: 0, seat: 40, height: TOP, width: 30, angle: 0, back: 80 });
const BX = [BENCH.seatX[0] - 80, BENCH.seatX[1]];          // bench spans x -100 .. 20
// Lying on the bench: the floor lying base raised onto the pad, head near the -X end
let lie = CB.lie({ kneeFlex: 0, spine: { l5: 2, t12: 2, t6: 6 }, pitch: 92 });
lie.root.pos[1] = r1(lie.root.pos[1] + TOP);
const W0 = L.fk(lie);
const headTop = Math.min(W0.head_c1.p[0] - 12, W0.head_c1.p[0]);
lie.root.pos[0] = r1(lie.root.pos[0] + (BX[0] + 14 - headTop));
const X_T6 = L.fk(lie).spine_t6.p[0];

const shapeLowPt = (W, s) => { const g = R.shapeWorld(W, s); if (g.kind === 'capsule') return g.a[1] - g.r[0] < g.b[1] - g.r[1] ? V.sub(g.a, [0, g.r[0], 0]) : V.sub(g.b, [0, g.r[1], 0]); const ny = Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); return g.axes.reduce((c, a) => V.sub(c, V.scale(a, a[1] / ny)), g.c); };
const SKIP = /^(hand|thumb|forearm|upperarm|biceps)_[rl]$/;   // the arms reach to the bench edges and wrap them
const overBench = (pt) => pt[0] > BX[0] && pt[0] < BX[1] && Math.abs(pt[2]) < 15;
// Lowest body point above the bench footprint (cm above the floor) and its shape
const HEADRE = /^(head|hair|jaw|nose|brow|ear_[rl]|eye_[rl])$/;
function benchLow(W, noHead = false) { let b = { y: 1e9 }; for (const s of rig.shapes) { if (SKIP.test(s.id) || /^(eye|brow)/.test(s.id) || (noHead && HEADRE.test(s.id))) continue; const pt = shapeLowPt(W, s); if (overBench(pt) && pt[1] < b.y) b = { y: pt[1], id: s.id }; } return b; }
const HEAD = CB.HEAD;
const headLow = (W) => Math.min(...HEAD.map((id) => CB.bottomOf(W, id)));

// Body pose for a body angle theta (deg above the bench, pelvis-to-ankle line), with hips/knees/spine given. The root
// pitch is solved for theta, the root x keeps the mid-back joint in place, the neck flexes until the head clears the pad,
// and the root height puts the lowest body point (over the bench) on the pad.
function body(theta, { hip = 0, knee = 3, l5 = 2, t12 = 2, t6 = 10, ankle = -30, pitch = null } = {}) {
  let p = clone(lie);
  Object.assign(p.ch, { spine_l5: { rot: 0, latFlex: 0, flex: l5 }, spine_t12: { rot: 0, latFlex: 0, flex: t12 }, spine_t6: { rot: 0, latFlex: 0, flex: t6 } });
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: hip, abd: 0, rot: 0 }; p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi: ankle }; }
  const ang = (q) => { const W = L.fk(q), d = V.sub(W.ankle_r.p, W.hip_r.p); return Math.atan2(d[1], d[0]) / R.DEG; };
  const thAt = (P) => { const q = clone(p); q.root.rot.pitch = P; return ang(q); };
  // theta grows with pitch; bisection on the root pitch (for a tuck theta is measured on the pelvis-to-knee line)
  const measure = hip > 30 ? (q) => { const W = L.fk(q), d = V.sub(W.knee_r.p, W.hip_r.p); return Math.atan2(d[1], d[0]) / R.DEG; } : ang;
  let lo = 60, hi = 200;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2, q = clone(p); q.root.rot.pitch = m; if (measure(q) < theta) lo = m; else hi = m; }
  p.root.rot.pitch = r1(pitch ?? (lo + hi) / 2);
  // the body rests on the pad without the head (upper back the support); then the least neck flexion that keeps the
  // head at least 0.3 cm above the pad (resting lightly, never carrying weight)
  const place = (q) => { let W = L.fk(q); q.root.pos[0] = r1(q.root.pos[0] + X_T6 - W.spine_t6.p[0]); W = L.fk(q); q.root.pos[1] = r1(q.root.pos[1] + TOP + 0.3 - benchLow(W, true).y); return q; };
  let nlo = -20, nhi = 64;
  if (headLow(L.fk(place(CB.neck(clone(p), nlo)))) >= TOP + 0.3) nhi = nlo;
  else for (let i = 0; i < 40; i++) { const m = (nlo + nhi) / 2; if (headLow(L.fk(place(CB.neck(clone(p), m)))) < TOP + 0.3) nlo = m; else nhi = m; }
  p = place(CB.neck(p, r1(nhi + 0.2)));
  return p;
}
// Hands: grip the bench side edges beside the head (wrist just outside and under the top edge, palm on the pad's side)
const HZ = 16.5, HX = BX[0] + 9;
const contacts = [H.handC('r', [0.2, -0.3, 1]), H.handC('l', [0.2, -0.3, -1])];
function gripArm(p, prevPose) {
  let q = clone(p);
  if (prevPose) for (const j of ['shoulder_r', 'elbow_r', 'wrist_r', 'shoulder_l', 'elbow_l', 'wrist_l']) q.ch[j] = clone(prevPose.ch[j]);
  if (!prevPose) { // first pose: FK arm to the grip with a natural wrist, then lock that hand orientation in the contacts
    q = L.armToTarget(q, [HX, TOP - 1.5, HZ], { wrist: { pron: -80, flex: 10, dev: 0 }, guess: [60, 150, -40] });
    const Wq = L.fk(q), hr = H.qArr(Wq.wrist_r.q);
    contacts[0].handRot = hr; contacts[1].handRot = H.qArr(Q.mirrorZ(Wq.wrist_r.q));
    q = CB.mirrorArm(q);
  }
  const T = { r: [HX, TOP - 1.5, HZ], l: [HX, TOP - 1.5, -HZ] };
  q.ik = { arm_r: { target: T.r, weight: 1 }, arm_l: { target: T.l, weight: 1 } };
  const g = (s) => [{ [`shoulder_${s}`]: clone(q.ch[`shoulder_${s}`]), [`elbow_${s}`]: clone(q.ch[`elbow_${s}`]), [`wrist_${s}`]: clone(q.ch[`wrist_${s}`]) }];
  q = H.fitArm(q, 'r', contacts[0], T.r, g('r')); delete q.__cost;
  q = H.fitArm(q, 'l', contacts[1], T.l, g('l')); delete q.__cost;
  return q;
}
const UPPER = { t6: 20, t12: 6 }, UPPER2 = { t6: 15, t12: 4 };   // the upper back rounds near the top so the head stays clear
const SEQ = [
  ['top', 72, UPPER], ['l1', 58, UPPER2], ['l2', 44, {}], ['l3', 28, {}], ['bottom', 10, {}], ['bottomHold', 9, {}],
  ['tuck', 0, { hip: 112, knee: 118, t12: 8, l5: 12, pitch: 100 }], ['tuckMid', 0, { hip: 106, knee: 114, t12: 9, l5: 12, t6: 13, pitch: 122 }], ['tuckMid2', 0, { hip: 103, knee: 112, t12: 9.5, l5: 12, t6: 14.5, pitch: 134 }], ['tuckMid3', 0, { hip: 101.5, knee: 111, t12: 9.8, l5: 12, t6: 15.3, pitch: 140 }], ['tuckUp', 0, { hip: 100, knee: 110, t12: 10, l5: 12, t6: 16, pitch: 145 }], ['tuckExt', 0, { hip: 65, knee: 72, t12: 7, l5: 7, t6: 16, pitch: 145.5 }], ['ext', 68, { hip: 30, knee: 35, t6: 16, t12: 4 }], ['ext2', 70, { hip: 12, knee: 14, t6: 18, t12: 5 }],
];
const poses = {};
let prevP = null;
for (const [nm, th, o] of SEQ) { const b = body(th, o); poses[nm] = gripArm(b, prevP); prevP = poses[nm]; }
const keyframes = [['top', 0], ['top', 0.6], ['l1', 1.6], ['l2', 2.6], ['l3', 3.6], ['bottom', 4.6], ['bottomHold', 5.0], ['tuck', 5.8], ['tuckMid', 6.3], ['tuckMid2', 6.55], ['tuckMid3', 6.68], ['tuckUp', 6.8], ['tuckExt', 7.0], ['ext', 7.2], ['ext2', 7.4], ['top', 7.6], ['top', 8.2]].map(([pose, t]) => ({ t, pose }));
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [BENCH.prop];
const pk = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk) - 3, max: Math.ceil(pk) + 3 };

// whole loop: bench clearance of the body (not the gripping arms), head on the pad, elbow and shoulder ranges
const rep = F.report(ex, { bench: (W) => benchLow(W).y - TOP, head: (W) => headLow(W) - TOP, neck: (W, p) => p.ch.neck_c7.flex + p.ch.head_c1.flex });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const bodyAng = (W) => { const d = V.sub(W.ankle_r.p, W.hip_r.p); return Math.atan2(d[1], d[0]) / R.DEG; };
F.setKin(ex, 'Body angle', `${F.deg(bodyAng(Wt))} above the bench at the top`, `Lowered to ${F.deg(bodyAng(Wb))} (feet ${Math.round(Math.min(F.heelLow(Wb, 'r')) - TOP)} cm above the pad level)`);
F.setKin(ex, 'Hip angle', `Hip ${F.deg(poses.top.ch.hip_r.flex)}`, `Hip ${F.deg(poses.bottom.ch.hip_r.flex)} throughout the lowering; tuck ${F.deg(poses.tuck.ch.hip_r.flex)} to roll back up`);
F.setKin(ex, 'Pivot', `Upper back on the pad (contact ${benchLow(Wt).id})`, `Mid-back joint stays put; neck flexion ${F.deg(poses.top.ch.neck_c7.flex + poses.top.ch.head_c1.flex)} at the top, ${F.deg(poses.bottom.ch.neck_c7.flex + poses.bottom.ch.head_c1.flex)} at the bottom`);
F.setKin(ex, 'Tempo', 'Hold the top 0.6 s', '4 s lowering, 0.4 s hold, 2.6 s tuck and roll up, 0.6 s pause');
console.log(`Negative Dragon Flag: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
for (const k in poses) { const W = L.fk(poses[k], contacts); console.log(' ', k, poses[k].root.rot.pitch, JSON.stringify(benchLow(W)), r1(headLow(W) - TOP), JSON.stringify(poses[k].ch.shoulder_r), poses[k].ch.elbow_r.flex, r1(V.len(V.sub(W.wrist_r.p, poses[k].ik.arm_r.target)))); }
F.CA.guard('negative-dragon-flag', rep, [rep.bench[0] < -0.6 && `body sinks into the bench (${rep.bench[0]})`, rep.head[0] < -0.6 && `head sinks into the bench (${rep.head[0]})`]);
if (process.env.DBG) { const tl = R.buildTimeline(ex); for (let t = 0; t <= 8.2; t += 0.1) { const W = R.evalPose(rig, tl.pose(t), contacts); const b = benchLow(W); console.log(t.toFixed(1), r1(b.y - TOP), b.id, r1(headLow(W) - TOP)); } }
