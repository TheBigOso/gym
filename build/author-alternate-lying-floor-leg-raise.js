// Alternate Lying Floor Leg Raise (GymVisual 976, movement reference only; the page could not be read at authoring time).
// Supine on a mat, arms by the sides palms down (planted hands), both legs straight and resting on the mat. One straight
// leg rises to about vertical while the other stays resting on the mat, pause, lower under control; then the other leg.
// The pelvis, upper back and head stay on the mat. Both sides are in the loop (bilateral, alternating).
const L = require('./lib');
const { r1 } = L;
const C = require('./families/core-a');
const F = require('./families/b6-16');
const meta = require('./meta/alternate-lying-floor-leg-raise.json');

const { base, HC } = F.supine();
const TOP = 82;
const one = (s, deg, knee = 4) => (s === 'r' ? F.legsLR(base, { deg, knee, dorsi: -12 }, { rest: true }) : F.legsLR(base, { rest: true }, { deg, knee, dorsi: -12 }));
const poses = {
  rest: F.legsLR(base, { rest: true }, { rest: true }),
  rLow: one('r', 30, 3), rTop: one('r', TOP, 6), rHold: one('r', TOP + 1, 6),
  lLow: one('l', 30, 3), lTop: one('l', TOP, 6), lHold: one('l', TOP + 1, 6),
};
const T = meta.timeline.phases;
const keyframes = [
  { t: 0, pose: 'rest' }, { t: 0.5, pose: 'rest' }, { t: 1.05, pose: 'rLow' }, { t: 1.7, pose: 'rTop' }, { t: 2.0, pose: 'rHold' }, { t: 2.7, pose: 'rLow' }, { t: 3.3, pose: 'rest' },
  { t: 3.6, pose: 'rest' }, { t: 4.15, pose: 'lLow' }, { t: 4.8, pose: 'lTop' }, { t: 5.1, pose: 'lHold' }, { t: 5.8, pose: 'lLow' }, { t: 6.4, pose: 'rest' }, { t: 7.2, pose: 'rest' },
];
const ex = C.buildModule(meta, poses, keyframes, HC);
const pk = Math.max(poses.rHold.ch.hip_r.flex, poses.lHold.ch.hip_l.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk - 6), max: Math.ceil(pk + 6) };

const heel = (W, s) => C.minOf(W, [`foot_${s}`, `calf_${s}`, `shank_${s}`]);
const rep = C.scan(ex, { legR: (W) => C.legFromFloor(W, 'r'), legL: (W) => C.legFromFloor(W, 'l'), heelR: (W) => heel(W, 'r'), heelL: (W) => heel(W, 'l') });
const Wr = L.fk(poses.rest, HC), Wt = L.fk(poses.rTop, HC), d = (v) => `≈${Math.round(v)}°`;
const set = (p, s, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k.setup = s; k.peak = v; };
set('Lifting leg', 'On the mat', `${d(C.legFromFloor(Wt, 'r'))} at the top`);
set('Hip flexion', d(poses.rest.ch.hip_r.flex), `${d(poses.rHold.ch.hip_r.flex)} on the lifting side`);
set('Resting leg', `Heels on the mat (${r1(heel(Wr, 'l'))} cm)`, `Stays on the mat (${r1(heel(Wt, 'l'))} cm) while the other leg lifts`);
set('Pelvis', 'On the mat', `Unchanged (pelvis moves ${rep.still} cm)`);
set('Tempo', 'Rest 0.5 s', 'Per leg: 1.2 s up, 0.3 s pause, 1.3 s down; 0.3 s between legs');
console.log(`Alternate Lying Floor Leg Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} hip top ${poses.rTop.ch.hip_r.flex}`);
C.guard('alternate-lying-floor-leg-raise', rep, [rep.heelR[0] < -0.3 && 'heel below the mat']);
