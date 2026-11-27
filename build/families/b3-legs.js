// Batch 3 legs family helpers: dumbbells held for lower-body work (hanging at the sides, goblet at the chest, across the
// hips), clearance of a held dumbbell against the rig body shapes, and a whole-loop dumbbell scan.
// Builds on build/families/dumbbell.js (dumbbellAt / dumbbellMinY / dumbbellBoxClearance) and the batch 2 families.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const D = require('./dumbbell');

const SIZE = [32, 12, 12];
// Held dumbbell prop for the hand on `side`; `offset` (athlete grip frame [toward fingers, out of palm, thumb axis], cm)
// overrides the grip's default placement.
function heldProp(side, grip = 'handle', offset) {
  const p = { id: side === 'r' ? 'dbR' : 'dbL', kind: 'dumbbell', size: SIZE.slice(), attach: { joint: `wrist_${side}`, grip } };
  if (offset) p.attach.offset = offset.slice();
  return p;
}
// Rig-frame grip spec matching an athlete-frame attach.offset ([f, n, t] -> rig [n, -f, -t]: the athlete's t = n x f is the
// rig hand's -Z, so a positive athlete t points away from the thumb)
function gripSpec(grip, offset) {
  if (!offset) return grip;
  const g = D.GRIP[grip];
  const key = `${grip}@${offset.join(',')}`;
  if (!D.GRIP[key]) D.GRIP[key] = { off: [offset[1], -offset[0], -offset[2]], axis: g.axis };
  return key;
}

// Distance from a point to a rig body shape (cm, < 0 inside). Ellipsoids: scaled-space approximation (exact for spheres).
function shapeDist(W, s, p) {
  const g = R.shapeWorld(W, s);
  if (g.kind === 'capsule') {
    const ab = V.sub(g.b, g.a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, g.a), ab) / V.dot(ab, ab)));
    const q = V.add(g.a, V.scale(ab, t)), r = g.r[0] + (g.r[1] - g.r[0]) * t;
    return V.len(V.sub(p, q)) - r;
  }
  const d = V.sub(p, g.c), u = g.axes.map((a) => V.dot(d, a) / V.dot(a, a)), n = Math.hypot(...u);
  const rmin = Math.min(...g.axes.map((a) => V.len(a)));
  return (n - 1) * (n < 1 ? rmin : V.len(d) / Math.max(n, 1e-6));
}
const shapesBy = (ids) => rig.shapes.filter((s) => ids.some((i) => s.id === i || s.id.startsWith(`${i}_`)));
// Clearance of the dumbbell's two plates (sampled cylinders) against body shapes (cm; < 0 means it passes into the body)
function dbClear(W, side, grip, ids, offset) {
  const d = D.dumbbellAt(W, side, gripSpec(grip, offset), { length: SIZE[0], diameter: SIZE[1] });
  const shapes = shapesBy(ids);
  let best = { c: 1e9 };
  // plate centres sit at +-11.5 cm along the axis, 9 cm long; sample the plate rim and axis
  const u = Math.abs(d.ax[1]) < 0.9 ? V.norm(V.cross(d.ax, [0, 1, 0])) : V.norm(V.cross(d.ax, [1, 0, 0])), w = V.cross(d.ax, u);
  for (const sg of [-1, 1]) for (const a of [7, 11.5, 16]) {
    const pc = V.add(d.c, V.scale(d.ax, sg * a));
    const pts = [pc];
    for (let k = 0; k < 8; k++) { const th = (k / 8) * 2 * Math.PI; pts.push(V.add(pc, V.add(V.scale(u, Math.cos(th) * d.r), V.scale(w, Math.sin(th) * d.r)))); }
    for (const p of pts) for (const s of shapes) { const c = shapeDist(W, s, p); if (c < best.c) best = { c, id: s.id }; }
  }
  best.c = +best.c.toFixed(2);
  return best;
}
// Lowest point of the dumbbell (cm)
const dbMinY = (W, side, grip, offset) => D.dumbbellMinY(W, side, gripSpec(grip, offset), { length: SIZE[0], diameter: SIZE[1] });

