// Flutter Kicks (GymVisual #045912). Bilateral, alternating: supine on a mat, arms by the sides palms down (planted
// hands), legs straight. Lift both heels a little off the mat, then make small fast alternating up-down kicks (one leg
// rises as the other lowers), bring the legs together and lower them to the mat. The pelvis and upper back stay down.
const L = require('./lib');
const { r1 } = L;
const C = require('./families/core-a');
const meta = require('./meta/flutter-kicks.json');

const B = C.lie({ kneeFlex: 0 });
const HC = C.handContacts();
const base = C.plantHands(B.pose, C.handTargets(B.pose, { abd: 12 }), HC);

const HOLD = 9, AMP = 5;                        // legs held ~9 degrees off the floor, kicks +/- 5 degrees
const KICK = { knee: 2, dorsi: -30 };            // knees long, toes pointed
const both = (o) => C.setLegs(base, o);
const split = (degR, degL) => C.setLeg(C.setLeg(base, 'r', Object.assign({ deg: degR }, KICK)), 'l', Object.assign({ deg: degL }, KICK));
const poses = {
  rest: both({ heel: 0.2, knee: 2, dorsi: -18 }),
  hold: both(Object.assign({ deg: HOLD }, KICK)),
  rUp: split(HOLD + AMP, HOLD - AMP),
  lUp: split(HOLD - AMP, HOLD + AMP),
};
// Kick extremes every 0.45 s (about 2.2 kicks per second); the kicks phase midpoint (3.3 s) is a right-leg-up extreme.
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.6, pose: 'rest' }, { t: 1.2, pose: 'hold' }];
['rUp', 'lUp', 'rUp', 'lUp', 'rUp', 'lUp', 'rUp', 'lUp', 'rUp'].forEach((p, i) => keyframes.push({ t: Math.round((1.5 + 0.45 * i) * 100) / 100, pose: p }));
keyframes.push({ t: 5.4, pose: 'hold' }, { t: 6.2, pose: 'rest' }, { t: 7.0, pose: 'rest' });
const ex = C.buildModule(meta, poses, keyframes, HC);
const peakHip = Math.max(poses.rUp.ch.hip_r.flex, poses.lUp.ch.hip_l.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 4), max: Math.ceil(peakHip + 4) };

const rep = C.scan(ex, { legR: (W) => C.legFromFloor(W, 'r'), legL: (W) => C.legFromFloor(W, 'l'), heelDuringKicks: (W, p) => 0 });
// heel clearance during the kicks only
const tl = L.R.buildTimeline(ex); let heelMin = 1e9, gap = 0;
for (let t = 1.2; t <= 5.4; t += 0.01) { const W = L.R.evalPose(L.rig, tl.pose(t), HC); heelMin = Math.min(heelMin, C.minOf(W, ['foot_r', 'foot_l', 'calf_r', 'calf_l'])); gap = Math.max(gap, Math.abs(W.ankle_r.p[1] - W.ankle_l.p[1])); }
const Wh = L.fk(poses.hold, HC), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].setup = 'Legs resting on the mat'; kin[0].peak = `${d(C.legFromFloor(Wh))} (heels about ${Math.round(C.minOf(Wh, ['foot_r', 'calf_r']))} cm off the mat)`;
kin[1].setup = '–'; kin[1].peak = `±${AMP}° per leg; up to ${Math.round(gap)} cm between the ankles`;
kin[2].setup = d(poses.hold.ch.hip_r.flex) + ' hold'; kin[2].peak = `${d(poses.lUp.ch.hip_r.flex)} to ${d(poses.rUp.ch.hip_r.flex)}`;
kin[3].setup = d(poses.rest.ch.knee_r.flex); kin[3].peak = d(KICK.knee) + ', toes pointed';
kin[4].setup = 'On the mat'; kin[4].peak = `Unchanged (pelvis moves ${rep.still} cm)`;
kin[5].setup = 'Rest 0.6 s, lift 0.6 s'; kin[5].peak = '9 kick extremes in 4.2 s (about 2 kicks per second), lower 0.8 s';
delete rep.heelDuringKicks;
console.log(`Flutter Kicks: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} hip hold ${poses.hold.ch.hip_r.flex} rUp ${poses.rUp.ch.hip_r.flex}/${poses.rUp.ch.hip_l.flex} heelMin(kicks) ${heelMin.toFixed(1)} ankle gap ${gap.toFixed(1)}`);
C.guard('flutter-kicks', rep, [heelMin < 2 && `heels touch the mat during the kicks (${heelMin.toFixed(1)} cm)`]);
