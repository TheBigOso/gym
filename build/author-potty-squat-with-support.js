// Potty Squat with Support (GymVisual #17611; page not readable here, movement from the name: the deep "toilet" squat
// holding a fixed support in front). Facing a pair of squat-stand uprights, both hands grip them from the outside (palms
// in, thumbs up) at about 95 cm; feet a little wider than the shoulders, toes out 25 degrees, heels down. The support
// lets the hips sit further back and the trunk stay more upright: 2 s down to a deep squat (knees about 125 degrees), short
// pause, about 1.2 s up. Feet and hands planted (constant IK targets; each key stores its own hand orientation as the
// hand turns about the upright). Squat family (squat.js) with the right-arm grip solve of
// author-dumbbell-supported-squat.js, mirrored to the left hand.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const F = require('./families/squat');
const S = require('./families/single');
const H = require('./families/hips');
const EQ = require('./families/equip');
const meta = require('./meta/potty-squat-with-support.json');

const STANCE = 21, TOE = 25;
const HAND = [+(process.env.HX ?? 26), +(process.env.HY ?? 95), +(process.env.HZ ?? 29)]; // right wrist on the right upright (just outside it)
const HAND_L = [HAND[0], HAND[1], -HAND[2]];
const GRIP = Q.fromBasis([0, 0, -1], [-1, 0, 0], [0, 1, 0]); // palm toward the upright (-Z, inward), fingers forward, thumb up
const armR = Object.assign(L.handContact('r'), { label: 'Right hand (upright)', pole: [-0.3, -1, 0.4], handRot: H.qArr(GRIP) });
const armL = Object.assign(L.handContact('l'), { label: 'Left hand (upright)', pole: [-0.3, -1, -0.4], handRot: H.qArr(Q.mirrorZ(GRIP)) });
const GUESS = [{ shoulder_r: { plane: 80, elev: 50, axial: 0 }, elbow_r: { flex: 25 }, wrist_r: { pron: 0, flex: 0, dev: 0 } }, { shoulder_r: { plane: 70, elev: 70, axial: 40 }, elbow_r: { flex: 30 }, wrist_r: { pron: -60, flex: 0, dev: 0 } }, { shoulder_r: { plane: 90, elev: 55, axial: -40 }, elbow_r: { flex: 30 }, wrist_r: { pron: 60, flex: 0, dev: 0 } }];
const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
let armCost = 0, prevArm = null;
function gripArms(p) {
  let best = null;
  for (const g of prevArm ? [prevArm, ...GUESS] : GUESS) {
    const q0 = clone(p); Object.assign(q0.ch, clone(g));
    const r = L.solvePose(q0, ARM, [(W) => V.sub(W.wrist_r.p, HAND).map((v) => v * 4), (W) => V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), [0, 0, -1]).map((v) => v * 3), (W) => [(Q.rot(W.wrist_r.q, [0, 0, 1])[1] - 1) * 0.5 * 1.5],
      (W, q) => [q.ch.wrist_r.flex * 0.03, q.ch.wrist_r.dev * 0.05, Math.max(0, Math.abs(q.ch.wrist_r.flex) - 60), Math.max(0, q.ch.wrist_r.dev - 30) + Math.max(0, -15 - q.ch.wrist_r.dev), Math.max(0, -q.ch.elbow_r.flex), Math.max(0, q.ch.elbow_r.flex - 140), Math.max(0, 5 - q.ch.shoulder_r.elev) * 5, Math.max(0, -55 - q.ch.shoulder_r.plane) * 5, Math.max(0, q.ch.shoulder_r.plane - 135) * 5, q.ch.shoulder_r.axial * 0.005, ...(prevArm ? [(q.ch.shoulder_r.plane - prevArm.shoulder_r.plane) * 0.01, (q.ch.shoulder_r.axial - prevArm.shoulder_r.axial) * 0.01, (q.ch.wrist_r.pron - prevArm.wrist_r.pron) * 0.01] : [])]], { iters: 500 });
    if (!best || r.cost < best.cost) best = r;
  }
  const q = best.pose; armCost = Math.max(armCost, best.cost);
  prevArm = { shoulder_r: q.ch.shoulder_r, elbow_r: q.ch.elbow_r, wrist_r: q.ch.wrist_r };
  for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  q.ch.sc_r = { protract: 6, elevate: 4 }; q.ch.sc_l = { protract: 6, elevate: 4 };
  const W = L.fk(q);
  q.ik = q.ik || {}; q.ik.arm_r = { target: HAND.slice(), weight: 1, handRot: H.qArr(W.wrist_r.q) }; q.ik.arm_l = { target: HAND_L.slice(), weight: 1, handRot: H.qArr(W.wrist_l.q) };
  return q;
}
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 125, pitchBottom: -22, backBottom: -27, kneeOut: 2,
  spine: { l5: -3, t12: -1, t6: 1 }, arms: 'none', armsFn: (p) => gripArms(p), lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.3, pose: 'bottom' }, { t: 3.9, pose: 'rise50' }, { t: 4.5, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
contacts.push(armR, armL);
poses.rise50 = clone(poses.l50);
// the bottomSettle key was re-fitted without the arm solve: give it the bottom's arms
for (const j of ['shoulder_r', 'elbow_r', 'wrist_r', 'shoulder_l', 'elbow_l', 'wrist_l', 'sc_r', 'sc_l']) poses.bottomSettle.ch[j] = clone(poses.bottom.ch[j]);
poses.bottomSettle.ik.arm_r = clone(poses.bottom.ik.arm_r); poses.bottomSettle.ik.arm_l = clone(poses.bottom.ik.arm_l);
// uprights: post centre 3.5 cm off the palm and 5 cm along the fingers from the wrist (standing key)
const Wg = L.fk(poses.stand, contacts), gp = V.add(V.add(Wg.wrist_r.p, V.scale(Q.rot(Wg.wrist_r.q, [1, 0, 0]), 3.5)), V.scale(Q.rot(Wg.wrist_r.q, [0, -1, 0]), 5));
const RW = r1(2 * gp[2]);
const rk = EQ.rack({ x: r1(gp[0]), z: 0, width: RW, hookY: 150, facing: 1 });
ex.props = [rk.prop];
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l', 'arm_r', 'arm_l'] });
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.stand, contacts), com = S.com(Wb);
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward (more upright than the free potty squat)`);
set('Support', 'setup', `Both hands on the uprights ${Math.round(HAND[1])} cm up, ${RW} cm apart`); set('Support', 'peak', `Hands stay put; arms reach forward as the hips sit back (centre of mass ${r1(com[0])} cm from the ankles)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.5 s pause, 1.2 s up, 1.5 s reset');
delete r.Wb; delete r.Wt;
console.log(`Potty Squat with Support: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  ${JSON.stringify(rep)} armCost ${armCost.toFixed(3)} rack ${JSON.stringify(rk.prop)} com ${r1(com[0])}`);
if (rep.slide > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (armCost > 1) { console.error('FAIL: hands cannot reach the uprights'); process.exitCode = 1; }
