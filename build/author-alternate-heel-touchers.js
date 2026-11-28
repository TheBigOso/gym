// Alternate Heel Touchers (GymVisual 8092, movement reference only; page not readable at authoring time). Supine on a
// mat, knees bent with the feet flat about hip width (planted leg contacts), arms long by the sides. The head and
// shoulders curl a little off the mat and the hands float just above it; the trunk then side-bends to the right so the
// right hand slides toward the right heel, passes through the centre and side-bends to the left. Two reaches per side,
// then the shoulders lower. Pelvis and feet stay still. Bilateral, alternating.
// The left arm is solved on the mirrored pose (spine side bend flipped) with lib armToTarget, then copied to the left.
const L = require('./lib');
const { V, r1, clone } = L;
const C = require('./families/core-a');
const meta = require('./meta/alternate-heel-touchers.json');

const KNEE = 110;
const B = C.lie({ kneeFlex: 90, headRest: 'floor' });
const FP = C.plantFeet(B.pose, KNEE), contacts = FP.contacts, lie = FP.pose;
const NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const W0 = L.fk(lie, contacts);
const SPL = { spine_l5: 0.3, spine_t12: 0.4, spine_t6: 0.3 };
// mirror a pose left-right (spine/neck side bend and rotation flipped, limbs swapped)
function mirror(p) {
  const q = clone(p);
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6', 'neck_c7', 'head_c1']) if (q.ch[j]) { if (q.ch[j].latFlex != null) q.ch[j].latFlex = -q.ch[j].latFlex; if (q.ch[j].rot != null) q.ch[j].rot = -q.ch[j].rot; }
  for (const j of ['shoulder', 'elbow', 'wrist', 'sc', 'hip', 'knee', 'ankle']) { const a = p.ch[`${j}_r`], b = p.ch[`${j}_l`]; if (a) q.ch[`${j}_l`] = clone(a); if (b) q.ch[`${j}_r`] = clone(b); }
  delete q.ik; return q;
}
// wrist aim: point (x, y, z) in world for the right arm; elbow nearly straight
const aimR = (p, tgt, guess) => L.armToTarget(p, tgt, { flex: 8, wrist: { pron: 70, flex: 0, dev: 0 }, axial: 0, guess: guess || [20, 40, 0] });
function key({ lat = 0, curl = 1, reach = null, neck = 26, handY = 8 }) {
  const p = C.spine(clone(lie), lie, { l5: 2 * curl, t12: 16 * curl, t6: 12 * curl });
  for (const j in SPL) p.ch[j].latFlex = r1(lat * SPL[j]);
  C.neck(p, curl ? neck : NECK0);
  p.ch.neck_c7.rot = 0; p.ch.head_c1.rot = 0;
  // arms: the reaching side aims at a point beside its heel; the other arm points along the body toward the feet
  const sideT = (s, toward) => { const A = W0[`ankle_${s}`].p, H = W0[`hip_${s}`].p, z = (s === 'r' ? 1 : -1); return toward ? [A[0] - 6, handY, A[2] * z * z + 14 * z] : [H[0] + 10, handY + 2, H[2] + 14 * z]; };
  const scR = { protract: reach === 'r' ? 12 : 6, elevate: 4 }, scL = { protract: reach === 'l' ? 12 : 6, elevate: 4 };
  p.ch.sc_r = scR; p.ch.sc_l = scL;
  let q = aimR(p, sideT('r', reach === 'r'));
  const m = mirror(q); const tl = sideT('l', reach === 'l'); const ml = aimR(m, [tl[0], tl[1], -tl[2]]);
  for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(ml.ch[`${j}_r`]);
  q.ik = clone(lie.ik);
  return q;
}
const LAT = 24;
const restArms = (() => { const p = clone(lie); const q = C.plantHands(p, C.handTargets(p, { abd: 12, wristY: 2.8 }), C.handContacts()); delete q.ik.arm_r; delete q.ik.arm_l; q.ik = clone(lie.ik); return q; })();
const poses = { rest: restArms, curl: key({}), right: key({ lat: LAT, reach: 'r' }), left: key({ lat: -LAT, reach: 'l' }), midR: key({ lat: 6 }), midL: key({ lat: -6 }) };
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.6, pose: 'rest' }, { t: 1.2, pose: 'curl' }, { t: 1.8, pose: 'right' }, { t: 2.0, pose: 'right' }, { t: 2.6, pose: 'midR' }, { t: 3.0, pose: 'left' }, { t: 3.2, pose: 'left' },
  { t: 3.8, pose: 'midL' }, { t: 4.2, pose: 'right' }, { t: 4.4, pose: 'right' }, { t: 5.0, pose: 'midR' }, { t: 5.4, pose: 'left' }, { t: 5.6, pose: 'left' }, { t: 6.3, pose: 'rest' }, { t: 7.0, pose: 'rest' }];
const ex = C.buildModule(meta, poses, keyframes, contacts);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(lie.ch.hip_r.flex - 4), max: Math.ceil(lie.ch.hip_r.flex + 4) };
const tipToHeel = (W, s) => V.len(V.sub(W[`handtip_${s}`].p, W[`ankle_${s}`].p));
const rep = C.scan(ex, { handR: (W) => C.minOf(W, C.ARM_IDS('r')), handL: (W) => C.minOf(W, C.ARM_IDS('l')), shoulderLift: (W) => W.shoulder_r.p[1] - W0.shoulder_r.p[1] });
// arms must clear the thighs and the mat while reaching (except at rest)
const tl = L.R.buildTimeline(ex); let armMin = 1e9;
for (let t = 1.2; t <= 5.6; t += 0.01) { const W = L.R.evalPose(L.rig, tl.pose(t), contacts); armMin = Math.min(armMin, C.minOf(W, ['hand_r', 'hand_l', 'forearm_r', 'forearm_l'])); }
const Wc = L.fk(poses.curl, contacts), Wr = L.fk(poses.right, contacts), set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k[f] = v; }, d = (v) => `≈${Math.round(v)}°`;
set('Trunk lift', 'setup', 'Head and shoulders on the mat'); set('Trunk lift', 'peak', `Shoulders ${r1(Wc.shoulder_r.p[1] - W0.shoulder_r.p[1])} cm up, upper trunk ${d(C.upperFromFloor(Wc))} from the floor`);
set('Lateral flexion', 'setup', '0°'); set('Lateral flexion', 'peak', `${LAT}° each way (sum of the lumbar and thoracic segments)`);
set('Hand reach', 'setup', 'Arms long by the sides'); set('Hand reach', 'peak', `Fingertips ${Math.round(tipToHeel(Wr, 'r'))} cm from the heel at full reach (hands about ${Math.round(armMin)} cm off the mat)`);
set('Hips and knees', 'setup', `Knees ${d(C.kneeOf(W0, 'r'))}, feet planted`); set('Hips and knees', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Rest 0.6 s, curl 0.6 s'); set('Tempo', 'peak', 'About 1.2 s per side, two reaches each side');
console.log(`Alternate Heel Touchers: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} armMin ${armMin.toFixed(1)} tipToHeel ${tipToHeel(Wr, 'r').toFixed(1)} handYright ${L.r1(Wr.wrist_r.p[1])}`);
C.guard('alternate-heel-touchers', rep, [armMin < 0.5 && `arm touches the mat while reaching (${armMin.toFixed(1)})`]);
