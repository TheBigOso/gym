// Batch 6 family b6-07: helpers shared by the b6-07 authors (dumbbell iron cross, wood chop, swings, lateral walk,
// low windmill, alternate V-up, hands torsion; cable zercher squat, incline pushdown, half-kneeling Pallof press,
// crossover reverse fly). Builds on the existing families without changing them.
//   - standAt(knee, opt): b3-shoulders standing base (feet planted on the same targets) lowered to a knee angle, with an
//     optional forward lean
//   - armDirKey(base, spec, guess): right arm pointing along a world direction from the shoulder (soft elbow), palm
//     direction given; solved with b3-shoulders solveArm (one continuous branch through `guess`)
//   - keyChain(list): solve a list of keys in order, threading the arm guess; mirror for bilateral moves
//   - timesEven(t0, t1, names): evenly spaced keyframes
const L = require('../lib');
const { R, V, Q, r1, clone } = L;
const H = require('./hips');
const F = require('./b3-shoulders');

const D2R = Math.PI / 180;
// direction from plane / elevation (right side, ISB-style): plane 0 = out to the side (+Z), 90 = forward (+X); elev 0 = down
const dirOf = (plane, elev) => { const e = elev * D2R, p = plane * D2R; return [Math.sin(e) * Math.sin(p), -Math.cos(e), Math.sin(e) * Math.cos(p)]; };

// Standing base (feet planted at [0, ANKLE_H, +-stance]) lowered until the knees bend `knee` degrees; lean (deg, +
// forward) pitches the pelvis; spine flex spread over the three spine joints.
function standAt(knee, { stance = 12, toe = 8, lean = 0, spineFlex = 0, sc = { protract: 2, elevate: 0 } } = {}) {
  const st = F.standing({ stance, toe, knee: Math.max(knee, 0.5), lean });
  const p = st.pose;
  if (spineFlex) for (const [j, k] of [['spine_l5', 0.3], ['spine_t12', 0.35], ['spine_t6', 0.35]]) p.ch[j] = { rot: 0, latFlex: 0, flex: r1(spineFlex * k) };
  if (lean || spineFlex) { // re-lower for the knee angle after the pitch changed the hip height
    let a = p.root.pos[1] - 25, b = p.root.pos[1] + 10;
    for (let i = 0; i < 50; i++) { const y = (a + b) / 2, q = clone(p); q.root.pos[1] = y; if (H.kneeOf(L.fk(q, st.contacts), 'r') > knee) a = y; else b = y; }
    p.root.pos[1] = r1((a + b) / 2);
  }
  p.ch.sc_r = clone(sc); p.ch.sc_l = clone(sc);
  return { pose: F.plantLegs(p, st.contacts), contacts: st.contacts };
}
// Right arm along world direction `dir` from the shoulder with the elbow bent `flex` degrees (elbow slightly below the
// straight line), palm along `palm`. Returns the solved pose (F.solveArm).
function armDirKey(pose, { dir, flex = 10, palm, elbowDrop = 1.5, wPalm = 4 }, guess) {
  const S = L.fk(pose).shoulder_r.p, d = V.norm(dir);
  const wrist = V.add(S, V.scale(d, L.reach(flex)));
  const elbow = V.add(V.add(S, V.scale(d, L.UA)), [0, -elbowDrop, 0]);
  return F.solveArm(pose, { wrist, elbow, palm, wPalm, guess });
}
// Even keyframe times
const timesEven = (t0, t1, names) => names.map((n, i) => ({ t: +(t0 + ((t1 - t0) * i) / Math.max(1, names.length - 1)).toFixed(3), pose: n }));
const deg = (v) => `≈${Math.round(v)}°`;
const elbowAng = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));
const humElev = (W, s = 'r') => V.angle(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p), V.sub(W.pelvis.p, W.neck_c7.p));

module.exports = { dirOf, standAt, armDirKey, timesEven, deg, elbowAng, humElev, D2R };

