// Chest family (batch 3): dumbbell presses, flyes and the pullover lying on an adjustable bench, feet planted on the floor.
// Shared helpers:
//  - layOnBench: supine athlete whose back rests on the bench pad (flat or inclined) and whose pelvis rests on the seat.
//    Shapes are measured against the pad / seat planes; PAD_SINK lets the skinned mesh (a little different from the rig
//    shapes) meet the pad (measured with b2/chest_mesh.mjs).
//  - plantFeet: both feet flat on the floor (leg contacts, constant targets) with fitted leg channels.
//  - dbAt: dumbbell centre / axis / plates on the RepRig skeleton for a grip (same grip frame as dumbbell.js, with an
//    optional custom offset in the player's [toward fingers, out of palm, thumb axis] convention).
//  - solveArmDB: right-arm channels (shoulder, elbow, wrist) that put the dumbbell at a target with its handle along an axis;
//    mirrorArm copies the right arm to the left (bilateral, symmetric poses).
//  - clearance: dumbbells vs body shapes, bench and floor; bench vs body shapes; used by the authors' self-checks.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const D = require('./dumbbell');

const shapeOf = (id) => rig.shapes.find((x) => x.id === id);
// Signed distance from a shape to a plane n.p = d (cm, > 0 = clear on the +n side)
function planeClear(W, id, n, d) {
  const g = R.shapeWorld(W, shapeOf(id));
  if (g.kind === 'capsule') return Math.min(V.dot(g.a, n) - g.r[0], V.dot(g.b, n) - g.r[1]) - d;
  return V.dot(g.c, n) - Math.hypot(V.dot(g.axes[0], n), V.dot(g.axes[1], n), V.dot(g.axes[2], n)) - d;
}
// Point of a shape lowest along -n (ellipsoid support point / capsule end)
function planePoint(W, id, n) {
  const g = R.shapeWorld(W, shapeOf(id));
  if (g.kind === 'capsule') { const da = V.dot(g.a, n) - g.r[0], db = V.dot(g.b, n) - g.r[1]; return da < db ? V.sub(g.a, V.scale(n, g.r[0])) : V.sub(g.b, V.scale(n, g.r[1])); }
  const k = Math.hypot(V.dot(g.axes[0], n), V.dot(g.axes[1], n), V.dot(g.axes[2], n));
  return g.axes.reduce((c, a) => V.sub(c, V.scale(a, V.dot(a, n) / k)), g.c);
}

// Bench geometry: hinge (seat end where the pad starts) at x = 0, seat on [0, 40], pad toward -X rising at `angle`.
function makeBench(angle = 0, opt = {}) {
  const B = D.bench({ x: 20, seat: 40, height: 45, width: 30, angle, back: 80, ...opt });
  const a = angle * R.DEG;
  const padN = [Math.sin(a), Math.cos(a), 0], padD = V.dot(padN, B.hinge);
  return { ...B, angle, padN, padD, seatN: [0, 1, 0], seatD: B.top };
}
// Position along the pad (cm from the hinge) of a world point
const alongPad = (B, p) => V.dot(V.sub(p, B.hinge), B.padDir);

// Rig v2: the collision shapes are fitted to the drawn body, so the pad / seat contacts are solved on the rig shapes directly
// (no skinned-mesh sinks). PAD_SINK / SEAT_SINK stay as overrides (0 = shapes resting on the surfaces).
let PAD_SINK = +(process.env.PAD_SINK ?? 0);
let SEAT_SINK = +(process.env.SEAT_SINK ?? 0);
// Lying, the head sits forward of the upper back, so with a neutral neck the back of the head rests just off the pad (as on a
// real person). HEAD_LIFT: the least gap (cm) kept between the rig head / hair shapes and the pad; the head is only drawn
// gently toward the pad within the neck's comfortable range.
const HEAD_LIFT = +(process.env.HEAD_LIFT ?? 0.3);
// The rig neck capsule (r 6.4 at C7) reaches about 8 cm behind the drawn back of the neck at its base (where the traps and
// upper back meet the pad), so its pad allowance is generous; the traps / chest shapes carry the real upper-back contact.
const NECK_MIN = -8;
const setSink = (v) => { PAD_SINK = v; };

