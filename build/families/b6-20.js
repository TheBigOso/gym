// Batch 6 family b6-20: helpers shared by the b6-20 authors (supine leg drills, hollow rock, side-lying scissors,
// kneeling drills, otis-up, bench drills, inchworm, heel walk).
//  - supineHands: lying on the back on the mat (core-a lying base, head resting), arms by the sides with the palms planted
//  - leg / legs: set leg channels directly (hip flex / abd / rot, knee, ankle)
//  - legGap: clearance between the right and the left leg (rig shapes), for drills where the legs cross or pass
//  - shapeGap: clearance between two lists of rig shapes
//  - setKin: fill a kinematics row (setup / peak) by its measure prefix
//  - mirrorArmSolve: solve the LEFT arm with a right-arm solver by mirroring the pose and the target
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const CA = require('./core-a');
const CB = require('./core-b');
const S3 = require('./b3-shoulders');

const shapeById = Object.fromEntries(rig.shapes.map((s) => [s.id, s]));
const bottomOf = CA.bottomOf;
const minOf = CA.minOf;

// Supine on the mat, legs long (kneeFlex 0) or bent, palms planted beside the hips (arm contacts)
function supineHands({ kneeFlex = 0, abd = 12, flex = 10 } = {}) {
  const B = CA.lie({ kneeFlex });
  const HC = CA.handContacts();
  const T = CA.handTargets(B.pose, { abd, flex });
  const base = CA.plantHands(B.pose, T, HC);
  return { base, HC, T, P0: B.pose.root.rot.pitch };
}
function leg(pose, s, { flex, abd, rot, knee, dorsi } = {}) {
  const p = clone(pose), h = p.ch[`hip_${s}`] || { flex: 0, abd: 0, rot: 0 };
  p.ch[`hip_${s}`] = { flex: r1(flex ?? h.flex ?? 0), abd: r1(abd ?? h.abd ?? 0), rot: r1(rot ?? h.rot ?? 0) };
  if (knee != null) p.ch[`knee_${s}`] = { flex: r1(knee) };
  if (dorsi != null) p.ch[`ankle_${s}`] = { dorsi: r1(dorsi) };
  return p;
}
const legs = (pose, o, oL) => leg(leg(pose, 'r', o), 'l', oL || o);

// Clearance (cm) between shape lists A and B: points along A's capsule axes (minus radius) and A's ellipsoid centres
// (minus the smallest radius) against B's shapes. Approximate but conservative enough for crossing legs.
function shapeGap(W, A, B) {
  let best = { d: 1e9 };
  for (const ida of A) {
    const sa = shapeById[ida], g = R.shapeWorld(W, sa), pts = [];
    if (g.kind === 'capsule') for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([V.add(g.a, V.scale(V.sub(g.b, g.a), t)), g.r[0] + (g.r[1] - g.r[0]) * t]); }
    else { const rr = Math.min(...g.axes.map(V.len)); pts.push([g.c, rr]); }
    for (const idb of B) for (const [p, rr] of pts) { const d = S3.shapeDist(W, shapeById[idb], p) - rr; if (d < best.d) best = { d: +d.toFixed(2), a: ida, b: idb }; }
  }
  return best;
}
const LEGR = ['thigh_r', 'shank_r', 'foot_r', 'calf_r', 'quad_r'], LEGL = ['thigh_l', 'shank_l', 'foot_l', 'calf_l', 'quad_l'];
const legGap = (W) => { const a = shapeGap(W, LEGR, LEGL), b = shapeGap(W, LEGL, LEGR); return a.d < b.d ? a : b; };
const heelLow = (W, s) => minOf(W, [`foot_${s}`, `calf_${s}`, `shank_${s}`]);

const setKin = (ex, prefix, setup, peak) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (!k) throw new Error('no kinematics row ' + prefix); if (setup != null) k.setup = setup; if (peak != null) k.peak = peak; };
const deg = (v) => `≈${Math.round(v)}°`;
const phase = (meta, id) => { const p = meta.timeline.phases.find((x) => x.id === id); if (!p) throw new Error('no phase ' + id); return p; };

// Solve the left arm with a right-arm solver f(pose) -> pose (targets given in the mirrored world: z flipped)
function mirrorArmSolve(pose, f) {
  const m = CB.mirror(pose), s = f(m), back = CB.mirror(s);
  const out = clone(pose);
  for (const j of ['shoulder_l', 'elbow_l', 'wrist_l', 'sc_l']) if (back.ch[j]) out.ch[j] = back.ch[j];
  return out;
}
const flipZ = (p) => [p[0], p[1], -p[2]];

// Whole-loop report on top of core-a scan, plus leg gap and custom probes
function report(ex, fns = {}, n = 1200) { return CA.scan(ex, fns, n); }

module.exports = { L, R, V, Q, rig, r1, clone, CA, CB, shapeById, bottomOf, minOf, supineHands, leg, legs, shapeGap, legGap, LEGR, LEGL, heelLow, setKin, deg, phase, mirrorArmSolve, flipZ, report };
