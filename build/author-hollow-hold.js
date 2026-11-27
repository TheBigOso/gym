// Hollow Hold (GymVisual #124612). Bilateral isometric: supine, legs straight and together, arms overhead. The low back is
// pressed into the mat (posterior pelvic tilt), the shoulder blades and the straight legs lift a few centimetres into a
// shallow banana shape and hold, with small breathing settles; at the loop ends the body lowers to the mat and lifts back.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const C = require('./families/core-b');
const meta = require('./meta/hollow-hold.json');

const lowBack = (W) => Math.min(C.bottomOf(W, 'pelvis'), C.bottomOf(W, 'buttock_r'), C.bottomOf(W, 'buttock_l'), C.bottomOf(W, 'abdomen'));
const heel = (W, s) => Math.min(C.bottomOf(W, `foot_${s}`), C.bottomOf(W, `calf_${s}`), C.bottomOf(W, `shank_${s}`));
const handLow = (W, s) => Math.min(...(s === 'r' ? C.ARM_R : C.ARM_L).map((id) => C.bottomOf(W, id)));
const hollowShape = (W) => Math.min(C.bottomOf(W, 'chest'), C.bottomOf(W, 'ribcage'));

/* ---------------- Rest: lying long, arms overhead on the mat ---------------- */
let rest = C.headDown(C.lie({ kneeFlex: 0, spine: { l5: -2, t12: 2, t6: 4 }, pitch: 92 }), 0.2);
for (const s of ['r', 'l']) { rest.ch[`knee_${s}`] = { flex: 2 }; rest.ch[`ankle_${s}`] = { dorsi: -25 }; rest.ch[`hip_${s}`] = { flex: 0, abd: 0, rot: 0 }; }
function armsOver(pose, hover) {
  const p = clone(pose);
  p.ch.elbow_r = { flex: 5 }; p.ch.wrist_r = { pron: 0, flex: 0, dev: 0 }; p.ch.shoulder_r = { plane: 90, elev: 165, axial: 0 }; p.ch.sc_r = { protract: 2, elevate: 14 };
  const q = L.solvePose(p, ['ch.shoulder_r.elev'], [(W) => [(handLow(W, 'r') - hover) * 2], L.obj.reg('ch.shoulder_r.elev', 185, 0.02), (W, q) => [Math.max(0, q.ch.shoulder_r.elev - 200) * 5]]).pose;
  return C.mirrorArm(q);
}
// Legs straight: hip flexion so the lowest point of the lower legs is `h` cm above the mat (0 = resting).
function legs(pose, h) {
  const p = clone(pose);
  const sol = L.solvePose(p, ['ch.hip_r.flex'], [(W) => [(heel(W, 'r') - h) * 2]]).pose;
  sol.ch.hip_l = clone(sol.ch.hip_r);
  return sol;
}
rest = legs(rest, 0.4);
rest = armsOver(rest, 0.6);
rest = L.groundPose(rest);

/* ---------------- Hollow: pelvis tucked under, shoulder blades and legs up ---------------- */
// k: lift of the shoulder blades (chest bottom, cm), heel height (cm), arm hover (cm), neck flexion.
function hollow(k) {
  let p = clone(rest);
  p = L.solvePose(p, ['root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
    (W) => [lowBack(W) * 4, (C.bottomOf(W, 'chest') - k.chest) * 2, Math.min(0, C.bottomOf(W, 'ribcage') - 0.3) * 4],
    L.obj.reg('ch.spine_l5.flex', 12, 0.1), L.obj.reg('ch.spine_t12.flex', 16, 0.08), L.obj.reg('ch.spine_t6.flex', 16, 0.08),
  ]).pose;
  C.neck(p, k.neck);
  p = legs(p, k.heel);
  p = armsOver(p, k.hand);
  return L.groundPose(p);
}
const H = { chest: 10, heel: 18, hand: 15, neck: 24 };
const poses = {
  rest,
  hold: hollow(H),
  holdIn: hollow({ chest: 11, heel: 19.5, hand: 16, neck: 25 }),   // breath in: a touch higher
  holdOut: hollow({ chest: 9.2, heel: 16.8, hand: 14, neck: 23 }),    // breath out / settle
};
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.8, pose: 'rest' }, { t: 2.0, pose: 'hold' }, { t: 3.6, pose: 'holdIn' }, { t: 5.2, pose: 'holdOut' }, { t: 6.8, pose: 'holdIn' },
  { t: 8.4, pose: 'hold' }, { t: 9.4, pose: 'rest' }, { t: 10.0, pose: 'rest' }];
const ex = C.moduleOf(meta, poses, keyframes, []);
const hipPk = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hipPk) - 3, max: Math.ceil(hipPk) + 3 };

const rep = C.scan(ex);
const Wr = L.fk(rest), Wh = L.fk(poses.hold);
const legDeg = (W) => Math.atan2(W.ankle_r.p[1] - W.hip_r.p[1], W.ankle_r.p[0] - W.hip_r.p[0]) / R.DEG;
const ho = poses.hold.ch;
Object.assign(rep, { rest: { pitch: rest.root.rot.pitch, spine: [rest.ch.spine_l5.flex, rest.ch.spine_t12.flex, rest.ch.spine_t6.flex], hand: r1(handLow(Wr, 'r')) },
  hold: { pitch: poses.hold.root.rot.pitch, spine: [ho.spine_l5.flex, ho.spine_t12.flex, ho.spine_t6.flex], hip: ho.hip_r.flex, leg: r1(legDeg(Wh)), heel: r1(heel(Wh, 'r')), chest: r1(C.bottomOf(Wh, 'chest')), lowBack: r1(lowBack(Wh)), shoulder: ho.shoulder_r.elev, hand: r1(handLow(Wh, 'r')) }, measure: ex.checks.measure });
C.setKin(ex, 'Low back', `Lumbar segment ${C.deg(rest.ch.spine_l5.flex)}, pelvis pitch ${C.deg(rest.root.rot.pitch - 90)}`, `Lumbar segment ${C.deg(ho.spine_l5.flex)} flexion, pelvis tucked ${C.deg(poses.hold.root.rot.pitch - rest.root.rot.pitch)} more (posterior tilt); low back on the mat`);
C.setKin(ex, 'Leg lift', 'Legs on the mat', `Hip ${C.deg(ho.hip_r.flex)}, legs ${C.deg(legDeg(Wh))} above level, heels ${Math.round(heel(Wh, 'r'))} cm off the mat`);
C.setKin(ex, 'Shoulder lift', 'Upper back on the mat', `Shoulder blades ${Math.round(C.bottomOf(Wh, 'chest'))} cm off the mat (thoracic segments ${C.deg(ho.spine_t12.flex + ho.spine_t6.flex)})`);
C.setKin(ex, 'Arms', `Overhead, shoulder ${C.deg(rest.ch.shoulder_r.elev)}, resting`, `Shoulder ${C.deg(ho.shoulder_r.elev)}, hands ${Math.round(handLow(Wh, 'r'))} cm off the mat`);
C.setKin(ex, 'Hold time', 'Lie 0.8 s', '1.2 s lift, 6.4 s hold with two breath settles, 1 s lower; 10 s loop');
C.finish(ex, rep, 'Hollow Hold');
