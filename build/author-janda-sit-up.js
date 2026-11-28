// Janda Sit-up (GymVisual #22554; page not readable here, movement from the name and standard coaching). Supine on a
// mat, knees bent about 90 degrees, feet flat and free (heels pressing down and back: planted contacts, no anchor), arms
// straight. Curl the head and shoulder blades off the mat, then keep curling slowly until the trunk is roughly halfway
// up (about 45 degrees from the floor) with the arms reaching past the knees; pause, roll back down: low back first,
// head last. Built on the sit-up (author-sit-up.js: the pelvis rolls on the buttocks, legs world-fixed, feet re-fitted).
const L = require('./lib');
const { R, V, r1, clone } = L;
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const H = require('./families/hips');
const B = require('./families/b6-18');
const meta = require('./meta/janda-sit-up.json');

const KNEE = 92;
const lie0 = M.lie({ kneeFlex: 90, headRest: 'floor' });
const F = CA.plantFeet(lie0, KNEE);
const lie = F.pose, P0 = lie.root.rot.pitch, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const LEG = { hip: clone(lie.ch.hip_r), hipL: clone(lie.ch.hip_l) };
const trunkFromFloor = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const sitBottom = (W) => Math.min(M.bottomOf(W, 'buttock_r'), M.bottomOf(W, 'buttock_l'), M.bottomOf(W, 'pelvis'));
const SIT0 = sitBottom(L.fk(lie));
function setP(q, P, drop = 0) {
  q.root.rot.pitch = r1(P); q.root.pos[1] = r1(lie.root.pos[1] - drop);
  q.ch.hip_r = Object.assign(clone(LEG.hip), { flex: r1(LEG.hip.flex + (P0 - P)) });
  q.ch.hip_l = Object.assign(clone(LEG.hipL), { flex: r1(LEG.hipL.flex + (P0 - P)) });
  return q;
}
// Arms: f = 0 resting on the mat beside the body reaching toward the feet; f = 1 straight, aimed just above the knees.
const ARM_IDS = CA.ARM_IDS('r');
function arms(p, f, guess) {
  const W = L.fk(p, F.contacts), S = W.shoulder_r.p;
  const rest = V.norm([1, 0.12, 0.05]);
  const knee = V.add(W.knee_r.p, [4, 6, 7]), toKnee = V.norm(V.sub(knee, S));
  const dir = V.norm(V.add(V.scale(rest, 1 - f), V.scale(toKnee, f)));
  let q = L.armToTarget(p, V.add(S, V.scale(dir, L.reach(6))), { flex: 6, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess });
  if (f === 0) { // resting: drop the arm onto the mat
    q = L.solvePose(q, ['ch.shoulder_r.elev'], [(Wx) => [(CA.minOf(Wx, ARM_IDS) - 0.3) * 3], (Wx, qq) => [Math.max(0, 4 - qq.ch.shoulder_r.elev) * 5]], { contacts: F.contacts }).pose;
  }
  for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  return q;
}
function trunk(k, guess) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  CA.neck(p, k.neck == null ? NECK0 : k.neck);
  let P = P0;
  if (k.fromFloor != null) {
    let hi = P0 + 10, lo = hi;
    while (lo > 0 && trunkFromFloor(L.fk(setP(clone(p), lo))) <= k.fromFloor) { hi = lo; lo -= 2; }
    for (let i = 0; i < 60; i++) { P = (lo + hi) / 2; if (trunkFromFloor(L.fk(setP(clone(p), P))) > k.fromFloor) lo = P; else hi = P; }
  } else P = P0 + (k.pitch || 0);
  setP(p, P);
  const W = L.fk(p, F.contacts), drop = Math.max(0, sitBottom(W) - SIT0);
  setP(p, P, drop);
  let q = p;
  for (const s of ['r', 'l']) q = CA.fitLeg(q, s, F.targets[s], F.contacts);
  q.ik = clone(lie.ik);
  return arms(q, k.arm, guess);
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, arm: 0 },
  { name: 'curl', l5: 3, t12: 12, t6: 16, neck: 28, pitch: 1, arm: 0.6 },
  { name: 'rise', l5: 14, t12: 18, t6: 17, neck: 24, fromFloor: 28, arm: 0.9 },
  { name: 'top', l5: 22, t12: 20, t6: 16, neck: 20, fromFloor: 45, arm: 1 },
  { name: 'topHold', l5: 22.5, t12: 20.5, t6: 16, neck: 20, fromFloor: 46, arm: 1 },
  { name: 'lower', l5: 20, t12: 20, t6: 17, neck: 22, fromFloor: 30, arm: 0.95 },
  { name: 'lowBack', l5: 6, t12: 14, t6: 16, neck: 26, pitch: 0, arm: 0.7 },
  { name: 'touch', l5: 0, t12: 3, t6: 6, neck: 12, pitch: 0, arm: 0.25 },
];
const poses = {}; let g = [85, 12, 0];
for (const k of KEYS) { const p = trunk(k, g); g = [p.ch.shoulder_r.plane, p.ch.shoulder_r.elev, p.ch.shoulder_r.axial]; poses[k.name] = p; }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.5, pose: 'curl' }, { t: 2.0, pose: 'rise' }, { t: 2.4, pose: 'top' }, { t: 3.2, pose: 'topHold' },
  { t: 4.0, pose: 'lower' }, { t: 4.7, pose: 'lowBack' }, { t: 5.2, pose: 'touch' }, { t: 5.6, pose: 'lie' }, { t: 6.4, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, F.contacts);
