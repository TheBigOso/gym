// Dumbbell Lying Woodchop (GymVisual #14495; page not read, movement from the name). Authored on the right: lying on the
// back on a mat, knees bent about 90 degrees with the feet flat (planted), one dumbbell held by its ends in both hands
// (attach.with) on straight arms above the head, off to the left, just above the floor. The trunk curls up (head,
// shoulders and shoulder blades off the floor) and turns to the right while the long arms sweep the dumbbell in an arc
// over the body to the outside of the right knee; pause; reverse slowly. The pelvis and feet stay still. The player
// mirrors for the left side.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const B5 = require('./families/b5-misc');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-lying-woodchop.json');
const ID = meta.exercise.id;

const AXX = +(process.env.AXX || 1.2), CURL = +(process.env.CURL || 1.2);
const GAP = +(process.env.GAP || 23), LEN = meta.props[0].size[0];
const lie0 = M.lie({ kneeFlex: 90, headRest: 'floor' });
const Fp = CA.plantFeet(lie0, 90);
const lie = Fp.pose, contacts = Fp.contacts, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const armFloor = (W) => [...CA.ARM_IDS('r'), ...CA.ARM_IDS('l')].map((id) => Math.min(0, CA.bottomOf(W, id) - 0.4) * 3);
const dbFloor = (W) => { const c = B5.twoHandDbClear(W, { len: LEN }); return [Math.min(0, c.minY - 0.5) * 3]; };
const W1 = L.fk(lie, contacts);
const END = V.add(V.add(W1.hip_r.p, V.scale(V.sub(W1.knee_r.p, W1.hip_r.p), +(process.env.KF || 0.25))), [0, +(process.env.KY || 12), +(process.env.KZ || 20)]);
let prev = null;
function key(f) {
  const e = G.ease(f);
  const p = clone(lie);
  p.ch.spine_l5 = { rot: r1(3 * e), latFlex: 0, flex: r1((lie.ch.spine_l5.flex || 0) + 1.5 * e) };
  p.ch.spine_t12 = { rot: r1(11 * e), latFlex: r1(-3 * e), flex: r1((lie.ch.spine_t12.flex || 0) + 18 * CURL * e) };
  p.ch.spine_t6 = { rot: r1(11 * e), latFlex: r1(-3 * e), flex: r1((lie.ch.spine_t6.flex || 0) + 14 * CURL * e) };
  p.ch.neck_c7 = { rot: r1(6 * e), flex: r1((NECK0 + (24 - NECK0) * e) * 0.55) }; p.ch.head_c1 = { rot: r1(9 * e), flex: r1((NECK0 + (24 - NECK0) * e) * 0.45) };
  p.ch.sc_r = { protract: r1(6 + 10 * e), elevate: r1(10 - 8 * e) }; p.ch.sc_l = { protract: r1(6 + 4 * e), elevate: r1(10 - 6 * e) };
  const W = L.fk(p, contacts), T = W.spine_t6, up = Q.rot(T.q, [0, 1, 0]), fwd = Q.rot(T.q, [1, 0, 0]), side = Q.rot(T.q, [0, 0, 1]);
  const mid = V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5);
  const start = V.add(V.add(V.add(mid, V.scale(up, 50)), V.scale(side, -18)), V.scale(fwd, 6));
  const c = V.add(V.add(V.scale(start, 1 - e), V.scale(END, e)), [0, 26 * Math.sin(Math.PI * f), 0]);
  const ax = V.norm(V.add(V.scale(side, 1 - e), V.scale([1, 0, 0], AXX * e)));
  if (!prev) for (const s of ['r', 'l']) { p.ch[`shoulder_${s}`] = { plane: 20, elev: 160, axial: 0 }; p.ch[`elbow_${s}`] = { flex: 10 }; p.ch[`wrist_${s}`] = { pron: 0, flex: 0, dev: 0 }; }
  const q = G.twoHands(p, c, ax, GAP, { up: fwd, wUp: 0.5, guess: prev, extra: [armFloor, dbFloor, (W, q) => [Math.max(0, q.ch.shoulder_r.elev - 176) * 2, Math.max(0, q.ch.shoulder_l.elev - 176) * 2], ...(prev ? ['r', 'l'].flatMap((s) => [L.obj.reg(`ch.shoulder_${s}.plane`, prev.ch[`shoulder_${s}`].plane, 0.01), L.obj.reg(`ch.shoulder_${s}.axial`, prev.ch[`shoulder_${s}`].axial, 0.01), L.obj.reg(`ch.wrist_${s}.pron`, prev.ch[`wrist_${s}`].pron, 0.01)]) : []), L.obj.reg('ch.elbow_r.flex', 10, 0.04), L.obj.reg('ch.elbow_l.flex', 10, 0.04)],
    seedAlways: false, seedArms: [[20, 160, 0, 10, 0], [0, 165, 60, 10, 90], [40, 160, -60, 10, -90], [10, 170, 90, 15, 0], [60, 120, 0, 10, 0], [80, 90, 0, 10, 0], [90, 70, 30, 10, 0], [40, 100, -40, 10, 60]] });
  prev = q;
  return q;
}
const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], N = FS.length - 1;
const poses = {}, err = {};
FS.forEach((f, i) => { const q = key(f); err[`k${i}`] = [q.__err, +q.__cost.toFixed(2), q.ch.shoulder_r.elev, q.ch.shoulder_l.elev]; poses[`k${i}`] = G.strip(q); });
poses.hold = clone(poses[`k${N}`]); poses.hold.ch.spine_t12.flex = r1(poses.hold.ch.spine_t12.flex + 1); poses.hold.ch.spine_t12.rot = r1(poses.hold.ch.spine_t12.rot + 1);
const up = G.easeTimes(FS.slice(1), 0.8, 2.4), dn = G.easeTimes(FS.slice(1), 2.8, 4.8);
const keyframes = [{ t: 0, pose: 'k0' }, { t: 0.8, pose: 'k0' }, ...up.map((t, i) => ({ t, pose: `k${i + 1}` })), { t: 2.6, pose: 'hold' }, { t: 2.8, pose: `k${N}` }, ...dn.map((t, i) => ({ t, pose: `k${N - 1 - i}` })), { t: 5.4, pose: 'k0' }];
const ex = CA.buildModule(meta, poses, keyframes, contacts);
let clr = { d: 1e9 }, gap = [1e9, -1e9], dbY = 1e9;
const rep = CA.scan(ex, { dbClr: (W) => { const c = B5.twoHandDbClear(W, { len: LEN }); dbY = Math.min(dbY, c.minY); if (c.d < clr.d) clr = { d: +c.d.toFixed(2), what: c.what }; const g = G.gapOf(W); gap = [Math.min(gap[0], g), Math.max(gap[1], g)]; return c.d; } });
const W0 = L.fk(poses.k0, contacts), Wt = L.fk(poses[`k${N}`], contacts), pk = poses[`k${N}`].ch;
const set = (p, s, v) => CA.setKin ? null : null;
const kin = (p, a, b) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k.setup = a; k.peak = b; };
kin('Trunk curl', `Lying flat, head resting (thorax ${G.deg(CA.upperFromFloor(W0))} from the floor)`, `Thorax ${G.deg(CA.upperFromFloor(Wt))} off the floor, shoulder blades up`);
kin('Trunk rotation', 'Facing the ceiling', `${G.deg(pk.spine_l5.rot + pk.spine_t12.rot + pk.spine_t6.rot)} toward the right knee (lumbar ${G.deg(pk.spine_l5.rot)})`);
kin('Dumbbell path', `Above the head, ${r1(L.fk(poses.k0, contacts).wrist_r.p[1])} cm off the floor at the wrists, to the left`, `Outside the right knee; held by the ends ${Math.round(gap[0])} cm apart`);
kin('Feet and pelvis', `Knees ${G.deg(CA.kneeOf(W0, 'r'))}, feet flat`, 'Unchanged (planted feet, still pelvis)');
kin('Tempo', 'Rest 0.8 s', '1.6 s up, 0.4 s pause, 2.0 s down');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, clr, gap: gap.map(r1), dbY: r1(dbY), ...rep })}`);
CA.guard(ID, rep, [clr.d < 0 && `dumbbell in the body (${clr.what})`, dbY < 0 && 'dumbbell below floor', gap[1] - gap[0] > 1.2 && `grip gap varies ${gap}`]);
