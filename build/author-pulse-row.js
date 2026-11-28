// Pulse Row (GymVisual 9008, movement reference only; page not readable at authoring time; movement from the name and
// standard coaching descriptions): bodyweight, no equipment. Feet hip width, knees slightly bent (about 20 degrees), hip
// hinge with a neutral spine so the trunk is about 40 degrees above the floor, arms hanging. Row both elbows back toward
// the hips close to the body with the shoulder blades squeezing, then three small pulses at the top (elbows forward a few
// cm and back again), then lower under control. The hinge is held still the whole loop (balanced over the mid-foot); both
// feet planted. Bilateral. Built on author-dumbbell-bent-over-row.js (b3-back.js hinge and rowArm) with empty hands.
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const meta = require('./meta/pulse-row.json');

const F = makeFamily({ toe: 6, half: 10 });
const DSZ = { length: 20, diameter: 9 };   // virtual fist-sized "handle" for the hand clearance check only (nothing is drawn)
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const PITCH = -55, KNEE = 20;
const ROW = { top: { du: -18, dz: 10, wx: 8, wz: 2, tilt: 15, flex: 85 }, sc: [{ protract: 6, elevate: -2 }, { protract: -16, elevate: -2 }], hang: [6, 3] };
const state = {};
const base = B.hinge(F, { pitch: PITCH, knee: KNEE, feet, spine: { l5: -3, t12: 0, t6: 1 }, sc: ROW.sc[0], size: DSZ, kg: 0, midfoot: 5,
  arms: (p) => B.mirrorArm(B.rowArm(p, 0, ROW, {})) }).pose;
function at(f) { const q = B.rowArm(base, f, ROW, state); B.mirrorArm(q); return B.wrapPose(q); }
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`r${i}`] = at(f); });
poses.pulse = at(0.82);   // pulse: elbows a few cm forward of the top
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const T0 = 0.8, T1 = 1.8, T2 = 3.6, T3 = 5.2, D = 5.8;
const keyframes = [{ t: 0, pose: 'r0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * inv(f)).toFixed(3), pose: `r${i}` }));
for (let k = 0; k < 3; k++) keyframes.push({ t: +(T1 + 0.3 + 0.6 * k).toFixed(2), pose: 'pulse' }, { t: +(T1 + 0.6 + 0.6 * k).toFixed(2), pose: `r${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv(1 - FS[i])).toFixed(3), pose: `r${i}` });
keyframes.push({ t: D, pose: 'r0' });
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = B.NOTE;
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'pelvis'] });
const W0 = F.fk(poses.r0), W1 = F.fk(poses[`r${N}`]), Wp = F.fk(poses.pulse);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Trunk angle', 'setup', `≈${Math.round(90 - B.trunkLean(W0))}° above horizontal (hip channel ${Math.round(base.ch.hip_r.flex)}°), spine neutral`); set('Trunk angle', 'peak', 'Unchanged (held)');
set('Knee flexion', 'setup', `≈${Math.round(B.kneeOf(W0, 'r'))}°`); set('Knee flexion', 'peak', 'Unchanged');
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}° at the top, shoulder blades retracted (clavicle protraction ${ROW.sc[0].protract}° to ${ROW.sc[1].protract}°)`);
set('Pulses', 'setup', 'Row to the top first'); set('Pulses', 'peak', `Three pulses between ≈${Math.round(B.elbowOf(Wp, 'r'))}° and ≈${Math.round(B.elbowOf(W1, 'r'))}° of elbow flexion`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1 s up, three 0.6 s pulses, 1.6 s down, 0.6 s reset');
console.log(`Pulse Row: wrote ${L.write(ex)}\n  trunk ${r1(90 - B.trunkLean(W0))} deg above horizontal, elbow ${Math.round(B.elbowOf(W0, 'r'))}->${Math.round(B.elbowOf(W1, 'r'))} (pulse ${Math.round(B.elbowOf(Wp, 'r'))}), top arm cost ${state.cost.toFixed(2)}; ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbBody < -0.5) { console.error('FAIL: hands through the body'); process.exitCode = 1; }
