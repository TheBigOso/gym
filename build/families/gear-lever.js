// Lever / plate-loaded / selectorized machines (prop kind 'lever_machine', src/gear/lever.js): authoring helpers.
// The geometry and the lever math are the gear file's own (required here), so authors and the player agree exactly.
// Units: cm, world axes (+X forward, +Y up, +Z the figure's right). A machine is placed at `center` with yaw `rotY`.
//
//   machine(type, opt)        -> M: { prop, P, arms, toLocal(p), toWorld(p) }; opt = { id, center, rotY, color, ...params }
//   seatTop(M) / backPlane(M) -> seat top height; back pad front face as { n, d } (n.p = d, n points off the pad)
//   seated(M, opt)            -> { pose, contacts, fit }: the athlete seated on the seat, back on the back pad (if any)
//   kneeAxis(W) / pivotAt     -> the knee joint (for knee-axis machines put the lever pivot there)
//   endAt(M, arm, deg)        -> world point of the handle / pad centre for a lever angle ('arm', 'arm_r', 'arm_l')
//   angleOf(M, W, arm)        -> lever angle the player will show for this pose (same math as the gear update)
//   targetOf(M, W, arm)       -> the point the arm follows (grip point or limb contact point) in world cm
//   offArc(M, W, arm)         -> distance (cm) of that point from the arm's arc: 0 = the pad / handle sits exactly on it
//   arcPoints(M, arm, a0, a1, n) -> world points along the end's arc (hand or pad path keyframes)
//   partsAt(M, angles)        -> sampled surface points of the static pads and the moving ends (world, for clearance)
//   clearance(M, W, opt)      -> least clearance (cm) of the machine's pads / moving ends from the body (skip regex)
//   track(ex, M, opt)         -> whole-loop report: lever angle range, worst off-arc error, clamp hits, clearance
//   gate(name, rep, opt)      -> fails the process when the report breaks the limits
//   handProps(two)            -> held 'lever_machine' items so the player closes the hands on the handles
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const EQ = require('./equip');
const H = require('./hips');
const G = require('../../src/gear/lever.js');

const DEG = Math.PI / 180;
const yawRot = (deg) => { const a = deg * DEG, c = Math.cos(a), s = Math.sin(a); return { f: (p) => [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c], i: (p) => [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c] }; };

function machine(type, opt = {}) {
  const { id = 'machine', center = [0, 0, 0], rotY = 0, color = null, size = null, ...params } = opt;
  const prop = { id, kind: 'lever_machine', center: center.slice(), params: { type, ...clone(params) } };
  if (rotY) prop.rotY = rotY;
  if (color) prop.color = color;
  const P = G.leverParams(prop), Y = yawRot(rotY);
  const toLocal = (p) => Y.i(V.sub(p, center)), toWorld = (p) => V.add(Y.f(p), center);
  // footprint for the viewer's framing (the player expands its framing box by center +- size / 2)
  const xs = [P.pivot[0], P.end[0], P.seat ? P.seat.x - P.seat.d / 2 : 0, P.back ? P.back.x - 20 : 0, P.stack ? P.stack.x : 0, ...P.pads.map((d) => d.c[0])];
  const ys = [P.pivot[1], P.end[1], P.stack ? P.stack.h : 0];
  prop.size = size || [r1(2 * Math.max(...xs.map(Math.abs)) + 10), r1(Math.max(...ys) + 5), r1(2 * Math.max(Math.abs(P.armZ), Math.abs(P.end[2]), Math.abs(P.pivot[2] || 0)) + 30)];
  return { prop, P, arms: G.leverArms(P), toLocal, toWorld };
}
const armOf = (M, a) => (typeof a === 'object' ? a : M.arms.find((x) => x.id === (a || M.arms[0].id)) || M.arms[0]);
const seatTop = (M) => (M.P.seat ? M.toWorld([M.P.seat.x, M.P.seat.y, 0])[1] : 0);
function backPlane(M) {
  const b = M.P.back; if (!b) return null;
  const a = b.angle * DEG, n = M.toWorld([Math.cos(a), Math.sin(a), 0]).map((v, i) => v - M.toWorld([0, 0, 0])[i]);
  return { n, d: V.dot(n, M.toWorld([b.x, b.y, 0])) };
}
const kneeAxis = (W, s = 'r') => W[`knee_${s}`].p.slice();

