// Gear pack helpers: EZ curl bar, trap (hex) bar, landmine, rings / suspension straps and weight plates.
// The player draws these items from the hands (src/gear/bars.js); these helpers estimate the same geometry on the RepRig
// skeleton so author scripts can put the hands where the item needs them and check clearances. Units: cm, world axes
// (+X forward, +Y up, +Z figure's right). Rig v2 matches the drawn body: no mesh offsets.
//
// Hand frames: the player builds held meshes in a grip frame with +X along the handle toward the little finger, +Y back
// along the fingers and +Z = X x Y. On the rig wrist (x palm normal, y opposite the fingers, z thumb side of the right
// hand / little-finger side of the left) that is: right X = -z, left X = +z, Y = y. handFrame() returns it.
//
// API (see each function):
//   handFrame(W, side, grip)            grip point and mesh frame of one hand
//   armTo(p, g, opt)                    solve the right arm onto a grip point with handle axis / palm / elbow wishes
//   EZ:   EZ, ezProp, ezHandAxes, ezAt, ezGeometry, ezClear, ezMinY
//   trap: TRAP, trapProp, trapAt, trapGeometry, trapClear, trapMinY, trapStartY
//   landmine: LM, landmineProps, landmineAnchorFor, sphereArc, onSphere, landmineObjective, landmineState, landmineClear
//   rings: ringProps, strap, ringObjective, ringTiltFit, strapClear
//   plate: plateProp, plateGripWidth, plateAt, plateClear
//   geomClear(W, geom, skip)            clearance of capsules + plate discs from the body shapes
const L = require('../lib');
const { V, Q, clone, r1 } = L;
const EQ = require('./equip');
const B = require('./b3-back');

const RAD = Math.PI / 180;
const unit = (v) => { const l = V.len(v); return l > 1e-9 ? V.scale(v, 1 / l) : [0, 0, 0]; };
const perp = (v, ax) => V.sub(v, V.scale(ax, V.dot(v, ax)));

