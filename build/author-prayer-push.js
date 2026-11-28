// Prayer Push (GymVisual #11010, page not readable; online descriptions differ, the standing palm press is authored): standing
// tall, feet planted (leg contacts), palms pressed together in front of the chest with the fingers up and the elbows out;
// squeeze the palms hard and push them straight forward at chest height until the arms are almost straight (the fingers turn
// forward), hold the squeeze, then draw them back. Bilateral. Arms are FK (no contacts): the right arm is solved for the
// wrist point, the palm facing the midline (hand shape just touching z = 0) and the finger direction; the left arm mirrors it.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const X = require('./families/b6-14');
const meta = require('./meta/prayer-push.json');

const S = L.POSES.standing(), contacts = S.contacts, base = clone(S.pose);
const W0 = L.fk(base, contacts);
const CH_Y = r1((W0.shoulder_r.p[1] + W0.neck_c7.p[1]) / 2 - 8);    // hands at lower-chest height
const Wp = (() => { const q = clone(base); q.ch.sc_r = { protract: 10, elevate: 0 }; return L.fk(q, contacts); })();   // shoulder blades protracted at arm length
const dy = CH_Y - Wp.shoulder_r.p[1], dz = Wp.shoulder_r.p[2] - 2.8;
const X0 = r1(W0.shoulder_r.p[0] + 24), X1 = r1(Wp.shoulder_r.p[0] + Math.sqrt(L.reach(16) ** 2 - dy * dy - dz * dz)); // at the chest / almost straight arms (elbow ~16)
const cj = (q) => [-q[0], -q[1], -q[2], q[3]];
const F_LOC = Q.rot(cj(L.handRotR), [1, 0, 0]), N_LOC = Q.rot(cj(L.handRotR), [0, -1, 0]);  // hand-local finger axis, palm normal
const handMinZ = (W) => { const g = R.shapeWorld(W, rig.shapes.find((s) => s.id === 'hand_r')); return g.c[2] - Math.hypot(g.axes[0][2], g.axes[1][2], g.axes[2][2]); };
const PATHS = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
const lim = (q) => PATHS.map((p) => { const [, j, c] = p.split('.'), l = rig.byId[j].limits && rig.byId[j].limits[c], v = L.getPath(q, p) ?? 0; return l ? (Math.max(0, l[0] + 2 - v) + Math.max(0, v - l[1] + 2)) * 20 : 0; });
let prev = { shoulder_r: { plane: 70, elev: 60, axial: 40 }, elbow_r: { flex: 110 }, wrist_r: { pron: 0, flex: -40, dev: 0 } };
// u: 0 at the chest, 1 at arm length
function arms(u) {
  const x = X0 + (X1 - X0) * u, fing = V.norm([Math.sin(u * 75 * R.DEG), Math.cos(u * 75 * R.DEG), 0]);
  let best = null;
  for (const g of [prev, { shoulder_r: { plane: 80, elev: 70, axial: 30 }, elbow_r: { flex: 120 - 100 * u }, wrist_r: { pron: 10, flex: -50, dev: 0 } }, { shoulder_r: { plane: 60, elev: 80, axial: 60 }, elbow_r: { flex: 110 - 90 * u }, wrist_r: { pron: -20, flex: -30, dev: 0 } }]) {
    const q0 = clone(base); Object.assign(q0.ch, clone(g)); q0.ch.sc_r = { protract: r1(2 + 8 * u), elevate: 0 };
    const s = L.solvePose(q0, PATHS, [
      (W) => [(W.wrist_r.p[0] - x) * 2, (W.wrist_r.p[1] - CH_Y) * 2, (handMinZ(W) - 0.15) * 3],
      (W) => [...V.sub(Q.rot(W.wrist_r.q, F_LOC), fing).map((v) => v * 4), ...V.sub(Q.rot(W.wrist_r.q, N_LOC), [0, 0, -1]).map((v) => v * 4)],
      (W, q) => [(q.ch.shoulder_r.axial - 30) * 0.004, q.ch.wrist_r.dev * 0.01, ...lim(q)],
    ], { iters: 500, contacts });
    if (!best || s.cost < best.cost) best = s;
  }
  const p = best.pose; prev = { shoulder_r: clone(p.ch.shoulder_r), elbow_r: clone(p.ch.elbow_r), wrist_r: clone(p.ch.wrist_r) };
  for (const j of ['shoulder', 'elbow', 'wrist']) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]);
  p.ch.sc_l = clone(p.ch.sc_r);
  p.__c = best.cost;
  return p;
}
const ph = meta.timeline.phases.map((p) => p.end), D = meta.timeline.duration; // setup, push, squeeze, return, reset
const poses = {}, costs = {}, keyframes = [];
const add = (t, n, u) => { if (u != null) { poses[n] = arms(u); costs[n] = +poses[n].__c.toFixed(3); delete poses[n].__c; } keyframes.push({ t: +t.toFixed(3), pose: n }); };
add(0, 'chest', 0); add(ph[0], 'chest');
const N = 5;
for (let i = 1; i < N; i++) add(ph[0] + ((ph[1] - ph[0]) * i) / N, `out${i}`, X.ease(i / N));
add(ph[1], 'out', 1); add((ph[1] + ph[2]) / 2, 'outHold', 0.985); add(ph[2], 'out');
for (let i = 1; i < N; i++) add(ph[2] + ((ph[3] - ph[2]) * i) / N, `out${N - i}`);
add(ph[3], 'chest'); add(D, 'chest');
X.wrapPoses(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [];
const tl = R.buildTimeline(ex); let zMin = 1e9, zMax = -1e9;
for (let i = 0; i <= 300; i++) { const W = R.evalPose(rig, tl.pose((i / 300) * D), contacts); const z = handMinZ(W); zMin = Math.min(zMin, z); zMax = Math.max(zMax, z); }
const Wc = L.fk(poses.chest, contacts), Wo = L.fk(poses.out, contacts), mc = R.measures(Wc), mo = R.measures(Wo);
const set = H.setKin(ex);
set('Palm squeeze', 'setup', `Palms together at the chest (hand surfaces ${zMin.toFixed(1)} to ${zMax.toFixed(1)} cm from the midline)`); set('Palm squeeze', 'peak', 'Unchanged through the push');
set('Elbow flexion', 'setup', `≈${Math.round(mc.elbowR)}° at the chest`); set('Elbow flexion', 'peak', `≈${Math.round(mo.elbowR)}° at arm length`);
set('Shoulder flexion', 'setup', `Hands ${r1(Wc.wrist_r.p[0] - Wc.shoulder_r.p[0])} cm in front of the shoulders`); set('Shoulder flexion', 'peak', `${r1(Wo.wrist_r.p[0] - Wo.shoulder_r.p[0])} cm in front, at ${r1(CH_Y)} cm height`);
set('Tempo', 'setup', `${ph[0]} s set`); set('Tempo', 'peak', `${r1(ph[1] - ph[0])} s push, ${r1(ph[2] - ph[1])} s squeeze, ${r1(ph[3] - ph[2])} s return`);
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'trunkFlexion', 2);
const sw = H.loopReport(ex, { planted: ['leg_r', 'leg_l'] });
console.log(`Prayer Push: wrote ${L.write(ex)}\n  costs ${JSON.stringify(costs)} handZ ${zMin.toFixed(2)}..${zMax.toFixed(2)} elbow ${mc.elbowR.toFixed(0)} -> ${mo.elbowR.toFixed(0)}\n  ${JSON.stringify(sw)}\n  chest ${JSON.stringify({ sh: poses.chest.ch.shoulder_r, el: poses.chest.ch.elbow_r, wr: poses.chest.ch.wrist_r })} out ${JSON.stringify({ sh: poses.out.ch.shoulder_r, el: poses.out.ch.elbow_r, wr: poses.out.ch.wrist_r })}`);
X.finishChecks(ex, 'prayer-push', sw);
if (zMin < -0.6) { console.error('FAIL: hands pass through each other'); process.exitCode = 1; }
if (process.env.DBG) console.log('X0', X0, 'X1', X1, 'wrist out', Wo.wrist_r.p.map((v) => v.toFixed(1)), 'shoulder', Wo.shoulder_r.p.map((v) => v.toFixed(1)), 'dist', V.len(V.sub(Wo.wrist_r.p, Wo.shoulder_r.p)).toFixed(1), 'reach16', L.reach(16).toFixed(1));
