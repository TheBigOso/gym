// Batch 6 family b6-13: supine hip raises (leg-hip raise, bent-knee hip raise, lying flat hip raise), bridge variants
// (hip abduction, cross-body mountain climber), kneeling hip thrust and a few standing leg exercises.
// Shared helpers:
//   - curler(base): pelvis curl (posterior tilt) about a locked upper back, as author-reverse-crunch.js does it: root
//     position and lumbar / lower-thoracic flexion are solved so the T6 joint keeps its place and orientation
//   - legsStraight / legsBent: both legs set by FK to a world angle (straight) or a thigh angle (bent knees)
//   - feetDown: bent legs lowered until the soles rest on the floor (feet flat, no contact needed)
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./core-a');

/* ---------- Supine pelvis curl about a fixed upper back ---------- */
function curler(base, { lumbarShare = 2 } = {}) {
  const W0 = L.fk(base), T6 = W0.spine_t6.p, T6F = Q.rot(W0.spine_t6.q, [0, 1, 0]), P0 = base.root.rot.pitch;
  const l5 = base.ch.spine_l5.flex, t12 = base.ch.spine_t12.flex;
  const cache = new Map();
  function curl(c) {
    const key = r1(c);
    if (cache.has(key)) return clone(cache.get(key));
    const p = clone(base); p.root.rot.pitch = r1(P0 + c);
    const s = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.spine_l5.flex', 'ch.spine_t12.flex'], [
      (W) => V.sub(W.spine_t6.p, T6).map((v) => v * 4),
      (W) => V.sub(Q.rot(W.spine_t6.q, [0, 1, 0]), T6F).map((v) => v * 40),
      (W, q) => [((q.ch.spine_l5.flex - l5) - lumbarShare * (q.ch.spine_t12.flex - t12)) * 0.05],
    ], { iters: 400 });
    for (const j of ['spine_l5', 'spine_t12']) s.pose.ch[j].flex = +s.pose.ch[j].flex.toFixed(2);
    s.pose.root.pos = s.pose.root.pos.map((v) => +v.toFixed(3));
    cache.set(key, s.pose);
    return clone(s.pose);
  }
  return { curl, T6, T6F, P0, upperBack: (W) => V.len(V.sub(W.spine_t6.p, T6)) };
}

/* ---------- Legs by FK ---------- */
// Both legs straight (knee `knee`) with the hip-to-ankle line `deg` from the floor (90 = vertical, > 90 = over the face)
function legsStraight(p, deg, { knee = 4, dorsi = -12, abd = -2 } = {}) {
  const q = clone(p);
  q.ch.knee_r = { flex: knee }; q.ch.ankle_r = { dorsi };
  let lo = -20, hi = 140;
  for (let i = 0; i < 50; i++) { const h = (lo + hi) / 2; q.ch.hip_r = { flex: h, abd, rot: 0 }; if (C.legFromFloor(L.fk(q)) < deg) lo = h; else hi = h; }
  q.ch.hip_r = { flex: r1((lo + hi) / 2), abd, rot: 0 };
  return C.mirrorLeg(q);
}
// Both legs bent: thigh `thigh` degrees from the floor (90 = vertical), knee `knee`, ankle `dorsi`
function legsBent(p, thigh, knee, { dorsi = -15, abd = -2 } = {}) {
  const q = clone(p);
  q.ch.knee_r = { flex: knee }; q.ch.ankle_r = { dorsi };
  let lo = -20, hi = 140;
  for (let i = 0; i < 50; i++) { const h = (lo + hi) / 2; q.ch.hip_r = { flex: h, abd, rot: 0 }; if (C.thighFromFloor(L.fk(q)) < thigh) lo = h; else hi = h; }
  q.ch.hip_r = { flex: r1((lo + hi) / 2), abd, rot: 0 };
  return C.mirrorLeg(q);
}
// Feet resting flat on the floor with knees bent `knee`: hip flexion and ankle so the sole is level and `clr` cm up
const footSole = (W, s = 'r') => { const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === `foot_${s}`)); return g; };
function feetDown(p, knee, { clr = 0.15, abd = -2 } = {}) {
  let q = clone(p);
  q.ch.knee_r = { flex: knee }; q.ch.hip_r = { flex: 40, abd, rot: 0 }; q.ch.ankle_r = { dorsi: -20 };
  q = L.solvePose(q, ['ch.hip_r.flex', 'ch.ankle_r.dorsi'], [
    (W) => [(C.bottomOf(W, 'foot_r') - clr) * 3, footSole(W).axes[0][1] / V.len(footSole(W).axes[0]) * 20],
  ], { iters: 300 }).pose;
  q.ch.hip_r.flex = r1(q.ch.hip_r.flex); q.ch.ankle_r.dorsi = r1(q.ch.ankle_r.dorsi);
  return C.mirrorLeg(q);
}