/* ---------------- hands ---------------- */
function handFrame(W, side = 'r', grip = 'handle') {
  const q = W[`wrist_${side}`].q, z = Q.rot(q, [0, 0, 1]), X = side === 'r' ? V.scale(z, -1) : z, Y = Q.rot(q, [0, 1, 0]);
  return { p: EQ.gripPoint(W, side, grip).p, X, Y, Z: V.cross(X, Y), thumb: V.scale(X, -1), palm: Q.rot(q, [1, 0, 0]), fingers: V.scale(Y, -1) };
}
const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
const GUESS = [[0, 10, 0, 20, 0], [-50, 15, 90, 4, 150], [20, 15, 10, 40, 10], [30, 80, -60, 100, 90], [10, 20, 20, 60, 160], [0, 5, 0, 5, 90], [60, 30, 0, 5, 90]];
// Right arm onto grip point g (world) with grip type opt.grip ('handle' | 'bar'). Wishes (all optional, world vectors):
// thumb: the thumb-side handle axis (signed); axis: handle axis either way; palm: palm normal; elbow: elbow target.
// extra: more objectives (W, q) => [...]. mirror: copy the arm to the left (bilateral). Joint-limit margins are soft.
function armTo(p, g, { grip = 'handle', thumb, axis, palm, elbow, wGrip = 6, wDir = 1.5, wElbow = 0.5, wristW = 0.04, guesses = GUESS, extra = [], mirror = false, contacts = null } = {}) {
  const objs = [
    (W) => V.sub(EQ.gripPoint(W, 'r', grip).p, g).map((v) => v * wGrip),
    (W) => (axis ? [(1 - Math.abs(V.dot(EQ.gripPoint(W, 'r', grip).ax, unit(axis)))) * 30] : []),
    (W) => (thumb ? V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), unit(thumb)).map((v) => v * wDir) : []),
    (W) => (palm ? V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), unit(palm)).map((v) => v * wDir) : []),
    (W) => (elbow ? V.sub(W.elbow_r.p, elbow).map((v) => v * wElbow) : []),
    (W, q) => { const sh = q.ch.shoulder_r, el = q.ch.elbow_r.flex, w = q.ch.wrist_r; return [w.flex * wristW, w.dev * wristW, Math.min(0, sh.elev - 4) * 3, Math.max(0, sh.elev - 200) * 3, Math.min(0, sh.plane + 58) * 3, Math.max(0, sh.plane - 138) * 3, Math.min(0, el - 2) * 3, Math.max(0, el - 148) * 3, Math.min(0, w.flex + 70) * 3, Math.max(0, w.flex - 70) * 3, Math.min(0, w.dev + 18) * 3, Math.max(0, w.dev - 33) * 3]; },
    ...extra,
  ];
  let best = null;
  for (const s of guesses) {
    const q0 = clone(p);
    q0.ch.shoulder_r = { plane: s[0], elev: s[1], axial: s[2] }; q0.ch.elbow_r = { flex: s[3] }; q0.ch.wrist_r = { pron: s[4], flex: s[5] ?? 0, dev: s[6] ?? 0 };
    const r = L.solvePose(q0, ARM, objs, { iters: 400, contacts });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const q = best.pose;
  for (const [j, c] of [['shoulder_r', 'axial'], ['wrist_r', 'pron'], ['shoulder_r', 'plane']]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  for (const c of ['flex', 'dev']) q.ch.wrist_r[c] = r1(q.ch.wrist_r[c]);
  q.ch.shoulder_r.elev = r1(q.ch.shoulder_r.elev); q.ch.elbow_r.flex = r1(q.ch.elbow_r.flex);
  if (mirror) B.mirrorArm(q);
  const W = L.fk(q, contacts);
  q.__err = +V.len(V.sub(EQ.gripPoint(W, 'r', grip).p, g)).toFixed(2); q.__cost = best.cost;
  return q;
}
const guessOf = (q) => [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];

/* ---------------- clearance of capsules and plate discs ---------------- */
const SHAPES = L.rig.shapes.flatMap((s) => (s.bilateral ? [`${s.id}_r`, `${s.id}_l`] : [s.id]));
function discPoints(d) {
  const u = unit(V.cross(d.ax, Math.abs(d.ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = V.cross(d.ax, u), pts = [];
  for (const face of [-1, 1]) { const c0 = V.add(d.c, V.scale(d.ax, (face * d.w) / 2)); pts.push(c0); for (const rr of [0.5, 1]) for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI; pts.push(V.add(c0, V.add(V.scale(u, Math.cos(a) * d.r * rr), V.scale(w, Math.sin(a) * d.r * rr)))); } }
  return pts;
}
// geom: { caps: [[a, b, r, label?]], discs: [{ c, ax, r, w }] }. Returns the nearest { d, id, what }.
function geomClear(W, geom, skip = /^(hand|thumb|forearm)_/) {
  let best = { d: 1e9 };
  for (const [a, b, r, label] of geom.caps) { const c = EQ.segmentClear(W, a, b, r, { skip, n: Math.max(4, Math.ceil(V.len(V.sub(b, a)) / 6)) }); if (c.d < best.d) best = { d: c.d, id: c.id, what: label || 'bar' }; }
  for (const d of geom.discs) for (const p of discPoints(d)) for (const id of SHAPES) { if (skip.test(id)) continue; const dd = EQ.pointShape(W, p, id); if (dd < best.d) best = { d: dd, id, what: 'plate' }; }
  return best;
}
const discMinY = (d) => d.c[1] - d.r * Math.sqrt(Math.max(0, 1 - d.ax[1] * d.ax[1])) - (d.w / 2) * Math.abs(d.ax[1]);
const geomMinY = (geom) => Math.min(...geom.discs.map(discMinY), ...geom.caps.map(([a, b, r]) => Math.min(a[1], b[1]) - r));
// local bar frame -> world: origin c, axes x, y, z
const toWorld = (f) => (p) => V.add(f.c, V.add(V.scale(f.x, p[0]), V.add(V.scale(f.y, p[1]), V.scale(f.z, p[2]))));

/* ---------------- EZ curl bar ---------------- */
const EZ = { length: 120, width: 44, camber: 22, plateD: 32, grip: 'bar' };
const ezProp = ({ width = EZ.width, grip = 'outer', camber = EZ.camber, plates = 1, plateD = EZ.plateD, id = 'ez_bar' } = {}) =>
  ({ id, kind: 'ez_bar', size: [EZ.length, plateD, plateD], attach: { joint: 'wrist_r', with: 'wrist_l', grip: EZ.grip }, params: { width, grip, camber, plates, plateD } });
// Right-hand wishes for an underhand EZ grip: the camber turns the thumb-side handle axis from the bar axis (+Z) toward
// the palm normal by `camber` degrees (thumbs up toward neutral). palm0: the palm normal on a straight bar (world).
function ezHandAxes(palm0, camber = EZ.camber) {
  const c = Math.cos(camber * RAD), s = Math.sin(camber * RAD), Z = [0, 0, 1], P = unit(palm0);
  return { thumb: V.add(V.scale(Z, c), V.scale(P, s)), palm: V.sub(V.scale(P, c), V.scale(Z, s)) };
}
// the same zigzag as the player (src/gear/bars.js ezPoints)
function ezPoints(p) {
  const g = (p.width ?? EZ.width) / 2, th = (p.camber ?? EZ.camber) * RAD, h = 6, seg = 12, half = (p.length ?? EZ.length) / 2, sleeve0 = half - 25;
  const c = Math.cos(th), s = Math.sin(th), P2 = [g - h * c, -h * s], P3 = [g + h * c, h * s];
  if ((p.grip || 'outer') === 'inner') { const P4 = [P3[0] + seg * c, P3[1] - seg * s]; return { pts: [[0, P2[1]], P2, P3, P4, [sleeve0, P4[1]]], sleeve0, half, ys: P4[1] }; }
  const P1 = [P2[0] - seg * c, P2[1] + seg * s];
  return { pts: [[0, P1[1]], P1, P2, P3, [sleeve0, P3[1]]], sleeve0, half, ys: P3[1] };
}
// EZ bar frame from the hands (as the player's orient): x left -> right grip, y the camber offset direction
function ezAt(W) {
  const r = handFrame(W, 'r', EZ.grip), l = handFrame(W, 'l', EZ.grip), d = V.sub(r.p, l.p), width = V.len(d), x = V.scale(d, 1 / width);
  const sR = V.scale(r.X, Math.sign(V.dot(r.X, x)) || 1), sL = V.scale(l.X, -(Math.sign(V.dot(l.X, x)) || 1));
  let y = V.add(perp(sR, x), perp(sL, x)); y = V.len(y) > 1e-2 ? unit(y) : unit(perp([0, 1, 0], x));
  const camber = Math.acos(Math.min(1, Math.abs(V.dot(sR, x)))) / RAD;
  return { c: V.scale(V.add(r.p, l.p), 0.5), x, y, z: V.cross(x, y), width, camber, r: r.p, l: l.p };
}
function ezGeometry(W, p = {}) {
  const f = ezAt(W), tw = toWorld(f), z = ezPoints(p), caps = [], discs = [], n = p.plates ?? 1, D = p.plateD ?? EZ.plateD;
  for (const s of [1, -1]) {
    const v = z.pts.map(([x, y]) => tw([s * x, y, 0]));
    for (let i = 0; i + 1 < v.length; i++) caps.push([v[i], v[i + 1], 1.25, 'bar']);
    caps.push([tw([s * z.sleeve0, z.ys, 0]), tw([s * z.half, z.ys, 0]), 2.5, 'sleeve']);
    for (let i = 0; i < n; i++) discs.push({ c: tw([s * (z.sleeve0 + 4.5 + i * 4), z.ys, 0]), ax: f.x, r: D / 2, w: 3.5 });
  }
  return { caps, discs, frame: f };
}
const ezClear = (W, p, skip) => geomClear(W, ezGeometry(W, p), skip);
const ezMinY = (W, p) => geomMinY(ezGeometry(W, p));

/* ---------------- trap (hex) bar ---------------- */
const TRAP = { width: 62, plateD: 45, grip: 'handle' };
const trapProp = ({ width = TRAP.width, rise = 0, plates = 1, plateD = TRAP.plateD, id = 'trap_bar' } = {}) =>
  ({ id, kind: 'trap_bar', size: [156, plateD, plateD], attach: { joint: 'wrist_r', with: 'wrist_l', grip: TRAP.grip }, params: { width, rise, plates, plateD } });
function trapFrame(p) {
  const hw = (p.width ?? TRAP.width) / 2, side = hw + 9, fz = 22, tip = 46;
  return { hw, side, fz, tip, rise: p.rise ?? 0, hex: [[side, fz], [0, tip], [-side, fz], [-side, -fz], [0, -tip], [side, -fz]], hl: 12, sleeveOut: side + 38 };
}
function trapAt(W) {
  const r = handFrame(W, 'r', TRAP.grip), l = handFrame(W, 'l', TRAP.grip), d = V.sub(r.p, l.p), width = V.len(d), x = V.scale(d, 1 / width);
  let h = perp(V.add(r.X, V.scale(l.X, Math.sign(V.dot(r.X, l.X)) || 1)), x);
  let y = V.len(h) > 1e-2 ? V.cross(unit(h), x) : unit(perp([0, 1, 0], x)); if (y[1] < 0) y = V.scale(y, -1);
  return { c: V.scale(V.add(r.p, l.p), 0.5), x, y, z: V.cross(x, y), width, r: r.p, l: l.p, tilt: Math.asin(Math.min(1, Math.abs(x[1]))) / RAD };
}
function trapGeometry(W, p = {}) {
  const f = trapAt(W), tw = toWorld(f), t = trapFrame(p), y0 = -t.rise, caps = [], discs = [], n = p.plates ?? 1, D = p.plateD ?? TRAP.plateD;
  for (let i = 0; i < 6; i++) { const a = t.hex[i], b = t.hex[(i + 1) % 6]; caps.push([tw([a[0], y0, a[1]]), tw([b[0], y0, b[1]]), 1.6, 'frame']); }
  for (const s of [1, -1]) {
    caps.push([tw([s * t.hw, 0, -t.hl]), tw([s * t.hw, 0, t.hl]), 1.6, 'handle']);
    caps.push([tw([s * t.side, y0, 0]), tw([s * t.sleeveOut, y0, 0]), 2.5, 'sleeve']);
    for (let i = 0; i < n; i++) discs.push({ c: tw([s * (t.side + 6 + i * 6), y0, 0]), ax: f.x, r: D / 2, w: 5.5 });
  }
  return { caps, discs, frame: f };
}
// clearance of the frame / plates from the body (the handles are skipped: the hands hold them)
function trapClear(W, p, skip) { const g = trapGeometry(W, p); g.caps = g.caps.filter((c) => c[3] !== 'handle'); return geomClear(W, g, skip); }
const trapMinY = (W, p) => geomMinY(trapGeometry(W, p));
// handle height with the plates resting on the floor (level bar)
const trapStartY = (p = {}) => (p.plateD ?? TRAP.plateD) / 2 + (p.rise ?? 0);

/* ---------------- landmine ---------------- */
// Olympic bar, the far end in the pivot: the hand holds the sleeve 4 cm from the end (pivot-to-grip R = 216 cm)
const LM = { length: 220, gripIn: 4, R: 216, pivotY: 8, plateD: 38, plateAt: -31, sleeve: 41 };
function landmineProps({ anchor, side = 'r', plates = 1, plateD = LM.plateD, plateAt = LM.plateAt, id = 'landmine' } = {}) {
  return [
    { id: `${id}_pivot`, kind: 'landmine', center: [r1(anchor[0]), 0, r1(anchor[2])], size: [34, anchor[1], 34], params: { pivotY: anchor[1] } },
    { id, kind: 'landmine', size: [LM.length, plateD, plateD], anchor: anchor.map(r1), attach: { joint: `wrist_${side}`, grip: 'handle' }, params: { plates, plateD, plateAt } },
  ];
}
// Pivot on the floor (height y, lateral z) R cm from the hand point p0, in front of it (+X)
function landmineAnchorFor(p0, { R = LM.R, y = LM.pivotY, z = 0 } = {}) {
  const dy = p0[1] - y, dz = p0[2] - z, dx = Math.sqrt(R * R - dy * dy - dz * dz);
  if (!(dx > 0)) throw new Error('landmineAnchorFor: hand out of reach of the bar');
  return [p0[0] + dx, y, z];
}
// point f (0..1) along the great-circle arc of the sphere (anchor, R) from point a to point b
function sphereArc(anchor, R, a, b, f) {
  const u = unit(V.sub(a, anchor)), w = unit(V.sub(b, anchor)), om = Math.acos(Math.max(-1, Math.min(1, V.dot(u, w))));
  if (om < 1e-6) return V.add(anchor, V.scale(u, R));
  const s = Math.sin(om), d = V.add(V.scale(u, Math.sin((1 - f) * om) / s), V.scale(w, Math.sin(f * om) / s));
  return V.add(anchor, V.scale(d, R));
}
// point on the sphere (anchor, R) at distance `reach` from S (circle of two spheres), the one nearest S + hint
function onSphere(anchor, R, S, reach, hint) {
  const d = V.sub(S, anchor), dl = V.len(d), u = V.scale(d, 1 / dl), a = (dl * dl + R * R - reach * reach) / (2 * dl), rc = Math.sqrt(Math.max(0, R * R - a * a));
  const c = V.add(anchor, V.scale(u, a)), h = unit(perp(hint, u));
  return V.add(c, V.scale(h, rc));
}
// objective: the sleeve (the hand's thumb side, grip frame -X) points at the pivot
function landmineObjective(anchor, { w = 4, side = 'r' } = {}) {
  return (W) => { const f = handFrame(W, side); return V.sub(f.thumb, unit(V.sub(anchor, f.p))).map((v) => v * w); };
}
// state of the bar: pivot-to-grip distance error (cm, vs R) and the sleeve-to-shaft kink (deg)
function landmineState(W, anchor, { side = 'r', R = LM.R } = {}) {
  const f = handFrame(W, side), s = unit(V.sub(anchor, f.p));
  return { dist: V.len(V.sub(anchor, f.p)), err: V.len(V.sub(anchor, f.p)) - R, kink: Math.acos(Math.max(-1, Math.min(1, V.dot(f.thumb, s)))) / RAD, grip: f.p, shaft: s };
}
// clearance of the bar (shaft from the pivot to the collar, sleeve, plates) from the body
function landmineClear(W, anchor, { side = 'r', plateD = LM.plateD, plateAt = LM.plateAt, plates = 1, skip } = {}) {
  const f = handFrame(W, side), t = f.thumb, at = (x) => V.add(f.p, V.scale(t, x)); // x cm toward the pivot along the sleeve
  const collar = at(LM.sleeve - LM.gripIn), caps = [[anchor, collar, 1.4, 'shaft'], [at(-LM.gripIn), collar, 2.5, 'sleeve']], discs = [];
  for (let i = 0; i < plates; i++) discs.push({ c: at(-(plateAt + (plateAt < 0 ? 1 : -1) * i * 5.5)), ax: t, r: plateD / 2, w: 5 });
  const sk = skip || new RegExp(`^(hand|thumb|forearm)_${side}$`);
  return geomClear(W, { caps, discs }, sk);
}

/* ---------------- rings / suspension straps ---------------- */
// One prop per hand; anchors: { r: [x, y, z], l: [...] } (one shared anchor for a suspension trainer); tilt { r, l } (deg)
function ringProps({ anchors, style = 'ring', tilt = { r: 0, l: 0 }, sides = ['r', 'l'] } = {}) {
  return sides.map((s) => ({ id: `rings_${s}`, kind: 'rings', size: [20, 20, 20], anchor: anchors[s].map(r1), attach: { joint: `wrist_${s}`, grip: 'handle' }, params: { style, tilt: r1(tilt[s] ?? 0) } }));
}
// strap from the anchor to the hand: length, unit direction (anchor -> hand) and angle from vertical (deg)
function strap(W, side, anchor) { const p = EQ.gripPoint(W, side, 'handle').p, d = V.sub(p, anchor), len = V.len(d); return { len, dir: V.scale(d, 1 / len), fromVertical: Math.acos(Math.max(-1, Math.min(1, -d[1] / len))) / RAD, grip: p }; }
// where the ring points in the hand: angle (deg) about the grip axis from the fingers toward grip-frame +Z, and the strap's
// out-of-ring-plane angle (along the grip axis)
function ringAngles(W, side, anchor) {
  const f = handFrame(W, side), s = unit(V.sub(anchor, f.p));
  return { tilt: Math.atan2(V.dot(s, f.Z), -V.dot(s, f.Y)) / RAD, off: Math.asin(Math.max(-1, Math.min(1, V.dot(s, f.X)))) / RAD };
}
// objective: the ring (fingers direction turned by tilt about the grip axis) points up the strap
function ringObjective(anchor, { side = 'r', tilt = 0, w = 1 } = {}) {
  return (W) => { const f = handFrame(W, side), c = Math.cos(tilt * RAD), s = Math.sin(tilt * RAD), r = V.add(V.scale(f.Y, -c), V.scale(f.Z, s)); return V.sub(r, unit(V.sub(anchor, f.p))).map((v) => v * w); };
}
// best fixed ring tilt for a list of rig states (W) and the worst residual (deg) between the ring and its strap
function ringTiltFit(Ws, side, anchor) {
  const a = Ws.map((W) => ringAngles(W, side, anchor));
  const sx = a.reduce((s, v) => s + Math.cos(v.tilt * RAD), 0), sy = a.reduce((s, v) => s + Math.sin(v.tilt * RAD), 0), tilt = Math.atan2(sy, sx) / RAD;
  const res = Math.max(...a.map((v) => Math.abs(L.wrap(v.tilt - tilt))));
  return { tilt: r1(tilt), residual: r1(res), off: r1(Math.max(...a.map((v) => Math.abs(v.off)))) };
}
const strapClear = (W, side, anchor, opt) => EQ.lineClear(W, anchor, EQ.gripPoint(W, side, 'handle').p, 1.2, opt);

/* ---------------- weight plate ---------------- */
const plateGripWidth = (D = 45) => D - 3;
const plateProp = ({ two = true, D = 45, side = 'r', thick = 4, id = 'plate' } = {}) => ({ id, kind: 'plate', size: [D, D, thick], attach: two ? { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' } : { joint: `wrist_${side}`, grip: 'handle' }, params: { thick } });
// plate disc (centre, axis, radius, thickness) as the player draws it
function plateAt(W, { two = true, side = 'r', D = 45, thick = 4 } = {}) {
  if (!two) { const f = handFrame(W, side); return { c: V.add(f.p, V.scale(f.Y, -(D / 2 - 3))), ax: f.Z, r: D / 2, w: thick }; }
  const r = handFrame(W, 'r'), l = handFrame(W, 'l'), x = unit(V.sub(r.p, l.p)), h = unit(perp(V.add(r.X, V.scale(l.X, Math.sign(V.dot(r.X, l.X)) || 1)), x));
  return { c: V.scale(V.add(r.p, l.p), 0.5), ax: V.cross(x, h), r: D / 2, w: thick, width: V.len(V.sub(r.p, l.p)) };
}
const plateClear = (W, opt = {}, skip) => geomClear(W, { caps: [], discs: [plateAt(W, opt)] }, skip);

module.exports = {
  handFrame, armTo, guessOf, geomClear, geomMinY, discPoints,
  EZ, ezProp, ezHandAxes, ezPoints, ezAt, ezGeometry, ezClear, ezMinY,
  TRAP, trapProp, trapFrame, trapAt, trapGeometry, trapClear, trapMinY, trapStartY,
  LM, landmineProps, landmineAnchorFor, sphereArc, onSphere, landmineObjective, landmineState, landmineClear,
  ringProps, strap, ringAngles, ringObjective, ringTiltFit, strapClear,
  plateGripWidth, plateProp, plateAt, plateClear,
};
