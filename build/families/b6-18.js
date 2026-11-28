// Batch 6 family b6-18: shared helpers for the forearm-plank variations (kneeling plank, plank with a leg lift, plank
// with an arm and leg lift, elbow-up-and-down plank), standing mobility drills (leg swings, scapula and forearm
// rotations) and a few floor core moves. Builds on prone.js (forearm contacts, fitted channels, sweep), core-a.js
// (supine base) and hips.js (module, kinematics setter, loop report).
const L = require('../lib');
const { R, V, Q, rig, clone } = L;
const P = require('./prone');

const r3 = (v) => Math.round(v * 1000) / 1000;
const ease = (u) => u * u * (3 - 2 * u);
const deg = (v) => `≈${Math.round(v)}°`;

// Precise solve (3 decimals): planted elbows stay put only if the shoulders stay exactly on their spheres.
function solve(pose, paths, objs, contacts, iters = 400) {
  const set = (x) => { const q = clone(pose); paths.forEach((p, i) => L.setPathV(q, p, x[i])); return q; };
  const res = (x) => { const q = set(x), W = L.fk(q, contacts); return objs.flatMap((f) => f(W, q)); };
  const sol = R.solveLM(paths.map((p) => L.getPath(pose, p) ?? 0), res, { iters });
  return { pose: set(sol.x.map(r3)), cost: sol.cost };
}

/* ---------- Forearm plank frame (as author-front-plank.js) ---------- */
// Shoulders one upper-arm length above the elbow points (upper arm vertical), forearms flat and parallel, on the balls of
// the feet, body in one line. Contacts: forearms (wrist IK target, downward pole keeps the elbow on its mat point) and feet.
function forearmPlank({ head = -12 } = {}) {
  const base = clone(L.POSES.plank().pose); delete base.ik;
  Object.assign(base.ch, { knee_r: { flex: 3 }, knee_l: { flex: 3 }, sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 } });
  P.head(base, head);
  const plank0 = solve(base, ['root.pos.1', 'root.rot.pitch'], [L.obj.atY('shoulder_r', P.ELBOW_Y + P.UA, 3), (W) => [P.bottomOf(W, 'foot_r') * 3]]).pose;
  const W0 = L.fk(plank0);
  const E = { r: [r3(W0.shoulder_r.p[0]), P.ELBOW_Y, r3(W0.shoulder_r.p[2])], l: [r3(W0.shoulder_l.p[0]), P.ELBOW_Y, r3(W0.shoulder_l.p[2])] };
  const WT = {}; for (const s of ['r', 'l']) { const dy = P.PALM - P.ELBOW_Y; WT[s] = [r3(E[s][0] + Math.sqrt(P.FA ** 2 - dy * dy)), P.PALM, E[s][2]]; }
  const AT = { r: W0.ankle_r.p.map(r3), l: W0.ankle_l.p.map(r3) };
  const handQ = (s) => P.qArr(s === 'r' ? L.handRotR : Q.mirrorZ(L.handRotR));
  const contacts = [
    Object.assign(L.handContact('r'), { label: 'Right forearm', pole: [-0.5, -1, 0], handRot: handQ('r') }),
    Object.assign(L.handContact('l'), { label: 'Left forearm', pole: [-0.5, -1, 0], handRot: handQ('l') }),
    Object.assign(L.legContact('r'), { pole: [0.3, -1, 0.08], handRot: P.qArr(W0.ankle_r.q) }),
    Object.assign(L.legContact('l'), { pole: [0.3, -1, -0.08], handRot: P.qArr(W0.ankle_l.q) }),
  ];
  plank0.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 }, leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } };
  const sphere = (W) => ['r', 'l'].flatMap((s) => V.sub(W[`elbow_${s}`].p, E[s]).map((v) => v * 6));
  const finish = (p) => P.fitAll(p, contacts);
  return { plank0: finish(plank0), raw: plank0, W0, E, WT, AT, contacts, sphere, finish, handQ };
}

// Body line angle (shoulder-hip-ankle, 0 = straight) and trunk pitch helpers
const bodyLine = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`hip_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`hip_${s}`].p));
const kneeLine = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`hip_${s}`].p), V.sub(W[`knee_${s}`].p, W[`hip_${s}`].p));

// Straight leg lifted behind (FK, contact weight 0): hip extended to `ext` degrees past the planted angle, knee soft,
// ankle relaxed. f = 0..1 progress.
function liftLeg(p, s, f, { hipTop, knee0, ankle0, kneeTop = 2, ankleTop = -30 }) {
  const q = clone(p), h0 = p.ch[`hip_${s}`];
  q.ch[`hip_${s}`] = { flex: r3(h0.flex + (hipTop - h0.flex) * f), abd: r3((h0.abd || 0) * (1 - f)), rot: r3((h0.rot || 0) * (1 - f)) };
  q.ch[`knee_${s}`] = { flex: r3(knee0 + (kneeTop - knee0) * f + 6 * Math.sin(Math.PI * Math.min(1, f))) };
  q.ch[`ankle_${s}`] = { dorsi: r3(ankle0 + (ankleTop - ankle0) * f) };
  q.ik[`leg_${s}`].weight = f > 0 ? 0 : 1;
  return q;
}

/* ---------- Standing ---------- */
// Standing tall, feet hip width, both feet planted (fitted leg channels), arms by the sides.
function standing({ stance = 10, toeOut = 6, knee = 3 } = {}) {
  const H = require('./hips');
  const st = L.POSES.standing({ stance, toeOut }).pose;
  const contacts = [H.legC('r', { rot: H.footQ(0, -toeOut) }), H.legC('l', { rot: H.footQ(0, toeOut) })];
  const T = { r: [0, L.ANKLE_H, stance], l: [0, L.ANKLE_H, -stance] };
  st.ik = { leg_r: { target: T.r.slice(), weight: 1 }, leg_l: { target: T.l.slice(), weight: 1 } };
  let a = 70, b = 100;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; st.root.pos[1] = y; if (H.kneeOf(L.fk(st, contacts), 'r') > knee) a = y; else b = y; }
  st.root.pos[1] = L.r1((a + b) / 2);
  const fit = (p) => { let q = H.fitLeg(p, 'r', contacts[0], T.r, { rot: toeOut }); q = H.fitLeg(q, 'l', contacts[1], T.l, { rot: -toeOut }); q.ik = clone(p.ik); return q; };
  return { pose: fit(st), contacts, T, fit };
}

const NOTE = P.NOTE;
module.exports = { r3, ease, deg, solve, forearmPlank, bodyLine, kneeLine, liftLeg, standing, NOTE };
