// Bodyweight Standing Hip Extension (GymVisual #646212): stand tall on the left leg (planted contact), hands lightly on a wall. The
// straight right leg sweeps back from the hip to about 19 degrees of hip extension (rig limit 20) while the pelvis tips
// forward only about 6 degrees and the low back stays neutral (no spinal extension); short squeeze, controlled return
// with the toes just off the floor. Authored on the right leg.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const meta = require('./meta/standing-hip-extension.json');

const TOE = 6, HALF = 9;
// Hands lightly on a wall in front at about shoulder height (palms on the wall, fingers up): planted hand contacts
const contacts = [H.legC('l', { rot: H.footQ(0, TOE) }), H.wallHand('r'), H.wallHand('l')];
const legOnly = [contacts[0]];
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const FOOT_L = [0, L.ANKLE_H, -HALF];
const SHIFT_Z = -3.5; // pelvis over the stance foot

// f: 0 = leg under the hip, 1 = full extension. Trunk tips forward with the pelvis (spine stays neutral, no lumbar arch).
const HIP_EXT = -19, PITCH = -6;
const REST_PITCH = Math.atan2(5, 16) / R.DEG; // toe joint sits 5 cm below the ankle when the foot is flat
function poseAt(f, extra = {}) {
  const p = clone(st);
  const g = f; // channel progress
  p.root.pos = [r1(1.5 * g), 90, SHIFT_Z]; p.root.rot = { pitch: r1(PITCH * g) };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 0, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 } });
  const lean = -PITCH * g; p.ch.neck_c7 = { rot: 0, flex: r1(-lean * 0.4) }; p.ch.head_c1 = { rot: 0, flex: r1(-lean * 0.45) };
  // moving leg: straight knee (soft at the start), toes relaxed down as it goes back
  p.ch.hip_r = { flex: r1(4 + (HIP_EXT - 4) * g), abd: 1, rot: 0 }; p.ch.knee_r = { flex: r1(12 + (3 - 12) * g) }; p.ch.ankle_r = { dorsi: r1(-6 - 14 * g) };
  Object.assign(p.ch, extra);
  p.ik = { leg_l: { target: FOOT_L.slice(), weight: 1 } };
  // stance knee soft (about 5 degrees): root height by bisection
  let a = 70, b = 100;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, contacts), 'l') > 5) a = y; else b = y; }
  p.root.pos[1] = r1((a + b) / 2);
  // moving foot: toes pitched down by TOES_DOWN (world), and at least 1.5 cm clear of the floor (bend the knee a bit more
  // where the straight leg would scuff)
  const toesDown = 4 + 16 * g;
  const pitchOf = (W) => Math.atan2(-(W.toe_r.p[1] - W.ankle_r.p[1]), Math.hypot(W.toe_r.p[0] - W.ankle_r.p[0], W.toe_r.p[2] - W.ankle_r.p[2])) / R.DEG - REST_PITCH;
  const setAnkle = () => { let d0 = -60, d1 = 30; for (let i = 0; i < 40; i++) { const d = (d0 + d1) / 2; p.ch.ankle_r.dorsi = d; if (pitchOf(L.fk(p, contacts)) > toesDown) d0 = d; else d1 = d; } p.ch.ankle_r.dorsi = r1((d0 + d1) / 2); };
  setAnkle();
  if (H.bottomOf(L.fk(p, contacts), 'foot_r') < 1.5) { let k0 = p.ch.knee_r.flex, k1 = 45; for (let i = 0; i < 40; i++) { p.ch.knee_r.flex = (k0 + k1) / 2; setAnkle(); if (H.bottomOf(L.fk(p, contacts), 'foot_r') < 1.5) k0 = p.ch.knee_r.flex; else k1 = p.ch.knee_r.flex; } p.ch.knee_r.flex = r1(k1 + 0.1); setAnkle(); }
  p.ch.sc_r = { protract: 6, elevate: 2 }; p.ch.sc_l = { protract: 6, elevate: 2 };
  let q = H.fitLeg(p, 'l', contacts[0], FOOT_L, { rot: -TOE });
  if (HAND) for (const s of ['r', 'l']) { q = H.fitArm(q, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], H.WALL_ARM_GUESS(s)); delete q.__cost; q.ik[`arm_${s}`] = { target: HAND[s].slice(), weight: 1 }; }
  return q;
}
// Hand targets from the standing pose: in front of the shoulders at about shoulder height, elbows soft
let HAND = null;
{ const W = L.fk(poseAt(0), legOnly), S = W.shoulder_r.p; HAND = H.wallHandTargets(S, { flex: 40 }); }

