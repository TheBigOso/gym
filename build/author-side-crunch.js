// Side Crunch (GymVisual #070812). Authored on the right: lying on the left side on a mat, hips stacked, knees slightly
// bent, the top (right) leg resting on the bottom leg; fingertips of both hands behind the head, elbows wide. Side-bend the
// trunk to lift both shoulders off the mat, bringing the top ribs toward the top hip (right obliques and quadratus
// lumborum), squeeze, lower under control. The pelvis and legs stay still. The root is written with yaw -90 / roll +90 so
// that pitch 180 lays the pelvis on its left side (see bent-knee-lying-twist). Floor contact calibrated to the mesh.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const M = require('./families/b4-core2');
const meta = require('./meta/side-crunch.json');

// Mesh offsets for side-lying (mesh lowest point minus rig shape lowest point), measured with b2/b4c2/bones.mjs
const SIDE = { hip: +(process.env.SH || 3), shoulder: +(process.env.SS || -1), shank: +(process.env.SK || 2.2) };
let p = M.lie({ kneeFlex: 0, headRest: 'free' });
p.root.rot = { yaw: -90, pitch: 180, roll: 90 };
for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 0, latFlex: 0 };
p.ch.hip_r = { flex: 25, abd: -9, rot: 0 }; p.ch.hip_l = { flex: 25, abd: 0, rot: 0 };
p.ch.knee_r = { flex: 35 }; p.ch.knee_l = { flex: 35 }; p.ch.ankle_r = { dorsi: -20 }; p.ch.ankle_l = { dorsi: -20 };
const hipLow = (W) => Math.min(M.bottomOf(W, 'pelvis'), M.bottomOf(W, 'buttock_l'), M.bottomOf(W, 'thigh_l'), M.bottomOf(W, 'quad_l'));
const shLow = (W) => Math.min(M.bottomOf(W, 'deltoid_l'), M.bottomOf(W, 'ribcage'), M.bottomOf(W, 'chest'));
// left hip and left shoulder/ribs on the mat; the trunk may sag a little sideways (latFlex) and tip (pitch)
p = L.solvePose(p, ['root.pos.1', 'root.rot.pitch'], [
  (W) => [(hipLow(W) + SIDE.hip) * 4, (shLow(W) + SIDE.shoulder) * 4],
  L.obj.reg('root.rot.pitch', 180, 2)], { iters: 400 }).pose;
// legs resting: the top knee and foot rest on the bottom ones, the bottom leg on the mat
p = L.solvePose(p, ['ch.hip_r.abd', 'ch.hip_l.abd'], [(W) => [(M.bottomOf(W, 'shank_l') - SIDE.shank) * 3, (W.knee_r.p[1] - W.knee_l.p[1] - 11) * 2], CA.limitPen(['ch.hip_r.abd', 'ch.hip_l.abd'], 4), L.obj.reg('ch.hip_r.abd', -8, 0.05), L.obj.reg('ch.hip_l.abd', 0, 0.05)], { iters: 200 }).pose;
CB.neck(p, 4);
p.ch.sc_l = { protract: +(process.env.PRO || 28), elevate: 4 }; // bottom shoulder rolled forward so it is not crushed under the trunk
// bottom (left) hand rests palm down on the mat in front of the chest (planted, for balance only)
const HC = [Object.assign(L.handContact('l'), { pole: [0.3, 1, 0] })];
const Wp = L.fk(p), SL = Wp.shoulder_l.p, dH = Math.sqrt(L.reach(45) ** 2 - (SL[1] - 2.6) ** 2 - 64);
const HAND_L = [r1(SL[0] + 8), 2.6, r1(SL[2] - dH)];
const rest = p;