/* ---------------- stacked fists on one upright dumbbell (as the dumbbell halo) ---------------- */
// The dumbbell is attached to the right hand with an offset along the thumb axis (attach.offset [7.2, 2.2, -4.2], as in
// dumbbell-halo); the right fist holds the lower half of the handle and the left fist is stacked above it. fist() solves
// one arm so its grip point (wrist frame [2.2, -7.2, 0]) sits on `gp` with the thumb along `up` and the elbow drawn
// softly toward `E`; the left arm is solved as the mirror image of a right-arm problem.
const GRIP_PT = [2.2, -7.2, 0];
const mz = (v) => [v[0], v[1], -v[2]];
const ARMP = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
const armLim = (q) => { const w = q.ch.wrist_r, e = q.ch.elbow_r.flex, sh = q.ch.shoulder_r; return [Math.min(0, sh.elev - 2) * 3, Math.min(0, w.flex + 75) * 3, Math.max(0, w.flex - 65) * 3, Math.min(0, w.dev + 16) * 3, Math.max(0, w.dev - 30) * 3, Math.max(0, e - 145) * 3, Math.min(0, e - 3) * 3, Math.min(0, sh.plane + 55) * 3, Math.max(0, sh.plane - 135) * 3, Math.min(0, w.pron + 12) * 3, Math.max(0, w.pron - 172) * 3]; };
const nearA = (v, ref) => v + 360 * Math.round((ref - v) / 360);
const gOf = (q, s) => ({ plane: q.ch[`shoulder_${s}`].plane, elev: q.ch[`shoulder_${s}`].elev, axial: q.ch[`shoulder_${s}`].axial, flex: q.ch[`elbow_${s}`].flex, pron: q.ch[`wrist_${s}`].pron, wf: q.ch[`wrist_${s}`].flex, wd: q.ch[`wrist_${s}`].dev });
function fist(p, gp, up, E, guess, side, { wE = 0.25, contacts = null, wWrist = 0.01, wUp = 1.5 } = {}) {
  const m = clone(p); if (side === 'l') m.ch.sc_r = clone(p.ch.sc_l);
  const M = side === 'l' ? mz : (v) => v;
  const objs = [(W) => V.sub(V.add(W.wrist_r.p, Q.rot(W.wrist_r.q, GRIP_PT)), M(gp)).map((v) => v * 3), (W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), M(up)).map((v) => v * wUp),
    L.obj.at('elbow_r', M(E), wE), (W, q) => armLim(q), L.obj.reg('ch.wrist_r.flex', 0, wWrist), L.obj.reg('ch.wrist_r.dev', 0, wWrist)];
  let best = null;
  for (const g of [guess, { ...guess, axial: guess.axial + 40 }, { ...guess, axial: guess.axial - 40 }, { ...guess, pron: guess.pron + 50 }, { ...guess, pron: guess.pron - 50 }]) {
    const q0 = clone(m); q0.ch.shoulder_r = { plane: g.plane, elev: g.elev, axial: g.axial }; q0.ch.elbow_r = { flex: g.flex }; q0.ch.wrist_r = { pron: g.pron, flex: g.wf ?? 0, dev: g.wd ?? 0 };
    const r = L.solvePose(q0, ARMP, objs, { iters: 400, contacts });
    const d = Math.abs(r.pose.ch.shoulder_r.axial - guess.axial) + Math.abs(r.pose.ch.wrist_r.pron - guess.pron);
    const sc = r.cost + d * 0.002;
    if (!best || sc < best.sc) best = { ...r, sc };
  }
  const q = best.pose, sh = q.ch.shoulder_r;
  sh.plane = r1(nearA(sh.plane, guess.plane)); sh.axial = r1(nearA(sh.axial, guess.axial)); q.ch.wrist_r.pron = r1(nearA(q.ch.wrist_r.pron, guess.pron));
  for (const c of ['elev']) sh[c] = r1(sh[c]);
  const out = clone(p);
  for (const j of ['shoulder', 'elbow', 'wrist']) out.ch[`${j}_${side}`] = clone(q.ch[`${j}_r`]);
  return { q: out, cost: +best.cost.toFixed(3) };
}
const STACK_PROP = (size = [26, 10, 10]) => ({ id: 'dbR', kind: 'dumbbell', size, attach: { joint: 'wrist_r', grip: 'handle', offset: [7.2, 2.2, -4.2] } });
Object.assign(module.exports, { fist, gOf, mz, STACK_PROP, GRIP_PT, nearA });

/* ---------------- rotating standing base (wood chop) ---------------- */
// Feet planted at [0, ANKLE_H, +-stance]; the pelvis turns (root yaw) and hinges (root pitch), the spine turns `rot`
// and side-bends `lat` (spread over L5 / T12 / T6), the pelvis drops until the right or left knee bends `knee`.
function turnStand({ stance = 18, toe = 10, knee = 8, kneeSide = 'r', yaw = 0, pitch = 0, rot = 0, lat = 0, flex = 0, shiftZ = 0, sc = { protract: 4, elevate: 4 } } = {}) {
  const st = F.standing({ stance, toe, knee: 4 });
  const p = clone(st.pose);
  p.root.rot = { yaw, pitch, roll: 0 };
  p.root.pos[2] = shiftZ;
  for (const [j, k, kr] of [['spine_l5', 0.25, 0.1], ['spine_t12', 0.35, 0.45], ['spine_t6', 0.4, 0.45]]) p.ch[j] = { rot: r1(rot * kr), latFlex: r1(lat * k), flex: r1(flex * k) };
  let a = p.root.pos[1] - 30, b = p.root.pos[1] + 6;
  const kn = (W) => (kneeSide === 'min' ? Math.min(H.kneeOf(W, 'r'), H.kneeOf(W, 'l')) : H.kneeOf(W, kneeSide));
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2, q = clone(p); q.root.pos[1] = y; if (kn(L.fk(q, st.contacts)) > knee) a = y; else b = y; }
  p.root.pos[1] = r1((a + b) / 2);
  p.ch.sc_r = clone(sc); p.ch.sc_l = clone(sc);
  return { pose: F.plantLegs(p, st.contacts), contacts: st.contacts };
}
Object.assign(module.exports, { turnStand });

