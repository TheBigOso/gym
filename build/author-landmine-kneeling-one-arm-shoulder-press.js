// Landmine Kneeling One Arm Shoulder Press (GymVisual #8849 / #14304; page not readable here, movement from the name and
// standard coaching): tall kneeling on both knees on a pad (thighs about vertical, toes tucked), facing a landmine pivot on
// the floor, left hand on the hip. The right hand holds the end of the bar's sleeve in front of the right shoulder (neutral
// grip, the sleeve running from the thumb side down to the pivot, one plate on it) and presses it up and forward along the
// bar's arc until the arm is long, then lowers it back to the shoulder. The hand stays on the sphere of the bar (216 cm from
// the pivot); the sleeve is kept pointing at the pivot (gear-bars.js landmineObjective). Authored right (the player mirrors).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const M = require('./families/b5-misc');
const G = require('./families/gear-bars');
const meta = require('./meta/landmine-kneeling-one-arm-shoulder-press.json');

const PAD = 3.5;
const base = M.tallKneel({ kneeY: 5.0, toePitch: 88, width: 10, thigh: 4 });
const P0 = base.pose;
{ const hh = H.handsOnHips(P0); for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) P0.ch[`${j}_l`] = clone(hh.ch[`${j}_l`]); }
P0.ch.sc_r = { protract: 4, elevate: 0 };
const W0 = L.fk(P0, base.contacts), S0 = W0.shoulder_r.p;
// start: the sleeve end in front of the shoulder at collarbone height; the pivot on the floor 216 cm away, a little toward
// the midline; top: the arm long (elbow 10 degrees) on the bar's sphere, up and forward
const H0 = V.add(S0, [+(process.env.HX ?? 18), -3, -5]);
const anchor = G.landmineAnchorFor(H0, { y: G.LM.pivotY, z: r1(H0[2] * 0.4) });
const reachTop = L.reach(10);
const HT = G.onSphere(anchor, G.LM.R, S0, reachTop, [0.6, 1, -0.1]);
const keys = [0, 0.25, 0.5, 0.75, 1], poses = {}, err = {};
let guess = [[60, 30, -40, 130, -80], [20, 40, -40, 120, 70], [30, 30, 0, 130, 90], [10, 60, -60, 110, 60]];
let worst = { grip: 0, kink: 0, dist: 0 };
const solveKey = (f, i) => {
  const p = clone(P0); p.ch.sc_r = { protract: r1(4 + 6 * f), elevate: r1(8 * f * f) };
  const S = L.fk(p, base.contacts).shoulder_r.p, g = G.sphereArc(anchor, G.LM.R, H0, HT, f);
  const E = F.elbowFor(S, V.add(g, [-6, -2, 0]), [+(process.env.EHX ?? 0.5), -1, +(process.env.EHZ ?? 0.1)]);
  const q = G.armTo(p, g, { grip: 'handle', elbow: E, wElbow: +(process.env.WE ?? 0.4), palm: [0.25, 0, -1], wDir: 0.4, guesses: guess, extra: [G.landmineObjective(anchor, { w: +(process.env.LW ?? 5) })], contacts: base.contacts });
  err[`p${i}`] = q.__err; delete q.__err; delete q.__cost;
  const W = L.fk(q, base.contacts), st = G.landmineState(W, anchor);
  worst = { grip: Math.max(worst.grip, err[`p${i}`]), kink: Math.max(worst.kink, st.kink), dist: Math.max(worst.dist, Math.abs(st.err)) };
  if (process.env.DBG) console.log(i, r1(st.kink), JSON.stringify(q.ch.wrist_r), JSON.stringify(q.ch.shoulder_r), q.ch.elbow_r.flex);
  guess = [G.guessOf(q)]; poses[`p${i}`] = q;
};
keys.forEach(solveKey);
guess = [G.guessOf(poses.p1)]; solveKey(0, 0); // the start re-solved from the next key, so the arm does not flip between them
const kf = [{ t: 0, pose: 'p0' }, { t: 0.8, pose: 'p0' }, ...K.easeTimes([0.25, 0.5, 0.75, 1], 0.8, 2.2).map((t, i) => ({ t, pose: `p${i + 1}` })), { t: 2.6, pose: 'p4' },
  ...K.easeTimes([0.25, 0.5, 0.75, 1], 2.6, 4.6).map((t, i) => ({ t, pose: `p${3 - i}` })), { t: 5.2, pose: 'p0' }];
