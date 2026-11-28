// Dumbbell Russian Twist with Legs off the Floor (GymVisual #14496; page not read, movement from the name). Bilateral:
// seated on the mat, trunk leaned back about 45 degrees with a long spine (same seated lean as the bodyweight Russian
// twist author), knees bent and both feet held off the floor (legs by FK, no contacts). One dumbbell held by its ends
// in both hands (attach.with, palms facing the plates) in front of the chest. The trunk turns side to side through the
// spine channels (mostly thoracic) and the dumbbell travels with the chest to beside each hip; the pelvis stays put.
// Two full turns each way per loop.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./families/core-b');
const M = require('./families/b5-misc');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-russian-twist-with-legs-floor-off.json');
const ID = meta.exercise.id;

const LEAN = 45, KNEE = +(process.env.KNEE || 70), FEET_UP = +(process.env.FU || 14), GAP = +(process.env.GAP || 23), ELV = +(process.env.ELV || 45), REACH = +(process.env.REACH || 40);
const sitBottom = (W) => Math.min(C.bottomOf(W, 'pelvis'), C.bottomOf(W, 'buttock_r'), C.bottomOf(W, 'buttock_l'));

let base = C.lie({ kneeFlex: 90, spine: { l5: 2, t12: 2, t6: 4 }, pitch: 93 });
Object.assign(base.ch, { spine_l5: { rot: 0, latFlex: 0, flex: 10 }, spine_t12: { rot: 0, latFlex: 0, flex: 6 }, spine_t6: { rot: 0, latFlex: 0, flex: 2 } });
C.neck(base, 6);
const setPitch = (p, P) => { p.root.rot = { pitch: r1(P) }; return p; };
{ let lo = 0, hi = 90; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, a = C.trunkFromVertical(L.fk(setPitch(clone(base), m))); if (a < LEAN) lo = m; else hi = m; } setPitch(base, (lo + hi) / 2); }
// legs: knees bent, hips flexed until the heels sit FEET_UP cm above the floor, knees a few cm apart
for (const s of ['r', 'l']) { base.ch[`hip_${s}`] = { flex: 90, abd: 3, rot: 0 }; base.ch[`knee_${s}`] = { flex: KNEE }; base.ch[`ankle_${s}`] = { dorsi: -15 }; }
base.root.pos[1] = r1(base.root.pos[1] - sitBottom(L.fk(base)) + 0.2);
for (let it = 0; it < 3; it++) {
  const heel = (W) => Math.min(C.bottomOf(W, 'foot_r'), C.bottomOf(W, 'calf_r'), C.bottomOf(W, 'shank_r'));
  let lo = 40, hi = 140; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2, q = clone(base); q.ch.hip_r.flex = m; if (heel(L.fk(q)) < FEET_UP) lo = m; else hi = m; }
  base.ch.hip_r.flex = r1((lo + hi) / 2); base.ch.hip_l = clone(base.ch.hip_r);
  base.root.pos[1] = r1(base.root.pos[1] - sitBottom(L.fk(base)) + 0.2);
}
base.ch.sc_r = { protract: 8, elevate: 2 }; base.ch.sc_l = { protract: 8, elevate: 2 };

