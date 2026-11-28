// Starfish Crunch (beginner) (GymVisual #8965, movement reference only; page not readable here). Bilateral, alternating:
// lie in a star on the mat, legs straight and apart, arms overhead in a wide V. Beginner version: curl up and turn,
// reaching the right hand across toward the left shin while the left knee bends and draws in (instead of lifting the
// straight leg to the hand, the advanced form); the left arm stays on the mat. Lower back to the star and repeat with the
// left hand to the right shin. Pelvis stays on the mat. Built on core-a / b4-core2 (lying base, overhead arms) and
// b6-17 armReach.
const L = require('./lib');
const { V, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const M = require('./families/b4-core2');
const F6 = require('./families/b6-17');
const meta = require('./meta/starfish-crunch-beginner.json');

const ABD = 18;
let lie = M.lie({ kneeFlex: 0, headRest: 'floor' });
for (const s of ['r', 'l']) lie.ch[`hip_${s}`].abd = ABD;
lie = L.solvePose(lie, ['ch.hip_r.flex'], [(W) => [(CA.minOf(W, ['calf_r', 'foot_r', 'shank_r']) - 0.15) * 3]]).pose; CA.mirrorLeg(lie);
// star arms: overhead in a wide V resting on the mat
const star = M.overheadArms(lie, { ang: +(process.env.ANG || -16), width: +(process.env.WIDTH || 95), elbow: 8, palms: 'up', floorClr: 0.2 });
delete star.__cost;
const ARM_STAR = { r: F6.armOf(star, 'r'), l: F6.armOf(F6.mirrorArm(clone(star)), 'r') };
const NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const SPLIT = { spine_l5: 0.08, spine_t12: 0.46, spine_t6: 0.46 };
// point on the front of the left shin, a quarter of the way from knee to ankle
function shinPt(W) {
  const k = W.knee_l.p, a = W.ankle_l.p, ax = V.norm(V.sub(a, k)), base = V.add(k, V.scale(V.sub(a, k), 0.22));
  let n = V.norm(V.sub([0, 1, 0], V.scale(ax, ax[1]))); if (n[1] < 0.2) n = [0, 1, 0];
  return V.add(base, V.scale(n, F6.surfaceUp(W, base, n, ['shank_l', 'calf_l', 'thigh_l', 'quad_l'], 1.2)));
}
function key(k, ref) {
  const p = CA.spine(clone(star), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  for (const j of Object.keys(SPLIT)) Object.assign(p.ch[j], { rot: r1(-(k.rot || 0) * SPLIT[j]), latFlex: r1(-(k.lat || 0) * (j === 'spine_l5' ? 0 : 0.5)) });
  CB.neck(p, k.neck == null ? NECK0 : k.neck, -(k.rot || 0) * 0.35);
  p.ch.hip_l = { flex: k.hipL ?? lie.ch.hip_l.flex, abd: k.abdL ?? ABD, rot: 0 }; p.ch.knee_l = { flex: k.kneeL ?? lie.ch.knee_l.flex }; p.ch.ankle_l = { dorsi: k.dorsiL ?? lie.ch.ankle_l.dorsi };
  for (const j in ARM_STAR.l) p.ch[j.replace('_r', '_l')] = clone(ARM_STAR.l[j]);
  if (k.mix != null) {
    // transition key: arm channels part way between the star arm and the reach (keeps the arm on one smooth path)
    for (const j in ARM_STAR.r) { const a = ARM_STAR.r[j], b = REACH[j]; p.ch[j] = {}; for (const c in a) p.ch[j][c] = r1(a[c] + (b[c] - a[c]) * k.mix); }
    return p;
  }
  if (k.reach) {
    const q = F6.armReach(p, 'r', { tip: (W) => shinPt(W), palm: [0, -1, 0], palmW: 0.3, elbow: 8, elbowW: 0.1, floor: 0.5, guess: ref, ref, protract: k.pro ?? 14 });
    delete q.__cost; return q;
  }
  for (const j in ARM_STAR.r) p.ch[j] = clone(ARM_STAR.r[j]);
  return p;
}
const KEYS = [
  { name: 'star', l5: 0, t12: 0, t6: 0, neck: null },
  { name: 'up', l5: 1, t12: 9, t6: 11, rot: 12, neck: 20, mix: 0.55, hipL: 35, kneeL: 45, abdL: 8, dorsiL: -15 },
  { name: 'reach', l5: 2.5, t12: 22, t6: 18, rot: +(process.env.ROT || 30), lat: 4, neck: 26, reach: true, hipL: 72, kneeL: 85, abdL: 0, dorsiL: -15 },
  { name: 'hold', l5: 3, t12: 23, t6: 18.5, rot: +(process.env.ROT || 30) + 1, lat: 4.5, neck: 26, reach: true, hipL: 74, kneeL: 86, abdL: 0, dorsiL: -15 },
  { name: 'down', l5: 0.5, t12: 5, t6: 6, rot: 8, neck: 14, mix: 0.45, hipL: 25, kneeL: 30, abdL: 12, dorsiL: -20 },
];
const poses = { star: key(KEYS[0]) };
let prev = null, REACH = null;
for (const i of [2, 3]) { const k = KEYS[i]; poses[k.name] = key(k, prev); prev = F6.armOf(poses[k.name], 'r'); }
REACH = F6.armOf(poses.reach, 'r');
for (const i of [1, 4]) poses[KEYS[i].name] = key(KEYS[i]);
for (const n of ['up', 'reach', 'hold', 'down']) poses[n + 'L'] = CB.mirror(poses[n]);
const rep1 = (t0, s) => [{ t: t0 + 0.4, pose: 'up' + s }, { t: t0 + 1.0, pose: 'reach' + s }, { t: t0 + 1.4, pose: 'hold' + s }, { t: t0 + 2.3, pose: 'down' + s }, { t: t0 + 2.8, pose: 'star' }];
const keyframes = [{ t: 0, pose: 'star' }, { t: 0.5, pose: 'star' }, ...rep1(0.5, ''), { t: 3.6, pose: 'star' }, ...rep1(3.6, 'L'), { t: 6.7, pose: 'star' }];
const ex = CA.buildModule(meta, poses, keyframes, []);
const hipPk = Math.max(...Object.values(poses).map((p) => Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex)));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hipPk) - 4, max: Math.ceil(hipPk) + 4 };

