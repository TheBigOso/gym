// Shared authoring helpers: rig loading, FK, constrained solves, checks.
const fs = require('fs');
const path = require('path');
require('../src/engine.js');
const R = globalThis.RepRig;
const { V, Q } = R;
const rigDef = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/rig.json'), 'utf8'));
const rig = R.buildRig(rigDef);
const len = (j) => V.len(rig.byId[j].offset);
const UA = len('elbow_r'), FA = len('wrist_r');
const reach = (flex) => Math.sqrt(UA * UA + FA * FA + 2 * UA * FA * Math.cos(flex * R.DEG));
const flexFor = (d) => Math.acos(Math.max(-1, Math.min(1, (d * d - UA * UA - FA * FA) / (2 * UA * FA)))) / R.DEG;
const r1 = (v) => Math.round(v * 10) / 10;
const clone = (o) => JSON.parse(JSON.stringify(o));
const wrap = (a) => ((a + 540) % 360) - 180;
const handRotL = Q.fromBasis([0, -1, 0], [-1, 0, 0], [0, 0, -1]); // palm down, fingers toward the head
const handRotR = Q.mirrorZ(handRotL);
const fk = (pose, contacts) => R.evalPose(rig, pose, contacts || null);

// Keep the planted support shoulder (left) at SL0 while the trunk rotates by theta (deg, + toward right).
function solveSpine(pose, theta, SL0, split) {
  const set = (x) => {
    const p = clone(pose);
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => {
      const b = pose.ch[j] || {};
      p.ch[j] = { rot: theta * split[j], latFlex: x[i * 2], flex: (b.flex || 0) + x[i * 2 + 1] };
    });
    p.ch.sc_l = { protract: x[6], elevate: x[7] };
    return p;
  };
  const p0 = pose.ch.sc_l || { protract: 5, elevate: 0 };
  const res = (x) => {
    const e = V.sub(fk(set(x)).shoulder_l.p, SL0);
    return [e[0] * 4, e[1] * 4, e[2] * 4, x[0] * 0.14, x[1] * 0.1, x[2] * 0.12, x[3] * 0.1, x[4] * 0.12, x[5] * 0.1, (x[6] - p0.protract) * 0.045, (x[7] - p0.elevate) * 0.06];
  };
  const sol = R.solveLM([0, 0, 0, 0, 0, 0, p0.protract, p0.elevate], res, { iters: 200 });
  const p = set(sol.x.map(r1));
  return { pose: p, err: V.len(V.sub(fk(p).shoulder_l.p, SL0)) };
}

// Planted right hand at target with world-locked palm-down orientation; returns pose + wrist channels.
function plantRight(pose, tR, pole) {
  const p = clone(pose);
  const Wi = R.evalPose(rig, Object.assign(clone(p), { ik: { arm_r: { target: tR, weight: 1 } } }), [{ id: 'arm_r', chain: ['shoulder_r', 'elbow_r', 'wrist_r', 'handtip_r'], pole: pole || [-1, 0.1, 0.35], handRot: handRotR }]);
  const Eg = Wi.elbow_r.p, Wg = Wi.wrist_r.p;
  const setA = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; q.ch.elbow_r = { flex: x[3] }; return q; };
  const resA = (x) => { const W = fk(setA(x)); return [...V.sub(W.elbow_r.p, Eg), ...V.sub(W.wrist_r.p, Wg)].map((v) => v * 3).concat([x[2] * 0.02]); };
  const a = R.solveLM([88, 76, 0, 10], resA, { iters: 300 }).x.map(r1);
  const pa = setA(a);
  const setB = (x) => { const q = clone(pa); q.ch.wrist_r = { pron: x[0], flex: x[1], dev: x[2] }; return q; };
  const resB = (x) => { const hq = fk(setB(x)).wrist_r.q; return [...V.sub(Q.rot(hq, [1, 0, 0]), Q.rot(handRotR, [1, 0, 0])), ...V.sub(Q.rot(hq, [0, 1, 0]), Q.rot(handRotR, [0, 1, 0]))].map((v) => v * 20).concat([(x[0] - 85) * 0.01]); };
  let best = null;
  for (const g of [[85, -80, 0], [60, -80, 0], [110, -80, 0], [170, -80, 0]]) { const s = R.solveLM(g, resB, { iters: 300 }); if (!best || s.cost < best.cost) best = s; }
  const w = best.x.map(wrap).map(r1);
  return { pose: setB(w), wrist: { pron: w[0], flex: w[1], dev: w[2] } };
}

