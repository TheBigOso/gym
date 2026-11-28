// Leg Over Knee Glute Bridge (GymVisual #10854, page not readable; movement from the name): figure-4 single-leg bridge,
// authored on the right (the player mirrors). Supine, right foot flat (planted leg contact), left outer ankle resting on the
// right thigh just above the knee (left hip flexed, abducted and turned out). Press through the right heel and lift the
// pelvis until the right knee, hip and shoulder line up, squeeze, lower. Pelvis kept level. The author-glute-bridge.js
// solve via b6-14 makeBridge; the crossed left leg is FK, re-solved at every key so the shank rests on the right thigh
// (capsule gap about 0.3 cm, clear of the quadriceps) with the crossing point near the knee.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const X = require('./families/b6-14');
const meta = require('./meta/leg-over-knee-glute-bridge.json');

const Bq = X.makeBridge({ kneeTop: 90 });
const shape = (id) => rig.shapes.find((s) => s.id === id);
// segment-segment closest points
function segSeg(p1, q1, p2, q2) {
  const d1 = V.sub(q1, p1), d2 = V.sub(q2, p2), r = V.sub(p1, p2), a = V.dot(d1, d1), e = V.dot(d2, d2), f = V.dot(d2, r);
  let s, t; const c = V.dot(d1, r), b = V.dot(d1, d2), den = a * e - b * b;
  s = den > 1e-9 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0; t = (b * s + f) / e;
  if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
  const c1 = V.add(p1, V.scale(d1, s)), c2 = V.add(p2, V.scale(d2, t));
  return { d: V.len(V.sub(c1, c2)), s, t };
}
function capGap(W, A, Bid) { // surface gap between two capsules (radius interpolated at the closest points)
  const ga = R.shapeWorld(W, shape(A)), gb = R.shapeWorld(W, shape(Bid)), k = segSeg(ga.a, ga.b, gb.a, gb.b);
  return { gap: k.d - (ga.r[0] + (ga.r[1] - ga.r[0]) * k.s) - (gb.r[0] + (gb.r[1] - gb.r[0]) * k.t), s: k.s, t: k.t };
}
function ellGap(W, capId, ellId) { // approx: the shank axis vs an ellipsoid inflated by the shank radius
  const g = R.shapeWorld(W, shape(capId)), e = R.shapeWorld(W, shape(ellId)); let m = 1e9;
  for (let i = 0; i <= 10; i++) { const u = i / 10, p = V.add(g.a, V.scale(V.sub(g.b, g.a), u)), r = g.r[0] + (g.r[1] - g.r[0]) * u;
    const d = V.sub(p, e.c), n = Math.sqrt(e.axes.reduce((acc, ax) => { const L2 = V.dot(ax, ax); return acc + (V.dot(d, ax) / L2) ** 2 * L2 / (L2 + 2 * r * Math.sqrt(L2) + r * r); }, 0));
    const rm = Math.min(...e.axes.map((ax) => V.len(ax))); m = Math.min(m, (n - 1) * (rm + r)); }
  return m;
}
const LP = ['ch.hip_l.flex', 'ch.hip_l.abd', 'ch.hip_l.rot', 'ch.knee_l.flex', 'ch.ankle_l.dorsi'];
const legR = Bq.contacts.filter((c) => c.id === 'leg_r');
let prev = { hip: { flex: 75, abd: 35, rot: 30 }, knee: { flex: 100 }, ankle: { dorsi: -5 } };
function cross(f, seeds = [prev]) {
  let best = null;
  for (const sd of seeds) { prev = sd; const r = cross1(f); if (!best || r.__c < best.__c) best = r; }
  prev = { hip: clone(best.ch.hip_l), knee: clone(best.ch.knee_l), ankle: clone(best.ch.ankle_l) };
  return best;
}
function cross1(f) {
  let p = Bq.poseAt(f, { lift: { s: 'l', ch: prev } });
  const ik = { leg_r: p.ik.leg_r };
  const q0 = clone(p); q0.ik = ik;
  const s = L.solvePose(q0, LP, [
    (W) => { const c = capGap(W, 'shank_l', 'thigh_r'); return [(c.gap - 0.3) * 4, (c.t - 0.82) * 6]; },   // shank rests on the thigh, crossing near the knee
    (W) => [Math.min(0, ellGap(W, 'shank_l', 'quad_r') - 0.2) * 4],
    (W) => { const sh = V.norm(V.sub(W.ankle_l.p, W.knee_l.p)), th = V.norm(V.sub(W.knee_r.p, W.hip_r.p)); return [V.dot(sh, th) * 2, (sh[2] - 0.75) * 1]; }, // shin across the thigh, pointing to the right side
    (W, q) => [(q.ch.hip_l.abd - 35) * 0.15, (q.ch.knee_l.flex - 105) * 0.05, (q.ch.ankle_l.dorsi + 5) * 0.05, Math.max(0, q.ch.hip_l.rot - 38) * 3, Math.max(0, -38 - q.ch.hip_l.rot) * 3, Math.max(0, q.ch.hip_l.abd - 43) * 3, Math.max(0, -18 - q.ch.hip_l.flex) * 3, Math.max(0, -23 - q.ch.hip_l.abd) * 3, Math.max(0, 2 - q.ch.knee_l.flex) * 3, Math.max(0, q.ch.hip_l.flex - 135) * 3, Math.max(0, q.ch.knee_l.flex - 145) * 3],
  ], { iters: 400, contacts: legR });
  prev = { hip: clone(s.pose.ch.hip_l), knee: clone(s.pose.ch.knee_l), ankle: clone(s.pose.ch.ankle_l) };
  p = Bq.poseAt(f, { lift: { s: 'l', ch: prev } });
  p.__c = s.cost;
  return p;
}
const F = { lie: 0, u25: 0.25, u50: 0.5, u75: 0.75, top: 1, squeeze: 1.03, d75: 0.75, d50: 0.5, d25: 0.25, touch: 0.03 };
const poses = {}, costs = {};
const SEEDS = [];
for (const fl of [70, 100]) for (const ab of [15, 35]) for (const ro of [-30, 30]) for (const kn of [90, 115]) SEEDS.push({ hip: { flex: fl, abd: ab, rot: ro }, knee: { flex: kn }, ankle: { dorsi: -5 } });
poses.lie = cross(0, SEEDS); costs.lie = +poses.lie.__c.toFixed(3); delete poses.lie.__c;
for (const [n, f] of Object.entries(F)) { if (n === 'lie') continue; poses[n] = cross(f); costs[n] = +poses[n].__c.toFixed(3); delete poses[n].__c; }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.2, pose: 'u25' }, { t: 1.6, pose: 'u50' }, { t: 1.95, pose: 'u75' }, { t: 2.3, pose: 'top' }, { t: 2.8, pose: 'squeeze' }, { t: 3.3, pose: 'top' },
  { t: 3.8, pose: 'd75' }, { t: 4.3, pose: 'd50' }, { t: 4.8, pose: 'd25' }, { t: 5.3, pose: 'touch' }, { t: 5.6, pose: 'lie' }, { t: 6.0, pose: 'lie' }];
