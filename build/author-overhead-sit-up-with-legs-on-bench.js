// Overhead Sit-up with Legs on Bench (GymVisual #17894; page not readable here, movement from the name and standard
// coaching). Supine on a mat with the calves resting across the end of a flat bench (hips and knees about 90 degrees),
// arms straight overhead on the mat. Bring the straight arms up over the face while curling the head and shoulder blades
// up, keep curling and sit up (the pelvis rolls toward the thighs) until the chest is close to the vertical thighs with
// the hands reaching past the knees; pause, roll back down with the arms returning overhead.
// Legs: ankle IK contacts (heels on the bench, world-locked feet) so the legs stay on the bench while the pelvis rolls;
// the leg channels are refitted to the IK every key. Arms as the V-up (overhead on the mat, then aimed by angle).
const L = require('./lib');
const { R, V, r1, clone } = L;
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const H = require('./families/hips');
const D = require('./families/dumbbell');
const B = require('./families/b6-18');
const meta = require('./meta/overhead-sit-up-with-legs-on-bench.json');

// Lying base, then the legs: thighs about vertical, knees about 90 degrees, calves level.
let lie = M.lie({ kneeFlex: 90, headRest: 'floor' });
for (const s of ['r', 'l']) { lie.ch[`hip_${s}`] = { flex: 84, abd: 0, rot: 0 }; lie.ch[`knee_${s}`] = { flex: 86 }; lie.ch[`ankle_${s}`] = { dorsi: -20 }; }
lie = L.solvePose(lie, ['ch.hip_r.flex', 'ch.knee_r.flex'], [(W) => [(W.knee_r.p[0] - W.hip_r.p[0] - 2) * 2, (W.ankle_r.p[1] - W.knee_r.p[1]) * 2]]).pose; CA.mirrorLeg(lie);
const W0 = L.fk(lie);
// Bench: seat top just under the calves, the near end a few cm past the knees toward the feet.
const calfBottom = Math.min(CA.bottomOf(W0, 'calf_r'), CA.bottomOf(W0, 'shank_r'));
const BENCH_H = r1(calfBottom - 0.2), BX0 = r1(W0.knee_r.p[0] + 4);
const bench = D.bench({ x: r1(BX0 + 20), seat: 40, back: 80, angle: 0, side: 1, height: BENCH_H });
const contacts = CA.footContacts().map((c) => Object.assign(c, { label: c.label.replace('foot', 'leg (calf on the bench)'), handRot: B.r3 ? CA.qArr(W0[`ankle_${c.id.slice(-1)}`].q) : c.handRot }));
const T = { r: W0.ankle_r.p.map(B.r3), l: W0.ankle_l.p.map(B.r3) };
lie.ik = { leg_r: { target: T.r, weight: 1 }, leg_l: { target: T.l, weight: 1 } };
const P0 = lie.root.rot.pitch, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const trunkFromFloor = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const sitBottom = (W) => Math.min(M.bottomOf(W, 'buttock_r'), M.bottomOf(W, 'buttock_l'), M.bottomOf(W, 'pelvis'));
const SIT0 = sitBottom(W0);
const fitLegs = (q) => { for (const s of ['r', 'l']) q = H.fitLeg(q, s, contacts.find((c) => c.id === `leg_${s}`), T[s]); q.ik = clone(lie.ik); return q; };
// Arms (V-up helpers): overhead resting on the mat; pointing at angle a from the floor toward the feet; reaching the shins
const ARMS_IDS = CA.ARM_IDS('r');
function armsOverhead(p) {
  const q = clone(p); q.ch.shoulder_r = { plane: 85, elev: 175, axial: 0 }; q.ch.elbow_r = { flex: 6 }; q.ch.sc_r = { protract: 0, elevate: 12 }; q.ch.wrist_r = { pron: 0, flex: 0, dev: 0 };
  const paths = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial'];
  const s = L.solvePose(q, paths, [(W) => [(CA.minOf(W, ARMS_IDS) - 0.4) * 3], (W) => [(W.wrist_r.p[2] - W.shoulder_r.p[2] - 5) * 0.5],
    (W, qq) => [Math.max(0, qq.ch.shoulder_r.elev - 200) * 4, Math.max(0, qq.ch.shoulder_r.plane - 132) * 4], L.obj.reg('ch.shoulder_r.plane', 95, 0.03), L.obj.reg('ch.shoulder_r.axial', 0, 0.05)], { iters: 400, contacts });
  return CA.mirrorArm(s.pose);
}
function armsAt(p, a, guess) {
  const W = L.fk(p, contacts), S = W.shoulder_r.p, dir = V.norm([Math.cos(a * R.DEG), Math.sin(a * R.DEG), 0.1]);
  return CA.mirrorArm(L.armToTarget(p, V.add(S, V.scale(dir, L.reach(6))), { flex: 6, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess }));
}
function setP(q, P, drop = 0) { q.root.rot.pitch = r1(P); q.root.pos[1] = r1(lie.root.pos[1] - drop); return q; }
function body(k) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  CA.neck(p, k.neck == null ? NECK0 : k.neck);
  let P = P0;
  if (k.fromFloor != null) {
    let hi = P0 + 10, lo = hi;
    while (lo > 0 && trunkFromFloor(L.fk(setP(clone(p), lo), contacts)) <= k.fromFloor) { hi = lo; lo -= 2; }
    for (let i = 0; i < 60; i++) { P = (lo + hi) / 2; if (trunkFromFloor(L.fk(setP(clone(p), P), contacts)) > k.fromFloor) lo = P; else hi = P; }
  } else P = P0 + (k.pitch || 0);
  setP(p, P);
  const drop = Math.max(0, sitBottom(L.fk(p, contacts)) - SIT0);
  setP(p, P, drop);
  return k.arms(fitLegs(p));
}
const KEYS = {
  lie: { l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, arms: armsOverhead },
  curl: { l5: 3, t12: 12, t6: 15, neck: 26, pitch: 1, arms: (p) => armsAt(p, 100, [90, 150, 0]) },
  rise: { l5: 14, t12: 18, t6: 16, neck: 24, fromFloor: 28, arms: (p) => armsAt(p, 62, [90, 110, 0]) },
  top: { l5: 24, t12: 20, t6: 14, neck: 18, fromFloor: 46, arms: (p) => armsAt(p, 28, [90, 80, 0]) },
  topHold: { l5: 24.5, t12: 20.5, t6: 14, neck: 18, fromFloor: 47, arms: (p) => armsAt(p, 26, [90, 80, 0]) },
  lower: { l5: 20, t12: 20, t6: 16, neck: 22, fromFloor: 30, arms: (p) => armsAt(p, 70, [90, 110, 0]) },
  lowBack: { l5: 6, t12: 14, t6: 15, neck: 26, pitch: 0, arms: (p) => armsAt(p, 115, [90, 150, 0]) },
  touch: { l5: 0, t12: 3, t6: 6, neck: 10, pitch: 0, arms: (p) => armsAt(p, 160, [90, 170, 0]) },
};
const poses = {}; for (const [n, k] of Object.entries(KEYS)) poses[n] = body(k);
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.4, pose: 'curl' }, { t: 1.8, pose: 'rise' }, { t: 2.2, pose: 'top' }, { t: 2.6, pose: 'topHold' },
  { t: 3.4, pose: 'lower' }, { t: 4.1, pose: 'lowBack' }, { t: 4.6, pose: 'touch' }, { t: 5.0, pose: 'lie' }, { t: 6.0, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, contacts);
