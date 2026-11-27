// Bent-knee Lying Twist (GymVisual #363912, Bent knee Lying Twist (male)). Bilateral, alternating: supine on a mat, arms out
// to the sides in a T with the palms down (planted hands), hips and knees bent about 90 degrees with the knees together
// (tabletop). Lower both knees to one side under control by rolling the pelvis while the shoulders and upper back stay
// on the mat, return through the middle and lower to the other side. The pelvis turns about the spine's long axis; the
// lumbar and thoracic segments share the rotation so the upper back (T6) does not move. Lying base calibrated to the mesh.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const M = require('./families/b4-core2');
const meta = require('./meta/bent-knee-lying-twist.json');

const TWIST = +(process.env.TWIST || 50);   // pelvis roll at the end of each side (degrees)
const BUTT = +(process.env.BUTT || M.MESH.butt); // rig buttock depth under the mat surface (mesh calibration)
let base = M.lie({ kneeFlex: 0, headRest: 'floor', m: Object.assign({}, M.MESH, { head: M.OVERHEAD.head }) });
// exact supine pelvis (pitch 90) so the twist can be written as a single long-axis channel (see twist())
{ const W = L.fk(base), b0 = Math.min(M.bottomOf(W, 'buttock_r'), M.bottomOf(W, 'pelvis')); base.root.rot = { pitch: 90 }; const b1 = Math.min(M.bottomOf(L.fk(base), 'buttock_r'), M.bottomOf(L.fk(base), 'pelvis')); base.root.pos[1] = r1(base.root.pos[1] + b0 - b1); base = M.headTo(base, -M.OVERHEAD.head + 0.3); }
// tabletop legs: thighs vertical, knees 90, knees and feet together
for (const s of ['r', 'l']) { base.ch[`knee_${s}`] = { flex: 90 }; base.ch[`ankle_${s}`] = { dorsi: -15 }; }
{ let lo = 40, hi = 140; for (let i = 0; i < 50; i++) { const h = (lo + hi) / 2; base.ch.hip_r = { flex: h, abd: -3, rot: 0 }; if (CA.thighFromFloor(L.fk(base)) < 90) lo = h; else hi = h; } base.ch.hip_r = { flex: r1((lo + hi) / 2), abd: -3, rot: 0 }; CA.mirrorLeg(base); }
// arms in a T, palms down (planted)
const HC = CA.handContacts();
const T = CA.handTargets(base, { abd: 80, flex: 22 });
base = CA.plantHands(base, T, HC);
const W0 = L.fk(base, HC), T6 = W0.spine_t6.p, T6Q = W0.spine_t6.q, LONG = Q.rot(W0.pelvis.q, [0, 1, 0]);
const buttLow = (W) => Math.min(M.bottomOf(W, 'buttock_r'), M.bottomOf(W, 'buttock_l'), M.bottomOf(W, 'pelvis'));
const B0 = buttLow(W0);
const hipTilt = (W) => { const d = V.sub(W.hip_r.p, W.hip_l.p); return Math.atan2(-d[1], d[2]) / L.R.DEG; }; // + = right hip down (knees to the right)

