// Flexion Leg Sit-up (straight arm) (GymVisual #9415, movement reference only; page not readable here). Bilateral:
// supine on a mat, knees bent ("flexion leg") about 90 degrees with the feet flat and anchored (planted contacts), arms
// straight and reaching toward the knees. Curl the head and shoulder blades off the mat, keep curling and sit all the way
// up with the straight arms reaching forward past the knees (outside the thighs), pause, then roll back down: low back
// first, shoulder blades, head last. Body from author-sit-up.js (b6-17 sitUpBody); arms by b6-17 armReach.
const L = require('./lib');
const { V, r1, clone } = L;
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const F6 = require('./families/b6-17');
const meta = require('./meta/flexion-leg-sit-up-straight-arm.json');

const KNEE = 88;
const lie0 = M.lie({ kneeFlex: 90, headRest: 'floor' });
const F = CA.plantFeet(lie0, KNEE);
const lie = F.pose, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const body = F6.sitUpBody(F, NECK0);
// arms straight, aimed at a spot just outside and beyond the knees (palms facing in, thumbs up)
function trunk(k, ref) {
  const p = body(k);
  const W = L.fk(p, F.contacts), S = W.shoulder_r.p, aim = V.add(W.knee_r.p, [k.ahead ?? 6, k.aimUp ?? 0, 12]);
  const dir = V.norm(V.sub(aim, S)), wrist = V.add(S, V.scale(dir, L.reach(4)));
  const palm = V.norm(V.sub([0, 0, -1], V.scale(dir, -dir[2])));
  const q = F6.armReach(p, 'r', { wrist, palm, fingers: dir, elbow: 4, floor: 0.5, guess: ref, ref, protract: k.pro ?? 4 });
  delete q.__cost;
  return F6.mirrorArm(q);
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, pro: 0 },
  { name: 'curl', l5: 3, t12: 12, t6: 16, neck: 26, pitch: 1 },
  { name: 'rise', l5: 20, t12: 20, t6: 17, neck: 22, fromFloor: 40 },
  { name: 'top', l5: 30, t12: 17, t6: 12, neck: 14, fromFloor: 78, pro: 10 },
  { name: 'topHold', l5: 31, t12: 18, t6: 12.5, neck: 14, fromFloor: 79, pro: 11 },
  { name: 'lower', l5: 32, t12: 22, t6: 16, neck: 20, fromFloor: 45 },
  { name: 'lowBack', l5: 8, t12: 16, t6: 17, neck: 24, pitch: 0 },
  { name: 'touch', l5: 0, t12: 3, t6: 6, neck: 10, pitch: 0, pro: 0 },
];
const seed = F6.armOf(trunk(KEYS[3]), 'r');
const poses = {}; let prev = seed;
for (const i of [3, 4, 2, 1, 0, 5, 6, 7]) { const k = KEYS[i]; poses[k.name] = trunk(k, prev); prev = F6.armOf(poses[k.name], 'r'); }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.5, pose: 'curl' }, { t: 1.95, pose: 'rise' }, { t: 2.4, pose: 'top' }, { t: 2.9, pose: 'topHold' },
  { t: 3.9, pose: 'lower' }, { t: 4.6, pose: 'lowBack' }, { t: 5.0, pose: 'touch' }, { t: 5.5, pose: 'lie' }, { t: 6.4, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, F.contacts);
const band = [76, 82].map((a) => body(Object.assign({}, KEYS[3], { fromFloor: a })).ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.min(...band)), max: Math.ceil(Math.max(...band)) };

const thighGap = (W) => Math.min(...['quad_r', 'thigh_r', 'shank_r'].map((id) => Math.min(F6.gapTo(W, id, W.handtip_r.p), F6.gapTo(W, id, W.wrist_r.p))));
const rep = CA.scan(ex, { trunk: (W) => CA.trunkFromFloor(W), hip: (W, p) => p.ch.hip_r.flex, thighGap, elbow: (W) => L.R.measures(W).elbowR });
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.topHold, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.topHold;
kin[0].setup = 'Lying (shoulder blades on the mat)'; kin[0].peak = `${d(CA.trunkFromFloor(Wt))} from the floor`;
kin[1].setup = d(lie.ch.spine_l5.flex) + ' (slight lordosis)'; kin[1].peak = `${d(pk.ch.spine_l5.flex)} (L5-T12 segment, rounded)`;
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} at the top (more during the curl)`;
kin[3].setup = d(lie.ch.hip_r.flex); kin[3].peak = `${d(pk.ch.hip_r.flex)} (pelvis rolled toward the thighs)`;
kin[4].setup = d(CA.kneeOf(Wl, 'r')); kin[4].peak = `${d(CA.kneeOf(Wt, 'r'))}, feet unchanged`;
kin[5].setup = `Straight arms aimed at the knees (shoulder elevation ${d(poses.lie.ch.shoulder_r.elev)})`; kin[5].peak = `Shoulder elevation ${d(pk.ch.shoulder_r.elev)}, elbows ≈${Math.round(rep.elbow[1])}° or less; fingertips ${Math.round(Wt.handtip_r.p[0] - Wt.knee_r.p[0])} cm past the knees`;
kin[6].setup = 'Rest 0.8 s'; kin[6].peak = '0.7 s curl, 0.9 s sit up, 0.5 s pause, 2.1 s roll down, 1.4 s rest';
console.log(`Flexion leg sit-up straight arm: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} measure=${JSON.stringify(ex.checks.measure)}`);
for (const k of KEYS) { const p = poses[k.name], W = L.fk(p, F.contacts); console.log(`  ${k.name.padEnd(8)} pitch=${p.root.rot.pitch} hip=${p.ch.hip_r.flex} trunk=${CA.trunkFromFloor(W).toFixed(1)} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} elb=${p.ch.elbow_r.flex} wr=${p.ch.wrist_r.pron} gap=${thighGap(W).toFixed(1)}`); }
M.guard('flexion-leg-sit-up-straight-arm', ex, rep, [(rep.trunk[1] < 72 || rep.trunk[1] > 88) && `peak trunk ${rep.trunk[1]}`, rep.thighGap[0] < 0 && `hands into the legs (${rep.thighGap[0]})`]);