const tipShin = (W) => V.len(V.sub(W.handtip_r.p, shinPt(W)));
const rep = CA.scan(ex, { upper: (W) => CA.upperFromFloor(W), lowBack: (W) => CA.minOf(W, ['buttock_r', 'buttock_l', 'pelvis']), shinGap: (W) => Math.min(...['shank_l', 'thigh_l', 'quad_l'].map((id) => F6.gapTo(W, id, W.handtip_r.p))) });
rep.limits = rep.limits.concat(F6.limitViolations(poses)).filter((v, i, a) => a.indexOf(v) === i);
const Ws = L.fk(poses.star), Wt = L.fk(poses.hold), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.hold;
const rotOf = (p) => p.ch.spine_l5.rot + p.ch.spine_t12.rot + p.ch.spine_t6.rot;
kin[0].setup = d(CA.upperFromFloor(Ws)); kin[0].peak = `${d(CA.upperFromFloor(Wt))} (C7 up ${r1(Wt.neck_c7.p[1] - Ws.neck_c7.p[1])} cm)`;
kin[1].setup = 'Facing the ceiling'; kin[1].peak = `${d(Math.abs(rotOf(pk)))} toward the drawn-in knee (mostly thoracic)`;
kin[2].setup = `Legs straight, ${d(ABD)} apart each side, on the mat`; kin[2].peak = `Drawn-in leg: hip ${d(pk.ch.hip_l.flex)}, knee ${d(CA.kneeOf(Wt, 'l'))}; other leg still on the mat`;
kin[3].setup = `Arms overhead in a wide V (hands ${Math.round(V.len(V.sub(Ws.wrist_r.p, Ws.wrist_l.p)))} cm apart) on the mat`; kin[3].peak = `Reaching hand ${r1(tipShin(Wt))} cm from the front of the opposite shin; other arm stays on the mat`;
kin[4].setup = 'Star 0.5 s'; kin[4].peak = '1.0 s up and reach, 0.4 s touch, 1.4 s back to the star per side; 6.7 s loop';
console.log(`Starfish crunch beginner: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} measure=${JSON.stringify(ex.checks.measure)}`);
for (const n of ['star', 'up', 'reach', 'hold', 'down']) { const p = poses[n], W = L.fk(p); console.log(`  ${n.padEnd(6)} upper=${CA.upperFromFloor(W).toFixed(1)} tipShin=${tipShin(W).toFixed(1)} R=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} elb=${p.ch.elbow_r.flex} sc=${JSON.stringify(p.ch.sc_r)} wristY=${W.wrist_r.p[1].toFixed(1)}/${W.wrist_l.p[1].toFixed(1)}`); }
M.guard('starfish-crunch-beginner', ex, rep, [tipShin(Wt) > 4 && `hand ${r1(tipShin(Wt))} cm from the shin`, rep.lowBack[1] - rep.lowBack[0] > 1.5 && 'low back lifts']);