/* ---------------- seat placement ---------------- */
const planeClear = (W, id, n, d) => { const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === id)); if (g.kind === 'capsule') return Math.min(V.dot(g.a, n) - g.r[0], V.dot(g.b, n) - g.r[1]) - d; return V.dot(g.c, n) - Math.hypot(V.dot(g.axes[0], n), V.dot(g.axes[1], n), V.dot(g.axes[2], n)) - d; };
const BACK_IDS = ['ribcage', 'pelvis', 'buttock_r', 'traps_r'];
// Seated on the machine (a machine with rotY 0). The trunk leans back with the back pad (or `lean` deg with none); the
// root and hip flexion are solved so the buttocks and the back of the thighs rest on the seat and the back on the pad.
// opt: { knee (deg), feet: 'free' | 'floor', stance (half width at the feet), toe, footAhead, lean, hipFlex (start),
// thighOnSeat (true: thighs rest on the seat; false: only the buttocks), dorsi (free feet), abd }
function seated(M, opt = {}) {
  const { knee = 90, feet = 'free', stance = 14, toe = 6, footAhead = 4, thighOnSeat = true, dorsi = 0, abd = 4 } = opt;
  const back = backPlane(M), top = seatTop(M), lean = opt.lean ?? (M.P.back ? M.P.back.angle : 0);
  const st = L.POSES.standing({ stance, toeOut: toe }), p = clone(st.pose);
  delete p.ik;
  p.root.rot = { pitch: lean };
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 0, latFlex: 0 };
  p.ch.sc_r = { protract: 2, elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.hip_r = { flex: opt.hipFlex ?? 90 - lean, abd, rot: -2 }; p.ch.hip_l = clone(p.ch.hip_r);
  p.ch.knee_r = { flex: knee }; p.ch.knee_l = { flex: knee };
  p.ch.ankle_r = { dorsi }; p.ch.ankle_l = { dorsi };
  p.root.pos = [M.P.seat ? M.toWorld([M.P.seat.x, 0, 0])[0] : 0, top + 40, 0];
  const up = [0, 1, 0];
  // hip flexion: the thigh (hip -> knee) rises `thighRise` deg above horizontal (1D solve), then the root is placed so
  // the buttocks rest on the seat and the back on the pad
  const rise = (q) => { const W = L.fk(q), d = V.sub(W.knee_r.p, W.hip_r.p); return Math.atan2(d[1], Math.hypot(d[0], d[2])) / DEG; };
  p.ch.hip_r.flex = r1(L.solvePose(p, ['ch.hip_r.flex'], [(W, q) => [rise(q) - (opt.thighRise ?? 2)]], { iters: 60 }).pose.ch.hip_r.flex);
  const objs = [
    (W) => [planeClear(W, 'buttock_r', up, top) * 4],
    (W) => (back ? [Math.min(...BACK_IDS.map((id) => planeClear(W, id, back.n, back.d))) * 4] : [(W.pelvis.p[0] - p.root.pos[0]) * 0.5]),
  ];
  const paths = ['root.pos.0', 'root.pos.1'];
  let q = L.solvePose(p, paths, objs, { iters: 200 }).pose;
  q.ch.hip_l = clone(q.ch.hip_r);
  let contacts = [];
  if (feet === 'floor') {
    const F = require('./b3-shoulders');
    contacts = F.legContacts(toe + 4, toe);
    const W = L.fk(q);
    q.ik = { leg_r: { target: [r1(W.knee_r.p[0] + footAhead), L.ANKLE_H, stance], weight: 1 }, leg_l: { target: [r1(W.knee_r.p[0] + footAhead), L.ANKLE_H, -stance], weight: 1 } };
    q = F.plantLegs(q, contacts);
  }
  const W = L.fk(q, contacts);
  const fit = { seat: +Math.min(planeClear(W, 'buttock_r', up, top), planeClear(W, 'thigh_r', up, top)).toFixed(2), thigh: +planeClear(W, 'thigh_r', up, top).toFixed(2), back: back ? +Math.min(...BACK_IDS.map((id) => planeClear(W, id, back.n, back.d))).toFixed(2) : null, hipFlex: q.ch.hip_r.flex };
  return { pose: q, contacts, fit };
}

