// Authoring helpers for the special benches and stations (gear pack: src/gear/benches.js). The prop geometry comes from
// the very same file the player draws (benchGeo), so pads, rollers and bars here are exactly what the viewer shows.
// Units: cm, world axes (+X forward, +Y up, +Z the figure's right). Each builder returns
//   { prop, G (prop-local geometry), surfaces / points in world cm, parts (world: oriented boxes and capsules) }
// and the shared helpers place the body on the pads and check clearances:
//   - preacherBench / preacherFit: seat plane and arm-pad plane; preacherFit puts the pad's top edge under the armpit and
//     the pad surface under the upper arm of a seated pose (returns the params for the prop)
//   - declineBench + boardFrame: the board as a tilted floor. Author the lying body in a flat frame (y = 0 is the board
//     surface, x along the board toward the high end, 0 at the high edge) and move poses, IK targets and contact
//     orientations onto the board with frame.pose / frame.contacts / frame.pt
//   - hyperBench: foot-plate contact (ankle target and world-locked foot orientation for leg contacts), heel roller,
//     hip pad (plane, or the round GHD pad), leg line
//   - dipStation / dipHands: wrist targets and hand orientations for hands on the parallel bars (hand contacts), the bar
//     axis; captain's chair forearm rests, handles and back pad
//   - bodyClear(W, gear, opt): smallest gap between the rig shapes and every part (cm, < 0 = into the part)
//   - shapePlane(W, id, plane): signed gap from a rig shape to a pad plane (b3-curls shapePlaneDist)
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const { benchGeo } = require('../../src/gear/benches.js');
const C = require('./b3-curls');
const D = require('./dumbbell');

/* ---------------- placement: prop-local cm -> world cm ---------------- */
function placer(pr) {
  const c = pr.center || [0, 0, 0], th = ((pr.rotY || 0) * Math.PI) / 180, co = Math.cos(th), si = Math.sin(th);
  const dir = (v) => [v[0] * co + v[2] * si, v[1], -v[0] * si + v[2] * co];
  const pt = (v) => V.add(c, dir(v));
  return { pt, dir };
}
// world parts: boxes as oriented boxes { id, c, ax: [3 unit axes], h: half sizes }, cylinders as capsules { id, a, b, r }
function worldParts(G, P) {
  return G.parts.map((p, i) => {
    if (p.t === 'box') { const a = (p.rz * Math.PI) / 180; return { id: `${p.m}${i}`, kind: 'box', m: p.m, c: P.pt(p.c), ax: [P.dir([Math.cos(a), Math.sin(a), 0]), P.dir([-Math.sin(a), Math.cos(a), 0]), P.dir([0, 0, 1])], h: p.s.map((v) => v / 2) }; }
    return { id: `${p.m}${i}`, kind: 'cyl', m: p.m, a: P.pt(p.a), b: P.pt(p.b), r: p.r };
  });
}
// surfaces / points to world: keys o, c, a, b, F, ... are points; u, n, d, axis, up are directions
const DIRS = new Set(['u', 'n', 'axis', 'up', 'legDir', 'legNormal']);
function toWorld(obj, P) {
  if (Array.isArray(obj)) return obj.length === 3 && obj.every((v) => typeof v === 'number') ? P.pt(obj) : obj.map((v) => toWorld(v, P));
  if (obj && typeof obj === 'object') { const o = {}; for (const k in obj) { const v = obj[k]; o[k] = DIRS.has(k) && Array.isArray(v) ? P.dir(v) : ['y', 'size', 'rollerHalf'].includes(k) ? v : toWorld(v, P); } return o; }
  return obj;
}
function make(kind, { x = 0, z = 0, rotY = 0, id = kind, params = {}, size } = {}) {
  const prop = { id, kind, center: [x, 0, z], size: size || [100, 100, 60], params: clone(params) };
  if (rotY) prop.rotY = rotY;
  const G = benchGeo(kind, params), P = placer(prop);
  return { prop, G, P, parts: worldParts(G, P), surfaces: toWorld(G.surfaces, P), points: toWorld(G.points, P) };
}