ex.props = [meta.props[0], bench.prop];
const hp = poses.topHold.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hp - 4), max: Math.ceil(hp + 4) };
const legOnBench = (W) => Math.min(CA.bottomOf(W, 'calf_r'), CA.bottomOf(W, 'shank_r'), CA.bottomOf(W, 'foot_r')) - BENCH_H;
const rep = CA.scan(ex, { trunk: (W) => trunkFromFloor(W), hip: (W, p) => p.ch.hip_r.flex, onBench: legOnBench, hand: (W) => W.handtip_r.p[0] - W.knee_r.p[0] });
const Wt = L.fk(poses.topHold, contacts), pk = poses.topHold;
const set = H.setKin(ex);
set('Trunk', 'setup', 'Lying (shoulder blades on the mat)'); set('Trunk', 'peak', `${B.deg(trunkFromFloor(Wt))} from the floor, chest toward the thighs`);
set('Hip flexion', 'setup', `${B.deg(lie.ch.hip_r.flex)} (calves on a ${BENCH_H} cm bench)`); set('Hip flexion', 'peak', `${B.deg(pk.ch.hip_r.flex)} (rig limit 140°)`);
set('Arm position', 'setup', 'Straight overhead, resting on the mat'); set('Arm position', 'peak', `Reaching past the knees (fingertips ${Math.round(Wt.handtip_r.p[0] - Wt.knee_r.p[0])} cm beyond the knee joint)`);
set('Spinal flexion', 'setup', `${B.deg(lie.ch.spine_l5.flex + lie.ch.spine_t12.flex + lie.ch.spine_t6.flex)} (resting curve)`); set('Spinal flexion', 'peak', B.deg(pk.ch.spine_l5.flex + pk.ch.spine_t12.flex + pk.ch.spine_t6.flex));
set('Tempo', 'setup', 'Lie 0.8 s'); set('Tempo', 'peak', '1.4 s up, 0.4 s pause, 2 s down, 1.4 s rest');
ex.exercise.reference.note = B.NOTE;
console.log(`Overhead Sit-up with Legs on Bench: wrote ${L.write(ex)}  bench=${JSON.stringify(bench.prop)} measure=${JSON.stringify(ex.checks.measure)}\n  ${JSON.stringify(rep)}`);
for (const n of Object.keys(poses)) { const p = poses[n], W = L.fk(p, contacts); console.log(`  ${n.padEnd(8)} pitch=${p.root.rot.pitch} hip=${p.ch.hip_r.flex} knee=${r1(CA.kneeOf(W, 'r'))} trunk=${trunkFromFloor(W).toFixed(1)} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} min=${JSON.stringify(L.shapeMinY(W))}`); }
M.guard('overhead-sit-up-with-legs-on-bench', ex, rep, [rep.onBench[0] < -0.6 && `leg sinks into the bench ${rep.onBench[0]}`, rep.onBench[1] > 1.5 && `leg floats above the bench ${rep.onBench[1]}`]);
