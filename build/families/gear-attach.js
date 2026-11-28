// Authoring helpers for body-mounted gear and balls (src/gear/attach.js): ankle-strap cuff on a cable, band loop around
// both knees or ankles, dumbbell resting on the lap or held between the feet, stability ball and bosu.
// The player places a body-mounted item at its joint plus attach.offset in that joint's frame (src/player.js placeHeld),
// so these helpers work on the same rig joints: rig v2 matches the drawn body, no mesh offsets.
// Units: cm, world axes (+X forward, +Y up, +Z the figure's right). Joint frames: in the standing rest pose every joint
// frame equals the world axes (hip and knee frames: -Y down the thigh / shank; ankle frame: +Y up the shank, +X along the
// foot).
const L = require('../lib');
const { R, V, Q, rig } = L;
const EQ = require('./equip');

const r1 = (v) => Math.round(v * 10) / 10;
const qInv = (q) => Q.conj(q);
const toFrame = (W, j, p) => Q.rot(qInv(W[j].q), V.sub(p, W[j].p)); // world point -> joint frame offset
const fromFrame = (W, j, off) => V.add(W[j].p, Q.rot(W[j].q, off)); // joint frame offset -> world point
const shapeOf = (id) => rig.shapes.find((s) => s.id === id); // built rig: bilateral shapes are thigh_r, thigh_l, ...
// radius (cm) of a bilateral capsule limb shape at fraction t from its `from` joint (thigh: hip->knee, shank: knee->ankle)
function limbR(shape, t) { const s = shapeOf(shape) || shapeOf(`${shape}_r`), r = s.r; return r[0] + (r[1] - r[0]) * Math.max(0, Math.min(1, t)); }

/* ---------------- ankle strap (cable attachment) ---------------- */
const STRAP = { cuffR: 5, cuffH: 7, up: 7 }; // cuff radius and height (cm); cuff centre `up` cm above the ankle joint
// The cable prop for an ankle strap on `side`. ring: D-ring direction in the ankle frame (default: inner side of the
// ankle, toward a pulley on the other side of the body). Until the schema's attachment enum lists 'ankle_strap' the prop
// uses attachment 'handle' with params.attachment 'ankle_strap' (src/gear/attach.js draws the strap for both).
function ankleStrap(anchor, { side = 'r', ring = null, cuffR = STRAP.cuffR, cuffH = STRAP.cuffH, up = STRAP.up, id = 'strap', schemaAttachment = 'handle' } = {}) {
  const rg = V.norm(ring || [0, 0, side === 'r' ? -1 : 1]); rg[1] = 0; const rn = V.norm(rg);
  // the mesh origin is the D-ring: cuff axis `up` cm above the ankle, ring cuffR + 2.2 cm out from the axis
  const offset = V.add([0, up, 0], V.scale(rn, cuffR + 2.2)).map(r1);
  const params = { attachment: 'ankle_strap', ring: rn.map((v) => +v.toFixed(3)), cuffR, cuffH };
  return { id, kind: 'cable', attachment: schemaAttachment, anchor: anchor.slice(), attach: { joint: `ankle_${side}`, offset }, params };
}
// world position of the D-ring (where the cable ends) and the cuff centre for a strap prop
function strapPoint(W, prop) { const j = prop.attach.joint, ring = fromFrame(W, j, prop.attach.offset); const rn = prop.params.ring, cuff = fromFrame(W, j, V.sub(prop.attach.offset, V.scale(rn, prop.params.cuffR + 2.2))); return { ring, cuff }; }
// cable clearance from the body (cm, < 0 = through it); skips the strapped shank and foot
function strapLineClear(W, prop) { const s = prop.attach.joint.slice(-1); return EQ.segmentClear(W, prop.anchor, strapPoint(W, prop).ring, 0.4, { skip: new RegExp(`^(shank_${s}|foot_${s})$`), n: 24 }); }
// cable length from the pulley to the D-ring (for a "load" measure: it grows as the leg moves away from the pulley)
const strapCable = (W, prop) => V.len(V.sub(strapPoint(W, prop).ring, prop.anchor));

/* ---------------- band loop around both legs ---------------- */
// where: 'knees' (thighs just above the knees, default), 'ankles' (shins just above the ankles) or 'thighs' (mid-thigh)
const LOOP = { knees: { loop: ['knee_r', 'knee_l'], toward: ['hip_r', 'hip_l'], at: 0.15, shape: 'thigh', t: 0.85 }, thighs: { loop: ['knee_r', 'knee_l'], toward: ['hip_r', 'hip_l'], at: 0.5, shape: 'thigh', t: 0.5 },
  ankles: { loop: ['ankle_r', 'ankle_l'], toward: ['knee_r', 'knee_l'], at: 0.15, shape: 'shank', t: 0.85 } };