// Right arm FK so the wrist reaches a target. Optional extra residuals (e.g. elbow placement).
function armToTarget(pose, target, opt) {
  opt = opt || {};
  const p = clone(pose);
  const S = fk(p).shoulder_r.p;
  const flex = r1(opt.flex != null ? opt.flex : flexFor(V.len(V.sub(target, S))));
  const tgt = opt.flex != null ? V.add(S, V.scale(V.norm(V.sub(target, S)), reach(flex))) : target;
  p.ch.elbow_r = { flex };
  if (opt.wrist) p.ch.wrist_r = opt.wrist;
  const set = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; return q; };
  const res = (x) => {
    const W = fk(set(x));
    const r = V.sub(W.wrist_r.p, tgt).map((v) => v * 3).concat([(x[2] - (opt.axial ?? 0)) * (opt.axialW ?? 0.02)]);
    if (opt.extra) r.push(...opt.extra(W));
    return r;
  };
  const g = opt.guess || [40, 90, 0];
  let x = R.solveLM(g, res, { iters: 400 }).x;
  // Keep one continuous ISB branch across keyframes (elevation may pass 180° near the overhead singularity);
  // unwrap plane/axial toward the guess so channel interpolation never takes the long way round.
  const near = (v, ref) => v + 360 * Math.round((ref - v) / 360);
  x = [near(x[0], g[0]), x[1], near(x[2], g[2])];
  return set(x.map(r1));
}

// Head/neck so the eyes point within `tol` deg of a target joint, capped to cervical comfort.
function gaze(pose, targetJoint, tol, pref, cap) {
  cap = cap || { rot: 55, ext: 20 };
  const apply = (q, x, round) => { const f = round ? r1 : (v) => v; q.ch.neck_c7 = { rot: f(x[0] * 0.4), flex: f(x[1] * 0.4) }; q.ch.head_c1 = { rot: f(x[0] * 0.6), flex: f(x[1] * 0.6) }; return q; };
  const res = (x) => {
    const W = fk(apply(clone(pose), x)), H = W.head_c1, eye = V.add(H.p, Q.rot(H.q, [11, 9, 0]));
    const err = V.angle(Q.rot(H.q, [1, 0, 0]), V.sub(W[targetJoint].p, eye));
    return [Math.max(0, err - tol), (x[0] - pref[0]) * 0.12, (x[1] - pref[1]) * 0.12, Math.max(0, Math.abs(x[0]) - cap.rot) * 4, Math.max(0, -x[1] - cap.ext) * 4];
  };
  const sol = R.solveLM(pref.slice(), res, { iters: 200 });
  return apply(clone(pose), sol.x, true);
}