/**
 * layOnBench(B, { hipX, l5, t12, t6, headLift })
 * Supine on the bench, head toward -X: pelvis on the seat (or the flat pad), chest and ribcage on the pad, the back of
 * the head resting on the pad. Solves root x / y / pitch and the spine so the shapes touch the planes; hipX places the
 * hip joint along X (flat bench) or is ignored on an incline (the buttocks sit back in the seat-pad crease).
 */
function layOnBench(B, opt = {}) {
  const sup = L.POSES.supine({ kneeFlex: 90 });
  const p0 = clone(sup.pose);
  p0.root.pos = [opt.hipX ?? 10, B.top + 14, 0]; p0.root.rot = { pitch: 96 - B.angle };
  p0.ch.spine_l5 = { rot: 0, flex: -4, latFlex: 0 }; p0.ch.spine_t12 = { rot: 0, flex: 6, latFlex: 0 }; p0.ch.spine_t6 = { rot: 0, flex: 6, latFlex: 0 };
  const sink = () => PAD_SINK;
  const pad = (W, id) => planeClear(W, id, B.padN, B.padD) + sink();
  const seat = (W, id) => planeClear(W, id, B.seatN, B.seatD) + SEAT_SINK;
  const objs = [
    (W) => [pad(W, 'chest') * 4, Math.min(0, pad(W, 'ribcage')) * 4, Math.max(0, pad(W, 'ribcage') - 1.0) * 2, Math.min(0, pad(W, 'neck') - (opt.neckMin ?? NECK_MIN)) * 4, Math.min(0, pad(W, 'abdomen') - 1.0) * 4, Math.min(0, pad(W, 'traps_r')) * 4],
    (W) => { const h = Math.min(pad(W, 'hair'), pad(W, 'head')) - (opt.headLift ?? HEAD_LIFT); return [Math.min(0, h) * 4, Math.max(0, h) * (opt.headPull ?? 1)]; },
    (W) => [Math.min(seat(W, 'buttock_r'), seat(W, 'buttock_l')) * 4, Math.min(0, pad(W, 'buttock_r') + SEAT_SINK - PAD_SINK) * 4, Math.min(0, seat(W, 'pelvis')) * 4],
    L.obj.reg('ch.spine_l5.flex', opt.l5 ?? -6, 0.15), L.obj.reg('ch.spine_t12.flex', opt.t12 ?? 2, 0.25), L.obj.reg('ch.spine_t6.flex', opt.t6 ?? 4, 0.4),
    L.obj.reg('ch.neck_c7.flex', 4, 0.2), L.obj.reg('ch.head_c1.flex', 2, 0.2),
    (W, q) => [Math.min(0, q.ch.head_c1.flex + 20) * 3, Math.min(0, q.ch.neck_c7.flex + 20) * 3], // keep the neck well inside its extension limits
  ];
  if (opt.pitch != null) objs.push(L.obj.reg('root.rot.pitch', opt.pitch, opt.pitchW ?? 0.4));
  const paths = ['root.pos.0', 'root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex', 'ch.neck_c7.flex', 'ch.head_c1.flex'];
  if (B.angle === 0) objs.push((W) => [(W.hip_r.p[0] - (opt.hipX ?? 10)) * 2]);
  else objs.push((W) => { const bp = planePoint(W, 'buttock_r', B.seatN); return [Math.max(0, bp[0] - (opt.buttX ?? 12)) * 2, Math.min(0, bp[0] - 2) * 2]; }); // buttocks back in the seat
  return L.solvePose(p0, paths, objs, { iters: 500 }).pose;
}
// Report of how the lying pose meets the bench (rig shapes)
function benchFit(B, W) {
  const pad = (id) => +(planeClear(W, id, B.padN, B.padD) + PAD_SINK).toFixed(2), seat = (id) => +(planeClear(W, id, B.seatN, B.seatD) + SEAT_SINK).toFixed(2);
  return { chest: pad('chest'), ribcage: pad('ribcage'), hair: pad('hair'), neck: pad('neck'), buttock: seat('buttock_r'), pelvis: seat('pelvis') };
}

