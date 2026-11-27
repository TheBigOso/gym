// Air Bike / bicycle crunch (GymVisual #000312). Bilateral: supine, fingertips behind the head with elbows wide, head and
// shoulder blades curled off the mat. Pedal the legs while the trunk turns: right elbow toward the left knee as the right
// leg straightens, then the left elbow toward the right knee. Two full alternations per loop. Pelvis stays on the mat.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const C = require('./families/core-b');
const meta = require('./meta/air-bike.json');

/* ---------------- Lying base (knees bent), flat low back ---------------- */
const lie = C.lie({ kneeFlex: 90, spine: { l5: 2, t12: 2, t6: 4 }, pitch: 93 });
const P = lie.root.rot.pitch;
const ARM0 = { shoulder: { plane: -5, elev: 126, axial: -125 }, elbow: { flex: 136 }, wrist: { pron: 35, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };

// Leg channels: hip flexion, knee flexion, ankle.
const leg = (p, s, hip, knee, abd = 0, dorsi = -15) => { p.ch[`hip_${s}`] = { flex: hip, abd, rot: 0 }; p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi }; };
const SPLIT = { spine_l5: 0.08, spine_t12: 0.46, spine_t6: 0.46 };
// k: curl adds (l5, t12, t6), rot (deg, + turns right shoulder... negative = trunk turns to the left), neck flex, legs {r:[hip,knee], l:[hip,knee]}
function pose(k, refArm) {
  const p = clone(lie);
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: r1(k.rot * SPLIT[j]), latFlex: r1((k.lat || 0) * (j === 'spine_l5' ? 0 : 0.5)), flex: r1(Math.min(rig.byId[j].limits.flex[1] - 1, lie.ch[j].flex + k.curl[j])) };
  C.neck(p, k.neck, k.rot * 0.25);
  leg(p, 'r', ...k.legs.r); leg(p, 'l', ...k.legs.l);
  let q = C.cradle(p, { side: 'r', guess: refArm.r, ref: refArm.r, elbowOut: k.elbowOut ?? 18, elbowAnt: k.elbowAnt ?? -3 });
  q = C.cradle(q, { side: 'l', guess: refArm.l, ref: refArm.l, elbowOut: 18 });
  delete q.__cost;
  return q;
}
// Seed the arm branch from the symmetric set position (best of several guesses), as the sit-up does.
const CURL = { spine_l5: 2, spine_t12: 13, spine_t6: 18 };
const SET = { curl: CURL, rot: 0, neck: 30, legs: { r: [88, 95], l: [88, 95] } };
let best = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = clone(ARM0); g.shoulder.axial = axial; g.wrist.pron = pron;
  const p = clone(lie);
  for (const j in CURL) p.ch[j].flex = r1(lie.ch[j].flex + CURL[j]);
  C.neck(p, 30);
  const q = C.cradle(p, { guess: g, elbowOut: 18 });
  if (!best || q.__cost < best.__cost) best = q;
}
const REF = { r: C.armOf(best, 'r'), l: C.armOf(best, 'l') };
// Peak A: right elbow to left knee. Trunk turns left (negative rot), the right shoulder curls higher.
const A = { curl: { spine_l5: 8, spine_t12: 21, spine_t6: 20 }, rot: -38, lat: -4, neck: 32, elbowAnt: 3, elbowOut: 15, legs: { l: [116, 116, -3], r: [22, 6] } };
const Ah = Object.assign({}, A, { rot: -40, curl: { spine_l5: 9, spine_t12: 22, spine_t6: 21 }, legs: { l: [119, 118, -4], r: [20, 5] } });
const poses = { set: pose(SET, REF), A: pose(A, REF), Ahold: pose(Ah, REF) };
poses.B = C.mirror(poses.A); poses.Bhold = C.mirror(poses.Ahold);
const keyframes = [{ t: 0, pose: 'set' }, { t: 0.6, pose: 'set' }, { t: 1.35, pose: 'A' }, { t: 1.6, pose: 'Ahold' }, { t: 2.55, pose: 'B' }, { t: 2.8, pose: 'Bhold' },
  { t: 3.75, pose: 'A' }, { t: 4.0, pose: 'Ahold' }, { t: 4.95, pose: 'B' }, { t: 5.2, pose: 'Bhold' }, { t: 5.9, pose: 'set' }, { t: 6.4, pose: 'set' }];
const ex = C.moduleOf(meta, poses, keyframes, []);
const hipPk = Math.max(...Object.values(poses).map((p) => Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex)));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hipPk) - 3, max: Math.ceil(hipPk) + 3 };

const rep = C.scan(ex, { still: ['pelvis'] });
const Ws = L.fk(poses.set), Wa = L.fk(poses.Ahold);
const elbowKnee = V.len(V.sub(Wa.elbow_r.p, Wa.knee_l.p));
const thighDeg = (W, s) => Math.atan2(W[`knee_${s}`].p[1] - W[`hip_${s}`].p[1], W[`knee_${s}`].p[0] - W[`hip_${s}`].p[0]) / R.DEG;
const legDeg = (W, s) => Math.atan2(W[`ankle_${s}`].p[1] - W[`hip_${s}`].p[1], W[`ankle_${s}`].p[0] - W[`hip_${s}`].p[0]) / R.DEG;
const ah = poses.Ahold.ch, rotSum = ah.spine_l5.rot + ah.spine_t12.rot + ah.spine_t6.rot;
Object.assign(rep, { pitch: P, set: { chest: r1(C.bottomOf(Ws, 'chest')), c7: r1(Ws.neck_c7.p[1]), hip: poses.set.ch.hip_r.flex, sh: poses.set.ch.shoulder_r },
  A: { rot: r1(rotSum), elbowKnee: r1(elbowKnee), hipIn: ah.hip_l.flex, kneeIn: r1(C.kneeOf(Wa, 'l')), hipOut: ah.hip_r.flex, legOut: r1(legDeg(Wa, 'r')), heelOut: r1(Math.min(C.bottomOf(Wa, 'foot_r'), C.bottomOf(Wa, 'calf_r'))), shR: r1(C.bottomOf(Wa, 'deltoid_r')), shL: r1(C.bottomOf(Wa, 'deltoid_l')) }, measure: ex.checks.measure });
C.setKin(ex, 'Trunk curl', `Shoulder blades ${Math.round(C.bottomOf(Ws, 'chest'))} cm off the mat (thoracic ${C.deg(poses.set.ch.spine_t12.flex + poses.set.ch.spine_t6.flex)} flexion)`, 'Held up through every twist');
C.setKin(ex, 'Trunk rotation', 'Square to the ceiling', `${C.deg(-rotSum)} toward the bent knee (mostly thoracic), elbow ${Math.round(elbowKnee)} cm from the opposite knee`);
C.setKin(ex, 'Bent leg', `Hip ${C.deg(poses.set.ch.hip_r.flex)}, knee ${C.deg(C.kneeOf(Ws, 'r'))} (both knees over the hips)`, `Hip ${C.deg(ah.hip_l.flex)}, knee ${C.deg(C.kneeOf(Wa, 'l'))}`);
C.setKin(ex, 'Straight leg', '–', `Hip ${C.deg(ah.hip_r.flex)}, knee ${C.deg(C.kneeOf(Wa, 'r'))}, leg ${C.deg(legDeg(Wa, 'r'))} above the floor`);
C.setKin(ex, 'Tempo', 'Set 0.6 s', 'About 1.2 s per twist with a short pause, 4 twists per 6.4 s loop');
C.finish(ex, rep, 'Air Bike');
