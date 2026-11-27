// Back family (batch 3, dumbbells): rows, shrugs and hip hinges with held dumbbells.
// Builds on the lunge family (planted feet: flat-foot leg contacts, leg channels fitted to the IK solution) and the
// dumbbell helpers. Adds:
//   - holdArm: solve one arm (shoulder, elbow, wrist channels) so the wrist reaches a target with the hand oriented for a
//     dumbbell (palm and handle-axis directions in world space) and, optionally, the elbow near a target point
//   - mirrorArm: copy the right arm channels to the left (the engine mirrors left joints, so the pose is symmetric)
//   - comX: a body + dumbbell centre of mass (shape volumes as a mass proxy) to keep a hinge balanced over the feet
//   - dbBody: clearance from a held dumbbell to the body shapes (rig), dbFloor: its lowest point
//   - sweep: whole-loop report (floor, dumbbells vs floor/body/props, planted-contact slide, still-joint drift)
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const DBH = require('./dumbbell');

const qArr = (q) => q.map((v) => +v.toFixed(6));
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]); // from vertical
const elbowOf = (W, s) => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));
const ARM = (s) => [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`];

// One right arm: wrist at `target`; hand palm normal along `palm` and thumb (handle) axis along `axis` (world unit vectors);
// opt.elbow: elbow target point (weight opt.elbowW), opt.guesses: starting [plane, elev, axial, elbow, pron] sets.
function holdArm(pose, target, opt = {}) {
  const s = 'r', paths = ARM(s);
  const tw = opt.tw || [3, 3, 3];
  const objs = [(W) => V.sub(W[`wrist_${s}`].p, target).map((v, i) => v * tw[i])];
  if (opt.palm) objs.push((W) => V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), V.norm(opt.palm)).map((v) => v * (opt.dirW ?? 4)));
  if (opt.axis) objs.push((W) => V.sub(Q.rot(W[`wrist_${s}`].q, [0, 0, 1]), V.norm(opt.axis)).map((v) => v * (opt.dirW ?? 4))); // thumb side of the handle
  if (opt.elbow) objs.push(L.obj.at(`elbow_${s}`, opt.elbow, opt.elbowW ?? 0.8));
  objs.push(L.obj.reg(`ch.wrist_${s}.flex`, opt.wflex ?? 0, opt.wristW ?? 0.06), L.obj.reg(`ch.wrist_${s}.dev`, opt.wdev ?? 0, opt.wristW ?? 0.06), L.obj.reg(`ch.shoulder_${s}.axial`, opt.axial ?? 0, opt.axialW ?? 0.01));
  // stay inside the rig limits (and off the elev = 0 singularity)
  objs.push((W, q) => { const sh = q.ch[`shoulder_${s}`], el = q.ch[`elbow_${s}`].flex, w = q.ch[`wrist_${s}`]; return [Math.min(0, sh.elev - (opt.minElev ?? 4)) * 2, Math.min(0, sh.plane + 60) * 2, Math.max(0, sh.plane - 140) * 2, Math.min(0, el - 2) * 2, Math.max(0, el - 150) * 2, Math.min(0, w.flex + 90), Math.max(0, w.flex - 80), Math.min(0, w.dev + 20), Math.max(0, w.dev - 35)]; });
  if (opt.extra) objs.push(...opt.extra);
  let best = null;
  const sh = pose.ch[`shoulder_${s}`] || { plane: 0, elev: 10, axial: 0 };
  const guesses = opt.guesses || [[sh.plane, sh.elev, sh.axial || 0, (pose.ch[`elbow_${s}`] || {}).flex || 10, (pose.ch[`wrist_${s}`] || {}).pron || 90], [0, 10, 0, 10, 90], [60, 40, 0, 30, 90], [-40, 30, 20, 60, 90], [90, 60, -20, 20, 60]];
  for (const g of guesses) {
    const q0 = clone(pose);
    q0.ch[`shoulder_${s}`] = { plane: g[0], elev: g[1], axial: g[2] }; q0.ch[`elbow_${s}`] = { flex: g[3] }; q0.ch[`wrist_${s}`] = { pron: g[4], flex: 0, dev: 0 };
    const r = L.solvePose(q0, paths, objs, { iters: opt.iters || 300 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const out = best.pose;
  out.ch.wrist_r.pron = r1(L.wrap(out.ch.wrist_r.pron));
  out.__cost = best.cost;
  return out;
}
function mirrorArm(p) { ['sc', 'shoulder', 'elbow', 'wrist'].forEach((j) => { if (p.ch[`${j}_r`]) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); }); delete p.__cost; return p; }

// Centre of mass from rig shape volumes (ellipsoids and capsules as uniform solids) plus held dumbbells (kg each vs a
// body of `bodyKg`).
function comX(W, dumbbells = [], bodyKg = 80) {
  let m = 0, c = [0, 0, 0];
  const parts = [];
  for (const s of rig.shapes) {
    const g = R.shapeWorld(W, s);
    if (g.kind === 'capsule') { const l = V.len(V.sub(g.b, g.a)), rr = (g.r[0] + g.r[1]) / 2; parts.push([V.lerp(g.a, g.b, 0.5), Math.PI * rr * rr * l]); }
    else parts.push([g.c, (4 / 3) * Math.PI * V.len(g.axes[0]) * V.len(g.axes[1]) * V.len(g.axes[2])]);
  }
  const vol = parts.reduce((a, p) => a + p[1], 0);
  for (const [p, v] of parts) { const w = (v / vol) * bodyKg; c = V.add(c, V.scale(p, w)); m += w; }
  for (const d of dumbbells) { c = V.add(c, V.scale(d.c, d.kg)); m += d.kg; }
  return V.scale(c, 1 / m);
}

// Signed distance (cm) from a point to a rig shape (capsule exact, ellipsoid approximate)
function shapeDist(W, s, p) {
  const g = R.shapeWorld(W, s);
  if (g.kind === 'capsule') {
    const ab = V.sub(g.b, g.a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, g.a), ab) / (V.dot(ab, ab) || 1)));
    return V.len(V.sub(p, V.add(g.a, V.scale(ab, t)))) - (g.r[0] + (g.r[1] - g.r[0]) * t);
  }
  const d = V.sub(p, g.c), ls = g.axes.map((a) => V.len(a)), u = g.axes.map((a, i) => V.dot(d, a) / (ls[i] * ls[i]));
  const k = Math.hypot(u[0], u[1], u[2]);
  return (k - 1) * Math.min(...ls) * (k < 1 ? 1 : 1);
}
// Clearance from a held dumbbell (plates as discs along the axis, handle thin) to the body shapes, excluding the holding
// hand and forearm. Returns { d, shape }.
function dbBody(W, side, grip = 'handle', size, skip = []) {
  const d = DBH.dumbbellAt(W, side, grip, size), half = ((size && size.length) || DBH.DB.length) / 2;
  const own = new Set([`hand_${side}`, `thumb_${side}`, `forearm_${side}`, ...skip]);
  let best = { d: 1e9, shape: null };
  for (let k = -8; k <= 8; k++) {
    const x = (k / 8) * half, p = V.add(d.c, V.scale(d.ax, x)), rr = Math.abs(x) > 7 ? d.r : 1.6;
    for (const s of rig.shapes) { if (own.has(s.id)) continue; const dd = shapeDist(W, s, p) - rr; if (dd < best.d) best = { d: dd, shape: s.id }; }
  }
  best.d = +best.d.toFixed(2);
  return best;
}
const dbFloor = (W, side, grip, size) => DBH.dumbbellMinY(W, side, grip, size);

// Signed distance from a point to an oriented box (centre c, unit axes ax[3], half sizes h[3])
function boxDist(p, box) {
  const d = V.sub(p, box.c), q = box.ax.map((a, i) => Math.abs(V.dot(d, a)) - box.h[i]);
  const outside = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
  return outside + Math.min(Math.max(q[0], q[1], q[2]), 0);
}
// Bench parts as oriented boxes (seat pad, back pad) from a bench() result; pad thickness 6 cm (matches the player)
function benchBoxes(b) {
  const pr = b.prop, [cx, , cz] = pr.center, [sx, sy, sz] = pr.size, pad = 6, side = pr.backSide ?? -1, a = (pr.backAngle || 0) * R.DEG;
  const seat = { id: 'seat', c: [cx, sy - pad / 2, cz], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [sx / 2, pad / 2, sz / 2] };
  const dir = [side * Math.cos(a), Math.sin(a), 0], up = [-side * Math.sin(a), Math.cos(a), 0], bl = pr.backLength ?? 80;
  const hinge = [cx + side * sx / 2, sy, cz];
  const back = { id: 'back', c: V.add(V.add(hinge, V.scale(dir, bl / 2)), V.scale(up, -pad / 2)), ax: [dir, up, [0, 0, 1]], h: [bl / 2, pad / 2, sz / 2] };
  const legs = { id: 'base', c: [cx, (sy - pad) / 2, cz], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [sx * 0.38, (sy - pad) / 2, sz * 0.4] };
  return [seat, back, legs];
}
// Clearance of the body shapes from boxes (sampled: capsule axes and ellipsoid centres + axis tips); skip shape ids
function bodyBoxClear(W, boxes, skip = []) {
  let best = { d: 1e9 };
  for (const s of rig.shapes) {
    if (skip.includes(s.id)) continue;
    const g = R.shapeWorld(W, s);
    const pts = [];
    if (g.kind === 'capsule') for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([V.lerp(g.a, g.b, t), g.r[0] + (g.r[1] - g.r[0]) * t]); }
    else { const rmin = Math.min(...g.axes.map(V.len)); pts.push([g.c, rmin]); }
    for (const b of boxes) for (const [p, rr] of pts) { const d = boxDist(p, b) - rr; if (d < best.d) best = { d: +d.toFixed(2), shape: s.id, box: b.id }; }
  }
  return best;
}
// Dumbbell vs boxes
function dbBoxClear(W, side, boxes, grip, size) {
  const d = DBH.dumbbellAt(W, side, grip, size), half = ((size && size.length) || DBH.DB.length) / 2;
  let best = 1e9;
  for (let k = -8; k <= 8; k++) { const x = (k / 8) * half, p = V.add(d.c, V.scale(d.ax, x)), rr = Math.abs(x) > 7 ? d.r : 1.6; for (const b of boxes) best = Math.min(best, boxDist(p, b) - rr); }
  return +best.toFixed(2);
}

// Whole-loop sweep. opt: { held: [{side, grip, size}], boxes, fixed: [joint], skipBody: [], bodySkip: [] }
function sweep(ex, opt = {}, n = 1200) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, planted = (ex.checks && ex.checks.plantedContacts) || [];
  const out = { floor: 1e9, floorAt: null, slide: 0, slideAt: null, drift: 0, dbFloor: 1e9, dbBody: 1e9, dbBodyAt: null, dbBox: 1e9, bodyBox: 1e9, bodyBoxAt: null, kneeR: [999, -999], kneeL: [999, -999], elbowR: [999, -999] };
  const W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    for (const id of planted) {
      const k = pz.ik && pz.ik[id]; if (!k || (k.weight ?? 1) < 0.999) continue;
      const c = ex.contacts.find((x) => x.id === id);
      let sl = V.len(V.sub(W[c.chain[2]].p, k.target));
      if (prev && prev[id] && (prev[id].weight ?? 1) >= 0.999) sl = Math.max(sl, V.len(V.sub(k.target, prev[id].target)));
      if (sl > out.slide) { out.slide = sl; out.slideAt = [id, +t.toFixed(2)]; }
    }
    for (const j of opt.fixed || []) out.drift = Math.max(out.drift, V.len(V.sub(W[j].p, W0[j].p)));
    for (const h of opt.held || []) {
      out.dbFloor = Math.min(out.dbFloor, dbFloor(W, h.side, h.grip, h.size));
      const b = dbBody(W, h.side, h.grip, h.size, opt.skipBody || []); if (b.d < out.dbBody) { out.dbBody = b.d; out.dbBodyAt = [b.shape, +t.toFixed(2)]; }
      if (opt.boxes) out.dbBox = Math.min(out.dbBox, dbBoxClear(W, h.side, opt.boxes, h.grip, h.size));
    }
    if (opt.boxes) { const b = bodyBoxClear(W, opt.boxes, opt.bodySkip || []); if (b.d < out.bodyBox) { out.bodyBox = b.d; out.bodyBoxAt = [b.shape, b.box, +t.toFixed(2)]; } }
    const kr = kneeOf(W, 'r'), kl = kneeOf(W, 'l'), er = elbowOf(W, 'r');
    out.kneeR = [Math.min(out.kneeR[0], kr), Math.max(out.kneeR[1], kr)]; out.kneeL = [Math.min(out.kneeL[0], kl), Math.max(out.kneeL[1], kl)]; out.elbowR = [Math.min(out.elbowR[0], er), Math.max(out.elbowR[1], er)];
    prev = pz.ik ? clone(pz.ik) : null;
  }
  for (const k of ['floor', 'slide', 'drift', 'dbFloor', 'dbBody', 'dbBox', 'bodyBox']) out[k] = +(+out[k]).toFixed(3);
  for (const k of ['kneeR', 'kneeL', 'elbowR']) out[k] = out[k].map(Math.round);
  if (!opt.boxes) { delete out.dbBox; delete out.bodyBox; delete out.bodyBoxAt; }
  return out;
}
const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
const heldProp = (side, grip = 'handle', size = [32, 12, 12]) => ({ id: side === 'r' ? 'dbR' : 'dbL', kind: 'dumbbell', size, attach: { joint: `wrist_${side}`, grip } });
module.exports = { qArr, kneeOf, trunkLean, elbowOf, holdArm, mirrorArm, comX, shapeDist, dbBody, dbFloor, boxDist, benchBoxes, bodyBoxClear, dbBoxClear, sweep, NOTE, heldProp };

/* ---------------- Standing hinge helpers (RDL, deadlift, bent-over row) ---------------- */
// Leg surfaces in front of / beside a dumbbell: clearance (cm) from a dumbbell with its handle centre at c and axis ax
// to the leg shapes (thighs, quads, shanks, calves, feet).
const LEG_SHAPES = rig.shapes.filter((s) => /^(thigh|quad|shank|calf|foot)_/.test(s.id));
function dbLegClear(W, c, ax, size = DBH.DB) {
  const half = (size.length || DBH.DB.length) / 2, r = (size.diameter || DBH.DB.diameter) / 2;
  let best = 1e9;
  for (let k = -8; k <= 8; k++) { const x = (k / 8) * half, p = V.add(c, V.scale(ax, x)), rr = Math.abs(x) > 7 ? r : 1.6; for (const s of LEG_SHAPES) best = Math.min(best, shapeDist(W, s, p) - rr); }
  return best;
}
// Hand frame for a held dumbbell: wrist = handle centre minus the grip offset in a hand whose palm normal is `palm` and
// thumb axis is `thumb` (fingers = palm x thumb ... completes the right-handed frame [palm, -fingers, thumb]).
function wristFromHandle(c, palm, thumb, grip = 'handle') {
  const n = V.norm(palm), t = V.norm(thumb), up = V.cross(t, n); // local +Y (toward the forearm)
  const g = DBH.GRIP[grip];
  return V.sub(c, V.add(V.add(V.scale(n, g.off[0]), V.scale(up, g.off[1])), V.scale(t, g.off[2])));
}
// Balance: shift the root along X until the centre of mass (with dumbbells) sits over `targetX`. build(x) -> { pose, W, dbs }
function balanceX(build, x0, targetX, iters = 6) {
  let x = x0, r;
  for (let i = 0; i < iters; i++) { r = build(x); const c = comX(r.W, r.dbs); const e = c[0] - targetX; if (Math.abs(e) < 0.05) break; x -= e * 1.15; }
  return r;
}
Object.assign(module.exports, { LEG_SHAPES, dbLegClear, wristFromHandle, balanceX });
// Standing hinge pose on planted feet (lunge family F): pelvis pitch, knee angle (root height by bisection), neutral spine,
// head in line with the trunk (eyes a little ahead on the floor), arms from cfg.arms(p) (must set both arms), root X
// balanced so the centre of mass (body + dumbbells) sits over the mid-foot.
// cfg: { pitch, knee, spine:{l5,t12,t6}, sc:{protract,elevate}, feet, arms(p), size, kg, grip, midfoot, x0, neck(lean) }
function hinge(F, cfg) {
  const size = cfg.size || DBH.DB;
  const build = (x) => {
    let spec = { root: [x, 85, 0], pitch: cfg.pitch, spine: cfg.spine || { l5: 0, t12: 1, t6: 2 }, feet: cfg.feet };
    spec = F.rootY(spec, cfg.knee);
    let p = F.pose(spec);
    const sp = spec.spine, lean = -cfg.pitch + sp.l5 + sp.t12 + sp.t6;
    const nk = cfg.neck ? cfg.neck(lean) : -Math.min(lean, 80) * 0.14;   // neutral neck: eyes 1-2 m ahead on the floor
    p.ch.neck_c7 = { rot: 0, flex: r1(nk * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(nk * 0.55) };
    if (cfg.sc) { p.ch.sc_r = clone(cfg.sc); p.ch.sc_l = clone(cfg.sc); }
    p = cfg.arms(p);
    wrapPose(p);
    const W = L.fk(p, F.contacts);
    const dbs = ['r', 'l'].map((s) => ({ c: DBH.dumbbellAt(W, s, cfg.grip || 'handle', size).c, kg: cfg.kg ?? 12 }));
    return { pose: p, W, dbs, spec };
  };
  return balanceX(build, cfg.x0 ?? 0, cfg.midfoot ?? 5);
}
// Straight hanging arms that put each dumbbell handle against the front (or side) of the legs, at the height a straight
// arm reaches. side: 'front' (pronated, handle across the thighs) or 'side' (neutral, handle fore-aft beside the legs).
function hangToLegs(p, F, { mode = 'front', size = DBH.DB, clear = 1.0, elbow = 5, hz = null, guesses } = {}) {
  const W0 = L.fk(p, F.contacts), S = W0.shoulder_r.p;
  const palm = mode === 'front' ? [-1, 0, 0] : [0, 0, -1], thumb = mode === 'front' ? [0, 0, -1] : [1, 0, 0], ax = mode === 'front' ? [0, 0, 1] : [1, 0, 0];
  const z = hz ?? (mode === 'front' ? S[2] + 1 : null);
  // 'front': slide the handle along +X until it clears the legs; 'side': along +Z
  const place = (y, xs) => {
    let a = mode === 'front' ? -40 : 0, b = 60;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2, c = mode === 'front' ? [m, y, z] : [xs, y, m]; if (dbLegClear(W0, c, ax, size) > clear) b = m; else a = m; }
    return mode === 'front' ? [b, y, z] : [xs, y, Math.max(b, z ?? 0)];
  };
  const R = L.reach(elbow), xs = S[0];
  let ya = -10, yb = S[1];
  for (let i = 0; i < 40; i++) { const y = (ya + yb) / 2, w = wristFromHandle(place(y, xs), palm, thumb); if (V.len(V.sub(w, S)) > R) ya = y; else yb = y; }
  const c = place(yb, xs), w = wristFromHandle(c, palm, thumb);
  const q = holdArm(p, w, { palm, axis: thumb, axialW: 0.02, guesses: guesses || (mode === 'front' ? [[60, 20, 30, 5, 150], [80, 40, 0, 5, 100], [40, 10, 20, 5, 160]] : [[10, 15, 0, 5, 90], [60, 30, 0, 5, 90], [80, 60, 0, 5, 90]]) });
  q.__handle = c;
  return q;
}
// Channel angles back into [-180, 180] (fitted leg channels can land a full turn away); shoulder elevation is left alone
function wrapPose(p) { for (const j in p.ch) for (const c in p.ch[j]) { if (j.startsWith('shoulder') && c === 'elev') continue; const v = p.ch[j][c]; if (typeof v === 'number' && Math.abs(v) > 180) p.ch[j][c] = r1(L.wrap(v)); } return p; }
Object.assign(module.exports, { hinge, hangToLegs, wrapPose });

/* ---------------- Rowing arm ---------------- */
// Right arm rowing a dumbbell (neutral grip) in the trunk frame: f = 0 hanging straight down from the shoulder, f = 1 the
// top of the row (elbow up and back beside the trunk). The elbow travels on its sphere about the shoulder and the forearm
// turns from hanging to the top direction, so every key keeps the upper arm and forearm lengths (smooth, no stretch).
// top: { du, dz, wx, wz, tilt }: elbow du cm along the trunk (toward the hips < 0), dz out to the side, behind the trunk on
// the upper-arm sphere; the wrist sits (wx forward, wz out) from the elbow at forearm length; tilt raises the handle's front
// end (deg). sc: [sc at f = 0, sc at f = 1]. Returns the pose (right arm only) and keeps a branch guess in state.guess.
function rowArm(p, f, cfg, state = {}) {
  const q0 = clone(p), sc = cfg.sc;
  q0.ch.sc_r = { protract: r1(sc[0].protract + (sc[1].protract - sc[0].protract) * f), elevate: r1(sc[0].elevate + (sc[1].elevate - sc[0].elevate) * f) };
  const W = L.fk(q0), S = W.shoulder_r.p, u = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)), fwd = Q.rot(W.spine_t12.q, [1, 0, 0]);
  const UAL = V.len(rig.byId.elbow_r.offset), FAL = V.len(rig.byId.wrist_r.offset), down = [0, -1, 0];
  const t = cfg.top, df = -Math.sqrt(Math.max(0, (UAL - 0.1) ** 2 - t.du * t.du - t.dz * t.dz));
  const hang = cfg.hang || [2, 2];   // the hanging hand sits a little forward and out of the shoulder
  const e0 = V.norm([hang[0] * 0.45, -UAL, hang[1] * 0.45]), e1 = V.norm(V.add(V.add(V.scale(u, t.du), V.scale(fwd, df)), [0, 0, t.dz]));
  const d0 = V.norm([hang[0] * 0.55 + (cfg.bend ?? 3.5), -FAL, hang[1] * 0.55]);
  let d1 = V.norm([t.wx, -Math.sqrt(Math.max(0, FAL * FAL - t.wx * t.wx - t.wz * t.wz)), t.wz]);
  if (t.flex) { // forearm at a set elbow angle, turned from the upper arm toward the floor (plus a little out to the side)
    const a = V.scale(e1, -1), dn = V.norm(V.add(down, [0, 0, (t.wz || 0) / FAL])), b = V.norm(V.sub(dn, V.scale(a, V.dot(dn, a)))), th = (180 - t.flex) * R.DEG;
    d1 = V.norm(V.add(V.scale(a, Math.cos(th)), V.scale(b, Math.sin(th))));
  }
  const g = f; // arc parameter
  const E = V.add(S, V.scale(V.norm(V.add(V.scale(e0, 1 - g), V.scale(e1, g))), UAL - 0.1));
  const Wt = V.add(E, V.scale(V.norm(V.add(V.scale(d0, 1 - g), V.scale(d1, g))), FAL - 0.4));
  const tl = (t.tilt || 0) * f * R.DEG, thumb = cfg.thumb ? cfg.thumb(f) : [Math.cos(tl), Math.sin(tl), 0];
  const guesses = state.guess ? [state.guess] : [[70, 45, 0, 8, 90], [40, 30, 0, 8, 90], [-30, 30, 40, 60, 90], [0, 20, 0, 30, 90]];
  const q = holdArm(q0, Wt, { palm: cfg.palm || [0, 0, -1], axis: thumb, elbow: E, elbowW: cfg.elbowW ?? 1.5, axialW: 0.02, guesses });
  state.guess = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron];
  state.cost = q.__cost; delete q.__cost;
  return q;
}
Object.assign(module.exports, { rowArm });
