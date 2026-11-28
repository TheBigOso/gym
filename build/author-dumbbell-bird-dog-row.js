// Dumbbell Bird Dog Row (GymVisual #25098; page not readable here, movement from the name and the usual coaching
// description): tabletop on a flat bench, balanced on the right knee (shin along the pad, foot pointed back) and the left hand
// (planted under the shoulder), the left leg held straight back about level with the hip (the bird-dog line). The right arm
// rows the dumbbell (neutral grip) from a straight-arm hang to the side of the ribs, elbow close, shoulder blade squeezing back;
// pause; lower slowly. Trunk, pelvis and supports stay still and square. Authored right arm / left leg (the player mirrors).
// Support position from b6-04.js birdDogBench; row arm from b3-back rowArm.
const L = require('./lib');
const { V, r1, clone } = L;
const F6 = require('./families/b6-04');
const B = require('./families/b3-back');
const meta = require('./meta/dumbbell-bird-dog-row.json');
const SIZE = [32, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const S0 = F6.birdDogBench(), { contacts, bench, boxes } = S0, pose = S0.pose;
const ROW = { top: { du: +(process.env.DU ?? -26), dz: +(process.env.DZ ?? 7), wx: 4, wz: 1, tilt: 8 }, sc: [{ protract: 8, elevate: 0 }, { protract: -16, elevate: -1 }], hang: [4, 3] };
const state = {}, costs = [];
const at = (f) => { const q = B.wrapPose(B.rowArm(pose, f, ROW, state)); costs.push(+state.cost.toFixed(3)); return q; };
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1], N = FS.length - 1, poses = {};
FS.forEach((f, i) => { poses[`r${i}`] = at(f); });
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const ease = (u) => u * u * (3 - 2 * u), inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const kf = [{ t: 0, pose: 'r0' }];
FS.forEach((f, i) => kf.push({ t: ph.row.start + (ph.row.end - ph.row.start) * inv(f), pose: `r${i}` }));
kf.push({ t: ph.squeeze.end, pose: `r${N}` });
for (let i = N - 1; i >= 0; i--) kf.push({ t: ph.lower.start + (ph.lower.end - ph.lower.start) * inv(1 - FS[i]), pose: `r${i}` });
kf.push({ t: D, pose: 'r0' });
const keyframes = [...new Map(kf.map((k) => [+k.t.toFixed(3), { t: +k.t.toFixed(3), pose: k.pose }])).values()].sort((a, b) => a.t - b.t);
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [bench.prop, B.heldProp('r', 'handle', SIZE)], contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
ex.exercise.reference.note = B.NOTE;
const rep = B.sweep(ex, { held: [{ side: 'r', grip: 'handle', size: DSZ }], fixed: ['knee_r', 'ankle_r', 'pelvis', 'ankle_l'], boxes, bodySkip: ['hand_l', 'thumb_l', 'forearm_l', 'shank_r', 'calf_r', 'foot_r', 'thigh_r', 'quad_r'] });
const W0 = L.fk(poses.r0, contacts), W1 = L.fk(poses[`r${N}`], contacts);
const legAng = Math.atan2(W0.ankle_l.p[1] - W0.hip_l.p[1], W0.hip_l.p[0] - W0.ankle_l.p[0]) / L.R.DEG;
const legBench = B.bodyBoxClear(W0, boxes, rigShapesExcept(['thigh_l', 'quad_l', 'shank_l', 'calf_l', 'foot_l']));
function rigShapesExcept(keep) { return L.rig.shapes.map((s) => s.id).filter((id) => !keep.includes(id)); }
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Trunk angle', 'setup', `≈${Math.round(90 - B.trunkLean(W0))}° above horizontal, spine neutral`); set('Trunk angle', 'peak', 'Unchanged (no twist)');
set('Extended leg', 'setup', `Left leg straight back, ${r1(legAng)}° below the hip line, knee ≈${Math.round(B.kneeOf(W0, 'l'))}°`); set('Extended leg', 'peak', 'Held still through the row');
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}°`);
set('Shoulder extension', 'setup', 'Arm hanging straight down'); set('Shoulder extension', 'peak', `Elbow ${r1(W1.elbow_r.p[1] - W1.shoulder_r.p[1])} cm above the shoulder joint, shoulder blade retracted (clavicle 8° to -16°)`);
set('Tempo', 'setup', `Hang ${ph.setup.end} s`); set('Tempo', 'peak', `${r1(ph.row.end - ph.row.start)} s up, ${r1(ph.squeeze.end - ph.squeeze.start)} s squeeze, ${r1(ph.lower.end - ph.lower.start)} s down`);
const tl = B.trunkLean(W0); ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tl - 3), max: Math.ceil(tl + 3) };
console.log(`Dumbbell Bird Dog Row: wrote ${L.write(ex)}\n  K ${S0.K} A ${S0.A} hand ${S0.HAND} bench x ${bench.seatX[0]}..${r1(bench.tip[0])} z ${bench.prop.center[2]} leg ${r1(legAng)} vs bench ${JSON.stringify(legBench)} costs ${costs} trunk ${tl.toFixed(1)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted contacts slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5 || rep.dbBox < 0 || rep.bodyBox < -1.5) { console.error('FAIL: dumbbell or body through the floor, the bench or the body'); process.exitCode = 1; }
