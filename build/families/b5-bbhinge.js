// Batch 5 barbell hinge family (b5-bbhinge): single-leg, stiff-legged and deficit deadlifts, bent-over and one-arm rows,
// rear delt raise, clean and press, seated good morning and the kneeling rollout. Builds on build/families/barbell.js
// (armsOnBar, sweep, placement helpers), equip.js (bar geometry) and the b3 back family (balanced standing hinge). Adds:
//   - barArms(p, c, gw, opt, state): both arms on a bar centred at c (along Z) with the hands gw cm apart, keeping one
//     continuous shoulder / wrist branch from key to key (state.guess) and tracking the worst grip error (state.err)
//   - hangBar(p, F, opt): straight arms hanging to a bar that sits just in front of the legs at the height a straight arm
//     reaches (the deadlift placement, generalised to a body shifted sideways, e.g. standing on one leg)
//   - one-hand barbell (held by its middle in one hand, attach wrist_r only): bar1At, bar1MinY, bar1BodyClear, sweep1
//   - timeline: keysFrom(segments) turns [t0, t1, [pose names], reverse] runs into eased keyframes
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const EQ = require('./equip');
const BB = require('./barbell');
const B = require('./b3-back');

const GRIP = BB.GRIP;
const near = (v, ref) => (ref == null ? v : v + 360 * Math.round((ref - v) / 360));

// armsOnBar (barbell.js) with the wrist flexion / extension window as an option (wflex: [min, max]); a front rack needs the
// wrist bent back further than barbell.js allows (rig limit -90)
const ARMJ = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
function armsOnBar2(p, g, { palm, thumb, guesses, elbow, elbowW = 0.5, dirW = 1.5, wristW = 0.04, ax = BB.AX, extra = [], wflex = [-70, 70], all = false } = {}) {
  const a = V.norm(ax);
  const objs = [
    (W) => V.sub(EQ.gripPoint(W, 'r', GRIP).p, g).map((v) => v * 6),
    (W) => [(1 - Math.abs(V.dot(EQ.gripPoint(W, 'r', GRIP).ax, a))) * 30],
    (W) => (palm ? V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), V.norm(palm)).map((v) => v * dirW) : []),
    (W) => (thumb ? V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), V.norm(thumb)).map((v) => v * dirW * 0.5) : []),
    (W) => (elbow ? V.sub(W.elbow_r.p, elbow).map((v) => v * elbowW) : []),
    (W, q) => { const sh = q.ch.shoulder_r, el = q.ch.elbow_r.flex, w = q.ch.wrist_r; return [w.flex * wristW, w.dev * wristW, Math.min(0, sh.elev - 4) * 3, Math.min(0, sh.plane + 58) * 3, Math.max(0, sh.plane - 138) * 3, Math.min(0, el - 2) * 3, Math.max(0, el - 148) * 3, Math.min(0, w.flex - wflex[0]) * 3, Math.max(0, w.flex - wflex[1]) * 3, Math.min(0, w.dev + 18) * 3, Math.max(0, w.dev - 33) * 3]; },
    ...extra,
  ];
  let best = null; const rs = [];
  for (const sg of guesses) {
    const q0 = clone(p);
    q0.ch.shoulder_r = { plane: sg[0], elev: sg[1], axial: sg[2] }; q0.ch.elbow_r = { flex: sg[3] }; q0.ch.wrist_r = { pron: sg[4], flex: sg[5] ?? 0, dev: sg[6] ?? 0 };
    const r = L.solvePose(q0, ARMJ, objs, { iters: 400 });
    rs.push(r);
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  if (all) return rs.map((r) => { B.mirrorArm(r.pose); r.pose.__cost = r.cost; return r.pose; });
  const q = best.pose;
  B.mirrorArm(q);
  q.__cost = best.cost;
  return q;
}

