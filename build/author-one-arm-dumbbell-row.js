// One-Arm Dumbbell Row (GymVisual #483712): left knee and left hand on a flat bench (shin along the pad, hand flat under
// and a little ahead of the shoulder), right foot planted on the floor out to the side, back flat at about 20 degrees
// above the floor. The right arm rows the dumbbell (neutral grip) from a straight-arm hang to the hip, elbow close to the
// body, shoulder blade squeezing back; pause; lower slowly. The trunk, pelvis and both supports stay still. Authored with
// the right arm working (the player mirrors for the left).
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const B = require('./families/b3-back');
const P = require('./families/prone');
const DBH = require('./families/dumbbell');
const meta = require('./meta/one-arm-dumbbell-row.json');

const SIZE = [32, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const PITCH = -74, FOOT = [-28, L.ANKLE_H, 32], KNEE_R = 10;
const BENCH_TOP = 45, SHIN_R = 5.2, KNEE_Y = BENCH_TOP + SHIN_R + (+(process.env.KYO ?? -2.8));   // knee joint height: the shin rests on the pad
const WRIST_Y = BENCH_TOP + (+(process.env.WY ?? 1.8)), TILT = +(process.env.TILT ?? 8);
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const handQ = (s) => { const q = Q.mul(Q.axis([1, 0, 0], TILT), L.handRotR); return P.qArr(s === 'r' ? q : Q.mirrorZ(q)); };
const contacts = [
  Object.assign(L.legContact('r'), { pole: [1, 0, 0.35], handRot: P.qArr(L.footRot(-12)) }),
  Object.assign(L.handContact('l'), { pole: [-1, 0.1, -0.25], handRot: handQ('l') }),
];
function base(y) {
  return { root: { pos: [0, y, 0], rot: { pitch: PITCH } }, ch: { spine_l5: { ...z0(), flex: -2 }, spine_t12: z0(), spine_t6: { ...z0(), flex: 1 }, neck_c7: { rot: 0, flex: -10 }, head_c1: { rot: 0, flex: -12 },
    sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 4, elevate: 1 }, hip_r: { flex: 70, abd: 18, rot: 0 }, knee_r: { flex: KNEE_R }, ankle_r: { dorsi: 0 }, hip_l: { flex: 100, abd: 0, rot: 0 }, knee_l: { flex: 100 }, ankle_l: { dorsi: -60 },
    shoulder_r: { plane: 90, elev: 80, axial: 0 }, elbow_r: { flex: 5 }, wrist_r: { pron: 90, flex: 0, dev: 0 }, shoulder_l: { plane: 90, elev: 80, axial: 0 }, elbow_l: { flex: 10 }, wrist_l: { pron: 0, flex: 0, dev: 0 } },
    ik: { leg_r: { target: FOOT.slice(), weight: 1 } } };
}
// pelvis height: the planted right leg at a soft knee
let a = 60, b = 100;
for (let i = 0; i < 50; i++) { const y = (a + b) / 2; if (B.kneeOf(L.fk(base(y), contacts), 'r') > KNEE_R) a = y; else b = y; }
let pose = base(r1((a + b) / 2));
pose = P.fitLeg(pose, 'r', contacts, 'leg_r');
// left leg (FK, still): knee on the bench ahead of and below the hip, shin along the pad, foot pointed back
let W = L.fk(pose, contacts);
const H = W.hip_l.p, dy = H[1] - KNEE_Y, K = [r1(H[0] + Math.sqrt(42 * 42 - dy * dy - 1)), r1(KNEE_Y), r1(H[2] - 1)];
const A = [r1(K[0] - Math.sqrt(41.5 * 41.5 - 4)), r1(BENCH_TOP + 3.2 + (+(process.env.AYO ?? 0.8))), K[2]];
pose = L.solvePose(pose, ['ch.hip_l.flex', 'ch.hip_l.abd', 'ch.hip_l.rot', 'ch.knee_l.flex', 'ch.ankle_l.dorsi'],
  [L.obj.at('knee_l', K, 3), L.obj.at('ankle_l', A, 3), (Wx) => [(Wx.toe_l.p[1] - (BENCH_TOP + 2.2)) * 1.5], L.obj.reg('ch.hip_l.rot', 0, 0.05)], { iters: 400 }).pose;
