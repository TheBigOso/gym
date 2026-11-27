// Single-leg family (batch 2): step-up, lateral step-up, single-leg squat. Builds on the lunge family (feet specs with
// `lift` for a foot planted on a box, swing feet, bisection root solves) and adds a whole-body centre of mass so
// single-leg poses can be balanced over the stance foot.
const L = require('../lib');
const { R, V, r1, clone, rig } = L;
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset);
// Ankle dorsiflexion of a drawn leg (as test/verify.mjs measures it for contact-driven legs)
const dorsiOf = (W, s) => ANKLE_REST - V.angle(V.sub(W[`knee_${s}`].p, W[`ankle_${s}`].p), V.sub(W[`toe_${s}`].p, W[`ankle_${s}`].p));
const { makeFamily, kneeOf, trunkLean } = require('./lunge');

// Segment mass fractions (Dempster-style, rounded): each segment is the midpoint between two joints
const SEGS = [
  ['pelvis', 'spine_t12', 0.25], ['spine_t12', 'neck_c7', 0.25], ['neck_c7', 'head_top', 0.081],
  ...['r', 'l'].flatMap((s) => [[`hip_${s}`, `knee_${s}`, 0.1], [`knee_${s}`, `ankle_${s}`, 0.0465], [`ankle_${s}`, `toe_${s}`, 0.0145],
    [`shoulder_${s}`, `elbow_${s}`, 0.028], [`elbow_${s}`, `wrist_${s}`, 0.016], [`wrist_${s}`, `handtip_${s}`, 0.006]]),
];
function com(W) {
  const P = (j) => (j === 'head_top' ? V.add(W.head_c1.p, [0, 14, 0]) : W[j].p);
  let m = 0, c = [0, 0, 0];
  for (const [a, b, w] of SEGS) { c = V.add(c, V.scale(V.add(P(a), P(b)), w / 2)); m += w; }
  return V.scale(c, 1 / m);
}

function makeSingle(opts = {}) {
  const F = makeFamily(opts);
  // Solve root x, y, z so the named leg reaches a knee angle and the centre of mass sits over (cx, cz).
  // y by LM with the other two (good for bent knees); pass `keep` to hold any path fixed.
  // The arms (spec.arms) are left out of the inner solve and corrected for in a few outer passes.
  function balance(spec, { knee, side = 'r', cx, cz, pitch = false, extra = [], passes = 3 }) {
    const paths = ['root.0', 'root.1', 'root.2'].concat(pitch ? ['pitch'] : []);
    let tx = cx, tz = cz, s = spec;
    for (let i = 0; i < passes; i++) {
      const ex = [(W) => { const c = com(W); return [(c[0] - tx) * 1, (c[2] - tz) * 1]; }, ...extra];
      s = F.solveRoot(s, { knee, side, paths, extra: ex });
      if (!spec.arms) break;
      const c = com(F.fk(F.pose(Object.assign(clone(s), { arms: spec.arms }))));
      tx += cx - c[0]; tz += cz - c[2];
    }
    return Object.assign(s, { arms: spec.arms });
  }
  // Same, for a near-straight stance knee: root y by bisection inside a loop over x/z (LM stalls at full reach)
  function balanceTall(spec, { knee = 4, side = 'r', cx, cz, iters = 12 }) {
    let s = clone(spec);
    for (let i = 0; i < iters; i++) {
      s = rootY(s, knee, side);
      const c = com(F.fk(F.pose(Object.assign(clone(s), { arms: spec.arms }))));
      s.root[0] = r1(s.root[0] - (c[0] - cx)); s.root[2] = r1(s.root[2] - (c[2] - cz));
    }
    return Object.assign(rootY(s, knee, side), { arms: spec.arms });
  }
  // Root height for a knee angle by bisection over a wide range (standing on a box needs more than the lunge family's 105 cm)
  function rootY(spec, knee, side = 'r', lo = 30, hi = 170) {
    let a = lo, b = hi;
    for (let i = 0; i < 50; i++) { const y = (a + b) / 2, s2 = clone(spec); s2.root[1] = y; if (kneeOf(F.fk(F.build(s2)), side) > knee) a = y; else b = y; }
    const s2 = clone(spec); s2.root[1] = r1((a + b) / 2); return Object.assign(s2, { arms: spec.arms });
  }
  // General solve: free paths ('root.0|1|2', 'pitch') against residual functions of the drawn pose (arms left out)
  function solve(spec, paths, resFns, iters = 300) {
    const set = (x) => { const s2 = clone(spec); paths.forEach((pp, i) => { if (pp === 'pitch') s2.pitch = x[i]; else s2.root[+pp.split('.')[1]] = x[i]; }); return s2; };
    const x0 = paths.map((pp) => (pp === 'pitch' ? spec.pitch || 0 : spec.root[+pp.split('.')[1]]));
    const sol = R.solveLM(x0, (x) => { const W = F.fk(F.build(set(x))); return resFns.flatMap((f) => f(W)); }, { iters });
    return Object.assign(set(sol.x.map(r1)), { arms: spec.arms });
  }
  // Free (swinging) foot placed from its hip: knee bent `knee` degrees, the hip-ankle line `fwd` degrees forward of
  // vertical, ankle at z = min(hip z + dz, zMax). Returns a swing-foot spec (weight 0) for spec.feet[side].
  function freeFoot(spec, side, { knee = 15, fwd = 5, dz = 0, zMax = 1e9, pitch = 10 }) {
    const W = F.fk(F.build(spec)), hip = W[`hip_${side}`].p, a = 42, b = 41.5, d = Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(knee * Math.PI / 180));
    const x = hip[0] + d * Math.sin(fwd * Math.PI / 180), z = Math.min(hip[2] + dz, zMax);
    const y = hip[1] - Math.sqrt(Math.max(0, d * d - (x - hip[0]) ** 2 - (z - hip[2]) ** 2));
    return { c: 'flat', x: r1(x), z: r1(z), lift: r1(y - F.ANK_FLAT), w: 0, pitch };
  }
  // Key pose with every channel wrapped into [-180, 180] (the leg fit can land on an equivalent angle 360 away)
  function pose(spec) {
    const p = F.pose(spec);
    for (const j in p.ch) for (const c in p.ch[j]) if (typeof p.ch[j][c] === 'number') p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
    return p;
  }
  return Object.assign({}, F, { com, balance, balanceTall, rootY, solve, dorsiOf, pose, freeFoot });
}
module.exports = { makeSingle, com, kneeOf, trunkLean, dorsiOf };