// Both arms on a bar centred at c along Z (grip width gw, handle centres). opt: { palm, thumb, elbow, elbowW, dirW, guesses,
// extra }. The previous key's solution (state.guess) is tried first so the arm stays on one branch.
function barArms(p, c, gw, opt = {}, state = {}) {
  const grips = EQ.barGrips(c, BB.AX, gw);
  const gs = [...(state.guess ? [state.guess] : []), ...(opt.guesses || [[60, 20, 30, 5, 150], [80, 40, 0, 5, 100], [0, 10, 0, 5, 90]])];
  if (state.nearest && state.guess) return nearestArms(p, c, gw, opt, state, grips);
  const solver = opt.wflex ? armsOnBar2 : BB.armsOnBar;
  const q = solver(p, grips.r, { palm: opt.palm, thumb: opt.thumb, elbow: opt.elbow, elbowW: opt.elbowW ?? 0.5, dirW: opt.dirW ?? 1.5, wristW: opt.wristW ?? 0.04, wflex: opt.wflex, guesses: state.keep && state.guess ? [state.guess] : gs, extra: opt.extra || [] });
  const g = state.guess;
  if (g) { q.ch.shoulder_r.plane = r1(near(q.ch.shoulder_r.plane, g[0])); q.ch.shoulder_r.axial = r1(near(q.ch.shoulder_r.axial, g[2])); q.ch.wrist_r.pron = r1(near(q.ch.wrist_r.pron, g[4])); }
  // the plane stays inside (-180, 180]; axial rotation and pronation keep the branch match (no wrap: a wrap would make the
  // player spin the arm a full turn between keys)
  if (Math.abs(q.ch.shoulder_r.plane) > 180) q.ch.shoulder_r.plane = r1(L.wrap(q.ch.shoulder_r.plane));
  B.mirrorArm(q);
  const e = BB.gripErr(L.fk(q), grips);
  state.err = Math.max(state.err || 0, e); state.last = e;
  state.guess = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];
  delete q.__cost;
  return q;
}

// Several starts around the previous key's arm (and the stock guesses); take the solution with the lowest cost plus a
// penalty on its distance from the previous arm in channel space (continuity without a branch flip)
function nearestArms(p, c, gw, opt, state, grips) {
  const g = state.guess, gs = [g];
  for (const [i, d] of [[4, 50], [4, -50], [2, 35], [2, -35], [3, 25], [3, -25], [0, 30], [0, -30]]) { const x = g.slice(); x[i] += d; gs.push(x); }
  for (const x of opt.guesses || []) gs.push(x);
  const cands = armsOnBar2(p, grips.r, { palm: opt.palm, thumb: opt.thumb, elbow: opt.elbow, elbowW: opt.elbowW ?? 0.5, dirW: opt.dirW ?? 1.5, wristW: opt.wristW ?? 0.04, wflex: opt.wflex || [-70, 70], guesses: gs, extra: opt.extra || [], all: true });
  const minCost = Math.min(...cands.map((q) => q.__cost));
  const W8 = [1, 1, 1, 1, 1, 0.5, 0.5], chans = (q) => [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];
  let best = null, bd = 1e18;
  for (const q of cands) {
    q.ch.shoulder_r.plane = near(q.ch.shoulder_r.plane, g[0]); q.ch.shoulder_r.axial = near(q.ch.shoulder_r.axial, g[2]); q.ch.wrist_r.pron = near(q.ch.wrist_r.pron, g[4]);
    const v = chans(q), dd = v.reduce((a, x, i) => a + W8[i] * (x - g[i]) ** 2, 0), sc = q.__cost + (opt.lambda ?? 5e-4) * dd;
    if (sc < bd) { bd = sc; best = q; }
  }
  const q = best;
  for (const k of ['plane', 'elev', 'axial']) q.ch.shoulder_r[k] = r1(q.ch.shoulder_r[k]);
  q.ch.elbow_r.flex = r1(q.ch.elbow_r.flex); for (const k of ['pron', 'flex', 'dev']) q.ch.wrist_r[k] = r1(q.ch.wrist_r[k]);
  if (Math.abs(q.ch.shoulder_r.plane) > 180) q.ch.shoulder_r.plane = r1(L.wrap(q.ch.shoulder_r.plane));
  B.mirrorArm(q);
  const e = BB.gripErr(L.fk(q), grips);
  state.err = Math.max(state.err || 0, e); state.last = e;
  state.guess = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];
  delete q.__cost;
  return q;
}

