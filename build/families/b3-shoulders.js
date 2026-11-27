// Shoulders family (batch 3): dumbbell presses and raises. Shared helpers for a seated base on the adjustable bench (back
// on the pad, feet planted), a standing base, a bent-over (hip hinge) base, a held-dumbbell arm solver (wrist + elbow +
// palm direction, one continuous ISB branch from key to key), dumbbell clearance against the body and the bench, and a
// whole-loop report (slides, floor, clearances, channel jumps between frames).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const DB = require('./dumbbell');

const shapeOf = (id) => rig.shapes.find((x) => x.id === id);
const near = (v, ref) => v + 360 * Math.round((ref - v) / 360);

/* ---------------- dumbbell clearance ---------------- */
// Signed distance (cm, approximate) from a point to a rig shape (< 0 inside)
function shapeDist(W, s, p) {
  const g = R.shapeWorld(W, s);
  if (g.kind === 'capsule') {
    const ab = V.sub(g.b, g.a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, g.a), ab) / V.dot(ab, ab)));
    return V.len(V.sub(p, V.add(g.a, V.scale(ab, t)))) - (g.r[0] + (g.r[1] - g.r[0]) * t);
  }
  const d = V.sub(p, g.c), loc = g.axes.map((a) => V.dot(d, a) / V.dot(a, a)); // coordinates in radii units
  const k = Math.hypot(...loc), len = V.len(d);
  if (k < 1e-9) return -Math.min(...g.axes.map(V.len));
  return (len / k) * (k - 1); // distance along the ray from the centre (exact for spheres)
}
const BODY = rig.shapes.map((s) => s).filter((s) => !/^(eye|brow)/.test(s.id));
// Surface points of a held dumbbell's two hex plates (cylinders s = 7..16 cm from the centre along the axis, radius 6)
const PLATE = { s0: 7, s1: 16, r: 6 };
function dbFrame(W, side) {
  const d = DB.dumbbellAt(W, side, 'handle'), ax = d.ax;
  const t = V.norm(V.cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), b = V.cross(ax, t);
  return { c: d.c, ax, t, b };
}
function dbPoints(W, side) {
  const f = dbFrame(W, side), out = [];
  for (const sg of [-1, 1]) for (const s of [PLATE.s0, (PLATE.s0 + PLATE.s1) / 2, PLATE.s1]) {
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 2 * Math.PI; out.push(V.add(f.c, V.add(V.scale(f.ax, sg * s), V.add(V.scale(f.t, Math.cos(a) * PLATE.r), V.scale(f.b, Math.sin(a) * PLATE.r))))); }
    if (s === PLATE.s1) { out.push(V.add(f.c, V.scale(f.ax, sg * s))); for (let k = 0; k < 4; k++) { const a = (k / 4) * 2 * Math.PI; out.push(V.add(f.c, V.add(V.scale(f.ax, sg * s), V.add(V.scale(f.t, Math.cos(a) * 3), V.scale(f.b, Math.sin(a) * 3))))); } }
  }
  return out;
}
// Signed distance from a point to a dumbbell's plates (cylinders)
function plateDist(f, p) {
  const d = V.sub(p, f.c), s = Math.abs(V.dot(d, f.ax)), rad = V.len(V.sub(d, V.scale(f.ax, V.dot(d, f.ax))));
  const dz = Math.max(PLATE.s0 - s, s - PLATE.s1), dr = rad - PLATE.r;
  return dz > 0 && dr > 0 ? Math.hypot(dz, dr) : Math.max(dz, dr);
}
// Minimum clearance of both dumbbells to the body (own hand/forearm/thumb excluded), each other, and the bench pad
function dbClearance(W, opt = {}) {
  let best = { d: 1e9 };
  for (const side of ['r', 'l']) {
    const pts = dbPoints(W, side);
    for (const s of BODY) {
      if (new RegExp(`^(hand|thumb|forearm)_${side}$`).test(s.id)) continue;
      for (const p of pts) { const d = shapeDist(W, s, p); if (d < best.d) best = { d, what: `db${side.toUpperCase()}-${s.id}` }; }
    }
    if (opt.pad) for (const p of pts) { const d = padDist(opt.pad, p); if (d < best.d && p[1] > opt.pad.top && Math.abs(p[2]) < (opt.pad.prop.size[2] / 2)) best = { d, what: `db${side.toUpperCase()}-pad` }; }
  }
  const fl = dbFrame(W, 'l');
  for (const p of dbPoints(W, 'r')) { const d = plateDist(fl, p); if (d < best.d) best = { d, what: 'dbR-dbL' }; }
  return best;
}
// Signed distance from a point to the bench pad top surface plane (pad = bench() result); > 0 on the athlete's side
function padDist(pad, p) {
  const a = Math.atan2(pad.padDir[1], -pad.padDir[0]); // pad angle from the floor (pad rises toward -X)
  return V.dot(V.sub(p, pad.hinge), [Math.sin(a), Math.cos(a), 0]);
}
// How far the back sits from the pad: min over back shapes of the signed distance to the pad plane (only above the seat)
const BACK = ['pelvis', 'buttock_r', 'buttock_l', 'abdomen', 'ribcage', 'chest', 'traps_r', 'traps_l'];
function backGap(W, pad, ids = BACK) {
  let m = 1e9, at = null;
  for (const id of ids) {
    const g = R.shapeWorld(W, shapeOf(id)), a = Math.atan2(pad.padDir[1], -pad.padDir[0]), n = [Math.sin(a), Math.cos(a), 0];
    // extreme point of the ellipsoid toward -n
    const ext = V.scale(g.axes.reduce((acc, ax) => V.add(acc, V.scale(ax, V.dot(ax, n))), [0, 0, 0]), 1 / Math.hypot(...g.axes.map((ax) => V.dot(ax, n))));
    const p = V.sub(g.c, ext);
    if (p[1] < pad.top + 2) continue; // below the seat line: that is the seat, not the pad
    const d = V.dot(V.sub(p, pad.hinge), n);
    if (d < m) { m = d; at = id; }
  }
  return { d: m, at };
}

