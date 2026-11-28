// Cable Seated Wide Grip Row (GymVisual 2893, Cable Seated Wide grip Row; movement reference only, page not readable):
// seated on a box facing a low pulley, feet braced on a box foot plate (planted leg contacts, knees bent about 25
// degrees). A long straight bar (cable attachment 'bar', 120 cm) held overhand with the hands well outside the shoulders
// (about 76 cm between the grip points). From a full reach (arms long, shoulder blades forward, trunk about 14 degrees
// forward) the trunk comes upright as the bar is rowed to the lower chest, the elbows travelling back and out (about
// 55-65 degrees from the trunk) and the shoulder blades drawing together; then the arms reach forward again. Bilateral
// (right arm solved, left mirrored). Tempo: 1.2 s pull, 0.4 s squeeze, 2 s return, 0.5 s stretch. Family b6-08.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const X = require('./families/b6-08');
const meta = require('./meta/cable-seated-wide-grip-row.json');

const ID = 'cable-seated-wide-grip-row';
const LEAN0 = 14, LEAN1 = -2, HALF = +(process.env.HALF ?? 38), BAR = 120, REACH = L.reach(15) + 7;
const base = B.seatedBox({ toeUp: 90, dorsi: 28, knee: 25 });
const plate = base.plate, top = plate.size[1];
const ANCHOR = [r1(plate.center[0] + plate.size[0] / 2 + 6), r1(top + 5), 0];
const trunkAt = (f, k) => {
  const lean = LEAN0 + (LEAN1 - LEAN0) * k, p = B.leanTo(base, lean);
  p.ch.sc_r = { protract: r1(10 - 22 * k), elevate: r1(1 - 3 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: r1(-0.6 * lean) }; p.ch.head_c1 = { rot: 0, flex: r1(-0.3 * lean) };
  return p;
};
const W0 = L.fk(trunkAt(0, 0), base.contacts), W1 = L.fk(trunkAt(1, 1), base.contacts);
const S0 = W0.shoulder_r.p, toA = V.norm([ANCHOR[0] - S0[0], ANCHOR[1] - S0[1], 0]);
const G0 = V.add([S0[0], S0[1], HALF], V.scale(toA, Math.sqrt(REACH * REACH - (S0[2] - HALF) ** 2)));
const G1 = [r1(B.extreme(W1, 'chest', [1, 0, 0])[0] + +(process.env.GX ?? 6)), r1(W1.shoulder_r.p[1] - +(process.env.GY ?? 18)), HALF];
// elbows: along the arm at the reach; back and out at the finish (shoulder plane / elevation)
const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(+(process.env.PL ?? -28), +(process.env.EL ?? 62));
// overhand: palm square to the forearm, facing down and a little forward
const elbowAt = (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA));
const gripAt = (f, k) => { const g = B.lerpV(G0, G1, k); g[2] = HALF; return g; };
const palmAt = (f, k, W) => { const u = V.norm(V.sub(gripAt(f, k), elbowAt(f, k, W))), P = V.norm([0.2, -1, 0]); return V.norm(V.sub(P, V.scale(u, V.dot(u, P)))); };
const { poses, err, names } = B.pullKeys({
  contacts: base.contacts, trunkAt, guess: { plane: 75, elev: 80, axial: -50, pron: 170, flex: 15 },
  gripAt, elbowAt, wElbowAt: (k) => 0.3 + 0.8 * k, palmAt, axis: [0, 0, 1], wPalm: 2,
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.seat, plate, EQ.cableTower(ANCHOR, { offset: [6, -40] }), X.barProp(ANCHOR, BAR)];
const ck = X.twoHandChecks(ID, ex, { anchor: ANCHOR, barLen: BAR, seat: base.seat, plate, bodyIds: ['abdomen', 'pelvis', 'ribcage', 'thigh_r', 'thigh_l', 'quad_r', 'quad_l'] });
const rep = ck.rep;

const Wr = L.fk(poses.start, base.contacts), Wf = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = X.d;
set('Trunk lean', 'setup', `${d(B.trunkDeg(Wr))} forward of upright at the reach`); set('Trunk lean', 'peak', `${d(B.trunkDeg(Wf))} (upright) at the finish`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wr))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wf))}`);
set('Elbow flare', 'setup', `Upper arm ${d(X.shExt(Wr))} from the trunk line, reaching forward`); set('Elbow flare', 'peak', `Upper arm ${d(B.armTrunk(Wf))} from the trunk, elbows ${Math.round(Wf.shoulder_r.p[0] - Wf.elbow_r.p[0])} cm behind the shoulders and ${Math.round(Wf.elbow_r.p[2] - Wf.shoulder_r.p[2])} cm out`);
set('Shoulder blades', 'setup', 'Protracted (reaching forward)'); set('Shoulder blades', 'peak', 'Retracted (drawn together)');
set('Grip', 'setup', `Overhand, ${Math.round(EQ.barAt(Wr).width)} cm between the hands on a ${BAR} cm bar (shoulders ${Math.round(Wr.shoulder_r.p[2] - Wr.shoulder_l.p[2])} cm apart)`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Tempo', 'setup', 'Stretch 0.5 s at full reach'); set('Tempo', 'peak', '1.2 s pull, 0.4 s squeeze, 2 s return');
console.log(`Cable Seated Wide Grip Row: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  anchor ${ANCHOR} G0 ${G0.map(r1)} G1 ${G1}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify({ bar: ck.barClr, seat: ck.seatLow, plate: ck.plateClr, hand: ck.hand, peak: ck.peak })}`);
