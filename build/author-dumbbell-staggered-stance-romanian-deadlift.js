// Dumbbell Staggered Stance Romanian Deadlift (GymVisual "Dumbbell Staggered Stance Romanian Deadlift", movement reference
// only): a B-stance (kickstand) RDL. The right foot is flat and carries most of the weight (soft knee); the left foot is set
// back with its toes a little behind the right heel, on the ball of the foot, as a kickstand. A dumbbell in each hand in
// front of the thighs, palms facing the body. Hinge at the hips with a neutral spine, the hips travelling back so the body
// stays balanced over the right mid-foot, the dumbbells sliding down the front of the legs to about mid-shin; stand tall.
// Both feet planted (constant IK targets: right flat, left on its ball). Authored with the right leg working (the player
// mirrors). Built on the dumbbell RDL (b3-back hinge / hangToLegs on the lunge family's feet).
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const DBH = require('./families/dumbbell');
const G = require('./families/b6-03');
const meta = require('./meta/dumbbell-staggered-stance-romanian-deadlift.json');

const F = makeFamily({ toe: 6, half: 10 });
const SIZE = [32, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const BACK = +(process.env.BACK ?? -32);          // left ankle 32 cm behind the right: its toes a little behind the right heel
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'ball', x: BACK } };
const PITCH = +(process.env.P ?? -78), KNEE_TOP = 8, KNEE = 22;
function at(f) {
  const g = f * f * (3 - 2 * f) * 0.35 + f * 0.65;
  return B.hinge(F, {
    pitch: r1(PITCH * g), knee: r1(KNEE_TOP + (KNEE - KNEE_TOP) * Math.min(1, f / 0.35)), feet, spine: { l5: r1(-3 * g), t12: 0, t6: r1(1 * g) },
    sc: { protract: r1(2 - 4 * g), elevate: -2 }, size: DSZ, kg: 12, midfoot: 4,
    arms: (p) => { const q = B.hangToLegs(p, F, { mode: 'front', size: DSZ, clear: 3.8 }); delete q.__handle; B.mirrorArm(q); q.ch.sc_l = clone(q.ch.sc_r); return q; },
  }).pose;
}
const poses = {};
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1];
FS.forEach((f, i) => { poses[`h${i}`] = at(f); });
poses.settle = at(0.985);
const T0 = 0.8, T1 = 3.0, T2 = 3.3, T3 = 4.6, D = 6.0, N = FS.length - 1;
const keyframes = [{ t: 0, pose: 'h0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * f).toFixed(3), pose: `h${i}` }));
keyframes.push({ t: T1 + 0.15, pose: 'settle' }, { t: T2, pose: `h${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * (1 - FS[i])).toFixed(3), pose: `h${i}` });
keyframes.push({ t: D, pose: 'h0' });
const props = [B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = G.NOTE;
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const Wt = F.fk(poses.h0), Wb = F.fk(poses[`h${N}`]);
const dbB = DBH.dumbbellAt(Wb, 'r', 'handle', DSZ);
const lim = G.limits(ex), set = G.setKin(ex);
set('Stance', 'setup', `Left ankle ${-BACK} cm behind the right, feet 20 cm apart sideways; left heel up on the ball of the foot`); set('Stance', 'peak', `Unchanged; left knee ≈${Math.round(B.kneeOf(Wb, 'l'))}°`);
set('Hip flexion', 'setup', `≈${Math.round(poses.h0.ch.hip_r.flex)}°`); set('Hip flexion', 'peak', `≈${Math.round(poses[`h${N}`].ch.hip_r.flex)}° front hip (joint channel), trunk ≈${Math.round(90 - B.trunkLean(Wb))}° above horizontal`);
set('Knee flexion', 'setup', `≈${Math.round(B.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(B.kneeOf(Wb, 'r'))}° front knee`);
set('Lumbar motion', 'setup', 'Neutral'); set('Lumbar motion', 'peak', `Spine channels ${poses[`h${N}`].ch.spine_l5.flex}°/${poses[`h${N}`].ch.spine_t12.flex}°/${poses[`h${N}`].ch.spine_t6.flex}° (L5/T12/T6): neutral`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', `2.2 s down to a handle height of ${r1(dbB.c[1])} cm, 0.3 s pause, 1.3 s up, 1.4 s reset`);
console.log(`Dumbbell Staggered Stance RDL: wrote ${L.write(ex)}\n  hip ${poses.h0.ch.hip_r.flex}->${poses[`h${N}`].ch.hip_r.flex}, back knee ${Math.round(B.kneeOf(Wt, 'l'))}->${Math.round(B.kneeOf(Wb, 'l'))}, handle y ${r1(dbB.c[1])}; ${JSON.stringify(rep)} limits ${JSON.stringify(lim)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5 || rep.floor < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
G.gateMeasure('dumbbell-staggered-stance-romanian-deadlift', ex, poses[`h${N}`].ch.hip_r.flex);
