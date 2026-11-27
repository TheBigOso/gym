// Single Leg Hip Thrust (GymVisual #207112): shoulder blades on the edge of a 42 cm bench, right foot flat (planted leg
// contact), left knee lifted and held. The trunk pivots on the bench edge: hips drop toward the floor, then drive up until
// the trunk is level and the right shin vertical; 0.8 s squeeze, 2 s down. Hands on hips. Authored on the right leg.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const meta = require('./meta/single-leg-hip-thrust.json');

const BENCH_H = 42, BENCH_D = 36;
// Bench edge (front top corner) at x = 0. The upper back pivots on it: a point on the back of the chest at the level of the
// lower shoulder blades (spine_t6 frame) stays on the edge. The skinned mesh is checked against the edge separately.
const EDGE = [0, BENCH_H, 0];
let BACK_PT = [-3.6, 4, 0]; // spine_t6 local: 1.1 cm inside the rig chest surface so the skinned mesh back meets the edge (hips_bench.mjs)
// Arms spread along the bench top, palms down, fingers pointing out, elbows soft and above the bench (constant hand targets)
const HAND = { r: [-10, BENCH_H + 2.7, 62], l: [-10, BENCH_H + 2.7, -62] };
const ARM_POLE = { r: [-0.6, -0.1, 1], l: [-0.6, -0.1, -1] };
const handOutL = Q.fromBasis([0, -1, 0], [0, 0, 1], [-1, 0, 0]), handOutR = Q.mirrorZ(handOutL);
const BACK_DX = +(process.env.BACK_DX || 0);
const base = (() => { const p = H.lieBase(); p.root.pos = [40, 50, 0]; Object.assign(p.ch, { spine_l5: { rot: 0, flex: -3, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 3, latFlex: 0 } }); return p; })();
function trunk(pitch) {
  const p = clone(base); p.root.rot = { pitch: r1(pitch) };
  const pt = [BACK_PT[0] + BACK_DX, BACK_PT[1], BACK_PT[2]];
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1'], [(W) => V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, pt)), EDGE).map((v) => v * 3)]).pose;
  // chin tucked: eyes toward the knees at the top, head in line with the trunk lower down
  const tilt = pitch - 90; // 0 when the pelvis is level-ish
  s.ch.neck_c7 = { rot: 0, flex: r1(18 + 0.15 * tilt) }; s.ch.head_c1 = { rot: 0, flex: r1(12 + 0.1 * tilt) };
  return s;
}
const trunkTilt = (W) => Math.atan2(W.hip_r.p[1] - W.shoulder_r.p[1], W.hip_r.p[0] - W.shoulder_r.p[0]) / R.DEG; // + = hips above shoulders
// top: shoulder-to-hip line level
let lo = 60, hi = 120, P_TOP = 90;
for (let i = 0; i < 40; i++) { P_TOP = (lo + hi) / 2; if (trunkTilt(L.fk(trunk(P_TOP))) < 0) lo = P_TOP; else hi = P_TOP; }
P_TOP = r1(P_TOP);
// right foot under the knee at the top (thigh level, shin vertical -> knee 90)
const contacts = [H.legC('r', { pole: [1, 0.3, 0.1] }), Object.assign(H.handC('r', ARM_POLE.r), { handRot: H.qArr(handOutR) }), Object.assign(H.handC('l', ARM_POLE.l), { handRot: H.qArr(handOutL) })];
const legOnly = [contacts[0]];
const Wtop = L.fk(trunk(P_TOP));
const FOOT = (() => { let a = Wtop.hip_r.p[0] + 20, b = Wtop.hip_r.p[0] + 60, x = 0; for (let i = 0; i < 40; i++) { x = (a + b) / 2; const p = trunk(P_TOP); p.ik = { leg_r: { target: [x, L.ANKLE_H, 10], weight: 1 } }; if (H.kneeOf(L.fk(p, legOnly), 'r') > 90) a = x; else b = x; } return [r1(x), L.ANKLE_H, 10]; })();
// bottom: hips drop until the buttocks are about 6 cm above the floor
const buttY = (W) => Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'buttock_l'), H.bottomOf(W, 'pelvis'));
lo = P_TOP - 70; hi = P_TOP;
let P_BOT = P_TOP;
for (let i = 0; i < 40; i++) { P_BOT = (lo + hi) / 2; const p = trunk(P_BOT); p.ik = { leg_r: { target: FOOT, weight: 1 } }; if (buttY(L.fk(p, legOnly)) < 6) lo = P_BOT; else hi = P_BOT; }
P_BOT = r1(P_BOT);