function key(k, ref) {
  const q = clone(rest);
  const sp = { spine_l5: 0.36, spine_t12: 0.36, spine_t6: 0.28 };
  for (const j in sp) Object.assign(q.ch[j], { latFlex: r1(rest.ch[j].latFlex + k.lat * sp[j]), flex: r1((rest.ch[j].flex || 0) + (k.flex || 0) * sp[j]) });
  CB.neck(q, k.neck ?? 4);
  let out = CB.cradle(q, { side: 'r', elbowAnt: -4, elbowOut: 18, guess: ref ? ref.r : null, ref: ref ? ref.r : null }); delete out.__cost;
  out = CA.fitArm(out, 'l', HAND_L, HC);
  out.ik = { arm_l: { target: HAND_L.slice(), weight: 1 } };
  return out;
}
let best = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  const q = CB.cradle(clone(rest), { side: 'r', guess: g }); if (!best || q.__cost < best.__cost) best = q;
}
const REF0 = { r: CB.armOf(best, 'r') };
const arms = (q) => ({ r: CB.armOf(q, 'r') });
const LAT = +(process.env.LAT || 36);
const poses = { rest: key({ lat: 0 }, REF0) };
poses.lift = key({ lat: LAT * 0.5, flex: 3, neck: 6 }, arms(poses.rest));
poses.top = key({ lat: LAT, flex: 5, neck: 8 }, arms(poses.lift));
poses.topHold = key({ lat: LAT + 1.5, flex: 5, neck: 8 }, arms(poses.top));
poses.lower = key({ lat: LAT * 0.35, flex: 2, neck: 6 }, arms(poses.topHold));
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.8, pose: 'rest' }, { t: 1.3, pose: 'lift' }, { t: 1.9, pose: 'top' }, { t: 2.5, pose: 'topHold' }, { t: 3.6, pose: 'lower' }, { t: 4.3, pose: 'rest' }, { t: 5.2, pose: 'rest' }];
const ex = CA.buildModule(meta, poses, keyframes, HC);

const latSum = (q) => q.ch.spine_l5.latFlex + q.ch.spine_t12.latFlex + q.ch.spine_t6.latFlex;
const rep = CA.scan(ex, { shLift: (W) => W.shoulder_l.p[1], hip: hipLow });
M.meshFloor(ex, rep);
const W0 = L.fk(poses.rest, HC), Wt = L.fk(poses.topHold, HC), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].setup = `${d(latSum(rest))} (resting on the side)`; kin[0].peak = `${d(latSum(poses.topHold))} (lumbar ${d(poses.topHold.ch.spine_l5.latFlex)}, thoracic ${d(poses.topHold.ch.spine_t12.latFlex + poses.topHold.ch.spine_t6.latFlex)})`;
kin[1].setup = 'Bottom shoulder on the mat'; kin[1].peak = `Bottom shoulder ${r1(Wt.shoulder_l.p[1] - W0.shoulder_l.p[1])} cm up, top shoulder ${r1(Wt.shoulder_r.p[1] - W0.shoulder_r.p[1])} cm up`;
kin[2].setup = `Hips ${d(rest.ch.hip_l.flex)}, knees ${d(rest.ch.knee_l.flex)}, legs stacked`; kin[2].peak = 'Unchanged (pelvis and legs still)';
kin[3].setup = 'Top hand behind the head, bottom hand resting on the mat in front of the chest'; kin[3].peak = 'Top elbow stays wide; the bottom hand only balances';
kin[4].setup = 'Rest 0.8 s'; kin[4].peak = '1.1 s up, 0.6 s squeeze, 1.8 s down, 0.9 s rest';
console.log(`Side crunch: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} floorTol=${ex.checks.floorTolerance} rest pitch=${rest.root.rot.pitch} y=${rest.root.pos[1]} lat=${rest.ch.spine_l5.latFlex}/${rest.ch.spine_t12.latFlex} hipAbd=${rest.ch.hip_r.abd}/${rest.ch.hip_l.abd}`);
M.guard('side-crunch', ex, rep, [Wt.shoulder_l.p[1] - W0.shoulder_l.p[1] < 6 && 'bottom shoulder barely lifts']);
