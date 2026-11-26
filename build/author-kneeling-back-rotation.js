// Exercise A — Kneeling Back Rotation Stretch (straight-arm reach). Right side authored; left = mirror.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const meta = require('./meta/kneeling-back-rotation-stretch.json');

const KNEE_H = 6, HIP_H = KNEE_H + L.V.len(rig.byId.knee_r.offset), WRIST_H = 2.6;
const contacts = [{ id: 'arm_l', label: 'Support hand (left)', chain: ['shoulder_l', 'elbow_l', 'wrist_l', 'handtip_l'], pole: [-1, 0.1, -0.35], handRot: L.handRotL.map((v) => +v.toFixed(6)) }];
const basePose = (pitch) => ({
  root: { pos: [0, HIP_H, 0], rot: { pitch } },
  ch: {
    hip_r: { flex: -pitch }, hip_l: { flex: -pitch }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, ankle_r: { dorsi: -72 }, ankle_l: { dorsi: -72 },
    spine_l5: { rot: 0, flex: 0, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 },
    neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 }, sc_r: { protract: 5, elevate: 0 }, sc_l: { protract: 5, elevate: 0 },
    shoulder_l: { plane: 90, elev: 76, axial: 0 }, elbow_l: { flex: 10 }, wrist_l: { pron: 170, flex: -80, dev: 0 },
  },
});
// 1) Trunk pitch so the support shoulder sits over a flat hand with a soft 10° elbow.
let lo = -89, hi = -55, pitch = -76;
for (let i = 0; i < 60; i++) { pitch = (lo + hi) / 2; const f = L.fk(basePose(pitch)).shoulder_l.p[1] - WRIST_H - L.reach(10); if (f > 0) hi = pitch; else lo = pitch; }
pitch = r1(pitch);
const base = basePose(pitch);
const SL0 = L.fk(base).shoulder_l.p.slice();
const tL = [r1(SL0[0]), WRIST_H, r1(SL0[2])], tR = [tL[0], WRIST_H, -tL[2]];
base.ik = { arm_l: { target: tL, weight: 1 } };
const SPLIT = { spine_l5: 0.12, spine_t12: 0.44, spine_t6: 0.44 };
let PW = null;