// Dumbbell centre in the upper-back (T6) frame, forward of the sternum, swung `extra` degrees further about the trunk
// axis and dropped `drop` cm toward the hip; its axis runs across the chest (turned with it).
let prev = null;
function hold(pose, extra = 0, drop = 0) {
  const W = L.fk(pose), fr = W.spine_t6.q, org = W.spine_t6.p, a = extra * R.DEG;
  const c = V.add(org, Q.rot(fr, [REACH * Math.cos(a), -8 - drop * 0.7, REACH * Math.sin(a)]));
  const ax = Q.rot(fr, [-Math.sin(a), 0, Math.cos(a)]);
  if (!prev) { for (const s of ['r', 'l']) { pose.ch[`shoulder_${s}`] = { plane: 95, elev: 60, axial: 20 }; pose.ch[`elbow_${s}`] = { flex: 70 }; pose.ch[`wrist_${s}`] = { pron: 0, flex: 0, dev: 0 }; } }
  const q = G.twoHands(pose, c, ax, GAP, { up: Q.rot(fr, [0, 1, 0]), wUp: 1, guess: prev, extra: [L.obj.reg('ch.shoulder_r.elev', ELV, 0.08), L.obj.reg('ch.shoulder_l.elev', ELV, 0.08)], seedArms: [[95, 60, 20, 70, 0], [80, 50, 0, 90, 90], [100, 70, 40, 60, -60], [60, 40, -30, 100, 60]] });
  prev = q;
  return q;
}
const center = hold(clone(base));
const SPLIT = { spine_l5: 0.1, spine_t12: 0.45, spine_t6: 0.45 };
function turn(theta, k = {}) {
  const p = clone(center);
  for (const j of Object.keys(SPLIT)) p.ch[j] = Object.assign({}, p.ch[j], { rot: r1(theta * SPLIT[j]), latFlex: r1((k.lat || 0) * (j === 'spine_l5' ? 0.2 : 0.4)) });
  C.neck(p, 6, theta * 0.45);
  return hold(p, k.extra || 0, k.drop || 0);
}
const err0 = [center.__err, +center.__cost.toFixed(3)];
const poses = { center };
const DROP = +(process.env.DROP || 8), EXTRA = +(process.env.EXTRA || 28);
// solved keys across the sweep (theta from the middle to the right; the left side mirrors), dense enough that the grip gap
// stays constant between keys
const FR = [0.25, 0.5, 0.75, 1];
prev = center;
FR.forEach((f, i) => { const e = G.ease(f); poses[`R${i + 1}`] = turn(44 * f, { extra: EXTRA * f, drop: DROP * e, lat: 6 * f }); });
poses.Rhold = turn(46, { extra: EXTRA + 2, drop: DROP + 1.5, lat: 6.5 });
const err = { center: err0, R: poses.R4.__err, Rhold: poses.Rhold.__err };
for (const k of Object.keys(poses)) G.strip(poses[k]);
for (const k of Object.keys(poses)) if (k !== 'center') poses[k.replace('R', 'L')] = C.mirror(poses[k]);
// R -> L sweep: R4, R3 .. R1, center, L1 .. L4 over `dur` s (eased in time)
const sweep = (from, to, t0, dur) => { const seq = from === 'R' ? ['R4', 'R3', 'R2', 'R1', 'center', 'L1', 'L2', 'L3', 'L4'] : ['L4', 'L3', 'L2', 'L1', 'center', 'R1', 'R2', 'R3', 'R4']; const ts = G.easeTimes(seq.map((_, i) => i / (seq.length - 1)), t0, t0 + dur); return seq.map((p, i) => ({ t: ts[i], pose: p })); };
const toR = G.easeTimes([0.25, 0.5, 0.75, 1], 0.8, 1.75).map((t, i) => ({ t, pose: `R${i + 1}` }));
const back = G.easeTimes([0.25, 0.5, 0.75, 1], 6.05, 6.95).map((t, i) => ({ t, pose: i === 3 ? 'center' : `L${3 - i}` }));
const keyframes = [{ t: 0, pose: 'center' }, { t: 0.8, pose: 'center' }, ...toR.slice(0, 3), ...[{ t: 1.75, pose: 'R4' }], { t: 2.0, pose: 'Rhold' }, ...sweep('R', 'L', 2.25, 0.85), { t: 3.35, pose: 'Lhold' },
  ...sweep('L', 'R', 3.6, 0.85), { t: 4.7, pose: 'Rhold' }, ...sweep('R', 'L', 4.95, 0.85), { t: 6.05, pose: 'Lhold' }, ...back, { t: 7.6, pose: 'center' }];
const ex = C.moduleOf(meta, poses, keyframes, []);

const rep = C.scan(ex, { still: ['pelvis'] });
let clr = { d: 1e9 }, gap = [1e9, -1e9], dbY = 1e9;
{ const tl = R.buildTimeline(ex); for (let i = 0; i <= 600; i++) { const t = (i / 600) * 7.6, W = R.evalPose(rig, tl.pose(t), []); const c = M.twoHandDbClear(W, { len: 28 }); if (c.d < clr.d) clr = { d: +c.d.toFixed(2), what: c.what, t: +t.toFixed(2) }; dbY = Math.min(dbY, c.minY); const g = G.gapOf(W); gap = [Math.min(gap[0], g), Math.max(gap[1], g)]; } }
const Wc = L.fk(center), Wr = L.fk(poses.Rhold), rh = poses.Rhold.ch;
const rotSum = rh.spine_l5.rot + rh.spine_t12.rot + rh.spine_t6.rot;
const heel = Math.min(C.bottomOf(Wc, 'foot_r'), C.bottomOf(Wc, 'calf_r'));
C.setKin(ex, 'Trunk lean', `${C.deg(C.trunkFromVertical(Wc))} back from vertical (pelvis to C7)`, 'Held through the turns');
C.setKin(ex, 'Trunk rotation', 'Facing the knees', `${C.deg(rotSum)} each way (lumbar ${C.deg(rh.spine_l5.rot)}, thoracic ${C.deg(rh.spine_t12.rot + rh.spine_t6.rot)}), head turns with the dumbbell`);
C.setKin(ex, 'Legs', `Knees ${C.deg(C.kneeOf(Wc, 'r'))}, hips ${C.deg(center.ch.hip_r.flex)}, heels ${r1(heel)} cm off the floor`, 'Legs do not move');
C.setKin(ex, 'Dumbbell', `Held by the ends ${Math.round(gap[0])} cm apart, in front of the chest`, `Beside the hip, ${r1(dbY)} cm above the floor at the lowest`);
C.setKin(ex, 'Tempo', 'Sit 0.8 s, feet up', 'About 1.35 s per side with a short pause, 4 turns per 7.6 s loop');
Object.assign(rep, { err, clr, gap: gap.map(r1), dbY: r1(dbY), heel: r1(heel), hip: center.ch.hip_r.flex, arm: center.ch.shoulder_r });
C.finish(ex, rep, meta.exercise.name);
G.fail(ID, [clr.d < 0 && `dumbbell in the body ${clr.what}`, dbY < 0 && 'dumbbell below floor', gap[1] - gap[0] > 1.2 && `grip gap varies ${gap}`, heel < 3 && 'feet on the floor']);
