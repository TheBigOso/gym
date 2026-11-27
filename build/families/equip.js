// Equipment helpers for authoring (equipment pack): barbell, kettlebell, cable, band, rack and pull-up bar.
// The player draws these from the athlete's hands (src/player.js placeHeld); these helpers estimate the same items on
// the RepRig skeleton so author scripts can put the hands on the bar, keep plates off the floor and the body, and keep a
// cable or band from passing through the body. Units: cm, world axes (+X forward, +Y up, +Z figure's right).
//
// Two-hand items sit between the two grip points (the handle point of each hand, as for a dumbbell 'handle' grip).
// Author scripts should keep the grip width constant through the loop: test/verify.mjs checks it (within 1.5 cm).
const L = require('../lib');
const { R, V, Q, rig } = L;
const DBF = require('./dumbbell');

const BAR = { length: 220, inner: 131, shaftR: 1.4, sleeveR: 2.5, plateX: 71.5, plateW: 5.5, plateD: 45 }; // Olympic bar
const KB = { width: 15, bell: 21 }; // 16 kg kettlebell: handle width, bell diameter
const shapeIds = rig.shapes.flatMap((s) => (s.bilateral ? [`${s.id}_r`, `${s.id}_l`] : [s.id]));
const builtRig = R.buildRig(rig);
const shapeOf = (id) => builtRig.shapes.find((s) => s.id === id);

// grip (handle) point of one hand, and the handle axis
function gripPoint(W, side, grip = 'handle') { const d = DBF.dumbbellAt(W, side, grip); return { p: d.c, ax: d.ax }; }

/* ---------------- barbell (two hands) ---------------- */
// Bar centre, axis (left grip -> right grip) and grip width from the two hands
function barAt(W, grip = 'handle') {
  const r = gripPoint(W, 'r', grip).p, l = gripPoint(W, 'l', grip).p, d = V.sub(r, l), w = V.len(d);
  return { c: V.scale(V.add(r, l), 0.5), ax: V.scale(d, 1 / Math.max(1e-6, w)), width: w, r, l };
}
// Grip points for a bar at centre c along axis ax with the hands `width` cm apart (handle centres)
function barGrips(c, ax, width) { const a = V.norm(ax); return { r: V.add(c, V.scale(a, width / 2)), l: V.sub(c, V.scale(a, width / 2)) }; }
// Objectives (for L.solvePose) that pull both hands onto given grip points, with the handle axes along the bar
function onBar(grips, ax, { w = 3, wAxis = 1, grip = 'handle' } = {}) {
  const a = V.norm(ax);
  return [
    (W) => V.sub(gripPoint(W, 'r', grip).p, grips.r).map((v) => v * w),
    (W) => V.sub(gripPoint(W, 'l', grip).p, grips.l).map((v) => v * w),
    (W) => [(1 - Math.abs(V.dot(gripPoint(W, 'r', grip).ax, a))) * 10 * wAxis, (1 - Math.abs(V.dot(gripPoint(W, 'l', grip).ax, a))) * 10 * wAxis],
  ];
}
// Bar segments as capsules [a, b, r] (shaft between the collars, sleeves) and plate discs { c, ax, r, w }
function barGeometry(bar, { length = BAR.length, plates = 1, plateD = BAR.plateD } = {}) {
  const at = (x) => V.add(bar.c, V.scale(bar.ax, x)), caps = [[at(-BAR.inner / 2), at(BAR.inner / 2), BAR.shaftR], [at(BAR.inner / 2), at(length / 2), BAR.sleeveR], [at(-BAR.inner / 2), at(-length / 2), BAR.sleeveR]];
  const discs = [];
  for (const s of [-1, 1]) for (let i = 0; i < plates; i++) discs.push({ c: at(s * (BAR.plateX + i * (BAR.plateW + 0.5))), ax: bar.ax, r: plateD / 2, w: BAR.plateW });
  return { caps, discs };
}
// lowest point of a disc (cm)
const discMinY = (d) => d.c[1] - d.r * Math.sqrt(Math.max(0, 1 - d.ax[1] * d.ax[1])) - (d.w / 2) * Math.abs(d.ax[1]);
// Lowest point of the barbell (plates, or the bar if no plates)
function barMinY(W, opt = {}) {
  const g = barGeometry(barAt(W, opt.grip || 'bar'), opt);
  return Math.min(...g.discs.map(discMinY), ...g.caps.map(([a, b, r]) => Math.min(a[1], b[1]) - r));
}

