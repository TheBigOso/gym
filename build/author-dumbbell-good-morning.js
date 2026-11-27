// Dumbbell Good Morning (GymVisual #642412): feet hip width, knees soft, one dumbbell held upright against the chest (goblet
// hold: the right hand carries it, both palms cup the top plate, elbows down). Push the hips back and tip the trunk forward
// with a flat back until it is close to level (hip flexion about 75-90 degrees, knees about 20 degrees, as in Vigotsky 2015),
// then drive the hips forward to stand tall. The arms stay fixed to the chest (the dumbbell moves with the trunk); the body
// and dumbbell are balanced over the mid-foot. Both feet planted. Bilateral.
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const B3L = require('./families/b3-legs');
const H = require('./families/b4-hinges');
const meta = require('./meta/dumbbell-good-morning.json');

const F = makeFamily({ toe: 6, half: 10 });
const OFF = B3L.GOBLET_OFFSET, GRIP = B3L.gripSpec('goblet', OFF), DSZ = { length: 32, diameter: 12 };
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const PITCH = +(process.env.P ?? -76), KNEE_TOP = 5, KNEE = +(process.env.K ?? 20);
// goblet arms solved once on the standing pose (upper-trunk frame), then carried by the trunk
const stand = F.pose(F.stand(feet, { knee: KNEE_TOP }));
const gob = B3L.gobletArms(stand, { at: [25, 6, 5.4], elbow: [14, -16, 17], tilt: 0.45 }); // elbow z 17: rig v2 shoulders are wider (z 20.2)
const ARMS = ['sc_r', 'sc_l', 'shoulder_r', 'shoulder_l', 'elbow_r', 'elbow_l', 'wrist_r', 'wrist_l'];
const arms = (p) => { for (const j of ARMS) p.ch[j] = clone(gob.ch[j]); return p; };
function at(f) {
  const g = f * f * (3 - 2 * f) * 0.35 + f * 0.65;
  return B.hinge(F, { pitch: r1(PITCH * g), knee: r1(KNEE_TOP + (KNEE - KNEE_TOP) * Math.min(1, f / 0.5)), feet, spine: { l5: r1(-4 * g), t12: r1(-1 * g), t6: r1(1 * g) },
    size: DSZ, kg: 5, grip: GRIP, midfoot: 5, arms }).pose;
}
const T = H.phaseT(meta), [T0, T1] = T.lower, [T2, T3] = T.rise, D = meta.timeline.duration;
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`h${i}`] = at(f); });
poses.settle = at(0.985);
const keyframes = [{ t: 0, pose: 'h0' }, ...H.easedKeys('h', FS, T0, T1), { t: T1 + 0.15, pose: 'settle' }, { t: T2, pose: `h${N}` }, ...H.easedKeys('h', FS, T2, T3, true), { t: D, pose: 'h0' }];
const props = [B3L.heldProp('r', 'goblet', OFF)];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts: F.contacts });
const rep = B.sweep(ex, { fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const db = B3L.dbLoop(ex, [{ side: 'r', grip: 'goblet', offset: OFF }], ['chest', 'pecs', 'abdomen', 'ribcage', 'thigh', 'quad', 'head', 'jaw']);
const Wt = F.fk(poses.h0), Wb = F.fk(poses[`h${N}`]);
H.setKin(ex, 'Hip flexion', 'setup', `≈${Math.round(poses.h0.ch.hip_r.flex)}°`); H.setKin(ex, 'Hip flexion', 'peak', `≈${Math.round(poses[`h${N}`].ch.hip_r.flex)}° (joint channel), trunk ≈${Math.round(90 - B.trunkLean(Wb))}° above horizontal`);
H.setKin(ex, 'Knee flexion', 'setup', `≈${Math.round(B.kneeOf(Wt, 'r'))}°`); H.setKin(ex, 'Knee flexion', 'peak', `≈${Math.round(B.kneeOf(Wb, 'r'))}°`);
H.setKin(ex, 'Lumbar motion', 'setup', 'Neutral'); H.setKin(ex, 'Lumbar motion', 'peak', `Spine channels ${poses[`h${N}`].ch.spine_l5.flex}°/${poses[`h${N}`].ch.spine_t12.flex}°/${poses[`h${N}`].ch.spine_t6.flex}° (L5/T12/T6): neutral`);
H.setKin(ex, 'Tempo', 'setup', `Stand ${T0} s`); H.setKin(ex, 'Tempo', 'peak', `${r1(T1 - T0)} s down, ${r1(T2 - T1)} s pause, ${r1(T3 - T2)} s up, ${r1(D - T3)} s reset`);
console.log(`Dumbbell Good Morning: wrote ${L.write(ex)}\n  hip ${poses.h0.ch.hip_r.flex}->${poses[`h${N}`].ch.hip_r.flex}, knee ${Math.round(B.kneeOf(Wb, 'r'))}, trunk ${r1(90 - B.trunkLean(Wb))} above horiz, goblet arm cost ${gob.__armCost.toFixed(2)}; ${JSON.stringify(rep)} ${JSON.stringify(db)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (db.dbFloor < 0 || db.dbClear < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
