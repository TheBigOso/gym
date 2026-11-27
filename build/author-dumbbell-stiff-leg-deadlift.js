// Dumbbell Stiff-Leg Deadlift (GymVisual #043212): feet hip width, knees nearly straight (about 5-10 degrees) the whole
// rep, a dumbbell in each hand in front of the thighs (palms facing the body). Hinge at the hips with a flat back, the hips
// travelling back so the body stays balanced over the mid-foot, while the dumbbells run down the front of the legs to the
// lower shin; stand tall again. Compared with the Romanian deadlift (soft knees, to mid-shin) the knees stay straighter and
// the hips hinge further. Both feet planted. Bilateral.
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/dumbbell-stiff-leg-deadlift.json');

const F = makeFamily({ toe: 6, half: 10 });
const SIZE = [32, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const PITCH = +(process.env.P ?? -92), KNEE_TOP = 4, KNEE = +(process.env.K ?? 8);
function at(f) {
  const g = f * f * (3 - 2 * f) * 0.35 + f * 0.65;
  return B.hinge(F, {
    pitch: r1(PITCH * g), knee: r1(KNEE_TOP + (KNEE - KNEE_TOP) * Math.min(1, f / 0.3)), feet, spine: { l5: r1(-3 * g), t12: r1(1 * g), t6: r1(2 * g) },
    sc: { protract: r1(2 + 2 * g), elevate: -2 }, size: DSZ, kg: 10, midfoot: 5,
    arms: (p) => { const q = B.hangToLegs(p, F, { mode: 'front', size: DSZ, clear: 3.8 }); delete q.__handle; B.mirrorArm(q); q.ch.sc_l = clone(q.ch.sc_r); return q; },
  }).pose;
}
const T = H.phaseT(meta), [T0, T1] = T.lower, [T2, T3] = T.rise, D = meta.timeline.duration;
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`h${i}`] = at(f); });
poses.settle = at(0.985);
const keyframes = [{ t: 0, pose: 'h0' }, ...H.easedKeys('h', FS, T0, T1), { t: T1 + 0.15, pose: 'settle' }, { t: T2, pose: `h${N}` }, ...H.easedKeys('h', FS, T2, T3, true), { t: D, pose: 'h0' }];
const props = [B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts: F.contacts });
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const Wt = F.fk(poses.h0), Wb = F.fk(poses[`h${N}`]), dbB = DBH.dumbbellAt(Wb, 'r', 'handle', DSZ);
H.setKin(ex, 'Hip flexion', 'setup', `≈${Math.round(poses.h0.ch.hip_r.flex)}°`); H.setKin(ex, 'Hip flexion', 'peak', `≈${Math.round(poses[`h${N}`].ch.hip_r.flex)}° (joint channel), trunk ≈${Math.round(90 - B.trunkLean(Wb))}° above horizontal`);
H.setKin(ex, 'Knee flexion', 'setup', `≈${Math.round(B.kneeOf(Wt, 'r'))}°`); H.setKin(ex, 'Knee flexion', 'peak', `≈${Math.round(B.kneeOf(Wb, 'r'))}°`);
H.setKin(ex, 'Lumbar motion', 'setup', 'Neutral'); H.setKin(ex, 'Lumbar motion', 'peak', `Spine channels ${poses[`h${N}`].ch.spine_l5.flex}°/${poses[`h${N}`].ch.spine_t12.flex}°/${poses[`h${N}`].ch.spine_t6.flex}° (L5/T12/T6): neutral`);
H.setKin(ex, 'Tempo', 'setup', `Stand ${T0} s`); H.setKin(ex, 'Tempo', 'peak', `${r1(T1 - T0)} s down to a handle height of ${r1(dbB.c[1])} cm (lower shin), ${r1(T2 - T1)} s pause, ${r1(T3 - T2)} s up, ${r1(D - T3)} s reset`);
console.log(`Dumbbell Stiff-Leg Deadlift: wrote ${L.write(ex)}\n  hip ${poses.h0.ch.hip_r.flex}->${poses[`h${N}`].ch.hip_r.flex}, knee ${Math.round(B.kneeOf(Wb, 'r'))}, trunk ${r1(B.trunkLean(Wb))} from vertical, handle y ${r1(dbB.c[1])}, db low ${r1(DBH.dumbbellMinY(Wb, 'r', 'handle', DSZ))}; ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
