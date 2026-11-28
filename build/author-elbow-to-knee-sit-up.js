// Elbow to Knee Sit-up (GymVisual #7635, movement reference only; page not readable here). Bilateral, alternating: supine
// on a mat, knees bent about 90 degrees with the feet flat and anchored (planted contacts), fingertips behind the head
// with the elbows wide. Curl up and sit up, turning the trunk on the way so the right elbow comes to the left knee at the
// top; pause, roll back down (low back first, head last); repeat with the left elbow to the right knee. Body from
// author-sit-up.js (b6-17 sitUpBody) with thoracic rotation added; hands by core-b cradle (as twisting-crunch).
const L = require('./lib');
const { V, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const M = require('./families/b4-core2');
const F6 = require('./families/b6-17');
const meta = require('./meta/elbow-to-knee-sit-up.json');

const KNEE = 88;
const lie0 = M.lie({ kneeFlex: 90, headRest: 'hands' });
const F = CA.plantFeet(lie0, KNEE);
const lie = F.pose, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const body = F6.sitUpBody(F, NECK0);
function key(k, ref) {
  let q = body(k);
  for (const s of ['r', 'l']) { q = CB.cradle(q, { side: s, floor: k.floor ? 0.2 : 1.0, elbowAnt: s === 'r' ? (k.elbowAnt ?? -3) : -3, elbowOut: s === 'r' ? (k.elbowOut ?? 18) : 18, guess: ref ? ref[s] : null, ref: ref ? ref[s] : null }); delete q.__cost; }
  return q;
}
const ROT = +(process.env.ROT || 46);
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, floor: true },
  { name: 'curl', l5: 3, t12: 12, t6: 16, neck: 28, pitch: 1, rot: 6 },
  { name: 'rise', l5: 18, t12: 20, t6: 17, neck: 24, fromFloor: 40, rot: 18 },
  { name: 'top', l5: 32, t12: 24, t6: 20, neck: 22, fromFloor: +(process.env.TF || 70), rot: ROT, lat: 6, elbowAnt: +(process.env.EA || 20), elbowOut: +(process.env.EO || -4) },
  { name: 'topHold', l5: 33, t12: 25, t6: 20.5, neck: 22, fromFloor: +(process.env.TF || 70) + 1, rot: ROT + 1, lat: 6, elbowAnt: +(process.env.EA || 20), elbowOut: +(process.env.EO || -4) },
  { name: 'lower', l5: 30, t12: 22, t6: 16, neck: 22, fromFloor: 42, rot: 14 },
  { name: 'lowBack', l5: 8, t12: 16, t6: 17, neck: 26, pitch: 0, rot: 4 },
];
let seed = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  const p = CB.cradle(body(KEYS[1]), { guess: g }); if (!seed || p.__cost < seed.__cost) seed = p;
}
const REF0 = { r: CB.armOf(seed, 'r'), l: CB.armOf(seed, 'r') };
const arms = (p) => ({ r: CB.armOf(p, 'r'), l: CB.armOf(p, 'l') });
const poses = {}; let prev = REF0;
for (const k of KEYS) { poses[k.name] = key(k, k.floor ? REF0 : prev); prev = arms(poses[k.name]); }
for (const n of ['curl', 'rise', 'top', 'topHold', 'lower', 'lowBack']) { poses[n + 'L'] = CB.mirror(poses[n]); delete poses[n + 'L'].__cost; }
const rep1 = (t0, sfx) => [{ t: t0 + 0.6, pose: 'curl' + sfx }, { t: t0 + 1.05, pose: 'rise' + sfx }, { t: t0 + 1.5, pose: 'top' + sfx }, { t: t0 + 1.9, pose: 'topHold' + sfx }, { t: t0 + 2.8, pose: 'lower' + sfx }, { t: t0 + 3.4, pose: 'lowBack' + sfx }, { t: t0 + 3.9, pose: 'lie' }];
const keyframes = [{ t: 0, pose: 'lie' }, ...rep1(0, ''), { t: 4.4, pose: 'lie' }, ...rep1(4.4, 'L'), { t: 8.8, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, F.contacts);
const band = [KEYS[3].fromFloor - 4, KEYS[4].fromFloor + 0.5].map((a) => body(Object.assign({}, KEYS[3], { fromFloor: a })).ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.min(...band)), max: Math.ceil(Math.max(...band)) };

const ek = (W) => V.len(V.sub(W.elbow_r.p, W.knee_l.p));
const rep = CA.scan(ex, { trunk: (W) => CA.trunkFromFloor(W), hip: (W, p) => p.ch.hip_r.flex, legGap: (W) => Math.min(...['quad_l', 'thigh_l', 'shank_l'].map((id) => F6.gapTo(W, id, W.elbow_r.p))) });
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.topHold, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.topHold;
const rotOf = (p) => p.ch.spine_l5.rot + p.ch.spine_t12.rot + p.ch.spine_t6.rot;
kin[0].setup = 'Lying (shoulder blades on the mat)'; kin[0].peak = `${d(CA.trunkFromFloor(Wt))} from the floor`;
kin[1].setup = 'Facing the ceiling'; kin[1].peak = `${d(Math.abs(rotOf(pk)))} toward the opposite knee (mostly thoracic); elbow ${r1(rep.legGap[0])} cm from the knee at the closest`;
kin[2].setup = d(lie.ch.spine_l5.flex + lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_l5.flex + pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (rounded)`;
kin[3].setup = d(lie.ch.hip_r.flex); kin[3].peak = `${d(pk.ch.hip_r.flex)} (pelvis rolled toward the thighs)`;
kin[4].setup = d(CA.kneeOf(Wl, 'r')); kin[4].peak = `${d(CA.kneeOf(Wt, 'r'))}, feet unchanged`;
kin[5].setup = 'Rest 0.5 s'; kin[5].peak = '1.5 s up and turn, 0.4 s pause, 2 s roll down per side; 8.8 s loop';
console.log(`Elbow to knee sit-up: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} measure=${JSON.stringify(ex.checks.measure)}`);
for (const k of KEYS) { const p = poses[k.name], W = L.fk(p, F.contacts); console.log(`  ${k.name.padEnd(8)} pitch=${p.root.rot.pitch} hip=${p.ch.hip_r.flex} trunk=${CA.trunkFromFloor(W).toFixed(1)} rot=${rotOf(p).toFixed(1)} elbowKnee=${ek(W).toFixed(1)} gap=${Math.min(...['quad_l', 'thigh_l'].map((id) => F6.gapTo(W, id, W.elbow_r.p))).toFixed(1)} R=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial}`); }
M.guard('elbow-to-knee-sit-up', ex, rep, [rep.legGap[0] < -1 && `elbow into the knee (${rep.legGap[0]})`, rep.legGap[0] > 8 && `elbow far from the knee (${rep.legGap[0]})`]);
