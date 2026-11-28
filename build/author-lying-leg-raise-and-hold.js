// Lying Leg Raise and Hold (GymVisual #5109, movement reference only; page not readable here). Bilateral isometric: supine
// on a mat, arms by the sides palms down (planted hands), legs straight and together. From a hover with the heels just off
// the mat, raise both legs to about 45 degrees, hold there for about 3 s with the low back pressed down, then lower slowly
// back to the hover. Pelvis, upper back and head stay on the mat. Built on core-a (as lying-leg-raise).
const L = require('./lib');
const { r1 } = L;
const C = require('./families/core-a');
const meta = require('./meta/lying-leg-raise-and-hold.json');

const B = C.lie({ kneeFlex: 0 });
const HC = C.handContacts();
const base = C.plantHands(B.pose, C.handTargets(B.pose, { abd: 12 }), HC);
const legs = (deg, knee = 3, dorsi = -12, heel = null) => C.setLegs(base, { deg, knee, dorsi, heel });
const HEEL = 6, HOLD = 45;
const poses = { hover: legs(0, 3, -12, HEEL), low: legs(22, 3, -11), hold: legs(HOLD, 4, -10), holdEnd: legs(HOLD + 1, 4, -10) };
const keyframes = [{ t: 0, pose: 'hover' }, { t: 0.6, pose: 'hover' }, { t: 1.2, pose: 'low' }, { t: 1.8, pose: 'hold' }, { t: 4.8, pose: 'holdEnd' }, { t: 5.9, pose: 'low' }, { t: 6.8, pose: 'hover' }, { t: 7.5, pose: 'hover' }];
const ex = C.buildModule(meta, poses, keyframes, HC);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(poses.holdEnd.ch.hip_r.flex - 5), max: Math.ceil(poses.holdEnd.ch.hip_r.flex + 5) };

const rep = C.scan(ex, { leg: (W) => C.legFromFloor(W), heel: (W) => C.minOf(W, ['foot_r', 'calf_r', 'shank_r']), hip: (W, p) => p.ch.hip_r.flex });
const Wh = L.fk(poses.hover, HC), Wt = L.fk(poses.hold, HC), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].setup = `Heels ${r1(C.minOf(Wh, ['foot_r', 'calf_r']))} cm off the mat (hip-to-ankle line ${d(C.legFromFloor(Wh))})`; kin[0].peak = `${d(C.legFromFloor(Wt))}, held about 3 s`;
kin[1].setup = d(poses.hover.ch.hip_r.flex); kin[1].peak = d(poses.hold.ch.hip_r.flex);
kin[2].setup = d(poses.hover.ch.knee_r.flex); kin[2].peak = d(poses.hold.ch.knee_r.flex);
kin[3].setup = 'On the mat'; kin[3].peak = `Unchanged (pelvis moves ${rep.still} cm)`;
kin[4].setup = 'Hover 0.6 s'; kin[4].peak = '1.2 s up, 3 s hold, 2 s down, 0.7 s hover';
console.log(`Lying Leg Raise and Hold: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} hip hover/hold ${poses.hover.ch.hip_r.flex}/${poses.hold.ch.hip_r.flex}`);
C.guard('lying-leg-raise-and-hold', rep, [rep.heel[0] < 2 && `heels touch the mat (${rep.heel[0]} cm)`, (rep.leg[1] < 40 || rep.leg[1] > 50) && `hold angle ${rep.leg[1]} outside 40-50`]);
