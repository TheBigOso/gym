// Lying Leg Raise (GymVisual #116312). Bilateral: supine on a mat, arms by the sides palms down (planted hands), legs
// straight and together. From a hover with the heels just off the mat, raise both legs to about vertical, pause, and lower
// slowly back to the hover. The pelvis, upper back and head stay on the mat.
const L = require('./lib');
const { r1 } = L;
const C = require('./families/core-a');
const meta = require('./meta/lying-leg-raise.json');

const B = C.lie({ kneeFlex: 0 });
const HC = C.handContacts();
const base = C.plantHands(B.pose, C.handTargets(B.pose, { abd: 12 }), HC);

const legs = (deg, knee = 3, dorsi = -12, heel = null) => C.setLegs(base, { deg, knee, dorsi, heel });
const HEEL = 6, TOP = 88;
const poses = { hover: legs(0, 3, -12, HEEL), mid: legs(45, 4, -10), top: legs(TOP, 6, -8), topHold: legs(TOP + 1, 6, -8) };
const keyframes = [{ t: 0, pose: 'hover' }, { t: 0.6, pose: 'hover' }, { t: 1.35, pose: 'mid' }, { t: 2.1, pose: 'top' }, { t: 2.5, pose: 'topHold' }, { t: 3.75, pose: 'mid' }, { t: 5.0, pose: 'hover' }, { t: 6.0, pose: 'hover' }];
const ex = C.buildModule(meta, poses, keyframes, HC);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(poses.top.ch.hip_r.flex - 6), max: Math.ceil(poses.top.ch.hip_r.flex + 6) };

const rep = C.scan(ex, { leg: (W) => C.legFromFloor(W), heel: (W) => C.minOf(W, ['foot_r', 'calf_r', 'shank_r']), hip: (W, p) => p.ch.hip_r.flex });
const Wh = L.fk(poses.hover, HC), Wt = L.fk(poses.top, HC), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].setup = `Heels ${r1(C.minOf(Wh, ['foot_r', 'calf_r']))} cm off the mat (hip-to-ankle line ${d(C.legFromFloor(Wh))}; the hip joint sits above the heels)`; kin[0].peak = d(C.legFromFloor(Wt));
kin[1].setup = d(poses.hover.ch.hip_r.flex) + ' (pelvis resting in a slight anterior tilt)'; kin[1].peak = d(poses.top.ch.hip_r.flex);
kin[2].setup = d(poses.hover.ch.knee_r.flex); kin[2].peak = d(poses.top.ch.knee_r.flex);
kin[3].setup = 'On the mat'; kin[3].peak = `Unchanged (pelvis moves ${rep.still} cm)`;
kin[4].setup = 'Hover 0.6 s'; kin[4].peak = '1.5 s up, 0.4 s pause, 2.5 s down, 1 s hover';
console.log(`Lying Leg Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} hip hover/top ${poses.hover.ch.hip_r.flex}/${poses.top.ch.hip_r.flex} arms ${JSON.stringify(ex.poses.hover.ik)}`);
C.guard('lying-leg-raise', rep, [rep.heel[0] < 2 && `heels touch the mat during the set (${rep.heel[0]} cm)`]);
