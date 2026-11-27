// Dumbbell Kickback (GymVisual #033312): one-arm-row stance on a flat 42 cm bench: left knee and shin on the pad, left
// hand planted under the left shoulder (palm down, constant target), right foot flat on the floor (planted leg contact),
// trunk close to horizontal and still. The right upper arm is held along the trunk, parallel to the floor (constant
// shoulder channels) while only the elbow moves: from about 90 degrees (forearm hanging, dumbbell under the elbow) to
// straight back, squeeze, and slowly back. Neutral grip (palm toward the body). Authored on the right arm.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const DBF = require('./families/dumbbell');
const meta = require('./meta/dumbbell-kickback.json');

const BENCH_H = 42, PALM = 2.6, KNEE_SINK = +(process.env.KNEE_SINK || 0); // mesh knee vs rig shank capsule (b2/tri_mesh.mjs)
const TRUNK_UP = +(process.env.TU || 20);           // shoulder line above the hips: trunk this many degrees above horizontal
const KNEE = [0, 0, -11];       // left knee on the pad at x = 0, z = -11 (bench centre z = -12)
const HAND_Z = -20, ARM_FLEX = 10;
const BENCH_Z = -12;
const RF = JSON.parse(process.env.RF || '{"z":14,"back":10,"knee":12}'); // right foot: z, how far behind the right hip, knee bend at the solve
const legLen = (kf) => { const a = V.len(rig.byId.knee_r.offset), b = V.len(rig.byId.ankle_r.offset); return Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(kf * R.DEG)); };

// Base: prone-ish trunk (head toward +X), left hip flexed with the knee on the pad and the shin lying back along it.
const p0 = { root: { pos: [10, 85, +(process.env.PZ || -1)], rot: { pitch: -80 } }, ch: { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: 3, latFlex: 0 }, spine_t6: { rot: 0, flex: 2, latFlex: 0 }, neck_c7: { rot: 0, flex: -8 }, head_c1: { rot: 0, flex: -6 },
  sc_r: { protract: 0, elevate: 0 }, sc_l: { protract: 4, elevate: 0 }, hip_l: { flex: 80, abd: 0, rot: 0 }, knee_l: { flex: 90 }, ankle_l: { dorsi: -45 }, hip_r: { flex: 0, abd: 6, rot: -6 }, knee_r: { flex: 10 }, ankle_r: { dorsi: 0 } } };
