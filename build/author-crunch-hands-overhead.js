// Crunch with the hands overhead (GymVisual #026712, Crunch (hands overhead)). Bilateral: supine on a mat, knees bent
// about 90 degrees with the feet flat (planted), arms straight overhead beside the ears, hands close together. Curl the
// head, shoulders and shoulder blades off the mat while the arms stay in line with the upper trunk (the long lever makes
// it harder than a crunch with the hands behind the head), squeeze, then lower: shoulder blades first, head last.
const L = require('./lib');
const { r1, clone } = L;
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const meta = require('./meta/crunch-hands-overhead.json');

const ANG = +(process.env.ANG || -12), WIDTH = 14;
const lie0 = M.lie({ kneeFlex: 90, headRest: 'floor' });
const F = CA.plantFeet(lie0, 90);
const lie = F.pose, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
let ARM = null;
function curl(k) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  CA.neck(p, k.neck == null ? NECK0 : k.neck);
  const out = M.overheadArms(p, { ang: k.ang ?? ANG, width: WIDTH, guess: ARM });
  if (!ARM) ARM = M.armOf(out);
  delete out.__cost;
  return out;
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null },
  { name: 'peel', l5: 0.5, t12: 7, t6: 10, neck: 22 },
  { name: 'top', l5: 2, t12: 20, t6: 16, neck: 26 },
  { name: 'topHold', l5: 2.5, t12: 21, t6: 16.5, neck: 26 },
  { name: 'down', l5: 0.5, t12: 4, t6: 6, neck: 18 },
  { name: 'touch', l5: 0, t12: 1, t6: 2, neck: NECK0 + 4 },
];
curl(KEYS[2]); // seed the arm branch at the top
const poses = {};
for (const k of KEYS) poses[k.name] = curl(k);
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.2, pose: 'peel' }, { t: 1.8, pose: 'top' }, { t: 2.3, pose: 'topHold' }, { t: 3.3, pose: 'down' }, { t: 3.9, pose: 'touch' }, { t: 4.4, pose: 'lie' }, { t: 5.0, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, F.contacts);

const elbowOf = (W) => CA.kneeOf({ hip_r: W.shoulder_r, knee_r: W.elbow_r, ankle_r: W.wrist_r }, 'r');
const armToTrunk = (W) => L.V.angle(L.V.sub(W.wrist_r.p, W.shoulder_r.p), L.V.sub(W.neck_c7.p, W.spine_t12.p));
const rep = CA.scan(ex, { upper: (W) => CA.upperFromFloor(W), lowBack: (W) => CA.minOf(W, ['buttock_r', 'pelvis']), hand: (W) => Math.min(W.wrist_r.p[1], W.wrist_l.p[1]), arm: armToTrunk });
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.topHold, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.topHold;
kin[0].setup = d(CA.upperFromFloor(Wl)); kin[0].peak = `${d(CA.upperFromFloor(Wt))} (C7 up ${r1(Wt.neck_c7.p[1] - Wl.neck_c7.p[1])} cm)`;
kin[1].setup = d(lie.ch.spine_l5.flex) + ' (slight lordosis)'; kin[1].peak = `${d(pk.ch.spine_l5.flex)} (low back stays on the mat)`;
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (+${Math.round(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex - lie.ch.spine_t12.flex - lie.ch.spine_t6.flex)}°)`;
kin[3].setup = `Shoulder elevation ${d(pk.ch.shoulder_r.elev)}, elbows ${d(elbowOf(Wl))}, arms ${d(armToTrunk(Wl))} off the trunk line`; kin[3].peak = `Unchanged relative to the trunk (hands rise ${r1(Wt.wrist_r.p[1] - Wl.wrist_r.p[1])} cm)`;
kin[4].setup = `Hip ${d(lie.ch.hip_r.flex)}, knee ${d(CA.kneeOf(Wl, 'r'))}`; kin[4].peak = 'Unchanged (pelvis and feet still)';
kin[5].setup = 'Rest 0.8 s'; kin[5].peak = '1.0 s up, 0.5 s squeeze, 1.6 s down, 1.1 s rest';
console.log(`Crunch hands overhead: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
for (const k of KEYS) { const p = poses[k.name], W = L.fk(p, F.contacts); console.log(`  ${k.name.padEnd(8)} spine=${p.ch.spine_l5.flex}/${p.ch.spine_t12.flex}/${p.ch.spine_t6.flex} neck=${p.ch.neck_c7.flex}+${p.ch.head_c1.flex} upper=${CA.upperFromFloor(W).toFixed(1)} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} wr=${p.ch.wrist_r.pron}/${p.ch.wrist_r.flex}/${p.ch.wrist_r.dev} handY=${W.wrist_r.p[1].toFixed(1)} gap=${L.V.len(L.V.sub(W.wrist_r.p, W.wrist_l.p)).toFixed(1)}`); }
M.guard('crunch-hands-overhead', ex, rep, [(CA.upperFromFloor(Wt) < 25 || CA.upperFromFloor(Wt) > 50) && 'upper-trunk curl outside 25-50 degrees']);