function bandLoop({ where = 'knees', at = null, width = 4, color = null, id = 'band' } = {}) {
  const d = LOOP[where], a = at ?? d.at, t = d.shape === 'thigh' ? 1 - a : 1 - a; // fraction from the shape's `from` joint
  const r = +limbR(d.shape, t).toFixed(1);
  const prop = { id, kind: 'band', center: [0, 0, 0], params: { loop: d.loop.slice(), toward: d.toward.slice(), at: a, r: [r, r], width } };
  if (color) prop.color = color;
  return prop;
}
// the loop's two leg points (cm) and the band's stretch: centre distance and the loop length around both legs
function bandLoopAt(W, prop) {
  const P = prop.params, pt = (i) => V.lerp(W[P.loop[i]].p, W[P.toward[i]].p, P.at), a = pt(0), b = pt(1), d = V.len(V.sub(a, b));
  const [ra, rb] = P.r; return { a, b, gap: d, clear: d - ra - rb, length: 2 * d + Math.PI * (ra + rb) };
}

/* ---------------- dumbbell resting on the body ---------------- */
// A dumbbell lying across both thighs (on the lap), given a pose W in which the thighs are roughly horizontal: centre on
// top of the thighs at `along` of the way from hip to knee, handle across the body. Attached to hip_<side>, so it rides
// on that thigh. Returns the prop (kind dumbbell, attach + params.axis) for src/gear/attach.js.
function lapDumbbell(W, { side = 'r', along = 0.55, size = [32, 12, 12], id = 'db', gap = 0.2 } = {}) {
  const at = (s) => V.lerp(W[`hip_${s}`].p, W[`knee_${s}`].p, along);
  const mid = V.scale(V.add(at('r'), at('l')), 0.5), across = V.norm(V.sub(at('r'), at('l')));
  const thigh = V.norm(V.sub(W[`knee_${side}`].p, W[`hip_${side}`].p)), up = V.norm(V.sub([0, 1, 0], V.scale(thigh, thigh[1])));
  // raise the handle along `up` until the whole dumbbell (plates as a capsule of their radius) just clears the body
  const half = size[0] / 2 - 4, rr = size[1] / 2, clear = (h) => { const c = V.add(mid, V.scale(up, h)); return EQ.segmentClear(W, V.add(c, V.scale(across, half)), V.sub(c, V.scale(across, half)), rr, { skip: /^(hand|thumb|forearm)_/, n: 10 }).d; };
  let lo = 0, hi = 40; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (clear(m) < gap) lo = m; else hi = m; }
  const c = V.add(mid, V.scale(up, hi));
  return { id, kind: 'dumbbell', size, attach: { joint: `hip_${side}`, offset: toFrame(W, `hip_${side}`, c).map(r1) }, params: { axis: Q.rot(qInv(W[`hip_${side}`].q), across).map((v) => +v.toFixed(3)) } };
}
// A dumbbell held upright between the feet (head on top of the insteps, as in a seated or hanging leg raise): attached to
// ankle_<side>; the handle runs vertically in the pose W given.
function feetDumbbell(W, { side = 'r', size = [32, 12, 12], id = 'db', drop = 4, forward = 4 } = {}) {
  const mid = V.scale(V.add(W.ankle_r.p, W.ankle_l.p), 0.5), j = `ankle_${side}`;
  const shin = V.norm(V.sub(W[`knee_${side}`].p, W[j].p)), c = V.add(V.add(mid, V.scale(shin, -drop)), V.scale(Q.rot(W[j].q, [1, 0, 0]), forward));
  return { id, kind: 'dumbbell', size, attach: { joint: j, offset: toFrame(W, j, c).map(r1) }, params: { axis: Q.rot(qInv(W[j].q), shin).map((v) => +v.toFixed(3)) } };
}
// world centre, axis, end-plate centres and radius of a body-mounted dumbbell prop (as the player draws it)
function bodyDumbbellAt(W, prop) {
  const j = prop.attach.joint, c = fromFrame(W, j, prop.attach.offset), ax = V.norm(Q.rot(W[j].q, prop.params.axis || [1, 0, 0]));
  const len = (prop.size && prop.size[0]) || 32, half = len / 2 - 4;
  return { c, ax, ends: [V.add(c, V.scale(ax, half)), V.sub(c, V.scale(ax, half))], r: ((prop.size && prop.size[1]) || 12) / 2 };
}
// clearance (cm) of a body-mounted dumbbell from the body: < 0 means into the body. A resting dumbbell should sit at about
// 0 (touching) on the shapes it rests on and stay clear of everything else; `skip` drops shapes such as the hands.
function bodyDumbbellClear(W, prop, { skip = /^(hand|thumb)_/ } = {}) { const d = bodyDumbbellAt(W, prop); return EQ.segmentClear(W, d.ends[0], d.ends[1], d.r, { skip, n: 10 }); }

