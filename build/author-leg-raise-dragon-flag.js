// Leg Raise Dragon Flag (GymVisual 14480, movement reference only; the page could not be read at authoring time). Lying
// face up on a flat bench, head at one end, hands gripping the end of the bench either side of the head (planted, palms
// down with the fingers over the end). The straight legs rise to vertical, then the hips and low back roll up off the
// bench onto the upper back until the body is one steep line from the shoulders to the toes; the body then lowers as a
// rigid line pivoting on the upper back, and the hips come down to the bench with the legs just above level. Bilateral.
// Each key solves the root position and pitch so the upper back rests on the bench at a fixed place (the pivot) and
// nothing passes into the bench; lying keys also rest the buttocks on it, flag keys set the body-line angle.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./families/core-a');
const H = require('./families/hips');
const F = require('./families/b6-16');
const DB = require('./families/dumbbell');
const meta = require('./meta/leg-raise-dragon-flag.json');

const BT = 45;                                   // bench top (cm)
const lie0 = C.lie({ kneeFlex: 0 }).pose;        // supine on the floor, head toward -X
const ARMS = /^(deltoid|upperarm|biceps|forearm|hand|thumb)_/;
const BODY = rig.shapes.map((s) => s.id).filter((id) => !ARMS.test(id));
const HEAD = ['head', 'hair', 'jaw', 'nose', 'ear_r', 'ear_l'];
const BACK = ['traps_r', 'traps_l', 'chest'];
const bot = (W, ids) => C.minOf(W, ids);
const W0 = L.fk(lie0);
const headX = Math.min(...['head', 'hair'].map((id) => { const g = R.shapeWorld(W0, rig.shapes.find((s) => s.id === id)); return g.c[0] - Math.hypot(g.axes[0][0], g.axes[1][0], g.axes[2][0]); }));
const END = r1(headX - 3), LEN = 120, bench = DB.bench({ x: r1(END + LEN / 2), seat: LEN, height: BT, width: 30, angle: 0, back: 0 });
const benchBox = { center: [END + LEN / 2, 0, 0], size: [LEN, BT, 30] };
const X6 = W0.spine_t6.p[0];