// Feet flat on the floor: ankle targets at (x, ANKLE_H, ±z), toes turned out by `yaw`; returns the pose with fitted legs
const ANKLE_H = L.ANKLE_H;
function footContacts(yaw = 12) {
  return [H.legC('r', { pole: [1, 0.25, 0.25], rot: H.footQ(0, -yaw) }), H.legC('l', { pole: [1, 0.25, -0.25], rot: H.footQ(0, yaw) })];
}
function plantFeet(pose, contacts, ax, az) {
  let p = clone(pose);
  p.ik = Object.assign(p.ik || {}, { leg_r: { target: [ax, ANKLE_H, az], weight: 1 }, leg_l: { target: [ax, ANKLE_H, -az], weight: 1 } });
  for (const s of ['r', 'l']) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target, { abd: 18, rot: 0 });
  return p;
}
// Foot x for a wanted knee angle (bisection on the right leg)
function footXForKnee(pose, contacts, az, knee) {
  let a = pose.root.pos[0] + 10, b = pose.root.pos[0] + 75, x = 0;
  for (let i = 0; i < 40; i++) { x = (a + b) / 2; const p = clone(pose); p.ik = { leg_r: { target: [x, ANKLE_H, az], weight: 1 } }; if (H.kneeOf(L.fk(p, [contacts[0]]), 'r') > knee) a = x; else b = x; }
  return r1(x);
}

// Dumbbell on the RepRig skeleton. grip: 'handle' | 'goblet' | 'end'; off: player offset [toward fingers, out of palm, thumb]
const DB = { length: 32, diameter: 12, handle: 14 };
function dbAt(W, side, grip = 'handle', off = null) {
  const w = W[`wrist_${side}`], g = D.GRIP[grip];
  // The player's third offset axis is t = palm normal x fingers in each hand's own rest frame, which is the rig -Z for the
  // right hand (little-finger side) and the rig +Z of the (mirrored) left hand frame, so it is not mirrored between hands.
  let o;
  if (off) o = [off[1], -off[0], side === 'r' ? -off[2] : off[2]];
  else { o = g.off.slice(); if (side === 'l') o = [o[0], o[1], -o[2]]; }
  const c = V.add(w.p, Q.rot(w.q, o)), ax = V.norm(Q.rot(w.q, g.axis)), half = DB.length / 2;
  const plate = (DB.length - DB.handle) / 2, pc = DB.handle / 2 + plate / 2;
  return { c, ax, ends: [V.add(c, V.scale(ax, half)), V.sub(c, V.scale(ax, half))], plates: [V.add(c, V.scale(ax, pc)), V.sub(c, V.scale(ax, pc))], r: DB.diameter / 2, plateLen: plate };
}
// Sample points on the dumbbell surface (plates as hexagonal-ish cylinders, handle as a thin rod)
function dbPoints(d) {
  const pts = [], u = Math.abs(d.ax[1]) < 0.9 ? V.norm(V.cross(d.ax, [0, 1, 0])) : V.norm(V.cross(d.ax, [1, 0, 0])), w = V.cross(d.ax, u);
  for (const pc of d.plates) for (let k = -2; k <= 2; k++) { const c = V.add(pc, V.scale(d.ax, (k / 2) * d.plateLen / 2)); pts.push(c); for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * Math.PI; pts.push(V.add(c, V.add(V.scale(u, Math.cos(a) * d.r), V.scale(w, Math.sin(a) * d.r)))); } }
  return pts;
}
// Depth of a point inside a shape (cm, > 0 inside; approximate for ellipsoids)
function insideDepth(g, p) {
  if (g.kind === 'capsule') {
    const ab = V.sub(g.b, g.a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, g.a), ab) / V.dot(ab, ab)));
    const r = g.r[0] + (g.r[1] - g.r[0]) * t; return r - V.len(V.sub(p, V.add(g.a, V.scale(ab, t))));
  }
  const d = V.sub(p, g.c); let s = 0, rmin = 1e9;
  for (const a of g.axes) { const l2 = V.dot(a, a); s += (V.dot(d, a) * V.dot(d, a)) / (l2 * l2); rmin = Math.min(rmin, Math.sqrt(l2)); }
  return (1 - Math.sqrt(s)) * rmin;
}
// Deepest penetration of a dumbbell into the body (excluding the holding hand(s) / forearm(s))
function dbBodyPen(W, d, skip) {
  let worst = { depth: -1e9, id: null };
  const pts = dbPoints(d);
  for (const s of rig.shapes) {
    if (skip.some((re) => re.test(s.id))) continue;
    const g = R.shapeWorld(W, s);
    for (const p of pts) { const dep = insideDepth(g, p); if (dep > worst.depth) worst = { depth: dep, id: s.id }; }
  }
  return worst;
}
// Penetration of the dumbbell into the bench (seat box and the pad slab, 6 cm thick); > 0 = inside
function dbBenchPen(B, d) {
  let worst = -1e9;
  const pts = dbPoints(d), hz = B.prop.size[2] / 2;
  for (const p of pts) {
    if (Math.abs(p[2]) > hz) continue;
    if (p[0] > B.seatX[0] && p[0] < B.seatX[1]) worst = Math.max(worst, B.top - p[1]);
    const s = alongPad(B, p);
    const below = B.padD - V.dot(B.padN, p); // depth under the pad surface (the pad slab is 6 cm thick)
    if (s > 0 && s < B.prop.backLength && below < 8) worst = Math.max(worst, below);
  }
  return worst;
}