/* ---------------- arm solver ---------------- */
const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron'];
const SOFT = { 'ch.shoulder_r.plane': [-60, 140], 'ch.shoulder_r.elev': [0, 200], 'ch.elbow_r.flex': [0, 150], 'ch.wrist_r.pron': [-15, 175] };
// spec: { wrist: world target, elbow: world target (optional), palm: world dir (optional), thumb: world dir (optional),
//         guess: { plane, elev, axial, flex, pron }, wristFlex, wristDev, wElbow }
function solveArm(pose, spec) {
  const g = spec.guess || { plane: 30, elev: 60, axial: 0, flex: 30, pron: 90 };
  const base = clone(pose);
  base.ch.wrist_r = { pron: g.pron, flex: spec.wristFlex || 0, dev: spec.wristDev || 0 };
  const objs = [L.obj.at('wrist_r', spec.wrist, 3)];
  if (spec.elbow) objs.push(L.obj.at('elbow_r', spec.elbow, spec.wElbow ?? 1));
  if (spec.palm) objs.push((W) => V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), V.norm(spec.palm)).map((v) => v * (spec.wPalm ?? 6)));
  if (spec.thumb) objs.push((W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), V.norm(spec.thumb)).map((v) => v * (spec.wThumb ?? 6)));
  objs.push((W, q) => ARM.map((p) => { const lim = SOFT[p], v = L.getPath(q, p); return lim ? (Math.max(0, lim[0] - v) + Math.max(0, v - lim[1])) * 3 : 0; }));
  objs.push(L.obj.reg('ch.shoulder_r.axial', g.axial, spec.wAxial ?? 0.01), L.obj.reg('ch.wrist_r.pron', g.pron, 0.01), L.obj.reg('ch.shoulder_r.plane', g.plane, 0.004));
  let best = null;
  const seeds = [g, { ...g, axial: g.axial - 40 }, { ...g, axial: g.axial + 40 }, { ...g, pron: g.pron + 40 }, { ...g, pron: g.pron - 40 }];
  for (const s of seeds) {
    const q0 = clone(base);
    q0.ch.shoulder_r = { plane: s.plane, elev: s.elev, axial: s.axial }; q0.ch.elbow_r = { flex: s.flex }; q0.ch.wrist_r.pron = s.pron;
    const r = L.solvePose(q0, ARM, objs, { iters: 400 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const p = best.pose, sh = p.ch.shoulder_r;
  sh.plane = r1(near(sh.plane, g.plane)); sh.axial = r1(near(sh.axial, g.axial)); p.ch.wrist_r.pron = r1(near(p.ch.wrist_r.pron, g.pron));
  const W = L.fk(p);
  p.__err = { wrist: +V.len(V.sub(W.wrist_r.p, spec.wrist)).toFixed(2), elbow: spec.elbow ? +V.len(V.sub(W.elbow_r.p, spec.elbow)).toFixed(2) : 0, cost: +best.cost.toFixed(3) };
  return p;
}
// Elbow position for a wrist target: on the circle of possible elbows, the point closest to a hint direction
function elbowFor(S, Wt, hint) {
  const d = V.sub(Wt, S), dl = V.len(d), u = V.scale(d, 1 / dl);
  const a = (dl * dl + L.UA * L.UA - L.FA * L.FA) / (2 * dl), rc = Math.sqrt(Math.max(0, L.UA * L.UA - a * a));
  const h = V.sub(hint, V.scale(u, V.dot(hint, u)));
  return V.add(V.add(S, V.scale(u, a)), V.scale(V.norm(h), rc));
}
const armGuess = (p) => ({ plane: p.ch.shoulder_r.plane, elev: p.ch.shoulder_r.elev, axial: p.ch.shoulder_r.axial, flex: p.ch.elbow_r.flex, pron: p.ch.wrist_r.pron });
// Copy the right arm (and shoulder girdle) to the left: bilateral, symmetric
const mirrorArm = (p) => { for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) if (p.ch[`${j}_r`]) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); delete p.__err; return p; };

