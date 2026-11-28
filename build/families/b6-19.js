// Batch 6 family b6-19: supine leg drills (alternate straight-leg circles, frog kicks, tabletop heel touch), plus small
// helpers shared by the other b6-19 authors. Built on core-a (lying base, planted hands, straight-leg setter).
const L = require('../lib');
const { R, V, r1, clone } = L;
const C = require('./core-a');

// Supine, legs straight on the mat, arms by the sides palms down (planted hands): the flutter-kick / leg-raise base.
function supineHands({ abd = 12, kneeFlex = 0 } = {}) {
  const B = C.lie({ kneeFlex });
  const HC = C.handContacts();
  const base = C.plantHands(B.pose, C.handTargets(B.pose, { abd }), HC);
  return { base, HC, B };
}

// One straight leg at circle angle th (deg) on a circle of centre `deg` (leg angle from the floor) with flexion and
// abduction half-ranges aF / aA. th = 0 is the top of the circle; positive th goes toward the midline first (across).
function circleLeg(pose, s, { deg, aF, aA, abd0 = 2, knee = 3, dorsi = -25 }, th) {
  const p = C.setLeg(pose, s, { deg, knee, dorsi, abd: abd0 });
  const f0 = p.ch[`hip_${s}`].flex, t = th * R.DEG;
  p.ch[`hip_${s}`] = { flex: r1(f0 + aF * Math.cos(t)), abd: r1(abd0 - aA * Math.sin(t)), rot: 0 };
  return p;
}

// Frog leg: hip flexion F, knee K, hip abduction A; hip rotation solved so the ankle sits `heelZ` cm from the midline
// (heels together, knees out). Returns the pose.
function frogLeg(pose, s, { F, K, A, heelZ = 5, dorsi = -15 }) {
  const p = clone(pose);
  p.ch[`hip_${s}`] = { flex: F, abd: A, rot: 0 }; p.ch[`knee_${s}`] = { flex: K }; p.ch[`ankle_${s}`] = { dorsi };
  const sg = s === 'r' ? 1 : -1;
  const out = L.solvePose(p, [`ch.hip_${s}.rot`], [(W) => [(W[`ankle_${s}`].p[2] * sg - heelZ) * 1], (W, q) => [Math.max(0, Math.abs(q.ch[`hip_${s}`].rot) - 39) * 5]]).pose;
  out.ch[`hip_${s}`].rot = r1(out.ch[`hip_${s}`].rot);
  return out;
}

// Linear blend of two poses' channels (same channel sets); root and ik from a.
function blend(a, b, f) {
  const p = clone(a);
  for (const j in b.ch) { p.ch[j] = p.ch[j] || {}; for (const c in b.ch[j]) { const va = a.ch[j] && a.ch[j][c] != null ? a.ch[j][c] : 0; p.ch[j][c] = r1(va + (b.ch[j][c] - va) * f); } }
  return p;
}

module.exports = { supineHands, circleLeg, frogLeg, blend };
