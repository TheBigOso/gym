// Lying Single Leg Raise (GymVisual #23830, movement reference only; page not readable here). Supine on a mat, arms by the
// sides palms down (planted hands), both legs straight. The left leg rests on the mat; the straight right leg lifts from
// a hover to about vertical, pauses, and lowers slowly back to the hover. Pelvis and the resting leg stay still. Authored
// on the right leg; the player mirrors it. Built on core-a (as lying-leg-raise).
const L = require('./lib');
const { r1 } = L;
const C = require('./families/core-a');
const meta = require('./meta/lying-single-leg-raise.json');

const B = C.lie({ kneeFlex: 0 });
const HC = C.handContacts();
const base = C.plantHands(B.pose, C.handTargets(B.pose, { abd: 12 }), HC);
const leg = (deg, knee = 3, dorsi = -12, heel = null) => C.setLeg(base, 'r', { deg, knee, dorsi, heel, abd: 0 });
const HEEL = 5, TOP = 82;
const poses = { hover: leg(0, 3, -12, HEEL), mid: leg(42, 4, -10), top: leg(TOP, 6, -8), topHold: leg(TOP + 1, 6, -8) };
const keyframes = [{ t: 0, pose: 'hover' }, { t: 0.5, pose: 'hover' }, { t: 1.2, pose: 'mid' }, { t: 1.9, pose: 'top' }, { t: 2.3, pose: 'topHold' }, { t: 3.4, pose: 'mid' }, { t: 4.5, pose: 'hover' }, { t: 5.2, pose: 'hover' }];
const ex = C.buildModule(meta, poses, keyframes, HC);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(poses.topHold.ch.hip_r.flex - 6), max: Math.ceil(poses.topHold.ch.hip_r.flex + 6) };

const rep = C.scan(ex, { leg: (W) => C.legFromFloor(W), heel: (W) => C.minOf(W, ['foot_r', 'calf_r', 'shank_r']), restLeg: (W) => C.minOf(W, ['calf_l', 'foot_l']) });
const Wh = L.fk(poses.hover, HC), Wt = L.fk(poses.top, HC), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].setup = `Right heel ${r1(C.minOf(Wh, ['foot_r', 'calf_r']))} cm off the mat`; kin[0].peak = d(C.legFromFloor(Wt));
kin[1].setup = d(poses.hover.ch.hip_r.flex); kin[1].peak = d(poses.top.ch.hip_r.flex);
kin[2].setup = d(poses.hover.ch.knee_r.flex); kin[2].peak = d(poses.top.ch.knee_r.flex);
kin[3].setup = 'On the mat; left leg resting straight'; kin[3].peak = `Unchanged (pelvis moves ${rep.still} cm)`;
kin[4].setup = 'Hover 0.5 s'; kin[4].peak = '1.4 s up, 0.4 s pause, 2.2 s down, 0.7 s hover';
console.log(`Lying Single Leg Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
C.guard('lying-single-leg-raise', rep, [rep.heel[0] < 2 && `heel touches the mat (${rep.heel[0]} cm)`, rep.restLeg[1] > 0.6 && 'resting leg lifts']);