// Arm keys from nominal channels: FK gives the wrist and elbow; the arm is then re-solved so the palm faces `palm` (world).
// keys: [{ name, plane, elev, axial, flex, pron, palm, sc: {protract, elevate}, wristFlex }] in order (guess chain).
function armKeys(basePose, keys, contacts) {
  const poses = {}, err = {};
  let g = null;
  for (const k of keys) {
    const p = clone(basePose);
    if (k.sc) p.ch.sc_r = clone(k.sc);
    const n = clone(p); n.ch.shoulder_r = { plane: k.plane, elev: k.elev, axial: k.axial }; n.ch.elbow_r = { flex: k.flex }; n.ch.wrist_r = { pron: k.pron, flex: k.wristFlex || 0, dev: 0 };
    const Wn = L.fk(n, contacts);
    const guess = g || { plane: k.plane, elev: k.elev, axial: k.axial, flex: k.flex, pron: k.pron };
    const q = solveArm(p, { wrist: Wn.wrist_r.p, elbow: Wn.elbow_r.p, palm: k.palm, wPalm: k.wPalm ?? 4, wristFlex: k.wristFlex || 0, guess });
    err[k.name] = q.__err; g = armGuess(q); poses[k.name] = mirrorArm(q);
  }
  return { poses, err };
}
const palmOf = (W) => Q.rot(W.wrist_r.q, [1, 0, 0]);

/* ---------------- bases ---------------- */
const kneeOf = H.kneeOf;
// Feet planted: leg contacts with constant targets, channels fitted to the IK solution
function plantLegs(p, contacts) {
  for (const s of ['r', 'l']) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target);
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in p.ch[j]) p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  return p;
}
const legContacts = (pole = 6, toe = 8) => ['r', 'l'].map((s) => H.legC(s, { pole: [Math.cos(pole * R.DEG), 0, (s === 'r' ? 1 : -1) * Math.sin(pole * R.DEG)].map((v) => +v.toFixed(4)), rot: L.footRot(s === 'r' ? -toe : toe) }));

// Standing tall, feet about hip width, knees soft. Returns { pose, contacts }.
function standing({ stance = 12, toe = 8, knee = 6, lean = 0 } = {}) {
  const contacts = legContacts(toe, toe), st = L.POSES.standing({ stance, toeOut: toe });
  const p = clone(st.pose);
  p.ch.sc_r = { protract: 2, elevate: 0 }; p.ch.sc_l = { protract: 2, elevate: 0 };
  p.root.rot = { pitch: -lean };
  // lower the pelvis until the knees bend `knee` degrees
  let a = p.root.pos[1] - 15, b = p.root.pos[1] + 1;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2, q = clone(p); q.root.pos[1] = y; if (kneeOf(L.fk(q, contacts), 'r') > knee) a = y; else b = y; }
  p.root.pos[1] = r1((a + b) / 2);
  return { pose: plantLegs(p, contacts), contacts };
}