function shapeMinY(W) {
  let m = { y: 1e9 };
  for (const s of rig.shapes) {
    const g = R.shapeWorld(W, s);
    const y = g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]);
    if (y < m.y) m = { y, id: s.id };
  }
  return m;
}
function timelineCheck(ex, SL0) {
  const tl = R.buildTimeline(ex);
  const out = { slide: 0, floor: 1e9, elbowL: [99, 0] };
  for (let i = 0; i <= 480; i++) {
    const t = (i / 480) * ex.timeline.duration, W = R.evalPose(rig, tl.pose(t), ex.contacts), m = R.measures(W);
    out.slide = Math.max(out.slide, V.len(V.sub(W.shoulder_l.p, SL0)));
    out.elbowL = [Math.min(out.elbowL[0], m.elbowL), Math.max(out.elbowL[1], m.elbowL)];
    const f = shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
  }
  out.slide = +out.slide.toFixed(3); out.floor = +out.floor.toFixed(2); out.elbowL = out.elbowL.map((v) => +v.toFixed(1));
  return out;
}
function write(ex) {
  const f = path.join(__dirname, `../src/exercises/${ex.exercise.id}.json`);
  fs.writeFileSync(f, JSON.stringify(ex, null, 2));
  return f;
}
module.exports = { R, V, Q, rig, rigDef, UA, FA, reach, flexFor, r1, clone, wrap, handRotL, handRotR, fk, solveSpine, plantRight, armToTarget, gaze, shapeMinY, timelineCheck, write };