const hp = poses.topHold.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hp - 4), max: Math.ceil(hp + 4) };
const rep = CA.scan(ex, { trunk: (W) => trunkFromFloor(W), hip: (W, p) => p.ch.hip_r.flex, arm: (W) => CA.minOf(W, ARM_IDS) });
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.topHold, F.contacts), pk = poses.topHold;
const set = H.setKin(ex);
set('Trunk', 'setup', 'Lying (shoulder blades on the mat)'); set('Trunk', 'peak', `${B.deg(trunkFromFloor(Wt))} from the floor (about halfway up)`);
set('Lumbar and thoracic', 'setup', `${B.deg(lie.ch.spine_l5.flex + lie.ch.spine_t12.flex + lie.ch.spine_t6.flex)} (resting curve)`); set('Lumbar and thoracic', 'peak', `${B.deg(pk.ch.spine_l5.flex + pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (rounded)`);
set('Hip flexion', 'setup', B.deg(lie.ch.hip_r.flex)); set('Hip flexion', 'peak', `${B.deg(pk.ch.hip_r.flex)} (pelvis rolled ${Math.round(P0 - pk.root.rot.pitch)}°)`);
set('Knee', 'setup', B.deg(CA.kneeOf(Wl, 'r'))); set('Knee', 'peak', `${B.deg(CA.kneeOf(Wt, 'r'))}, feet unchanged (heels pressing)`);
set('Tempo', 'setup', 'Rest 0.8 s'); set('Tempo', 'peak', '1.6 s curl, 0.8 s pause, 2 s roll down, 1.2 s rest');
ex.exercise.reference.note = B.NOTE;
console.log(`Janda Sit-up: wrote ${L.write(ex)}  measure=${JSON.stringify(ex.checks.measure)}\n  ${JSON.stringify(rep)}`);
for (const k of KEYS) { const p = poses[k.name], W = L.fk(p, F.contacts); console.log(`  ${k.name.padEnd(8)} pitch=${p.root.rot.pitch} hip=${p.ch.hip_r.flex} trunk=${trunkFromFloor(W).toFixed(1)} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} min=${JSON.stringify(L.shapeMinY(W))}`); }
M.guard('janda-sit-up', ex, rep, [(rep.trunk[1] < 40 || rep.trunk[1] > 55) && `peak trunk ${rep.trunk[1]} outside 40-55`]);
