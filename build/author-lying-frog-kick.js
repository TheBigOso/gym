// Lying Frog Kick (GymVisual 15159, movement reference only; page not readable at authoring time). Supine on a mat, arms
// by the sides palms down (planted hands). Both straight legs lift to hover a little off the mat; the knees then draw in
// toward the chest with the knees wide and the heels together (hips flexed, abducted and turned out, like a frog), and
// the legs kick back out long and together to the hover. Two kicks per loop, then the legs lower. Pelvis, upper back
// and head stay on the mat. Bilateral.
const L = require('./lib');
const C = require('./families/core-a');
const F = require('./families/b6-19');
const meta = require('./meta/lying-frog-kick.json');

const { base, HC } = F.supineHands({ abd: 14 });
const HOVER = { deg: 12, knee: 2, dorsi: -28, abd: 0 }, TUCK = { F: 95, K: 120, A: 30, heelZ: 4, dorsi: -15 };
const rest = C.setLegs(base, { heel: 0.2, knee: 2, dorsi: -20 });
const hover = C.setLegs(base, HOVER);
const tuck = F.frogLeg(F.frogLeg(hover, 'r', TUCK), 'l', TUCK);
const half = F.blend(hover, tuck, 0.5);
const poses = { rest, hover, half, tuck };
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.6, pose: 'rest' }, { t: 1.2, pose: 'hover' }];
for (const t0 of [1.2, 3.0]) keyframes.push({ t: +(t0 + 0.5).toFixed(2), pose: 'half' }, { t: +(t0 + 1.0).toFixed(2), pose: 'tuck' }, { t: +(t0 + 1.4).toFixed(2), pose: 'half' }, { t: +(t0 + 1.8).toFixed(2), pose: 'hover' });
keyframes.push({ t: 5.4, pose: 'rest' }, { t: 6.0, pose: 'rest' });
const ex = C.buildModule(meta, poses, keyframes, HC);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(tuck.ch.hip_r.flex - 4), max: Math.ceil(tuck.ch.hip_r.flex + 4) };

const tl = L.R.buildTimeline(ex); let heelMin = 1e9, gap = 1e9;
for (let t = 1.2; t <= 4.8; t += 0.01) { const W = L.R.evalPose(L.rig, tl.pose(t), HC); heelMin = Math.min(heelMin, C.minOf(W, ['foot_r', 'foot_l', 'calf_r', 'calf_l'])); gap = Math.min(gap, W.ankle_r.p[2] - W.ankle_l.p[2]); }
const rep = C.scan(ex, { hip: (W, p) => p.ch.hip_r.flex, knee: (W) => C.kneeOf(W, 'r') });
const Wh = L.fk(hover, HC), Wt = L.fk(tuck, HC), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].setup = 'Legs resting on the mat'; kin[0].peak = `${d(C.legFromFloor(Wh))} (heels about ${Math.round(C.minOf(Wh, ['foot_r', 'calf_r']))} cm off the mat)`;
kin[1].setup = d(hover.ch.hip_r.flex) + ' (legs long)'; kin[1].peak = d(tuck.ch.hip_r.flex) + ' in the tuck';
kin[2].setup = d(C.kneeOf(Wh, 'r')); kin[2].peak = d(C.kneeOf(Wt, 'r'));
kin[3].setup = 'Legs together'; kin[3].peak = `Hip abduction ${tuck.ch.hip_r.abd}°, external rotation ${-tuck.ch.hip_r.rot}°; heels ${L.r1(Wt.ankle_r.p[2] - Wt.ankle_l.p[2])} cm apart, knees ${L.r1(Wt.knee_r.p[2] - Wt.knee_l.p[2])} cm apart`;
kin[4].setup = 'On the mat'; kin[4].peak = `Unchanged (pelvis moves ${rep.still} cm)`;
kin[5].setup = 'Rest 0.6 s, lift 0.6 s'; kin[5].peak = 'Two kicks: 1 s in, 0.8 s out each; lower 0.6 s';
console.log(`Lying Frog Kick: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} heelMin ${heelMin.toFixed(1)} ankleGapMin ${gap.toFixed(1)} tuck ${JSON.stringify(tuck.ch.hip_r)} knee ${tuck.ch.knee_r.flex}`);
C.guard('lying-frog-kick', rep, [heelMin < 3 && `heels touch the mat during the kicks (${heelMin.toFixed(1)} cm)`, gap < 4 && 'feet overlap']);
