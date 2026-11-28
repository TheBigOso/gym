// Hip Raise, bent knee (GymVisual #5062; page not readable here, movement from the name: the bent-knee hip raise of the
// abdominal series, done through the full range from the floor). Bilateral: supine on a mat, arms by the sides palms down
// (planted hands), knees bent with the feet resting flat on the mat. Lift the feet and bring the thighs to vertical, then
// keep going by curling the pelvis up off the mat so the knees travel toward the chest; pause, roll the pelvis down slowly
// and lower the feet until they just touch the mat. Unlike the reverse crunch (which stays at 90/90 between reps) each rep
// starts and ends with the feet on the floor. Upper back, shoulders and head stay down (pelvis curl about a locked T6).
const L = require('./lib');
const { r1 } = L;
const C = require('./families/core-a');
const F = require('./families/b6-13');
const meta = require('./meta/hip-raise-bent-knee.json');

const B = C.lie({ kneeFlex: 0 });
const HC = C.handContacts();
const base = C.plantHands(B.pose, C.handTargets(B.pose, { abd: 12 }), HC);
const K = F.curler(base);
const CURL = +(process.env.CURL || 38), KNEE = 92;
const bent = (c, thigh, knee = KNEE, dorsi = -15) => F.legsBent(K.curl(c), thigh, knee, { dorsi });
const floor = F.feetDown(K.curl(0), KNEE);
const thigh0 = C.thighFromFloor(L.fk(floor));
const poses = {
  floor, hover: F.legsBent(K.curl(0), thigh0 + 5, KNEE, { dorsi: floor.ch.ankle_r.dorsi + 2 }),
  up1: bent(0, thigh0 + (90 - thigh0) * 0.5), table: bent(0, 90),
  c1: bent(CURL * 0.4, 106, 93), top: bent(CURL, 136, 96), topHold: bent(CURL + 1, 137, 96),
  d1: bent(CURL * 0.55, 115, 93), d2: bent(CURL * 0.15, 95, 92),
};
const keyframes = F.kf([[0, 'floor'], [0.6, 'floor'], [0.8, 'hover'], [1.15, 'up1'], [1.5, 'table'], [1.95, 'c1'], [2.45, 'top'], [2.9, 'topHold'], [3.6, 'd1'], [4.2, 'd2'], [4.6, 'table'], [5.1, 'up1'], [5.5, 'hover'], [5.75, 'floor'], [6.4, 'floor']]);
const ex = C.buildModule(meta, poses, keyframes, HC);
const peakHip = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 8), max: Math.ceil(peakHip + 4) };
const pelvisLift = (W) => C.minOf(W, ['buttock_r', 'buttock_l', 'pelvis']);
const rep = C.scan(ex, { upperBack: K.upperBack, hip: (W, p) => p.ch.hip_r.flex, thigh: (W) => C.thighFromFloor(W), lift: pelvisLift, foot: (W) => C.bottomOf(W, 'foot_r') });
const Wf = L.fk(poses.floor, HC), Wtb = L.fk(poses.table, HC), Wt = L.fk(poses.top, HC), d = (v) => `≈${Math.round(v)}°`;
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Hip flexion', 'setup', `${d(poses.floor.ch.hip_r.flex)} (feet on the mat)`); set('Hip flexion', 'peak', `${d(poses.table.ch.hip_r.flex)} with the thighs vertical, ${d(poses.top.ch.hip_r.flex)} at the top`);
set('Knee', 'setup', d(C.kneeOf(Wf, 'r'))); set('Knee', 'peak', `${d(C.kneeOf(Wt, 'r'))} (held)`);
set('Thighs from the floor', 'setup', d(C.thighFromFloor(Wf))); set('Thighs from the floor', 'peak', `${d(C.thighFromFloor(Wt))} (knees toward the chest)`);
set('Pelvis roll', 'setup', 'Pelvis resting'); set('Pelvis roll', 'peak', `${d(CURL)} posterior tilt; buttocks ${r1(pelvisLift(Wt))} cm off the mat`);
set('Upper back', 'setup', 'On the mat'); set('Upper back', 'peak', `Stays down (T6 moves ${r1(rep.upperBack[1])} cm)`);
set('Tempo', 'setup', 'Feet down 0.6 s'); set('Tempo', 'peak', '0.9 s knees up, 0.95 s hips up, 0.45 s pause, 1.7 s hips down, 1.15 s feet down');
console.log(`Hip Raise (bent knee): wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  hip floor/table/top ${poses.floor.ch.hip_r.flex}/${poses.table.ch.hip_r.flex}/${poses.top.ch.hip_r.flex} ankle ${poses.floor.ch.ankle_r.dorsi} footY ${r1(C.bottomOf(Wf, 'foot_r'))} lift ${r1(pelvisLift(Wt))}`);
C.guard('hip-raise-bent-knee', rep, [pelvisLift(Wt) < 3 && 'pelvis barely leaves the mat', rep.upperBack[1] > 0.3 && `upper back moves ${rep.upperBack[1]} cm`, rep.foot[0] < -0.3 && 'feet sink into the mat']);
