// Barbell Seated Calf Raise (GymVisual #947): seated on the end of a flat 45 cm bench, trunk tall with a slight forward lean,
// the balls of the feet on a low step (8 cm) with the heels hanging off its back edge, shins about vertical, feet about hip
// width. A barbell rests across the lower thighs just behind the knees (the shaft on both thighs, plates outside the
// knees), held in place by both hands overhand just outside the thighs (64 cm between the handle centres). From a stretch
// with the heels below the step, both feet roll up onto the balls of the feet (about 1 s), pause (0.8 s) and lower slowly
// (1.8 s); the knees and the bar rise and fall with the heels while the pelvis stays on the bench. Each foot pivots about a
// fixed point under the ball of the foot on the step (b4-calvesglutes.js ballPivot, as in the seated dumbbell calf raise);
// the bar height is solved per key so the shaft just rests on the thighs. Bilateral. Family b5-bbpress.js (armKey).
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const CG = require('./families/b4-calvesglutes');
const D = require('./families/dumbbell');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const B3 = require('./families/b3-back');
const F = require('./families/b5-bbpress');
const meta = require('./meta/barbell-seated-calf-raise.json');

const TOE = 6, HALF = 14, STEP = 8, PITCH_LOW = -16, PITCH_TOP = 28, SEAT_H = 45, GW = 64, BAR_T = 0.84, REST = 0.15;
const bench = D.bench({ x: -40 + 55, angle: 0, height: SEAT_H, seat: 40, back: 70 }); // seat end at x = 35 (flat bench)
const SEAT_END = bench.prop.center[0] + bench.prop.size[0] / 2;
const yawOf = (s) => (s === 'r' ? -TOE : TOE);
const contacts = ['r', 'l'].map((s) => H.legC(s, { rot: H.footQ(0, yawOf(s)), pole: [1, 0.2, s === 'r' ? 0.35 : -0.35] }));
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => H.bottomOf(W, id)));
let p = clone(st); delete p.ik;
Object.assign(p.ch, { spine_l5: { rot: 0, flex: 3, latFlex: 0 }, spine_t12: { rot: 0, flex: 3, latFlex: 0 }, spine_t6: { rot: 0, flex: 3, latFlex: 0 },
  hip_r: { flex: 90, abd: 6, rot: -6 }, hip_l: { flex: 90, abd: 6, rot: -6 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, neck_c7: { rot: 0, flex: 8 }, head_c1: { rot: 0, flex: 6 },
  sc_r: { protract: 8, elevate: 0 }, sc_l: { protract: 8, elevate: 0 } });
p.root.pos = [SEAT_END - 20, 55, 0]; p.root.rot = { pitch: -8 };
p = L.solvePose(p, ['root.pos.1'], [(W) => [(seatY(W) - SEAT_H) * 3]]).pose;
const AY = L.ANKLE_H + STEP;
// feet: shins vertical (ankle under the knee) with the foot flat on the step
const W0 = L.fk(p);
let FX;
{ let a = W0.hip_r.p[0] + 20, b = W0.hip_r.p[0] + 70; for (let i = 0; i < 40; i++) { const x = (a + b) / 2, q = clone(p); q.ik = { leg_r: { target: [x, AY, HALF], weight: 1 } }; const W = L.fk(q, contacts); if (W.knee_r.p[0] > x) a = x; else b = x; } FX = r1((a + b) / 2); }
const ball = { r: CG.ballPivot([FX, AY, HALF], yawOf('r')), l: CG.ballPivot([FX, AY, -HALF], yawOf('l')) };
// the step: back edge 2.5 cm behind the ball of the foot (heels hang off it), 30 cm deep, across both feet
const STEP_BACK = r1(ball.r.B[0] - 2.5), step = { id: 'step', kind: 'box', center: [r1(STEP_BACK + 15), 0, 0], size: [30, STEP, 2 * HALF + 26] };
const stepBox = { c: [step.center[0], STEP / 2, 0], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [15, STEP / 2, step.size[2] / 2] };
const SEEDS = [[20, 40, 0, 20, 90], [30, 50, -30, 15, 60], [10, 45, 30, 20, 120], [40, 60, 0, 10, 90], [0, 30, 0, 30, 90]];
let prevArm = null;
function poseAt(pitch) {
  let q = clone(p); q.ik = {};
  for (const s of ['r', 'l']) q.ik[`leg_${s}`] = { target: ball[s].ankleFor(pitch), weight: 1, handRot: ball[s].rotFor(pitch) };
  for (const s of ['r', 'l']) q = H.fitLeg(q, s, contacts.find((c) => c.id === `leg_${s}`), q.ik[`leg_${s}`].target, { handRot: q.ik[`leg_${s}`].handRot, rot: -6, abd: 6 });
  // bar across the lower thighs: at BAR_T along the thigh, height so the shaft rests REST cm above the leg shapes
  const W = L.fk(q, contacts), x = W.hip_r.p[0] + (W.knee_r.p[0] - W.hip_r.p[0]) * BAR_T, zr = GW / 2 - 5;
  let ya = W.knee_r.p[1] - 5, yb = W.knee_r.p[1] + 25;
  for (let i = 0; i < 40; i++) { const y = (ya + yb) / 2; if (BB.barLegClear(W, x, y, zr) > REST) yb = y; else ya = y; }
  const c = [r1(x * 10) / 10, +yb.toFixed(2), 0], g = EQ.barGrips(c, BB.AX, GW).r;
  const E = V.add(W.shoulder_r.p, [12, -20, 10]);
  q = F.armKey(q, contacts, g, { palm: [0, -1, 0], thumb: [0, 0, -1], dirW: 0.6, E, elbowW: 0.15, wrist: 0, wristW: 0.2, seeds: prevArm ? [F.seedOf(prevArm), ...SEEDS] : SEEDS });
  q.__c = c; prevArm = q;
  return q;
}
const N = 12, poses = {}, info = [];
for (let i = 0; i <= N; i++) { const q = poseAt(r1(PITCH_LOW + (PITCH_TOP - PITCH_LOW) * i / N)); info.push({ err: +q.__err.toFixed(3), c: q.__c }); poses[`p${i}`] = F.unwrapTo(F.strip(q), i ? poses[`p${i - 1}`] : null); delete poses[`p${i}`].__c; }
{ const q = poseAt(PITCH_TOP + 0.6); poses.top2 = F.unwrapTo(F.strip(q), poses[`p${N}`]); delete poses.top2.__c; }
const keyframes = CG.raiseKeys(N, { hold: 2.2 });
CG.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [bench.prop, step, BB.barbellProp()];
let ballDrift = 0, heel = [1e9, -1e9], pelvisDrift = 0, footBox = { d: 1e9 }, legsBar = 1e9;
const Wp0 = L.fk(poses.p0, contacts), WpF = L.fk(poses[`p${Math.round(N * -PITCH_LOW / (PITCH_TOP - PITCH_LOW))}`], contacts), heelF = ball.r.heelY(WpF, 'r');
const sw = BB.sweep(ex, { planted: [], fixed: ['pelvis'], skip: /^(hand|thumb|forearm)_|^(thigh|quad)_/, probe: (W) => {
  for (const s of ['r', 'l']) ballDrift = Math.max(ballDrift, ball[s].drift(W, s));
  const h = ball.r.heelY(W, 'r') - heelF; heel = [Math.min(heel[0], h), Math.max(heel[1], h)];
  pelvisDrift = Math.max(pelvisDrift, V.len(V.sub(W.pelvis.p, Wp0.pelvis.p)));
  for (const id of ['foot_r', 'foot_l', 'calf_r', 'calf_l', 'shank_r', 'shank_l']) for (const pt of F.shapePts(W, id)) { const dd = B3.boxDist(pt, stepBox); if (dd < footBox.d) footBox = { d: +dd.toFixed(2), id }; }
  const b = EQ.barAt(W, BB.GRIP); legsBar = Math.min(legsBar, BB.barLegClear(W, b.c[0], b.c[1], GW / 2 - 5));
} });
const Wt = L.fk(poses[`p${N}`], contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Ankle plantarflexion', 'setup', `${d(H.dorsiOf(Wp0, 'r'))} dorsiflexion (heels ${r1(-heel[0])} cm below the flat-foot line, ${-PITCH_LOW}° heel-down)`); set('Ankle plantarflexion', 'peak', `${d(-H.dorsiOf(Wt, 'r'))} plantarflexion (feet ${PITCH_TOP}° heel-up)`);
set('Heel height', 'setup', `${r1(heel[0])} cm (below the step top line)`); set('Heel height', 'peak', `+${r1(heel[1])} cm; ${r1(heel[1] - heel[0])} cm of heel travel`);
set('Knee', 'setup', `${d(H.kneeOf(Wp0, 'r'))}, shins about vertical`); set('Knee', 'peak', `${d(H.kneeOf(Wt, 'r'))} (knees ${r1(Wt.knee_r.p[1] - Wp0.knee_r.p[1])} cm higher)`);
set('Bar position', 'setup', `Across the lower thighs (${Math.round(BAR_T * 100)}% of the way to the knee), ${legsBar.toFixed(1)} cm off the thigh shapes at the closest; hands overhand ${GW} cm apart (handle centres), outside the thighs`); set('Bar position', 'peak', `Rides up with the knees (${r1(info[N].c[1] - info[0].c[1])} cm)`);
set('Tempo', 'setup', 'Stretch 0.8 s'); set('Tempo', 'peak', '1.0 s up, 0.8 s pause, 1.8 s down, 0.6 s stretch');
ex.checks.measure = { name: 'rootTravel', min: 0, max: 1 };
console.log(`Barbell Seated Calf Raise: wrote ${L.write(ex)}  FX ${FX} step back ${STEP_BACK} root ${JSON.stringify(p.root)}\n  sweep ${JSON.stringify(sw)}\n  ballDrift ${ballDrift.toFixed(3)} heel ${heel.map(r1)} pelvisDrift ${pelvisDrift.toFixed(3)} footBox ${JSON.stringify(footBox)} legsBar ${legsBar.toFixed(2)} gripErr ${Math.max(...info.map((k) => k.err))} dorsi0 ${H.dorsiOf(Wp0, 'r').toFixed(1)}`);
if (ballDrift > 0.05) { console.error('FAIL: ball of the foot slides'); process.exitCode = 1; }
if (pelvisDrift > 0.05) { console.error('FAIL: pelvis moves on the bench'); process.exitCode = 1; }
if (sw.widthRange > 1.0 || Math.max(...info.map((k) => k.err)) > 0.5) { console.error('FAIL: hands do not stay on the bar'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || legsBar < -0.3 || footBox.d < -0.5) { console.error('FAIL: collision (bar / body / step)'); process.exitCode = 1; }