// Both arms hanging straight down (world vertical, whatever the trunk lean) holding dumbbells with a neutral grip
// (palms facing the thighs, thumbs forward). opt: { out (cm the wrist sits outside the shoulder), fwd (cm in front),
// elbow (flexion), drop (extra hand drop by scapular depression, -elevate) }
const handFwd = (W, s) => Q.rot(W[`wrist_${s}`].q, [0, 0, 1]);   // thumb axis (right hand: +Z at rest)
const handPalm = (W, s) => Q.rot(W[`wrist_${s}`].q, [1, 0, 0]);  // out of the palm
function armsHang(pose, opt = {}) {
  const out = opt.out ?? 4, fwd = opt.fwd ?? 0, elbow = opt.elbow ?? 6;
  let p = clone(pose);
  p.ch.sc_r = { protract: opt.protract ?? 2, elevate: opt.elevate ?? -3 }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.elbow_r = { flex: elbow };
  const W0 = L.fk(p), S = W0.shoulder_r.p, len = L.reach(elbow);
  const dx = fwd, dz = out, dy = -Math.sqrt(Math.max(1, len * len - dx * dx - dz * dz));
  const target = V.add(S, [dx, dy, dz]);
  const set = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; q.ch.wrist_r = { pron: x[3], flex: x[4], dev: x[5] }; return q; };
  const res = (x) => {
    const W = L.fk(set(x));
    return [...V.sub(W.wrist_r.p, target).map((v) => v * 3),
      ...V.sub(handFwd(W, 'r'), V.norm([1, 0, opt.toeIn ?? 0])).map((v) => v * 6),   // thumbs forward: handle front-to-back
      ...V.sub(handPalm(W, 'r'), [0, 0, -1]).map((v) => v * 3),                       // palm toward the thigh
      x[4] * 0.05, x[5] * 0.05, (x[2] - 0) * 0.005];
  };
  let best = null;
  for (const g of [[0, 8, 0, 90, 0, 0], [0, 8, 90, 0, 0, 0], [30, 8, 45, 45, 0, 0], [0, 8, -90, 170, 0, 0]]) {
    const s = R.solveLM(g, res, { iters: 400 }); if (!best || s.cost < best.cost) best = s;
  }
  const x = best.x.map(r1); x[0] = r1(L.wrap(x[0])); x[2] = r1(L.wrap(x[2])); x[3] = r1(L.wrap(x[3]));
  p = set(x);
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); });
  p.__armCost = best.cost;
  return p;
}

// Goblet hold: one dumbbell upright in front of the sternum, the palms cupping the top plate (right hand carries it, the
// left mirrors). The hands sit in the upper-trunk (spine_t6) frame: `at` = right wrist [forward, up, out] in that frame;
// `tilt` blends the forearm direction between world vertical (0) and the trunk axis (1). Elbows point down and in.
const GOBLET_OFFSET = [-4.5, 7.3, 1.5]; // athlete grip frame: top plate in the palms, the handle hanging below the hands
function gobletArms(pose, opt = {}) {
  const at = opt.at || [22, 2, 7], tilt = opt.tilt ?? 0.4, palmUp = opt.palmUp ?? 0.25;
  let p = clone(pose);
  p.ch.sc_r = { protract: opt.protract ?? 10, elevate: opt.elevate ?? 4 }; p.ch.sc_l = clone(p.ch.sc_r);
  const W0 = L.fk(p), T = W0.spine_t6, target = V.add(T.p, Q.rot(T.q, at));
  const trunkUp = V.norm(V.sub(W0.neck_c7.p, W0.spine_t12.p));
  const fingers = V.norm(V.add(V.scale([0, 1, 0], 1 - tilt), V.scale(trunkUp, tilt)));
  const palm = V.norm([0, palmUp, -1]);
  const elbowTgt = V.add(T.p, Q.rot(T.q, opt.elbow || [16, -22, 13]));
  const set = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; q.ch.elbow_r = { flex: x[3] }; q.ch.wrist_r = { pron: x[4], flex: x[5], dev: x[6] }; return q; };
  const res = (x) => {
    const W = L.fk(set(x));
    const fd = Q.rot(W.wrist_r.q, [0, -1, 0]);
    return [...V.sub(W.wrist_r.p, target).map((v) => v * 3), ...V.sub(fd, fingers).map((v) => v * 8), ...V.sub(handPalm(W, 'r'), palm).map((v) => v * 4),
      ...V.sub(W.elbow_r.p, elbowTgt).map((v) => v * 0.4), x[5] * 0.02, x[6] * 0.03,
      Math.max(0, x[3] - 148) * 5, Math.max(0, x[5] - 78) * 5, Math.max(0, -88 - x[5]) * 5, Math.max(0, x[6] - 33) * 5, Math.max(0, -18 - x[6]) * 5];
  };
  let best = null;
  for (const g of [[60, 30, 0, 130, 90, 0, 0], [80, 20, 60, 140, 30, 0, 0], [40, 40, -40, 130, 120, 0, 0], [70, 25, 30, 135, 60, -20, 0]]) {
    const s = R.solveLM(g, res, { iters: 500 }); if (!best || s.cost < best.cost) best = s;
  }
  const x = best.x.map(r1); x[0] = r1(L.wrap(x[0])); x[2] = r1(L.wrap(x[2])); x[4] = r1(L.wrap(x[4]));
  p = set(x);
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); });
  p.__armCost = best.cost;
  return p;
}

