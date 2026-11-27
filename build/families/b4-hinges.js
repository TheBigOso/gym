// Batch 4 hinges and rows family: small helpers on top of the b3 back family (balanced standing hinge, hanging and
// rowing arms, sweeps) and the dumbbell helpers.
//   - handQ: world hand rotation (right-hand convention) from a palm normal and a thumb axis; mirrorQ for the left hand
//   - fitArm: FK arm channels (shoulder, elbow, wrist) fitted to a weight-1 arm contact, so the arm can blend between a
//     planted hand (gripping a dumbbell that rests on the floor) and free rowing without a jump
//   - phaseT / easedKeys / makeEx / setKin: timeline and module plumbing shared by the author scripts
//   - boxOB: an axis-aligned box prop as an oriented box for B.sweep / B.bodyBoxClear
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;

const qArr = (q) => q.map((v) => +v.toFixed(6));
// Right hand: local +X out of the palm, +Z along the thumb side of the handle, +Y toward the forearm
function handQ(palm, thumb) { const n = V.norm(palm), t = V.norm(thumb), up = V.cross(t, n); return Q.fromBasis(n, up, t); }
const mirrorQ = (q) => Q.mirrorZ(q);
const ARM = (s) => [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`];
// Fit the FK channels of one arm to its contact solution (contact `id` at weight 1 with the pose's ik target)
function fitArm(pose, s, contacts, id, guesses) {
  const tmp = clone(pose); tmp.ik = { [id]: { target: pose.ik[id].target, weight: 1 } };
  const Wi = L.fk(tmp, contacts), E = Wi[`elbow_${s}`].p, Wp = Wi[`wrist_${s}`].p, q = Wi[`wrist_${s}`].q;
  const ax = Q.rot(q, [1, 0, 0]), az = Q.rot(q, [0, 0, 1]);
  const objs = [L.obj.at(`elbow_${s}`, E, 2), L.obj.at(`wrist_${s}`, Wp, 4),
    (W) => [...V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), ax), ...V.sub(Q.rot(W[`wrist_${s}`].q, [0, 0, 1]), az)].map((v) => v * 30),
    L.obj.reg(`ch.shoulder_${s}.axial`, 0, 0.003)];
  let best = null;
  const cur = [pose.ch[`shoulder_${s}`] || {}, pose.ch[`elbow_${s}`] || {}, pose.ch[`wrist_${s}`] || {}];
  const gs = guesses || [[cur[0].plane ?? 80, cur[0].elev ?? 80, cur[0].axial ?? 0, cur[1].flex ?? 10, cur[2].pron ?? 90, cur[2].flex ?? 0, cur[2].dev ?? 0], [90, 80, 0, 10, 90, 0, 0], [70, 60, 20, 30, 0, 0, 0], [100, 90, -20, 10, 170, 0, 0], [90, 80, 0, 10, -90, 0, 0]];
  for (const g of gs) {
    const q0 = clone(pose); q0.ch[`shoulder_${s}`] = { plane: g[0], elev: g[1], axial: g[2] }; q0.ch[`elbow_${s}`] = { flex: g[3] }; q0.ch[`wrist_${s}`] = { pron: g[4], flex: g[5], dev: g[6] };
    const r = L.solvePose(q0, ARM(s), objs, { iters: 400 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const p = best.pose;
  for (const c of ['pron']) p.ch[`wrist_${s}`][c] = r1(L.wrap(p.ch[`wrist_${s}`][c]));
  p.ch[`shoulder_${s}`].plane = r1(L.wrap(p.ch[`shoulder_${s}`].plane)); p.ch[`shoulder_${s}`].axial = r1(L.wrap(p.ch[`shoulder_${s}`].axial));
  const Wf = L.fk(Object.assign(clone(p), { ik: {} }), contacts);
  p.__fit = { cost: best.cost, wrist: +V.len(V.sub(Wf[`wrist_${s}`].p, Wp)).toFixed(3), elbow: +V.len(V.sub(Wf[`elbow_${s}`].p, E)).toFixed(3) };
  return p;
}
// Phase boundaries from the meta timeline: { id: [start, end] }
const phaseT = (meta) => Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]]));
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
// Keyframes for poses named `${name}${i}` sampled at FS[i] (0..1 along the move), eased in time between t0 and t1
function easedKeys(name, FS, t0, t1, reverse = false) {
  const out = [];
  if (!reverse) FS.forEach((f, i) => out.push({ t: +(t0 + (t1 - t0) * inv(f)).toFixed(3), pose: `${name}${i}` }));
  else for (let i = FS.length - 1; i >= 0; i--) out.push({ t: +(t0 + (t1 - t0) * inv(1 - FS[i])).toFixed(3), pose: `${name}${i}` });
  return out;
}
// Drop duplicate times (keep the later key) and sort
function cleanKeys(keys) { const m = new Map(); for (const k of keys) m.set(k.t, k); return [...m.values()].sort((a, b) => a.t - b.t); }
const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
function makeEx(meta, { poses, keyframes, props, contacts }) {
  const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts,
    timeline: meta.timeline, poses, keyframes: cleanKeys(keyframes), activation: meta.activation, guides: meta.guides, checks: meta.checks };
  ex.exercise.reference.note = NOTE;
  for (const k in poses) for (const f of ['__fit', '__h', '__cost', '__handle', '__armCost']) delete poses[k][f];
  return ex;
}
function setKin(ex, prefix, field, v) { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; else throw new Error(`no kinematics row ${prefix}`); }
// Axis-aligned box prop (center at floor level, size [x, y, z]) as an oriented box
function boxOB(prop, id = 'box') { const [cx, cy, cz] = prop.center, [sx, sy, sz] = prop.size; return { id, c: [cx, cy + sy / 2, cz], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [sx / 2, sy / 2, sz / 2] }; }
// Arm contacts that hold the hands where a pose has them (wrist position and world orientation), with the pole along the
// pose's own elbow so the IK solution matches the FK arm; returns { contacts, targets }. The ids are hold_r / hold_l (not
// arm_*): the athlete treats arm_* contacts as palms planted flat, while these hands stay closed on a dumbbell handle.
function plantArms(pose, contacts0) {
  const W = L.fk(pose, contacts0), out = [], targets = {};
  for (const s of ['r', 'l']) {
    const S = W[`shoulder_${s}`].p, E = W[`elbow_${s}`].p, Wr = W[`wrist_${s}`].p, mid = V.lerp(S, Wr, 0.5), pole = V.norm(V.sub(E, mid));
    out.push(Object.assign(L.handContact(s), { id: `hold_${s}`, label: `${s === 'r' ? 'Right' : 'Left'} hand on its dumbbell`, pole: pole.map((v) => +v.toFixed(4)), handRot: qArr(W[`wrist_${s}`].q) }));
    targets[s] = Wr.map((v) => +v.toFixed(3));
  }
  return { contacts: out, targets };
}
// Alternating one-arm work over planted hands: `row(f)` returns the pose with the RIGHT arm at row fraction f (left arm
// untouched); the left arm's poses are the mirror (the engine mirrors left channels). base: both hands planted (weight 1,
// channels fitted to the contacts). Returns poses R0..Rn / L1..Ln with the working arm's contact at weight 0 (except f = 0).
function alternate(base, contacts, row, FS) {
  const poses = {};
  const ARMJ = ['sc', 'shoulder', 'elbow', 'wrist'];
  FS.forEach((f, i) => {
    const q = row(f);
    const pr = clone(base), pl = clone(base);
    if (i > 0) for (const j of ARMJ) { pr.ch[`${j}_r`] = clone(q.ch[`${j}_r`]); pl.ch[`${j}_l`] = clone(q.ch[`${j}_r`]); }
    pr.ik.hold_r.weight = i === 0 ? 1 : 0; pl.ik.hold_l.weight = i === 0 ? 1 : 0;
    poses[`R${i}`] = pr; if (i > 0) poses[`L${i}`] = pl;
  });
  poses.L0 = poses.R0;
  return poses;
}
module.exports = { plantArms, alternate, qArr, handQ, mirrorQ, fitArm, phaseT, ease, inv, easedKeys, cleanKeys, NOTE, makeEx, setKin, boxOB };
