// Dumbbell Wood Chop (GymVisual 18794, male; movement reference only, the page could not be read, so the movement follows
// the name and standard coaching): high-to-low chop. Feet a little wider than the hips (planted leg contacts). One
// dumbbell held across the body between the flat palms on its end plates (two-hand item, as in the dumbbell Svend press).
// Start with the dumbbell up above the right shoulder, arms long, trunk turned to the right; chop it down diagonally
// across the body to the left knee on an arc at about arm's length, turning the trunk and hips to the left and bending the knees into a
// partial squat; then lift it back up the same diagonal under control. Authored right (high on the right, low on the
// left); the player mirrors for the other side.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const B5 = require('./families/b5-bandcore');
const M = require('./families/b5-misc');
const G = require('./families/b6-07');
const meta = require('./meta/dumbbell-wood-chop.json');

const ID = 'dumbbell-wood-chop';
const GZ = 15; // grip points 30 cm apart: palms on the end plates
const ease = (f) => f * f * (3 - 2 * f);
const lerp = (a, b, f) => a + (b - a) * f;
const TOP = JSON.parse(process.env.TOP || '[22, 32, 30]'), BOT = JSON.parse(process.env.BOT || '[20, -50, -14]'); // dumbbell centre relative to the mid-shoulder point
// body along the chop: u = 0 (top, turned right) .. 1 (bottom, turned left, partial squat)
function bodyAt(u) {
  return G.turnStand({ stance: 19, toe: 12, knee: lerp(6, +(process.env.KB || 52), u), kneeSide: 'min', yaw: lerp(14, -16, u), pitch: lerp(0, +(process.env.PB || -36), u), rot: lerp(22, -30, u), lat: lerp(-6, 8, u), flex: lerp(0, 6, u), shiftZ: lerp(0, -3, u), sc: { protract: r1(lerp(4, 10, u)), elevate: r1(lerp(14, 2, u)) } });
}
const b0 = bodyAt(0);
const midSh = (W) => V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5);
const RAD = +(process.env.RAD || 50); // the dumbbell travels on an arc at about arm's length from the mid-shoulder point
const slerp = (a, b, f) => { const d = Math.max(-1, Math.min(1, V.dot(a, b))), th = Math.acos(d), sn = Math.sin(th); return V.norm(V.add(V.scale(a, Math.sin((1 - f) * th) / sn), V.scale(b, Math.sin(f * th) / sn))); };
const cAt = (u, W) => { const k = ease(u), dir = slerp(V.norm(TOP), V.norm(BOT), k); return V.add(midSh(W), V.scale(dir, RAD)); };
// handle axis (left grip -> right grip): world +Z made square to the line from the chest to the dumbbell
const axAt = (u, W) => { const ch = V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5), d = V.norm(V.sub(cAt(u, W), ch)); return V.norm(V.sub([0, 0, 1], V.scale(d, d[2]))); };
// best of the chained guess and a few fixed seeds (the right arm passes from overhead on the right to low across the body)
const SEEDS = [{ plane: 40, elev: 140, axial: -40, pron: 90, flex: 20 }, { plane: 90, elev: 100, axial: -20, pron: 90, flex: 20 }, { plane: 115, elev: 70, axial: 0, pron: 90, flex: 20 }, { plane: 130, elev: 50, axial: 20, pron: 60, flex: 30 }];
function bestSide(pose, contacts, side, spec, prev) {
  let best = null;
  const tryG = (g) => {
    const q = B5.armSide(pose, contacts, side, { ...spec, guess: g }), e = q.__err;
    const ch = q.ch[`shoulder_${side}`], ok = ch.plane >= -60 && ch.plane <= 140 && ch.elev >= 0 && ch.elev <= 210;
    const jumpD = Math.abs(ch.plane - prev.plane) + Math.abs(ch.elev - prev.elev) + Math.abs(ch.axial - prev.axial) + Math.abs(q.ch[`wrist_${side}`].pron - prev.pron);
    const sc = e.cost + (ok ? 0 : 50) + 0.01 * jumpD;
    if (!best || sc < best.sc) best = { q, sc, cost: e.cost, ok };
  };
  tryG(prev);
  if (!best.ok || best.cost > 0.3) for (const g of SEEDS) tryG(g);
  return best.q;
}
const N = +(process.env.N || 16), poses = {}, err = {};
let gR = { plane: 40, elev: 140, axial: -40, pron: 90, flex: 20 }, gL = { plane: 100, elev: 120, axial: -60, pron: 90, flex: 30 };
for (let i = 0; i <= N; i++) {
  const u = i / N, b = bodyAt(u), W = L.fk(b.pose, b.contacts), c = cAt(u, W), ax = axAt(u, W);
  // fingers point along the arms (from the shoulders toward the dumbbell): the thumb axis is square to them and the handle
  const thumb = V.norm(V.cross(ax, V.norm(V.sub(c, midSh(W)))));
  const gripR = V.add(c, V.scale(ax, GZ)), gripL = V.sub(c, V.scale(ax, GZ));
  const sR = { grip: gripR, palm: V.scale(ax, -1), wPalm: 5, axis: thumb, wGrip: 4, guess: gR };
  let p = bestSide(b.pose, b.contacts, 'r', sR, gR); const eR = p.__err; gR = C.guessOf(p); delete p.__err;
  const m = B5.mz;
  const sL = { grip: gripL, palm: ax, wPalm: 5, axis: thumb, wGrip: 4, guess: gL }; // armSide mirrors world targets itself
  p = bestSide(p, b.contacts, 'l', sL, gL); const eL = p.__err; delete p.__err;
  gL = { plane: p.ch.shoulder_l.plane, elev: p.ch.shoulder_l.elev, axial: p.ch.shoulder_l.axial, pron: p.ch.wrist_l.pron, flex: p.ch.elbow_l.flex };
  poses[`c${i}`] = p; err[`c${i}`] = [eR.grip, eL.grip];
}
poses.topH = clone(poses.c0); poses.botH = clone(poses[`c${N}`]);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const names = Array.from({ length: N + 1 }, (_, i) => `c${i}`);
const keyframes = [{ t: 0, pose: 'c0' }, ...G.timesEven(ph.chop.start, ph.chop.end, names), { t: ph.hold.end, pose: 'botH' },
  ...G.timesEven(ph.lift.start, ph.lift.end, ['botH', ...names.slice(0, N).reverse()]).slice(1), { t: D, pose: 'c0' }];
