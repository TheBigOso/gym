// Dumbbell Standing Hands Torsion (GymVisual 17299, male; movement reference only, the page could not be read, so the
// movement follows the name and a written description of the same catalog exercise): standing tall, feet hip width
// (planted leg contacts). One dumbbell is held in front of the belly in both hands, the right fist on the lower
// half of the handle and the left fist stacked above it (as in dumbbell-halo), elbows bent and close to the ribs, forearms
// angled a little down and the handle square to them, wrists straight. Turning
// only through the forearms and wrists, the dumbbell is rotated about the forearm line so its top tips out to the right,
// back through upright and out to the left, like turning a steering wheel; the upper arms, trunk and shoulders stay
// quiet. Bilateral (both directions every loop; the fists are stacked right-under-left).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const G = require('./families/b6-07');
const meta = require('./meta/dumbbell-standing-hands-torsion.json');

const ID = 'dumbbell-standing-hands-torsion';
const WW = +(process.env.WW || 0.06);
const STACK = 4.2, TILT = +(process.env.TILT || 42);
const base = F.standing({ stance: 12, knee: 6 });
const P0 = clone(base.pose); P0.ch.sc_r = { protract: 3, elevate: 0 }; P0.ch.sc_l = { protract: 3, elevate: 0 };
const W0 = L.fk(P0, base.contacts), S = W0.shoulder_r.p;
const CX = +(process.env.CX || 32), CY = +(process.env.CY || 32), AY = +(process.env.AY || 0.45);
const C0 = [r1(S[0] + CX), r1(S[1] - CY), 0];      // dumbbell centre in front of the lower belly
// the forearm line: from the elbows (by the ribs) to the hands; the dumbbell turns about it
const AXF = V.norm([1, -AY, 0]);
const rot = (v, ax, th) => { const a = th * G.D2R, c = Math.cos(a), s = Math.sin(a); return V.add(V.add(V.scale(v, c), V.scale(V.cross(ax, v), s)), V.scale(ax, V.dot(ax, v) * (1 - c))); };
const up0 = V.norm(V.sub([0, 1, 0], V.scale(AXF, V.dot([0, 1, 0], AXF)))); // the handle at rest: upright, square to the forearms
// th > 0 tips the top of the dumbbell to the right
const handle = (th) => rot(up0, AXF, th);
const ER = V.add(S, [+(process.env.EX || 3), -L.UA * 0.88, -5]); // elbow by the ribs, a little forward
const ANG = { c0: 0, r1: TILT / 3, r2: (2 * TILT) / 3, r3: TILT, l1: -TILT / 3, l2: (-2 * TILT) / 3, l3: -TILT };
const poses = {}, err = {};
let gR = { plane: 70, elev: 22, axial: 10, flex: 80, pron: 80 }, gL = { ...gR };
const solve = (n) => {
  const a = handle(ANG[n]), gpR = V.sub(C0, V.scale(a, STACK)), gpL = V.add(C0, V.scale(a, STACK));
  const r = G.fist(P0, gpR, a, ER, gR, 'r', { wWrist: WW, wUp: 5 }); gR = G.gOf(r.q, 'r');
  const l = G.fist(r.q, gpL, a, G.mz(ER), gL, 'l', { wWrist: WW, wUp: 5 }); gL = G.gOf(l.q, 'l');
  { const W = L.fk(l.q), e = (s, g) => +V.len(V.sub(V.add(W[`wrist_${s}`].p, L.Q.rot(W[`wrist_${s}`].q, G.GRIP_PT)), g)).toFixed(2); err[n] = [r.cost, l.cost, e('r', gpR), e('l', gpL)]; }
  poses[n] = l.q;
};
for (const n of ['c0', 'r1', 'r2', 'r3']) solve(n);
gR = G.gOf(poses.c0, 'r'); gL = G.gOf(poses.c0, 'l');
for (const n of ['l1', 'l2', 'l3']) solve(n);
poses.r3h = clone(poses.r3); poses.l3h = clone(poses.l3);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'c0' }, ...G.timesEven(ph.right.start, ph.right.end, ['c0', 'r1', 'r2', 'r3']), { t: ph.holdR.end, pose: 'r3h' },
  ...G.timesEven(ph.left.start, ph.left.end, ['r3h', 'r2', 'r1', 'c0', 'l1', 'l2', 'l3']).slice(1), { t: ph.holdL.end, pose: 'l3h' },
  ...G.timesEven(ph.back.start, ph.back.end, ['l3h', 'l2', 'l1', 'c0']).slice(1), { t: D, pose: 'c0' }];
