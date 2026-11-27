// Batch 4 calves, glutes and hips family: seated / donkey / single-leg calf raises, frog hip thrust, all-fours glute work
// (donkey kick, fire hydrant, kneeling leg half circle), side plank clamshell and the standing leg curl.
// Shared helpers:
//   - allFours(): the bird dog's hands-and-knees base (hands planted palm down, shins and insteps on the mat), with the
//     athlete-fit values the bird dog measured on the skinned mesh; a lifted leg is FK (contact weight 0)
//   - ballPivot(): heel raise about a fixed point under the ball of the foot (same construction as the standing calf raise)
//   - legDir(): FK hip channels that aim a (straight or bent) leg in a world direction, within the rig limits
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const P = require('./prone');
const H = require('./hips');

const r3 = (v) => Math.round(v * 1000) / 1000;
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });

/* ---------- All fours (from author-bird-dog.js) ---------- */
function allFours({ KNEE_Y = 5.0, ELBOW = 35, HAND_BACK = 6, WRIST_Y = 4.0, TILT = 15, headFlex = -8 } = {}) {
  const TH = V.len(rig.byId.knee_r.offset);
  const base = { root: { pos: [0, r3(KNEE_Y + TH), 0], rot: { pitch: -86 } }, ch: {
    spine_l5: { ...z0(), flex: 2 }, spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 },
    sc_r: { protract: 6, elevate: 2 }, sc_l: { protract: 6, elevate: 2 },
    hip_r: { flex: 86, abd: 0, rot: 0 }, hip_l: { flex: 86, abd: 0, rot: 0 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, ankle_r: { dorsi: -70 }, ankle_l: { dorsi: -70 } } };
  P.head(base, headFlex);
  const ARM = L.reach(ELBOW);
  const pitchFit = L.solvePose(base, ['root.rot.pitch'], [(W) => [(W.shoulder_r.p[1] - WRIST_Y - Math.sqrt(ARM * ARM - HAND_BACK * HAND_BACK)) * 2]]).pose;
  pitchFit.ch.hip_r.flex = pitchFit.ch.hip_l.flex = r3(-pitchFit.root.rot.pitch);
  const W0 = L.fk(pitchFit);
  const footQ = (s) => P.qArr(W0[`ankle_${s}`].q);
  const handQ = (s) => { const q = Q.mul(Q.axis([1, 0, 0], TILT), L.handRotR); return P.qArr(s === 'r' ? q : Q.mirrorZ(q)); };
  const contacts = [
    Object.assign(L.handContact('r'), { pole: [-1, 0.1, 0.25], handRot: handQ('r') }), Object.assign(L.handContact('l'), { pole: [-1, 0.1, -0.25], handRot: handQ('l') }),
    Object.assign(L.legContact('r'), { label: 'Right shin', pole: [0.4, -1, 0.05], handRot: footQ('r') }),
    Object.assign(L.legContact('l'), { label: 'Left shin', pole: [0.4, -1, -0.05], handRot: footQ('l') }),
  ];
  const HT = {}, AT = {};
  for (const s of ['r', 'l']) { const S = W0[`shoulder_${s}`].p; HT[s] = [r3(S[0] - HAND_BACK), WRIST_Y, r3(S[2])]; AT[s] = W0[`ankle_${s}`].p.map(r3); }
  pitchFit.ik = { arm_r: { target: HT.r, weight: 1 }, arm_l: { target: HT.l, weight: 1 }, leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } };
  const fours = P.fitAll(pitchFit, contacts);
  return { fours, contacts, HT, AT, Wf: L.fk(fours, contacts) };
}

