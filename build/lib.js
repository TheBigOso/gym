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
