// Standing Leg Curl (GymVisual #079512): stand tall on the left leg (planted contact) facing a wall, both hands resting on it
// (planted). The right knee bends until the heel comes up toward the buttock (about 115 degrees) with the thigh kept vertical
// (hip near neutral), short squeeze, slow lowering until the toes are just off the floor. Authored on the right leg.
// Built on the bodyweight standing hip extension (stance leg, wall hands).
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const meta = require('./meta/standing-leg-curl.json');

const TOE = 6, HALF = 9, SHIFT_Z = -3.5, KNEE_TOP = 115;
let K0 = 14; // bottom knee bend: solved so the toes hang 1.5 cm off the floor
const contacts = [H.legC('l', { rot: H.footQ(0, TOE) }), H.wallHand('r'), H.wallHand('l')];
const legOnly = [contacts[0]];
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const FOOT_L = [0, L.ANKLE_H, -HALF];
let HAND = null;
// f: 0 = foot under the hip (toes just off the floor), 1 = heel up at KNEE_TOP
function poseAt(f) {
  const p = clone(st);
  p.root.pos = [0, 90, SHIFT_Z]; p.root.rot = { pitch: r1(-1.5 * f) };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 0, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 } });
  p.ch.neck_c7 = { rot: 0, flex: r1(0.6 * f) }; p.ch.head_c1 = { rot: 0, flex: r1(0.6 * f) };
  // moving leg: thigh vertical (hip flexion offsets the small pelvic tip), knee from 12 to KNEE_TOP, ankle relaxed to neutral
  p.ch.hip_r = { flex: r1(4 - 2 * f), abd: 1, rot: 0 }; p.ch.knee_r = { flex: r1(K0 + (KNEE_TOP - K0) * f) }; p.ch.ankle_r = { dorsi: r1(4 - 8 * f) };
  p.ik = { leg_l: { target: FOOT_L.slice(), weight: 1 } };
  let a = 70, b = 100;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, contacts), 'l') > 5) a = y; else b = y; }
  p.root.pos[1] = r1((a + b) / 2);
  p.ch.sc_r = { protract: 6, elevate: 2 }; p.ch.sc_l = { protract: 6, elevate: 2 };
  let q = H.fitLeg(p, 'l', contacts[0], FOOT_L, { rot: -TOE });
  if (HAND) for (const s of ['r', 'l']) { q = H.fitArm(q, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], H.WALL_ARM_GUESS(s)); delete q.__cost; q.ik[`arm_${s}`] = { target: HAND[s].slice(), weight: 1 }; }
  return q;
}
{ let a = 5, b = 60; for (let i = 0; i < 40; i++) { K0 = (a + b) / 2; if (H.bottomOf(L.fk(poseAt(0), legOnly), 'foot_r') < 1.0) a = K0; else b = K0; } K0 = r1(b); }
{ const W = L.fk(poseAt(0), legOnly), S = W.shoulder_r.p; HAND = { r: [r1(S[0] + 51), r1(S[1] - 6), r1(S[2] - 2)], l: [r1(S[0] + 51), r1(S[1] - 6), r1(-(S[2] - 2))] }; }
const WALL_X = r1(HAND.r[0] + H.WALL_PALM);
const poses = { down: poseAt(0), u1: poseAt(0.12), u2: poseAt(0.3), u3: poseAt(0.5), u4: poseAt(0.7), u5: poseAt(0.88), top: poseAt(1), squeeze: poseAt(1.03) };
const keyframes = [{ t: 0, pose: 'down' }, { t: 0.8, pose: 'down' }, { t: 1.0, pose: 'u1' }, { t: 1.2, pose: 'u2' }, { t: 1.4, pose: 'u3' }, { t: 1.6, pose: 'u4' }, { t: 1.8, pose: 'u5' }, { t: 2.0, pose: 'top' }, { t: 2.25, pose: 'squeeze' }, { t: 2.5, pose: 'top' },
  { t: 2.85, pose: 'u5' }, { t: 3.15, pose: 'u4' }, { t: 3.45, pose: 'u3' }, { t: 3.75, pose: 'u2' }, { t: 4.0, pose: 'u1' }, { t: 4.2, pose: 'down' }, { t: 5.0, pose: 'down' }];
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const wall = ex.props.find((p) => p.kind === 'wall'); wall.center = [r1(WALL_X + wall.size[0] / 2), 0, 0];
let footMin = 1e9, heelButt = 1e9;
const rep = H.loopReport(ex, { planted: ['leg_l', 'arm_r', 'arm_l'], probe: (W) => { footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); } });
const Wd = L.fk(poses.down, contacts), Wt = L.fk(poses.top, contacts);
const thighV = (W) => V.angle(V.sub(W.knee_r.p, W.hip_r.p), [0, -1, 0]);
const set = H.setKin(ex);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wd, 'r'))}° (toes just off the floor)`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Hip (thigh)', 'setup', `Thigh ≈${Math.round(thighV(Wd))}° from vertical`); set('Hip (thigh)', 'peak', `Thigh ≈${Math.round(thighV(Wt))}° from vertical (hip flexion ${poses.top.ch.hip_r.flex}°)`);
set('Trunk', 'setup', 'Tall'); set('Trunk', 'peak', `Tall (pelvis tips ${-poses.top.root.rot.pitch}° forward)`);
set('Stance knee', 'setup', `≈${Math.round(H.kneeOf(Wd, 'l'))}°`); set('Stance knee', 'peak', `≈${Math.round(H.kneeOf(Wt, 'l'))}°`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.5 s squeeze, 1.7 s down');
const kt = H.kneeOf(Wt, 'r');
ex.checks.measure = { name: 'kneeFlexion', min: Math.floor(kt - 3), max: Math.ceil(kt + 6) };
console.log(`Standing Leg Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR min ${footMin.toFixed(2)} knee ${r1(H.kneeOf(Wd, 'r'))}..${r1(kt)} thigh ${r1(thighV(Wt))}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot or hand slides'); process.exitCode = 1; }