X.wrapPoses(poses);
const ex = H.module_(meta, Bq.contacts, poses, keyframes);
const rep = H.loopReport(ex, { planted: ['leg_r', 'arm_r', 'arm_l'] });
const tl = R.buildTimeline(ex); let gap = [1e9, -1e9], qg = 1e9;
for (let i = 0; i <= 400; i++) { const W = R.evalPose(rig, tl.pose((i / 400) * 6), ex.contacts); const c = capGap(W, 'shank_l', 'thigh_r'); gap = [Math.min(gap[0], c.gap), Math.max(gap[1], c.gap)]; qg = Math.min(qg, ellGap(W, 'shank_l', 'quad_r')); }
const Wl = L.fk(poses.lie, Bq.contacts), Wt = L.fk(poses.top, Bq.contacts);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `Right ≈${Math.round(poses.lie.ch.hip_r.flex)}° (lying)`); set('Hip flexion', 'peak', `Right ≈${Math.round(poses.top.ch.hip_r.flex)}° (line ${Math.round(Bq.lineAt(Wt))}°)`);
set('Knee flexion', 'setup', `Right ≈${Math.round(H.kneeOf(Wl, 'r'))}°`); set('Knee flexion', 'peak', `Right ≈${Math.round(H.kneeOf(Wt, 'r'))}° at the top`);
const lc = poses.top.ch;
set('Crossed leg', 'setup', `Left hip flex ${Math.round(poses.lie.ch.hip_l.flex)}°, abduction ${Math.round(poses.lie.ch.hip_l.abd)}°, rotation ${Math.round(poses.lie.ch.hip_l.rot)}°, knee ${Math.round(poses.lie.ch.knee_l.flex)}°`); set('Crossed leg', 'peak', `At the top: hip flex ${Math.round(lc.hip_l.flex)}°, abduction ${Math.round(lc.hip_l.abd)}°, rotation ${Math.round(lc.hip_l.rot)}°, knee ${Math.round(lc.knee_l.flex)}°; shin resting on the right thigh (gap ${gap[0].toFixed(1)} to ${gap[1].toFixed(1)} cm)`);
set('Hip height', 'setup', `Hip joint ${r1(Wl.hip_r.p[1])} cm above the floor`); set('Hip height', 'peak', `${r1(Wt.hip_r.p[1])} cm (+${r1(Wt.hip_r.p[1] - Wl.hip_r.p[1])} cm)`);
set('Tempo', 'setup', 'Lying 0.8 s'); set('Tempo', 'peak', '1.5 s up, 1.0 s squeeze, 2.0 s down, 0.7 s reset');
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'rootTravel', 2);
console.log(`Leg Over Knee Glute Bridge: feet x ${Bq.AX}, roll ${Bq.DP_TOP}° wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} shank-thigh gap ${gap.map((v) => v.toFixed(2))} quad gap min ${qg.toFixed(2)} travel ${pk.toFixed(1)}\n  costs ${JSON.stringify(costs)}\n  lie L ${JSON.stringify({ h: poses.lie.ch.hip_l, k: poses.lie.ch.knee_l, a: poses.lie.ch.ankle_l })} top L ${JSON.stringify({ h: lc.hip_l, k: lc.knee_l, a: lc.ankle_l })}`);
X.finishChecks(ex, 'leg-over-knee-glute-bridge', rep);
if (gap[0] < -0.8 || gap[1] > 1.5) { console.error('FAIL: crossed shank off the thigh'); process.exitCode = 1; }