// Right-arm solve: dumbbell centre at c with its axis along ax (sign matters), the wrist kept near neutral, plus optional
// extra objectives (e.g. elbow placement). Returns the pose with shoulder / elbow / wrist channels (rounded).
const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
const limPen = (q) => ARM.map((pth) => { const [, j, c] = pth.split('.'), lim = rig.byId[j].limits && rig.byId[j].limits[c], v = L.getPath(q, pth) ?? 0; return lim ? (Math.max(0, lim[0] + 1 - v) + Math.max(0, v - lim[1] + 1)) * 25 : 0; });
function solveArmDB(pose, { c, ax, grip = 'handle', off = null, extra = null, seeds = [], wristW = 0.25, signed = true, elbowFlex = null }) {
  const objs = [
    (W) => (c ? V.sub(dbAt(W, 'r', grip, off).c, c).map((v) => v * 3) : []),
    (W) => { if (!ax) return []; const a = dbAt(W, 'r', grip, off).ax; return (signed ? V.sub(a, ax) : V.sub(a, V.scale(ax, Math.sign(V.dot(a, ax)) || 1))).map((v) => v * 15); },
    (W, q) => [q.ch.wrist_r.flex * wristW, q.ch.wrist_r.dev * wristW, (q.ch.shoulder_r.axial || 0) * 0.005],
    (W, q) => limPen(q),
  ];
  if (elbowFlex != null) objs.push((W, q) => [(q.ch.elbow_r.flex - elbowFlex) * 2]);
  if (extra) objs.push(extra);
  let best = null;
  for (const s of seeds) {
    const q0 = clone(pose); Object.assign(q0.ch, clone(s));
    const r = L.solvePose(q0, ARM, objs, { iters: 400 }); r.seed = s;
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const out = best.pose;
  // keep one continuous branch: unwrap the angle channels toward the seed they started from
  for (const [j, k] of [['shoulder_r', 'plane'], ['shoulder_r', 'axial'], ['wrist_r', 'pron']]) { const ref = (best.seed && best.seed[j] && best.seed[j][k]) ?? 0, v = out.ch[j][k]; out.ch[j][k] = r1(v + 360 * Math.round((ref - v) / 360)); }
  out.__cost = best.cost;
  return out;
}
const mirrorArm = (p) => { for (const j of ['sc', 'shoulder', 'elbow', 'wrist']) if (p.ch[`${j}_r`]) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); return p; };