const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [G.STACK_PROP()];
const SIZE = ex.props[0].size, OFF = ex.props[0].attach.offset;
const held = [{ side: 'r', grip: 'handle', offset: OFF, size: SIZE, skip: ['hand_r', 'thumb_r', 'forearm_r', 'hand_l', 'thumb_l', 'forearm_l'] }];
// the left fist stays on the upper half of the handle
const GK = K.gripKey('handle', OFF), DB = require('./families/dumbbell');
let fistErr = 0, elbowDrift = 0;
const Wc = L.fk(poses.c0, base.contacts);
const rep = K.scanHeld(ex, held, { probe: (W) => {
  const d = DB.dumbbellAt(W, 'r', GK), gl = V.add(W.wrist_l.p, L.Q.rot(W.wrist_l.q, G.GRIP_PT));
  fistErr = Math.max(fistErr, V.len(V.sub(gl, V.add(d.c, V.scale(d.ax, V.dot(V.sub(gl, d.c), d.ax))))), Math.abs(V.dot(V.sub(gl, d.c), d.ax) - STACK) > 1.2 ? 9 : 0);
  elbowDrift = Math.max(elbowDrift, V.len(V.sub(W.elbow_r.p, Wc.elbow_r.p)), V.len(V.sub(W.elbow_l.p, Wc.elbow_l.p)));
} });
F.gate(ID, rep, { maxJump: 5 });
require('./families/eq-cable').limits(poses);
if (fistErr > 1.5) { console.error(`FAIL ${ID}: left fist off the handle ${fistErr.toFixed(2)} cm`); process.exitCode = 1; }
const Wr = L.fk(poses.r3, base.contacts), Wl = L.fk(poses.l3, base.contacts), set = H.setKin(ex);
const tilt = (W) => { const d = DB.dumbbellAt(W, 'r', GK).ax; return Math.atan2(d[2], d[1]) / G.D2R; };
set('Dumbbell tilt', 'setup', `Upright (${G.deg(tilt(Wc))} from vertical, seen from the front)`); set('Dumbbell tilt', 'peak', `${G.deg(tilt(Wr))} to the right and ${G.deg(-tilt(Wl))} to the left`);
set('Forearm rotation', 'setup', `Right ${G.deg(poses.c0.ch.wrist_r.pron)}, left ${G.deg(poses.c0.ch.wrist_l.pron)} (pron channel, 90 = thumb up)`);
set('Forearm rotation', 'peak', `Right ${G.deg(poses.r3.ch.wrist_r.pron)} to ${G.deg(poses.l3.ch.wrist_r.pron)}, left ${G.deg(poses.r3.ch.wrist_l.pron)} to ${G.deg(poses.l3.ch.wrist_l.pron)}`);
set('Elbows', 'setup', `Bent ${G.deg(G.elbowAng(Wc))}, by the ribs`); set('Elbows', 'peak', `Move at most ${r1(elbowDrift)} cm over the loop`);
set('Tempo', 'setup', 'Pause 0.5 s upright'); set('Tempo', 'peak', '1 s out to each side, 0.4 s hold, 2 s across');
console.log(`Dumbbell Standing Hands Torsion: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} fist ${fistErr.toFixed(2)} elbowDrift ${elbowDrift.toFixed(1)}\n  wrists r ${['l3', 'c0', 'r3'].map((n) => JSON.stringify(poses[n].ch.wrist_r))} l ${['l3', 'c0', 'r3'].map((n) => JSON.stringify(poses[n].ch.wrist_l))}`);
