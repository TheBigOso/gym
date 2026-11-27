// Forearm and overhead-triceps family (batch 4): seated wrist / reverse wrist / finger curls with the forearms resting on
// the thighs, the standing behind-the-back wrist curl, and standing / seated overhead triceps extensions.
// Shared helpers: a seated base on the end of a flat bench with the forearms lying along the tops of the thighs (palms
// up or down, wrists just past the knees), dumbbell clearance with any size and attach.offset, a dumbbell-vs-dumbbell
// gap, and a whole-loop report (planted feet, floor, dumbbell vs body / bench / floor / other dumbbell, wrist range).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./b3-curls');
const T = require('./b3-triceps');
const D = require('./dumbbell');

const LIGHT = [28, 10, 10];                                       // a light hex dumbbell (cm): forearm work
const dbProp = (s, grip = 'handle', size = LIGHT, offset) => Object.assign({ id: s === 'r' ? 'dbR' : 'dbL', kind: 'dumbbell', size: size.slice(), attach: Object.assign({ joint: `wrist_${s}`, grip }, offset ? { offset } : {}) });
const sizeObj = (size) => ({ length: size[0], diameter: size[1] });
// Dumbbell geometry on the rig for a prop (grip, optional attach.offset, size): centre, axis, plate centres, radius.
// Plate span along the axis follows the player's mesh: handle min(14, 0.45 L), plates beyond it to the ends.
function dbGeo(W, pr) {
  const s = pr.attach.joint.endsWith('_l') ? 'l' : 'r', size = sizeObj(pr.size || [32, 12, 12]);
  const d = pr.attach.offset ? T.dumbbellAtOff(W, s, pr.attach.grip, pr.attach.offset, size) : D.dumbbellAt(W, s, pr.attach.grip, size);
  const Lh = size.length, hl = Math.min(14, 0.45 * Lh);
  return Object.assign(d, { side: s, inner: hl / 2, outer: Lh / 2 });
}
// Points sampled on the dumbbell (plates as rims and centres, handle as a thin bar) with their radii
function dbPoints(d) {
  const pts = [];
  for (const sg of [-1, 1]) for (const a of [d.inner, (d.inner + d.outer) / 2, d.outer]) {
    const c = V.add(d.c, V.scale(d.ax, sg * a)); pts.push([c, d.r * 0.9]);
    const u = V.norm(V.cross(d.ax, Math.abs(d.ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = V.cross(d.ax, u);
    for (let k = 0; k < 6; k++) { const th = (k / 6) * 2 * Math.PI; pts.push([V.add(c, V.add(V.scale(u, Math.cos(th) * d.r), V.scale(w, Math.sin(th) * d.r))), 0]); }
  }
  for (let k = -2; k <= 2; k++) pts.push([V.add(d.c, V.scale(d.ax, (k / 2) * d.inner)), 1.6]);
  return pts;
}
// Smallest clearance (cm) from a held dumbbell to the body shapes, skipping the holding hand/forearm and `skip` ids
function dbBody(W, pr, skip = []) {
  const d = dbGeo(W, pr), own = new Set([`hand_${d.side}`, `thumb_${d.side}`, ...skip]);
  let best = { d: 1e9, id: null };
  const pts = dbPoints(d);
  for (const s of rig.shapes) {
    if (own.has(s.id) || ['eye', 'brow', 'nose', 'ear'].includes(s.base)) continue;
    for (const [p, r] of pts) { const c = C.shapeDist(W, s, p) - r; if (c < best.d) best = { d: c, id: s.id }; }
  }
  return best;
}
// Lowest point of the dumbbell (cm above the floor)
const dbMinY = (W, pr) => Math.min(...dbPoints(dbGeo(W, pr)).map(([p, r]) => p[1] - r));
// Clearance from a dumbbell to an axis-aligned box {center, size} (center y = 0 at the floor)
function dbBox(W, pr, box) {
  const [cx, cy, cz] = box.center, [sx, sy, sz] = box.size, lo = [cx - sx / 2, cy, cz - sz / 2], hi = [cx + sx / 2, cy + sy, cz + sz / 2];
  let best = 1e9;
  for (const [p, r] of dbPoints(dbGeo(W, pr))) {
    const q = p.map((v, i) => Math.max(lo[i], Math.min(hi[i], v))), inside = p.every((v, i) => v > lo[i] && v < hi[i]);
    best = Math.min(best, (inside ? -1 : 1) * V.len(V.sub(p, q)) - r);
  }
  return best;
}
// Gap between the two dumbbells (cm): plates as short cylinders, approximated by the sampled points
function dbPair(W, a, b) {
  const pa = dbPoints(dbGeo(W, a)), pb = dbPoints(dbGeo(W, b));
  let best = 1e9; for (const [p, r] of pa) for (const [q, s] of pb) best = Math.min(best, V.len(V.sub(p, q)) - r - s);
  return best;
}

/* ---------------- Seated on the end of a flat bench, forearms on the thighs ---------------- */
const thighAt = (W, s, t) => { const a = W[`hip_${s}`].p, b = W[`knee_${s}`].p; return { c: V.add(a, V.scale(V.sub(b, a), t)), ax: V.norm(V.sub(b, a)), r: 8.7 + (5.4 - 8.7) * Math.min(1, Math.max(0, t)) }; };
// "Up" across the thigh: world up made perpendicular to the thigh axis
const thighUp = (ax) => V.norm(V.sub([0, 1, 0], V.scale(ax, ax[1])));
// Point on the top surface of the thigh at fraction t (t > 1: beyond the knee, along the same line)
const thighTop = (W, s, t, lift = 0) => { const g = thighAt(W, s, t); return V.add(g.c, V.scale(thighUp(g.ax), g.r + lift)); };
// Projected fraction of a point along the thigh axis
const thighFrac = (W, s, p) => { const a = W[`hip_${s}`].p, b = W[`knee_${s}`].p, ab = V.sub(b, a); return V.dot(V.sub(p, a), ab) / V.dot(ab, ab); };

// Seat facing +X on the end of a flat bench (top SEAT_H): buttocks on the seat, feet flat (leg IK, constant targets),
// trunk leaning forward from the hips so the forearms lie along the thighs: the elbow and the wrist rest on the top of the
// thigh (forearm surface on the thigh surface, `lift` cm = rig shape overlap/gap tuned on the skinned mesh), the wrist
// at fraction tW along the thigh (just past the knee), the palm facing up (palm 'up') or down ('down').
function seatedForearms({ seatH = 45, stance = 20, footDX = 44, toeOut = 8, hipAbd = 10, tW = 1.08, liftE = 0, liftW = 0, palm = 'up', seatOff = 0, uaV = 20, spine = { l5: 12, t12: 10, t6: 8 }, rootX = 0 } = {}) {
  const st = L.POSES.standing({ stance, toeOut });
  const contacts = st.contacts.map((c) => Object.assign(c, { pole: [1, 0, c.id === 'leg_r' ? 0.25 : -0.25] }));
  let p = clone(st.pose); delete p.ik;
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: spine.l5, latFlex: 0 }, spine_t12: { rot: 0, flex: spine.t12, latFlex: 0 }, spine_t6: { rot: 0, flex: spine.t6, latFlex: 0 },
    hip_r: { flex: 95, abd: hipAbd, rot: -toeOut }, hip_l: { flex: 95, abd: hipAbd, rot: -toeOut }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, sc_r: { protract: 8, elevate: 0 }, sc_l: { protract: 8, elevate: 0 } });
  p.root.pos = [rootX, seatH + 8, 0]; p.root.rot = { pitch: -15 };
  p.ik = { leg_r: { target: [r1(rootX + footDX), L.ANKLE_H, stance], weight: 1 }, leg_l: { target: [r1(rootX + footDX), L.ANKLE_H, -stance], weight: 1 } };
  const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => C.shapePlaneDist(W, id, [0, seatH, 0], [0, 1, 0])));
  const pronOf = palm === 'up' ? 0 : 175;
  C.setArm(p, 'r', { plane: 60, elev: 30, axial: 0, flex: 70, pron: pronOf });
  const palmUp = palm === 'up' ? 1 : -1;
  const objs = [
    (W) => [(seatY(W) - seatOff) * 4],
    (W) => { const t = thighFrac(W, 'r', W.elbow_r.p); return V.sub(W.elbow_r.p, thighTop(W, 'r', t, 3.9 + liftE)).map((v) => v * 3); },
    (W) => V.sub(W.wrist_r.p, thighTop(W, 'r', tW, 2.5 + liftW)).map((v) => v * 3),
    (W) => { const fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)), up = V.norm(V.sub([0, palmUp, 0], V.scale(fa, fa[1] * palmUp))); return V.sub(C.palmDir(W, 'r'), up).map((v) => v * 6); },
    (W, q) => [q.ch.shoulder_r.axial * 0.01, Math.min(0, q.ch.shoulder_r.elev) * 5],
    (W) => [(V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]) - uaV) * 0.15],
  ];
  const sol = L.solvePose(p, ['root.pos.1', 'root.rot.pitch', 'ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron'], objs, { iters: 600, contacts });
  p = T.mirrorArm(sol.pose);
  p.ch.wrist_r.pron = r1(L.wrap(p.ch.wrist_r.pron)); p.ch.wrist_l.pron = p.ch.wrist_r.pron;
  const W = L.fk(p, contacts);
  const res = objs.slice(0, 4).concat([objs[5]]).map((f) => +Math.hypot(...f(W, p)).toFixed(2));
  const measure = (Wx) => ({ seat: +seatY(Wx).toFixed(2), elbowFrac: +thighFrac(Wx, 'r', Wx.elbow_r.p).toFixed(2), wristFrac: +thighFrac(Wx, 'r', Wx.wrist_r.p).toFixed(2) });
  return { pose: p, contacts, cost: sol.cost, res, measure, seatY };
}
// Bench prop under a seated athlete: flat bench whose +X end (front edge) sits `front` cm ahead of the buttock centre
function benchUnder(W, { seatH = 45, front = 14, length = 110, width = 30 } = {}) {
  const bx = (W.hip_r.p[0] + W.hip_l.p[0]) / 2 + front;
  return { id: 'bench', kind: 'bench', center: [r1(bx - length / 2), 0, 0], size: [length, seatH, width] };
}
// Set the wrist flexion (and optional deviation) of both hands on a copy of the pose
const withWrist = (p, flex, dev = 0, sides = ['r', 'l']) => { const q = clone(p); for (const s of sides) q.ch[`wrist_${s}`] = Object.assign({}, q.ch[`wrist_${s}`], { flex: r1(flex), dev: r1(dev) }); return q; };
// Angle of the hand (fingers) relative to the forearm in the flexion plane: + palmar flexion, - extension
function wristAngle(W, s) {
  const fa = V.norm(V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p)), f = Q.rot(W[`wrist_${s}`].q, [0, -1, 0]), n = Q.rot(W[`wrist_${s}`].q, [1, 0, 0]);
  const ang = V.angle(fa, f); return V.dot(f, n) > V.dot(fa, n) ? ang : -ang; // fingers turned toward the palm side = flexion
}