// Trunk frame at the shoulders: u toward the head along the trunk, v out of the chest, w = right (+Z)
function trunkFrame(W) {
  const u = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)), w0 = V.norm(V.sub(W.shoulder_r.p, W.shoulder_l.p));
  const v = V.norm(V.cross(u, w0)), w = V.cross(v, u);
  return { u, v, w, S: W.shoulder_r.p, mid: V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5) };
}

// Depth of a body shape under the bench surfaces (cm, > 0 = sunk in), counting only the parts over the bench footprint
function bodyBenchPen(B, W, s) {
  const g = R.shapeWorld(W, s), hz = B.prop.size[2] / 2, seatLike = B.angle === 0 && /^(pelvis|buttock)/.test(s.id); // flat: the pelvis may rest on the pad end
  const test = (p, r, n, d, inRange) => (Math.abs(p[2]) < hz && inRange(p) ? d - (V.dot(p, n) - r) : -1e9);
  const onSeat = (p) => p[0] > B.seatX[0] && p[0] < B.seatX[1], onPad = (p) => { const a = alongPad(B, p); return a > 0 && a < B.prop.backLength; };
  let pen = -1e9;
  const sd = B.seatD - (SEAT_SINK - PAD_SINK); // the seat allowance is larger (see SEAT_SINK)
  test.seat = (p, r) => test(p, r, B.seatN, sd, onSeat);
  if (g.kind === 'capsule') for (let k = 0; k <= 6; k++) { const t = k / 6, p = V.add(g.a, V.scale(V.sub(g.b, g.a), t)), r = g.r[0] + (g.r[1] - g.r[0]) * t; pen = Math.max(pen, test.seat(p, r), seatLike ? test(p, r, B.padN, sd, onPad) : test(p, r, B.padN, B.padD, onPad)); }
  else { pen = Math.max(test.seat(planePoint(W, s.id, B.seatN), 0), test(planePoint(W, s.id, B.padN), 0, B.padN, seatLike ? sd : B.padD, onPad)); }
  return pen - PAD_SINK;
}
// Whole-loop scan: feet slide, floor, dumbbell vs body / bench / floor (both hands), body vs bench, joint angles via probe
function sweep(ex, B, { grips, skip = [/^(hand|thumb|forearm)_r$/], skipL = [/^(hand|thumb|forearm)_l$/], probe, n = 600 } = {}) {
  const tl = R.buildTimeline(ex), Dn = ex.timeline.duration, out = { slide: 0, floor: 1e9, dbFloor: 1e9, dbBody: -1e9, dbBench: -1e9, bodyBench: -1e9 };
  const benchShapes = rig.shapes.filter((s) => !/^(hand|thumb|forearm|upperarm|biceps|deltoid|foot|shank|calf)_/.test(s.id) && !/^(jaw|nose|ear|eye|brow|neck)/.test(s.id)); // the head / hair rest just off the pad (the neck capsule overreaches the drawn neck, see NECK_MIN)
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Dn, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
    for (const id of ['leg_r', 'leg_l']) { const k = pz.ik && pz.ik[id]; if (!k) continue; out.slide = Math.max(out.slide, V.len(V.sub(W[`ankle_${id.slice(-1)}`].p, k.target))); }
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    if (grips.length === 2) { // the two dumbbells must not overlap: closest approach of the plates (cm, < 0 = overlap)
      const a = dbAt(W, grips[0].side, grips[0].grip, grips[0].off), b = dbAt(W, grips[1].side, grips[1].grip, grips[1].off);
      let m = 1e9; // surface samples of a vs b's plates as capped cylinders (signed distance)
      for (const p of dbPoints(a)) for (const pc of b.plates) { const dlt = V.sub(p, pc), ax = V.dot(dlt, b.ax), rad = V.len(V.sub(dlt, V.scale(b.ax, ax))); const qx = rad - b.r, qy = Math.abs(ax) - b.plateLen / 2; m = Math.min(m, Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0)); }
      out.dbGap = Math.min(out.dbGap ?? 1e9, +m.toFixed(2));
    }
    for (const g of grips) {
      const d = dbAt(W, g.side, g.grip, g.off);
      out.dbFloor = Math.min(out.dbFloor, Math.min(...d.ends.map((e) => e[1])) - d.r);
      const pen = dbBodyPen(W, d, g.skip || (g.side === 'r' ? skip : skipL)); if (pen.depth > out.dbBody) { out.dbBody = pen.depth; out.dbBodyAt = [g.side, pen.id, +t.toFixed(2)]; }
      const bp = dbBenchPen(B, d); if (bp > out.dbBench) { out.dbBench = bp; out.dbBenchAt = [g.side, +t.toFixed(2)]; }
    }
    for (const s of benchShapes) { // body below the pad / seat surface while over the bench footprint
      const pen = bodyBenchPen(B, W, s); if (pen > out.bodyBench) { out.bodyBench = pen; out.bodyBenchAt = [s.id, +t.toFixed(2)]; }
    }
    if (probe) probe(W, pz, t, out);
  }
  for (const k of ['slide', 'floor', 'dbFloor', 'dbBody', 'dbBench', 'bodyBench']) out[k] = +out[k].toFixed(2);
  return out;
}
const dumbbellProp = (side, grip = 'handle', offset = null) => ({ id: side === 'r' ? 'dbR' : 'dbL', kind: 'dumbbell', size: [32, 12, 12], attach: Object.assign({ joint: `wrist_${side}`, grip }, offset ? { offset } : {}) });
const elbowFlexOf = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));
// Upper arm away from the trunk axis (abduction-like angle seen in the trunk's coronal plane): 0 = along the ribs, 90 = "T"
function elbowFlare(W, s = 'r') {
  const F = trunkFrame(W), ua = V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p), side = s === 'r' ? F.w : V.scale(F.w, -1);
  return Math.atan2(V.dot(ua, side), -V.dot(ua, F.u)) / R.DEG;
}
// Upper arm below (+) / above (-) the trunk's back plane, deg
function armDip(W, s = 'r') { const F = trunkFrame(W), ua = V.norm(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p)); return -Math.asin(V.dot(ua, F.v)) / R.DEG; }