const poses = { stand: poseAt(0), e25: poseAt(0.25), e50: poseAt(0.5), e75: poseAt(0.75), back: poseAt(1), hold: poseAt(1.02), r60: poseAt(0.6), r25: poseAt(0.25), near: poseAt(0.04) };
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.1, pose: 'e25' }, { t: 1.4, pose: 'e50' }, { t: 1.7, pose: 'e75' }, { t: 2.0, pose: 'back' }, { t: 2.3, pose: 'hold' }, { t: 2.6, pose: 'back' },
  { t: 3.1, pose: 'r60' }, { t: 3.6, pose: 'r25' }, { t: 4.0, pose: 'near' }, { t: 4.4, pose: 'stand' }, { t: 5.0, pose: 'stand' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const WALL_X = H.wallFaceX(poses[Object.keys(poses)[0]], contacts); // palm face of the rig hand shape
const wall = ex.props.find((p) => p.kind === 'wall'); wall.center = [r1(WALL_X + wall.size[0] / 2), 0, 0];
let toeMin = 1e9, trunkMax = 0;
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const rep = H.loopReport(ex, { planted: ['leg_l', 'arm_r', 'arm_l'], probe: (W) => { toeMin = Math.min(toeMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, trunkLean(W)); } });
const Ws = L.fk(poses.stand, contacts), Wb = L.fk(poses.back, contacts);
const thigh = (W) => V.angle(V.sub(W.knee_r.p, W.hip_r.p), [0, -1, 0]) * Math.sign(-(W.knee_r.p[0] - W.hip_r.p[0]) || 1);
const set = H.setKin(ex);
set('Hip extension', 'setup', `≈${Math.round(-poses.stand.ch.hip_r.flex)}° (hip flexion ${poses.stand.ch.hip_r.flex}°)`); set('Hip extension', 'peak', `≈${Math.round(-poses.back.ch.hip_r.flex)}° (joint channel; rig limit 20°)`);
set('Thigh behind vertical', 'setup', `≈${Math.round(thigh(Ws))}°`); set('Thigh behind vertical', 'peak', `≈${Math.round(thigh(Wb))}° (hip extension plus ${-PITCH}° pelvic tip)`);
const leanX = (W) => Math.atan2(W.neck_c7.p[0] - W.pelvis.p[0], W.neck_c7.p[1] - W.pelvis.p[1]) / R.DEG; // signed, + = forward
set('Trunk inclination', 'setup', 'Tall (reference posture)'); set('Trunk inclination', 'peak', `≈${Math.round(leanX(Wb) - leanX(Ws))}° forward of the standing posture with the pelvis; spine channels at 0 (no lumbar extension)`);
set('Knee', 'setup', `Moving knee ≈${Math.round(H.kneeOf(Ws, 'r'))}°, stance ≈${Math.round(H.kneeOf(Ws, 'l'))}°`); set('Knee', 'peak', `Moving knee ≈${Math.round(H.kneeOf(Wb, 'r'))}°`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.2 s back, 0.6 s hold, 1.4 s return');
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: Math.ceil(trunkMax + 2) };
console.log(`Standing Hip Extension: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR min ${toeMin.toFixed(2)} trunk max ${trunkMax.toFixed(1)} thigh ${r1(thigh(Wb))} rootY ${poses.stand.root.pos[1]}/${poses.back.root.pos[1]}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
