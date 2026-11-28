// Batch 6, family b6-17: helpers for the floor crunch / sit-up variations with the arms reaching (straight arms, hands
// on the thighs, cross-body reaches, starfish arms) and small shared bits for the leg raises. Builds on core-a / core-b /
// b4-core2 (lying base, cradle, planted feet, scan). Wrist local frame: +x = palm normal, -y = toward the fingers.
const L = require('../lib');
const { V, Q, rig, r1, clone } = L;
const CA = require('./core-a');

const ARM_PATHS = (s) => [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`, `ch.sc_${s}.protract`, `ch.sc_${s}.elevate`];
const armIds = (s) => [`upperarm_${s}`, `forearm_${s}`, `hand_${s}`, `thumb_${s}`];

// Solve one arm. opt.tip / opt.wrist: world target (array) or (W) => array for the fingertip / wrist; opt.palm, opt.fingers:
// world unit vectors (or (W) => vector) for the palm normal and the finger direction; opt.elbow: preferred elbow flexion;
// opt.floor: arm shapes kept this far above the mat; opt.avoid: [{ id, clr }] body shapes the hand must stay clear of
// (approximated by their capsule axis); opt.extra: more residual functions; opt.guess / opt.ref: seed and soft reference for the arm channels.
function armReach(pose, s, opt = {}) {
  const paths = ARM_PATHS(s);
  const val = (x, W) => (typeof x === 'function' ? x(W) : x);
  const objs = [];
  if (opt.tip) objs.push((W) => V.sub(W[`handtip_${s}`].p, val(opt.tip, W)).map((v) => v * (opt.tipW ?? 3)));
  if (opt.wrist) objs.push((W) => V.sub(W[`wrist_${s}`].p, val(opt.wrist, W)).map((v) => v * (opt.wristW ?? 3)));
  if (opt.palm) objs.push((W) => V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), V.norm(val(opt.palm, W))).map((v) => v * (opt.palmW ?? 1.2)));
  if (opt.fingers) objs.push((W) => V.sub(Q.rot(W[`wrist_${s}`].q, [0, -1, 0]), V.norm(val(opt.fingers, W))).map((v) => v * (opt.fingersW ?? 0.8)));
  objs.push(L.obj.reg(`ch.elbow_${s}.flex`, opt.elbow ?? 6, opt.elbowW ?? 0.15), L.obj.reg(`ch.wrist_${s}.flex`, 0, 0.05), L.obj.reg(`ch.wrist_${s}.dev`, 0, 0.05),
    L.obj.reg(`ch.sc_${s}.protract`, opt.protract ?? 0, 0.1), L.obj.reg(`ch.sc_${s}.elevate`, opt.elevate ?? 2, 0.1), CA.limitPen(paths, 3));
  if (opt.floor != null) objs.push((W) => armIds(s).map((id) => Math.min(0, CA.bottomOf(W, id) - opt.floor) * 3));
  if (opt.extra) objs.push(...opt.extra);
  if (opt.ref) objs.push(...['plane', 'elev', 'axial'].map((c) => L.obj.reg(`ch.shoulder_${s}.${c}`, opt.ref[`shoulder_${s}`][c], 0.02)), L.obj.reg(`ch.wrist_${s}.pron`, opt.ref[`wrist_${s}`].pron, 0.03));
  const seeds = opt.guess ? [opt.guess] : [
    { plane: 30, elev: 40, axial: 0, pron: 0 }, { plane: 60, elev: 80, axial: 0, pron: 0 }, { plane: 0, elev: 20, axial: 60, pron: 0 }, { plane: 40, elev: 120, axial: -40, pron: 60 }, { plane: 90, elev: 60, axial: 40, pron: -60 },
  ].map((g) => ({ [`shoulder_${s}`]: { plane: g.plane, elev: g.elev, axial: g.axial }, [`elbow_${s}`]: { flex: opt.elbow ?? 6 }, [`wrist_${s}`]: { pron: g.pron, flex: 0, dev: 0 }, [`sc_${s}`]: { protract: 0, elevate: 2 } }));
  let best = null;
  for (const g of seeds) {
    const q = clone(pose); for (const j in g) q.ch[j] = clone(g[j]);
    const r = L.solvePose(q, paths, objs, { iters: opt.iters || 300 });
    if (!best || r.cost < best.cost) best = r;
  }
  const out = best.pose;
  out.ch[`shoulder_${s}`].axial = r1(L.wrap(out.ch[`shoulder_${s}`].axial)); out.ch[`wrist_${s}`].pron = r1(L.wrap(out.ch[`wrist_${s}`].pron));
  out.__cost = best.cost;
  return out;
}
const armOf = (p, s = 'r') => { const o = {}; for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) o[`${j}_${s}`] = clone(p.ch[`${j}_${s}`]); return o; };
// mirror the right arm channels onto the left (rig channels are side-symmetric)
const mirrorArm = (p) => { for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); return p; };
const mz = (v) => [v[0], v[1], -v[2]];

// Pose limits check (stored channels), as verify does
function limitViolations(poses) {
  const out = [];
  for (const [name, p] of Object.entries(poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) out.push(`${name}.${j}.${c}=${p.ch[j][c]}`); }
  return out;
}
// closest distance from a point to a body shape's axis minus its radius (capsules) or rough radius (ellipsoids)
const shapeById = Object.fromEntries(rig.shapes.map((s) => [s.id, s]));
function gapTo(W, id, pt) {
  const g = L.R.shapeWorld(W, shapeById[id]);
  if (g.kind === 'capsule') { const ab = V.sub(g.b, g.a), t = Math.max(0, Math.min(1, V.dot(V.sub(pt, g.a), ab) / V.dot(ab, ab))); return V.len(V.sub(pt, V.add(g.a, V.scale(ab, t)))) - (g.r[0] + (g.r[1] - g.r[0]) * t); }
  // ellipsoid (axes are radius-scaled): scaled radial distance, converted to cm with the smallest radius (sign exact)
  const d = V.sub(pt, g.c), s = Math.sqrt(g.axes.reduce((acc, a) => acc + (V.dot(d, a) / V.dot(a, a)) ** 2, 0));
  return (s - 1) * Math.min(...g.axes.map((a) => V.len(a)));
}

// height above a limb axis where a point clears the listed shapes by clr (bisection along n from base)
function surfaceUp(W, base, n, ids, clr = 0.8) {
  let lo = 0, hi = 25;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, pt = V.add(base, V.scale(n, m)); if (Math.min(...ids.map((id) => gapTo(W, id, pt))) < clr) lo = m; else hi = m; }
  return hi;
}

/* ---------------- Sit-up body (from author-sit-up.js): feet anchored, the pelvis rolls toward the thighs ---------------- */
// F: CA.plantFeet result on a lying pose. Returns body(k): spine flex adds (l5, t12, t6), optional rot (+ = right shoulder
// forward, toward the left knee, as twisting-crunch) and lat, neck total, and either pitch (added to the lying pitch) or
// fromFloor (pelvis-to-C7 angle above the floor). Legs re-fitted to the anchored feet; arms left as they are.
function sitUpBody(F, NECK0) {
  const lie = F.pose, P0 = lie.root.rot.pitch;
  const LEG = { hip: clone(lie.ch.hip_r), hipL: clone(lie.ch.hip_l) };
  const sitBottom = (W) => Math.min(CA.bottomOf(W, 'buttock_r'), CA.bottomOf(W, 'buttock_l'), CA.bottomOf(W, 'pelvis'));
  const SIT0 = sitBottom(L.fk(lie));
  const SPLIT = { spine_l5: 0.08, spine_t12: 0.46, spine_t6: 0.46 };
  function setP(q, P, drop = 0) {
    q.root.rot.pitch = r1(P); q.root.pos[1] = r1(lie.root.pos[1] - drop);
    q.ch.hip_r = Object.assign(clone(LEG.hip), { flex: r1(LEG.hip.flex + (P0 - P)) });
    q.ch.hip_l = Object.assign(clone(LEG.hipL), { flex: r1(LEG.hipL.flex + (P0 - P)) });
    return q;
  }
  return function body(k) {
    const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
    for (const j of Object.keys(SPLIT)) Object.assign(p.ch[j], { rot: r1(-(k.rot || 0) * SPLIT[j]), latFlex: r1(-(k.lat || 0) * (j === 'spine_l5' ? 0 : 0.5)) });
    const nk = k.neck == null ? NECK0 : k.neck, nr = -(k.rot || 0) * 0.35;
    p.ch.neck_c7 = { rot: r1(nr * 0.4), flex: r1(nk * 0.55) }; p.ch.head_c1 = { rot: r1(nr * 0.6), flex: r1(nk * 0.45) };
    let P = P0;
    if (k.fromFloor != null) {
      let hi = P0 + 10, lo = hi;
      while (lo > 0 && CA.trunkFromFloor(L.fk(setP(clone(p), lo))) <= k.fromFloor) { hi = lo; lo -= 2; }
      for (let i = 0; i < 60; i++) { P = (lo + hi) / 2; if (CA.trunkFromFloor(L.fk(setP(clone(p), P))) > k.fromFloor) lo = P; else hi = P; }
    } else P = P0 + (k.pitch || 0);
    setP(p, P);
    const W = L.fk(p, F.contacts), drop = Math.max(0, sitBottom(W) - SIT0);
    setP(p, P, drop);
    let q = p;
    for (const s of ['r', 'l']) q = CA.fitLeg(q, s, F.targets[s], F.contacts);
    q.ik = clone(lie.ik);
    return q;
  };
}

module.exports = { sitUpBody, surfaceUp, ARM_PATHS, armIds, armReach, armOf, mirrorArm, mz, limitViolations, gapTo };
