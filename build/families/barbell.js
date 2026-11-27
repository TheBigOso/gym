// Barbell family (equipment pack): back squat, bench press and deadlift with an Olympic barbell held in both hands.
// Builds on the equipment helpers (equip.js: bar between the two handle points, plates, clearance), the back family
// (b3-back.js holdArm / wristFromHandle / hinge balance) and the chest family (b3-chest.js lying on the bench).
//  - armsOnBar: solve the right arm so its handle point sits on the bar at c + ax * width / 2 with the hand turned as asked
//    (palm normal and thumb axis, world), then mirror it to the left. The bar is centred at z = 0 along Z, so the left hand
//    lands on the mirrored grip point and the grip width stays what was asked (checked in the sweep).
//  - sweep: whole-loop report (grip width range, plates / bar vs the floor, bar vs the body, planted feet, body vs floor).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const EQ = require('./equip');
const B = require('./b3-back');

const AX = [0, 0, 1];
const GRIP = 'bar'; // the bar sits in the heel of the palm (equip.js / dumbbell.js GRIP.bar, the player's barbell grip)

// Right arm on the bar: handle point at grip g (world), palm normal `palm`, thumb axis `thumb` (both world, unit-ish).
// opt.elbow: optional elbow target (soft); opt.guesses: holdArm seeds [plane, elev, axial, elbow, pron].
// The handle point is matched directly (weight 6); the thumb axis must lie along the bar (either sign) and the palm is a
// softer preference (dirW), so an unreachable hand orientation never moves the hand off the bar.
const ARM = B.ARM ? B.ARM('r') : ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
function armsOnBar(p, g, { palm, thumb, guesses, elbow, elbowW = 0.5, dirW = 1.5, wristW = 0.04, ax = AX, extra = [] } = {}) {
  const a = V.norm(ax);
  const objs = [
    (W) => V.sub(EQ.gripPoint(W, 'r', GRIP).p, g).map((v) => v * 6),
    (W) => [(1 - Math.abs(V.dot(EQ.gripPoint(W, 'r', GRIP).ax, a))) * 30],
    (W) => (palm ? V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), V.norm(palm)).map((v) => v * dirW) : []),
    (W) => (thumb ? V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), V.norm(thumb)).map((v) => v * dirW * 0.5) : []),
    (W) => (elbow ? V.sub(W.elbow_r.p, elbow).map((v) => v * elbowW) : []),
    (W, q) => { const sh = q.ch.shoulder_r, el = q.ch.elbow_r.flex, w = q.ch.wrist_r; return [w.flex * wristW, w.dev * wristW, Math.min(0, sh.elev - 4) * 3, Math.min(0, sh.plane + 58) * 3, Math.max(0, sh.plane - 138) * 3, Math.min(0, el - 2) * 3, Math.max(0, el - 148) * 3, Math.min(0, w.flex + 70) * 3, Math.max(0, w.flex - 70) * 3, Math.min(0, w.dev + 18) * 3, Math.max(0, w.dev - 33) * 3]; },
    ...extra,
  ];
  let best = null;
  for (const s of guesses) {
    const q0 = clone(p);
    q0.ch.shoulder_r = { plane: s[0], elev: s[1], axial: s[2] }; q0.ch.elbow_r = { flex: s[3] }; q0.ch.wrist_r = { pron: s[4], flex: s[5] ?? 0, dev: s[6] ?? 0 };
    const r = L.solvePose(q0, ARM, objs, { iters: 400 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const q = best.pose;
  for (const [j, c] of [['shoulder_r', 'axial'], ['wrist_r', 'pron'], ['shoulder_r', 'plane']]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  B.mirrorArm(q); // copies sc / shoulder / elbow / wrist to the left
  q.__cost = best.cost;
  return q;
}
// handle-point error (cm) of both hands against the wanted grips
function gripErr(W, grips) { return Math.max(V.len(V.sub(EQ.gripPoint(W, 'r', GRIP).p, grips.r)), V.len(V.sub(EQ.gripPoint(W, 'l', GRIP).p, grips.l))); }

// Bar clearance from the body: the shaft and sleeves as capsules (EQ.segmentClear), the plates as thin discs sampled on
// both faces and the rim. (EQ.barClear sweeps a plate-radius sphere along each plate's thickness, which reaches 22 cm
// toward the hands along the bar and flags arms that are well clear of the real plates.)
const SHAPES = rig.shapes.map((s) => s.id);
function barBodyClear(W, opt = {}) {
  const g = EQ.barGeometry(EQ.barAt(W, opt.grip || GRIP), opt), skip = opt.skip || /^(hand|thumb|forearm)_/;
  let best = { d: 1e9 };
  for (const [a, b, r] of g.caps) { const c = EQ.segmentClear(W, a, b, r, { skip }); if (c.d < best.d) best = c; }
  for (const d of g.discs) {
    const u = V.norm(V.cross(d.ax, Math.abs(d.ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = V.cross(d.ax, u), pts = [];
    for (const face of [-1, 1]) { const c0 = V.add(d.c, V.scale(d.ax, (face * d.w) / 2)); pts.push(c0); for (const rr of [0.5, 1]) for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI; pts.push(V.add(c0, V.add(V.scale(u, Math.cos(a) * d.r * rr), V.scale(w, Math.sin(a) * d.r * rr)))); } }
    for (const id of SHAPES) { if (skip.test(id)) continue; for (const p of pts) { const dd = EQ.pointShape(W, p, id); if (dd < best.d) best = { d: dd, id, plate: true }; } }
  }
  return best;
}
// Whole-loop sweep. opt: { skip (RegExp for barClear), planted: [contact ids], fixed: [joints], probe(W, pz, t, out) }
function sweep(ex, opt = {}, n = 600) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, planted = opt.planted || (ex.checks && ex.checks.plantedContacts) || [];
  const bar = ex.props.find((p) => p.kind === 'barbell'), bopt = { plates: bar.plates ?? 1, plateD: (bar.size && bar.size[1]) || 45, skip: opt.skip, grip: GRIP };
  const out = { width: [1e9, -1e9], barFloor: 1e9, barFloorAt: null, barBody: 1e9, barBodyAt: null, floor: 1e9, floorAt: null, slide: 0, drift: 0 };
  const W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
    const b = EQ.barAt(W, GRIP); out.width = [Math.min(out.width[0], b.width), Math.max(out.width[1], b.width)];
    const my = EQ.barMinY(W, bopt); if (my < out.barFloor) { out.barFloor = my; out.barFloorAt = +t.toFixed(2); }
    const c = barBodyClear(W, bopt); if (c.d < out.barBody) { out.barBody = c.d; out.barBodyAt = [c.id, c.plate ? 'plate' : 'bar', +t.toFixed(2)]; }
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    for (const id of planted) {
      const k = pz.ik && pz.ik[id]; if (!k || (k.weight ?? 1) < 0.999) continue;
      const cc = ex.contacts.find((x) => x.id === id);
      let sl = V.len(V.sub(W[cc.chain[2]].p, k.target));
      if (prev && prev[id] && (prev[id].weight ?? 1) >= 0.999) sl = Math.max(sl, V.len(V.sub(k.target, prev[id].target)));
      out.slide = Math.max(out.slide, sl);
    }
    for (const j of opt.fixed || []) out.drift = Math.max(out.drift, V.len(V.sub(W[j].p, W0[j].p)));
    if (opt.probe) opt.probe(W, pz, t, out);
    prev = pz.ik ? clone(pz.ik) : null;
  }
  out.width = out.width.map((v) => +v.toFixed(2)); out.widthRange = +(out.width[1] - out.width[0]).toFixed(2);
  for (const k of ['barFloor', 'barBody', 'floor', 'slide', 'drift']) out[k] = +out[k].toFixed(2);
  return out;
}
// Barbell prop held in both hands (right hand carries it, the left is the second grip)
const barbellProp = ({ plates = 1, plateD = 45, color } = {}) => Object.assign({ id: 'barbell', kind: 'barbell', size: [220, plateD, plateD], plates, attach: { joint: 'wrist_r', with: 'wrist_l', grip: GRIP } }, color ? { color } : {});
// Centre of mass (body shape volumes + the bar as a point mass at its centre)
function comWithBar(W, barKg = 60, bodyKg = 80) { return B.comX(W, [{ c: EQ.barAt(W, GRIP).c, kg: barKg }], bodyKg); }

/* ---------------- placement helpers ---------------- */
const LEGS = rig.shapes.filter((s) => /^(thigh|quad|shank|calf|foot)_/.test(s.id));
// Clearance (cm) of the bar shaft at height y and depth x, between z = -zr and zr (inside the hands), from the leg shapes
function barLegClear(W, x, y, zr) { let best = 1e9; for (let k = -10; k <= 10; k++) { const p = [x, y, (k / 10) * zr]; for (const s of LEGS) best = Math.min(best, B.shapeDist(W, s, p) - EQ.BAR.shaftR); } return best; }
// Leg axis depth (x) at height y: ankle-knee below the knee, knee-hip above (right leg; the stance is symmetric)
function legX(W, y) { const A = W.ankle_r.p, K = W.knee_r.p, H = W.hip_r.p; const [p0, p1] = y < K[1] ? [A, K] : [K, H]; const t = Math.max(0, Math.min(1, (y - p0[1]) / ((p1[1] - p0[1]) || 1))); return p0[0] + (p1[0] - p0[0]) * t; }
// Lowest bar height (cm) at depth x clear of the trunk (lying: the top of the chest along a 24 cm stretch of bar)
function chestTop(W, x, skip = /^(hand|thumb|forearm|upperarm|biceps|deltoid)_/) {
  let a = 30, b = 160;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, c = EQ.segmentClear(W, [x, m, -12], [x, m, 12], EQ.BAR.shaftR, { skip }); if (c.d > 0) b = m; else a = m; }
  return b;
}
// Handle-point reach from the shoulder with the arm straight (elbow `flex`, wrist neutral)
function reachG(p, flex = 4) { const q = clone(p); q.ch.shoulder_r = { plane: 0, elev: 0.01, axial: 0 }; q.ch.elbow_r = { flex }; q.ch.wrist_r = { pron: 0, flex: 0, dev: 0 }; const W = L.fk(q); return V.len(V.sub(EQ.gripPoint(W, 'r', GRIP).p, W.shoulder_r.p)); }
const elbowOf = B.elbowOf;

module.exports = { AX, GRIP, barBodyClear, armsOnBar, gripErr, sweep, barbellProp, comWithBar, LEGS, barLegClear, legX, chestTop, reachG, elbowOf };
