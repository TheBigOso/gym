// Hollow Rock (GymVisual #14054; page not readable here, movement from the name and standard coaching). Bilateral: supine,
// arms overhead, legs straight and together. Lift into the hollow (low back pressed down by a posterior pelvic tilt,
// shoulder blades and legs off the mat, as the hollow hold), then rock the locked shape back and forth along the curved
// back: back onto the shoulder blades (legs rise) and forward onto the low back (shoulders and arms rise). The joint
// angles do not change during the rock: the whole body rolls without sliding (the root pitch changes and the root moves
// so the contact point rolls along the back). Settle and lower to the mat.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./families/core-b');
const F = require('./families/b6-20');
const meta = require('./meta/hollow-rock.json');

const lowBack = (W) => Math.min(C.bottomOf(W, 'pelvis'), C.bottomOf(W, 'buttock_r'), C.bottomOf(W, 'buttock_l'), C.bottomOf(W, 'abdomen'));
const heel = (W, s) => Math.min(C.bottomOf(W, `foot_${s}`), C.bottomOf(W, `calf_${s}`), C.bottomOf(W, `shank_${s}`));
const handLow = (W, s) => Math.min(...(s === 'r' ? C.ARM_R : C.ARM_L).map((id) => C.bottomOf(W, id)));

/* ---------------- Rest and hollow (as the hollow hold) ---------------- */
let rest = C.headDown(C.lie({ kneeFlex: 0, spine: { l5: -2, t12: 2, t6: 4 }, pitch: 92 }), 0.2);
for (const s of ['r', 'l']) { rest.ch[`knee_${s}`] = { flex: 2 }; rest.ch[`ankle_${s}`] = { dorsi: -25 }; rest.ch[`hip_${s}`] = { flex: 0, abd: 0, rot: 0 }; }
function armsOver(pose, hover) {
  const p = clone(pose);
  p.ch.elbow_r = { flex: 5 }; p.ch.wrist_r = { pron: 0, flex: 0, dev: 0 }; p.ch.shoulder_r = { plane: 90, elev: 165, axial: 0 }; p.ch.sc_r = { protract: 2, elevate: 14 };
  const q = L.solvePose(p, ['ch.shoulder_r.elev'], [(W) => [(handLow(W, 'r') - hover) * 2], L.obj.reg('ch.shoulder_r.elev', 185, 0.02), (W, q) => [Math.max(0, q.ch.shoulder_r.elev - 200) * 5]]).pose;
  return C.mirrorArm(q);
}
function legs(pose, h) {
  const p = clone(pose);
  const sol = L.solvePose(p, ['ch.hip_r.flex'], [(W) => [(heel(W, 'r') - h) * 2]]).pose;
  sol.ch.hip_l = clone(sol.ch.hip_r);
  return sol;
}
rest = L.groundPose(armsOver(legs(rest, 0.4), 0.6));
function hollow(k) {
  let p = clone(rest);
  p = L.solvePose(p, ['root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
    (W) => [lowBack(W) * 4, (C.bottomOf(W, 'chest') - k.chest) * 2, Math.min(0, C.bottomOf(W, 'ribcage') - 0.3) * 4],
    L.obj.reg('ch.spine_l5.flex', 12, 0.1), L.obj.reg('ch.spine_t12.flex', 16, 0.08), L.obj.reg('ch.spine_t6.flex', 16, 0.08),
  ]).pose;
  C.neck(p, k.neck);
  p = legs(p, k.heel);
  p = armsOver(p, k.hand);
  return L.groundPose(p);
}
const hold = hollow({ chest: 10, heel: 18, hand: 15, neck: 24 });