const KEYS = [
  { name: 'tabletop', theta: 0, scR: [5, 0], head: [0, 0], arm: { planted: true } },
  { name: 'unload', theta: -2, scR: [6, 8], head: [-3, 3], arm: { wrist: V.add(tR, [-1.5, 4, -2.5]), droop: 15, axial: -65, guess: [88, 76, -65] } },
  { name: 'windup', gaze: 35, theta: -9, scR: [14, 2], head: [-8, 8], arm: { rel: [-3, -13], y: 7.5, droop: 12, axial: -55, guess: [95, 76, -55] } },
  { name: 'clear', gaze: 35, theta: 3, scR: [8, 3], head: [0, 5], arm: { dir: [0, -0.7, 0.71], flex: 30, wrist: { pron: 160, flex: -45, dev: 0 }, axial: -40, guess: [60, 90, -40] } },
  { name: 'sweep', gaze: 30, theta: 14, scR: [4, 2], head: [6, 1], arm: { dir: [0.02, -0.55, 0.83], flex: 12, wrist: { pron: 120, flex: -10, dev: 0 }, axial: -25, guess: [20, 120, -25] } },
  { name: 'rise', gaze: 38, theta: 32, scR: [-4, 3], head: [18, -4], arm: { dir: [0.05, 0.45, 0.89], flex: 8, wrist: { pron: 80, flex: 0, dev: 0 }, guess: [0, 150, 0] } },
  { name: 'peak', gaze: 38, theta: 45, scR: [-10, 5], head: [32, -8], arm: { dir: [0.06, 1, 0.05], flex: 5, wrist: { pron: 60, flex: 0, dev: 0 }, guess: [-30, 160, 0] } },
  { name: 'peakBreath', gaze: 38, theta: 47.5, scR: [-11, 5], head: [33, -9], arm: { dir: [0.06, 1, 0.03], flex: 5, wrist: { pron: 60, flex: 0, dev: 0 }, guess: [-30, 160, 0] } },
  { name: 'descend', gaze: 30, theta: 24, scR: [-2, 2], head: [14, -2], arm: { dir: [0.02, 0.15, 0.99], flex: 8, wrist: { pron: 110, flex: -5, dev: 0 }, guess: [0, 120, 0] } },
  { name: 'touchdown', theta: 3, scR: [5, 6], head: [3, 2], arm: { wrist: V.add(tR, [-1, 3.5, 0.5]), droop: 12, axial: -65, guess: [88, 76, -65] } },
];
const poses = {}, report = [];
for (const k of KEYS) {
  const { pose, err } = L.solveSpine(clone(base), k.theta, SL0, SPLIT);
  pose.ch.sc_r = { protract: k.scR[0], elevate: k.scR[1] };
  pose.ch.neck_c7 = { rot: r1(k.head[0] * 0.4), flex: r1(k.head[1] * 0.4) };
  pose.ch.head_c1 = { rot: r1(k.head[0] * 0.6), flex: r1(k.head[1] * 0.6) };
  let solved;
  const a = k.arm;
  if (a.planted) { const pr = L.plantRight(pose, tR); solved = pr.pose; PW = pr.wrist; }
  else {
    const S = L.fk(pose).shoulder_r.p;
    const target = a.dir ? V.add(S, V.scale(V.norm(a.dir), 60)) : a.rel ? [S[0] + a.rel[0], a.y, S[2] + a.rel[1]] : a.wrist;
    const wrist = a.droop != null ? { pron: PW.pron, flex: r1(PW.flex + a.droop), dev: PW.dev } : a.wrist && !Array.isArray(a.wrist) ? a.wrist : undefined;
    solved = L.armToTarget(pose, target, { flex: a.flex, wrist, axial: a.axial ?? 0, guess: a.guess });
  }
  if (k.gaze) solved = L.gaze(solved, 'handtip_r', k.gaze, k.head);
  poses[k.name] = solved;
  report.push(`${k.name.padEnd(11)} θ=${k.theta} shoulderErr=${err.toFixed(2)}cm elbowR=${solved.ch.elbow_r.flex}`);
}
const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses,
  keyframes: [
    { t: 0.0, pose: 'tabletop' }, { t: 0.6, pose: 'tabletop' }, { t: 1.0, pose: 'unload' }, { t: 1.7, pose: 'windup' }, { t: 2.15, pose: 'clear' },
    { t: 2.65, pose: 'sweep' }, { t: 3.3, pose: 'rise' }, { t: 4.0, pose: 'peak' }, { t: 4.8, pose: 'peakBreath' }, { t: 5.6, pose: 'peak' },
    { t: 6.3, pose: 'descend' }, { t: 7.0, pose: 'touchdown' }, { t: 7.4, pose: 'tabletop' }, { t: 8.0, pose: 'tabletop' },
  ],
  activation: meta.activation, guides: meta.guides, checks: meta.checks,
};
const pk = poses.peak.ch, kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].peak = d(pk.spine_t12.rot + pk.spine_t6.rot); kin[1].peak = d(pk.spine_l5.rot); kin[2].peak = d(pk.spine_l5.rot + pk.spine_t12.rot + pk.spine_t6.rot);
kin[3].peak = `${d(pk.neck_c7.rot + pk.head_c1.rot)} plus ${Math.round(-(pk.neck_c7.flex + pk.head_c1.flex))}° extension`;
kin[4].setup = `≈${-pitch}° flexion (thighs vertical)`;
ex.exercise.reference.note = 'Used only to identify the movement. This rig, model and animation are original.';
console.log(`A: pitch ${pitch}  wrote ${L.write(ex)}`); report.forEach((r) => console.log('  ' + r));
console.log('  check', JSON.stringify(L.timelineCheck(ex, SL0)));