/* ---------------- stability ball ---------------- */
// prop + geometry: centre (cm) and radius; squash flattens the ball, keeping its bottom on the floor
function stabilityBall({ x = 0, z = 0, d = 65, squash = 0.04, id = 'ball', color = null } = {}) {
  const prop = { id, kind: 'stability_ball', center: [x, 0, z], size: [d, d, d], params: { squash } };
  if (color) prop.color = color;
  return { prop, c: [x, (d / 2) * (1 - squash), z], r: d / 2, rx: (d / 2) * (1 + squash / 2), ry: (d / 2) * (1 - squash) };
}
// point on the ball surface in direction dir from the centre (ellipsoid with the squash)
function ballSurface(ball, dir) { const n = V.norm(dir), k = 1 / Math.hypot(n[0] / ball.rx, n[1] / ball.ry, n[2] / ball.rx); return V.add(ball.c, V.scale(n, k)); }
const ballTop = (ball) => [ball.c[0], ball.c[1] + ball.ry, ball.c[2]];
// signed distance (cm) from a point to the ball surface (approximate, through the ellipsoid scale)
function ballDist(ball, p) { const d = V.sub(p, ball.c), k = Math.hypot(d[0] / ball.rx, d[1] / ball.ry, d[2] / ball.rx); return (k - 1) * Math.min(ball.rx, ball.ry); }
// contact of a rig shape with the ball: signed gap (cm) between the shape and the ball surface (< 0 = sunk into the ball).
// Capsules are sampled along their axis; ellipsoids by their centre and radius along the line to the ball centre.
function shapeBallGap(W, ball, shapeId) {
  const s = R.shapeWorld(W, shapeOf(shapeId));
  if (s.kind === 'capsule') { let best = 1e9; for (let k = 0; k <= 10; k++) { const t = k / 10, p = V.lerp(s.a, s.b, t), r = s.r[0] + (s.r[1] - s.r[0]) * t; best = Math.min(best, ballDist(ball, p) - r); } return best; }
  const u = V.norm(V.sub(ball.c, s.c)), ext = Math.hypot(...s.axes.map((a) => V.dot(a, u))); return ballDist(ball, s.c) - ext;
}
// body clearance from the ball: the lowest gap over all shapes (skip the ones meant to rest on it, then check those
// separately with shapeBallGap ~ 0)
function ballClear(W, ball, { skip = null } = {}) { let best = { d: 1e9, id: null }; for (const s of rig.shapes) { if (skip && skip.test(s.id)) continue; const d = shapeBallGap(W, ball, s.id); if (d < best.d) best = { d, id: s.id }; } return best; }

/* ---------------- bosu ---------------- */
// Dome up (default): rubber dome of height h - 4 on a 4 cm platform; flip: platform on top at height h, dome on the floor.
function bosu({ x = 0, z = 0, d = 63, h = 25, flip = false, id = 'bosu', color = null } = {}) {
  const prop = { id, kind: 'bosu', center: [x, 0, z], size: [d, h, d], params: { flip } };
  if (color) prop.color = color;
  const base = 4, a = d / 2 - 1, hh = h - base, Rs = (a * a + hh * hh) / (2 * hh);
  // surface height (cm) at a horizontal point (null outside)
  const surfaceY = (px, pz) => { const rr = Math.hypot(px - x, pz - z); if (rr > d / 2) return null; if (flip) return h; if (rr > a) return base; return base + hh - Rs + Math.sqrt(Rs * Rs - rr * rr); };
  return { prop, top: flip ? h : h, centre: [x, flip ? h : base + hh - Rs, z], sphereR: Rs, flip, surfaceY, apex: [x, h, z] };
}
// gap (cm) between a point and the bosu top surface directly below/above it (> 0 above)
const bosuGap = (b, p) => { const y = b.surfaceY(p[0], p[2]); return y == null ? null : p[1] - y; };

module.exports = { STRAP, LOOP, toFrame, fromFrame, limbR, ankleStrap, strapPoint, strapLineClear, strapCable, bandLoop, bandLoopAt, lapDumbbell, feetDumbbell, bodyDumbbellAt, bodyDumbbellClear, stabilityBall, ballSurface, ballTop, ballDist, shapeBallGap, ballClear, bosu, bosuGap };