// left hand on the bench: ahead of the shoulder at a straight-ish arm
W = L.fk(pose, contacts);
const SL = W.shoulder_l.p, ARM = L.reach(+(process.env.EL ?? 32)), hy = SL[1] - WRIST_Y, HAND = [r1(SL[0] + Math.sqrt(ARM * ARM - hy * hy - 4)), WRIST_Y, r1(SL[2] + 2)];
pose.ik.arm_l = { target: HAND, weight: 1 };
pose = P.fitArm(pose, 'l', contacts, 'arm_l');
W = L.fk(pose, contacts);
// bench: flat (adjustable bench with the back pad down), its length along X under the knee and the hand
const BENCH = { seat: 40, back: 80, width: 30 };
const bx0 = r1(A[0] + 4), zB = r1((K[2] + HAND[2]) / 2);
const bench = require('./families/dumbbell').bench({ x: r1(bx0 + BENCH.seat / 2), z: zB, seat: BENCH.seat, height: BENCH_TOP, width: BENCH.width, angle: 0, back: BENCH.back, side: 1 });
const boxes = B.benchBoxes(bench);
// right arm rows; the rest of the body is fixed
const ROW = { top: { du: -28, dz: 7, wx: 5, wz: 1, tilt: 10 }, sc: [{ protract: 8, elevate: 0 }, { protract: -16, elevate: -1 }], hang: [5, 3] };
const state = {};
function at(f) { return B.wrapPose(B.rowArm(pose, f, ROW, state)); }
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const poses = {};
FS.forEach((f, i) => { poses[`r${i}`] = at(f); });
const T0 = 0.8, T1 = 1.9, T2 = 2.4, T3 = 4.4, D = 5.5, N = FS.length - 1;
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a2 = 0, b2 = 1; for (let k = 0; k < 40; k++) { const m = (a2 + b2) / 2; if (ease(m) < y) a2 = m; else b2 = m; } return (a2 + b2) / 2; };
const keyframes = [{ t: 0, pose: 'r0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * inv(f)).toFixed(3), pose: `r${i}` }));
keyframes.push({ t: T2, pose: `r${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv(1 - FS[i])).toFixed(3), pose: `r${i}` });
keyframes.push({ t: D, pose: 'r0' });
const props = [bench.prop, B.heldProp('r', 'handle', SIZE)];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = B.NOTE;
const rep = B.sweep(ex, { held: [{ side: 'r', grip: 'handle', size: DSZ }], fixed: ['knee_l', 'ankle_l', 'pelvis'], boxes, bodySkip: ['hand_l', 'thumb_l', 'forearm_l', 'shank_l', 'calf_l', 'foot_l', 'thigh_l', 'quad_l'] });
const legClear = B.bodyBoxClear(W, boxes, ['hand_l', 'thumb_l', 'forearm_l']);
const W0 = L.fk(poses.r0, contacts), W1 = L.fk(poses[`r${N}`], contacts);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Trunk angle', 'setup', `≈${Math.round(90 - B.trunkLean(W0))}° above horizontal, spine neutral`); set('Trunk angle', 'peak', 'Unchanged (no twist)');
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}°`);
set('Shoulder extension', 'setup', 'Arm hanging straight down'); set('Shoulder extension', 'peak', `Elbow ${r1(V.dot(V.sub(W1.elbow_r.p, W1.shoulder_r.p), [0, 1, 0]))} cm above the shoulder joint, shoulder blade retracted (clavicle ${ROW.sc[0].protract}° to ${ROW.sc[1].protract}°)`);
set('Tempo', 'setup', 'Hang 0.8 s'); set('Tempo', 'peak', '1.1 s up, 0.5 s squeeze, 2.0 s down, 1.1 s reset');
console.log(`One-Arm Dumbbell Row: wrote ${L.write(ex)}\n  pelvis ${pose.root.pos.map(r1)}, knee_l ${K}, ankle_l ${A}, hand ${HAND}, bench x ${bench.seatX[0]}..${r1(bench.tip[0])} z ${zB}; left leg/hand vs bench ${JSON.stringify(legClear)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted contacts slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5 || rep.dbBox < 0) { console.error('FAIL: dumbbell through the floor, the bench or the body'); process.exitCode = 1; }
