// Triceps family (batch 3): dumbbell skull crusher, seated dumbbell overhead triceps extension, dumbbell kickback,
// bench dip. Shared helpers: lying on a flat bench, sitting against an inclined back pad, a body-vs-box clearance probe
// (props the body rests on or moves beside), dumbbell-vs-body clearance against the rig shapes, and arm solves that
// hold the upper arm still while the elbow bends.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const DBF = require('./dumbbell');

const shapeOf = (id) => rig.shapes.find((x) => x.id === id);
// Lowest / most extreme point of a rig shape along a world direction (unit vector d): returns the point
function extremePt(W, s, d) {
  const g = R.shapeWorld(W, s);
  if (g.kind === 'capsule') { const pa = V.add(g.a, V.scale(d, g.r[0])), pb = V.add(g.b, V.scale(d, g.r[1])); return V.dot(pa, d) > V.dot(pb, d) ? pa : pb; }
  const n = Math.hypot(...g.axes.map((a) => V.dot(a, d)));
  return g.axes.reduce((c, a) => V.add(c, V.scale(a, V.dot(a, d) / n)), g.c);
}
// Signed distance of a shape's surface past a plane (point o, outward normal n): > 0 means it pokes through
const pastPlane = (W, id, o, n) => V.dot(V.sub(extremePt(W, shapeOf(id), V.scale(n, -1)), o), V.scale(n, -1));

// Clearance of the body above an axis-aligned box (bench / seat) top: min over shapes whose low point lies over the box
// footprint, of (low point y - top). skip: regex of shape ids allowed to rest on the top.
function bodyOverBox(W, box, skip) {
  const x0 = box.center[0] - box.size[0] / 2, x1 = box.center[0] + box.size[0] / 2, z0 = box.center[2] - box.size[2] / 2, z1 = box.center[2] + box.size[2] / 2, top = box.center[1] + box.size[1];
  let best = { d: 1e9 };
  for (const s of rig.shapes) {
    if (skip && skip.test(s.id)) continue;
    const p = extremePt(W, s, [0, -1, 0]);
    if (p[0] > x0 && p[0] < x1 && p[2] > z0 && p[2] < z1 && p[1] - top < best.d) best = { d: p[1] - top, id: s.id };
  }
  return best;
}
const SHAPES = rig.shapes;
// Distance from a point to a shape surface (approximate for ellipsoids: scaled radial distance), < 0 inside
function pointToShape(W, s, p) {
  const g = R.shapeWorld(W, s);
  if (g.kind === 'capsule') {
    const ab = V.sub(g.b, g.a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, g.a), ab) / V.dot(ab, ab)));
    return V.len(V.sub(p, V.add(g.a, V.scale(ab, t)))) - (g.r[0] + (g.r[1] - g.r[0]) * t);
  }
  const d = V.sub(p, g.c), u = g.axes.map((a) => V.dot(d, a) / V.dot(a, a)), k = Math.hypot(...u);
  const rr = k > 1e-9 ? V.len(d) / k : Math.min(...g.axes.map(V.len));
  return V.len(d) - rr;
}
// Dumbbell (as a capsule from end plate to end plate, radius = plate radius) vs the listed body shapes: min clearance.
function dumbbellBody(W, side, grip, ids, size, off) {
  const d = off ? dumbbellAtOff(W, side, grip, off, size) : DBF.dumbbellAt(W, side, grip, size);
  let best = { d: 1e9 };
  for (const s of SHAPES) {
    if (!ids.test(s.id)) continue;
    for (let k = 0; k <= 10; k++) {
      const p = V.add(d.ends[1], V.scale(V.sub(d.ends[0], d.ends[1]), k / 10)), c = pointToShape(W, s, p) - d.r;
      if (c < best.d) best = { d: c, id: s.id };
    }
  }
  return best;
}
// dumbbellAt with an explicit attach.offset ([toward fingers, out of palm, thumb axis] cm, the player's convention)
function dumbbellAtOff(W, side, grip, off, size = DBF.DB) {
  const w = W[`wrist_${side}`], ax0 = (DBF.GRIP[grip] || DBF.GRIP.handle).axis;
  const o = [off[1], -off[0], side === 'l' ? -off[2] : off[2]]; // rig hand frame: [palm, -fingers, thumb]
  const c = V.add(w.p, Q.rot(w.q, o)), ax = V.norm(Q.rot(w.q, ax0)), half = (size.length || DBF.DB.length) / 2 - 4;
  return { c, ax, ends: [V.add(c, V.scale(ax, half)), V.sub(c, V.scale(ax, half))], r: (size.diameter || DBF.DB.diameter) / 2 };
}
// Dumbbell vs an inclined pad (segment hinge->tip in the x-y plane, the athlete on the +normal side): min clearance
// (cm, < 0 means a plate passes into the pad). The pad is treated as a thin board along its front surface.
function dumbbellPad(W, side, grip, pad, off, size) {
  const d = off ? dumbbellAtOff(W, side, grip, off, size) : DBF.dumbbellAt(W, side, grip, size);
  const t = pad.padDir, n = [t[1] * (t[0] < 0 ? 1 : -1), -t[0] * (t[0] < 0 ? 1 : -1), 0], len = V.len(V.sub(pad.tip, pad.hinge));
  let best = 1e9;
  for (let k = 0; k <= 20; k++) {
    const p = V.add(d.ends[1], V.scale(V.sub(d.ends[0], d.ends[1]), k / 20)), q = [p[0] - pad.hinge[0], p[1] - pad.hinge[1], 0];
    const s = Math.max(0, Math.min(len, V.dot(q, t))), c = V.add(V.scale(t, s), [0, 0, 0]), dist = V.len(V.sub(q, c));
    const behind = V.dot(q, n) < 0 && V.dot(q, t) > 0 && V.dot(q, t) < len;
    best = Math.min(best, (behind ? -dist : dist) - d.r);
  }
  return best;
}
// Lying face up on a flat bench (top at `top` cm), head toward -X: buttocks, upper back and the back of the head rest on
// the pad. Same objectives as the hips family lieBase, measured from the bench top instead of the floor. The Studio clay
// mesh sits inside the rig shapes on the back of the body, so `sink` gives how far (cm) the rig buttock / chest / hair
// shapes must sink below the pad for the skinned mesh to touch it (measured with b2/tri_mesh.mjs).
function lieOnBench(top, x = 0, sink = { butt: 0, back: 0, head: 0 }) {
  const sup = L.POSES.supine({ kneeFlex: 90 });
  const p0 = clone(sup.pose); p0.root.pos = [x, p0.root.pos[1] + top, 0];
  const b = (W, id) => H.bottomOf(W, id) - top;
  const s1 = L.solvePose(p0, ['root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
    (W) => [(b(W, 'buttock_r') + sink.butt) * 4, (b(W, 'chest') + sink.back) * 3, Math.min(0, b(W, 'ribcage') + sink.back) * 2, Math.min(0, b(W, 'abdomen') + sink.back - 1.5) * 2],
    L.obj.reg('ch.spine_l5.flex', -6, 0.15), L.obj.reg('ch.spine_t12.flex', 2, 0.25), L.obj.reg('ch.spine_t6.flex', 4, 0.4), L.obj.reg('root.rot.pitch', 92, 0.2),
  ]).pose;
  const s2 = L.solvePose(s1, ['ch.neck_c7.flex'], [(W) => [(b(W, 'hair') + sink.head) * 3], L.obj.reg('ch.neck_c7.flex', 0, 0.05)]).pose;
  const f = s2.ch.neck_c7.flex; s2.ch.neck_c7 = { rot: 0, flex: r1(f * 0.5) }; s2.ch.head_c1 = { rot: 0, flex: r1(f * 0.5) };
  return s2;
}