/* ---------------- lever kinematics in world space ---------------- */
const getter = (M, W) => ({ get: (j) => M.toLocal(W[j].p), grip: (s, g) => M.toLocal(EQ.gripPoint(W, s, g).p) });
function endAt(M, arm, deg) { return M.toWorld(G.leverEndAt(M.P, armOf(M, arm), deg)); }
function targetOf(M, W, arm) { const g = getter(M, W); return M.toWorld(G.leverTarget(M.P, armOf(M, arm), g.get, g.grip)); }
function angleOf(M, W, arm) { const g = getter(M, W); return G.leverAngle(M.P, armOf(M, arm), G.leverTarget(M.P, armOf(M, arm), g.get, g.grip)); }
function offArc(M, W, arm) { return V.len(V.sub(endAt(M, arm, angleOf(M, W, arm)), targetOf(M, W, arm))); }
function arcPoints(M, arm, a0, a1, n = 6) { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push({ f: i / n, a, p: endAt(M, arm, a) }); } return out; }
// pivot (and rest end) so the end swings on an arc through two points with the pivot `side` of the chord: axis 'z' only.
// Returns { pivot: [x, y, 0], end: p0 } in machine-local cm.
function pivotThrough(M, p0, p1, radius, side = 1) {
  const a = M.toLocal(p0), b = M.toLocal(p1), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [b[0] - a[0], b[1] - a[1]], c = Math.hypot(...d) / 2;
  const h = Math.sqrt(Math.max(0, radius * radius - c * c)), n = [-d[1] / (2 * c), d[0] / (2 * c)];
  return { pivot: [r1(m[0] + side * n[0] * h), r1(m[1] + side * n[1] * h), 0], end: a.map(r1) };
}