// Bent over: hip hinge with a flat back, trunk `trunk` degrees above horizontal, knees `knee` bent, hips over the heels.
function hinge({ stance = 13, toe = 8, knee = 25, trunk = 15, footX = 0 } = {}) {
  const contacts = legContacts(toe + 6, toe), st = L.POSES.standing({ stance, toeOut: toe });
  const p0 = clone(st.pose);
  p0.ik.leg_r.target[0] = footX; p0.ik.leg_l.target[0] = footX;
  p0.ch.spine_l5 = { rot: 0, flex: 2, latFlex: 0 }; p0.ch.spine_t12 = { rot: 0, flex: 2, latFlex: 0 }; p0.ch.spine_t6 = { rot: 0, flex: 3, latFlex: 0 };
  // root pitch so the pelvis-to-C7 line sits `trunk` degrees above horizontal; root x so the centre of mass (approx: mid
  // pelvis-shoulder and the dumbbells) sits over the middle of the foot; root y for the knee bend
  const comX = (W) => (W.pelvis.p[0] * 0.5 + W.spine_t12.p[0] * 0.3 + W.shoulder_r.p[0] * 0.2);
  const trunkAng = (W) => Math.atan2(W.neck_c7.p[1] - W.pelvis.p[1], W.neck_c7.p[0] - W.pelvis.p[0]) / R.DEG;
  const bis = (lo, hi, f) => { for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (f(m)) lo = m; else hi = m; } return (lo + hi) / 2; };
  const p = clone(p0);
  p.root.pos = [footX - 15, 75, 0]; p.root.rot = { pitch: trunk - 90 };
  for (let it = 0; it < 6; it++) {
    p.root.rot.pitch = r1(bis(-100, 0, (m) => { const q = clone(p); q.root.rot.pitch = m; return trunkAng(L.fk(q)) < trunk; }));
    p.root.pos[1] = r1(bis(40, 95, (y) => { const q = clone(p); q.root.pos[1] = y; return kneeOf(L.fk(q, contacts), 'r') > knee; }));
    p.root.pos[0] = r1(bis(footX - 50, footX + 20, (x) => { const q = clone(p); q.root.pos[0] = x; return comX(L.fk(q, contacts)) < footX + 6; }));
  }
  p.ch.sc_r = { protract: 4, elevate: 0 }; p.ch.sc_l = { protract: 4, elevate: 0 };
  // eyes a little ahead of the hands on the floor: neck in line with the trunk, slight extension
  p.ch.neck_c7 = { rot: 0, flex: -8 }; p.ch.head_c1 = { rot: 0, flex: -6 };
  return { pose: plantLegs(p, contacts), contacts };
}

// Seated on the adjustable bench: back pad at `angle` (from the floor), pelvis back on the seat against the pad, thighs on
// the seat, feet flat on the floor a little wider than the hips. The bench is placed so the back rests on the pad
// (`gap` cm, measured on the rig shapes; the author refines it on the skinned mesh). Returns { pose, contacts, bench }.
function seated({ angle = 85, stance = 22, toe = 10, footAhead = 4, gap = 0, padOffset = 0, seatH = 45, pitchAdj = 0, seatDrop = 0 } = {}) {
  const contacts = legContacts(toe + 4, toe);
  const st = L.POSES.standing({ stance, toeOut: toe }), lean = 90 - angle;
  const p = clone(st.pose);
  p.root.rot = { pitch: r1(lean) };
  p.ch.spine_l5 = { rot: 0, flex: -2, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: 2, latFlex: 0 };
  p.ch.sc_r = { protract: 2, elevate: 0 }; p.ch.sc_l = { protract: 2, elevate: 0 };
  p.ch.hip_r = { flex: 90, abd: 8, rot: -6 }; p.ch.hip_l = clone(p.ch.hip_r);
  p.ch.knee_r = { flex: 85 }; p.ch.knee_l = { flex: 85 };
  p.root.pos = [0, 60, 0];
  const probe = DB.bench({ x: 0, angle, height: seatH });
  const bot = (W) => Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'thigh_r'));
  const bis = (lo, hi, fn) => { for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (fn(m)) lo = m; else hi = m; } return (lo + hi) / 2; };
  // root pitch so the upper back (chest, traps) and the buttocks touch the same pad line; pelvis height on the seat
  const diff = (q) => { const W = L.fk(q); return backGap(W, probe, ['chest', 'traps_r']).d - backGap(W, probe, ['buttock_r', 'pelvis']).d; };
  for (let it = 0; it < 4; it++) {
    p.root.rot.pitch = r1(bis(-20, 40, (m) => { const q = clone(p); q.root.rot.pitch = m; return diff(q) > 0; }));
    p.root.pos[1] = r1(p.root.pos[1] - (bot(L.fk(p)) - seatH));
  }
  // corrections measured on the skinned mesh (its buttocks and back differ from the rig shapes)
  if (pitchAdj) { p.root.rot.pitch = r1(p.root.rot.pitch + pitchAdj); p.root.pos[1] = r1(p.root.pos[1] - (bot(L.fk(p)) - seatH)); }
  p.root.pos[1] = r1(p.root.pos[1] - seatDrop);
  // eyes level: the neck brings the head forward by about the trunk lean
  const tl = p.root.rot.pitch + 0;
  p.ch.neck_c7 = { rot: 0, flex: r1(tl * 0.5) }; p.ch.head_c1 = { rot: 0, flex: r1(tl * 0.5) };
  // feet: under/just ahead of the knees, on the floor
  const W = L.fk(p);
  const fx = r1(W.knee_r.p[0] + footAhead);
  p.ik = { leg_r: { target: [fx, L.ANKLE_H, stance], weight: 1 }, leg_l: { target: [fx, L.ANKLE_H, -stance], weight: 1 } };
  const q = plantLegs(p, contacts);
  // bench: pad plane tangent to the back (gap), hinge at the back edge of the seat
  const a = angle * R.DEG, n = [Math.sin(a), Math.cos(a), 0];
  const Wq = L.fk(q, contacts);
  const g0 = backGap(Wq, probe); // distance with the hinge at x = -20
  const hingeX = -20 + (g0.d - gap) / n[0] + padOffset;
  const bench = DB.bench({ x: r1(hingeX + 20), angle, height: seatH });
  return { pose: q, contacts, bench, backGap: backGap(Wq, bench) };
}

