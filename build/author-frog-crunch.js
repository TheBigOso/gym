// Frog Crunch (GymVisual #897612, Lying Frog Crunch Feet Together (male)). Bilateral: supine on a mat, soles of the feet
// together close to the body and the knees dropped out to the sides (hips flexed, abducted and externally rotated), the
// feet resting on their outer edges; fingertips behind the head, elbows wide. Curl the head, shoulders and shoulder blades
// off the mat, squeeze, lower: shoulder blades first, head last. The open-hip "frog" position keeps the legs passive; the
// pelvis and legs do not move (still joints). Lying base calibrated to the athlete mesh.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const M = require('./families/b4-core2');
const meta = require('./meta/frog-crunch.json');

/* ---------------- Frog legs: soles together, knees out ---------------- */
let base = M.lie({ kneeFlex: 90, headRest: 'hands' });
const foot = (W, s) => { const a = W[`ankle_${s}`], sg = s === 'r' ? 1 : -1; return { sole: V.add(a.p, Q.rot(a.q, [5.8, -6.6, 0])), n: Q.rot(a.q, [0, -1, 0]), lat: Q.rot(a.q, [0, 0, sg]) }; };
const LEGP = ['ch.hip_r.flex', 'ch.hip_r.abd', 'ch.hip_r.rot', 'ch.knee_r.flex', 'ch.ankle_r.dorsi'];
base.ch.hip_r = { flex: 50, abd: 35, rot: -30 }; base.ch.knee_r = { flex: 100 }; base.ch.ankle_r = { dorsi: -20 };
const HEEL_D = +(process.env.HEEL_D || 42); // hip-to-ankle distance (cm): heels drawn in toward the groin
base = L.solvePose(base, LEGP, [
  (W) => { const f = foot(W, 'r'); return [f.sole[2] * 3, (f.n[2] + 0.85) * 10, (CA.bottomOf(W, 'foot_r') - 0.2) * 3, (f.lat[1] + 0.6) * 3]; },
  (W) => [(V.len(V.sub(W.ankle_r.p, W.hip_r.p)) - HEEL_D) * 0.5],
  CA.limitPen(LEGP, 3), L.obj.reg('ch.knee_r.flex', 100, 0.02)], { iters: 600 }).pose;
CA.mirrorLeg(base);
const lie = base, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);

function curl(k, guess) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  CA.neck(p, k.neck == null ? NECK0 : k.neck);
  const out = CB.cradle(p, { floor: k.floor ? 0.2 : 1.0, elbowAnt: -3, elbowOut: 20, guess, ref: k.floor ? guess : null });
  return out;
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, floor: true },
  { name: 'peel', l5: 0.5, t12: 7, t6: 10, neck: 24 },
  { name: 'top', l5: 2, t12: 20, t6: 16, neck: 30 },
  { name: 'topHold', l5: 2.5, t12: 21, t6: 16.5, neck: 30 },
  { name: 'down', l5: 0.5, t12: 4, t6: 6, neck: 22 },
  { name: 'touch', l5: 0, t12: 1, t6: 2, neck: 12, floor: true },
];
let seed = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  const p = curl(KEYS[2], g); if (!seed || p.__cost < seed.__cost) seed = p;
}
const ARM0 = CB.armOf(seed, 'r');
const poses = {}; let prev = ARM0;
for (const k of KEYS) { const p = curl(k, k.floor ? ARM0 : prev); prev = CB.armOf(p, 'r'); delete p.__cost; poses[k.name] = p; }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.2, pose: 'peel' }, { t: 1.8, pose: 'top' }, { t: 2.3, pose: 'topHold' }, { t: 3.3, pose: 'down' }, { t: 3.9, pose: 'touch' }, { t: 4.4, pose: 'lie' }, { t: 5.0, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, []);

const rep = CA.scan(ex, { upper: (W) => CA.upperFromFloor(W), lowBack: (W) => CA.minOf(W, ['buttock_r', 'pelvis']) });
const Wl = L.fk(lie), Wt = L.fk(poses.topHold), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.topHold, fr = foot(Wl, 'r');
kin[0].setup = d(CA.upperFromFloor(Wl)); kin[0].peak = `${d(CA.upperFromFloor(Wt))} (C7 up ${r1(Wt.neck_c7.p[1] - Wl.neck_c7.p[1])} cm)`;
kin[1].setup = d(lie.ch.spine_l5.flex) + ' (slight lordosis)'; kin[1].peak = `${d(pk.ch.spine_l5.flex)} (low back stays on the mat)`;
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (+${Math.round(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex - lie.ch.spine_t12.flex - lie.ch.spine_t6.flex)}°)`;
kin[3].setup = `Hip flexion ${d(lie.ch.hip_r.flex)}, abduction ${d(lie.ch.hip_r.abd)}, external rotation ${d(-lie.ch.hip_r.rot)}; knees ${d(CA.kneeOf(Wl, 'r'))}, ${Math.round(Wl.knee_r.p[2] - Wl.knee_l.p[2])} cm apart; soles ${Math.round(V.angle(fr.n, [0, 0, -1]))}° from facing straight in`;
kin[3].peak = 'Unchanged (pelvis and legs still)';
kin[4].setup = 'Fingertips behind the head, elbows wide'; kin[4].peak = 'Unchanged; the hands only support the head';
kin[5].setup = 'Rest 0.8 s'; kin[5].peak = '1.0 s up, 0.5 s squeeze, 1.6 s down, 1.1 s rest';
console.log(`Frog crunch: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} legs=${JSON.stringify([lie.ch.hip_r, lie.ch.knee_r, lie.ch.ankle_r])} ankle=${Wl.ankle_r.p.map(r1)} knee=${Wl.knee_r.p.map(r1)}`);
M.guard('frog-crunch', ex, rep, [(CA.upperFromFloor(Wt) < 25 || CA.upperFromFloor(Wt) > 50) && 'upper-trunk curl outside 25-50 degrees']);