// Dumbbell across the hips (hip thrust): the right hand carries it on its outer plate (grip 'handle' with attach.offset
// HIP_OFFSET, so the dumbbell centre sits medial of the fist) and the left hand mirrors on the other plate. The dumbbell
// centre is held at `at` in the pelvis frame [toward the front of the pelvis, toward the head, side], palms pressing
// down onto the plates, fingers toward the knees.
const HIP_OFFSET = [6.5, 7.5, -11.5];
function hipHoldArms(pose, opt = {}) {
  const at = opt.at || [15, -2, 0], spec = gripSpec('handle', opt.offset || HIP_OFFSET), size = { length: SIZE[0], diameter: SIZE[1] };
  let p = clone(pose);
  p.ch.sc_r = { protract: opt.protract ?? 12, elevate: opt.elevate ?? 0 }; p.ch.sc_l = clone(p.ch.sc_r);
  const W0 = L.fk(p), P = W0.pelvis, target = V.add(P.p, Q.rot(P.q, at));
  const into = Q.rot(P.q, [-1, 0, 0]), toKnees = Q.rot(P.q, [0, -1, 0]), side = Q.rot(P.q, [0, 0, 1]);
  const elbowTgt = opt.elbow ? V.add(P.p, Q.rot(P.q, opt.elbow)) : null;
  const set = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; q.ch.elbow_r = { flex: x[3] }; q.ch.wrist_r = { pron: x[4], flex: x[5], dev: x[6] }; return q; };
  const res = (x) => {
    const W = L.fk(set(x)), d = D.dumbbellAt(W, 'r', spec, size);
    return [...V.sub(d.c, target).map((v) => v * 3), ...V.sub(handPalm(W, 'r'), into).map((v) => v * 2), ...V.sub(Q.rot(W.wrist_r.q, [0, -1, 0]), toKnees).map((v) => v * 1),
      ...(elbowTgt ? V.sub(W.elbow_r.p, elbowTgt).map((v) => v * 0.25) : []), (Math.abs(V.dot(d.ax, side)) - 1) * 40, x[5] * 0.02, x[6] * 0.03, Math.max(0, 2 - x[1]) * 5, Math.max(0, -58 - x[0]) * 5, Math.max(0, x[0] - 138) * 5,
      Math.max(0, x[3] - 148) * 5, Math.max(0, -x[3]) * 5, Math.max(0, x[5] - 78) * 5, Math.max(0, -88 - x[5]) * 5, Math.max(0, x[6] - 33) * 5, Math.max(0, -18 - x[6]) * 5];
  };
  let best = null;
  for (const g of [[40, 60, 0, 60, 0, 0, 0], [20, 40, 40, 80, 90, 0, 0], [60, 80, -40, 50, -90, 0, 0], [0, 30, 0, 90, 0, -30, 0], [90, 60, 60, 60, 60, 0, 0]]) {
    const s = R.solveLM(g, res, { iters: 600 }); if (!best || s.cost < best.cost) best = s;
  }
  const x = best.x.map(r1); x[0] = r1(L.wrap(x[0])); x[2] = r1(L.wrap(x[2])); x[4] = r1(L.wrap(x[4]));
  p = set(x);
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); });
  p.__armCost = best.cost;
  if (opt.debug) p.__armRes = res(best.x).map((v) => +v.toFixed(2));
  return p;
}

// Whole-loop scan of held dumbbells: lowest dumbbell point and clearance to the listed body shapes (and an optional box prop)
function dbLoop(ex, holds, ids, { box, n = 600 } = {}) {
  const tl = R.buildTimeline(ex), Dur = ex.timeline.duration, out = { dbFloor: 1e9, dbClear: 1e9, dbClearAt: null, dbBox: 1e9 };
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Dur, W = R.evalPose(rig, tl.pose(t), ex.contacts);
    for (const h of holds) {
      out.dbFloor = Math.min(out.dbFloor, dbMinY(W, h.side, h.grip, h.offset));
      const c = dbClear(W, h.side, h.grip, ids, h.offset); if (c.c < out.dbClear) { out.dbClear = c.c; out.dbClearAt = [h.side, c.id, +t.toFixed(2)]; }
      if (box) out.dbBox = Math.min(out.dbBox, D.dumbbellBoxClearance(W, h.side, box, gripSpec(h.grip, h.offset), { length: SIZE[0], diameter: SIZE[1] }));
    }
  }
  for (const k of ['dbFloor', 'dbClear', 'dbBox']) out[k] = +out[k].toFixed(2);
  if (!box) delete out.dbBox;
  return out;
}
module.exports = { SIZE, heldProp, gripSpec, shapeDist, dbClear, dbMinY, armsHang, gobletArms, GOBLET_OFFSET, hipHoldArms, HIP_OFFSET, dbLoop, handFwd, handPalm };