/* ---------------- arm on a grip target with branch control ---------------- */
// b5-bandcore armSide (C.armR on the grip point, the left arm solved on the mirrored pose) from the previous key's
// channels; if that lands outside the rig's shoulder ranges or misses (cost > maxCost), a few fixed seeds are tried and
// the in-range solution nearest the previous key wins. prev / seeds: { plane, elev, axial, pron, flex }.
function bestArm(pose, contacts, side, spec, prev, seeds = [], { maxCost = 0.3, wJump = 0.01 } = {}) {
  const B5 = require('./b5-bandcore');
  let best = null;
  const tryG = (g) => {
    const q = B5.armSide(pose, contacts, side, { ...spec, guess: g }), e = q.__err;
    const ch = q.ch[`shoulder_${side}`], ok = ch.plane >= -60 && ch.plane <= 140 && ch.elev >= 0 && ch.elev <= 210;
    const jumpD = Math.abs(ch.plane - prev.plane) + Math.abs(ch.elev - prev.elev) + Math.abs(ch.axial - prev.axial) + Math.abs(q.ch[`wrist_${side}`].pron - prev.pron);
    const sc = e.cost + (ok ? 0 : 50) + wJump * jumpD;
    if (!best || sc < best.sc) best = { q, sc, cost: e.cost, ok };
  };
  tryG(prev);
  if (!best.ok || best.cost > maxCost) for (const g of seeds) tryG(g);
  return best.q;
}
const armGuessOf = (q, s) => ({ plane: q.ch[`shoulder_${s}`].plane, elev: q.ch[`shoulder_${s}`].elev, axial: q.ch[`shoulder_${s}`].axial, pron: q.ch[`wrist_${s}`].pron, flex: q.ch[`elbow_${s}`].flex });
Object.assign(module.exports, { bestArm, armGuessOf });

/* ---------------- Zercher hold (cable bar in the elbow crooks) ---------------- */
// Hands clasped in front of the chest (right grip point at `at` from the right shoulder, axes of the spine_t6 frame; the
// left hand its mirror image), palms toward the face, elbows bent hard and forward-low (elbow target also from the
// shoulder in the t6 frame); both arms copied (exactly
// symmetric, so the clasped grip points keep a constant gap). Solved like b3-legs gobletArms.
function zercherArms(pose, { at = [24, -4, -17.4], elbow = [16, -17, -3], palm = [-0.45, 0.6, -0.66], protract = 10, elevate = 4, wPalm = 3, wWrist = 0.03 } = {}) {
  const EQ = require('./equip');
  let p = clone(pose);
  p.ch.sc_r = { protract, elevate }; p.ch.sc_l = clone(p.ch.sc_r);
  const W0 = L.fk(p), T = W0.spine_t6, S = W0.shoulder_r.p, target = V.add(S, Q.rot(T.q, at)), elbowTgt = V.add(S, Q.rot(T.q, elbow)), pl = V.norm(Q.rot(T.q, palm));
  const set = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; q.ch.elbow_r = { flex: x[3] }; q.ch.wrist_r = { pron: x[4], flex: x[5], dev: x[6] }; return q; };
  const res = (x) => {
    const W = L.fk(set(x));
    return [...V.sub(EQ.gripPoint(W, 'r').p, target).map((v) => v * 3), ...V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), pl).map((v) => v * wPalm),
      ...V.sub(W.elbow_r.p, elbowTgt).map((v) => v * 0.8), x[5] * wWrist, x[6] * wWrist,
      Math.max(0, x[3] - 148) * 5, Math.max(0, x[5] - 68) * 5, Math.max(0, -78 - x[5]) * 5, Math.max(0, x[6] - 30) * 5, Math.max(0, -16 - x[6]) * 5, Math.max(0, x[0] - 138) * 5, Math.max(0, -58 - x[0]) * 5];
  };
  let best = null;
  for (const g of [[70, 40, 0, 130, 90, 0, 0], [80, 30, 40, 140, 40, 0, 0], [50, 50, -40, 130, 120, 0, 0], [70, 35, 20, 135, 70, -20, 0]]) {
    const s = R.solveLM(g, res, { iters: 500 }); if (!best || s.cost < best.cost) best = s;
  }
  const x = best.x.map(r1); x[0] = r1(L.wrap(x[0])); x[2] = r1(L.wrap(x[2])); x[4] = r1(L.wrap(x[4]));
  p = set(x);
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); });
  p.__armCost = best.cost;
  return p;
}
Object.assign(module.exports, { zercherArms });