// Leg clearance of the bar shaft at (x, y) between zc - zr and zc + zr
function legClear(W, x, y, zc, zr) { let best = 1e9; for (let k = -10; k <= 10; k++) { const pt = [x, y, zc + (k / 10) * zr]; for (const s of BB.LEGS) best = Math.min(best, B.shapeDist(W, s, pt) - EQ.BAR.shaftR); } return best; }
// Straight arms hanging to a bar just in front of the legs (clear cm off them) at the height the straight arm reaches.
// opt: { gw, palm, thumb, clear, contacts, state, dy (raise the bar this far above the full reach) }
// bar centre for straight arms hanging to a bar just in front of the legs (clear cm off them), at the reach height
function hangPlace(p, contacts, { gw = 54, clear = 0.8, slack = 0.4 } = {}) {
  const W0 = L.fk(p, contacts), S = W0.shoulder_r.p, zc = W0.pelvis.p[2], Rg = BB.reachG(p) - slack, z = gw / 2;
  const place = (y) => { let a = BB.legX(W0, y), b = a + 50; for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if (legClear(W0, m, y, zc, z - 4) > clear) b = m; else a = m; } return b; };
  let ya = -10, yb = S[1];
  for (let i = 0; i < 36; i++) { const y = (ya + yb) / 2; if (V.len(V.sub([place(y), y, zc + z], S)) > Rg) ya = y; else yb = y; }
  return [place(yb), yb, zc];
}
function hangBar(p, contacts, { gw = 54, palm = [-1, 0, 0], thumb = [0, 0, -1], clear = 0.8, state = {}, slack = 0.4, guesses } = {}) {
  const c = hangPlace(p, contacts, { gw, clear, slack });
  const q = barArms(p, c, gw, { palm, thumb, dirW: 1.5, guesses: guesses || [[60, 20, 30, 5, 150], [80, 40, 0, 5, 100], [40, 10, 20, 5, 160], [0, 10, 0, 5, 90]], extra: [(W, qq) => [(qq.ch.elbow_r.flex - 4) * 0.3]] }, state);
  q.__bar = c;
  return q;
}

