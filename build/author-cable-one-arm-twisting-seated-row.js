// Cable One Arm Twisting Seated Row (GymVisual 4351, Cable one arm twisting seated row; movement reference only, page not
// readable): seated on a box facing a low pulley, feet braced on a box foot plate (planted leg contacts), hips square.
// The right hand holds a D-handle (cable attachment 'handle', neutral thumbs-up grip). At the reach the arm is long, the
// right shoulder blade forward and the chest turned to the left (upper-back rotation, trunk about 15 degrees forward of
// upright); the handle is rowed to the side of the stomach as the chest turns back past square to the right and the
// trunk comes upright, elbow close to the body and the shoulder blade drawn back. Left hand on the left hip. Authored
// right (the player mirrors it). Tempo: 1.3 s pull, 0.4 s squeeze, 2 s return, 0.5 s stretch.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const meta = require('./meta/cable-one-arm-twisting-seated-row.json');

const ID = 'cable-one-arm-twisting-seated-row';
const LEAN0 = 15, LEAN1 = -3, ROT0 = -30, ROT1 = 18, REACH = L.reach(20) + 7;
const base = B.seatedBox({ toeUp: 90, dorsi: 28, knee: 25 });
const plate = base.plate, top = plate.size[1];
const ANCHOR = [r1(plate.center[0] + plate.size[0] / 2 + 6), r1(top + 5), 6];
// trunk: lean from the hips, rotation split over the upper back (spine rot + = right shoulder back)
const trunkAt = (f, k) => {
  const lean = LEAN0 + (LEAN1 - LEAN0) * k, rot = ROT0 + (ROT1 - ROT0) * k;
  const p = B.leanTo(base, lean, { spine: { spine_l5: { rot: r1(rot * 0.1) }, spine_t12: { rot: r1(rot * 0.48) }, spine_t6: { rot: r1(rot * 0.42) } } });
  p.ch.sc_r = { protract: r1(15 - 29 * k), elevate: r1(2 - 4 * k) };
  p.ch.neck_c7 = { rot: r1(-rot * 0.55), flex: r1(-0.6 * lean) }; p.ch.head_c1 = { rot: r1(-rot * 0.4), flex: r1(-0.3 * lean) }; // eyes stay on the pulley
  return p;
};
const W0 = L.fk(trunkAt(0, 0), base.contacts), W1 = L.fk(trunkAt(1, 1), base.contacts);
const S0 = W0.shoulder_r.p, G0 = V.add(S0, V.scale(V.norm(V.sub(ANCHOR, S0)), REACH));
// finish: beside the stomach, 3 cm in front of the side of the waist
const G1 = [r1(B.extreme(W1, 'abdomen', [1, 0, 0])[0] - 4), r1(W1.shoulder_r.p[1] - 29), r1(B.extreme(W1, 'abdomen', [0, 0, 1])[2] + 5)];
const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(-58, 38);
const { poses, err, names } = B.pullKeys({
  contacts: base.contacts, trunkAt, mirror: false, guess: { plane: 85, elev: 75, axial: -100, pron: 105, flex: 20 },
  gripAt: (f, k) => B.lerpV(G0, G1, k),
  elbowAt: (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA)), wElbowAt: (k) => 0.3 + 0.9 * k,
  palmAt: () => [0, 0, -1], axis: [0, 1, 0],
  post: (q) => B.leftHandOnHip(q),
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.seat, plate, EQ.cableTower(ANCHOR, { offset: [6, -40] }), { id: 'handle', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } }];

// loop checks: feet, floor, jumps, the cable clear of the body (only the right hand / forearm skipped) and over the plate,
// the handle clear of the body, the left hand on the hip, thighs on the seat
const SKIP_R = /^(hand|thumb|forearm)_r$/;
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { side: 'r' })], lineSkip: SKIP_R });
let plateClr = 1e9, handClr = { d: 1e9 }, seatLow = 1e9, hipHand = [1e9, -1e9];
H.loopReport(ex, { probe: (W, pz, t) => {
  const gp = EQ.gripPoint(W, 'r').p;
  plateClr = Math.min(plateClr, B.segBox(ANCHOR, gp, plate));
  for (const id of ['abdomen', 'pelvis', 'ribcage', 'thigh_r', 'thigh_l', 'quad_r', 'quad_l', 'buttock_r']) { const d = EQ.pointShape(W, gp, id) - 3; if (d < handClr.d) handClr = { d: +d.toFixed(2), id, t: +t.toFixed(2) }; }
  seatLow = Math.min(seatLow, B.thighOnSeat(W, base.seat));
  const hd = EQ.pointShape(W, W.wrist_l.p, 'pelvis'); hipHand = [Math.min(hipHand[0], hd), Math.max(hipHand[1], hd)];
} });
C.gate(ID, rep, { minLine: 1, checkWidth: false });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (plateClr < 1) fail(`cable into the foot plate ${plateClr.toFixed(2)}`);
if (handClr.d < 0) fail(`handle into the body ${JSON.stringify(handClr)}`);
if (seatLow < -1.5) fail(`thighs into the seat ${seatLow.toFixed(2)}`);
if (rep.dorsiR[1] > 35) fail(`ankle ${rep.dorsiR}`);

const Wr = L.fk(poses.start, base.contacts), Wf = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const chestYaw = (W) => Math.atan2(W.shoulder_r.p[0] - W.shoulder_l.p[0], W.shoulder_r.p[2] - W.shoulder_l.p[2]) / Math.PI * 180; // + = right shoulder forward
set('Trunk rotation', 'setup', `Shoulder line turned ${d(chestYaw(Wr))} to the left (right shoulder forward); hips square`); set('Trunk rotation', 'peak', `Turned ${d(-chestYaw(Wf))} to the right (right shoulder back)`);
set('Trunk lean', 'setup', `${d(B.trunkDeg(Wr))} forward of upright`); set('Trunk lean', 'peak', `${d(B.trunkDeg(Wf))} (upright)`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wr))} (arm long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wf))}`);
set('Shoulder blade', 'setup', 'Protracted, reaching forward'); set('Shoulder blade', 'peak', 'Retracted');
set('Tempo', 'setup', 'Stretch 0.5 s at full reach'); set('Tempo', 'peak', '1.3 s pull, 0.4 s squeeze, 2 s return');
console.log(`Cable One Arm Twisting Seated Row: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  anchor ${ANCHOR} G0 ${G0.map(r1)} G1 ${G1} yaw ${chestYaw(Wr).toFixed(1)} ${chestYaw(Wf).toFixed(1)}\n  ${JSON.stringify(rep)}\n  plate ${plateClr.toFixed(2)} handle ${JSON.stringify(handClr)} seat ${seatLow.toFixed(2)} leftHandToPelvis ${hipHand.map((v) => v.toFixed(1))}`);