/* ---------------- Rolling: lowest body point and its path along the back ---------------- */
const shapeLow = (W) => { // lowest world point of the body shapes
  let best = { y: 1e9 };
  for (const s of rig.shapes) {
    const g = R.shapeWorld(W, s);
    let pt;
    if (g.kind === 'capsule') pt = (g.a[1] - g.r[0] < g.b[1] - g.r[1]) ? V.sub(g.a, [0, g.r[0], 0]) : V.sub(g.b, [0, g.r[1], 0]);
    else { const ny = Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); pt = g.axes.reduce((c, a) => V.sub(c, V.scale(a, a[1] / ny)), g.c); }
    if (pt[1] < best.y) best = { y: pt[1], p: pt, id: s.id };
  }
  return best;
};
const rot = (p, d) => { const q = clone(p); q.root.rot.pitch = r1(p.root.rot.pitch + d); return L.groundPose(q); };
// Rock by d degrees in 0.5 degree steps; each step pivots about the previous contact point (a body point fixed on the
// floor), so a smooth part of the back rolls without sliding and a gap between two contact areas tips across like a
// rocker with a flat spot.
const invQ = (q) => Q.conj(q);
function rock(d) {
  const n = Math.max(1, Math.round(Math.abs(d) / 0.5));
  let q = clone(hold), W = L.fk(q), c = shapeLow(W), loc = Q.rot(invQ(W.pelvis.q), V.sub(c.p, W.pelvis.p)), cx = c.p[0];
  for (let i = 1; i <= n; i++) {
    const nq = rot(hold, (d * i) / n); nq.root.pos[0] = q.root.pos[0];
    const Wn = L.fk(nq), old = V.add(Wn.pelvis.p, Q.rot(Wn.pelvis.q, loc));
    nq.root.pos[0] += cx - old[0];
    q = nq; W = L.fk(q); c = shapeLow(W); loc = Q.rot(invQ(W.pelvis.q), V.sub(c.p, W.pelvis.p)); cx = c.p[0];
  }
  q.root.pos[0] = r1(q.root.pos[0]);
  return q;
}
const BACK = 13, FWD = -11;
const poses = { rest, hold, back: rock(BACK), fwd: rock(FWD), back2: rock(BACK + 1), fwd2: rock(FWD - 1) };
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.6, pose: 'rest' }, { t: 1.4, pose: 'hold' }, { t: 1.9, pose: 'back' }, { t: 2.4, pose: 'fwd' }, { t: 2.9, pose: 'back2' },
  { t: 3.4, pose: 'fwd2' }, { t: 3.9, pose: 'back2' }, { t: 4.4, pose: 'fwd' }, { t: 4.9, pose: 'hold' }, { t: 5.6, pose: 'rest' }, { t: 6.2, pose: 'rest' }];
const ex = C.moduleOf(meta, poses, keyframes, []);
const hipPk = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hipPk) - 3, max: Math.ceil(hipPk) + 3 };

const rep = C.scan(ex);
// rolling check: contact point speed along X vs the floor (should be the rolling point, not sliding)
const Wh = L.fk(hold), Wb = L.fk(poses.back), Wf = L.fk(poses.fwd), ho = hold.ch;
const legDeg = (W) => F.CA.legFromFloor(W, 'r');
const shDeg = (W) => Math.atan2(W.neck_c7.p[1] - W.spine_t12.p[1], W.spine_t12.p[0] - W.neck_c7.p[0]) / R.DEG;
F.setKin(ex, 'Hollow shape', 'Lying long, arms overhead', `Lumbar segment ${C.deg(ho.spine_l5.flex)}, pelvis tucked ${C.deg(hold.root.rot.pitch - rest.root.rot.pitch)}; shoulder blades ${Math.round(C.bottomOf(Wh, 'chest'))} cm and heels ${Math.round(heel(Wh, 'r'))} cm off the mat`);
F.setKin(ex, 'Rock', `Contact under the ${shapeLow(Wh).id}`, `Back ${C.deg(BACK)} (contact ${shapeLow(Wb).id}, heels ${Math.round(heel(Wb, 'r'))} cm up) and forward ${C.deg(-FWD)} (contact ${shapeLow(Wf).id}, upper back ${Math.round(C.bottomOf(Wf, 'chest'))} cm up); rolls ${Math.round(Math.abs(poses.back.root.pos[0] - poses.fwd.root.pos[0]))} cm`);
F.setKin(ex, 'Hip angle', `Hip ${C.deg(ho.hip_r.flex)} in the hollow`, `Unchanged through the rock (${C.deg(ho.hip_r.flex)}); legs ${C.deg(legDeg(Wf))} to ${C.deg(legDeg(Wb))} from the floor`);
F.setKin(ex, 'Tempo', 'Rest 0.6 s, lift 0.8 s', '0.5 s per half rock, 7 half rocks, settle 0.5 s, lower 0.7 s');
Object.assign(rep, { contact: { hold: shapeLow(Wh).id, back: shapeLow(Wb).id, fwd: shapeLow(Wf).id }, x: [poses.back.root.pos[0], hold.root.pos[0], poses.fwd.root.pos[0]], hand: [r1(handLow(Wb, 'r')), r1(handLow(Wf, 'r'))], heel: [r1(heel(Wb, 'r')), r1(heel(Wf, 'r'))] });
C.finish(ex, rep, 'Hollow Rock');
if (handLow(Wb, 'r') < 0.5 || heel(Wf, 'r') < 1) { console.error('FAIL hollow-rock: hands or heels touch the mat at the rock extremes'); process.exitCode = 1; }