/* ---------------- distances to the body ---------------- */
// signed distance (cm) from a point to a rig shape (approximate for ellipsoids: scaled-sphere distance, measured with
// the shortest axis, so long ellipsoids read a little closer than they are: safe, but it can flag false touches)
function pointShape(W, p, id) {
  const g = R.shapeWorld(W, shapeOf(id));
  if (g.kind === 'capsule') {
    const ab = V.sub(g.b, g.a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, g.a), ab) / Math.max(1e-9, V.dot(ab, ab)))), r = g.r[0] + (g.r[1] - g.r[0]) * t;
    return V.len(V.sub(p, V.add(g.a, V.scale(ab, t)))) - r;
  }
  const d = V.sub(p, g.c), u = g.axes.map((a) => V.dot(d, a) / V.dot(a, a)), k = Math.hypot(...u), rmin = Math.min(...g.axes.map(V.len));
  return (k - 1) * rmin;
}
// Clearance (cm, < 0 = into the body) of a segment of radius r from the body shapes, skipping ids matched by `skip`
function segmentClear(W, a, b, r, { skip = /^(hand|thumb)_/, n = 12 } = {}) {
  let best = { d: 1e9, id: null };
  for (let k = 0; k <= n; k++) {
    const p = V.add(a, V.scale(V.sub(b, a), k / n));
    for (const id of shapeIds) { if (skip && skip.test(id)) continue; const d = pointShape(W, p, id) - r; if (d < best.d) best = { d, id, k }; }
  }
  return best;
}
// Barbell clearance from the body (skip the hands and forearms that hold it; `skip` may be widened, e.g. the traps for
// a back squat where the bar rests on them). Plates are checked as thin discs (rim and face points), not spheres.
function barClear(W, opt = {}) {
  const g = barGeometry(barAt(W, opt.grip || 'bar'), opt), skip = opt.skip || /^(hand|thumb|forearm)_/;
  let best = { d: 1e9 };
  for (const [a, b, r] of g.caps) { const c = segmentClear(W, a, b, r, { skip }); if (c.d < best.d) best = c; }
  for (const d of g.discs) {
    const u = V.norm(V.cross(d.ax, Math.abs(d.ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = V.cross(d.ax, u), pts = [];
    for (const face of [-1, 1]) { const c0 = V.add(d.c, V.scale(d.ax, (face * d.w) / 2)); pts.push(c0); for (const rr of [0.5, 1]) for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI; pts.push(V.add(c0, V.add(V.scale(u, Math.cos(a) * d.r * rr), V.scale(w, Math.sin(a) * d.r * rr)))); } }
    for (const id of shapeIds) { if (skip.test(id)) continue; for (const p of pts) { const dd = pointShape(W, p, id); if (dd < best.d) best = { d: dd, id, plate: true }; } }
  }
  return best;
}

/* ---------------- kettlebell ---------------- */
// One hand ('handle' grip): bell hangs past the knuckles (rig wrist frame: fingers -Y). Two hands on the handle: bell
// below the midpoint of the grips. Returns the bell centre and radius.
function kettlebellAt(W, side = 'r', { two = false, size = KB } = {}) {
  const drop = 6 + size.bell * 0.42, rad = (size.bell / 2) * 0.96;
  if (!two) { const w = W[`wrist_${side}`], h = gripPoint(W, side).p; return { handle: h, c: V.add(h, Q.rot(w.q, [0, -drop, 0])), r: rad }; }
  // two hands: the bell hangs past the knuckles of both hands (as the player draws it), i.e. along the mean finger
  // direction, perpendicular to the handle
  const b = barAt(W), f0 = V.add(Q.rot(W.wrist_r.q, [0, -1, 0]), Q.rot(W.wrist_l.q, [0, -1, 0])), f1 = V.sub(f0, V.scale(b.ax, V.dot(f0, b.ax)));
  const f = V.len(f1) > 1e-6 ? V.norm(f1) : [0, -1, 0];
  return { handle: b.c, c: V.add(b.c, V.scale(f, drop)), r: rad, width: b.width };
}
function kettlebellMinY(W, side, opt) { const k = kettlebellAt(W, side, opt); return k.c[1] - k.r; }
function kettlebellClear(W, side, opt = {}) {
  const k = kettlebellAt(W, side, opt), skip = opt.skip || /^(hand|thumb|forearm)_/; let best = { d: 1e9 };
  for (const id of shapeIds) { if (skip.test(id)) continue; const d = pointShape(W, k.c, id) - k.r; if (d < best.d) best = { d, id }; }
  return best;
}

/* ---------------- cable and band ---------------- */
// Where the cable or band meets the hand(s): one hand = its grip point; two hands = the grips' midpoint (a rope's knot
// sits 16 cm from the midpoint toward the anchor)
function attachPoint(W, { two = false, side = 'r', rope = false, anchor = null } = {}) {
  if (!two) return gripPoint(W, side).p;
  const b = barAt(W); return rope && anchor ? V.add(b.c, V.scale(V.norm(V.sub(anchor, b.c)), 16)) : b.c;
}
// Clearance of the cable / band line from the body (skips the hands and forearms at the hand end)
function lineClear(W, anchor, end, r = 0.5, opt = {}) { return segmentClear(W, anchor, end, r, { skip: opt.skip || /^(hand|thumb|forearm)_/, n: 16 }); }
// anchor point that moves with a rig joint (e.g. a band under the foot)
const jointAnchor = (W, j) => W[j].p.slice();

/* ---------------- props ---------------- */
// Squat / power rack centred at x (depth 0 = stands only), J-hooks at hookY
// facing +1: hooks point +X (default); -1: hooks point -X (a rack in front of a lifter facing +X)
function rack({ x = 0, z = 0, depth = 0, height = 230, width = 120, hookY = 140, safetyY = null, facing = 1, id = 'rack' } = {}) {
  const prop = { id, kind: 'rack', center: [x, 0, z], size: [depth, height, width], hookY };
  if (safetyY != null) prop.safetyY = safetyY;
  if (facing < 0) prop.rotY = 180;
  // the bar rests in the hooks: 1.5 cm above the hook top, 5 cm out from the uprights on the hook side
  return { prop, barRest: [x + facing * ((depth > 20 ? depth / 2 : 0) + 5), hookY + 1.5, z] };
}
// Free-standing pull-up bar along Z at height h (cm, bar centre)
function pullupBar({ x = 0, z = 0, height = 225, width = 120, id = 'pullup' } = {}) {
  return { prop: { id, kind: 'pullup_bar', center: [x, 0, z], size: [90, height, width] }, bar: { c: [x, height, z], ax: [0, 0, 1], r: 1.6 } };
}
// Cable tower with its pulley at `anchor`
// (column 10 cm beyond the pulley along X by default; give x / z, or an `offset` [dx, dz] from the pulley, to put the
// column anywhere: the pulley arm is drawn from the column to the anchor in any horizontal direction)
function cableTower(anchor, { x = null, z = null, offset = null, height = 215, id = 'tower' } = {}) {
  const cx = x ?? (offset ? anchor[0] + offset[0] : anchor[0] + 10 * Math.sign(anchor[0] || 1)), cz = z ?? (offset ? anchor[2] + offset[1] : anchor[2]);
  return { id, kind: 'cable', center: [cx, 0, cz], size: [14, height, 14], anchor: anchor.slice() };
}

module.exports = { BAR, KB, gripPoint, barAt, barGrips, onBar, barGeometry, barMinY, barClear, pointShape, segmentClear, kettlebellAt, kettlebellMinY, kettlebellClear, attachPoint, lineClear, jointAnchor, rack, pullupBar, cableTower };