/* ---------- Heel raise about the ball of the foot (from author-standing-calf-raise.js) ---------- */
const footShape = rig.shapes.find((x) => x.id === 'foot_r');
const BALL_LX = 14, solY = (lx) => footShape.c[1] - footShape.r[1] * Math.sqrt(1 - ((lx - footShape.c[0]) / footShape.r[0]) ** 2);
const B_LOCAL = [BALL_LX, solY(BALL_LX), 0]; // ankle-local (foot frame) point on the sole under the ball of the foot
// ankle0: flat-foot ankle position; yaw: foot yaw (deg, right foot toes out = negative)
function ballPivot(ankle0, yaw) {
  const B = V.add(ankle0, Q.rot(H.footQ(0, yaw), B_LOCAL));
  const ankleFor = (pitch) => V.sub(B, Q.rot(H.footQ(pitch, yaw), B_LOCAL)).map((v) => +v.toFixed(3));
  const rotFor = (pitch) => H.qArr(H.footQ(pitch, yaw));
  const drift = (W, s) => V.len(V.sub(V.add(W[`ankle_${s}`].p, Q.rot(W[`ankle_${s}`].q, B_LOCAL)), B));
  const heelY = (W, s) => { const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === `foot_${s}`)); return V.add(g.c, V.scale(g.axes[0], -1))[1]; };
  return { B, ankleFor, rotFor, drift, heelY };
}
const easeIO = (f) => f * f * (3 - 2 * f);
const invEase = (y) => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (easeIO(m) < y) a = m; else b = m; } return (a + b) / 2; };
// Keyframes for a calf raise: pitch keys p0..pN rising over RISE (eased), a top hold pose, lowering over LOWER.
function raiseKeys(N, { start = 0.8, rise = [0.8, 1.8], hold = null, lower = [2.6, 4.4], end = 5.0, holdPose = 'top2' } = {}) {
  const tAt = (span, f) => +(span[0] + (span[1] - span[0]) * f).toFixed(3);
  const k = [{ t: 0, pose: 'p0' }, { t: start, pose: 'p0' }];
  for (let i = 1; i <= N; i++) k.push({ t: tAt(rise, invEase(i / N)), pose: `p${i}` });
  if (holdPose) k.push({ t: hold ?? +((rise[1] + lower[0]) / 2).toFixed(3), pose: holdPose });
  k.push({ t: lower[0], pose: `p${N}` });
  for (let i = N - 1; i >= 0; i--) k.push({ t: tAt(lower, invEase(1 - i / N)), pose: `p${i}` });
  k.push({ t: end, pose: 'p0' });
  return k;
}