module.exports = { HEAD_LIFT, planeClear, planePoint, makeBench, alongPad, layOnBench, benchFit, setSink, get PAD_SINK() { return PAD_SINK; }, footContacts, plantFeet, footXForKnee,
  dbAt, dbPoints, dbBodyPen, dbBenchPen, solveArmDB, mirrorArm, trunkFrame, sweep, dumbbellProp, elbowFlexOf, elbowFlare, armDip, DB };

// Press path: n+1 arm keys from the bottom (f = 0: elbows out `flare` deg from the trunk, upper arm `dip` deg below the
// back plane, forearm vertical) to the top (f = 1: dumbbell centre at topC). Each key is solved from the previous one so
// the shoulder / wrist channels stay on one continuous branch; the centre follows a straight line with the forearm kept
// vertical (soft), handle along `ax` (right hand). Returns [{ f, pose }].
const ARM_SEEDS = [{ shoulder_r: { plane: 0, elev: 55, axial: 0 }, elbow_r: { flex: 100 }, wrist_r: { pron: 120, flex: 0, dev: 0 } }, { shoulder_r: { plane: 30, elev: 70, axial: 60 }, elbow_r: { flex: 90 }, wrist_r: { pron: 60, flex: 0, dev: 0 } }, { shoulder_r: { plane: 30, elev: 70, axial: -60 }, elbow_r: { flex: 90 }, wrist_r: { pron: 170, flex: 0, dev: 0 } }];
function upperArmDir(F, flare, dip) {
  const a = flare * R.DEG, d = dip * R.DEG;
  return V.norm(V.add(V.add(V.scale(F.u, -Math.cos(a) * Math.cos(d)), V.scale(F.w, Math.sin(a) * Math.cos(d))), V.scale(F.v, -Math.sin(d))));
}
const slerpV = (a, b, t) => { const om = Math.acos(Math.max(-1, Math.min(1, V.dot(a, b)))); if (om < 1e-6) return a.slice(); const s0 = Math.sin((1 - t) * om) / Math.sin(om), s1 = Math.sin(t * om) / Math.sin(om); return V.norm(V.add(V.scale(a, s0), V.scale(b, s1))); };
// Press: the forearm stays vertical (stacked under the dumbbell) while the upper arm swings from the bottom direction
// (flare / dip in the trunk frame) to the top direction (topDir, world; the elbow then is almost straight).
function pressPath(pose, { flare, dip, topDir, ax, n = 6, ease = (f) => f }) {
  const W = L.fk(pose), F = trunkFrame(W), S = W.shoulder_r.p, d0 = upperArmDir(F, flare, dip), d1 = V.norm(topDir);
  const up = [0, 1, 0], fore = (Wx) => V.sub(V.norm(V.sub(Wx.wrist_r.p, Wx.elbow_r.p)), up);
  const out = []; let prev = null;
  for (let i = 0; i <= n; i++) {
    const f = i / n, E = V.add(S, V.scale(slerpV(d0, d1, ease(f)), L.UA)), prevCh = prev && clone(prev.ch);
    const extra = (Wx, qq) => [...V.sub(Wx.elbow_r.p, E).map((v) => v * 3), ...fore(Wx).map((v) => v * 10)].concat(prev ? [(qq.ch.wrist_r.pron - prevCh.wrist_r.pron) * 0.01, (qq.ch.shoulder_r.axial - prevCh.shoulder_r.axial) * 0.01] : []);
    const q = solveArmDB(pose, { c: null, ax, seeds: prev ? [{ shoulder_r: prevCh.shoulder_r, elbow_r: prevCh.elbow_r, wrist_r: prevCh.wrist_r }] : ARM_SEEDS, extra });
    out.push({ f, pose: q }); prev = q;
  }
  return out;
}
module.exports.pressPath = pressPath; module.exports.slerpV = slerpV; module.exports.upperArmDir = upperArmDir; module.exports.ARM_SEEDS = ARM_SEEDS;