// Whole-loop report: planted slide, floor, wrist flexion range, forearm drift, dumbbell vs body/floor/box/each other.
function forearmLoop(ex, { box = null, skip = [], n = 800, still = ['elbow_r', 'wrist_r'] } = {}) {
  const tl = R.buildTimeline(ex), Dn = ex.timeline.duration, held = (ex.props || []).filter((p) => p.attach);
  const W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  const out = { slide: 0, floor: 1e9, wrist: [999, -999], drift: 0, body: { d: 1e9 }, dbFloor: 1e9, box: box ? 1e9 : null, pair: held.length > 1 ? 1e9 : null };
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Dn, pose = tl.pose(t), W = R.evalPose(rig, pose, ex.contacts);
    for (const c of ex.contacts || []) { const k = pose.ik && pose.ik[c.id]; if (!k || (k.weight ?? 1) < 0.999) continue; out.slide = Math.max(out.slide, V.len(V.sub(W[c.chain[2]].p, k.target))); }
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    const wf = pose.ch.wrist_r.flex; out.wrist = [Math.min(out.wrist[0], wf), Math.max(out.wrist[1], wf)];
    for (const j of still) out.drift = Math.max(out.drift, V.len(V.sub(W[j].p, W0[j].p)));
    for (const pr of held) {
      const b = dbBody(W, pr, skip); if (b.d < out.body.d) out.body = { d: +b.d.toFixed(1), id: b.id, db: pr.id, t: +t.toFixed(2) };
      out.dbFloor = Math.min(out.dbFloor, dbMinY(W, pr));
      if (box) out.box = Math.min(out.box, dbBox(W, pr, box));
    }
    if (held.length > 1) out.pair = Math.min(out.pair, dbPair(W, held[0], held[1]));
  }
  out.slide = +out.slide.toFixed(3); out.floor = +out.floor.toFixed(2); out.drift = +out.drift.toFixed(2); out.dbFloor = +out.dbFloor.toFixed(1);
  if (box) out.box = +out.box.toFixed(1); if (out.pair != null) out.pair = +out.pair.toFixed(1);
  return out;
}

