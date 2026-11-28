// Dumbbell Incline Shrug (GymVisual #1369; page not read, movement from the name): chest-supported on an adjustable bench
// at 40 degrees, straddling the seat with the balls of the feet planted on the floor behind (same base as the
// chest-supported row, b4-curls2 chestOnPad). The arms hang straight outside the pad with the dumbbells (neutral grip,
// palms in). Only the shoulder girdle moves: the shoulder blades lift straight up along the trunk toward the ears
// (clavicle elevation about 0 to 26 degrees), squeeze, then sink slowly to a full stretch. Arm channels are constant,
// so the arms ride up with the shoulders. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const B = require('./families/b3-back');
const C2 = require('./families/b4-curls2');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-incline-shrug.json');
const ID = meta.exercise.id;

const SIZE = [30, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const ELEV = +(process.env.EL || 22), PRO0 = 4;
const S = C2.chestOnPad({ ang: 40, along: 23 });
const { bench, boxes, contacts } = S;
const ROW = { top: { du: -12, dz: 10, wz: 2, flex: 100, tilt: 10 }, sc: [{ protract: PRO0, elevate: -4 }, { protract: PRO0, elevate: -4 }], hang: [3, 7] };
const state = {};
const hang = B.rowArm(S.body, 0, ROW, state); B.mirrorArm(hang); B.wrapPose(hang);
const at = (f) => { const q = clone(hang); q.ch.sc_r = { protract: r1(PRO0 - 4 * f), elevate: r1(-4 + (ELEV + 4) * f) }; q.ch.sc_l = clone(q.ch.sc_r); return q; };
const FS = [0, 0.33, 0.66, 1];
const poses = {}; FS.forEach((f, i) => { poses[`s${i}`] = at(f); });
poses.hold = at(1.04);
const up = G.easeTimes(FS.slice(1), 0.7, 1.8), dn = G.easeTimes(FS.slice(1), 2.6, 4.4);
const keyframes = [{ t: 0, pose: 's0' }, { t: 0.7, pose: 's0' }, ...up.map((t, i) => ({ t, pose: `s${i + 1}` })), { t: 2.2, pose: 'hold' }, { t: 2.6, pose: 's3' }, ...dn.map((t, i) => ({ t, pose: `s${2 - i}` })), { t: 5.0, pose: 's0' }];
const props = [bench.prop, B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = B.NOTE;
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['pelvis', 'ankle_r', 'ankle_l'], boxes, bodySkip: ['chest', 'pecs_r', 'pecs_l', 'ribcage', 'abdomen'] });
const W0 = L.fk(poses.s0, contacts), W1 = L.fk(poses.s3, contacts);
const along = (W, j) => V.dot(V.sub(W[j].p, bench.hinge), bench.padDir);
const rise = along(W1, 'shoulder_r') - along(W0, 'shoulder_r');
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k[f] = v; };
set('Scapular elevation', 'setup', `Shoulders relaxed down (clavicle elevation ${poses.s0.ch.sc_r.elevate}°)`); set('Scapular elevation', 'peak', `Clavicle elevation ${poses.s3.ch.sc_r.elevate}°: shoulders ${r1(rise)} cm higher along the trunk, hands ${r1(V.len(V.sub(W1.wrist_r.p, W0.wrist_r.p)))} cm`);
set('Bench angle', 'setup', `40° back pad, seat 45 cm; chest on the pad, head ${r1(along(W0, 'head_c1') - 80)} cm past the top`); set('Bench angle', 'peak', 'Unchanged (the trunk does not move)');
set('Elbow flexion', 'setup', `${G.deg(B.elbowOf(W0, 'r'))} (arms long)`); set('Elbow flexion', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Hang 0.7 s'); set('Tempo', 'peak', '1.1 s up, 0.8 s squeeze, 1.8 s down, 0.6 s reset');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  hang ${JSON.stringify(hang.ch.shoulder_r)} elbow ${hang.ch.elbow_r.flex} cost ${state.cost.toFixed(2)} rise ${r1(rise)}\n  ${JSON.stringify(rep)}`);
G.fail(ID, [rep.slide > 0.05 && 'slide', rep.drift > 0.05 && 'drift', rep.dbFloor < 0 && 'db floor', rep.dbBody < -0.5 && `db body ${rep.dbBody}`, rep.dbBox < 0 && `db bench ${rep.dbBox}`, rep.floor < -0.5 && 'floor', ...G.limits(poses)]);
