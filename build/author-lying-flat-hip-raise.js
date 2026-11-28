// Lying Flat Hip Raise (GymVisual #18101; page not readable here, movement from the name, read as the abdominal hip raise
// done lying flat on the floor with the legs held vertical). Bilateral: supine on a mat, arms by the sides palms down
// (planted hands), straight legs held up at vertical. Curl the pelvis up off the mat so the feet press straight up toward
// the ceiling, pause, and roll the pelvis back down slowly; the legs stay up between reps. The upper back, shoulders and
// head stay on the mat (pelvis curl about a locked T6, as in author-reverse-crunch.js). Short-range partner of
// author-lying-leg-hip-raise-on-floor.js (no leg raise).
const L = require('./lib');
const { r1 } = L;
const C = require('./families/core-a');
const F = require('./families/b6-13');
const meta = require('./meta/lying-flat-hip-raise.json');

const B = C.lie({ kneeFlex: 0 });
const HC = C.handContacts();
const base = C.plantHands(B.pose, C.handTargets(B.pose, { abd: 12 }), HC);
const K = F.curler(base);
const CURL = +(process.env.CURL || 32);
const legs = (f) => F.legsStraight(K.curl(CURL * f), 90 + 2.5 * f, { knee: 6 + f, dorsi: -6 });
const poses = { down: legs(0), u25: legs(0.25), u50: legs(0.5), u75: legs(0.75), top: legs(1), topHold: legs(1.03), d75: legs(0.75), d50: legs(0.5), d25: legs(0.25), touch: legs(0.03) };
const keyframes = F.kf([[0, 'down'], [0.7, 'down'], [1.0, 'u25'], [1.3, 'u50'], [1.6, 'u75'], [1.9, 'top'], [2.4, 'topHold'], [2.9, 'd75'], [3.4, 'd50'], [3.9, 'd25'], [4.4, 'touch'], [4.6, 'down'], [5.4, 'down']]);
const ex = C.buildModule(meta, poses, keyframes, HC);
const hips = Object.values(poses).map((p) => p.ch.hip_r.flex), peakHip = Math.max(...hips);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 5), max: Math.ceil(peakHip + 4) };
const pelvisLift = (W) => C.minOf(W, ['buttock_r', 'buttock_l', 'pelvis']);
const rep = C.scan(ex, { upperBack: K.upperBack, hip: (W, p) => p.ch.hip_r.flex, leg: (W) => C.legFromFloor(W), lift: pelvisLift, toes: (W) => W.toe_r.p[1] });
const Wd = L.fk(poses.down, HC), Wt = L.fk(poses.top, HC), d = (v) => `≈${Math.round(v)}°`;
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Legs', 'setup', `${d(C.legFromFloor(Wd))} from the floor (vertical), knees ${d(C.kneeOf(Wd, 'r'))}`); set('Legs', 'peak', `${d(C.legFromFloor(Wt))}; the feet rise ${r1(Wt.toe_r.p[1] - Wd.toe_r.p[1])} cm`);
set('Pelvis roll', 'setup', 'Pelvis resting'); set('Pelvis roll', 'peak', `${d(CURL)} posterior tilt; buttocks ${r1(pelvisLift(Wt))} cm off the mat`);
set('Hip flexion', 'setup', d(poses.down.ch.hip_r.flex)); set('Hip flexion', 'peak', d(poses.top.ch.hip_r.flex));
set('Upper back', 'setup', 'On the mat'); set('Upper back', 'peak', `Stays down (T6 moves ${r1(rep.upperBack[1])} cm)`);
set('Tempo', 'setup', 'Legs up 0.7 s'); set('Tempo', 'peak', '1.2 s up, 0.5 s pause, 2.0 s down, 1.0 s reset');
console.log(`Lying Flat Hip Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  hip down/top ${poses.down.ch.hip_r.flex}/${poses.top.ch.hip_r.flex} lift ${r1(pelvisLift(Wt))}`);
C.guard('lying-flat-hip-raise', rep, [pelvisLift(Wt) < 4 && 'pelvis barely leaves the mat', rep.upperBack[1] > 0.3 && `upper back moves ${rep.upperBack[1]} cm`]);
