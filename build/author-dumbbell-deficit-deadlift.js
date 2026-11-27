// Dumbbell Deficit Deadlift (GymVisual #1169912): standing on a low, solid step (10 cm), feet hip width, a dumbbell in
// each hand hanging beside the step (neutral grip). From standing tall, push the hips back and bend the knees with a flat
// back until the dumbbells pass below the top of the step and nearly reach the floor, then stand up, hips and shoulders
// rising together. The step makes the range longer than a deadlift from the floor (Rogacion 2024). The body is balanced
// over the mid-foot with the dumbbells (centre of mass); arms hang long, the hands a little outside the shoulders so the
// dumbbells clear the step. Both feet planted on the step. Bilateral.
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/dumbbell-deficit-deadlift.json');

const F = makeFamily({ toe: +(process.env.TOE ?? 6), half: +(process.env.HALF ?? 9) });
for (const c of F.contacts) { const s = c.id.endsWith('_r') ? 1 : -1, a = (+(process.env.TOE ?? 6) + 6) * Math.PI / 180; c.pole = [+Math.cos(a).toFixed(3), 0, +(s * Math.sin(a)).toFixed(3)]; }   // knees track over the turned-out toes
const SIZE = [38, 20, 20], DSZ = { length: SIZE[0], diameter: SIZE[1] }, KG = 20;
const STEP = { h: 10, x0: -12, x1: 27, w: +(process.env.SW ?? 28) };
const feet = { r: { c: 'flat', x: 0, lift: STEP.h }, l: { c: 'flat', x: 0, lift: STEP.h } };
const box = { id: 'step', kind: 'box', center: [r1((STEP.x0 + STEP.x1) / 2), 0, 0], size: [STEP.x1 - STEP.x0, STEP.h, STEP.w] };
const boxes = [H.boxOB(box, 'step')];
const KNEE_TOP = 5, KNEE_B = +(process.env.KB ?? 130), FLOOR = +(process.env.DBF ?? 3);   // rig dumbbell low point at the bottom (the athlete's hands sit lower)
const HZ = +(process.env.HZ ?? 25);   // handle centre out from the midline: inner plate clear of the step
const arms = (p) => { const q = B.hangToLegs(p, F, { mode: 'side', size: DSZ, clear: 1.5, hz: HZ }); delete q.__handle; B.mirrorArm(q); q.ch.sc_l = clone(q.ch.sc_r); return q; };
function hinge(pitch, knee, g) {
  return B.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet, spine: { l5: r1(-3 * g), t12: 0, t6: r1(1 * g) }, sc: { protract: r1(8 * g), elevate: r1(-2 - 6 * g) }, size: DSZ, kg: KG, midfoot: 5, arms });
}
// bottom: the deepest pelvis pitch that keeps hip flexion inside the rig limit (HIP_B), or the dumbbells FLOOR cm up
const HIP_B = +(process.env.HIPB ?? 138.5);
let pa = -30, pb = -66;
for (let i = 0; i < 22; i++) { const pm = (pa + pb) / 2, r = hinge(pm, KNEE_B, 1); if (DBH.dumbbellMinY(r.W, 'r', 'handle', DSZ) > FLOOR && r.pose.ch.hip_r.flex < HIP_B) pa = pm; else pb = pm; }
const PITCH_B = r1((pa + pb) / 2);
function at(f) { const gp = 1 - Math.pow(1 - f, 1.6), gk = Math.pow(f, 1.15); return hinge(PITCH_B * gp, KNEE_TOP + (KNEE_B - KNEE_TOP) * gk, f).pose; }
const T = H.phaseT(meta), [T0, T1] = T.lower, [T2, T3] = T.lift, D = meta.timeline.duration;
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`d${i}`] = at(f); });
const keyframes = [{ t: 0, pose: 'd0' }, ...H.easedKeys('d', FS, T0, T1), { t: T2, pose: `d${N}` }, ...H.easedKeys('d', FS, T2, T3, true), { t: D, pose: 'd0' }];
const props = [box, B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts: F.contacts });
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], boxes, bodySkip: ['foot_r', 'foot_l'] });
const Wt = F.fk(poses.d0), Wb = F.fk(poses[`d${N}`]), pB = poses[`d${N}`];
H.setKin(ex, 'Knee flexion', 'setup', `≈${Math.round(B.kneeOf(Wt, 'r'))}°`); H.setKin(ex, 'Knee flexion', 'peak', `≈${Math.round(B.kneeOf(Wb, 'r'))}° at the bottom`);
H.setKin(ex, 'Hip flexion', 'setup', `≈${Math.round(poses.d0.ch.hip_r.flex)}°`); H.setKin(ex, 'Hip flexion', 'peak', `≈${Math.round(pB.ch.hip_r.flex)}° (joint channel), trunk ≈${Math.round(B.trunkLean(Wb))}° from vertical, spine neutral`);
H.setKin(ex, 'Deficit height', 'setup', `${STEP.h} cm step`); // measured on the athlete mesh at the bottom: plates 6.5 cm above the floor (the rig estimate reads about 3 cm high)
H.setKin(ex, 'Deficit height', 'peak', `Dumbbells about ${r1(STEP.h - 6.5)} cm below the step top at the bottom (hip flexion is held inside the rig's 140° limit, which caps the extra range)`);
H.setKin(ex, 'Tempo', 'setup', `Stand ${T0} s`); H.setKin(ex, 'Tempo', 'peak', `${r1(T1 - T0)} s down, ${r1(T2 - T1)} s at the bottom, ${r1(T3 - T2)} s up, ${r1(D - T3)} s reset`);
console.log(`Dumbbell Deficit Deadlift: wrote ${L.write(ex)}\n  bottom pitch ${PITCH_B}, knee ${KNEE_B}, hip ${pB.ch.hip_r.flex}, db low ${r1(DBH.dumbbellMinY(Wb, 'r', 'handle', DSZ))} cm, handle z ${r1(DBH.dumbbellAt(Wb, 'r', 'handle', DSZ).c[2])}; ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5 || rep.dbBox < 0) { console.error('FAIL: dumbbell through the floor, the step or the body'); process.exitCode = 1; }
if (pB.ch.hip_r.flex > 140) { console.error('FAIL: hip flexion beyond the rig limit'); process.exitCode = 1; }
