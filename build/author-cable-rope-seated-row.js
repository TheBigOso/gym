// Cable Rope Seated Row (GymVisual 12474, Cable Rope Seated Row; movement reference only, page not readable): seated on a
// box facing a low pulley, feet braced on a box foot plate (soles on its near face, knees bent about 25 degrees, planted
// leg contacts). A rope (cable attachment 'rope', two hands, neutral thumbs-up grip, 24 cm between the grip points) runs
// to the pulley just above the plate. From a full reach (arms long, shoulder blades forward, trunk about 15 degrees
// forward of upright) the trunk comes upright as the rope is rowed to the stomach with the elbows close to the sides and
// the shoulder blades drawn back; then the arms reach forward again. Bilateral (right arm solved, left mirrored).
// Tempo: 1.2 s pull, 0.4 s squeeze, 2 s return, 0.5 s stretch.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const meta = require('./meta/cable-rope-seated-row.json');

const ID = 'cable-rope-seated-row';
const LEAN0 = 15, LEAN1 = -3, HALF = 12, REACH = L.reach(20) + 7;
const base = B.seatedBox({ toeUp: 90, dorsi: 28, knee: 25 });
const plate = base.plate, top = plate.size[1];
const ANCHOR = [r1(plate.center[0] + plate.size[0] / 2 + 6), r1(top + 5), 0];
const trunkAt = (f, k) => {
  const lean = LEAN0 + (LEAN1 - LEAN0) * k, p = B.leanTo(base, lean);
  p.ch.sc_r = { protract: r1(10 - 22 * k), elevate: r1(1 - 3 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: r1(-0.6 * lean) }; p.ch.head_c1 = { rot: 0, flex: r1(-0.3 * lean) };
  return p;
};
// grip targets: reach = REACH cm from the shoulder toward the pulley; finish = 5 cm in front of the stomach
const W0 = L.fk(trunkAt(0, 0), base.contacts), W1 = L.fk(trunkAt(1, 1), base.contacts);
const S0 = W0.shoulder_r.p, toA = V.norm([ANCHOR[0] - S0[0], ANCHOR[1] - S0[1], 0]);
const G0 = V.add([S0[0], S0[1], HALF], V.scale(toA, Math.sqrt(REACH * REACH - (S0[2] - HALF) ** 2)));
const G1 = [r1(B.extreme(W1, 'abdomen', [1, 0, 0])[0] + 5), r1(W1.shoulder_r.p[1] - 27), HALF];
// elbow direction hints: reach = along the arm toward the grip; finish = back and a little out (shoulder plane -55,
// elevation 35: the rig's plane limit is -60)
const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(-55, 35);
const { poses, err, names } = B.pullKeys({
  contacts: base.contacts, trunkAt, guess: { plane: 85, elev: 75, axial: -100, pron: 105, flex: 20 },
  gripAt: (f, k) => { const g = B.lerpV(G0, G1, k); g[2] = HALF; return g; },
  elbowAt: (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA)), wElbowAt: (k) => 0.3 + 0.9 * k,
  palmAt: () => [0, 0, -1], axis: [0, 1, 0],
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.seat, plate, EQ.cableTower(ANCHOR, { offset: [6, -40] }), { id: 'rope', kind: 'cable', attachment: 'rope', anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, jumps, grip width, cable line clear of the body and over the foot plate, rope strands clear,
// hands clear of the stomach and thighs, thighs on (not into) the seat
const knot = (W) => EQ.attachPoint(W, { two: true, rope: true, anchor: ANCHOR });
const rep = C.scan(ex, { line: (W) => [ANCHOR, knot(W)] });
let plateClr = 1e9, ropeClr = { d: 1e9 }, handClr = { d: 1e9 }, seatLow = 1e9;
H.loopReport(ex, { probe: (W, pz, t) => {
  plateClr = Math.min(plateClr, B.segBox(ANCHOR, knot(W), plate));
  const rc = B.ropeClear(W, ANCHOR); if (rc.d < ropeClr.d) ropeClr = { d: +rc.d.toFixed(2), id: rc.id, t: +t.toFixed(2) };
  for (const s of ['r', 'l']) { const gp = EQ.gripPoint(W, s).p; for (const id of ['abdomen', 'pelvis', 'ribcage', 'thigh_r', 'thigh_l', 'quad_r', 'quad_l']) { const d = EQ.pointShape(W, gp, id) - 3; if (d < handClr.d) handClr = { d: +d.toFixed(2), id, t: +t.toFixed(2) }; } }
  seatLow = Math.min(seatLow, B.thighOnSeat(W, base.seat));
} });
C.gate(ID, rep, { minLine: 1 });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (plateClr < 1) fail(`cable into the foot plate ${plateClr.toFixed(2)}`);
if (ropeClr.d < 0) fail(`rope into the body ${JSON.stringify(ropeClr)}`);
if (handClr.d < 0) fail(`hands into the body ${JSON.stringify(handClr)}`);
if (seatLow < -1.5) fail(`thighs into the seat ${seatLow.toFixed(2)}`);
if (rep.dorsiR[1] > 35 || rep.kneeR[1] > 150) fail(`leg limits ${rep.dorsiR} ${rep.kneeR}`);

const Wr = L.fk(poses.start, base.contacts), Wf = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const trunk = B.trunkDeg;
const shExt = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p), tr = V.sub(W.neck_c7.p, W.pelvis.p); return 180 - V.angle(u, tr); };
set('Trunk lean', 'setup', `${d(trunk(Wr))} forward of upright at the reach`); set('Trunk lean', 'peak', `${d(trunk(Wf))} (upright) at the finish`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wr))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wf))}`);
set('Shoulder extension', 'setup', `Upper arm ${d(shExt(Wr))} from the trunk line, in front`); set('Shoulder extension', 'peak', `Elbows ${Math.round(Wf.shoulder_r.p[0] - Wf.elbow_r.p[0])} cm behind the shoulders`);
set('Shoulder blades', 'setup', 'Protracted (reaching forward)'); set('Shoulder blades', 'peak', 'Retracted (drawn together)');
set('Grip', 'setup', `Neutral on the rope ends, ${Math.round(EQ.barAt(Wr).width)} cm apart`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Tempo', 'setup', 'Stretch 0.5 s at full reach'); set('Tempo', 'peak', '1.2 s pull, 0.4 s squeeze, 2 s return');
console.log(`Cable Rope Seated Row: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  anchor ${ANCHOR} plate ${JSON.stringify(plate)} seat ${JSON.stringify(base.seat)} G0 ${G0.map(r1)} G1 ${G1}\n  ${JSON.stringify(rep)}\n  plate ${plateClr.toFixed(2)} rope ${JSON.stringify(ropeClr)} hands ${JSON.stringify(handClr)} seat ${seatLow.toFixed(2)}`);
