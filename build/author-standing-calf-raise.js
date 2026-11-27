// Standing Calf Raise (GymVisual #301812): feet hip width, toes forward, fingertips resting lightly on a wall for balance. Both feet roll up onto the
// balls of the feet (about 1 s), pause at the top (0.8 s), lower slowly (1.8 s) until the heels are back on the floor.
// Each foot pivots about a fixed point under the ball of the foot (a material point on the sole of the rig foot): per key the
// ankle IK target follows the arc around that point and the foot orientation (ik handRot) carries the heel-up pitch, so the
// ball stays put while the heel rises about 11 cm and comes back down. Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const meta = require('./meta/standing-calf-raise.json');

const TOE = 5, HALF = 9.5, PITCH_TOP = 34;
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const yawOf = (s) => (s === 'r' ? -TOE : TOE);
const contacts = ['r', 'l'].map((s) => H.legC(s, { rot: H.footQ(0, yawOf(s)) })).concat([H.wallHand('r'), H.wallHand('l')]);
const legOnly = contacts.slice(0, 2);
// Ball pivot: the sole point 14 cm in front of the ankle (foot-local), found on the rig foot ellipsoid
const footShape = rig.shapes.find((x) => x.id === 'foot_r');
const BALL_LX = 14, solY = (lx) => footShape.c[1] - footShape.r[1] * Math.sqrt(1 - ((lx - footShape.c[0]) / footShape.r[0]) ** 2);
const B_LOCAL = [BALL_LX, solY(BALL_LX), 0]; // ankle-local (foot frame)
const ANK = { r: [0, L.ANKLE_H, HALF], l: [0, L.ANKLE_H, -HALF] };
const ballWorld = (s, pitch) => V.add(ANK[s], Q.rot(H.footQ(pitch, yawOf(s)), B_LOCAL)); // pitch 0: flat
const B = { r: ballWorld('r', 0), l: ballWorld('l', 0) };
// ankle target for a heel-up pitch: rotate the foot about the fixed ball point
const ankleFor = (s, pitch) => { const q = H.footQ(pitch, yawOf(s)); return V.sub(B[s], Q.rot(q, B_LOCAL)).map((v) => +v.toFixed(3)); };
const easeIO = (f) => f * f * (3 - 2 * f);
function poseAt(pitch) {
  const p = clone(st), f = pitch / PITCH_TOP;
  p.ik = {};
  for (const s of ['r', 'l']) p.ik[`leg_${s}`] = { target: ankleFor(s, pitch), weight: 1, handRot: H.qArr(H.footQ(pitch, yawOf(s))) };
  // body rides forward over the balls of the feet with the ankles (plus a little lean); knees soft (4 degrees)
  const dx = p.ik.leg_r.target[0] + 2.5 * f;
  p.root.pos = [r1(dx * 10) / 10, 90, 0]; p.root.rot = { pitch: r1(-1.5 * f) };
  p.ch.neck_c7 = { rot: 0, flex: r1(0.6 * f) }; p.ch.head_c1 = { rot: 0, flex: r1(0.7 * f) };
  let a = 70, b = 110;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, legOnly), 'r') > 4) a = y; else b = y; }
  p.root.pos[1] = +((a + b) / 2).toFixed(2);
  let q = p;
  for (const s of ['r', 'l']) q = H.fitLeg(q, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target, { handRot: p.ik[`leg_${s}`].handRot, rot: -TOE });
  q.ch.sc_r = { protract: 5, elevate: 0 }; q.ch.sc_l = { protract: 5, elevate: 0 };
  if (HAND) for (const s of ['r', 'l']) { q = H.fitArm(q, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], H.WALL_ARM_GUESS(s)); delete q.__cost; q.ik[`arm_${s}`] = { target: HAND[s].slice(), weight: 1 }; }
  return q;
}
// Fingertips resting lightly on a wall in front at about chest height for balance (planted hand contacts): elbows soft
// (about 40 degrees) on the rig arm, the wall at the palm face of the rig hand shape
let HAND = null;
{ const W = L.fk(poseAt(0), legOnly), S = W.shoulder_r.p; HAND = H.wallHandTargets(S, { flex: 40, drop: 16, inset: 3 }); }
// keys every ~3.4 degrees of foot pitch so the ankle's arc about the ball is followed closely between keys
const N = 10, poses = {}, keyframes = [{ t: 0, pose: 'p0' }, { t: 0.8, pose: 'p0' }];
for (let i = 0; i <= N; i++) poses[`p${i}`] = poseAt(r1(PITCH_TOP * i / N));
const WALL_X = H.wallFaceX(poses.p0, contacts); // palm face of the rig hand shape
poses.top2 = poseAt(PITCH_TOP + 0.6);
const RISE = [0.8, 1.8], LOWER = [2.6, 4.4];
const tAt = (span, f) => +(span[0] + (span[1] - span[0]) * f).toFixed(3);
const inv = (y) => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (easeIO(m) < y) a = m; else b = m; } return (a + b) / 2; }; // time fraction for a pitch fraction
for (let i = 1; i <= N; i++) keyframes.push({ t: tAt(RISE, inv(i / N)), pose: `p${i}` });
keyframes.push({ t: 2.2, pose: 'top2' });
keyframes.push({ t: LOWER[0], pose: `p${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: tAt(LOWER, inv(1 - i / N)), pose: `p${i}` });
keyframes.push({ t: 5.0, pose: 'p0' });

const ex = H.module_(meta, contacts, poses, keyframes);
const wall = ex.props.find((p) => p.kind === 'wall'); wall.center = [r1(WALL_X + wall.size[0] / 2), 0, 0];
// Loop scan: the ball point (sole point under the ball of the foot) must not move; heel height; ankle angle
let ballDrift = 0, heelMax = 0;
const heelY = (W, s) => { const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === `foot_${s}`)); return V.add(g.c, V.scale(g.axes[0], -1))[1]; }; // rear tip of the foot shape
const heel0 = heelY(L.fk(poses.p0, contacts), 'r');
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W, pz) => { for (const s of ['r', 'l']) { const bp = V.add(W[`ankle_${s}`].p, Q.rot(W[`ankle_${s}`].q, B_LOCAL)); ballDrift = Math.max(ballDrift, V.len(V.sub(bp, B[s]))); } heelMax = Math.max(heelMax, heelY(W, 'r') - heel0); } });
const W0 = L.fk(poses.p0, contacts), Wt = L.fk(poses[`p${N}`], contacts);
const set = H.setKin(ex);
set('Ankle plantarflexion', 'setup', `≈${Math.round(-H.dorsiOf(W0, 'r'))}° (foot flat)`); set('Ankle plantarflexion', 'peak', `≈${Math.round(-H.dorsiOf(Wt, 'r'))}° (foot ${PITCH_TOP}° heel-up)`);
set('Heel height', 'setup', '0 cm (heels down)'); set('Heel height', 'peak', `≈${r1(heelMax)} cm`);
set('Knee', 'setup', `≈${Math.round(H.kneeOf(W0, 'r'))}°`); set('Knee', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Stance width', 'setup', `${2 * HALF} cm between ankle centres, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged; balls of the feet stay planted');
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.0 s up, 0.8 s pause, 1.8 s down, 0.6 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, W0.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Standing Calf Raise: ball ${B.r.map(r1)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} ballDrift ${ballDrift.toFixed(3)} heelRise ${r1(heelMax)} travel ${r1(travel)} rootY ${poses.p0.root.pos[1]}..${poses[`p${N}`].root.pos[1]}`);
if (rep.slide > 0.05) { console.error('FAIL: planted hand slides'); process.exitCode = 1; }
if (ballDrift > 0.05) { console.error('FAIL: ball of the foot slides'); process.exitCode = 1; }
if (heelMax < 5) { console.error('FAIL: heels do not leave the floor'); process.exitCode = 1; }