// body pose for a key: spine flex adds (l5, t12, t6), hip flexion, knee, neck flex
function body(k) {
  const p = clone(lie0);
  C.spine(p, lie0, { l5: k.spine[0], t12: k.spine[1], t6: k.spine[2] });
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: k.hip, abd: -2, rot: 0 }; p.ch[`knee_${s}`] = { flex: k.knee ?? 3 }; p.ch[`ankle_${s}`] = { dorsi: -30 }; }
  C.neck(p, k.neck);
  p.ch.sc_r = { protract: 0, elevate: 6 }; p.ch.sc_l = clone(p.ch.sc_r);
  return p;
}
const lineAngle = (W) => Math.atan2(W.ankle_r.p[1] - W.shoulder_r.p[1], W.ankle_r.p[0] - W.shoulder_r.p[0]) / R.DEG; // body line from the shoulders to the ankles, above the bench
function place(k) {
  const objs = [
    (W) => [(bot(W, BACK) - BT) * 4, (W.spine_t6.p[0] - X6) * 0.6],
    (W) => BODY.map((id) => Math.min(0, C.bottomOf(W, id) - BT + 0.2) * 3).concat([Math.min(0, bot(W, HEAD) - BT - 1) * 4, (Math.max(0, bot(W, HEAD) - BT - 8)) * 0.3]),
    (W, q) => [(q.ch.neck_c7.flex + q.ch.head_c1.flex - k.neck) * 0.08, (q.ch.neck_c7.flex - 1.2 * q.ch.head_c1.flex) * 0.1, Math.max(0, q.ch.neck_c7.flex - 39) * 5, Math.max(0, q.ch.head_c1.flex - 29) * 5],
  ];
  if (k.lying) objs.push((W) => [(Math.min(C.bottomOf(W, 'buttock_r'), C.bottomOf(W, 'buttock_l')) - BT) * 3]);
  else objs.push((W) => [(lineAngle(W) - k.angle) * 1.5]);
  const p = body(k); p.root.pos = [0, BT + 12, 0];
  return L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch', 'ch.neck_c7.flex', 'ch.head_c1.flex'], objs, { iters: 400 });
}
const KEYS = {
  lie: { lying: true, hip: 12, spine: [0, 0, 2], neck: 14 },
  legsMid: { lying: true, hip: 50, spine: [2, 1, 3], neck: 16 },
  legsUp: { lying: true, hip: 88, spine: [4, 2, 4], neck: 18 },
  roll: { angle: 112, hip: 92, spine: [18, 10, 6], neck: 22 },
  roll2: { angle: 92, hip: 45, spine: [14, 8, 6], neck: 22 },
  top: { angle: 70, hip: 10, spine: [6, 4, 6], neck: 22 },
  topHold: { angle: 69, hip: 9, spine: [6, 4, 6], neck: 22 },
  mid: { angle: 46, hip: 8, spine: [6, 4, 5], neck: 20 },
  low: { angle: 24, hip: 9, spine: [5, 3, 4], neck: 18 },
};
const poses = {}, cost = {};
// in-between keys (solved from blended settings) keep the upper back on the pivot through the roll and the lowering
const blend = (a, b, f) => { const o = { spine: a.spine.map((v, i) => v + (b.spine[i] - v) * f) }; for (const c of ['hip', 'neck', 'angle']) if (a[c] != null) o[c] = a[c] + ((b[c] ?? a[c]) - a[c]) * f; o.lying = a.lying && b.lying; if (!o.lying && o.angle == null) o.angle = b.angle; return o; };
for (const [a, b] of [['legsUp', 'roll'], ['roll', 'roll2'], ['roll2', 'top'], ['topHold', 'mid'], ['mid', 'low']]) KEYS[`${a}_${b}`] = blend(KEYS[a], KEYS[b], 0.5);
KEYS.legsUp_roll.angle = 88;
for (const [n, k] of Object.entries(KEYS)) {
  const s = place(k), W = L.fk(s.pose), low = Math.min(...BODY.map((id) => C.bottomOf(W, id))) - BT;
  if (low < 0.1) s.pose.root.pos[1] = r1(s.pose.root.pos[1] - low + 0.15); // never into the pad
  poses[n] = s.pose; cost[n] = +s.cost.toFixed(3);
}
// hands: palms down on the bench top at the head end, fingers over the end, either side of the head
const rotL = Q.fromBasis([0, -1, 0], [1, 0, 0], [0, 0, 1]), rotR = Q.mirrorZ(rotL);
const HC = ['r', 'l'].map((s) => Object.assign(H.handC(s, [0.3, 1, s === 'r' ? 0.6 : -0.6]), { label: `${s === 'r' ? 'Right' : 'Left'} hand (bench)`, handRot: H.qArr(s === 'r' ? rotR : rotL) }));
const T = { r: [r1(END + 11), r1(BT + 2.7), 15], l: [r1(END + 11), r1(BT + 2.7), -15] };
const ARMG = (s) => [{ [`shoulder_${s}`]: { plane: 60, elev: 150, axial: 0 }, [`elbow_${s}`]: { flex: 100 }, [`wrist_${s}`]: { pron: 0, flex: 0, dev: 0 } }, { [`shoulder_${s}`]: { plane: 30, elev: 140, axial: 60 }, [`elbow_${s}`]: { flex: 110 } }];
for (const n of Object.keys(poses)) {
  let q = H.fitArm(poses[n], 'r', HC[0], T.r, ARMG('r')); const cr = q.__cost; delete q.__cost;
  q = H.fitArm(q, 'l', HC[1], T.l, ARMG('l')); delete q.__cost;
  q.ik = { arm_r: { target: T.r, weight: 1 }, arm_l: { target: T.l, weight: 1 } };
  poses[n] = q; cost[n + 'Arm'] = +cr.toFixed(3);
}
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.5, pose: 'lie' }, { t: 1.1, pose: 'legsMid' }, { t: 1.6, pose: 'legsUp' }, { t: 1.8, pose: 'legsUp_roll' }, { t: 2.0, pose: 'roll' }, { t: 2.15, pose: 'roll_roll2' }, { t: 2.3, pose: 'roll2' }, { t: 2.45, pose: 'roll2_top' }, { t: 2.6, pose: 'top' }, { t: 3.0, pose: 'topHold' },
  { t: 3.45, pose: 'topHold_mid' }, { t: 3.9, pose: 'mid' }, { t: 4.4, pose: 'mid_low' }, { t: 4.9, pose: 'low' }, { t: 5.6, pose: 'lie' }, { t: 6.4, pose: 'lie' }];
