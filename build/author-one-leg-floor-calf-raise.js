// One Leg Floor Calf Raise (GymVisual #9005; page not readable here, movement from the name): body-weight single-leg calf
// raise on flat floor. Stand on the right foot with both hands resting lightly on a wall in front for balance (planted hand
// contacts), left knee bent with the foot lifted behind. The right foot rolls up onto the ball of the foot (about 1 s),
// pauses at the top (0.8 s) and lowers slowly (1.8 s), pivoting about a fixed point under the ball of the foot (per key
// the ankle IK target follows the arc about that point). Built as author-single-leg-dumbbell-calf-raise.js without the
// dumbbell. authoredSide 'right' (the player mirrors).
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const B = require('./families/b3-legs');
const F = require('./families/b4-calvesglutes');
const meta = require('./meta/one-leg-floor-calf-raise.json');

const TOE = 5, HALF = 9.5, PITCH_TOP = 33, ROOT_Z = 5.5;
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const contacts = [H.legC('r', { rot: H.footQ(0, -TOE) }), H.wallHand('l'), H.wallHand('r')];
const legOnly = contacts.slice(0, 1);
const ball = F.ballPivot([0, L.ANKLE_H, HALF], -TOE);
let HAND = null;
function poseAt(pitch) {
  const p = clone(st), f = pitch / PITCH_TOP;
  p.ik = { leg_r: { target: ball.ankleFor(pitch), weight: 1, handRot: ball.rotFor(pitch) } };
  const dx = p.ik.leg_r.target[0] + 2.5 * f;
  p.root.pos = [r1(dx * 10) / 10, 90, ROOT_Z]; p.root.rot = { pitch: r1(-1.5 * f), roll: 0 };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 0, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 } });
  p.ch.neck_c7 = { rot: 0, flex: r1(0.6 * f) }; p.ch.head_c1 = { rot: 0, flex: r1(0.7 * f) };
  // free (left) leg: knee bent, foot lifted behind the standing calf
  p.ch.hip_l = { flex: 6, abd: -2, rot: 0 }; p.ch.knee_l = { flex: 75 }; p.ch.ankle_l = { dorsi: -25 };
  let a = 70, b = 110;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, legOnly), 'r') > 4) a = y; else b = y; }
  p.root.pos[1] = +((a + b) / 2).toFixed(2);
  let q = H.fitLeg(p, 'r', contacts[0], p.ik.leg_r.target, { handRot: p.ik.leg_r.handRot, rot: -TOE });
  // both hands go to the wall
  const hl = clone(q.ch.hip_l), kl = clone(q.ch.knee_l), al = clone(q.ch.ankle_l);
  q = B.armsHang(q, { out: 9 }); delete q.__armCost;
  q.ch.hip_l = hl; q.ch.knee_l = kl; q.ch.ankle_l = al;
  q.ch.sc_l = { protract: 6, elevate: 2 }; q.ch.sc_r = { protract: 6, elevate: 2 };
  if (HAND) {
    q = H.fitArm(q, 'l', contacts[1], HAND.l, H.WALL_ARM_GUESS('l')); delete q.__cost; q.ik.arm_l = { target: HAND.l.slice(), weight: 1 };
    q = H.fitArm(q, 'r', contacts[2], HAND.r, H.WALL_ARM_GUESS('r')); delete q.__cost; q.ik.arm_r = { target: HAND.r.slice(), weight: 1 };
  }
  return q;
}
// left fingertips on the wall for balance: elbow soft (about 40 degrees) on the rig arm, the wall at the rig hand's palm face
{ const W = L.fk(poseAt(0), legOnly), Sl = W.shoulder_l.p, Sr = W.shoulder_r.p, o = { flex: 40, drop: 14, inset: 3 };
  HAND = { l: H.wallHandTargets([Sl[0], Sl[1], -Sl[2]], o).l, r: H.wallHandTargets(Sr, o).r };
  HAND.r[0] = HAND.l[0] = Math.max(HAND.l[0], HAND.r[0]); }
const N = 10, poses = {};
for (let i = 0; i <= N; i++) poses[`p${i}`] = poseAt(r1(PITCH_TOP * i / N));
const WALL_X = H.wallFaceX(poses.p0, contacts); // palm face of the rig hand shape
poses.top2 = poseAt(PITCH_TOP + 0.6);
const keyframes = F.raiseKeys(N, { hold: 2.2 });
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const wall = ex.props.find((p) => p.kind === 'wall'); wall.center = [r1(WALL_X + wall.size[0] / 2), 0, 0];
ex.props = [wall];
let ballDrift = 0, heelMax = 0;
const heel0 = ball.heelY(L.fk(poses.p0, contacts), 'r');
const rep = H.loopReport(ex, { planted: ['arm_l', 'arm_r'], probe: (W) => { ballDrift = Math.max(ballDrift, ball.drift(W, 'r')); heelMax = Math.max(heelMax, ball.heelY(W, 'r') - heel0); } });
const W0 = L.fk(poses.p0, contacts), Wt = L.fk(poses[`p${N}`], contacts);
const set = H.setKin(ex);
set('Ankle plantarflexion', 'setup', `≈${Math.round(-H.dorsiOf(W0, 'r'))}° (foot flat)`); set('Ankle plantarflexion', 'peak', `≈${Math.round(-H.dorsiOf(Wt, 'r'))}° (foot ${PITCH_TOP}° heel-up)`);
set('Heel height', 'setup', '0 cm (heel down)'); set('Heel height', 'peak', `≈${r1(heelMax)} cm`);
set('Knee', 'setup', `Standing knee ≈${Math.round(H.kneeOf(W0, 'r'))}°, free knee ≈${Math.round(H.kneeOf(W0, 'l'))}°`); set('Knee', 'peak', `Standing knee ≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Support', 'setup', 'Both hands lightly on the wall'); set('Support', 'peak', 'Unchanged; the wall hands stay planted');
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.0 s up, 0.8 s pause, 1.8 s down, 0.6 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, W0.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`One Leg Floor Calf Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} ballDrift ${ballDrift.toFixed(3)} heelRise ${r1(heelMax)} travel ${r1(travel)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted hand slides'); process.exitCode = 1; }
if (ballDrift > 0.05) { console.error('FAIL: ball of the foot slides'); process.exitCode = 1; }