/* ---------- Glute bridge base (from author-glute-bridge.js) ---------- */
// Supine, feet flat hip width (planted), arms on the floor by the sides (planted). bridge().poseAt(f): f = 0 lying,
// 1 = top (knee-hip-shoulder line straight, knees about 90 degrees). The upper back stays on the mat, the head rests.
const H = require('./hips');
function bridge({ zFoot = 10 } = {}) {
  const UB = (W) => Math.min(H.bottomOf(W, 'chest'), H.bottomOf(W, 'traps_r'), H.bottomOf(W, 'traps_l'));
  const lie = H.lieBase();
  const W0 = L.fk(lie), SX = W0.shoulder_r.p[0], P0 = lie.root.rot.pitch, L5 = lie.ch.spine_l5.flex;
  function trunk(dP, l5, rot = 0) {
    const p = clone(lie); p.root.rot.pitch = r1(P0 + dP); p.ch.spine_l5.flex = r1(l5);
    if (rot) { p.ch.spine_t12.rot = r1(rot * 0.45); p.ch.spine_t6.rot = r1(rot * 0.55); }
    return L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.neck_c7.flex', 'ch.head_c1.flex'], [
      (W) => [(UB(W) - 0.2) * 2, Math.min(0, H.bottomOf(W, 'neck') - 0.5) * 6, Math.min(0, UB(W)) * 6, Math.min(0, H.bottomOf(W, 'buttock_r') - 0.1) * 4, Math.min(0, H.bottomOf(W, 'hair') - 0.3) * 6, Math.min(0, H.bottomOf(W, 'thigh_r') - 0.05) * 8, (W.shoulder_r.p[0] - SX) * 2],
      (W, q) => [(q.ch.head_c1.flex - q.ch.neck_c7.flex * 0.5) * 0.3, (q.ch.neck_c7.flex - (-22 + dP * 0.6)) * 0.1, Math.max(0, q.ch.neck_c7.flex - 39) * 3, Math.max(0, q.ch.head_c1.flex - 29) * 3, Math.max(0, -27 - q.ch.neck_c7.flex) * 3, Math.max(0, -27 - q.ch.head_c1.flex) * 3]], { iters: 400 }).pose;
  }
  const l5At = (f) => L5 + (0 - L5) * f;
  const sagBelow = (W) => { const a = W.shoulder_r.p, k = W.knee_r.p, h = W.hip_r.p, d = V.norm([k[0] - a[0], k[1] - a[1], 0]); return -((h[0] - a[0]) * -d[1] + (h[1] - a[1]) * d[0]); };
  const contacts = [H.legC('r', { pole: [0.15, 1, 0.04] }), H.legC('l', { pole: [0.15, 1, -0.04] }), H.handC('r', [0, 0.5, 1]), H.handC('l', [0, 0.5, -1])];
  const legOnly = contacts.slice(0, 2);
  const withFeet = (p, ax) => { const q = clone(p); q.ik = { leg_r: { target: [ax, L.ANKLE_H, zFoot], weight: 1 }, leg_l: { target: [ax, L.ANKLE_H, -zFoot], weight: 1 } }; return q; };
  function topFor(ax) {
    let lo = 5, hi = 70;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, W = L.fk(withFeet(trunk(m, l5At(1)), ax), legOnly); if (sagBelow(W) > 0) lo = m; else hi = m; }
    return r1((lo + hi) / 2);
  }
  let a = 30, b = 60, AX = 45, DP_TOP = 0;
  for (let i = 0; i < 25; i++) { AX = (a + b) / 2; DP_TOP = topFor(AX); const W = L.fk(withFeet(trunk(DP_TOP, l5At(1)), AX), legOnly); if (H.kneeOf(W, 'r') > 90) a = AX; else b = AX; }
  AX = r1(AX); DP_TOP = topFor(AX);
  const HAND = { r: [r1(W0.hip_r.p[0] + 4), 2.7, 24], l: [r1(W0.hip_r.p[0] + 4), 2.7, -24] };
  const ARM_GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 30, elev: 15, axial: 0 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 80, flex: 0, dev: 0 } }, { [`shoulder_${s}`]: { plane: -20, elev: 20, axial: 60 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: 0, dev: 0 } }];
  // f: roll fraction; rot: upper-trunk rotation (deg, + = toward the right side... sign as the rig spine rot)
  function poseAt(f, { rot = 0, arms = ['r', 'l'], legs = ['r', 'l'] } = {}) {
    let p = withFeet(trunk(DP_TOP * f, l5At(f), rot), AX);
    p.ch.sc_r = { protract: 0, elevate: 0 }; p.ch.sc_l = { protract: 0, elevate: 0 };
    for (const s of legs) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target);
    for (const s of arms) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], ARM_GUESS(s)); delete p.__cost; }
    p.ik.arm_r = { target: HAND.r.slice(), weight: 1 }; p.ik.arm_l = { target: HAND.l.slice(), weight: 1 };
    return p;
  }
  return { lie, trunk, l5At, contacts, AX, DP_TOP, HAND, poseAt, W0, sagBelow, UB, zFoot };
}

/* ---------- Lowest point of any rig shape (capsule or ellipsoid) ---------- */
function lowPt(W, id) {
  const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === id));
  if (g.kind === 'capsule') { const a = [g.a[0], g.a[1] - g.r[0], g.a[2]], b = [g.b[0], g.b[1] - g.r[1], g.b[2]]; return a[1] < b[1] ? a : b; }
  return H.lowPoint(W, id);
}

/* ---------- Keyframes ---------- */
const kf = (list) => list.map(([t, pose]) => ({ t, pose }));

module.exports = { curler, legsStraight, legsBent, feetDown, kf, bridge, lowPt };
