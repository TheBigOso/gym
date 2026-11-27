// Seated Dumbbell Calf Raise (GymVisual #137912): seated on the end of a flat 45 cm bench, trunk tall with a slight forward
// lean, feet flat a little wider than the hips with the shins about vertical. A dumbbell lies across each lower thigh just
// behind the knee (handle on the thigh, plates either side), the hands holding it overhand. Both feet roll up onto the balls
// of the feet (about 1 s), pause (0.8 s)
// and lower slowly (1.8 s); the knees and dumbbells rise and fall with the heels while the pelvis stays on the bench.
// Each foot pivots about a fixed point under the ball of the foot (as in the standing calf raise). Bilateral.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const B3 = require('./families/b3-legs');
const D = require('./families/dumbbell');
const meta = require('./meta/seated-dumbbell-calf-raise.json');

const TOE = 8, HALF = +(process.env.HALF ?? 19), PITCH_TOP = +(process.env.PT ?? 30), SEAT_H = 45;
const SEAT_OFF = +(process.env.SEAT_OFF ?? -2.8), DB_T = +(process.env.DBT ?? 0.8), DB_GAP = +(process.env.DBGAP ?? 0);
const BENCH = clone(meta.props.find((p) => p.kind === 'bench')), SEAT_END = BENCH.center[0] + BENCH.size[0] / 2;
const yawOf = (s) => (s === 'r' ? -TOE : TOE);
const contacts = ['r', 'l'].map((s) => H.legC(s, { rot: H.footQ(0, yawOf(s)), pole: [1, 0.2, s === 'r' ? 0.35 : -0.35] }));
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
// seated trunk: hips and knees about 90, slight forward lean; buttocks on the seat: the rig shapes sit SEAT_OFF cm from the top so
// the skinned athlete's buttocks rest on it (measured with b2/b4cg/mesh.mjs: mesh 3.1 cm above the rig shapes here)
const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => H.bottomOf(W, id)));
let p = clone(st); delete p.ik;
Object.assign(p.ch, { spine_l5: { rot: 0, flex: 3, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 2, latFlex: 0 },
  hip_r: { flex: 90, abd: 12, rot: -10 }, hip_l: { flex: 90, abd: 12, rot: -10 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, neck_c7: { rot: 0, flex: 6 }, head_c1: { rot: 0, flex: 6 } });
p.root.pos = [SEAT_END - 20, 55, 0]; p.root.rot = { pitch: +(process.env.PITCH ?? -6) };
p = L.solvePose(p, ['root.pos.1'], [(W) => [(seatY(W) - SEAT_H - SEAT_OFF) * 3]]).pose;
// feet: flat, shins vertical (ankle under the knee) at the solved hip height
const W0 = L.fk(p);
let FX = r1(W0.knee_r.p[0]);
{ let a = W0.hip_r.p[0] + 20, b = W0.hip_r.p[0] + 70; for (let i = 0; i < 40; i++) { const x = (a + b) / 2, q = clone(p); q.ik = { leg_r: { target: [x, L.ANKLE_H, HALF], weight: 1 } }; const W = L.fk(q, contacts); if (W.knee_r.p[0] > x) a = x; else b = x; } FX = r1((a + b) / 2); }
const ball = { r: F.ballPivot([FX, L.ANKLE_H, HALF], yawOf('r')), l: F.ballPivot([FX, L.ANKLE_H, -HALF], yawOf('l')) };
const HANDLE_R = 1.7; // dumbbell handle radius: the handle lies across the lower thigh, the plates hang either side
function poseAt(pitch) {
  let q = clone(p);
  q.ik = {};
  for (const s of ['r', 'l']) q.ik[`leg_${s}`] = { target: ball[s].ankleFor(pitch), weight: 1, handRot: ball[s].rotFor(pitch) };
  for (const s of ['r', 'l']) q = H.fitLeg(q, s, contacts.find((c) => c.id === `leg_${s}`), q.ik[`leg_${s}`].target, { handRot: q.ik[`leg_${s}`].handRot, rot: -10, abd: 12 });
  // dumbbell across the lower right thigh: handle resting on the thigh surface at DB_T along the thigh
  const W = L.fk(q, contacts), pt = V.add(W.hip_r.p, V.scale(V.sub(W.knee_r.p, W.hip_r.p), DB_T));
  const top = F.surfaceBelow(W, [pt[0], pt[1] + 30, pt[2]], ['thigh_r', 'quad_r']);
  const center = [pt[0], top + HANDLE_R + DB_GAP, pt[2]];
  q.ch.sc_r = { protract: 6, elevate: 0 }; q.ch.sc_l = { protract: 6, elevate: 0 };
  const elbow = V.add(W.shoulder_r.p, JSON.parse(process.env.ELB || '[2,-26,10]'));
  const td = V.sub(W.knee_r.p, W.hip_r.p), axis = V.norm([td[2], 0, -td[0]]); // across the thigh, thumb side medial
  q = F.holdDumbbell(q, { center, axis, palm: [0, -1, 0], elbow, wElbow: 0.2, guess: POSE_GUESS });
  q.__center = center;
  return q;
}
let POSE_GUESS = null;
const N = 10, poses = {}, info = {};
for (let i = 0; i <= N; i++) { const q = poseAt(r1(PITCH_TOP * i / N)); POSE_GUESS = q.__x; info[`p${i}`] = { cost: +q.__cost.toFixed(4), c: q.__center.map(r1) }; delete q.__cost; delete q.__x; delete q.__center; poses[`p${i}`] = q; }
{ const q = poseAt(PITCH_TOP + 0.6); delete q.__cost; delete q.__x; delete q.__center; poses.top2 = q; }
const keyframes = F.raiseKeys(N, { hold: 2.2 });
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [BENCH, B3.heldProp('r'), B3.heldProp('l')];
let ballDrift = 0, heelMax = 0, pelvisDrift = 0;
const Wp0 = L.fk(poses.p0, contacts), heel0 = ball.r.heelY(Wp0, 'r');
const rep = H.loopReport(ex, { probe: (W) => { for (const s of ['r', 'l']) ballDrift = Math.max(ballDrift, ball[s].drift(W, s)); heelMax = Math.max(heelMax, ball.r.heelY(W, 'r') - heel0); pelvisDrift = Math.max(pelvisDrift, V.len(V.sub(W.pelvis.p, Wp0.pelvis.p))); } });
const db = B3.dbLoop(ex, [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }], ['thigh', 'quad', 'forearm', 'upperarm', 'ribcage', 'abdomen'], { box: BENCH });
const Wt = L.fk(poses[`p${N}`], contacts);
const set = H.setKin(ex);
set('Ankle plantarflexion', 'setup', `≈${Math.round(-H.dorsiOf(Wp0, 'r'))}° (feet flat)`); set('Ankle plantarflexion', 'peak', `≈${Math.round(-H.dorsiOf(Wt, 'r'))}° (feet ${PITCH_TOP}° heel-up)`);
set('Heel height', 'setup', '0 cm (heels down)'); set('Heel height', 'peak', `≈${r1(heelMax)} cm`);
set('Knee', 'setup', `≈${Math.round(H.kneeOf(Wp0, 'r'))}°, shins vertical`); set('Knee', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}° (knees ${r1(Wt.knee_r.p[1] - Wp0.knee_r.p[1])} cm higher)`);
set('Dumbbells', 'setup', `Across the lower thighs (${Math.round(DB_T * 100)}% of the way to the knee), held by the handles`); set('Dumbbells', 'peak', `Ride up with the knees (${r1(info[`p${N}`].c[1] - info.p0.c[1])} cm)`);
set('Tempo', 'setup', 'Heels down 0.8 s'); set('Tempo', 'peak', '1.0 s up, 0.8 s pause, 1.8 s down, 0.6 s reset');
ex.checks.measure = { name: 'rootTravel', min: 0, max: 1 };
console.log(`Seated Dumbbell Calf Raise: wrote ${L.write(ex)}  FX ${FX} root ${JSON.stringify(p.root)}\n  ${JSON.stringify(rep)} ${JSON.stringify(db)} ballDrift ${ballDrift.toFixed(3)} heelRise ${r1(heelMax)} pelvisDrift ${pelvisDrift.toFixed(3)}\n  arms ${JSON.stringify(info)} ${JSON.stringify(poses.p0.ch.shoulder_r)} ${JSON.stringify(poses.p0.ch.elbow_r)} ${JSON.stringify(poses.p0.ch.wrist_r)}`);
if (ballDrift > 0.05) { console.error('FAIL: ball of the foot slides'); process.exitCode = 1; }
if (pelvisDrift > 0.05) { console.error('FAIL: pelvis moves on the bench'); process.exitCode = 1; }
if (db.dbFloor < 0) { console.error('FAIL: dumbbell through the floor'); process.exitCode = 1; }
