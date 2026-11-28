// Landmine 180 (GymVisual #4257; page not readable here, movement from the name and standard coaching): standing tall,
// feet wide and planted, facing a landmine pivot on the floor; both hands hold the end of the bar's sleeve at arm's length
// in front of the chest (right hand at the end, left hand just behind it, one plate on the sleeve). The bar end sweeps in
// an arc down to the outside of the right hip and back up through the middle, then down to the left hip and back; the
// arms stay long and the pelvis and chest turn with the bar. The hands ride the bar's sphere about the pivot (216 cm), the
// sleeve points at the pivot. Arms solved to their own grip points (gear-g3-bars.js armToL for the left). Alternating.
const L = require('./lib');
const { V, R, r1, clone } = L;
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const G = require('./families/gear-bars');
const X = require('./families/gear-g3-bars');
const EQ = require('./families/equip');
const meta = require('./meta/landmine-180.json');

const ID = 'landmine-180', ENV = (k, d) => +(process.env[k] ?? d);
const GAP = ENV('GAP', 8);                                         // left grip point this far down the sleeve from the right one
const base = X.stance({ front: 'l', step: 0, width: ENV('W', 44), drop: 4, toeOut: 12 });
const P0 = base.pose;
const W0 = L.fk(P0, base.contacts);
// centre: the bar end at arm's length in front of the chest, at the midline
const C = [r1(W0.shoulder_r.p[0] + ENV('CX', 36)), r1(W0.shoulder_r.p[1] - ENV('CY', 14)), 0];
const anchor = G.landmineAnchorFor(C, { y: G.LM.pivotY, z: 0 });
// side: outside the hip, at hip height, on the bar's sphere
const sideAt = (s) => { const y = ENV('SY', 100), z = s * ENV('SZ', 24), dx = Math.sqrt(G.LM.R ** 2 - (y - anchor[1]) ** 2 - (z - anchor[2]) ** 2); return [anchor[0] - dx, y, z]; };
const SIDE = { r: sideAt(1), l: sideAt(-1) };
const ROT = ENV('ROT', 22), YAW = ENV('YAW', 10), BEND = ENV('BEND', 8);
function trunk(k, s) { // k 0..1 toward side s (+1 right, -1 left)
  const p = clone(P0), r = s * ROT * k;
  p.root.rot = { yaw: r1(-s * YAW * k), pitch: r1(BEND * 0.4 * k) };
  p.ch.spine_l5 = { rot: r1(r * 0.15), flex: r1(BEND * 0.3 * k), latFlex: r1(s * 4 * k) }; p.ch.spine_t12 = { rot: r1(r * 0.4), flex: r1(BEND * 0.3 * k), latFlex: r1(s * 3 * k) }; p.ch.spine_t6 = { rot: r1(r * 0.45), flex: 0, latFlex: 0 };
  p.ch.neck_c7 = { rot: r1(-r * 0.3), flex: r1(4 * k) }; p.ch.head_c1 = { rot: r1(-r * 0.2), flex: r1(4 * k) };
  p.ch.sc_r = { protract: 8, elevate: 2 }; p.ch.sc_l = { protract: 8, elevate: 2 };
  return p;
}
const GD = [[30, 80, 0, 10, 0], [60, 70, -30, 10, 90], [20, 60, 30, 5, -60], [0, 45, 0, 10, 0], [10, 40, 20, 10, 60], [40, 55, 10, 20, -30], [100, 60, 40, 20, 0], [120, 60, 60, 10, 30]];
let gR = GD.slice(), gL = GD.slice();
const poses = {}, err = [];
function solveAt(name, k, s) {
  const p = trunk(k, s), tip = k === 0 ? C : G.sphereArc(anchor, G.LM.R, C, SIDE[s > 0 ? 'r' : 'l'], k);
  const sh = X.unit(V.sub(anchor, tip)), gl = V.add(tip, V.scale(sh, GAP));
  const optR = { grip: 'handle', thumb: sh, wDir: 1.2, contacts: base.contacts, extra: [(W) => [Math.max(0, W.elbow_r.p[1] - W.shoulder_r.p[1] + 5) * 0.2]] };
  let q = G.armTo(p, tip, { ...optR, guesses: gR }); if (q.__err > 0.4) q = G.armTo(p, tip, { ...optR, guesses: [...gR, ...GD] });
  err.push(q.__err); if (process.env.DBG) console.log(name, "R", q.__err); delete q.__err; delete q.__cost; gR = [G.guessOf(q)];
  const q1 = q, optL = { grip: 'handle', thumb: sh, wDir: 1.2, contacts: base.contacts };
  q = X.armToL(q1, gl, { ...optL, guesses: gL }); if (q.__err > 0.4) q = X.armToL(q1, gl, { ...optL, guesses: [...gL, ...GD] });
  err.push(q.__err); if (process.env.DBG) console.log(name, "L", q.__err, JSON.stringify(q.ch.shoulder_l), q.ch.elbow_l.flex); delete q.__err; delete q.__cost; gL = [X.guessOfL(q)];
  poses[name] = X.unwrapArms(q, poses[prevName(name)]);
}
function prevName(n) { if (n === 'c') return null; const i = +n.slice(1); return i === 1 ? 'c' : `${n[0]}${i - 1}`; }
const KS = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1], NK = KS.length;
solveAt('c', 0, 1);
KS.forEach((k, i) => solveAt(`r${i + 1}`, k, 1));
gR = [G.guessOf(poses.c)]; gL = [X.guessOfL(poses.c)];
KS.forEach((k, i) => solveAt(`l${i + 1}`, k, -1));
const ph = (id) => meta.timeline.phases.find((p) => p.id === id), D = meta.timeline.duration;
const side = (id, s) => { const a = ph(id).start, b = ph(id).end, m = (a + b) / 2; const out = K.easeTimes(KS, a, m - 0.1).map((t, i) => ({ t, pose: `${s}${i + 1}` })); out.push({ t: +(m + 0.1).toFixed(3), pose: `${s}${NK}` }); K.easeTimes(KS.slice(0, -1), m + 0.1, b).forEach((t, i) => out.push({ t, pose: `${s}${NK - 1 - i}` })); out.push({ t: b, pose: 'c' }); return out; };
const keyframes = [{ t: 0, pose: 'c' }, { t: ph('setup').end, pose: 'c' }, ...side('right', 'r'), ...side('left', 'l'), { t: D, pose: 'c' }];
const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = G.landmineProps({ anchor });
ex.props[1].attach.with = 'wrist_l'; ex.props[1].params.plateAt = -26;
// loop: both hands on the sleeve (constant gap), on the bar's sphere, sleeve toward the pivot, bar clear of the body
const tl = R.buildTimeline(ex); let lm = { gap: [1e9, -1e9], dist: 0, kink: 0, clear: { d: 1e9 } };
const rep = K.scanHeld(ex, [], { probe: (W, pz, t) => {
  const r = EQ.gripPoint(W, 'r', 'handle').p, l = EQ.gripPoint(W, 'l', 'handle').p, gap = V.len(V.sub(r, l));
  lm.gap = [Math.min(lm.gap[0], gap), Math.max(lm.gap[1], gap)];
  lm.dist = Math.max(lm.dist, Math.abs(V.len(V.sub(anchor, r)) - G.LM.R));
  lm.kink = Math.max(lm.kink, V.angle(V.sub(r, l), V.sub(r, anchor)) ? 180 - V.angle(V.sub(l, r), V.sub(r, anchor)) : 0);
  const caps = [[anchor, l, 1.4, 'shaft']], discs = [{ c: V.add(r, V.scale(X.unit(V.sub(anchor, r)), 26 + 4.5)), ax: X.unit(V.sub(anchor, r)), r: G.LM.plateD / 2, w: 5 }];
  const c = G.geomClear(W, { caps, discs }, /^(hand|thumb|forearm)_/); if (c.d < lm.clear.d) lm.clear = { ...c, d: r1(c.d), t: +t.toFixed(2) };
} });
const fails = [];
if (Math.max(...err) > 0.8) fails.push(`hands off their grip points (${Math.max(...err)} cm)`);
if (lm.gap[1] - lm.gap[0] > 1.5) fails.push(`hands drift on the sleeve ${lm.gap.map(r1)}`);
if (lm.dist > 1.5) fails.push(`bar end off its arc ${r1(lm.dist)}`);
if (lm.clear.d < 0) fails.push(`bar into the body ${JSON.stringify(lm.clear)}`);
if (rep.slide > 0.05) fails.push('feet slide');
if (rep.floor < -0.5) fails.push('below the floor');
const Wc = L.fk(poses.c, base.contacts), Wr = L.fk(poses[`r${NK}`], base.contacts);
const yawOf = (W) => Math.round(Math.atan2(W.shoulder_r.p[0] - W.shoulder_l.p[0], W.shoulder_r.p[2] - W.shoulder_l.p[2]) / R.DEG);
const set = H.setKin(ex);
set('Trunk rotation', 'setup', 'Square to the bar, hands in front of the chest'); set('Trunk rotation', 'peak', `Shoulder line turned ≈${Math.abs(yawOf(Wr))}° toward each side (pelvis ≈${YAW}°, the rest through the trunk); feet planted ${ENV('W', 44)} cm apart`);
set('Bar arc', 'setup', `Bar end ${Math.round(C[1])} cm high in front of the chest, ${Math.round(V.len(V.sub(C, Wc.shoulder_r.p)))} cm from the right shoulder`); set('Bar arc', 'peak', `Down to ${Math.round(SIDE.r[1])} cm beside each hip, ${Math.round(Math.abs(SIDE.r[2]))} cm out from the midline`);
set('Arms', 'setup', `Elbows ≈${Math.round(K.elbowAng(Wc))}°`); set('Arms', 'peak', `≈${Math.round(K.elbowAng(Wr))}° at the hip (arms stay long)`);
set('Tempo', 'setup', `${ph('setup').end} s set`); set('Tempo', 'peak', `${r1((ph('right').end - ph('right').start) / 2)} s to each hip, the same back`);
console.log(`Landmine 180: wrote ${L.write(ex)}\n  anchor ${anchor.map(r1)} C ${C} side ${SIDE.r.map(r1)} err ${Math.max(...err)} yaw ${yawOf(Wr)}\n  loop ${JSON.stringify({ gap: lm.gap.map(r1), dist: r1(lm.dist), kink: r1(lm.kink), clear: lm.clear, floor: rep.floor, slide: rep.slide, jump: rep.jump })}`);
X.report(ID, fails);
