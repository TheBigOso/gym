// Lying Leg Hip Raise on Floor (GymVisual #7579; page not readable here, movement from the name: the floor version of
// the lying leg-hip raise). Bilateral: supine on a mat, arms by the sides palms down (planted hands), legs straight and
// together, heels hovering just off the mat. Raise the straight legs to vertical, then keep going by curling the pelvis
// up off the mat so the feet drive toward the ceiling and slightly back over the chest; pause, roll the pelvis down
// slowly, then lower the straight legs back to the hover. The upper back, shoulders and head stay on the mat (the pelvis
// curl is solved about a locked T6, as in author-reverse-crunch.js).
const L = require('./lib');
const { r1 } = L;
const C = require('./families/core-a');
const F = require('./families/b6-13');
const meta = require('./meta/lying-leg-hip-raise-on-floor.json');

const B = C.lie({ kneeFlex: 0 });
const HC = C.handContacts();
const base = C.plantHands(B.pose, C.handTargets(B.pose, { abd: 12 }), HC);
const K = F.curler(base);
const HEEL = 6, CURL = +(process.env.CURL || 34), LEG_TOP = +(process.env.LEGTOP || 104);
const legs = (c, deg, knee = 4) => F.legsStraight(K.curl(c), deg, { knee, dorsi: -12 + 4 * Math.min(1, deg / 90) });
const poses = {
  hover: C.setLegs(base, { heel: HEEL, knee: 3, dorsi: -12 }),
  up30: legs(0, 30), up60: legs(0, 60, 5), up90: legs(0, 90, 6),
  lift1: legs(CURL * 0.35, 94, 6), lift2: legs(CURL * 0.7, 99, 7), top: legs(CURL, LEG_TOP, 7), topHold: legs(CURL + 1, LEG_TOP + 0.5, 7),
  down2: legs(CURL * 0.65, 98, 7), down1: legs(CURL * 0.3, 93, 6),
};
const keyframes = F.kf([[0, 'hover'], [0.6, 'hover'], [1.05, 'up30'], [1.5, 'up60'], [1.95, 'up90'], [2.35, 'lift1'], [2.7, 'lift2'], [3.05, 'top'], [3.45, 'topHold'],
  [4.05, 'down2'], [4.6, 'down1'], [5.1, 'up90'], [5.75, 'up60'], [6.4, 'up30'], [7.0, 'hover'], [7.6, 'hover']]);
const ex = C.buildModule(meta, poses, keyframes, HC);
const peakHip = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 6), max: Math.ceil(peakHip + 4) };

const pelvisLift = (W) => C.minOf(W, ['buttock_r', 'buttock_l', 'pelvis']);
const rep = C.scan(ex, { upperBack: K.upperBack, hip: (W, p) => p.ch.hip_r.flex, leg: (W) => C.legFromFloor(W), lift: pelvisLift, heel: (W) => C.minOf(W, ['foot_r', 'calf_r', 'shank_r']) });
const Wh = L.fk(poses.hover, HC), W9 = L.fk(poses.up90, HC), Wt = L.fk(poses.top, HC), d = (v) => `≈${Math.round(v)}°`;
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Legs from the floor', 'setup', `${d(C.legFromFloor(Wh))} (heels ${r1(C.minOf(Wh, ['foot_r', 'calf_r']))} cm off the mat)`); set('Legs from the floor', 'peak', `${d(C.legFromFloor(Wt))} (vertical is 90°; the feet go a little past it as the hips lift)`);
set('Hip flexion', 'setup', d(poses.hover.ch.hip_r.flex)); set('Hip flexion', 'peak', `${d(poses.up90.ch.hip_r.flex)} with the legs vertical, ${d(poses.top.ch.hip_r.flex)} at the top`);
set('Pelvis roll', 'setup', 'Pelvis resting'); set('Pelvis roll', 'peak', `${d(CURL)} posterior tilt; buttocks ${r1(pelvisLift(Wt))} cm off the mat`);
set('Knees', 'setup', d(C.kneeOf(Wh, 'r'))); set('Knees', 'peak', d(C.kneeOf(Wt, 'r')));
set('Upper back', 'setup', 'On the mat'); set('Upper back', 'peak', `Stays down (T6 moves ${r1(rep.upperBack[1])} cm)`);
set('Tempo', 'setup', 'Hover 0.6 s'); set('Tempo', 'peak', '1.35 s legs up, 1.1 s hips up, 0.4 s pause, 1.65 s hips down, 1.9 s legs down');
console.log(`Lying Leg Hip Raise on Floor: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  hip hover/90/top ${poses.hover.ch.hip_r.flex}/${poses.up90.ch.hip_r.flex}/${poses.top.ch.hip_r.flex} lift ${r1(pelvisLift(Wt))} legs90 ${r1(C.legFromFloor(W9))}`);
C.guard('lying-leg-hip-raise-on-floor', rep, [pelvisLift(Wt) < 4 && 'pelvis barely leaves the mat', rep.upperBack[1] > 0.3 && `upper back moves ${rep.upperBack[1]} cm`, rep.heel[0] < 2 && `heels touch the mat (${rep.heel[0]})`]);