/* ---------- Lifted leg aimed by FK channels ---------- */
// Solve hip flex/abd/rot (and optionally knee) so the knee sits at kneeTgt (world) and the ankle at ankleTgt; limits respected.
function legTo(pose, s, { knee, ankle, kneeFlex, rotRef = 0, wRot = 0.02, iters = 400 } = {}) {
  const paths = [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`].concat(kneeFlex == null ? [`ch.knee_${s}.flex`] : []);
  const q0 = clone(pose); q0.ch[`hip_${s}`] = Object.assign({ flex: 0, abd: 0, rot: 0 }, q0.ch[`hip_${s}`]); if (kneeFlex != null) q0.ch[`knee_${s}`] = { flex: kneeFlex };
  const lim = (j, c, v) => { const l = rig.byId[j].limits[c]; return (Math.max(0, l[0] + 0.5 - v) + Math.max(0, v - l[1] + 0.5)) * 20; };
  const objs = [(W) => (knee ? V.sub(W[`knee_${s}`].p, knee).map((v) => v * 3) : []), (W) => (ankle ? V.sub(W[`ankle_${s}`].p, ankle).map((v) => v * 3) : []),
    (W, q) => [lim(`hip_${s}`, 'flex', q.ch[`hip_${s}`].flex), lim(`hip_${s}`, 'abd', q.ch[`hip_${s}`].abd), lim(`hip_${s}`, 'rot', q.ch[`hip_${s}`].rot), lim(`knee_${s}`, 'flex', q.ch[`knee_${s}`].flex), (q.ch[`hip_${s}`].rot - rotRef) * wRot]];
  let best = null;
  const h0 = q0.ch[`hip_${s}`];
  for (const g of [[h0.flex, h0.abd, h0.rot], [h0.flex, 20, 0], [h0.flex, 40, -20], [0, 20, 20], [60, 30, 0]]) {
    const q = clone(q0); q.ch[`hip_${s}`] = { flex: g[0], abd: g[1], rot: g[2] };
    const r = L.solvePose(q, paths, objs, { iters });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  best.pose.__cost = best.cost;
  return best.pose;
}
module.exports = { allFours, ballPivot, B_LOCAL, easeIO, invEase, raiseKeys, legTo, r3 };

/* ---------- Held dumbbell placed by its centre and axis (right arm solve, mirrored to the left) ---------- */
const D = require('./dumbbell');
const handPalmW = (W, s) => Q.rot(W[`wrist_${s}`].q, [1, 0, 0]);
// opt: { center (world), axis (world unit, thumb side), palm (world unit), elbow (world point, soft), guess [7] }
function holdDumbbell(pose, opt) {
  const p = clone(pose);
  const set = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; q.ch.elbow_r = { flex: x[3] }; q.ch.wrist_r = { pron: x[4], flex: x[5], dev: x[6] }; return q; };
  const lim = (j, c, v, m = 1) => { const l = rig.byId[j].limits[c]; return (Math.max(0, l[0] + m - v) + Math.max(0, v - l[1] + m)) * 10; };
  const res = (x) => {
    const W = L.fk(set(x)), d = D.dumbbellAt(W, 'r', 'handle');
    return [...V.sub(d.c, opt.center).map((v) => v * 3), ...V.sub(d.ax, opt.axis).map((v) => v * 10), ...(opt.palm ? V.sub(handPalmW(W, 'r'), opt.palm).map((v) => v * 3) : []),
      ...(opt.elbow ? V.sub(W.elbow_r.p, opt.elbow).map((v) => v * (opt.wElbow ?? 0.3)) : []), x[5] * 0.03, x[6] * 0.03, x[2] * 0.003,
      lim('shoulder_r', 'plane', x[0]), lim('shoulder_r', 'elev', x[1]), lim('elbow_r', 'flex', x[3]), lim('wrist_r', 'flex', x[5], 3), lim('wrist_r', 'dev', x[6], 3)];
  };
  let best = null;
  for (const g of [opt.guess || [40, 30, 0, 90, 90, 0, 0], [20, 20, -30, 100, 60, 0, 0], [60, 40, 30, 80, 120, 0, 0], [30, 25, 0, 95, 0, 0, 0], [30, 25, 60, 95, 170, 0, 0]]) {
    const s = R.solveLM(g, res, { iters: 500 }); if (!best || s.cost < best.cost) best = s;
  }
  const x = best.x.map(r1); x[0] = r1(L.wrap(x[0])); x[2] = r1(L.wrap(x[2])); x[4] = r1(L.wrap(x[4]));
  const q = set(x);
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]); });
  q.__cost = best.cost; q.__x = x;
  return q;
}
// Height of a body surface above a world point: first point going down from `from` where any listed rig shape is reached
const B3 = require('./b3-legs');
function surfaceBelow(W, from, ids) {
  const shapes = rig.shapes.filter((s) => ids.includes(s.id));
  const dist = (p) => Math.min(...shapes.map((s) => B3.shapeDist(W, s, p)));
  let a = 0, b = 40; // cm down from `from`
  if (dist(from) < 0) return from[1];
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (dist([from[0], from[1] - m, from[2]]) > 0) a = m; else b = m; }
  return from[1] - (a + b) / 2;
}
Object.assign(module.exports, { holdDumbbell, surfaceBelow, handPalmW });
// Wrap every stored channel angle into [-180, 180] (fits can land on an equivalent branch 360 degrees away)
function wrapAll(poses) { for (const p of Object.values(poses)) for (const j of Object.values(p.ch)) for (const c of Object.keys(j)) if (Math.abs(j[c]) > 180) j[c] = r1(L.wrap(j[c])); return poses; }
Object.assign(module.exports, { wrapAll });
