// Dumbbell Supported Squat (GymVisual #14594; page not readable here, movement from the name, read as a squat with one
// hand holding a fixed support for balance): feet about shoulder width, toes out 15 degrees, both feet planted. The left
// hand grips a rack upright beside the body at about hip height (planted hand contact, constant target); the right arm
// hangs with a dumbbell at the side (neutral grip). 2 s down to thighs about parallel with the trunk fairly upright, short
// pause, 1.2 s up. Authored with the dumbbell in the right hand (the player mirrors). Squat family (squat.js author) with a
// per-key left-arm solve onto the support and the batch 3 hanging-arm helper (b3-legs.js armsHang).
const L = require('./lib');
const { V, Q, r1, clone } = L;
const F = require('./families/squat');
const B = require('./families/b3-legs');
const H = require('./families/hips');
const EQ = require('./families/equip');
const meta = require('./meta/dumbbell-supported-squat.json');

const STANCE = 19.5, TOE = 15;
const HAND = [+(process.env.HX ?? 34), +(process.env.HY ?? 104), +(process.env.HZ ?? -26)]; // left wrist on the upright: in front of the left hip, about hip height
const GRIP = Q.fromBasis([0, 0, -1], [-1, 0, 0], [0, 1, 0]); // palm toward the upright (-Z), fingers forward, thumb up
const armC = Object.assign(L.handContact('l'), { label: 'Left hand (rack upright)', pole: [-0.3, -1, -0.4], handRot: H.qArr(GRIP) });
const GUESS = [{ shoulder_l: { plane: 80, elev: 40, axial: 0 }, elbow_l: { flex: 20 }, wrist_l: { pron: 0, flex: 0, dev: 0 } }, { shoulder_l: { plane: 70, elev: 50, axial: -40 }, elbow_l: { flex: 30 }, wrist_l: { pron: 60, flex: 0, dev: 0 } }, { shoulder_l: { plane: 90, elev: 45, axial: 40 }, elbow_l: { flex: 30 }, wrist_l: { pron: -60, flex: 0, dev: 0 } }];
let armCost = 0, prevArm = null;
// left arm onto the upright: wrist at HAND, palm toward the upright (-Z), thumb up (soft), wrist near neutral; the hand
// turns about the upright as the body lowers, so each key stores its own hand orientation (ik handRot)
const ARM_L = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron', 'ch.wrist_l.flex', 'ch.wrist_l.dev'];
function gripArm(p) {
  let best = null;
  for (const g of prevArm ? [prevArm, ...GUESS] : GUESS) {
    const q0 = clone(p); Object.assign(q0.ch, clone(g));
    const r = L.solvePose(q0, ARM_L, [(W) => V.sub(W.wrist_l.p, HAND).map((v) => v * 4), (W) => V.sub(Q.rot(W.wrist_l.q, [1, 0, 0]), [0, 0, 1]).map((v) => v * 3), (W) => [(Q.rot(W.wrist_l.q, [0, 0, 1])[1] + 1) * 0.5 * 1.5],
      (W, q) => [q.ch.wrist_l.flex * 0.03, q.ch.wrist_l.dev * 0.05, Math.max(0, Math.abs(q.ch.wrist_l.flex) - 60), Math.max(0, q.ch.wrist_l.dev - 30) + Math.max(0, -15 - q.ch.wrist_l.dev), Math.max(0, -q.ch.elbow_l.flex), Math.max(0, q.ch.elbow_l.flex - 140), Math.max(0, 5 - q.ch.shoulder_l.elev) * 5, Math.max(0, -55 - q.ch.shoulder_l.plane) * 5, Math.max(0, q.ch.shoulder_l.plane - 135) * 5, q.ch.shoulder_l.axial * 0.005, ...(prevArm ? [(q.ch.shoulder_l.plane - prevArm.shoulder_l.plane) * 0.01, (q.ch.shoulder_l.axial - prevArm.shoulder_l.axial) * 0.01, (q.ch.wrist_l.pron - prevArm.wrist_l.pron) * 0.01] : [])]], { iters: 500 });
    if (!best || r.cost < best.cost) best = r;
  }
  const q = best.pose; armCost = Math.max(armCost, best.cost);
  prevArm = { shoulder_l: q.ch.shoulder_l, elbow_l: q.ch.elbow_l, wrist_l: q.ch.wrist_l };
  const W = L.fk(q);
  q.ik = q.ik || {}; q.ik.arm_l = { target: HAND.slice(), weight: 1, handRot: H.qArr(W.wrist_l.q) };
  if (process.env.DBG) console.log('cost', best.cost.toFixed(3), 'err', V.len(V.sub(W.wrist_l.p, HAND)).toFixed(2), JSON.stringify(q.ch.shoulder_l), JSON.stringify(q.ch.elbow_l), JSON.stringify(q.ch.wrist_l));
  return q;
}
const OUT = JSON.parse(process.env.OUT || '[10,24]');
const armsFn = (p, f) => {
  let q = B.armsHang(p, { out: OUT[0] + (OUT[1] - OUT[0]) * f }); delete q.__armCost;
  q = gripArm(q);
  q.ch.sc_l = { protract: 4, elevate: 4 };
  return q;
};
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 110, pitchBottom: -28, backBottom: -16, kneeOut: 1.5,
  spine: { l5: -4, t12: -3, t6: 1 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
contacts.push(armC);
poses.rise50 = clone(poses.l50); // same depth: identical arm solution on the way up
// rack upright in the hand: the post centre 3.5 cm off the palm and 5 cm along the fingers from the wrist (standing key)
const Wg = L.fk(poses.stand, contacts), gp = V.add(V.add(Wg.wrist_l.p, V.scale(Q.rot(Wg.wrist_l.q, [1, 0, 0]), 3.5)), V.scale(Q.rot(Wg.wrist_l.q, [0, -1, 0]), 5));
const post = [r1(gp[0]), r1(gp[2])], RW = 110;
const rk = EQ.rack({ x: post[0], z: r1(post[1] - RW / 2), width: RW, hookY: 140 });
ex.props = [rk.prop, B.heldProp('r')];
for (const k in poses) delete poses[k].__armCost;
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l', 'arm_l'] });
const db = B.dbLoop(ex, [{ side: 'r', grip: 'handle' }], ['thigh', 'quad', 'pelvis', 'buttock', 'calf', 'shank']);
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.stand, contacts);
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Support', 'setup', `Left hand on a rack upright ${Math.round(HAND[1])} cm up, in front of the left hip`); set('Support', 'peak', 'Hand stays put; elbow straightens and bends as the body moves');
set('Dumbbell', 'setup', 'Hanging at the right side, neutral grip'); set('Dumbbell', 'peak', `Clear of the thigh (≥${db.dbClear} cm on the rig shapes), ${r1(db.dbFloor)} cm above the floor at the lowest`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Supported Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  ${JSON.stringify(rep)} ${JSON.stringify(db)} armCost ${armCost.toFixed(3)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (db.dbFloor < 0 || db.dbClear < -0.5) { console.error('FAIL: dumbbell passes through the body or the floor'); process.exitCode = 1; }