keyframes.forEach((k, i) => { if (k.pose === 'c0' && i > 2 && i < keyframes.length - 1) k.pose = 'topH'; });
const ex = H.module_(meta, b0.contacts, poses, keyframes);
ex.props = [{ id: 'db', kind: 'dumbbell', size: [32, 12, 12], attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' } }];
let clr = { d: 1e9 }, gap = [999, -999];
const rep = C.scan(ex, {});
H.loopReport(ex, { probe: (W, pz, t) => { const c = M.twoHandDbClear(W); if (c.d < clr.d) clr = { ...c, t: +t.toFixed(2) }; const gg = M.twoHandDb(W).gripGap; gap = [Math.min(gap[0], gg), Math.max(gap[1], gg)]; } });
C.gate(ID, rep, { maxJump: 5 });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (clr.d < -0.3) fail(`dumbbell into the body ${JSON.stringify(clr)}`);
if (gap[1] - gap[0] > 1.5) fail(`grip gap changes ${gap.map(r1)}`);
const BC = B5.MEASURE.kneeFlexion;
let pk = 0; H.loopReport(ex, { probe: (W) => { pk = Math.max(pk, BC(W)); } });
ex.checks.measure = { name: 'kneeFlexion', min: Math.floor(pk - 6), max: Math.ceil(pk + 6) };
const Wt = L.fk(poses.c0, b0.contacts), Wb = L.fk(poses[`c${N}`], b0.contacts), set = H.setKin(ex);
const shTurn = (W) => { const d = V.sub(W.shoulder_r.p, W.shoulder_l.p); return Math.atan2(-d[0], d[2]) / G.D2R; }; // + = shoulders turned to the right
set('Trunk rotation', 'setup', `Shoulders turned ${G.deg(shTurn(Wt))} to the right (dumbbell high on the right)`); set('Trunk rotation', 'peak', `${G.deg(-shTurn(Wb))} to the left at the bottom`);
set('Knee flexion', 'setup', `${G.deg(H.kneeOf(Wt, 'r'))} R / ${G.deg(H.kneeOf(Wt, 'l'))} L`); set('Knee flexion', 'peak', `${G.deg(H.kneeOf(Wb, 'r'))} R / ${G.deg(H.kneeOf(Wb, 'l'))} L (partial squat; peak ${r1(pk)}°)`);
set('Dumbbell path', 'setup', `Above the right shoulder, ${Math.round(M.twoHandDb(Wt).c[1])} cm up`); set('Dumbbell path', 'peak', `Down by the left knee, ${Math.round(M.twoHandDb(Wb).c[1])} cm up (${Math.round(V.len(V.sub(M.twoHandDb(Wt).c, M.twoHandDb(Wb).c)))} cm diagonal)`);
set('Elbows', 'setup', `${G.deg(G.elbowAng(Wt, 'r'))} R / ${G.deg(G.elbowAng(Wt, 'l'))} L`); set('Elbows', 'peak', `${G.deg(G.elbowAng(Wb, 'r'))} R / ${G.deg(G.elbowAng(Wb, 'l'))} L (arms long)`);
set('Tempo', 'setup', 'Pause 0.5 s at the top'); set('Tempo', 'peak', '1 s chop down, 0.3 s at the bottom, 1.8 s back up');
console.log(`Dumbbell Wood Chop: wrote ${L.write(ex)}\n  grip err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}\n  db clear ${JSON.stringify(clr)} gap ${gap.map(r1)} knee peak ${r1(pk)}`);