const ex = H.module_(meta, base.contacts, poses, kf);
{ const Wk = L.fk(P0, base.contacts); ex.props.push({ id: 'mat', kind: 'mat', center: [r1(Wk.knee_r.p[0] - 4), 0, 0], size: [34, PAD, 48] }); }
ex.props.push(...G.landmineProps({ anchor }));
// loop: kneeling contacts, floor, bar state (distance to the pivot, sleeve kink), bar clearance from the body
let lm = { kink: 0, dist: 0, clear: { d: 1e9 } };
const rep = K.scanHeld(ex, [], { probe: (W, pz, t) => {
  const s = G.landmineState(W, anchor); lm.kink = Math.max(lm.kink, s.kink); lm.dist = Math.max(lm.dist, Math.abs(s.err));
  const c = G.landmineClear(W, anchor); if (c.d < lm.clear.d) lm.clear = { ...c, d: r1(c.d), t: +t.toFixed(2) };
} });
const Wb = L.fk(poses.p0, base.contacts), Wt = L.fk(poses.p4, base.contacts), sb = G.landmineState(Wb, anchor), st = G.landmineState(Wt, anchor);
const barAng = (s) => Math.round(Math.asin(-s.shaft[1]) * 180 / Math.PI);
const set = H.setKin(ex);
set('Stance', 'setup', `both knees down, knee angle ${Math.round(H.kneeOf(Wb, 'r'))}° (toes tucked), thighs about vertical; pivot ${r1(anchor[0] - Wb.knee_r.p[0])} cm in front of the knees`); set('Stance', 'peak', 'unchanged');
set('Shoulder elevation', 'setup', `≈${Math.round(K.humElev(Wb))}°`); set('Shoulder elevation', 'peak', `≈${Math.round(K.humElev(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(K.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(K.elbowAng(Wt))}°`);
set('Bar angle', 'setup', `≈${barAng(sb)}° above the floor at the shoulder`); set('Bar angle', 'peak', `≈${barAng(st)}° at the top; the hand travels ${r1(V.len(V.sub(st.grip, sb.grip)))} cm along the arc`);
set('Tempo', 'setup', 'Brace 0.8 s at the shoulder'); set('Tempo', 'peak', '1.4 s up, 0.4 s at the top, 2.0 s down');
console.log(`Landmine Kneeling One Arm Shoulder Press: wrote ${L.write(ex)}\n  anchor ${anchor.map(r1)} err ${JSON.stringify(err)} worst ${JSON.stringify({ grip: worst.grip, kink: r1(worst.kink), dist: r1(worst.dist) })}\n  loop ${JSON.stringify({ kink: r1(lm.kink), dist: r1(lm.dist), clear: lm.clear, floor: rep.floor, slide: rep.slide, jump: rep.jump })}`);
const fails = [];
if (worst.grip > 0.8) fails.push(`hand off its target (${worst.grip} cm)`);
if (lm.dist > 1.5) fails.push(`hand off the bar's arc (${lm.dist.toFixed(1)} cm)`);
if (lm.kink > 10) fails.push(`sleeve not aligned with the shaft (${lm.kink.toFixed(1)} deg)`);
if (lm.clear.d < 0) fails.push(`bar into the body (${lm.clear.id} ${lm.clear.what} at ${lm.clear.t}s)`);
if (rep.slide > 0.05) fails.push('knees slide');
if (rep.floor < -0.5) fails.push('below the floor');
if (rep.jump.v > 4) fails.push(`channel jump ${rep.jump.v}`);
if (fails.length) { console.error(`FAIL landmine-kneeling-one-arm-shoulder-press: ${fails.join('; ')}`); process.exitCode = 1; }
