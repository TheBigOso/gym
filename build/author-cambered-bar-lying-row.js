// Cambered Bar Lying Row (GymVisual #970; page not readable here, movement from the name and standard coaching): lying
// face down on a high flat bench (a 98 cm seal-row bench: pad on two legs), chest near the front end and the chin just
// past it, legs straight along the bench. The arms hang beside the pad holding a cambered row bar overhand a little
// wider than the shoulders (src/gear/g3-bars.js: kind ez_bar, params.shape 'cambered'): the middle of the bar drops in a
// U so it passes under the pad while the hands row up beside it. Row until the hands reach the pad, elbows up and back,
// shoulder blades squeezing; lower to long arms. Only the arms and shoulder blades move. Arms solved on the right grip
// point and mirrored (constant grip width). Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const G = require('./families/gear-bars');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/cambered-bar-lying-row.json');

const ID = 'cambered-bar-lying-row', ENV = (k, d) => +(process.env[k] ?? d);
const HB = ENV('HB', 98), PADT = 8, BW = 30, LEN = 130, GW = ENV('GW', 58), DROP = 18;
// body: prone and horizontal, chest / thighs on the pad top
const P0 = clone(L.POSES.plank().pose); delete P0.ik;
for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) P0.ch[j] = { rot: 0, flex: 0, latFlex: 0 };
Object.assign(P0.ch, { hip_r: { flex: 0, abd: 3, rot: 0 }, hip_l: { flex: 0, abd: 3, rot: 0 }, knee_r: { flex: 4 }, knee_l: { flex: 4 }, ankle_r: { dorsi: -45 }, ankle_l: { dorsi: -45 }, neck_c7: { rot: 0, flex: 6 }, head_c1: { rot: 0, flex: 8 }, shoulder_r: { plane: 90, elev: 90, axial: 0 }, shoulder_l: { plane: 90, elev: 90, axial: 0 }, elbow_r: { flex: 5 }, elbow_l: { flex: 5 } });
const onPad = L.solvePose(P0, ['root.pos.1', 'root.rot.pitch'], [(W) => [(Math.min(H.bottomOf(W, 'chest'), H.bottomOf(W, 'ribcage')) - HB) * 3, (Math.min(H.bottomOf(W, 'thigh_r'), H.bottomOf(W, 'thigh_l')) - HB - 0.5) * 3]], { iters: 300 }).pose;
onPad.root.pos = [0, r1(onPad.root.pos[1]), 0]; onPad.root.rot.pitch = r1(onPad.root.rot.pitch);
const W0 = L.fk(onPad), S0 = W0.shoulder_r.p;
// pad: front end just in front of the shoulders (the chin past it); legs well behind the bar's path
const xFront = r1(S0[0] + ENV('FRONT', 6));
const pad = { id: 'bench_pad', kind: 'box', center: [r1(xFront - LEN / 2), HB - PADT, 0], size: [LEN, PADT, BW] };
const legs = [{ id: 'bench_leg_front', kind: 'box', center: [r1(xFront - 42), 0, 0], size: [8, HB - PADT, 24] }, { id: 'bench_leg_rear', kind: 'box', center: [r1(xFront - LEN + 8), 0, 0], size: [8, HB - PADT, 24] }];
const boxes = [pad, ...legs].map((b) => ({ id: b.id, c: [b.center[0], b.center[1] + b.size[1] / 2, b.center[2]], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: b.size.map((v) => v / 2) }));
const bar = X.camberedProp({ width: GW, drop: DROP, plates: 1, plateD: 45 });
// right grip point: bottom = arm hanging long under the shoulder, top = hand beside the pad edge, up at the pad
const g0 = [S0[0] + ENV('BX', 2), S0[1] - (L.reach(6) + 4), GW / 2];
const g1 = [S0[0] + ENV('TX', -6), HB + ENV('TY', -10), GW / 2];
const FS = [0, 0.08, 0.16, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.93, 1], poses = {};
let guess = [[90, 90, 0, 5, 0], [70, 80, -20, 20, 0], [100, 60, 20, 60, 0], [40, 60, 0, 90, 0]], worst = 0;
const solveRow = (f, i) => {
  const p = clone(onPad); p.ch.sc_r = { protract: r1(12 - 28 * f), elevate: r1(-2 * f) }; p.ch.sc_l = clone(p.ch.sc_r);
  const S = L.fk(p).shoulder_r.p, g = V.add(g0, V.scale(V.sub(g1, g0), f));
  const E = V.add(S, [ENV('EX', -10) * f, -22 * (1 - f) + ENV('EY', 4) * f, 6 + ENV('EZ', 12) * f]);
  const q = G.armTo(p, g, { grip: 'bar', thumb: [0, 0, -1], palm: [-1, 0, 0], wDir: 1, elbow: E, wElbow: ENV('WE', 0.3), guesses: guess, mirror: true });
  worst = Math.max(worst, q.__err); delete q.__err; delete q.__cost; guess = [G.guessOf(q)];
  poses[`r${i}`] = X.unwrapArms(q, i ? poses[`r${i - 1}`] : null);
};
FS.forEach(solveRow);
guess = [G.guessOf(poses.r1)]; { const keep = poses.r1; solveRow(0, 0); poses.r0 = X.unwrapArms(poses.r0, keep); } // the long-arm key re-solved from its neighbour (no axial flip)
const N = FS.length - 1, ph = (id) => meta.timeline.phases.find((p) => p.id === id), D = meta.timeline.duration;
const t0 = ph('pull').start, t1 = ph('pull').end, t2 = ph('top').end, t3 = ph('lower').end;
const keyframes = [{ t: 0, pose: 'r0' }, ...K.easeTimes(FS, t0, t1).map((t, i) => ({ t, pose: `r${i}` })), { t: t2, pose: `r${N}` }, ...K.easeTimes(FS.slice(0, -1).map((k) => 1 - k).reverse(), t2, t3).map((t, i) => ({ t, pose: `r${N - 1 - i}` })), { t: D, pose: 'r0' }];
const ex = H.module_(meta, [], poses, keyframes);
ex.props = [pad, ...legs, bar];
// loop: grip width, bar clear of the bench, the body and the floor, body resting on the pad
let sw = { width: [1e9, -1e9], bench: { d: 1e9 }, body: { d: 1e9 }, barFloor: 1e9, padGap: [1e9, -1e9] };
const tl = R.buildTimeline(ex);
const rep = K.scanHeld(ex, [], { planted: [], probe: (W, pz, t) => {
  const gm = X.camberedGeometry(W, bar.params); sw.width = [Math.min(sw.width[0], gm.width), Math.max(sw.width[1], gm.width)];
  const b = X.geomBoxClear(gm, boxes); if (b.d < sw.bench.d) sw.bench = { ...b, d: r1(b.d), t: +t.toFixed(2) };
  const c = G.geomClear(W, gm, /^(hand|thumb|forearm)_/); if (c.d < sw.body.d) sw.body = { ...c, d: r1(c.d), t: +t.toFixed(2) };
  sw.barFloor = Math.min(sw.barFloor, G.geomMinY(gm));
  const gap = Math.min(H.bottomOf(W, 'chest'), H.bottomOf(W, 'ribcage')) - HB; sw.padGap = [Math.min(sw.padGap[0], gap), Math.max(sw.padGap[1], gap)];
} });
let armPad = { d: 1e9 };
for (let i = 0; i <= 120; i++) { const W = R.evalPose(L.rig, tl.pose((i / 120) * D), []); const c = X.boxClear(W, pad, /^(chest|pecs_[rl]|ribcage|abdomen|pelvis|buttock_[rl]|thigh_[rl]|quad_[rl]|hamstring_[rl]|shank_[rl]|calf_[rl]|foot_[rl]|toe_[rl]|knee_[rl]|glute_[rl])$/); if (c.d < armPad.d) armPad = { ...c, d: r1(c.d), t: r1((i / 120) * D) }; }
const fails = [];
if (worst > 0.8) fails.push(`hands off the bar (${worst} cm)`);
if (sw.width[1] - sw.width[0] > 1.0) fails.push(`grip width varies ${sw.width.map(r1)}`);
if (sw.bench.d < 0) fails.push(`bar into the bench ${JSON.stringify(sw.bench)}`);
if (sw.body.d < 0) fails.push(`bar into the body ${JSON.stringify(sw.body)}`);
if (sw.barFloor < 0) fails.push(`plates through the floor ${r1(sw.barFloor)}`);
if (armPad.d < -0.5) fails.push(`arm into the pad ${JSON.stringify(armPad)}`);
if (rep.floor < -0.5) fails.push('below the floor');
if (rep.jump.v > 4) fails.push(`channel jump ${JSON.stringify(rep.jump)}`);
const Wb = L.fk(poses.r0), Wt = L.fk(poses[`r${N}`]);
const set = H.setKin(ex);
set('Bench', 'setup', `Prone on a ${HB} cm bench, chest on the pad, chin past the front end`); set('Bench', 'peak', 'Unchanged (the trunk does not move)');
set('Elbow flexion', 'setup', `≈${Math.round(K.elbowAng(Wb))}° (arms long)`); set('Elbow flexion', 'peak', `≈${Math.round(K.elbowAng(Wt))}° at the top, elbows above the back`);
set('Bar path', 'setup', `Overhand, ${GW} cm between the grip points; plates ${r1(sw.barFloor)} cm or more off the floor`); set('Bar path', 'peak', `Hands up to the pad; the ${DROP} cm camber passes under it (at least ${sw.bench.d} cm clear)`);
set('Tempo', 'setup', `Hang ${t0} s`); set('Tempo', 'peak', `${r1(t1 - t0)} s up, ${r1(t2 - t1)} s squeeze, ${r1(t3 - t2)} s down`);
console.log(`Cambered Bar Lying Row: wrote ${L.write(ex)}\n  root ${JSON.stringify(onPad.root)} worst ${worst} elbow ${Math.round(K.elbowAng(Wb))}->${Math.round(K.elbowAng(Wt))} g0 ${g0.map(r1)} g1 ${g1.map(r1)}\n  loop ${JSON.stringify({ ...sw, width: sw.width.map(r1), barFloor: r1(sw.barFloor), padGap: sw.padGap.map(r1), armPad, floor: rep.floor, jump: rep.jump })}`);
X.report(ID, fails);
