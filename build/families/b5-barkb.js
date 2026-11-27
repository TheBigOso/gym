// Batch 5 family b5-barkb helpers: hanging from the pull-up bar (overhand grip set-up shared with author-pull-up.js),
// an approximate whole-body centre of mass, joint-limit scan, and two-hand kettlebell grip helpers for the around-head
// rotation.
const L = require('../lib');
const { V, Q, rig } = L;
const H = require('./hips');

const D2R = Math.PI / 180;
const qArr = (q) => q.map((v) => +v.toFixed(6));
const GRIP_PT = [2.2, -7.2, 0]; // grip point in the wrist frame (EQ.gripPoint 'bar' / handle centre)

// Overhand grip on a pull-up bar (as author-pull-up.js): palm forward, fingers up over the bar leaning out by `tilt`
// degrees, elbows out to the sides. Returns the wrist targets, the arm contacts and fitArms(pose, flex).
function overhandGrip({ bar, barH, gz, tilt = 6, pole = [0.35, -0.25, 1] }) {
  const fl = [0, Math.cos(tilt * D2R), -Math.sin(tilt * D2R)];
  const XL = [1, 0, 0], YL = V.scale(fl, -1), ZL = V.cross(XL, YL);
  const rotL = Q.fromBasis(XL, YL, ZL), rotR = Q.mirrorZ(rotL);
  const contacts = ['r', 'l'].map((s) => Object.assign(L.handContact(s), { pole: [pole[0], pole[1], s === 'r' ? pole[2] : -pole[2]], handRot: qArr(s === 'r' ? rotR : rotL) }));
  const grip = { r: [bar.c[0], barH, gz], l: [bar.c[0], barH, -gz] };
  const wristT = (s) => V.sub(grip[s], Q.rot(s === 'r' ? rotR : rotL, GRIP_PT)).map((v) => +v.toFixed(2));
  const WT = { r: wristT('r'), l: wristT('l') };
  const guess = (flex) => [20, 45].map((pl) => ({ shoulder_r: { plane: pl, elev: 180 - flex * 0.8, axial: 0 }, elbow_r: { flex }, shoulder_l: { plane: pl, elev: 180 - flex * 0.8, axial: 0 }, elbow_l: { flex } }));
  function fitArms(pose, flex) {
    let p = L.clone(pose);
    p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 } };
    for (const s of ['r', 'l']) { const c = contacts.find((cc) => cc.id === `arm_${s}`); const g = guess(flex).map((o) => ({ [`shoulder_${s}`]: o[`shoulder_${s}`], [`elbow_${s}`]: o[`elbow_${s}`] })); p = H.fitArm(p, s, c, WT[s], g); delete p.__cost; }
    return p;
  }
  return { WT, grip, contacts, rotL, rotR, fitArms };
}

// Approximate whole-body centre of mass (x) from segment midpoints, mass fractions after common anthropometric tables
// (trunk and head about 58%, each arm about 5%, each thigh about 10%, each shank and foot about 6%)
const SEG = [
  ['pelvis', 'spine_t12', 0.2], ['spine_t12', 'neck_c7', 0.3], ['neck_c7', 'head_c1', 0.08],
  ['shoulder_r', 'elbow_r', 0.028], ['elbow_r', 'wrist_r', 0.022], ['shoulder_l', 'elbow_l', 0.028], ['elbow_l', 'wrist_l', 0.022],
  ['hip_r', 'knee_r', 0.1], ['knee_r', 'ankle_r', 0.061], ['hip_l', 'knee_l', 0.1], ['knee_l', 'ankle_l', 0.061],
];
function com(W) { let m = 0, c = [0, 0, 0]; for (const [a, b, w] of SEG) { c = V.add(c, V.scale(V.add(W[a].p, W[b].p), w / 2)); m += w; } return V.scale(c, 1 / m); }
const comX = (W) => com(W)[0];

// stored channels outside the rig limits (0.5 deg tolerance, as verify)
function limitViolations(ex) {
  const viol = [];
  for (const [n, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${n}.${j}.${c}=${p.ch[j][c]}`); }
  return viol;
}

module.exports = { overhandGrip, com, comX, limitViolations, GRIP_PT, qArr };
