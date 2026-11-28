// Medicine Ball Seated Calf Raise (GymVisual; movement reference only, the page could not be read): the authored seated
// dumbbell calf raise (sitting on the bench end, feet flat a little wider than the hips, shins vertical; heels rise onto the
// balls of the feet and lower slowly) with a 30 cm medicine ball resting across the lower thighs just behind the knees
// instead of the dumbbells. The ball is the 'plate' held item with params.shape 'ball' (src/gear/g3lower-sled.js wraps the
// plate plug-in), held between the hands. The base loop is resampled densely; at each key the ball centre is placed midway
// between the knees, 6 cm behind them, resting on the thighs (0.3 cm clearance), and both arms are solved so the palms sit
// on the sides of the ball. Bilateral. Family gear-g3lower.js (resample, armTo).
const L = require('./lib');
const { V, r1, clone } = L;
const G = require('./families/gear-g3lower');
const H = require('./families/hips');
const EQ = require('./families/equip');
const meta = require('./meta/medicine-ball-seated-calf-raise.json');

const D = 30, RB = D / 2, BACK = 6, CLEAR = 0.3;
const base = G.fromBase('seated-dumbbell-calf-raise'), contacts = base.contacts;
const { poses, keyframes } = G.resample(base, 0.1);
const LEGS = ['thigh_r', 'thigh_l', 'quad_r', 'quad_l', 'shank_r', 'shank_l', 'calf_r', 'calf_l'];
const ballClear = (W, c, ids = G.BODY.filter((id) => !/^(hand|thumb|forearm)_/.test(id))) => { let best = { d: 1e9 }; for (const id of ids) { const d = EQ.pointShape(W, c, id) - RB; if (d < best.d) best = { d, id }; } return best; };
let prev = null, gripWorst = 0, centre0 = null, clearWorst = 1e9;
for (const k of keyframes) {
  let p = poses[k.pose];
  const W = L.fk(p, contacts), km = V.scale(V.add(W.knee_r.p, W.knee_l.p), 0.5);
  let a = km[1] - 5, b = km[1] + 30; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (ballClear(W, [km[0] - BACK, m, 0], LEGS).d < CLEAR) a = m; else b = m; }
  const c = [r1(km[0] - BACK), r1(b), 0]; if (!centre0) centre0 = c;
  for (const sd of ['r', 'l']) {
    const g = [c[0], c[1], (sd === 'r' ? 1 : -1) * (RB + 0.8)];
    const start = clone(p); if (prev) for (const j of [`shoulder_${sd}`, `elbow_${sd}`, `wrist_${sd}`]) start.ch[j] = clone(prev.ch[j]);
    p = G.armTo(start, sd, g, { axis: [1, 0, 0], palm: [0, 0, sd === 'r' ? -1 : 1], contacts, iters: 300, guesses: prev ? null : [[0, 30, 0, 90, 90], [20, 40, 40, 100, 90], [-20, 30, -30, 80, 0], [10, 20, 60, 110, 90]] });
    gripWorst = Math.max(gripWorst, p.__err); delete p.__err;
  }
  clearWorst = Math.min(clearWorst, ballClear(L.fk(p, contacts), c).d);
  poses[k.pose] = G.round(p); prev = p;
}
const ex = G.attachMeta(clone(base), meta); ex.poses = poses; ex.keyframes = keyframes;
ex.props = [...base.props.filter((p) => p.kind === 'bench'), { id: 'medball', kind: 'plate', size: [D, D, D], params: { shape: 'ball' }, attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'bar' } }];
G.kinFromBase(ex, base);
// whole loop: ball (between the hands' grip points) vs the body, hands at the ball's sides
let ball = { d: 1e9 }, width = [1e9, -1e9];
const rep = H.loopReport(ex, { planted: [], probe: (W, pz, t) => { const b = EQ.barAt(W, 'bar'); width = [Math.min(width[0], b.width), Math.max(width[1], b.width)]; const c = ballClear(W, b.c); if (c.d < ball.d) ball = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; } });
const set = H.setKin(ex), Wt = L.fk(poses[keyframes[0].pose], contacts);
set('Medicine ball', 'setup', `${D} cm ball on the lower thighs, centre ${BACK} cm behind the knees, palms on its sides`); set('Medicine ball', 'peak', `Rises with the knees; ${ball.d} cm from the thighs at the closest`);
console.log(`Medicine Ball Seated Calf Raise: wrote ${L.write(ex)}\n  ${JSON.stringify({ gripErr: +gripWorst.toFixed(2), ball, width: width.map((v) => +v.toFixed(1)), floor: rep.floor, knee: rep.kneeR, centre0, clearKeys: +clearWorst.toFixed(2) })}`);
if (gripWorst > 0.6) { console.error('FAIL: hands off the ball'); process.exitCode = 1; }
if (ball.d < -1) { console.error('FAIL: ball through the thighs'); process.exitCode = 1; }
void Wt;