/* ---------------- whole loop ---------------- */
const CH = (pz) => { const o = {}; for (const j of ['shoulder_r', 'elbow_r', 'wrist_r', 'sc_r']) for (const c in pz.ch[j] || {}) o[`${j}.${c}`] = pz.ch[j][c]; return o; };
function scan(ex, { planted = ['leg_r', 'leg_l'], pad = null, box = null } = {}) {
  let clr = { d: 1e9 }, dbFloor = 1e9, jump = { v: 0 }, back = { d: [1e9, -1e9] }, prevC = null, elev = [999, -999], elbow = [999, -999];
  const rep = H.loopReport(ex, {
    planted,
    probe: (W, pz, t) => {
      const c = dbClearance(W, { pad }); if (c.d < clr.d) clr = { ...c, t: +t.toFixed(2) };
      dbFloor = Math.min(dbFloor, DB.dumbbellMinY(W, 'r'), DB.dumbbellMinY(W, 'l'));
      if (box) { const b = Math.min(DB.dumbbellBoxClearance(W, 'r', box), DB.dumbbellBoxClearance(W, 'l', box)); if (b < clr.d) clr = { d: b, what: 'db-seat', t: +t.toFixed(2) }; }
      const cc = CH(pz);
      if (prevC) for (const k in cc) { const d = Math.abs(cc[k] - (prevC[k] ?? cc[k])); if (d > jump.v) jump = { v: +d.toFixed(2), k, t: +t.toFixed(2) }; }
      prevC = cc;
      if (pad) { const g = backGap(W, pad); back.d = [Math.min(back.d[0], g.d), Math.max(back.d[1], g.d)]; }
      elev = [Math.min(elev[0], pz.ch.shoulder_r.elev), Math.max(elev[1], pz.ch.shoulder_r.elev)];
      const ef = 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
      elbow = [Math.min(elbow[0], ef), Math.max(elbow[1], ef)];
    },
  });
  rep.clear = { d: +clr.d.toFixed(2), what: clr.what, t: clr.t }; rep.dbFloor = +dbFloor.toFixed(1); rep.jump = jump;
  rep.elev = elev.map(r1); rep.elbow = elbow.map(r1);
  if (pad) rep.backGap = back.d.map((v) => +v.toFixed(2));
  return rep;
}
// Fail the author if planted feet slide, a dumbbell hits something, or a channel jumps (a branch flip) between frames
function gate(name, rep, { minClear = -0.3, maxJump = 4 } = {}) {
  const bad = [];
  if (rep.slide > 0.05) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < -0.5) bad.push(`below the floor ${rep.floor}`);
  if (rep.dbFloor < 0) bad.push(`dumbbell below the floor ${rep.dbFloor}`);
  if (rep.clear.d < minClear) bad.push(`dumbbell clearance ${rep.clear.d} cm (${rep.clear.what} at ${rep.clear.t}s)`);
  if (rep.jump.v > maxJump) bad.push(`channel jump ${rep.jump.v} deg (${rep.jump.k} at ${rep.jump.t}s)`);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
}
const DUMBBELLS = [
  { id: 'dbR', kind: 'dumbbell', size: [32, 12, 12], attach: { joint: 'wrist_r', grip: 'handle' } },
  { id: 'dbL', kind: 'dumbbell', size: [32, 12, 12], attach: { joint: 'wrist_l', grip: 'handle' } },
];

module.exports = { armKeys, palmOf, elbowFor, shapeDist, dbPoints, dbClearance, padDist, backGap, solveArm, armGuess, mirrorArm, plantLegs, legContacts, standing, hinge, seated, scan, gate, DUMBBELLS, kneeOf };