module.exports = { LIGHT, dbProp, dbGeo, dbPoints, dbBody, dbMinY, dbBox, dbPair, thighAt, thighTop, thighFrac, seatedForearms, benchUnder, withWrist, wristAngle, forearmLoop };

/* ---------------- Seated wrist / finger curl author ---------------- */
// Builds a seated forearms-on-thighs curl: the trunk, shoulders and elbows are one constant pose (forearms resting still),
// only the wrist flexion channel is keyed. keys: [[t, wristFlex], ...] (first and last equal for a seamless loop).
// Fills the kinematics rows whose measure starts with wristRow / 'Forearm on the thigh' / 'Trunk lean' / 'Tempo'.
function seatedCurl(meta, { palm = 'up', keys, offset, seat = {}, wristRow, wristText, tempo, name }) {
  const H = require('./hips');
  const s = seatedForearms(Object.assign({ palm }, seat));
  const poses = {}, keyframes = [];
  const names = {};
  for (const [t, fl] of keys) { const k = `w${fl < 0 ? 'm' : 'p'}${Math.abs(fl)}`; if (!names[k]) { names[k] = 1; poses[k] = withWrist(s.pose, fl); } keyframes.push({ t, pose: k }); }
  const ex = H.module_(meta, s.contacts, poses, keyframes);
  if (offset) for (const pr of ex.props) if (pr.attach) pr.attach.offset = offset.slice();
  const W0 = L.fk(s.pose, s.contacts), box = benchUnder(W0, { seatH: seat.seatH || 45 });
  ex.props = [box, ...ex.props];
  const rep = forearmLoop(ex, { box: { center: box.center, size: box.size }, skip: [] });
  const trunk = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
  const set = H.setKin(ex), lo = Math.min(...keys.map((k) => k[1])), hi = Math.max(...keys.map((k) => k[1]));
  const sideTxt = (v) => (v >= 0 ? `${Math.round(v)}° flexion` : `${Math.round(-v)}° extension`);
  if (wristText) { set(wristRow, 'setup', wristText(lo, hi)[0]); set(wristRow, 'peak', wristText(lo, hi)[1]); }
  else { set(wristRow, 'setup', sideTxt(palm === 'up' ? lo : hi)); set(wristRow, 'peak', `${sideTxt(palm === 'up' ? hi : lo)} (arc ≈${Math.round(hi - lo)}°)`); }
  const m = s.measure(W0);
  if (ex.exercise.kinematics.find((k) => k.measure.startsWith('Forearm on the thigh'))) {
    set('Forearm on the thigh', 'setup', `Elbow at ${Math.round(m.elbowFrac * 100)}% of the thigh, wrist at ${Math.round(m.wristFrac * 100)}% (just past the knee); elbow ≈${Math.round(T.elbowOf(W0, 'r'))}°`);
    set('Forearm on the thigh', 'peak', `Forearm still (elbow and wrist move ${rep.drift} cm over the loop)`);
  }
  if (ex.exercise.kinematics.find((k) => k.measure.startsWith('Trunk lean'))) { set('Trunk lean', 'setup', `≈${Math.round(trunk)}° forward from vertical`); set('Trunk lean', 'peak', 'Unchanged'); }
  if (tempo) { set('Tempo', 'setup', tempo[0]); set('Tempo', 'peak', tempo[1]); }
  ex.checks.measure.min = Math.floor(trunk - 8); ex.checks.measure.max = Math.ceil(trunk + 8);
  console.log(`${name}: wrote ${L.write(ex)}\n  res ${JSON.stringify(s.res)} ${JSON.stringify(m)} trunk ${trunk.toFixed(1)} root ${JSON.stringify(s.pose.root)} arm ${JSON.stringify({ sh: s.pose.ch.shoulder_r, el: s.pose.ch.elbow_r, wr: s.pose.ch.wrist_r })}\n  ${JSON.stringify(rep)}`);
  if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
  if (rep.body.d < 0 || rep.dbFloor < 0 || rep.box < 0 || (rep.pair != null && rep.pair < 0.5)) { console.error('FAIL: dumbbell clearance'); process.exitCode = 1; }
  return { ex, s, rep, W0 };
}
module.exports.seatedCurl = seatedCurl;
