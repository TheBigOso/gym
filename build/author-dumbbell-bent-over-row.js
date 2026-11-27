// Dumbbell Bent-Over Row (GymVisual #029312): feet hip width, soft knees (about 20 degrees), hip hinge with a neutral spine
// so the trunk is about 40 degrees above the floor, a dumbbell in each hand (neutral grip). Row both dumbbells to the
// lower ribs, elbows driving up and back close to the body with the shoulder blades squeezing together, pause, lower
// slowly to straight arms. The hinge is held still the whole loop (balanced over the mid-foot); both feet planted. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const DBH = require('./families/dumbbell');
const meta = require('./meta/dumbbell-bent-over-row.json');

const F = makeFamily({ toe: 6, half: 10 });
const SIZE = [32, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const PITCH = -58, KNEE = 20;
const ROW = { top: { du: -26, dz: 8, wx: 8, wz: 2, tilt: 15 }, sc: [{ protract: 6, elevate: -2 }, { protract: -14, elevate: -2 }], hang: [6, 3] };
const state = {};
// the hinge (root, legs, trunk, head) is solved once with the arms hanging; the rows only move the arms and shoulder blades
const base = B.hinge(F, { pitch: PITCH, knee: KNEE, feet, spine: { l5: -3, t12: 0, t6: 1 }, sc: ROW.sc[0], size: DSZ, kg: 12, midfoot: 5,
  arms: (p) => B.mirrorArm(B.rowArm(p, 0, ROW, {})) }).pose;
function at(f) { const q = B.rowArm(base, f, ROW, state); B.mirrorArm(q); return B.wrapPose(q); }
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const poses = {};
FS.forEach((f, i) => { poses[`r${i}`] = at(f); });
const T0 = 0.8, T1 = 1.9, T2 = 2.3, T3 = 4.3, D = 5.5, N = FS.length - 1;
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const keyframes = [{ t: 0, pose: 'r0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * inv(f)).toFixed(3), pose: `r${i}` }));
keyframes.push({ t: T2, pose: `r${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv(1 - FS[i])).toFixed(3), pose: `r${i}` });
keyframes.push({ t: D, pose: 'r0' });
const props = [B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = B.NOTE;
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'pelvis'] });
const W0 = F.fk(poses.r0), W1 = F.fk(poses[`r${N}`]);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Trunk angle', 'setup', `≈${Math.round(90 - B.trunkLean(W0))}° above horizontal (hip channel ${Math.round(base.ch.hip_r.flex)}°), spine neutral`); set('Trunk angle', 'peak', 'Unchanged (held)');
set('Knee flexion', 'setup', `≈${Math.round(B.kneeOf(W0, 'r'))}°`); set('Knee flexion', 'peak', 'Unchanged');
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}°, shoulder blades retracted (clavicle protraction ${ROW.sc[0].protract}° to ${ROW.sc[1].protract}°)`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.1 s up, 0.4 s squeeze, 2.0 s down, 1.2 s reset');
console.log(`Dumbbell Bent-Over Row: wrote ${L.write(ex)}\n  trunk ${r1(90 - B.trunkLean(W0))} deg above horizontal, elbow ${Math.round(B.elbowOf(W0, 'r'))}->${Math.round(B.elbowOf(W1, 'r'))}, top arm cost ${state.cost.toFixed(2)}; ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
