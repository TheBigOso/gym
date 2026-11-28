// Crunch (arms straight) (GymVisual #5038, movement reference only; page not readable here). Bilateral: supine on a mat,
// knees bent about 90 degrees with the feet flat (planted), arms straight by the sides resting on the mat. Curl the head,
// shoulders and shoulder blades off the mat while the straight arms lift and reach forward past the hips toward the knees
// (hands outside the thighs, palms down), squeeze, then lower: shoulder blades first, head last, arms back to the mat.
// Low back and pelvis stay down. Built on core-a / b4-core2 (as crunch) and b6-17 armReach.
const L = require('./lib');
const { V, r1, clone } = L;
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const F6 = require('./families/b6-17');
const meta = require('./meta/crunch-arms-straight.json');

const lie0 = M.lie({ kneeFlex: 90, headRest: 'floor' });
const F = CA.plantFeet(lie0, 90);
const lie = F.pose, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
// k.reach: 0 = arms resting on the mat by the sides, 1 = arms pointing at a spot just outside the knees
function curl(k, ref) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  CA.neck(p, k.neck == null ? NECK0 : k.neck);
  const W0 = L.fk(p, F.contacts), S = W0.shoulder_r.p;
  const rest = [S[0] + 52, 3.2, S[2] + 6];                    // wrist beside the hip, back of the forearm on the mat
  const knee = V.add(W0.knee_r.p, [0, -2, 9]);                 // just outside the right knee
  const dRest = V.norm(V.sub(rest, S)), dKnee = V.norm(V.sub(knee, S));
  const dir = V.norm(V.add(V.scale(dRest, 1 - k.reach), V.scale(dKnee, k.reach)));
  const wrist = V.add(S, V.scale(dir, L.reach(4)));
  if (k.reach === 0) wrist[1] = 3.2;
  const palm = V.norm(V.sub([0, -1, 0], V.scale(dir, -dir[1])));
  const q = F6.armReach(p, 'r', { wrist, palm, fingers: dir, elbow: 4, floor: k.reach === 0 ? 0 : 0.5, guess: ref, ref, protract: 4 * k.reach });
  delete q.__cost;
  return F6.mirrorArm(q);
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, reach: 0 },
  { name: 'peel', l5: 0.5, t12: 7, t6: 10, neck: 22, reach: 0.55 },
  { name: 'top', l5: 2, t12: 20, t6: 16, neck: 28, reach: 1 },
  { name: 'topHold', l5: 2.5, t12: 21, t6: 16.5, neck: 28, reach: 1 },
  { name: 'down', l5: 0.5, t12: 4, t6: 6, neck: 18, reach: 0.45 },
  { name: 'touch', l5: 0, t12: 1, t6: 2, neck: NECK0 + 4, reach: 0.08 },
];
const seed = F6.armOf(curl(KEYS[2]), 'r');
const poses = {}; let prev = seed;
for (const k of [KEYS[2], KEYS[3], KEYS[1], KEYS[4], KEYS[5], KEYS[0]]) { poses[k.name] = curl(k, prev); prev = F6.armOf(poses[k.name], 'r'); }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.2, pose: 'peel' }, { t: 1.8, pose: 'top' }, { t: 2.3, pose: 'topHold' }, { t: 3.3, pose: 'down' }, { t: 3.9, pose: 'touch' }, { t: 4.4, pose: 'lie' }, { t: 5.0, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, F.contacts);

const thighGap = (W) => Math.min(F6.gapTo(W, 'thigh_r', W.handtip_r.p), F6.gapTo(W, 'quad_r', W.handtip_r.p), F6.gapTo(W, 'thigh_r', W.wrist_r.p));
const rep = CA.scan(ex, { upper: (W) => CA.upperFromFloor(W), lowBack: (W) => CA.minOf(W, ['buttock_r', 'pelvis']), handY: (W) => W.wrist_r.p[1], thighGap, elbow: (W) => L.R.measures(W).elbowR });
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.topHold, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.topHold;
kin[0].setup = d(CA.upperFromFloor(Wl)); kin[0].peak = `${d(CA.upperFromFloor(Wt))} (C7 up ${r1(Wt.neck_c7.p[1] - Wl.neck_c7.p[1])} cm)`;
kin[1].setup = d(lie.ch.spine_l5.flex) + ' (slight lordosis)'; kin[1].peak = `${d(pk.ch.spine_l5.flex)} (low back stays on the mat)`;
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (+${Math.round(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex - lie.ch.spine_t12.flex - lie.ch.spine_t6.flex)}°)`;
kin[3].setup = `Arms by the sides on the mat (shoulder elevation ${d(poses.lie.ch.shoulder_r.elev)})`; kin[3].peak = `Shoulder elevation ${d(pk.ch.shoulder_r.elev)}, elbows straight; fingertips ${Math.round(Math.abs(Wt.handtip_r.p[0] - Wt.knee_r.p[0]))} cm short of the knees`;
kin[4].setup = `Hip ${d(lie.ch.hip_r.flex)}, knee ${d(CA.kneeOf(Wl, 'r'))}`; kin[4].peak = 'Unchanged (pelvis and feet still)';
kin[5].setup = 'Rest 0.8 s'; kin[5].peak = '1.0 s up, 0.5 s squeeze, 1.6 s down, 1.1 s rest';
console.log(`Crunch arms straight: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
for (const k of KEYS) { const p = poses[k.name], W = L.fk(p, F.contacts); console.log(`  ${k.name.padEnd(8)} upper=${CA.upperFromFloor(W).toFixed(1)} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} elb=${p.ch.elbow_r.flex} wr=${p.ch.wrist_r.pron}/${p.ch.wrist_r.flex}/${p.ch.wrist_r.dev} wristY=${W.wrist_r.p[1].toFixed(1)} tipX-kneeX=${(W.handtip_r.p[0] - W.knee_r.p[0]).toFixed(1)} tipZ=${W.handtip_r.p[2].toFixed(1)}`); }
M.guard('crunch-arms-straight', ex, rep, [(CA.upperFromFloor(Wt) < 25 || CA.upperFromFloor(Wt) > 50) && 'upper-trunk curl outside 25-50 degrees', rep.lowBack[1] > 1.5 && 'low back lifts', rep.thighGap[0] < 0 && `hand inside the thigh (${rep.thighGap[0]})`]);