/* ---------------- Generic constraint solver and starting poses (Batch 1 groundwork, issue #53) ---------------- */
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPathV(o, p, v) { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }
// Objective builders: each returns (W, pose) => residual[]
const obj = {
  at: (joint, target, w = 3) => (W) => V.sub(W[joint].p, target).map((v) => v * w),
  atY: (joint, y, w = 3) => (W) => [(W[joint].p[1] - y) * w],
  aim: (from, to, dir, w = 20) => (W) => V.sub(V.norm(V.sub(W[to].p, W[from].p)), V.norm(dir)).map((v) => v * w),
  floor: (w = 3, clearance = 0) => (W) => [Math.min(0, shapeMinY(W).y - clearance) * w],
  reg: (path, value, w = 0.05) => (W, pose) => [((getPath(pose, path) ?? 0) - value) * w],
};
// solvePose: vary the listed channel paths (e.g. 'ch.hip_r.flex', 'root.pos.1') to satisfy objectives.
function solvePose(pose, paths, objectives, opt = {}) {
  const set = (x) => { const q = clone(pose); paths.forEach((p, i) => setPathV(q, p, x[i])); return q; };
  const res = (x) => { const q = set(x), W = fk(q, opt.contacts); return objectives.flatMap((f) => f(W, q)); };
  const x0 = paths.map((p) => getPath(pose, p) ?? 0);
  const sol = R.solveLM(x0, res, { iters: opt.iters || 300 });
  return { pose: set(sol.x.map(r1)), cost: sol.cost };
}
// Shift the root vertically so the lowest body point sits on the floor (y = 0).
function groundPose(pose, contacts) { const p = clone(pose); p.root.pos[1] = r1(p.root.pos[1] - shapeMinY(fk(p, contacts)).y); return p; }
const footRot = (yawDeg = 0) => Q.axis([0, 1, 0], yawDeg); // world-locked flat foot, toes along +X turned by yaw
const legContact = (side, bend = 'forward') => ({ id: `leg_${side}`, label: `${side === 'r' ? 'Right' : 'Left'} foot`, chain: [`hip_${side}`, `knee_${side}`, `ankle_${side}`, `toe_${side}`], pole: [1, 0, side === 'r' ? 0.15 : -0.15], bend, handRot: footRot(0).map((v) => +v.toFixed(6)) });
const handContact = (side) => ({ id: `arm_${side}`, label: `${side === 'r' ? 'Right' : 'Left'} hand`, chain: [`shoulder_${side}`, `elbow_${side}`, `wrist_${side}`, `handtip_${side}`], pole: [-1, 0.1, side === 'r' ? 0.35 : -0.35], handRot: (side === 'l' ? handRotL : handRotR).map((v) => +v.toFixed(6)) });
const ANKLE_H = 6.8; // ankle joint height when the foot is flat (foot shape bottom)
const zero = () => ({ rot: 0, flex: 0, latFlex: 0 });
const POSES = {
  // Standing tall, feet under hips, arms at sides. Feet planted with leg IK targets.
  standing({ stance = rig.byId.hip_r.offset[2], toeOut = 8 } = {}) {
    const legLen = V.len(rig.byId.knee_r.offset) + V.len(rig.byId.ankle_r.offset);
    const p = { root: { pos: [0, r1(legLen + ANKLE_H), 0], rot: {} }, ch: { spine_l5: zero(), spine_t12: zero(), spine_t6: zero(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 }, sc_r: { protract: 0, elevate: 0 }, sc_l: { protract: 0, elevate: 0 }, shoulder_r: { plane: 0, elev: 6, axial: 0 }, shoulder_l: { plane: 0, elev: 6, axial: 0 }, elbow_r: { flex: 8 }, elbow_l: { flex: 8 }, ankle_r: { dorsi: 0 }, ankle_l: { dorsi: 0 }, hip_r: { flex: 0, abd: 0, rot: -toeOut }, hip_l: { flex: 0, abd: 0, rot: -toeOut } } };
    p.ik = { leg_r: { target: [0, ANKLE_H, r1(stance)], weight: 1 }, leg_l: { target: [0, ANKLE_H, r1(-stance)], weight: 1 } };
    return { pose: p, contacts: [legContact('r'), legContact('l')] };
  },
  // Lying on the back, head toward -X, knees bent, feet flat (pass kneeFlex 0 for straight legs).
  supine({ kneeFlex = 90 } = {}) {
    const hipFlex = kneeFlex ? kneeFlex / 2 + 10 : 0;
    const p = { root: { pos: [0, 12, 0], rot: { pitch: 90 } }, ch: { spine_l5: zero(), spine_t12: zero(), spine_t6: zero(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 }, hip_r: { flex: hipFlex }, hip_l: { flex: hipFlex }, knee_r: { flex: kneeFlex }, knee_l: { flex: kneeFlex }, ankle_r: { dorsi: kneeFlex ? -10 : 0 }, ankle_l: { dorsi: kneeFlex ? -10 : 0 }, shoulder_r: { plane: 0, elev: 10, axial: 0 }, shoulder_l: { plane: 0, elev: 10, axial: 0 } } };
    return { pose: groundPose(p), contacts: [] };
  },
  // High plank: hands under shoulders, body in one line, on the balls of the feet.
  plank() {
    const p = { root: { pos: [0, 60, 0], rot: { pitch: -78 } }, ch: { spine_l5: zero(), spine_t12: zero(), spine_t6: zero(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 }, hip_r: { flex: 0 }, hip_l: { flex: 0 }, knee_r: { flex: 0 }, knee_l: { flex: 0 }, ankle_r: { dorsi: 10 }, ankle_l: { dorsi: 10 }, shoulder_r: { plane: 90, elev: 78, axial: 0 }, shoulder_l: { plane: 90, elev: 78, axial: 0 }, sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 }, elbow_r: { flex: 5 }, elbow_l: { flex: 5 } } };
    // Solve root height + pitch so the toes and wrists touch the floor with arms vertical.
    const s = solvePose(p, ['root.pos.1', 'root.rot.pitch', 'shoulder_r.elev'.replace(/^/, 'ch.'), 'ch.shoulder_l.elev'], [obj.atY('toe_r', 1.5), obj.atY('toe_l', 1.5), obj.atY('wrist_r', 2.6), obj.atY('wrist_l', 2.6), (W) => [(W.wrist_r.p[0] - W.shoulder_r.p[0]) * 2, (W.wrist_l.p[0] - W.shoulder_l.p[0]) * 2]]);
    const W = fk(s.pose);
    s.pose.ik = { arm_r: { target: [r1(W.wrist_r.p[0]), 2.6, r1(W.wrist_r.p[2])], weight: 1 }, arm_l: { target: [r1(W.wrist_l.p[0]), 2.6, r1(W.wrist_l.p[2])], weight: 1 } };
    return { pose: s.pose, contacts: [handContact('r'), handContact('l')] };
  },
};
Object.assign(module.exports, { getPath, setPathV, obj, solvePose, groundPose, footRot, legContact, handContact, POSES, ANKLE_H });