// Right shoulder channels that put the elbow along `uaDir` (world) with the forearm bending in the plane of `faDir`
// (world direction of the forearm at elbow flex 90). Returns { shoulder } channel values.
function upperArm(pose, side, uaDir, faDir, guess) {
  const set = (x) => { const q = clone(pose); q.ch[`shoulder_${side}`] = { plane: x[0], elev: x[1], axial: x[2] }; q.ch[`elbow_${side}`] = { flex: 90 }; return q; };
  const res = (x) => { const W = L.fk(set(x)); return [...V.sub(V.norm(V.sub(W[`elbow_${side}`].p, W[`shoulder_${side}`].p)), V.norm(uaDir)).map((v) => v * 20), ...V.sub(V.norm(V.sub(W[`wrist_${side}`].p, W[`elbow_${side}`].p)), V.norm(faDir)).map((v) => v * 10)]; };
  let best = null;
  for (const g of guess) { const s = R.solveLM(g, res, { iters: 400 }); if (!best || s.cost < best.cost) best = s; }
  const x = best.x.map(r1);
  return { ch: { plane: r1(L.wrap(x[0])), elev: x[1], axial: r1(L.wrap(x[2])) }, cost: best.cost };
}
// Wrist channels so the hand frame axes match world directions: fingers (hand -Y) along f, palm (+X) along n.
function wristTo(pose, side, f, n, guess = [[0, 0, 0], [90, 0, 0], [-90, 0, 0], [170, 0, 0]], lim = { flex: [-85, 75], dev: [-18, 33] }) {
  const set = (x) => { const q = clone(pose); q.ch[`wrist_${side}`] = { pron: x[0], flex: x[1], dev: x[2] }; return q; };
  const res = (x) => { const hq = L.fk(set(x))[`wrist_${side}`].q; const pen = (v, a, b) => (v < a ? a - v : v > b ? v - b : 0); return [...V.sub(Q.rot(hq, [0, -1, 0]), V.norm(f)).map((v) => v * 10), ...V.sub(Q.rot(hq, [1, 0, 0]), V.norm(n)).map((v) => v * 6), pen(x[1], ...lim.flex) * 2, pen(x[2], ...lim.dev) * 2]; };
  let best = null;
  for (const g of guess) { const s = R.solveLM(g, res, { iters: 300 }); if (!best || s.cost < best.cost) best = s; }
  return { pron: r1(L.wrap(best.x[0])), flex: r1(best.x[1]), dev: r1(best.x[2]), cost: best.cost };
}
const mirrorArm = (p, from = 'r') => { const to = from === 'r' ? 'l' : 'r'; for (const j of ['sc', 'shoulder', 'elbow', 'wrist']) if (p.ch[`${j}_${from}`]) p.ch[`${j}_${to}`] = clone(p.ch[`${j}_${from}`]); return p; };
const elbowOf = (W, s) => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));
const ease = (f) => f * f * (3 - 2 * f);

module.exports = { extremePt, pastPlane, bodyOverBox, SHAPES, pointToShape, dumbbellBody, dumbbellAtOff, dumbbellPad, lieOnBench, upperArm, wristTo, mirrorArm, elbowOf, ease, shapeOf };
