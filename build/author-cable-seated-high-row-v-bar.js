// Cable Seated High Row (V-bar) (GymVisual 5024, Cable Seated High Row (V-bar); movement reference only, page not
// readable): seated tall on a box facing a pulley set above head height, feet flat on the floor (planted leg contacts).
// A close-grip V-handle (drawn as a 20 cm cable 'bar' attachment held with a neutral, palms-facing grip, 16 cm between
// the grip points; the handle lies across each fist, square to the forearm) is rowed from the arms long, reaching up
// toward the pulley with the shoulder blades forward and lifted, to the upper chest with the elbows travelling down and
// back close to the body and the shoulder blades drawn down and together. The trunk stays upright. Bilateral (right arm
// solved, left mirrored). Tempo: 1.2 s pull, 0.4 s squeeze, 2 s return, 0.5 s stretch. Built like
// author-cable-seated-high-row-v-bar.js; family b6-08.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const X = require('./families/b6-08');
const meta = require('./meta/cable-seated-high-row-v-bar.json');

const ID = 'cable-seated-high-row-v-bar';
const ENV = (k, v) => +(process.env[k] ?? v);
const LEAN = 2, HALF = X.VBAR.half, BAR = X.VBAR.len, REACH = L.reach(15) + 7;
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
const G1 = [r1(B.extreme(W1, 'chest', [1, 0, 0])[0] + ENV('GX', 5)), r1(S1[1] - ENV('GY', 10)), HALF];
const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(ENV('PL', -25), ENV('EL', 40));
const gripAt = (f, k) => { const g = B.lerpV(G0, G1, k); g[2] = HALF; return g; };
const elbowAt = (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA));
// neutral: palm facing in; the handle lies across the fist, square to the forearm in the sagittal plane
const palmAt = () => [0, 0, -1];
const axisAt = (f, k, W) => { const u = V.sub(gripAt(f, k), elbowAt(f, k, W)), n = Math.hypot(u[0], u[1]) || 1; return [-u[1] / n, u[0] / n, 0]; };
const { poses, err, names } = X.pullKeys2({
  contacts: base.contacts, trunkAt, guess: { plane: -30, elev: 40, axial: 40, pron: 80, flex: 120 }, wAxial: ENV('WA', 0.02),
  gripAt, elbowAt, wElbowAt: (k) => ENV('W0', 0.1) + ENV('W1', 0.3) * k, palmAt, axisAt: process.env.NOAX ? null : axisAt, wPalm: 3,
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.seat, EQ.cableTower(ANCHOR, { height: 200 }), X.vbarProp(ANCHOR)];

// loop checks: feet, floor, jumps, grip width, the cable clear of the head, the handle clear of the body, thighs on the seat
const ck = X.twoHandChecks(ID, ex, { anchor: ANCHOR, barLen: BAR, seat: base.seat, bodyIds: ['chest', 'ribcage', 'abdomen', 'head', 'jaw'] });
const rep = ck.rep, barClr = ck.barClr, seatLow = ck.seatLow;

const Ws = L.fk(poses.start, base.contacts), We = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Shoulder extension', 'setup', `Upper arm ${d(B.armTrunk(Ws))} from the trunk, reaching up toward the pulley`); set('Shoulder extension', 'peak', `${d(B.armTrunk(We))} from the trunk, elbows ${Math.round(We.shoulder_r.p[0] - We.elbow_r.p[0])} cm behind the shoulders and ${Math.round(We.elbow_r.p[2] - We.shoulder_r.p[2])} cm out (close to the body)`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Ws))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(We))}`);
set('Shoulder blades', 'setup', 'Protracted, slightly raised (reaching)'); set('Shoulder blades', 'peak', 'Retracted and drawn down');
set('Grip', 'setup', `Neutral on a V-handle, ${Math.round(EQ.barAt(Ws).width)} cm between the hands`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Trunk lean', 'setup', `${d(Math.abs(B.trunkDeg(Ws)))} from upright, seated tall`); set('Trunk lean', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Stretch 0.5 s with the arms long'); set('Tempo', 'peak', '1.2 s pull, 0.4 s squeeze, 2 s return');
console.log(`Cable Seated High Row (V-bar): wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  G0 ${G0.map(r1)} G1 ${G1} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  bar ${JSON.stringify(barClr)} seat ${seatLow} hand ${JSON.stringify(ck.hand)} peak ${ck.peak}`);