// Pelvis rolled `th` degrees (knees toward the right for th > 0): root and spine rotations so the upper back (T6) keeps
// its place and orientation and the pelvis turns about its own long axis, the low side staying on the mat.
function twist(th, extraDrop = 0) {
  // Root Euler angles re-expressed as yaw -90 / roll +90: lying on the back that is the same orientation, and the pitch
  // channel then turns the pelvis about the body's long axis (no gimbal flip between the keys).
  const p = clone(base);
  p.root.rot = { yaw: -90, pitch: 90, roll: 90 };
  // spine rotation shared 12/44/44 between the lumbar, lower and mid thoracic segments (one variable: ch.spine_t12.rot)
  const SPL = { spine_l5: 0.12 / 0.44, spine_t6: 1 };
  const paths = ['root.pos.0', 'root.pos.1', 'root.pos.2', 'root.rot.pitch', 'ch.spine_t12.rot', 'ch.spine_l5.latFlex', 'ch.spine_t12.latFlex', 'ch.spine_t6.latFlex', 'ch.spine_l5.flex', 'ch.spine_t12.flex'];
  const tie = (q) => { const r = q.ch.spine_t12.rot; q.ch.spine_l5 = Object.assign({}, q.ch.spine_l5, { rot: r * SPL.spine_l5 }); q.ch.spine_t6 = Object.assign({}, q.ch.spine_t6, { rot: r }); return q; };
  const objs = [
    (W) => V.sub(W.spine_t6.p, T6).map((v) => v * 12),
    (W) => [...V.sub(Q.rot(W.spine_t6.q, [1, 0, 0]), Q.rot(T6Q, [1, 0, 0])), ...V.sub(Q.rot(W.spine_t6.q, [0, 1, 0]), Q.rot(T6Q, [0, 1, 0]))].map((v) => v * 120),
    (W) => [(hipTilt(W) - th) * 1],
    (W) => [(buttLow(W) - (B0 - extraDrop)) * 2],
    (W, q) => [(q.ch.spine_l5.latFlex || 0) * 0.05, (q.ch.spine_t12.latFlex || 0) * 0.05, (q.ch.spine_t6.latFlex || 0) * 0.05, (q.ch.spine_l5.flex - base.ch.spine_l5.flex) * 0.05, (q.ch.spine_t12.flex - base.ch.spine_t12.flex) * 0.05],
    CA.limitPen(['ch.spine_l5.latFlex', 'ch.spine_t12.latFlex', 'ch.spine_t6.latFlex', 'ch.spine_l5.rot'], 4),
  ];
  const set = (x) => { const q = clone(p); paths.forEach((pt, i) => L.setPathV(q, pt, x[i])); return tie(q); };
  const res = (x) => { const q = set(x), W = L.fk(q); return objs.flatMap((f) => f(W, q)); };
  const sol = L.R.solveLM(paths.map((pt) => L.getPath(p, pt) ?? 0), res, { iters: 1500 });
  const s = { pose: set(sol.x) };
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) for (const c of ['rot', 'latFlex', 'flex']) if (s.pose.ch[j][c] != null) s.pose.ch[j][c] = r1(s.pose.ch[j][c]);
  for (const k of ['yaw', 'pitch', 'roll']) s.pose.root.rot[k] = +s.pose.root.rot[k].toFixed(2);
  s.pose.root.pos = s.pose.root.pos.map((v) => +v.toFixed(2));
  return s.pose;
}
// mesh calibration: the athlete's buttock is rounder than the rig shapes; rolled onto the side its hip sits about 1.6 cm lower than the shapes predict, so the pelvis rises a little
const DROP = +(process.env.DROP || -1.6);
const keyR = (th) => twist(th, DROP * Math.min(1, Math.abs(th) / TWIST));
const poses = { mid: twist(0), r1: keyR(TWIST * 0.45), r2: keyR(TWIST), r2h: keyR(TWIST + 2), r3: keyR(TWIST * 0.5), l1: keyR(-TWIST * 0.45), l2: keyR(-TWIST), l2h: keyR(-TWIST - 2), l3: keyR(-TWIST * 0.5) };
// head turns a little away from the knees (optional cue); keep it subtle
for (const [n, sg] of [['r2', -1], ['r2h', -1], ['l2', 1], ['l2h', 1]]) { const hp = poses[n]; hp.ch.neck_c7 = Object.assign({}, hp.ch.neck_c7, { rot: r1(sg * 8) }); hp.ch.head_c1 = Object.assign({}, hp.ch.head_c1, { rot: r1(sg * 12) }); }
const keyframes = [{ t: 0, pose: 'mid' }, { t: 0.6, pose: 'mid' }, { t: 1.4, pose: 'r1' }, { t: 2.2, pose: 'r2' }, { t: 2.7, pose: 'r2h' }, { t: 3.5, pose: 'r3' }, { t: 4.2, pose: 'mid' },
  { t: 5.0, pose: 'l1' }, { t: 5.8, pose: 'l2' }, { t: 6.3, pose: 'l2h' }, { t: 7.1, pose: 'l3' }, { t: 7.8, pose: 'mid' }, { t: 8.2, pose: 'mid' }];
const ex = CA.buildModule(meta, poses, keyframes, HC);

const rep = CA.scan(ex, { upperBack: (W) => V.len(V.sub(W.spine_t6.p, T6)), tilt: hipTilt, knees: (W) => Math.min(W.knee_r.p[1], W.knee_l.p[1]), butt: buttLow });
M.meshFloor(ex, rep);
const Wr = L.fk(poses.r2h, HC), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.r2h;
const rotSum = Math.abs(pk.ch.spine_l5.rot + pk.ch.spine_t12.rot + pk.ch.spine_t6.rot);
kin[0].setup = 'Knees over the hips'; kin[0].peak = `Pelvis rolled ${d(hipTilt(Wr))} to each side; knees ${Math.round(Math.min(Wr.knee_r.p[1], Wr.knee_l.p[1]))} cm above the floor (from ${Math.round(W0.knee_r.p[1])})`;
kin[1].setup = 'Neutral'; kin[1].peak = `${d(rotSum)} between pelvis and upper back (lumbar ${d(Math.abs(pk.ch.spine_l5.rot))}, lower and mid thoracic ${d(Math.abs(pk.ch.spine_t12.rot + pk.ch.spine_t6.rot))})`;
kin[2].setup = `Hips ${d(base.ch.hip_r.flex)}, knees ${d(CA.kneeOf(W0, 'r'))} (tabletop)`; kin[2].peak = 'Unchanged; knees stay together';
kin[3].setup = 'Arms out in a T, palms down'; kin[3].peak = `Shoulders and upper back stay down (T6 moves ${rep.upperBack[1]} cm)`;
kin[4].setup = 'Centre 0.6 s'; kin[4].peak = '1.6 s down to the side, 0.5 s pause, 1.5 s back through the middle, each side; 8.2 s loop';
console.log(`Bent-knee lying twist: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} floorTol=${ex.checks.floorTolerance}`);
for (const n of ['mid', 'r1', 'r2', 'r3']) { const p = poses[n], W = L.fk(p, HC); console.log(`  ${n.padEnd(4)} root=${p.root.pos.map(r1)} rot=${JSON.stringify(p.root.rot)} spineRot=${p.ch.spine_l5.rot}/${p.ch.spine_t12.rot}/${p.ch.spine_t6.rot} lat=${p.ch.spine_l5.latFlex}/${p.ch.spine_t12.latFlex} tilt=${hipTilt(W).toFixed(1)} butt=${buttLow(W).toFixed(1)} t6err=${V.len(V.sub(W.spine_t6.p, T6)).toFixed(2)}`); }
M.guard('bent-knee-lying-twist', ex, rep, [rep.upperBack[1] > 0.8 && `upper back moves ${rep.upperBack[1]} cm`, Math.abs(hipTilt(Wr)) < TWIST - 3 && `pelvis only rolls ${hipTilt(Wr).toFixed(1)} degrees`]);
