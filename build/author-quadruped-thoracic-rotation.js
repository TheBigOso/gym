// Exercise B — Quadruped Thoracic Rotation (lumbar-locked: hips back toward heels, hand behind head).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const meta = require('./meta/quadruped-thoracic-rotation.json');

const KNEE_H = 6, WRIST_H = 2.6, TH = V.len(rig.byId.knee_r.offset);
const HIP_X = -30, HIP_Y = KNEE_H + Math.sqrt(TH * TH - HIP_X * HIP_X);
const PITCH = -87;                                    // trunk close to level, slightly down toward the hands
const THIGH = Math.asin(-HIP_X / TH) / R.DEG;         // thigh angle from vertical (forward-down to the knee)
const contacts = [{ id: 'arm_l', label: 'Support hand (left)', chain: ['shoulder_l', 'elbow_l', 'wrist_l', 'handtip_l'], pole: [-0.6, 0.8, -0.3], handRot: L.handRotL.map((v) => +v.toFixed(6)) }];
const base = {
  root: { pos: [HIP_X, r1(HIP_Y), 0], rot: { pitch: PITCH } },
  ch: {
    hip_r: { flex: r1(THIGH - PITCH) }, hip_l: { flex: r1(THIGH - PITCH) }, knee_r: { flex: r1(THIGH + 90) }, knee_l: { flex: r1(THIGH + 90) },
    ankle_r: { dorsi: -72 }, ankle_l: { dorsi: -72 },
    spine_l5: { rot: 0, flex: 4, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 },
    neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 }, sc_r: { protract: 0, elevate: 6 }, sc_l: { protract: 6, elevate: 4 },
    shoulder_l: { plane: 90, elev: 110, axial: 0 }, elbow_l: { flex: 10 }, wrist_l: { pron: 170, flex: -60, dev: 0 },
    shoulder_r: { plane: 0, elev: 90, axial: -60 }, elbow_r: { flex: 120 }, wrist_r: { pron: 90, flex: 15, dev: 0 },
  },
};
const SL0 = L.fk(base).shoulder_l.p.slice();
const dx = Math.sqrt(L.reach(10) ** 2 - (SL0[1] - WRIST_H) ** 2);
const tL = [r1(SL0[0] + dx), WRIST_H, r1(SL0[2])];
base.ik = { arm_l: { target: tL, weight: 1 } };
const SPLIT = { spine_l5: 0.04, spine_t12: 0.48, spine_t6: 0.48 };

function handBehindHead(pose) {
  const W = L.fk(pose), H = W.head_c1;
  const target = V.add(H.p, Q.rot(H.q, [-8.5, 4.5, 7]));
  const extra = (Wx) => { const ant = Q.rot(Wx.spine_t6.q, [1, 0, 0]); return [(V.dot(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), ant) + 2) * 0.6]; };
  return L.armToTarget(pose, target, { wrist: { pron: 90, flex: 15, dev: 0 }, axial: -60, axialW: 0.005, guess: [10, 95, -60], extra });
}
const KEYS = [
  { name: 'neutral', theta: 0, head: [0, 0], scR: [0, 6], flex: 0 },
  { name: 'down', theta: -28, head: [-15, 12], scR: [12, 2], flex: 6, gaze: 40 },
  { name: 'mid', theta: 8, head: [5, 2], scR: [0, 5], flex: 0, gaze: 40 },
  { name: 'up', theta: 30, head: [18, -4], scR: [-8, 6], flex: -2, gaze: 35 },
  { name: 'peak', theta: 46, head: [28, -8], scR: [-12, 7], flex: -4, gaze: 35 },
  { name: 'peakBreath', theta: 48.5, head: [29, -9], scR: [-13, 7], flex: -4, gaze: 35 },
  { name: 'back', theta: 18, head: [10, 0], scR: [-3, 6], flex: 0, gaze: 40 },
];
const poses = {}, report = [];
for (const k of KEYS) {
  const p0 = clone(base);
  p0.ch.spine_t6.flex = k.flex; p0.ch.spine_t12.flex = 2 + k.flex / 2;
  const { pose, err } = L.solveSpine(p0, k.theta, SL0, SPLIT);
  pose.ch.sc_r = { protract: k.scR[0], elevate: k.scR[1] };
  pose.ch.neck_c7 = { rot: r1(k.head[0] * 0.4), flex: r1(k.head[1] * 0.4) };
  pose.ch.head_c1 = { rot: r1(k.head[0] * 0.6), flex: r1(k.head[1] * 0.6) };
  let s = handBehindHead(pose);
  if (k.gaze) { for (let i = 0; i < 2; i++) { s = L.gaze(s, 'elbow_r', k.gaze, k.head); s = handBehindHead(s); } }
  poses[k.name] = s;
  const W = L.fk(s, contacts);
  report.push(`${k.name.padEnd(10)} θ=${k.theta} shoulderErr=${err.toFixed(2)} elbowR=${s.ch.elbow_r.flex} elbowY=${W.elbow_r.p[1].toFixed(1)} minY=${L.shapeMinY(W).y.toFixed(1)}(${L.shapeMinY(W).id})`);
}
const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses,
  keyframes: [
    { t: 0, pose: 'neutral' }, { t: 0.8, pose: 'neutral' }, { t: 1.9, pose: 'down' }, { t: 2.2, pose: 'down' }, { t: 2.9, pose: 'mid' },
    { t: 3.6, pose: 'up' }, { t: 4.3, pose: 'peak' }, { t: 4.95, pose: 'peakBreath' }, { t: 5.6, pose: 'peak' }, { t: 6.4, pose: 'back' },
    { t: 7.2, pose: 'neutral' }, { t: 8, pose: 'neutral' },
  ],
  activation: meta.activation, guides: meta.guides, checks: meta.checks,
};
const pk = poses.peak.ch, dn = poses.down.ch, kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].peak = d(pk.spine_t12.rot + pk.spine_t6.rot); kin[1].peak = d(pk.spine_l5.rot); kin[2].peak = d(pk.spine_l5.rot + pk.spine_t12.rot + pk.spine_t6.rot);
kin[3].peak = d(-(dn.spine_l5.rot + dn.spine_t12.rot + dn.spine_t6.rot));
kin[4].setup = `≈${Math.round(base.ch.hip_r.flex)}° flexion, sat back`; kin[5].setup = `≈${Math.round(base.ch.knee_r.flex)}° flexion`;
console.log(`B: hip ${HIP_X},${HIP_Y.toFixed(1)} hipFlex ${base.ch.hip_r.flex} knee ${base.ch.knee_r.flex} support target ${tL}  wrote ${L.write(ex)}`);
report.forEach((r) => console.log('  ' + r));
console.log('  check', JSON.stringify(L.timelineCheck(ex, SL0)));
