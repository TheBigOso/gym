// Sit-up (GymVisual #073612, Sit-Up). Bilateral: supine on a mat, knees bent about 90 degrees, feet flat and anchored
// (planted contacts), fingertips lightly behind the head with the elbows wide. Curl the head and shoulder blades off the
// mat, keep curling and sit all the way up until the chest is close to the thighs (pelvis rolls toward the thighs: hip
// flexion), pause, then roll back down: low back first, shoulder blades, head last. Lying base calibrated to the mesh.
const L = require('./lib');
const { R, V, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const M = require('./families/b4-core2');
const meta = require('./meta/sit-up.json');

const KNEE = 88;
const lie0 = M.lie({ kneeFlex: 90, headRest: 'hands' });
const F = CA.plantFeet(lie0, KNEE);
const lie = F.pose, P0 = lie.root.rot.pitch, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const LEG = { hip: clone(lie.ch.hip_r), hipL: clone(lie.ch.hip_l) };
const trunkFromFloor = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const sitBottom = (W) => Math.min(M.bottomOf(W, 'buttock_r'), M.bottomOf(W, 'buttock_l'), M.bottomOf(W, 'pelvis'));
const SIT0 = sitBottom(L.fk(lie));

// Pelvis pitch P (smaller = rolled toward the thighs). The legs stay world-fixed: hip flexion grows by the pitch change.
// `drop` lowers the pelvis (cm) so the buttocks stay pressed into the mat as the pelvis rolls onto the sit bones.
function setP(q, P, drop = 0) {
  q.root.rot.pitch = r1(P); q.root.pos[1] = r1(lie.root.pos[1] - drop);
  q.ch.hip_r = Object.assign(clone(LEG.hip), { flex: r1(LEG.hip.flex + (P0 - P)) });
  q.ch.hip_l = Object.assign(clone(LEG.hipL), { flex: r1(LEG.hipL.flex + (P0 - P)) });
  return q;
}
function trunk(k, guess) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  CA.neck(p, k.neck == null ? NECK0 : k.neck);
  let P = P0;
  if (k.fromFloor != null) {
    let lo = 0, hi = P0 + 10;
    for (let i = 0; i < 60; i++) { P = (lo + hi) / 2; if (trunkFromFloor(L.fk(setP(clone(p), P))) > k.fromFloor) lo = P; else hi = P; }
  } else P = P0 + (k.pitch || 0);
  setP(p, P);
  // keep the buttocks at their lying depth (the pelvis rolls on them, so the joint drops a little as it tips forward)
  // measured on the mesh: sitting up on the sit bones the athlete's buttocks need about 1.6 cm more drop than the shapes
  const W = L.fk(p, F.contacts), drop = Math.max(0, sitBottom(W) - SIT0) + 1.6 * Math.max(0, Math.min(1, (P0 - P) / (P0 - 40)));
  setP(p, P, drop);
  // re-fit the leg channels to the anchored feet (the pelvis moved a little)
  let q = p;
  for (const s of ['r', 'l']) q = CA.fitLeg(q, s, F.targets[s], F.contacts);
  q.ik = clone(lie.ik);
  const out = CB.cradle(q, { floor: k.floor ? -M.MESH.arm : 1.0, elbowAnt: k.elbowAnt ?? -3, elbowOut: 20, guess, ref: k.floor ? guess : null });
  return out;
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, floor: true },
  { name: 'curl', l5: 3, t12: 12, t6: 16, neck: 30, pitch: 1 },
  { name: 'rise', l5: 20, t12: 20, t6: 17, neck: 26, fromFloor: 40 },
  { name: 'top', l5: 30, t12: 17, t6: 12, neck: 18, fromFloor: 80 },
  { name: 'topHold', l5: 31, t12: 18, t6: 12.5, neck: 18, fromFloor: 81 },
  { name: 'lower', l5: 32, t12: 22, t6: 16, neck: 22, fromFloor: 45 },
  { name: 'lowBack', l5: 8, t12: 16, t6: 17, neck: 28, pitch: 0 },
  { name: 'touch', l5: 0, t12: 3, t6: 6, neck: 16, pitch: 0, floor: true },
];
// one arm branch for every key, seeded at the curl pose
let seed = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  const p = trunk(KEYS[1], g); if (!seed || p.__cost < seed.__cost) seed = p;
}
const ARM0 = CB.armOf(seed, 'r');
const poses = {}; let prev = ARM0;
for (const k of KEYS) { const p = trunk(k, k.floor ? ARM0 : prev); prev = CB.armOf(p, 'r'); delete p.__cost; poses[k.name] = p; }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.5, pose: 'curl' }, { t: 1.95, pose: 'rise' }, { t: 2.4, pose: 'top' }, { t: 2.9, pose: 'topHold' },
  { t: 3.9, pose: 'lower' }, { t: 4.6, pose: 'lowBack' }, { t: 5.0, pose: 'touch' }, { t: 5.5, pose: 'lie' }, { t: 6.4, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, F.contacts);
const band = [77, 83].map((a) => trunk(Object.assign({}, KEYS[3], { fromFloor: a }), ARM0).ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.min(...band)), max: Math.ceil(Math.max(...band)) };

const rep = CA.scan(ex, { trunk: (W) => trunkFromFloor(W), hip: (W, p) => p.ch.hip_r.flex, sit: (W) => sitBottom(W) });
M.meshFloor(ex, rep);
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.topHold, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.topHold;
kin[0].setup = 'Lying (shoulder blades on the mat)'; kin[0].peak = `${d(trunkFromFloor(Wt))} from the floor (chest toward the thighs)`;
kin[1].setup = d(lie.ch.spine_l5.flex) + ' (slight lordosis)'; kin[1].peak = `${d(pk.ch.spine_l5.flex)} (L5-T12 segment, rounded)`;
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} at the top (more during the curl)`;
kin[3].setup = d(lie.ch.hip_r.flex); kin[3].peak = `${d(pk.ch.hip_r.flex)} (pelvis rolled toward the thighs)`;
kin[4].setup = d(CA.kneeOf(Wl, 'r')); kin[4].peak = `${d(CA.kneeOf(Wt, 'r'))}, feet unchanged`;
kin[5].setup = 'Rest 0.8 s'; kin[5].peak = '0.7 s curl, 0.9 s sit up, 0.5 s pause, 2.1 s roll down, 1.4 s rest';
console.log(`Sit-up: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} floorTol=${ex.checks.floorTolerance} measure=${JSON.stringify(ex.checks.measure)}`);
for (const k of KEYS) { const p = poses[k.name], W = L.fk(p, F.contacts); console.log(`  ${k.name.padEnd(8)} pitch=${p.root.rot.pitch} y=${p.root.pos[1]} hip=${p.ch.hip_r.flex} spine=${p.ch.spine_l5.flex}/${p.ch.spine_t12.flex}/${p.ch.spine_t6.flex} trunk=${trunkFromFloor(W).toFixed(1)} sit=${sitBottom(W).toFixed(1)} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} elb=${p.ch.elbow_r.flex} min=${JSON.stringify(L.shapeMinY(W))}`); }
M.guard('sit-up', ex, rep, [(rep.trunk[1] < 75 || rep.trunk[1] > 88) && `peak trunk ${rep.trunk[1]} outside 75-88 degrees`]);
