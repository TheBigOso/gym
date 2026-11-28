// Standing Side Leg Raise (GymVisual #9132, movement reference only; page not readable here). Standing hip abduction with
// body weight: stand tall on the left leg (planted contact), hands on the hips. The straight right leg lifts out to the
// side to about 35 degrees of hip abduction with the toes pointing forward; the trunk stays tall, tipping only a few
// degrees toward the stance side as the pelvis hitches. Short pause, controlled return with the foot just off the floor.
// Authored on the right leg; the player mirrors it. Built on hips.js (as standing-hip-extension).
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const meta = require('./meta/standing-side-leg-raise.json');

const TOE = 6, HALF = 9;
const contacts = [H.legC('l', { rot: H.footQ(0, TOE) })];
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const FOOT_L = [0, L.ANKLE_H, -HALF];
const SHIFT_Z = -4; // pelvis over the stance foot
const ABD = +(process.env.ABD || 33), ROLL = +(process.env.ROLL || -4);
let ARMS = null;
// f: 0 = leg under the hip, 1 = full abduction. Root roll tips the pelvis and trunk a little toward the stance side.
function poseAt(f) {
  const p = clone(st);
  p.root.pos = [0, 90, r1(SHIFT_Z - 1 * f)]; p.root.rot = { yaw: 0, pitch: 0, roll: r1(ROLL * f) };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 0, latFlex: r1(-1.5 * f) }, spine_t12: { rot: 0, flex: 0, latFlex: r1(-1.5 * f) }, spine_t6: { rot: 0, flex: 0, latFlex: 0 } });
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 0 };
  p.ch.hip_r = { flex: r1(12 - 8 * f), abd: r1(3 + (ABD - 3) * f), rot: 0 }; p.ch.knee_r = { flex: r1(28 - 24 * f) }; p.ch.ankle_r = { dorsi: r1(14 - 22 * f) };
  p.ik = { leg_l: { target: FOOT_L.slice(), weight: 1 } };
  // stance knee soft (about 5 degrees): root height by bisection
  let a = 70, b = 100;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, contacts), 'l') > 5) a = y; else b = y; }
  p.root.pos[1] = r1((a + b) / 2);
  if (ARMS) Object.assign(p.ch, clone(ARMS));
  return H.fitLeg(p, 'l', contacts[0], FOOT_L, { rot: -TOE });
}
{ const q = H.handsOnHips(poseAt(0)); ARMS = {}; for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) for (const s of ['r', 'l']) ARMS[`${j}_${s}`] = q.ch[`${j}_${s}`]; }
const poses = { stand: poseAt(0), a25: poseAt(0.3), a60: poseAt(0.65), top: poseAt(1), hold: poseAt(1.03), r50: poseAt(0.5), near: poseAt(0.06) };
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.7, pose: 'stand' }, { t: 1.05, pose: 'a25' }, { t: 1.4, pose: 'a60' }, { t: 1.8, pose: 'top' }, { t: 2.3, pose: 'hold' }, { t: 3.1, pose: 'r50' }, { t: 3.7, pose: 'near' }, { t: 4.1, pose: 'stand' }, { t: 4.6, pose: 'stand' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const legAbd = (W) => V.angle(V.sub(W.ankle_r.p, W.hip_r.p), [0, -1, 0]);
let footMin = 1e9, trunkMax = 0, legMax = 0;
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const rep = H.loopReport(ex, { planted: ['leg_l'], probe: (W, pz, t) => { if (t > 0.9 && t < 3.6) footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, trunkLean(W)); legMax = Math.max(legMax, legAbd(W)); } });
const Ws = L.fk(poses.stand, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex);
set('Hip abduction', 'setup', `≈${Math.round(poses.stand.ch.hip_r.abd)}°`); set('Hip abduction', 'peak', `≈${Math.round(poses.top.ch.hip_r.abd)}° (joint channel)`);
set('Leg from vertical', 'setup', `≈${Math.round(legAbd(Ws))}°`); set('Leg from vertical', 'peak', `≈${Math.round(legAbd(Wt))}° (hip abduction plus ${-ROLL}° pelvic hitch)`);
set('Trunk', 'setup', 'Tall'); set('Trunk', 'peak', `≈${Math.round(trunkLean(Wt))}° from vertical toward the stance side`);
set('Knee', 'setup', `Moving knee ≈${Math.round(H.kneeOf(Ws, 'r'))}°, stance ≈${Math.round(H.kneeOf(Ws, 'l'))}°`); set('Knee', 'peak', `Moving knee ≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Tempo', 'setup', 'Stand 0.7 s'); set('Tempo', 'peak', '1.1 s out, 0.5 s pause, 1.8 s return');
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: Math.ceil(trunkMax + 2) };
console.log(`Standing Side Leg Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR min ${footMin.toFixed(2)} trunk max ${trunkMax.toFixed(1)} leg ${legMax.toFixed(1)} stanceL hip ${JSON.stringify(poses.top.ch.hip_l)} pelvisZ ${Wt.pelvis.p[2].toFixed(1)}`);
const bad = [rep.slide > 0.05 && 'planted foot slides', rep.floor < -0.5 && 'below floor', footMin < 1 && 'moving foot scuffs', (legMax < 33 || legMax > 48) && `leg ${legMax}`].filter(Boolean);
for (const [n, p] of Object.entries(poses)) for (const j in p.ch) { const lim = L.rig.byId[j] && L.rig.byId[j].limits; if (lim) for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) bad.push(`${n}.${j}.${c}`); }
if (bad.length) { console.error('FAIL standing-side-leg-raise: ' + bad.join(', ')); process.exitCode = 1; }