/* ---------------- Module builders shared by the press and fly authors ---------------- */
const SC = { protract: -6, elevate: -2 }; // shoulder blades drawn back and down on the pad
// Lying base for a bench angle: flat (pelvis arched slightly, hip at hipX) or incline (buttocks in the crease); feet planted
function benchBase(angle, { hipX = 10, knee = 85, footZ = 24, yaw = 12 } = {}) {
  const B = makeBench(angle);
  let p = layOnBench(B, Object.assign({ headLift: HEAD_LIFT }, angle ? { pitch: 90 - angle, l5: -10 } : { hipX, pitch: +(process.env.FPITCH ?? 89), pitchW: 0.8, l5: +(process.env.FL5 ?? -8) }));
  p.ch.sc_r = clone(SC); p.ch.sc_l = clone(SC);
  const contacts = footContacts(yaw), fx = footXForKnee(p, contacts, footZ, knee);
  p = plantFeet(p, contacts, fx, footZ);
  return { B, base: p, contacts, foot: [fx, ANKLE_H, footZ] };
}
// Keyframes for one repetition from path keys (f = 0 bottom ... 1 top): hold at the top, lower through the keys, pause at
// the bottom (tiny settle key), lift through the keys, back to the top. Returns { poses, keyframes }.
function repKeys(path, T, settle) {
  const n = path.length - 1, poses = { top: path[n].pose, bottom: path[0].pose }, keyframes = [{ t: 0, pose: 'top' }, { t: T.h, pose: 'top' }];
  for (let i = n - 1; i >= 1; i--) { const name = `down${n - i}`; poses[name] = path[i].pose; keyframes.push({ t: +(T.h + ((T.b - T.h) * (n - i)) / n).toFixed(3), pose: name }); }
  keyframes.push({ t: T.b, pose: 'bottom' });
  if (settle) { poses.bottomHold = settle; keyframes.push({ t: +((T.b + T.p) / 2).toFixed(3), pose: 'bottomHold' }); }
  keyframes.push({ t: T.p, pose: 'bottom' });
  for (let i = 1; i <= n - 1; i++) { const name = `up${i}`; poses[name] = path[i].pose; keyframes.push({ t: +(T.p + ((T.r - T.p) * i) / n).toFixed(3), pose: name }); }
  keyframes.push({ t: T.r, pose: 'top' }, { t: T.D, pose: 'top' });
  return { poses, keyframes };
}
const phaseT = (meta) => { const ph = meta.timeline.phases; return { h: ph[0].end, b: ph[1].end, p: ph[2].end, r: ph[3].end, D: meta.timeline.duration }; };
const strip = (p) => { const q = clone(p); delete q.__cost; return q; };
module.exports.benchBase = benchBase; module.exports.repKeys = repKeys; module.exports.phaseT = phaseT; module.exports.strip = strip; module.exports.SC = SC;