/* ---------------- clearance ---------------- */
function rotXYZ(rot) { // THREE Euler 'XYZ': R = Rx Ry Rz
  const [x, y, z] = (rot || [0, 0, 0]).map((v) => v * DEG);
  return Q.mul(Q.mul(Q.axis([1, 0, 0], x / DEG), Q.axis([0, 1, 0], y / DEG)), Q.axis([0, 0, 1], z / DEG));
}
function boxPts(c, s, rot, k = 3) {
  const q = rotXYZ(rot), out = [];
  for (let i = 0; i <= k; i++) for (let j = 0; j <= k; j++) for (let l = 0; l <= k; l++) {
    if (i % k && j % k && l % k) continue; // surface only
    out.push(V.add(c, Q.rot(q, [(i / k - 0.5) * s[0], (j / k - 0.5) * s[1], (l / k - 0.5) * s[2]])));
  }
  return out;
}
function rollPts(c, len, r, n = 8, m = 5) { const out = []; for (let i = 0; i <= m; i++) for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI; out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2] - len / 2 + (len * i) / m]); } return out; }
// sampled surface points (world): static pads, seat, back pad, and the moving ends at the given angles { armId: deg }
function partsAt(M, angles = {}, { statics = true } = {}) {
  const P = M.P, parts = [];
  if (statics) {
    if (P.seat) parts.push({ id: 'seat', pts: boxPts([P.seat.x, P.seat.y - P.seat.t / 2, 0], [P.seat.d, P.seat.t, P.seat.w]) });
    if (P.back) { const b = P.back, a = b.angle * DEG, c = [b.x - Math.sin(a) * b.h / 2 - Math.cos(a) * b.t / 2, b.y + Math.cos(a) * b.h / 2 - Math.sin(a) * b.t / 2, 0]; parts.push({ id: 'back', pts: boxPts(c, [b.t, b.h, b.w], [0, 0, b.angle]) }); }
    P.pads.forEach((d, i) => parts.push({ id: `pad${i}`, pts: d.kind === 'roller' ? rollPts(d.c, d.size[0], d.size[1] / 2) : d.kind === 'bar' ? [] : boxPts(d.c, d.size, d.rot) }));
  }
  for (const arm of M.arms) {
    const deg = angles[arm.id] ?? 0, e = G.leverEnd0(P, arm); let pts;
    if (P.endKind === 'roller') pts = rollPts(e, P.endSize[0], P.endSize[1]);
    else if (P.endKind === 'pad') pts = boxPts(e, P.endSize, P.endRot);
    else pts = []; // handles are in the hands
    parts.push({ id: `${arm.id}:end`, moving: arm.id, pts: pts.map((p) => G.leverRotate(P, arm, p, deg)) });
    (P.armPads || []).forEach((ap, i) => parts.push({ id: `${arm.id}:pad${i}:end`, moving: arm.id, pts: boxPts([ap.c[0], ap.c[1], ap.c[2] * arm.s], ap.size, ap.rot).map((p) => G.leverRotate(P, arm, p, deg)) }));
  }
  for (const pt of parts) pt.pts = pt.pts.map(M.toWorld);
  return parts;
}
const SHAPE_IDS = rig.shapes.map((s) => s.id);
// least clearance (cm, < 0 = into the body) of the machine parts from the body. skip: shape ids to ignore (regex);
// per-part skips: { 'seat': /.../ } override. Seat and back pads are contact surfaces: they report how far the body
// sinks in (a few cm of padding compression is normal).
function clearance(W, M, angles, { skip = /^(hand|thumb)_/, partSkip = {}, statics = true } = {}) {
  const out = {};
  for (const part of partsAt(M, angles, { statics })) {
    let best = { d: 1e9 }; const sk = partSkip[part.id] || skip;
    for (const p of part.pts) for (const id of SHAPE_IDS) { if (sk && sk.test(id)) continue; const d = EQ.pointShape(W, p, id); if (d < best.d) best = { d: +d.toFixed(2), id }; }
    if (part.pts.length) out[part.id] = best;
  }
  return out;
}

/* ---------------- loop report ---------------- */
// track: lever angles over the loop, worst off-arc distance per arm (the pad / handle would have to leave the hand or
// limb by this much: keep it small), clamp hits (angle pinned at a range end), least clearance of each part.
function track(ex, M, { planted = [], skip, partSkip, n = 1600 } = {}) {
  const arms = {}; for (const a of M.arms) arms[a.id] = { range: [1e9, -1e9], offArc: 0, clamp: 0 };
  const clear = {};
  let i = 0;
  const rep = H.loopReport(ex, { planted, probe: (W, pz, t) => {
    const angs = {};
    for (const a of M.arms) {
      const tg = targetOf(M, W, a), ang = angleOf(M, W, a), o = V.len(V.sub(endAt(M, a, ang), tg)), A = arms[a.id];
      angs[a.id] = ang; A.range = [Math.min(A.range[0], ang), Math.max(A.range[1], ang)];
      if (o > A.offArc) { A.offArc = +o.toFixed(2); A.offAt = +t.toFixed(2); }
      if (ang <= M.P.range[0] + 1e-6 || ang >= M.P.range[1] - 1e-6) A.clamp++;
    }
    if (i++ % 20 === 0) { const c = clearance(W, M, angs, { skip, partSkip }); for (const k in c) if (!clear[k] || c[k].d < clear[k].d) clear[k] = { ...c[k], t: +t.toFixed(2) }; }
  } });
  for (const k in arms) arms[k].range = arms[k].range.map((v) => +v.toFixed(1));
  rep.arms = arms; rep.clear = clear;
  return rep;
}
// limits: maxOffArc (cm), minClear for moving ends (cm), maxSink for the seat / back / static pads (cm into the body)
function gate(name, rep, { maxOffArc = 1.5, minClear = -1.5, maxSink = 3, maxSlide = 0.05, floor = -0.5 } = {}) {
  const bad = [];
  for (const [k, a] of Object.entries(rep.arms)) { if (a.offArc > maxOffArc) bad.push(`${k} end ${a.offArc} cm off its arc at ${a.offAt}s`); if (a.clamp) bad.push(`${k} angle pinned at its range end (${a.clamp} samples)`); }
  for (const [k, c] of Object.entries(rep.clear)) { const lim = /:end$/.test(k) ? minClear : -maxSink; if (c.d < lim) bad.push(`${k} into the ${c.id} by ${-c.d} cm at ${c.t}s`); }
  if (rep.slide > maxSlide) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < floor) bad.push(`below the floor ${rep.floor}`);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
  return bad;
}
// held 'lever_machine' items: the player closes the hand(s) on the machine's handles (draws nothing)
const handProps = (sides = ['r', 'l']) => sides.map((s) => ({ id: `hand_on_machine_${s}`, kind: 'lever_machine', attach: { joint: `wrist_${s}` } }));