// Free (left) leg: hip flexed and knee bent, held in the pelvis frame
const FREE = { hip_l: { flex: 88, abd: 4, rot: 0 }, knee_l: { flex: 100 }, ankle_l: { dorsi: -15 } }; // thigh about vertical, shin about level at the top
function poseAt(f) { // f: 0 = bottom, 1 = top
  let p = trunk(P_BOT + (P_TOP - P_BOT) * f);
  Object.assign(p.ch, clone(FREE));
  p.ik = { leg_r: { target: FOOT.slice(), weight: 1 } };
  p.ch.sc_r = { protract: 0, elevate: 4 }; p.ch.sc_l = { protract: 0, elevate: 4 };
  p = H.fitLeg(p, 'r', contacts[0], FOOT);
  for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], [{ [`shoulder_${s}`]: { plane: 0, elev: 80, axial: 0 }, [`elbow_${s}`]: { flex: 60 }, [`wrist_${s}`]: { pron: 0, flex: 0, dev: 0 } }, { [`shoulder_${s}`]: { plane: 30, elev: 70, axial: -60 }, [`elbow_${s}`]: { flex: 60 }, [`wrist_${s}`]: { pron: 80, flex: 0, dev: 0 } }]); delete p.__cost; }
  p.ik.arm_r = { target: HAND.r.slice(), weight: 1 }; p.ik.arm_l = { target: HAND.l.slice(), weight: 1 };
  return p;
}
const poses = { bottom: poseAt(0), u25: poseAt(0.25), u50: poseAt(0.5), u75: poseAt(0.75), top: poseAt(1), squeeze: poseAt(1.015), d75: poseAt(0.75), d50: poseAt(0.5), d25: poseAt(0.25), low: poseAt(0.02) };
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }, { t: 1.1, pose: 'u25' }, { t: 1.4, pose: 'u50' }, { t: 1.7, pose: 'u75' }, { t: 2.0, pose: 'top' }, { t: 2.4, pose: 'squeeze' }, { t: 2.8, pose: 'top' },
  { t: 3.3, pose: 'd75' }, { t: 3.8, pose: 'd50' }, { t: 4.3, pose: 'd25' }, { t: 4.8, pose: 'low' }, { t: 5.3, pose: 'bottom' }, { t: 6.0, pose: 'bottom' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const bench = ex.props.find((p) => p.id === 'bench'); bench.center = [r1(EDGE[0] - BENCH_D / 2), 0, 0]; bench.size = [BENCH_D, BENCH_H, 150];
let pivot = 0, elbowMin = 1e9; const Wb0 = L.fk(poses.bottom, contacts);
const rep = H.loopReport(ex, { planted: ['leg_r', 'arm_r', 'arm_l'], probe: (W) => { elbowMin = Math.min(elbowMin, W.elbow_r.p[1] - 4.8, W.elbow_l.p[1] - 4.8); pivot = Math.max(pivot, V.len(V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, [BACK_PT[0] + BACK_DX, BACK_PT[1], 0])), EDGE))); } });
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex);
set('Bench height', 'setup', `${BENCH_H} cm`); set('Bench height', 'peak', 'Upper back pivots on the bench edge');
set('Working hip flexion', 'setup', `≈${Math.round(poses.bottom.ch.hip_r.flex)}° at the bottom`); set('Working hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}°`);
set('Working knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wb, 'r'))}° at the bottom`); set('Working knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}° (shin vertical)`);
set('Trunk inclination', 'setup', `≈${Math.round(-trunkTilt(Wb))}° (hips below the shoulders)`); set('Trunk inclination', 'peak', `≈${Math.round(Math.abs(trunkTilt(Wt)))}° (level)`);
set('Tempo', 'setup', 'Hips down 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.8 s squeeze, 2.0 s down, 1.2 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Single Leg Hip Thrust: pitch ${P_BOT}..${P_TOP}, foot ${FOOT}, wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} pivotErr ${pivot.toFixed(2)} elbowBottom ${r1(elbowMin)} butt ${r1(buttY(Wb))} hipY ${r1(Wb.hip_r.p[1])}..${r1(Wt.hip_r.p[1])} travel ${r1(travel)} footL ${Wt.ankle_l.p.map(r1)} / ${Wb.ankle_l.p.map(r1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
