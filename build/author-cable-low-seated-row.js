// Cable Low Seated Row (GymVisual 5016, Cable Low Seated Row; movement reference only, page not readable): seated on a box
// facing a low pulley, feet braced on a box foot plate (soles on its near face, knees bent about 25 degrees, planted leg
// contacts). A close-grip V-handle (drawn as a 20 cm cable 'bar' attachment held with a neutral, palms-facing grip, 16 cm
// between the grip points) runs to the pulley just above the plate. From a full reach (arms long, shoulder blades forward,
// trunk about 15 degrees forward of upright) the trunk comes upright as the handle is rowed to the stomach with the
// elbows brushing the sides and the shoulder blades drawn back; then the arms reach forward again. Bilateral (right arm
// solved, left mirrored). Tempo: 1.2 s pull, 0.4 s squeeze, 2 s return, 0.5 s stretch. Built like
// author-cable-rope-seated-row.js; family b6-08.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const X = require('./families/b6-08');
const meta = require('./meta/cable-low-seated-row.json');

const ID = 'cable-low-seated-row';
const LEAN0 = 15, LEAN1 = -3, HALF = X.VBAR.half, REACH = L.reach(18) + 7;
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
const G1 = [r1(B.extreme(W1, 'abdomen', [1, 0, 0])[0] + 6), r1(W1.shoulder_r.p[1] - 29), HALF];
// elbows: along the arm at the reach; back, close to the sides at the finish
const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(-50, 28);
const { poses, err, names } = B.pullKeys({
  contacts: base.contacts, trunkAt, guess: { plane: 85, elev: 75, axial: -100, pron: 105, flex: 20 },
  gripAt: (f, k) => { const g = B.lerpV(G0, G1, k); g[2] = HALF; return g; },
  elbowAt: (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA)), wElbowAt: (k) => 0.3 + 0.9 * k,
  palmAt: () => [0, 0, -1], axis: [0, 1, 0],
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.seat, plate, EQ.cableTower(ANCHOR, { offset: [6, -40] }), X.vbarProp(ANCHOR)];
const ck = X.twoHandChecks(ID, ex, { anchor: ANCHOR, barLen: X.VBAR.len, seat: base.seat, plate, bodyIds: ['abdomen', 'pelvis', 'ribcage', 'thigh_r', 'thigh_l', 'quad_r', 'quad_l'] });
const rep = ck.rep;

const Wr = L.fk(poses.start, base.contacts), Wf = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = X.d;
set('Trunk lean', 'setup', `${d(B.trunkDeg(Wr))} forward of upright at the reach`); set('Trunk lean', 'peak', `${d(B.trunkDeg(Wf))} (upright) at the finish`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wr))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wf))}`);
set('Shoulder extension', 'setup', `Upper arm ${d(X.shExt(Wr))} from the trunk line, in front`); set('Shoulder extension', 'peak', `Elbows ${Math.round(Wf.shoulder_r.p[0] - Wf.elbow_r.p[0])} cm behind the shoulders`);
set('Shoulder blades', 'setup', 'Protracted (reaching forward)'); set('Shoulder blades', 'peak', 'Retracted (drawn together)');
set('Grip', 'setup', `Neutral on a V-handle, ${Math.round(EQ.barAt(Wr).width)} cm between the hands`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Tempo', 'setup', 'Stretch 0.5 s at full reach'); set('Tempo', 'peak', '1.2 s pull, 0.4 s squeeze, 2 s return');
console.log(`Cable Low Seated Row: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  anchor ${ANCHOR} G0 ${G0.map(r1)} G1 ${G1}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify({ bar: ck.barClr, seat: ck.seatLow, plate: ck.plateClr, hand: ck.hand, peak: ck.peak })}`);
