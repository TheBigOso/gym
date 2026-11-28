// Cable Neutral Grip Wide Pulldown (GymVisual 14014, Cable Neutral Grip Wide Pulldown, version 2; movement reference only,
// page not readable): seated on a box under a high pulley, feet flat on the floor (planted leg contacts). A wide
// neutral-grip lat bar (parallel handles, palms facing each other, 60 cm between the grip points) hangs from the pulley.
// The schema has no parallel-handle bar, so it is drawn as two D-handles on the same pulley, held at a constant width
// (the grip points stay 60 cm apart all through the loop, as on the rigid bar). From the arms long overhead (shoulders
// lifted) the shoulder blades draw down and the handles come down in front of the face to beside the upper chest, the
// elbows travelling down a little in front of the trunk, while the trunk leans back from about 4 to 12 degrees; then the
// handles rise under control. Bilateral (right arm solved, left mirrored). Built like author-cable-bar-lateral-pulldown.js.
// Tempo: 1.2 s down, 0.4 s at the chest, 2 s up, 0.5 s stretch.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const meta = require('./meta/cable-neutral-grip-wide-pulldown.json');

const ID = 'cable-neutral-grip-wide-pulldown';
const LEAN0 = -4, LEAN1 = -12, HALF = 30, TOPFLEX = 10;
const base = B.seatedBox({ feet: 'floor', stance: 16, seatH: 46 });
const trunkAt = (f, k) => {
  const lean = LEAN0 + (LEAN1 - LEAN0) * k, p = B.leanTo(base, lean, { spine: { spine_t6: { flex: r1(2 - 6 * k) } } });
  p.ch.sc_r = { protract: r1(4 - 10 * k), elevate: r1(16 - 22 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: r1(-0.5 * lean) }; p.ch.head_c1 = { rot: 0, flex: r1(-4 - 0.3 * lean) };
  return p;
};
const W0 = L.fk(trunkAt(0, 0), base.contacts), W1 = L.fk(trunkAt(1, 1), base.contacts), S0 = W0.shoulder_r.p, S1 = W1.shoulder_r.p;
const R0 = L.reach(TOPFLEX) + 5;
const G0 = [r1(S0[0] + 5), r1(S0[1] + Math.sqrt(R0 * R0 - 25 - (HALF - S0[2]) ** 2)), HALF];
const G1 = [r1(B.extreme(W1, 'chest', [1, 0, 0])[0] + 4), r1(S1[1] + 2), HALF];
const D0 = B.armDir(30, 160), D1 = B.armDir(35, 30);
const gripAt = (f, k) => { const g = B.lerpV(G0, G1, k); g[0] += 7 * Math.sin(Math.PI * k); g[2] = HALF; return g; };
const elbowAt = (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA));
const { poses, err, names } = B.pullKeys({
  contacts: base.contacts, trunkAt, guess: { plane: 30, elev: 160, axial: 0, pron: 0, flex: TOPFLEX },
  gripAt, elbowAt, wElbowAt: () => 0.3, palmAt: () => [0, 0, -1], axis: [1, 0, 0], wPalm: 2, N: 16,
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
const ANCHOR = [r1(G0[0] + 2), 238, 0];
ex.props = [base.seat, EQ.cableTower(ANCHOR, { offset: [-45, 0], height: 248 }),
  { id: 'handle_r', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } },
  { id: 'handle_l', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_l' } }];

// loop checks: feet, floor, jumps, constant grip width, both cables clear of the head and body, handles clear, thighs
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.gripPoint(W, 'r').p] });
let hClr = { d: 1e9 }, seatLow = 1e9;
H.loopReport(ex, { probe: (W, pz, t) => {
  const c = EQ.segmentClear(W, EQ.gripPoint(W, 'r').p, EQ.gripPoint(W, 'r').p, 3, { skip: /^(hand|thumb|forearm)_/ });
  if (c.d < hClr.d) hClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  seatLow = Math.min(seatLow, B.thighOnSeat(W, base.seat));
} });
C.gate(ID, rep, { minLine: 1 });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (hClr.d < 0.5) fail(`handle into the body ${JSON.stringify(hClr)}`);
if (seatLow < -1.5) fail(`thighs into the seat ${seatLow.toFixed(2)}`);

const Wt = L.fk(poses.start, base.contacts), Wb = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Grip', 'setup', `Neutral (palms facing), ${Math.round(EQ.barAt(Wt).width)} cm between the hands (shoulders ${Math.round(Wt.shoulder_r.p[2] - Wt.shoulder_l.p[2])} cm apart)`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} (hands at the upper chest)`);
set('Shoulder elevation', 'setup', `${d(B.armTrunk(Wt))} from the trunk (overhead)`); set('Shoulder elevation', 'peak', `${d(B.armTrunk(Wb))}`);
set('Trunk lean', 'setup', `${d(-B.trunkDeg(Wt))} back`); set('Trunk lean', 'peak', `${d(-B.trunkDeg(Wb))} back`);
set('Tempo', 'setup', 'Stretch 0.5 s at the top'); set('Tempo', 'peak', '1.2 s down, 0.4 s at the chest, 2 s up');
console.log(`Cable Neutral Grip Wide Pulldown: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  G0 ${G0} G1 ${G1} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  handle ${JSON.stringify(hClr)} seat ${seatLow.toFixed(2)}`);