const ex = H.module_(meta, HC, poses, keyframes);
ex.props = [bench.prop];
const pk = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk - 6), max: Math.ceil(pk + 4) };

const rep = C.scan(ex, { bench: (W) => F.boxClear(W, benchBox, BODY).d, armBench: (W) => F.boxClear(W, benchBox, rig.shapes.map((s) => s.id).filter((id) => ARMS.test(id) && !/^(hand|thumb)_/.test(id))).d, back: (W) => bot(W, BACK) - BT, pelvis: (W) => Math.min(C.bottomOf(W, 'buttock_r'), C.bottomOf(W, 'pelvis')) - BT, line: lineAngle, t6x: (W) => W.spine_t6.p[0] - X6 });
const set = H.setKin(ex), Wt = L.fk(poses.topHold, HC), Wl = L.fk(poses.low, HC), Wu = L.fk(poses.legsUp, HC);
set('Hip flexion', 'setup', `≈${poses.lie.ch.hip_r.flex}° (legs just above level)`); set('Hip flexion', 'peak', `≈${poses.legsUp.ch.hip_r.flex}°-${poses.roll.ch.hip_r.flex}° (legs vertical, rolling up), then ≈${poses.topHold.ch.hip_r.flex}° in the line`);
set('Body line at the top', 'setup', 'Lying on the bench'); set('Body line at the top', 'peak', `Shoulder-to-ankle line ${Math.round(lineAngle(Wt))}° above the bench`);
set('Pelvis lift', 'setup', 'Buttocks on the bench'); set('Pelvis lift', 'peak', `Pelvis ${Math.round(Math.min(C.bottomOf(Wt, 'buttock_r'), C.bottomOf(Wt, 'pelvis')) - BT)} cm above the bench; upper back stays on it (pivot within ${Math.max(Math.abs(rep.t6x[0]), Math.abs(rep.t6x[1])).toFixed(1)} cm)`);
set('Lowering', 'setup', `From ${Math.round(lineAngle(Wt))}°`); set('Lowering', 'peak', `Rigid line down to ${Math.round(lineAngle(Wl))}° above the bench, then the hips land`);
set('Tempo', 'setup', 'Lie 0.5 s'); set('Tempo', 'peak', '2.1 s up and over, 0.4 s brace, 2.6 s lowering, 0.8 s down');
console.log(`Leg Raise Dragon Flag: wrote ${L.write(ex)}\n  cost ${JSON.stringify(cost)}\n  ${JSON.stringify(rep)}`);
for (const n of Object.keys(poses)) { const W = L.fk(poses[n], HC); console.log(`  ${n.padEnd(8)} pitch ${poses[n].root.rot.pitch} line ${lineAngle(W).toFixed(0)} back ${(bot(W, BACK) - BT).toFixed(1)} pelvis ${(C.bottomOf(W, 'pelvis') - BT).toFixed(1)} head ${(bot(W, HEAD) - BT).toFixed(1)}`); }
C.guard('leg-raise-dragon-flag', rep, [rep.bench[0] < -0.6 && `body passes into the bench (${rep.bench[0]} cm)`, rep.back[1] > 1.5 && `upper back lifts off the bench (${rep.back[1]} cm)`, rep.armBench[0] < -0.8 && `arms pass into the bench (${rep.armBench[0]})`]);
if (process.env.DBG) { const tl = R.buildTimeline(ex); for (let t = 0; t < 6.4; t += 0.1) { const W = R.evalPose(rig, tl.pose(t), HC), b = F.boxClear(W, benchBox, BODY); if (b.d < -0.3) console.log(t.toFixed(1), b.id, b.d.toFixed(2)); } }