const KR = rig.shapes.find((s) => s.id === 'shank_l').r; // [knee, ankle] radii
const trunkUp = (W) => { const d = V.sub(W.neck_c7.p, W.pelvis.p); return Math.atan2(d[1], Math.hypot(d[0], d[2])) / R.DEG; };
let HANDX = null;
function solveBase(handX) {
  return L.solvePose(p0, ['root.pos.0', 'root.pos.1', 'root.rot.pitch', 'ch.hip_l.flex', 'ch.hip_l.abd', 'ch.knee_l.flex'], [
    (W) => V.sub(W.knee_l.p, [KNEE[0], BENCH_H + KR[0] - KNEE_SINK, KNEE[2]]).map((v) => v * 3),
    (W) => [(W.ankle_l.p[1] - (BENCH_H + KR[1] - KNEE_SINK)) * 2, (W.ankle_l.p[2] - KNEE[2]) * 1],
    (W) => [(trunkUp(W) - TRUNK_UP) * 0.6],
    (W) => [(V.len(V.sub(W.shoulder_l.p, [W.shoulder_l.p[0] + 0, BENCH_H + PALM, HAND_Z])) - L.reach(ARM_FLEX)) * 2],
    (W) => [(V.len(V.sub(W.hip_r.p, [W.hip_r.p[0] - RF.back, L.ANKLE_H, RF.z])) - legLen(RF.knee)) * 2],
  ], { iters: 400 });
}
const sb = solveBase();
let base = sb.pose;
const W0 = L.fk(base);
const HAND = { l: [r1(W0.shoulder_l.p[0] + 2), r1(BENCH_H + PALM), HAND_Z] };
const FOOT = [r1(W0.hip_r.p[0] - RF.back), L.ANKLE_H, RF.z];
const contacts = [H.handC('l', [-1, 0.1, -0.35]), H.legC('r', { pole: [1, 0, 0.2], rot: H.footQ(0, -8) })];
base.ik = { arm_l: { target: HAND.l, weight: 1 }, leg_r: { target: FOOT, weight: 1 } };
base = H.fitLeg(base, 'r', contacts[1], FOOT, { rot: -6, abd: 6, handRot: contacts[1].handRot });
base = H.fitArm(base, 'l', contacts[0], HAND.l, [{ shoulder_l: { plane: 90, elev: 90, axial: 0 }, elbow_l: { flex: 10 }, wrist_l: { pron: 0, flex: -80, dev: 0 } }]); delete base.__cost;
// Right upper arm along the trunk, parallel to the floor and close to the ribs; forearm hangs straight down at 90.
const UA = JSON.parse(process.env.UA || '[-1,-0.04,0.21]');
const ua = T.upperArm(base, 'r', UA, [0, -1, 0], [[0, 10, 0], [90, 10, 0], [-60, 20, 0], [0, 20, 90], [0, 20, -90]]);
base.ch.shoulder_r = ua.ch; base.ch.sc_r = { protract: -4, elevate: 0 };
base.ch.elbow_r = { flex: 90 };
{ const W = L.fk(base), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); const w = T.wristTo(base, 'r', fa, [0, 0, -1]); base.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 }; }
const armAt = (flex) => { const q = clone(base); q.ch.elbow_r = { flex: r1(flex) }; return q; };
const BOT = +(process.env.BOT || 96), TOP = 4;
const poses = { bent: armAt(BOT), straight: armAt(TOP), squeeze: armAt(TOP - 1.5), mid: armAt(45) };
const keyframes = [{ t: 0, pose: 'bent' }, { t: 0.5, pose: 'bent' }, { t: 1.5, pose: 'straight' }, { t: 1.8, pose: 'squeeze' }, { t: 2.1, pose: 'straight' }, { t: 3.9, pose: 'bent' }, { t: 4.6, pose: 'bent' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const DB_SIZE = { length: 28, diameter: 11 }; // a light hex dumbbell (kickbacks use light loads)
ex.props.find((p) => p.id === 'dbR').size = [DB_SIZE.length, DB_SIZE.diameter, DB_SIZE.diameter];
// Bench: flat (seat + flat pad, 120 cm) along X under the left knee and hand; its -X end just past the left ankle so the foot hangs off.
const bench = DBF.bench({ x: r1(W0.ankle_l.p[0] + 2 + 100), z: BENCH_Z, seat: 40, height: BENCH_H, width: 30, angle: 0, back: 80 });
ex.props = [bench.prop, ...ex.props];
ex.checks.plantedContacts = ['arm_l', 'leg_r'];
const benchBox = { center: [bench.prop.center[0] - 40, 0, BENCH_Z], size: [120, BENCH_H, 30] };

const pr = { body: 1e9, bench: 1e9, floor: 1e9, onBench: 1e9 };
const rep = H.loopReport(ex, { planted: ['arm_l', 'leg_r'], probe: (W, _p, _t) => {
  const b = T.dumbbellBody(W, 'r', 'handle', /^(ribcage|abdomen|pelvis|buttock_r|thigh_r|quad_r|chest|pecs_r)$/, DB_SIZE); if (b.d < pr.body) { pr.body = b.d; pr.bodyId = b.id; pr.bodyAt = +_t.toFixed(2); }
  pr.bench = Math.min(pr.bench, DBF.dumbbellBoxClearance(W, 'r', benchBox, 'handle', DB_SIZE)); pr.floor = Math.min(pr.floor, DBF.dumbbellMinY(W, 'r', 'handle', DB_SIZE));
  const ob = T.bodyOverBox(W, benchBox, /^(hand_l|thumb_l)$/); if (ob.d < pr.onBench) { pr.onBench = ob.d; pr.onBenchAt = ob.id; }
} });
const Wb = L.fk(poses.bent, contacts), Ws = L.fk(poses.straight, contacts);
const uaTrunk = V.angle(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p), V.sub(Wb.pelvis.p, Wb.neck_c7.p)), uaFloor = Math.asin(V.norm(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p))[1]) / R.DEG;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wb, 'r'))} (forearm hanging)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Ws, 'r'))} (arm straight back)`);
set('Upper arm to trunk', 'setup', `${d(uaTrunk)} from the trunk line, ${d(Math.abs(uaFloor))} ${uaFloor < 0 ? 'below' : 'above'} horizontal`); set('Upper arm to trunk', 'peak', 'Unchanged (shoulder channels constant)');
set('Trunk inclination', 'setup', `${d(trunkUp(Wb))} above horizontal (left knee and hand on a ${BENCH_H} cm bench)`); set('Trunk inclination', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Elbow bent 0.5 s'); set('Tempo', 'peak', '1.0 s out, 0.6 s squeeze, 1.8 s back, 0.7 s reset');
console.log(`Dumbbell Kickback: wrote ${L.write(ex)}\n  base cost ${sb.cost.toFixed(4)} root ${JSON.stringify(base.root)} hip_l ${JSON.stringify(base.ch.hip_l)} knee_l ${base.ch.knee_l.flex} hip_r ${JSON.stringify(base.ch.hip_r)} kneeR ${r1(H.kneeOf(Wb, 'r'))} trunk ${r1(trunkUp(Wb))}\n  shoulder ${JSON.stringify(ua.ch)} (cost ${ua.cost.toExponential(1)}) wrist ${JSON.stringify(base.ch.wrist_r)} armL ${JSON.stringify(base.ch.shoulder_l)} ${JSON.stringify(base.ch.elbow_l)} ${JSON.stringify(base.ch.wrist_l)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(pr)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (pr.body < 0 || pr.bench < 0 || pr.floor < 0) { console.error('FAIL: dumbbell clearance'); process.exitCode = 1; }
if (process.env.DBG) { const W = Wb, dd = DBF.dumbbellAt(W, 'r', 'handle', DB_SIZE); console.log('DBG sh', W.shoulder_r.p.map(r1), 'el', W.elbow_r.p.map(r1), 'wr', W.wrist_r.p.map(r1), 'db', dd.ends.map((e) => e.map(r1)), 'hip', W.hip_r.p.map(r1), 'knee', W.knee_r.p.map(r1), 'pelvis', W.pelvis.p.map(r1)); }