// Fly: the upper arm sweeps along an arc from dTop (world, over the chest) to dBot (out to the side, about level with the
// bench) with the elbow held at a fixed soft bend; the forearm bends toward the inside of the arc ("hugging") and the
// handle stays along the trunk axis (neutral grip: palms facing each other at the top, the ceiling at the bottom).
function flyPath(pose, { dTop, dBot, elbow = 22, n = 6 }) {
  const W = L.fk(pose), F = trunkFrame(W), S = W.shoulder_r.p, a = V.norm(dTop), b = V.norm(dBot), ax = F.u;
  const out = []; let prev = null;
  for (let i = 0; i <= n; i++) {
    const f = i / n, d = slerpV(a, b, f), d2 = slerpV(a, b, Math.min(1, f + 0.01)), d1 = slerpV(a, b, Math.max(0, f - 0.01));
    const tan = V.norm(V.sub(d2, d1)), bend = V.norm(V.sub(V.scale(tan, -1), V.scale(d, V.dot(V.scale(tan, -1), d))));
    const E = V.add(S, V.scale(d, L.UA)), prevCh = prev && clone(prev.ch);
    const extra = (Wx, qq) => [...V.sub(Wx.elbow_r.p, E).map((v) => v * 3), (V.dot(V.norm(V.sub(Wx.wrist_r.p, Wx.elbow_r.p)), bend) - Math.sin(elbow * R.DEG)) * 6]
      .concat(prev ? [(qq.ch.wrist_r.pron - prevCh.wrist_r.pron) * 0.01, (qq.ch.shoulder_r.axial - prevCh.shoulder_r.axial) * 0.01] : []);
    const q = solveArmDB(pose, { c: null, ax, elbowFlex: elbow, seeds: prev ? [{ shoulder_r: prevCh.shoulder_r, elbow_r: prevCh.elbow_r, wrist_r: prevCh.wrist_r }] : [{ shoulder_r: { plane: 90, elev: 90, axial: 0 }, elbow_r: { flex: elbow }, wrist_r: { pron: 0, flex: 0, dev: 0 } }, { shoulder_r: { plane: 90, elev: 90, axial: 90 }, elbow_r: { flex: elbow }, wrist_r: { pron: 0, flex: 0, dev: 0 } }, { shoulder_r: { plane: 90, elev: 90, axial: -90 }, elbow_r: { flex: elbow }, wrist_r: { pron: 90, flex: 0, dev: 0 } }], extra });
    out.push({ f, pose: q }); prev = q;
  }
  return out;
}
module.exports.flyPath = flyPath;
