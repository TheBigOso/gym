// Dumbbell Seated One Leg Calf Raise (GymVisual #1901; page not readable here, movement from the name): seated on the end of
// a flat 45 cm bench, trunk tall with a slight forward lean, feet flat a little wider than the hips, shins about vertical. One
// dumbbell lies across the lower right thigh just behind the knee, held overhand by the right hand; the left hand rests on the
// left thigh. The right foot rolls up onto the ball of the foot (about 1 s), pauses and lowers slowly (1.8 s); the right knee
// and the dumbbell rise and fall with the heel while the pelvis stays on the bench and the left foot stays flat (planted).
// The right foot pivots about a fixed point under the ball of the foot. Authored right (the player mirrors). Seated set-up
// and helpers as in author-seated-dumbbell-calf-raise.js (b4-calvesglutes.js ballPivot, holdDumbbell, raiseKeys).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const B3 = require('./families/b3-legs');
const meta = require('./meta/dumbbell-seated-one-leg-calf-raise.json');

const TOE = 8, HALF = 19, PITCH_TOP = 30, SEAT_H = 45, SEAT_OFF = -2.8, DB_T = 0.8, HANDLE_R = 1.7;
const BENCH = clone(meta.props.find((p) => p.kind === 'bench')), SEAT_END = BENCH.center[0] + BENCH.size[0] / 2;
const yawOf = (s) => (s === 'r' ? -TOE : TOE);
const contacts = ['r', 'l'].map((s) => H.legC(s, { rot: H.footQ(0, yawOf(s)), pole: [1, 0.2, s === 'r' ? 0.35 : -0.35] }));
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => H.bottomOf(W, id)));
let p = clone(st); delete p.ik;
Object.assign(p.ch, { spine_l5: { rot: 0, flex: 3, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 2, latFlex: 0 },
  hip_r: { flex: 90, abd: 12, rot: -10 }, hip_l: { flex: 90, abd: 12, rot: -10 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, neck_c7: { rot: 0, flex: 6 }, head_c1: { rot: 0, flex: 6 } });
p.root.pos = [SEAT_END - 20, 55, 0]; p.root.rot = { pitch: -6 };
p = L.solvePose(p, ['root.pos.1'], [(W) => [(seatY(W) - SEAT_H - SEAT_OFF) * 3]]).pose;
const W0 = L.fk(p);
let FX;
{ let a = W0.hip_r.p[0] + 20, b = W0.hip_r.p[0] + 70; for (let i = 0; i < 40; i++) { const x = (a + b) / 2, q = clone(p); q.ik = { leg_r: { target: [x, L.ANKLE_H, HALF], weight: 1 } }; const W = L.fk(q, contacts); if (W.knee_r.p[0] > x) a = x; else b = x; } FX = r1((a + b) / 2); }
const ball = F.ballPivot([FX, L.ANKLE_H, HALF], yawOf('r'));
const LEFT = [FX, L.ANKLE_H, -HALF];
const thighTop = (W, s, t) => { const pt = V.add(W[`hip_${s}`].p, V.scale(V.sub(W[`knee_${s}`].p, W[`hip_${s}`].p), t)); return [pt, F.surfaceBelow(W, [pt[0], pt[1] + 30, pt[2]], [`thigh_${s}`, `quad_${s}`])]; };
let GUESS = null, leftArm = null;
function poseAt(pitch) {
  let q = clone(p);
  q.ik = { leg_r: { target: ball.ankleFor(pitch), weight: 1, handRot: ball.rotFor(pitch) }, leg_l: { target: LEFT, weight: 1 } };
  q = H.fitLeg(q, 'r', contacts[0], q.ik.leg_r.target, { handRot: q.ik.leg_r.handRot, rot: -10, abd: 12 });
  q = H.fitLeg(q, 'l', contacts[1], LEFT, { rot: -10, abd: 12 });
  const W = L.fk(q, contacts), [pt, top] = thighTop(W, 'r', DB_T), center = [pt[0], top + HANDLE_R, pt[2]];
  q.ch.sc_r = { protract: 6, elevate: 0 }; q.ch.sc_l = { protract: 6, elevate: 0 };
  const elbow = V.add(W.shoulder_r.p, [2, -26, 10]), td = V.sub(W.knee_r.p, W.hip_r.p), axis = V.norm([td[2], 0, -td[0]]);
  const keepL = leftArm && { shoulder_l: clone(leftArm.shoulder_l), elbow_l: clone(leftArm.elbow_l), wrist_l: clone(leftArm.wrist_l) };
  q = F.holdDumbbell(q, { center, axis, palm: [0, -1, 0], elbow, wElbow: 0.2, guess: GUESS });
  GUESS = q.__x;
  if (keepL) Object.assign(q.ch, keepL);
  q.__center = center;
  return q;
}
// left hand: resting on the left thigh (the mirrored dumbbell grip, lowered by the handle radius so the palm meets the thigh)
{
  const q = clone(p); q.ik = { leg_l: { target: LEFT, weight: 1 } };
  const ql = H.fitLeg(q, 'l', contacts[1], LEFT, { rot: -10, abd: 12 }), Wl = L.fk(ql, contacts);
  const [pt, top] = thighTop(Wl, 'l', 0.72), mz = (v) => [v[0], v[1], -v[2]];
  const td = V.sub(Wl.knee_l.p, Wl.hip_l.p), axis = V.norm([-td[2], 0, td[0]]);
  const r = F.holdDumbbell(ql, { center: mz([pt[0], top + 2.3, pt[2]]), axis: mz(axis), palm: [0, -1, 0], elbow: V.add(mz(Wl.shoulder_l.p), [2, -26, 10]), wElbow: 0.2 });
  leftArm = { shoulder_l: r.ch.shoulder_r, elbow_l: r.ch.elbow_r, wrist_l: r.ch.wrist_r, cost: r.__cost };
}
const N = 10, poses = {}, info = {};
for (let i = 0; i <= N; i++) { const q = poseAt(r1(PITCH_TOP * i / N)); info[`p${i}`] = { cost: +q.__cost.toFixed(4), c: q.__center.map(r1) }; delete q.__cost; delete q.__x; delete q.__center; poses[`p${i}`] = q; }
{ const q = poseAt(PITCH_TOP + 0.6); delete q.__cost; delete q.__x; delete q.__center; poses.top2 = q; }
const keyframes = F.raiseKeys(N, { hold: 2.2 });
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [BENCH, B3.heldProp('r')];
let ballDrift = 0, heelMax = 0, pelvisDrift = 0, handL = 1e9;
const Wp0 = L.fk(poses.p0, contacts), heel0 = ball.heelY(Wp0, 'r');
const rep = H.loopReport(ex, { probe: (W) => { ballDrift = Math.max(ballDrift, ball.drift(W, 'r')); heelMax = Math.max(heelMax, ball.heelY(W, 'r') - heel0); pelvisDrift = Math.max(pelvisDrift, V.len(V.sub(W.pelvis.p, Wp0.pelvis.p))); } });
const db = B3.dbLoop(ex, [{ side: 'r', grip: 'handle' }], ['thigh', 'quad', 'forearm', 'upperarm', 'ribcage', 'abdomen'], { box: BENCH });
const Wt = L.fk(poses[`p${N}`], contacts);
const lhGap = r1(H.bottomOf(Wp0, 'hand_l') - thighTop(Wp0, 'l', 0.72)[1]);
const set = H.setKin(ex);
set('Ankle plantarflexion', 'setup', `≈${Math.round(-H.dorsiOf(Wp0, 'r'))}° (foot flat)`); set('Ankle plantarflexion', 'peak', `≈${Math.round(-H.dorsiOf(Wt, 'r'))}° (right foot ${PITCH_TOP}° heel-up)`);
set('Heel height', 'setup', '0 cm (heel down)'); set('Heel height', 'peak', `≈${r1(heelMax)} cm`);
set('Knee', 'setup', `≈${Math.round(H.kneeOf(Wp0, 'r'))}°, shins vertical`); set('Knee', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}° (right knee ${r1(Wt.knee_r.p[1] - Wp0.knee_r.p[1])} cm higher)`);
set('Dumbbell', 'setup', `Across the lower right thigh (${Math.round(DB_T * 100)}% of the way to the knee), held by the handle; left hand on the left thigh`); set('Dumbbell', 'peak', `Rides up with the knee (${r1(info[`p${N}`].c[1] - info.p0.c[1])} cm)`);
set('Tempo', 'setup', 'Heel down 0.8 s'); set('Tempo', 'peak', '1.0 s up, 0.8 s pause, 1.8 s down, 0.6 s reset');
ex.checks.measure = { name: 'rootTravel', min: 0, max: 1 };
console.log(`Dumbbell Seated One Leg Calf Raise: wrote ${L.write(ex)}  FX ${FX}\n  ${JSON.stringify(rep)} ${JSON.stringify(db)} ballDrift ${ballDrift.toFixed(3)} heelRise ${r1(heelMax)} pelvisDrift ${pelvisDrift.toFixed(3)} left hand gap ${lhGap} cost ${leftArm.cost.toFixed(3)}\n  arms ${JSON.stringify(info)}`);
if (ballDrift > 0.05) { console.error('FAIL: ball of the foot slides'); process.exitCode = 1; }
if (pelvisDrift > 0.05) { console.error('FAIL: pelvis moves on the bench'); process.exitCode = 1; }
if (db.dbFloor < 0) { console.error('FAIL: dumbbell through the floor'); process.exitCode = 1; }
