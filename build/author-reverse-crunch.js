// Reverse Crunch (GymVisual #087212). Bilateral: supine on a mat, arms by the sides palms down (planted hands), hips
// and knees bent about 90 degrees (shins level). Curl the pelvis up off the mat, bringing the knees toward the chest, pause,
// then roll the pelvis down slowly back to 90/90. The upper back, shoulders and head stay on the mat throughout.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const C = require('./families/core-a');
const meta = require('./meta/reverse-crunch.json');

const B = C.lie({ kneeFlex: 0 });
const HC = C.handContacts();
const lie0 = C.plantHands(B.pose, C.handTargets(B.pose, { abd: 12 }), HC);
const W0 = L.fk(lie0), T6 = W0.spine_t6.p, T6F = Q.rot(W0.spine_t6.q, [0, 1, 0]);
const P0 = lie0.root.rot.pitch, KNEE = 90;

// Upper back locked: for a pelvis curl `c` (degrees of posterior tilt), solve root position and lumbar / lower-thoracic
// flexion so the T6 joint keeps its place and orientation (the shoulders, arms and head do not move).
function curl(c) {
  const p = clone(lie0); p.root.rot.pitch = r1(P0 + c);
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.spine_l5.flex', 'ch.spine_t12.flex'], [
    (W) => V.sub(W.spine_t6.p, T6).map((v) => v * 4),
    (W) => V.sub(Q.rot(W.spine_t6.q, [0, 1, 0]), T6F).map((v) => v * 40),
    (W, q) => [((q.ch.spine_l5.flex - lie0.ch.spine_l5.flex) - 2 * (q.ch.spine_t12.flex - lie0.ch.spine_t12.flex)) * 0.05], // lumbar takes ~2/3
  ], { iters: 400 });
  return s.pose;
}
// Thigh angle from the floor (90 = vertical, more = knees past the hips toward the chest), knees bent KNEE
function legsAt(p, thigh, knee = KNEE, dorsi = -15) {
  const q = clone(p);
  for (const s of ['r', 'l']) { q.ch[`knee_${s}`] = { flex: knee }; q.ch[`ankle_${s}`] = { dorsi }; }
  let lo = 0, hi = 140;
  for (let i = 0; i < 50; i++) { const h = (lo + hi) / 2; q.ch.hip_r = { flex: h, abd: -2, rot: 0 }; if (C.thighFromFloor(L.fk(q)) < thigh) lo = h; else hi = h; }
  q.ch.hip_r = { flex: r1((lo + hi) / 2), abd: -2, rot: 0 };
  return C.mirrorLeg(q);
}
const key = (c, thigh, knee) => legsAt(curl(c), thigh, knee);
const CURL = 38;
const poses = {
  table: key(0, 90),
  up1: key(CURL * 0.4, 107, 92),
  top: key(CURL, 138, 96),
  topHold: key(CURL + 1, 139, 96),
  down1: key(CURL * 0.55, 116, 93),
  down2: key(CURL * 0.18, 96, 91),
};
const keyframes = [{ t: 0, pose: 'table' }, { t: 0.8, pose: 'table' }, { t: 1.4, pose: 'up1' }, { t: 2.0, pose: 'top' }, { t: 2.5, pose: 'topHold' }, { t: 3.3, pose: 'down1' }, { t: 4.1, pose: 'down2' }, { t: 4.6, pose: 'table' }, { t: 6.0, pose: 'table' }];
const ex = C.buildModule(meta, poses, keyframes, HC);
const peakHip = poses.topHold.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 8), max: Math.ceil(peakHip + 4) };

const pelvisLift = (W) => C.minOf(W, ['buttock_r', 'buttock_l', 'pelvis']);
const rep = C.scan(ex, { upperBack: (W) => V.len(V.sub(W.spine_t6.p, T6)), hip: (W, p) => p.ch.hip_r.flex, thigh: (W) => C.thighFromFloor(W), lift: pelvisLift, l5: (W, p) => p.ch.spine_l5.flex, t12: (W, p) => p.ch.spine_t12.flex, ribs: (W) => C.bottomOf(W, 'ribcage') });
const Wt = L.fk(poses.table, HC), Wp = L.fk(poses.top, HC), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, tp = poses.top, tb = poses.table;
kin[0].setup = 'Pelvis resting'; kin[0].peak = `${d(CURL)} posterior tilt`;
kin[1].setup = d(tb.ch.spine_l5.flex + tb.ch.spine_t12.flex) + ' (L5 and T12 segments, slight lordosis)'; kin[1].peak = `${d(tp.ch.spine_l5.flex + tp.ch.spine_t12.flex)} (+${Math.round(tp.ch.spine_l5.flex + tp.ch.spine_t12.flex - tb.ch.spine_l5.flex - tb.ch.spine_t12.flex)}°)`;
kin[2].setup = `${d(tb.ch.hip_r.flex)} (thighs ${d(C.thighFromFloor(Wt))} from the floor)`; kin[2].peak = `${d(tp.ch.hip_r.flex)} (thighs ${d(C.thighFromFloor(Wp))}, knees toward the chest)`;
kin[3].setup = d(C.kneeOf(Wt, 'r')); kin[3].peak = d(C.kneeOf(Wp, 'r'));
kin[4].setup = `Buttocks on the mat (${r1(pelvisLift(Wt))} cm)`; kin[4].peak = `Buttocks ${r1(pelvisLift(Wp))} cm off the mat; T6 and shoulders fixed (${rep.still} cm)`;
kin[5].setup = '90/90 hold 0.8 s'; kin[5].peak = '1.2 s up, 0.5 s pause, 2.1 s down, 1.4 s reset';
console.log(`Reverse Crunch: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
for (const [n, p] of Object.entries(poses)) { const W = L.fk(p, HC); console.log(`  ${n.padEnd(8)} pitch=${p.root.rot.pitch} root=${p.root.pos.map(r1)} spine=${p.ch.spine_l5.flex}/${p.ch.spine_t12.flex}/${p.ch.spine_t6.flex} hip=${p.ch.hip_r.flex} lift=${pelvisLift(W).toFixed(1)} t6err=${V.len(V.sub(W.spine_t6.p, T6)).toFixed(3)} min=${JSON.stringify(L.shapeMinY(W))}`); }
C.guard('reverse-crunch', rep, [pelvisLift(Wp) < 3 && 'pelvis barely leaves the mat', rep.upperBack[1] > 0.3 && `upper back moves ${rep.upperBack[1]} cm`]);
