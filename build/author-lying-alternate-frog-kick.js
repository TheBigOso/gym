// Lying Alternate Frog Kick (GymVisual 15158, movement reference only; page not readable at authoring time). Supine on a
// mat, arms by the sides palms down (planted hands). Both straight legs lift to hover a little off the mat; the right
// knee draws in toward the chest, turned out with the heel toward the midline (frog leg), and kicks back out long; then
// the left leg does the same while the other leg keeps hovering. The legs lower to finish. Pelvis, upper back and head
// stay on the mat. Bilateral, alternating.
const L = require('./lib');
const C = require('./families/core-a');
const F = require('./families/b6-19');
const meta = require('./meta/lying-alternate-frog-kick.json');

const { base, HC } = F.supineHands({ abd: 14 });
const HOVER = { deg: 14, knee: 2, dorsi: -28, abd: 0 }, TUCK = { F: 95, K: 120, A: 30, heelZ: 6, dorsi: -15 };
const rest = C.setLegs(base, { heel: 0.2, knee: 2, dorsi: -20 });
const hover = C.setLegs(base, HOVER);
const tuckR = F.frogLeg(hover, 'r', TUCK), tuckL = F.frogLeg(hover, 'l', TUCK);
const poses = { rest, hover, halfR: F.blend(hover, tuckR, 0.5), tuckR, halfL: F.blend(hover, tuckL, 0.5), tuckL };
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.6, pose: 'rest' }, { t: 1.2, pose: 'hover' }];
for (const [s, t0] of [['R', 1.2], ['L', 3.0]]) keyframes.push({ t: +(t0 + 0.5).toFixed(2), pose: `half${s}` }, { t: +(t0 + 1.0).toFixed(2), pose: `tuck${s}` }, { t: +(t0 + 1.4).toFixed(2), pose: `half${s}` }, { t: +(t0 + 1.8).toFixed(2), pose: 'hover' });
keyframes.push({ t: 5.6, pose: 'rest' }, { t: 6.4, pose: 'rest' });
const ex = C.buildModule(meta, poses, keyframes, HC);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(tuckR.ch.hip_r.flex - 4), max: Math.ceil(tuckR.ch.hip_r.flex + 4) };

// clearance between the tucking foot and the hovering leg, and heels off the mat during the kicks
const tl = L.R.buildTimeline(ex); let heelMin = 1e9, cross = 1e9;
const segD = (p, a, b) => { const ab = L.V.sub(b, a), t = Math.max(0, Math.min(1, L.V.dot(L.V.sub(p, a), ab) / L.V.dot(ab, ab))); return L.V.len(L.V.sub(p, L.V.add(a, L.V.scale(ab, t)))); };
for (let t = 1.2; t <= 4.8; t += 0.01) {
  const W = L.R.evalPose(L.rig, tl.pose(t), HC); heelMin = Math.min(heelMin, C.minOf(W, ['foot_r', 'foot_l', 'calf_r', 'calf_l']));
  cross = Math.min(cross, segD(W.ankle_r.p, W.hip_l.p, W.ankle_l.p), segD(W.ankle_l.p, W.hip_r.p, W.ankle_r.p));
}
const rep = C.scan(ex, { hipR: (W, p) => p.ch.hip_r.flex, hipL: (W, p) => p.ch.hip_l.flex });
const Wh = L.fk(hover, HC), Wt = L.fk(tuckR, HC), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].setup = 'Legs resting on the mat'; kin[0].peak = `${d(C.legFromFloor(Wh))} (heels about ${Math.round(C.minOf(Wh, ['foot_r', 'calf_r']))} cm off the mat); the other leg keeps hovering`;
kin[1].setup = d(hover.ch.hip_r.flex) + ' (legs long)'; kin[1].peak = d(tuckR.ch.hip_r.flex) + ' in the tuck';
kin[2].setup = d(C.kneeOf(Wh, 'r')); kin[2].peak = d(C.kneeOf(Wt, 'r'));
kin[3].setup = 'Legs together'; kin[3].peak = `Hip abduction ${tuckR.ch.hip_r.abd}°, external rotation ${-tuckR.ch.hip_r.rot}°; heel ${L.r1(Wt.ankle_r.p[2])} cm from the midline`;
kin[4].setup = 'On the mat'; kin[4].peak = `Unchanged (pelvis moves ${rep.still} cm)`;
kin[5].setup = 'Rest 0.6 s, lift 0.6 s'; kin[5].peak = 'Each leg 1 s in, 0.8 s out; lower 0.8 s';
console.log(`Lying Alternate Frog Kick: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} heelMin ${heelMin.toFixed(1)} ankleToOtherLeg ${cross.toFixed(1)}`);
C.guard('lying-alternate-frog-kick', rep, [heelMin < 3 && `heels touch the mat during the kicks (${heelMin.toFixed(1)} cm)`, cross < 9 && `foot passes through the other leg (${cross.toFixed(1)} cm)`]);