/* ---------------- one-hand barbell ---------------- */
// Bar held by its middle in the right hand: centre at the grip point, axis along the handle axis
function bar1At(W, side = 'r') { const g = EQ.gripPoint(W, side, GRIP); return { c: g.p, ax: g.ax }; }
function bar1MinY(W, opt = {}) {
  const g = EQ.barGeometry(bar1At(W), opt), dm = (d) => d.c[1] - d.r * Math.sqrt(Math.max(0, 1 - d.ax[1] * d.ax[1])) - (d.w / 2) * Math.abs(d.ax[1]);
  return Math.min(...g.discs.map(dm), ...g.caps.map(([a, b, r]) => Math.min(a[1], b[1]) - r));
}
const SHAPES = rig.shapes.map((s) => s.id);
function barGeomClear(W, g, skip) {
  let best = { d: 1e9 };
  for (const [a, b, r] of g.caps) { const c = EQ.segmentClear(W, a, b, r, { skip }); if (c.d < best.d) best = c; }
  for (const d of g.discs) {
    const u = V.norm(V.cross(d.ax, Math.abs(d.ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = V.cross(d.ax, u), pts = [];
    for (const face of [-1, 1]) { const c0 = V.add(d.c, V.scale(d.ax, (face * d.w) / 2)); pts.push(c0); for (const rr of [0.5, 1]) for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI; pts.push(V.add(c0, V.add(V.scale(u, Math.cos(a) * d.r * rr), V.scale(w, Math.sin(a) * d.r * rr)))); } }
    for (const id of SHAPES) { if (skip.test(id)) continue; for (const p of pts) { const dd = EQ.pointShape(W, p, id); if (dd < best.d) best = { d: dd, id, plate: true }; } }
  }
  return best;
}
function bar1BodyClear(W, opt = {}) { return barGeomClear(W, EQ.barGeometry(bar1At(W), opt), opt.skip || /^(hand|thumb|forearm)_r$/); }
// Whole-loop sweep for the one-hand bar (same report fields as BB.sweep, without the grip width)
function sweep1(ex, opt = {}, n = 600) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, planted = opt.planted || (ex.checks && ex.checks.plantedContacts) || [];
  const bar = ex.props.find((p) => p.kind === 'barbell'), bopt = { plates: bar.plates ?? 1, plateD: (bar.size && bar.size[1]) || 45, skip: opt.skip };
  const out = { barFloor: 1e9, barFloorAt: null, barBody: 1e9, barBodyAt: null, floor: 1e9, floorAt: null, slide: 0, drift: 0 };
  const W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
    const my = bar1MinY(W, bopt); if (my < out.barFloor) { out.barFloor = my; out.barFloorAt = +t.toFixed(2); }
    const c = bar1BodyClear(W, bopt); if (c.d < out.barBody) { out.barBody = c.d; out.barBodyAt = [c.id, c.plate ? 'plate' : 'bar', +t.toFixed(2)]; }
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
  for (const k of ['barFloor', 'barBody', 'floor', 'slide', 'drift']) out[k] = +out[k].toFixed(2);
  return out;
}
const barbell1Prop = ({ plates = 1, plateD = 45 } = {}) => ({ id: 'barbell', kind: 'barbell', size: [220, plateD, plateD], plates, attach: { joint: 'wrist_r', grip: GRIP } });

/* ---------------- timeline ---------------- */
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
// eased keys for poses `${name}${i}` sampled at FS[i] between t0 and t1 (reverse: from the last back to the first)
function eased(name, FS, t0, t1, reverse = false) {
  const out = [];
  if (!reverse) FS.forEach((f, i) => out.push({ t: +(t0 + (t1 - t0) * inv(f)).toFixed(3), pose: `${name}${i}` }));
  else for (let i = FS.length - 1; i >= 0; i--) out.push({ t: +(t0 + (t1 - t0) * inv(1 - FS[i])).toFixed(3), pose: `${name}${i}` });
  return out;
}
// keys spread evenly (linear in time) over a list of pose names from t0 to t1
function spread(names, t0, t1) { return names.map((n, i) => ({ t: +(t0 + ((t1 - t0) * i) / Math.max(1, names.length - 1)).toFixed(3), pose: n })); }

const kneeOf = B.kneeOf, trunkLean = B.trunkLean, elbowOf = B.elbowOf;
module.exports = { GRIP, near, barArms, legClear, hangPlace, hangBar, bar1At, bar1MinY, bar1BodyClear, barGeomClear, sweep1, barbell1Prop, ease, inv, eased, spread, kneeOf, trunkLean, elbowOf };

/* ---------------- rows ---------------- */
// Bar touching the body: from p0 (inside the trunk) step along dir until the bar shaft (z within +-half of p0) clears the
// body (hands, forearms and upper arms skipped) by `margin` cm. Returns the bar centre.
function touchAlong(W, p0, dir, half, { margin = 0.6, skip = /^(hand|thumb|forearm|upperarm|biceps|triceps|deltoid)_/ } = {}) {
  const d = V.norm(dir), at = (s) => V.add(p0, V.scale(d, s));
  const ok = (s) => { const c = at(s); return EQ.segmentClear(W, [c[0], c[1], c[2] - half], [c[0], c[1], c[2] + half], EQ.BAR.shaftR, { skip }).d >= margin; };
  let s = 0; while (s < 60 && !ok(s)) s += 0.5;   // first clear point outward (linear scan: other body parts lie beyond)
  let a = Math.max(0, s - 0.5), b = s;
  for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (ok(m)) b = m; else a = m; }
  return at(b);
}
// Elbow point for a rowing arm in the trunk frame: du cm along the trunk (toward the head > 0), dz out to the side and the
// rest of the upper-arm length behind the trunk (toward the back, < 0 along the chest normal) or in front (front = true)
function elbowAt(W, du, dz, front = false) {
  const u = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)), fwd = Q.rot(W.spine_t12.q, [1, 0, 0]), UAL = V.len(rig.byId.elbow_r.offset) - 0.1;
  const df = (front ? 1 : -1) * Math.sqrt(Math.max(0, UAL * UAL - du * du - dz * dz));
  return V.add(W.shoulder_r.p, V.add(V.add(V.scale(u, du), V.scale(fwd, df)), [0, 0, dz]));
}
const slerpV = (a, b, f) => { const d = Math.max(-1, Math.min(1, V.dot(V.norm(a), V.norm(b)))), th = Math.acos(d); if (th < 1e-4) return V.norm(a); const s = Math.sin(th); return V.norm(V.add(V.scale(V.norm(a), Math.sin((1 - f) * th) / s), V.scale(V.norm(b), Math.sin(f * th) / s))); };
Object.assign(module.exports, { touchAlong, elbowAt, slerpV });
// wrap body angles into (-180, 180] but leave the arms alone (their axial / pronation channels follow the branch match)
function wrapBody(p) { for (const j in p.ch) { if (/^(shoulder|elbow|wrist|sc)_/.test(j)) continue; for (const c in p.ch[j]) { const v = p.ch[j][c]; if (typeof v === 'number' && Math.abs(v) > 180) p.ch[j][c] = r1(L.wrap(v)); } } return p; }
Object.assign(module.exports, { wrapBody });
