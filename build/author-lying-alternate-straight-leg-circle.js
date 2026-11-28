// Lying Alternate Straight Leg Circle (GymVisual 15155, movement reference only; page not readable at authoring time).
// Supine on a mat, arms by the sides palms down (planted hands), legs straight. The right leg rises straight to about 40
// degrees and draws one slow circle with the toes (across the midline, down, out, up), then lowers; the left leg repeats.
// Pelvis, upper back and head stay on the mat. Bilateral, alternating (authoredSide 'bilateral').
const L = require('./lib');
const { r1 } = L;
const C = require('./families/core-a');
const F = require('./families/b6-19');
const meta = require('./meta/lying-alternate-straight-leg-circle.json');

const { base, HC } = F.supineHands({ abd: 14 });
const CIRCLE = { deg: 40, aF: 14, aA: 14, abd0: 3, knee: 3, dorsi: -28 };
const rest = C.setLegs(base, { heel: 0.2, knee: 2, dorsi: -20 });
const legR = (th) => F.circleLeg(rest, 'r', CIRCLE, th);
const legL = (th) => F.circleLeg(rest, 'l', CIRCLE, th);
const poses = { rest };
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.5, pose: 'rest' }];
const STEP = 0.3; // 45 degrees of circle every 0.3 s (one circle in 2.4 s)
for (const [s, f, t0] of [['R', legR, 1.1], ['L', legL, 4.7]]) {
  poses[`up${s}`] = f(0);
  keyframes.push({ t: +(t0 - 0.6 + 0.3).toFixed(2), pose: `mid${s}` });
  poses[`mid${s}`] = C.setLeg(rest, s.toLowerCase(), { deg: 20, knee: 3, dorsi: -25, abd: CIRCLE.abd0 });
  for (let k = 0; k <= 8; k++) { const n = `${s}${k * 45}`; poses[n] = f(k * 45); keyframes.push({ t: +(t0 + STEP * k).toFixed(2), pose: k === 0 || k === 8 ? `up${s}` : n }); }
  keyframes.push({ t: +(t0 + 2.4 + 0.3).toFixed(2), pose: `mid${s}` }, { t: +(t0 + 3.0).toFixed(2), pose: 'rest' });
  delete poses[`${s}0`]; delete poses[`${s}360`];
}
keyframes.push({ t: 8.4, pose: 'rest' });
keyframes.sort((a, b) => a.t - b.t);
const ex = C.buildModule(meta, poses, keyframes, HC);
const peak = Math.max(...Object.values(poses).map((p) => Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex)));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peak - 4), max: Math.ceil(peak + 4) };

let restHeelMin = 1e9;
const tl = L.R.buildTimeline(ex);
for (let t = 1.1; t <= 3.5; t += 0.01) { const W = L.R.evalPose(L.rig, tl.pose(t), HC); restHeelMin = Math.min(restHeelMin, C.minOf(W, ['foot_l', 'calf_l', 'shank_l'])); }
let workHeelMin = 1e9;
for (let t = 1.1; t <= 3.5; t += 0.01) { const W = L.R.evalPose(L.rig, tl.pose(t), HC); workHeelMin = Math.min(workHeelMin, C.minOf(W, ['foot_r', 'calf_r', 'shank_r'])); }
const rep = C.scan(ex, { legR: (W) => C.legFromFloor(W, 'r'), abdR: (W, p) => p.ch.hip_r.abd, ankleZr: (W) => W.ankle_r.p[2] });
const kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, Wt = L.fk(poses.upR, HC);
kin[0].setup = 'Legs resting on the mat'; kin[0].peak = `Circle centre ${CIRCLE.deg}° (top of the circle ${d(C.legFromFloor(Wt))})`;
kin[1].setup = d(rest.ch.hip_r.flex); kin[1].peak = `${d(poses.R180.ch.hip_r.flex)} to ${d(poses.upR.ch.hip_r.flex)}`;
kin[2].setup = d(rest.ch.hip_r.abd); kin[2].peak = `${d(poses.R90.ch.hip_r.abd)} (across) to ${d(poses.R270.ch.hip_r.abd)} (out)`;
kin[3].setup = d(rest.ch.knee_r.flex); kin[3].peak = d(CIRCLE.knee) + ', toes pointed';
kin[4].setup = 'On the mat'; kin[4].peak = `Unchanged (pelvis moves ${rep.still} cm)`;
kin[5].setup = 'Rest 0.5 s, lift 0.6 s'; kin[5].peak = 'One circle in 2.4 s per leg, lower 0.6 s';
console.log(`Lying Alternate Straight Leg Circle: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} restLegHeelMin ${restHeelMin.toFixed(2)} workHeelMin ${workHeelMin.toFixed(1)} peak ${peak}`);
C.guard('lying-alternate-straight-leg-circle', rep, [workHeelMin < 3 && `working leg touches the mat in the circle (${workHeelMin.toFixed(1)} cm)`, restHeelMin > 1.5 && 'resting leg floats']);
