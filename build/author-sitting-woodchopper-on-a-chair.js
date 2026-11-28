// Sitting Woodchopper on a Chair (GymVisual #19033; page not readable here, movement from the name and standard
// coaching): sitting tall near the front of a chair (a seat box with a backrest), feet flat and wide (planted). Both
// hands hold a light weight plate by its rim at 3 and 9 o'clock. From up beside the right shoulder with the chest turned
// right, chop the plate down across the body to the outside of the left knee, the chest turning left and the trunk
// leaning forward from the hips; then lift it back up the same path. The plate centre follows a curved diagonal; each arm
// is solved onto its own rim grip point (right: gear-bars.js armTo, left: gear-g3-bars.js armToL), so the grip width
// stays the plate's. Authored right (high right to low left; the player mirrors).
const L = require('./lib');
const { V, R, r1, clone } = L;
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const B = require('./families/b5-cablepull');
const G = require('./families/gear-bars');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/sitting-woodchopper-on-a-chair.json');

const ID = 'sitting-woodchopper-on-a-chair', ENV = (k, d) => +(process.env[k] ?? d);
const PD = 34, GW = G.plateGripWidth(PD);                    // a light plate (about 5 kg), rim grip width
const base = B.seatedBox({ feet: 'floor', seatH: 46, stance: ENV('ST', 20), footAhead: 8, hipAbd: 10 });
const ROT0 = ENV('R0', 38), ROT1 = ENV('R1', -32), LEAN1 = ENV('LEAN', 30);
const trunkAt = (k) => { // k 0 = top (turned right, upright) .. 1 = bottom (turned left, leaning forward)
  const rot = ROT0 + (ROT1 - ROT0) * k, lean = LEAN1 * k * k;
  const p = B.leanTo(base, lean, { spine: { spine_l5: { rot: r1(rot * 0.15), flex: r1(lean * 0.15), latFlex: r1(-6 * k) }, spine_t12: { rot: r1(rot * 0.45), flex: r1(lean * 0.2), latFlex: 0 }, spine_t6: { rot: r1(rot * 0.4), flex: r1(lean * 0.15), latFlex: 0 } } });
  p.ch.neck_c7 = { rot: r1(rot * 0.3), flex: r1(-lean * 0.3 + 6 * k) }; p.ch.head_c1 = { rot: r1(rot * 0.2), flex: r1(-lean * 0.2 + 6 * k) };
  p.ch.sc_r = { protract: r1(4 + 6 * k), elevate: r1(8 * (1 - k)) }; p.ch.sc_l = clone(p.ch.sc_r);
  return p;
};
// plate path: top above / in front of the right shoulder, bottom outside the left knee
const Wt = L.fk(trunkAt(0), base.contacts), Wb = L.fk(trunkAt(1), base.contacts);
const P0 = V.add(Wt.shoulder_r.p, [ENV('TOPX', 34), ENV('TOPY', 28), ENV('TOPZ', 18)]);
const P1 = V.add(Wb.knee_l.p, [ENV('BX', 12), ENV('BY', 16), ENV('BZ', -16)]);
const plateAt = (k) => { const m = V.scale(V.add(P0, P1), 0.5), bow = V.add(m, [ENV('BOW', 14), 0, 0]); const a = V.add(V.scale(P0, (1 - k) ** 2), V.add(V.scale(bow, 2 * k * (1 - k)), V.scale(P1, k * k))); return a; };
const KS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], poses = {}, err = [];
const GD = [[90, 120, 0, 20, 0], [60, 90, -20, 30, 60], [100, 60, 20, 20, -40], [120, 40, 30, 20, 0], [80, 150, 0, 30, 90]];
let gR = GD.slice(), gL = GD.slice();
KS.forEach((k, i) => {
  const p = trunkAt(k), W = L.fk(p, base.contacts), P = plateAt(k);
  const chest = V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5), dir = X.unit(V.sub(P, chest));
  const e = X.unit(V.cross([0, 1, 0], dir).map((v) => -v)), up = X.unit(V.cross(dir, e)); // e: across the plate toward the right hand
  const gr = V.add(P, V.scale(e, GW / 2)), gl = V.sub(P, V.scale(e, GW / 2));
  const oR = { grip: 'handle', palm: V.scale(e, -1), thumb: up, wDir: 0.8, contacts: base.contacts };
  let q = G.armTo(p, gr, { ...oR, guesses: gR }); if (q.__err > 0.4) q = G.armTo(p, gr, { ...oR, guesses: [...gR, ...GD] });
  err.push(q.__err); delete q.__err; delete q.__cost; gR = [G.guessOf(q)];
  const q1 = q, oL = { grip: 'handle', palm: e, thumb: up, wDir: 0.8, contacts: base.contacts };
  q = X.armToL(q1, gl, { ...oL, guesses: gL }); if (q.__err > 0.4) q = X.armToL(q1, gl, { ...oL, guesses: [...gL, ...GD] });
  err.push(q.__err); delete q.__err; delete q.__cost; gL = [X.guessOfL(q)];
  poses[`k${i}`] = X.unwrapArms(q, i ? poses[`k${i - 1}`] : null);
});
const N = KS.length - 1, ph = (id) => meta.timeline.phases.find((p) => p.id === id), D = meta.timeline.duration;
const t0 = ph('chop').start, t1 = ph('chop').end, t2 = ph('bottom').end, t3 = ph('lift').end;
const keyframes = [{ t: 0, pose: 'k0' }, ...K.easeTimes(KS, t0, t1).map((t, i) => ({ t, pose: `k${i}` })), { t: t2, pose: `k${N}` }, ...K.easeTimes(KS.slice(0, -1).map((k) => 1 - k).reverse(), t2, t3).map((t, i) => ({ t, pose: `k${N - 1 - i}` })), { t: D, pose: 'k0' }];
const ex = H.module_(meta, base.contacts, poses, keyframes);
const seat = base.seat, back = { id: 'chair_back', kind: 'box', center: [r1(seat.center[0] - seat.size[0] / 2 - 1.5), seat.size[1], 0], size: [3, 44, seat.size[2]] };
ex.props = [seat, back, G.plateProp({ two: true, D: PD, thick: 3 })];
// loop: grip width, plate clear of the body, thighs on the seat, feet planted
let pl = { width: [1e9, -1e9], clear: { d: 1e9 }, seat: 1e9 };
const rep = K.scanHeld(ex, [], { probe: (W, pz, t) => {
  const d = G.plateAt(W, { two: true, D: PD, thick: 3 }); pl.width = [Math.min(pl.width[0], d.width), Math.max(pl.width[1], d.width)];
  const c = G.plateClear(W, { two: true, D: PD, thick: 3 }, /^(hand|thumb|forearm)_/); if (c.d < pl.clear.d) pl.clear = { ...c, d: r1(c.d), t: +t.toFixed(2) };
  pl.seat = Math.min(pl.seat, B.thighOnSeat(W, seat));
} });
const fails = [];
if (Math.max(...err) > 0.8) fails.push(`hands off the rim (${Math.max(...err)} cm)`);
if (pl.width[1] - pl.width[0] > 1.2) fails.push(`grip width varies ${pl.width.map(r1)}`);
if (pl.clear.d < 0) fails.push(`plate into the body ${JSON.stringify(pl.clear)}`);
if (pl.seat < -2) fails.push(`thighs into the seat ${r1(pl.seat)}`);
if (rep.slide > 0.05) fails.push('feet slide');
if (rep.floor < -0.5) fails.push('below the floor');
if (rep.jump.v > 4) fails.push(`channel jump ${JSON.stringify(rep.jump)}`);
const W0 = L.fk(poses.k0, base.contacts), W1 = L.fk(poses[`k${N}`], base.contacts);
const yaw = (W) => Math.round(Math.atan2(W.shoulder_l.p[0] - W.shoulder_r.p[0], W.shoulder_r.p[2] - W.shoulder_l.p[2]) / R.DEG); // + = chest turned right
const set = H.setKin(ex);
set('Trunk rotation', 'setup', `Shoulder line turned ≈${Math.abs(yaw(W0))}° to the right, plate up beside the right shoulder`); set('Trunk rotation', 'peak', `≈${Math.abs(yaw(W1))}° to the left at the bottom; hips square on the seat`);
set('Trunk lean', 'setup', `≈${Math.round(B.trunkDeg(W0))}° (tall)`); set('Trunk lean', 'peak', `≈${Math.round(B.trunkDeg(W1))}° forward at the bottom`);
set('Plate path', 'setup', `Plate centre ${Math.round(P0[1])} cm high beside the right shoulder; rim grip ${r1(GW)} cm wide (${PD} cm plate)`); set('Plate path', 'peak', `Down to ${Math.round(P1[1])} cm outside the left knee`);
set('Tempo', 'setup', `${t0} s set`); set('Tempo', 'peak', `${r1(t1 - t0)} s down, ${r1(t2 - t1)} s pause, ${r1(t3 - t2)} s up`);
console.log(`Sitting Woodchopper on a Chair: wrote ${L.write(ex)}\n  err ${Math.max(...err)} P0 ${P0.map(r1)} P1 ${P1.map(r1)} yaw ${yaw(W0)} ${yaw(W1)}\n  loop ${JSON.stringify({ ...pl, width: pl.width.map(r1), seat: r1(pl.seat), floor: rep.floor, slide: rep.slide, jump: rep.jump })}`);
X.report(ID, fails);
