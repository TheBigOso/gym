// Cable Standing Row (GymVisual 11819, Cable Standing Row; movement reference only, page not readable): standing facing
// a pulley set at about waist height, feet about hip width (planted leg contacts), knees bent about 20 degrees and the
// chest tall with a slight forward lean, braced and still (the pelvis does not move). A straight bar (cable attachment
// 'bar', 50 cm, overhand grip with 42 cm between the grip points) is rowed from the arms long (shoulder blades forward)
// to the upper stomach, elbows travelling back past the trunk and the shoulder blades drawing together, then returned.
// Bilateral (right arm solved, left mirrored). Tempo: 1.2 s pull, 0.4 s squeeze, 2 s return, 0.5 s stretch.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const meta = require('./meta/cable-standing-row.json');

const ID = 'cable-standing-row';
const HALF = 21, BAR = 50, REACH = L.reach(15) + 7;
const st = F.standing({ stance: 12, knee: 20, lean: 12 });
const trunkAt = (f, k) => {
  const p = clone(st.pose);
  p.ch.sc_r = { protract: r1(12 - 24 * k), elevate: r1(1 - 4 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: -5 }; p.ch.head_c1 = { rot: 0, flex: -2 };
  return p;
};
const W0 = L.fk(trunkAt(0, 0), st.contacts), W1 = L.fk(trunkAt(1, 1), st.contacts), S0 = W0.shoulder_r.p;
const ANCHOR = [r1(S0[0] + 125), 100, 0];
const toA = V.norm([ANCHOR[0] - S0[0], ANCHOR[1] - S0[1], 0]);
const G0 = V.add([S0[0], S0[1], HALF], V.scale(toA, Math.sqrt(REACH * REACH - (S0[2] - HALF) ** 2)));
const G1 = [r1(B.extreme(W1, 'abdomen', [1, 0, 0])[0] + 5), r1(W1.shoulder_r.p[1] - 27), HALF];
const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(-50, 45);
const { poses, err, names } = B.pullKeys({
  contacts: st.contacts, trunkAt, guess: { plane: 85, elev: 85, axial: -60, pron: 170, flex: 15 },
  gripAt: (f, k) => { const g = B.lerpV(G0, G1, k); g[2] = HALF; return g; },
  elbowAt: (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA)), wElbowAt: (k) => 0.3 + 0.9 * k,
  palmAt: () => [0, -1, 0], axis: [0, 0, 1], wPalm: 2,
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [EQ.cableTower(ANCHOR), { id: 'bar', kind: 'cable', attachment: 'bar', size: [BAR, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, jumps, grip width, the cable clear of the body, the bar clear of the body
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { two: true })] });
let barClr = { d: 1e9 };
H.loopReport(ex, { probe: (W, pz, t) => {
  const b = EQ.barAt(W), c = EQ.segmentClear(W, V.add(b.c, V.scale(b.ax, BAR / 2)), V.sub(b.c, V.scale(b.ax, BAR / 2)), 1.5, { skip: /^(hand|thumb|forearm)_/ });
  if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
} });
C.gate(ID, rep, { minLine: 1 });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (barClr.d < 0.5) fail(`bar into the body ${JSON.stringify(barClr)}`);

const Ws = L.fk(poses.start, st.contacts), We = L.fk(poses.end, st.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Knee flexion', 'setup', `${d(H.kneeOf(Ws, 'r'))}`); set('Knee flexion', 'peak', 'Unchanged (legs braced)');
set('Elbow flexion', 'setup', `${d(C.elbowAng(Ws))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(We))}`);
set('Shoulder blades', 'setup', 'Protracted (reaching forward)'); set('Shoulder blades', 'peak', 'Retracted (drawn together)');
set('Trunk', 'setup', `${d(B.trunkDeg(Ws))} forward of upright, chest tall`); set('Trunk', 'peak', 'Unchanged (pelvis still)');
set('Tempo', 'setup', 'Stretch 0.5 s with the arms long'); set('Tempo', 'peak', '1.2 s pull, 0.4 s squeeze, 2 s return');
console.log(`Cable Standing Row: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  G0 ${G0.map(r1)} G1 ${G1} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  bar ${JSON.stringify(barClr)}`);