/* ---------------- distances ---------------- */
function boxDist(p, b) {
  const d = V.sub(p, b.c), q = b.ax.map((a, i) => Math.abs(V.dot(d, a)) - b.h[i]);
  return Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)) + Math.min(Math.max(q[0], q[1], q[2]), 0);
}
function segDist(p, a, b) { const ab = V.sub(b, a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a), ab) / Math.max(1e-9, V.dot(ab, ab)))); return V.len(V.sub(p, V.add(a, V.scale(ab, t)))); }
const partDist = (p, part) => (part.kind === 'box' ? boxDist(p, part) : segDist(p, part.a, part.b) - part.r);
// Body shapes vs the gear parts. Capsules are sampled along their axis (with their radius), ellipsoids on a grid of
// surface points (plus the centre, so a shape fully inside a part reads negative). opt.skip: RegExp of shape ids to leave
// out; opt.parts: RegExp of part ids to test. Returns { d, shape, part }.
const SHAPES = rig.shapes;
const SPH = (() => { const o = []; for (let i = 0; i <= 8; i++) { const th = (i / 8) * Math.PI; for (let j = 0; j < (i % 8 ? 14 : 1); j++) { const ph = (j / 14) * 2 * Math.PI; o.push([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]); } } return o; })();
function shapePts(W, s) {
  const g = R.shapeWorld(W, s), pts = [];
  if (g.kind === 'capsule') for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([V.lerp(g.a, g.b, t), g.r[0] + (g.r[1] - g.r[0]) * t]); }
  else { pts.push([g.c, 0]); for (const u of SPH) pts.push([V.add(g.c, V.add(V.add(V.scale(g.axes[0], u[0]), V.scale(g.axes[1], u[1])), V.scale(g.axes[2], u[2]))), 0]); }
  return pts;
}
function bodyClear(W, gear, opt = {}) {
  const parts = gear.parts || gear, skip = opt.skip || null; let best = { d: 1e9 };
  for (const s of SHAPES) {
    if (skip && skip.test(s.id)) continue;
    if (['eye', 'brow', 'nose', 'ear'].includes(s.base)) continue;
    const pts = shapePts(W, s);
    for (const part of parts) { if (opt.parts && !opt.parts.test(part.id)) continue; for (const [p, r] of pts) { const d = partDist(p, part) - r; if (d < best.d) best = { d: +d.toFixed(2), shape: s.id, part: part.id }; } }
  }
  return best;
}
// Segment (radius r) vs the gear parts, e.g. a barbell shaft or a dumbbell axis
function segClear(a, b, r, gear, n = 16) { let best = 1e9; for (let k = 0; k <= n; k++) { const p = V.lerp(a, b, k / n); for (const part of gear.parts || gear) best = Math.min(best, partDist(p, part) - r); } return +best.toFixed(2); }
const shapePlane = (W, id, pl) => C.shapePlaneDist(W, id, pl.o, pl.n);
// point on a pad plane: `along` cm from its origin edge along u, `off` cm off the surface along n, z offset
const padPoint = (pl, along, off = 0, z = 0) => V.add(V.add(V.add(pl.o, V.scale(pl.u, along)), V.scale(pl.n, off)), [0, 0, z]);

/* ---------------- preacher bench ---------------- */
function preacherBench(opt = {}) { return make('preacher_bench', Object.assign({ size: [100, 110, 60] }, opt)); }
// Fit the arm pad to a seated pose: the pad top edge `armpit` cm (along the slope) above the shoulder joint S, and the
// pad surface `gap` cm below the elbow joint E (upper arm resting on it; rig v2 upper-arm radius at the elbow is about
// 4 cm). S, E: world points (or pass a W and side). angle: pad slope (deg). Returns params for preacherBench, relative
// to the seat centre x0, and the elbow point on the pad axis.
function preacherFit(S, E, { x0 = 0, angle = 45, armpit = 4, gap = 4.2 } = {}) {
  if (S && S.shoulder_r) { const W = S, s = E || 'r'; S = W[`shoulder_${s}`].p; E = W[`elbow_${s}`].p; }
  const a = angle * R.DEG, u = [Math.cos(a), -Math.sin(a), 0], n = [Math.sin(a), Math.cos(a), 0];
  const o = V.sub(E, V.scale(n, gap)), sAlong = V.dot(V.sub(S, o), u), top = V.add(o, V.scale(u, sAlong - armpit));
  return { padAngle: angle, padTop: [r1(top[0] - x0), r1(top[1])] };
}