/* ---------------- hands on the handles along the lever arc ---------------- */
// Right arm solved onto the handle at each lever angle in `angles` (deg, first = start), the grip point on the arc
// and the handle axis from the machine (endRot applied to +Z). The first and last keys are solved free (with an optional
// elbow hint for the first), the in-between keys follow the upper arm's slerp between them, so the elbow sweeps smoothly.
// spec: { palm (world dir), g0 / g1 (armR guesses), elbow0 / elbow1 (world elbow hints for the first / last key), wElbow }.
// Returns [{ f, a, pose }] (f = 0 first ... 1 last), with worstGrip (cm) and the keys' armR errors.
function armOnArc(base, contacts, M, angles, spec = {}) {
  const C = require('./eq-cable'), CH = require('./b3-chest');
  const arm = armOf(M, 'arm_r'), rot = rotXYZ(M.P.endRot), ax = (a) => { const z = Q.rot(rot, [0, 0, 1]); const w = M.toWorld(G.leverRotate(M.P, arm, V.add(G.leverPivot(M.P, arm), z), a)); return V.norm(V.sub(w, M.toWorld(G.leverPivot(M.P, arm)))); };
  const one = (a, guess, elbow, w) => C.armR(base, contacts, { grip: endAt(M, arm, a), axis: ax(a), palm: spec.palm, wPalm: spec.wPalm ?? 2, elbow, wElbow: w, guess, wGrip: 4 });
  const n = angles.length - 1, p0 = one(angles[0], spec.g0 || { plane: -30, elev: 55, axial: 10, pron: 128, flex: 130 }, spec.elbow0, spec.elbow0 ? 0.6 : 0);
  const p1 = one(angles[n], spec.g1 || { plane: 95, elev: 80, axial: -80, pron: 175, flex: 15 }, spec.elbow1, spec.elbow1 ? 0.6 : 0);
  const ua = (p) => { const W = L.fk(p, contacts); return V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); };
  const d0 = ua(p0), d1 = ua(p1), S = L.fk(base, contacts).shoulder_r.p, out = []; let g = C.guessOf(p0), worst = 0;
  for (let i = 0; i <= n; i++) {
    const f = i / n, E = V.add(S, V.scale(CH.slerpV(d0, d1, f), L.UA));
    const p = i === 0 ? p0 : i === n ? p1 : one(angles[i], g, E, spec.wElbow ?? 1.5);
    worst = Math.max(worst, p.__err.grip); g = C.guessOf(p); out.push({ f, a: angles[i], pose: p });
  }
  out.worstGrip = worst;
  return out;
}
module.exports.armOnArc = armOnArc;

module.exports = Object.assign(module.exports, { G, machine, seatTop, backPlane, seated, kneeAxis, endAt, targetOf, angleOf, offArc, arcPoints, pivotThrough, partsAt, clearance, track, gate, handProps, planeClear });
