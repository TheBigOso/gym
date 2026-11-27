// Cable High Row (GymVisual 16301, Cable High Row; movement reference only, page not readable): seated tall on a box
// facing a pulley set above head height, feet flat on the floor (planted leg contacts). A straight bar (cable attachment
// 'bar', 100 cm, overhand grip with 62 cm between the grip points) is rowed from the arms long, reaching up toward the
// pulley with the shoulder blades forward, to the upper chest with the elbows high (about shoulder height) and out to the
// sides, shoulder blades drawn together; then the arms reach back up. The trunk stays upright. Bilateral (right arm
// solved, left mirrored). Tempo: 1.2 s pull, 0.4 s squeeze, 2 s return, 0.5 s stretch.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const meta = require('./meta/cable-high-row.json');

const ID = 'cable-high-row';
const LEAN = 2, HALF = 31, BAR = 100, REACH = L.reach(15) + 7;
const base = B.seatedBox({ feet: 'floor', stance: 16, seatH: 46 });
const trunkAt = (f, k) => {
  const p = B.leanTo(base, LEAN - 4 * k);
  p.ch.sc_r = { protract: r1(12 - 26 * k), elevate: r1(10 - 12 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: -3 }; p.ch.head_c1 = { rot: 0, flex: -4 };
  return p;
};
const W0 = L.fk(trunkAt(0, 0), base.contacts), W1 = L.fk(trunkAt(1, 1), base.contacts), S0 = W0.shoulder_r.p, S1 = W1.shoulder_r.p;
const ANCHOR = [r1(S0[0] + 110), 185, 0];
const toA = V.norm([ANCHOR[0] - S0[0], ANCHOR[1] - S0[1], 0]);
const G0 = V.add([S0[0], S0[1], HALF], V.scale(toA, Math.sqrt(REACH * REACH - (HALF - S0[2]) ** 2)));
const G1 = [r1(B.extreme(W1, 'chest', [1, 0, 0])[0] + 6), r1(S1[1] - 5), HALF];
const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(-18, 84);
const gripAt = (f, k) => { const g = B.lerpV(G0, G1, k); g[2] = HALF; return g; };
const elbowAt = (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA));
// overhand: palm square to the forearm, facing down and forward
const palmAt = (f, k, W) => { const u = V.norm(V.sub(gripAt(f, k), elbowAt(f, k, W))), P = V.norm([0.3, -1, 0]); return V.norm(V.sub(P, V.scale(u, V.dot(u, P)))); };
const { poses, err, names } = B.pullKeys({
  contacts: base.contacts, trunkAt, guess: { plane: 75, elev: 115, axial: -40, pron: 170, flex: 12 },
  gripAt, elbowAt, wElbowAt: (k) => 0.3 + 0.7 * k, palmAt, axis: [0, 0, 1], wPalm: 2,
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.seat, EQ.cableTower(ANCHOR, { height: 200 }), { id: 'bar', kind: 'cable', attachment: 'bar', size: [BAR, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, jumps, grip width, the cable clear of the head, the bar clear of the body, thighs on the seat
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { two: true })] });
let barClr = { d: 1e9 }, seatLow = 1e9;
H.loopReport(ex, { probe: (W, pz, t) => {
  const b = EQ.barAt(W), c = EQ.segmentClear(W, V.add(b.c, V.scale(b.ax, BAR / 2)), V.sub(b.c, V.scale(b.ax, BAR / 2)), 1.5, { skip: /^(hand|thumb|forearm)_/ });
  if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  seatLow = Math.min(seatLow, B.thighOnSeat(W, base.seat));
} });
C.gate(ID, rep, { minLine: 1 });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (barClr.d < 0.5) fail(`bar into the body ${JSON.stringify(barClr)}`);
if (seatLow < -1.5) fail(`thighs into the seat ${seatLow.toFixed(2)}`);

const Ws = L.fk(poses.start, base.contacts), We = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Shoulder abduction', 'setup', `Upper arm ${d(B.armTrunk(Ws))} from the trunk, reaching up toward the pulley`); set('Shoulder abduction', 'peak', `${d(B.armTrunk(We))} from the trunk (elbow ${Math.round(We.elbow_r.p[1] - We.shoulder_r.p[1])} cm from shoulder height, ${Math.round(We.shoulder_r.p[0] - We.elbow_r.p[0])} cm behind)`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Ws))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(We))}`);
set('Shoulder blades', 'setup', 'Protracted, slightly raised (reaching)'); set('Shoulder blades', 'peak', 'Retracted, shoulders down');
set('Grip', 'setup', `Overhand, ${Math.round(EQ.barAt(Ws).width)} cm between the hands on a ${BAR} cm bar`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Trunk', 'setup', `${d(Math.abs(B.trunkDeg(Ws)))} from upright, seated tall`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Stretch 0.5 s with the arms long'); set('Tempo', 'peak', '1.2 s pull, 0.4 s squeeze, 2 s return');
console.log(`Cable High Row: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  G0 ${G0.map(r1)} G1 ${G1} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  bar ${JSON.stringify(barClr)} seat ${seatLow.toFixed(2)}`);
