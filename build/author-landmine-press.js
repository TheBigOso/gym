// Landmine Press (GymVisual #11804; page not readable here, movement from the name and standard coaching): standing in a
// staggered stance (left foot a little forward, both feet planted), facing a landmine pivot on the floor, left hand on the
// hip. The right hand holds the end of the bar's sleeve in front of the right shoulder (neutral grip, the sleeve running
// from the thumb side down to the pivot, one plate on it) and presses it up and forward along the bar's arc until the arm
// is long, then lowers it back to the shoulder. The hand stays on the bar's sphere (216 cm from the pivot) and the sleeve
// keeps pointing at the pivot (gear-bars.js landmineObjective). The trunk leans a few degrees into the bar. Built on
// author-landmine-kneeling-one-arm-shoulder-press.js. Authored right (the player mirrors).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const G = require('./families/gear-bars');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/landmine-press.json');

const ID = 'landmine-press', ENV = (k, d) => +(process.env[k] ?? d);
const base = X.stance({ front: 'l', step: ENV('STEP', 36), width: 24, drop: 3 });
const P0 = base.pose;
const LEAN = ENV('LEAN', 3); // forward lean per spine segment (deg)
for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) P0.ch[j] = { rot: 0, latFlex: 0, flex: LEAN };
P0.ch.neck_c7 = { rot: 0, flex: -LEAN }; P0.ch.head_c1 = { rot: 0, flex: -LEAN };
{ const hh = H.handsOnHips(P0); for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) P0.ch[`${j}_l`] = clone(hh.ch[`${j}_l`]); }
P0.ch.sc_r = { protract: 4, elevate: 0 };
const W0 = L.fk(P0, base.contacts), S0 = W0.shoulder_r.p;
const H0 = V.add(S0, [ENV('HX', 18), -3, -5]);
const anchor = G.landmineAnchorFor(H0, { y: G.LM.pivotY, z: r1(H0[2] * 0.4) });
const HT = G.onSphere(anchor, G.LM.R, S0, L.reach(10), [0.6, 1, -0.1]);
const keys = [0, 0.25, 0.5, 0.75, 1], poses = {}, err = {};
let guess = [[60, 30, -40, 130, -80], [20, 40, -40, 120, 70], [30, 30, 0, 130, 90], [10, 60, -60, 110, 60]];
let worst = { grip: 0, kink: 0, dist: 0 };
const solveKey = (f, i) => {
  const p = clone(P0); p.ch.sc_r = { protract: r1(4 + 6 * f), elevate: r1(8 * f * f) };
  const S = L.fk(p, base.contacts).shoulder_r.p, g = G.sphereArc(anchor, G.LM.R, H0, HT, f);
  const E = F.elbowFor(S, V.add(g, [-6, -2, 0]), [0.5, -1, 0.1]);
  const q = G.armTo(p, g, { grip: 'handle', elbow: E, wElbow: 0.4, palm: [0.25, 0, -1], wDir: 0.4, guesses: guess, extra: [G.landmineObjective(anchor, { w: 5 })], contacts: base.contacts });
  err[`p${i}`] = q.__err; delete q.__err; delete q.__cost;
  const W = L.fk(q, base.contacts), st = G.landmineState(W, anchor);
  worst = { grip: Math.max(worst.grip, err[`p${i}`]), kink: Math.max(worst.kink, st.kink), dist: Math.max(worst.dist, Math.abs(st.err)) };
  guess = [G.guessOf(q)]; poses[`p${i}`] = q;
};
keys.forEach(solveKey);
guess = [G.guessOf(poses.p1)]; solveKey(0, 0);
const ph = (id) => meta.timeline.phases.find((p) => p.id === id);
const a = ph('press').start, b = ph('press').end, c = ph('top').end, d = ph('lower').end, D = meta.timeline.duration;
const kf = [{ t: 0, pose: 'p0' }, { t: a, pose: 'p0' }, ...K.easeTimes([0.25, 0.5, 0.75, 1], a, b).map((t, i) => ({ t, pose: `p${i + 1}` })), { t: c, pose: 'p4' },
  ...K.easeTimes([0.25, 0.5, 0.75, 1], c, d).map((t, i) => ({ t, pose: `p${3 - i}` })), { t: D, pose: 'p0' }];
const ex = H.module_(meta, base.contacts, poses, kf);
ex.props = G.landmineProps({ anchor });
let lm = { kink: 0, dist: 0, clear: { d: 1e9 } };
const rep = K.scanHeld(ex, [], { probe: (W, pz, t) => {
  const s = G.landmineState(W, anchor); lm.kink = Math.max(lm.kink, s.kink); lm.dist = Math.max(lm.dist, Math.abs(s.err));
  const cc = G.landmineClear(W, anchor); if (cc.d < lm.clear.d) lm.clear = { ...cc, d: r1(cc.d), t: +t.toFixed(2) };
} });
const Wb = L.fk(poses.p0, base.contacts), Wt = L.fk(poses.p4, base.contacts), sb = G.landmineState(Wb, anchor), st = G.landmineState(Wt, anchor);
const barAng = (s) => Math.round(Math.asin(-s.shaft[1]) * 180 / Math.PI);
const set = H.setKin(ex);
set('Stance', 'setup', `Staggered: left foot ${ENV('STEP', 36)} cm ahead of the right, feet 24 cm apart, soft knees; pivot ${r1(anchor[0] - Wb.ankle_l.p[0])} cm in front of the front foot`); set('Stance', 'peak', `Unchanged; trunk ≈${Math.round(V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]))}° forward into the bar`);
set('Shoulder elevation', 'setup', `≈${Math.round(K.humElev(Wb))}°`); set('Shoulder elevation', 'peak', `≈${Math.round(K.humElev(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(K.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(K.elbowAng(Wt))}°`);
set('Bar angle', 'setup', `≈${barAng(sb)}° above the floor at the shoulder`); set('Bar angle', 'peak', `≈${barAng(st)}° at the top; the hand travels ${r1(V.len(V.sub(st.grip, sb.grip)))} cm along the arc`);
set('Tempo', 'setup', `Brace ${a} s at the shoulder`); set('Tempo', 'peak', `${r1(b - a)} s up, ${r1(c - b)} s at the top, ${r1(d - c)} s down`);
console.log(`Landmine Press: wrote ${L.write(ex)}\n  anchor ${anchor.map(r1)} err ${JSON.stringify(err)} worst ${JSON.stringify({ grip: worst.grip, kink: r1(worst.kink), dist: r1(worst.dist) })}\n  loop ${JSON.stringify({ kink: r1(lm.kink), dist: r1(lm.dist), clear: lm.clear, floor: rep.floor, slide: rep.slide, jump: rep.jump })}`);
const fails = [];
if (worst.grip > 0.8) fails.push(`hand off its target (${worst.grip} cm)`);
if (lm.dist > 1.5) fails.push(`hand off the bar's arc (${lm.dist.toFixed(1)} cm)`);
if (lm.kink > 10) fails.push(`sleeve not aligned with the shaft (${lm.kink.toFixed(1)} deg)`);
if (lm.clear.d < 0) fails.push(`bar into the body (${lm.clear.id} ${lm.clear.what} at ${lm.clear.t}s)`);
if (rep.slide > 0.05) fails.push('feet slide');
if (rep.floor < -0.5) fails.push('below the floor');
if (rep.jump.v > 4) fails.push(`channel jump ${rep.jump.v}`);
X.report(ID, fails);
