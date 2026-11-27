// Dumbbell Deadlift (GymVisual #030012): feet hip width, a heavy dumbbell beside each foot (outside the shins), neutral
// grip. From standing tall, push the hips back and bend the knees with a flat back until the dumbbell plates touch down
// lightly beside the feet (never below the floor), then stand up, hips and shoulders rising together. Like a hex-bar
// deadlift the load sits beside the body, so the knees bend more than in a straight-bar deadlift (Swinton 2011). The body
// is balanced over the mid-foot with the dumbbells (centre of mass) and the arms hang straight. Both feet planted. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const DBH = require('./families/dumbbell');
const meta = require('./meta/dumbbell-deadlift.json');

const F = makeFamily({ toe: 8, half: 10 });
const SIZE = [38, 20, 20], DSZ = { length: SIZE[0], diameter: SIZE[1] };   // heavy hex dumbbells (about 25 kg each)
const KG = 25;
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const KNEE_TOP = 5, KNEE_B = +(process.env.KB ?? 115), FLOOR = +(process.env.DBF ?? 3.0);   // rig dumbbell height at the bottom (the athlete's hands sit lower)
const arms = (p) => { const q = B.hangToLegs(p, F, { mode: 'side', size: DSZ, clear: 1.5 }); delete q.__handle; B.mirrorArm(q); q.ch.sc_l = clone(q.ch.sc_r); return q; };
function hinge(pitch, knee, g) {
  return B.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet, spine: { l5: r1(-3 * g), t12: 0, t6: r1(1 * g) }, sc: { protract: r1(8 * g), elevate: r1(-2 - 6 * g) }, size: DSZ, kg: KG, midfoot: 5, arms });
}
// bottom: the pelvis pitch that puts the dumbbell plates FLOOR cm above the floor at the bottom knee angle
let pa = -40, pb = -62;
for (let i = 0; i < 22; i++) { const pm = (pa + pb) / 2, r = hinge(pm, KNEE_B, 1); if (DBH.dumbbellMinY(r.W, 'r', 'handle', DSZ) > FLOOR) pa = pm; else pb = pm; }
const PITCH_B = r1((pa + pb) / 2);
function at(f) {
  const gp = 1 - Math.pow(1 - f, 1.6), gk = Math.pow(f, 1.15);   // the hips lead back, then the knees bend
  return hinge(PITCH_B * gp, KNEE_TOP + (KNEE_B - KNEE_TOP) * gk, f).pose;
}
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1];
const poses = {};
FS.forEach((f, i) => { poses[`d${i}`] = at(f); });
const T0 = 0.8, T1 = 2.8, T2 = 3.1, T3 = 4.4, D = 6.0, N = FS.length - 1;
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const keyframes = [{ t: 0, pose: 'd0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * inv(f)).toFixed(3), pose: `d${i}` }));
keyframes.push({ t: T2, pose: `d${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv(1 - FS[i])).toFixed(3), pose: `d${i}` });
keyframes.push({ t: D, pose: 'd0' });
const props = [B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = B.NOTE;
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const Wt = F.fk(poses.d0), Wb = F.fk(poses[`d${N}`]), pb_ = poses[`d${N}`];
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Knee flexion', 'setup', `≈${Math.round(B.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(B.kneeOf(Wb, 'r'))}° at the bottom`);
set('Hip flexion', 'setup', `≈${Math.round(poses.d0.ch.hip_r.flex)}°`); set('Hip flexion', 'peak', `≈${Math.round(pb_.ch.hip_r.flex)}° (joint channel); hips ${r1(Wb.hip_r.p[1])} cm high, knees ${r1(Wb.knee_r.p[1])} cm`);
set('Trunk inclination', 'setup', `≈${Math.round(B.trunkLean(Wt))}°`); set('Trunk inclination', 'peak', `≈${Math.round(B.trunkLean(Wb))}° from vertical, spine neutral`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.3 s touch, 1.3 s up, 1.6 s reset');
console.log(`Dumbbell Deadlift: wrote ${L.write(ex)}\n  bottom pitch ${PITCH_B}, knee ${KNEE_B}, hip ${pb_.ch.hip_r.flex}, dumbbell low point ${r1(DBH.dumbbellMinY(Wb, 'r', 'handle', DSZ))} cm; ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
if (pb_.ch.hip_r.flex > 140) { console.error('FAIL: hip flexion beyond the rig limit'); process.exitCode = 1; }