/* ---------------- decline bench ---------------- */
function declineBench(opt = {}) { return make('decline_bench', Object.assign({ size: [140, 90, 40] }, opt)); }
// Flat frame of the board: flat (x, y, z) -> world, with x along the board toward the high end (0 at the high edge of
// the surface) and y off the surface. A pose authored lying on a floor at y = 0 moves onto the board rigidly: the root
// turns by the decline angle about Z (root pitch adds), IK targets and world-locked contact orientations turn with it.
function boardFrame(db) {
  const pad = db.surfaces.pad, H = pad.o, ex = V.scale(pad.u, -1), ey = pad.n; // ex: up the board
  const ang = Math.atan2(ex[1], Math.hypot(ex[0], ex[2])) / R.DEG; // the board rises toward +X: rotation about +Z
  if (Math.abs(ex[2]) > 1e-6) throw new Error('boardFrame: only rotY 0 is supported for moving poses');
  const pt = (p) => V.add(V.add(V.add(H, V.scale(ex, p[0])), V.scale(ey, p[1])), [0, 0, p[2]]);
  const qz = Q.axis([0, 0, 1], ang);
  const pose = (p) => {
    const q = clone(p); q.root.pos = pt(p.root.pos).map(r1);
    q.root.rot = Object.assign({}, q.root.rot, { pitch: r1((q.root.rot.pitch || 0) + ang) });
    if (q.root.rot.yaw || q.root.rot.roll) throw new Error('boardFrame: pitch-only roots');
    if (q.ik) for (const k in q.ik) q.ik[k].target = pt(q.ik[k].target).map(r1);
    return q;
  };
  const contacts = (cs) => cs.map((c) => Object.assign(clone(c), c.handRot ? { handRot: Q.mul(qz, c.handRot).map((v) => +v.toFixed(6)) } : {}));
  return { pt, pose, contacts, angle: ang, ex, ey, H };
}

/* ---------------- hyperextension bench ---------------- */
function hyperBench(opt = {}) { return make('hyperextension_bench', Object.assign({ size: [120, 100, 50] }, opt)); }
// Leg contact on the foot plate: ankle joint target (ANKLE_H off the plate along the leg line, z = +-stance) and the
// world-locked foot orientation: sole on the plate (facing -legDir), toes along -legNormal (toward the floor side).
function hyperFeet(hb, { stance = 11, lift = 0 } = {}) {
  const pt = hb.points, d = pt.legDir, n = pt.legNormal, e = Math.atan2(d[1], d[0]) / R.DEG;
  const rot = Q.axis([0, 0, 1], e - 90).map((v) => +v.toFixed(6));
  const tgt = (s) => V.add(V.add(V.add(pt.F, V.scale(d, L.ANKLE_H)), V.scale(n, lift)), [0, 0, s === 'r' ? stance : -stance]).map(r1);
  const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { label: `${s === 'r' ? 'Right' : 'Left'} foot (foot plate)`, pole: [n[0] * -1, n[1] * -1, s === 'r' ? 0.2 : -0.2], handRot: rot }));
  return { contacts, targets: { r: tgt('r'), l: tgt('l') }, footRot: rot };
}

/* ---------------- dip station / captain's chair ---------------- */
function dipStation(opt = {}) { return make('dip_station', Object.assign({ size: [80, 130, 70] }, opt)); }
// Hands on the parallel bars at depth x: palms down and in on top of each bar (neutral grip), the palm turned `tilt`
// degrees from facing straight in toward facing down; the bar sits in the heel of the palm (dumbbell.js GRIP.bar).
// Returns per side { bar (bar axis point), wrist (IK target), handRot (world-locked), contact }.
function dipHands(ds, { x = 0, tilt = 35, pole = 0.3 } = {}) {
  const out = {};
  for (const s of ['r', 'l']) {
    const bar = ds.points.bars[s], c = V.lerp(bar.a, bar.b, (x - bar.a[0]) / (bar.b[0] - bar.a[0]));
    const base = Q.fromBasis([0, 0, -1], [0, 1, 0], [1, 0, 0]); // right hand: palm -Z (medial), fingers -Y (down)
    let q = Q.mul(Q.axis([1, 0, 0], -tilt), base);
    if (s === 'l') q = Q.mirrorZ(q);
    const off = D.GRIP.bar.off, wrist = V.sub(c, Q.rot(q, off));
    const contact = Object.assign(L.handContact(s), { label: `${s === 'r' ? 'Right' : 'Left'} hand (dip bar)`, pole: [-1, 0, s === 'r' ? pole : -pole], handRot: q.map((v) => +v.toFixed(6)) });
    out[s] = { bar: c, wrist: wrist.map(r1), handRot: q, contact };
  }
  return out;
}
// Captain's chair: forearms on the rests, hands on the vertical handles (handle centre `up` cm above the rest)
function captainHands(ds, { up = 5 } = {}) {
  const out = {};
  for (const s of ['r', 'l']) { const h = ds.points[`handle_${s}`]; out[s] = { grip: V.add(h.a, [0, up, 0]), rest: ds.surfaces[`arm_${s}`] }; }
  return { hands: out, back: ds.surfaces.back };
}

module.exports = { benchGeo, placer, make, worldParts, bodyClear, segClear, partDist, boxDist, shapePlane, padPoint, preacherBench, preacherFit, declineBench, boardFrame, hyperBench, hyperFeet, dipStation, dipHands, captainHands };
