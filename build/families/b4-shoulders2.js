// Shoulders family, batch 4 (presses and raises, part 2). Builds on b3-shoulders.js (standing / seated bases, solveArm,
// armKeys, dumbbell clearance) and adds:
//  - one-armed and alternating poses: the right arm from one key, the left arm (mirrored channels) from another, or the
//    left hand resting on the hip (single-arm moves carry only the right dumbbell);
//  - a press path (wrist over the elbow at the bottom, over the shoulder at the top) shared by the standing, seated and
//    floor presses;
//  - an upright seat on the end of a flat bench (no back support) and a long sit on the floor (legs straight, heels down);
//  - a loop scan that checks only the dumbbells actually held (sides) and the bench seat / pad.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const DB = require('./dumbbell');
const F = require('./b3-shoulders');

const ARMJ = ['shoulder', 'elbow', 'wrist', 'sc'];
// Pose with the right arm of `rSrc` and, on the left, the right arm of `lSrc` mirrored (channels copied r -> l)
function combine(base, rSrc, lSrc) {
  const p = clone(base);
  for (const j of ARMJ) { if (rSrc.ch[`${j}_r`]) p.ch[`${j}_r`] = clone(rSrc.ch[`${j}_r`]); if (lSrc.ch[`${j}_r`]) p.ch[`${j}_l`] = clone(lSrc.ch[`${j}_r`]); }
  delete p.__err; return p;
}
// Left hand on the hip (wrist on the iliac crest, elbow out), right arm untouched
function leftOnHip(p) {
  const h = H.handsOnHips(p), q = clone(p);
  for (const j of ARMJ) if (h.ch[`${j}_l`]) q.ch[`${j}_l`] = clone(h.ch[`${j}_l`]);
  return q;
}

/* ---------------- press path ---------------- */
// Wrist at fraction f of the press for the right arm (shoulder joint Sh): bottom = forearm vertical over an elbow at `elev0`
// degrees of elevation, `plane` degrees in front of the frontal plane; top = over the shoulder (dx forward, dz out),
// elbow `topFlex` degrees from straight. `up` is the world up of the trunk (vertical unless the trunk leans).
function pressWrist(f, Sh, { plane = 30, elev0 = 82, topFlex = 12, dx = 3, dz = 2, bow = 5 } = {}) {
  const P = plane * R.DEG, e = elev0 * R.DEG;
  const e0 = V.add(Sh, V.scale([Math.sin(e) * Math.sin(P), -Math.cos(e), Math.sin(e) * Math.cos(P)], L.UA));
  const w0 = V.add(e0, [0, L.FA, 0]), reach = L.reach(topFlex), w1 = V.add(Sh, [dx, Math.sqrt(reach * reach - dx * dx - dz * dz), dz]);
  const k = f * f * (3 - 2 * f), w = V.add(V.scale(w0, 1 - k), V.scale(w1, k));
  w[2] += bow * Math.sin(Math.PI * f) * (1 - f); // hands stay over the elbows a little longer
  return w;
}
// Right-arm press keys (mirrored to the left): { name: f } in order; sc = (f) => scapula channels
function pressKeys(base, keysF, opt = {}) {
  const plane = (opt.plane ?? 30) * R.DEG, poses = {}, err = {};
  let g = opt.guess || { plane: 30, elev: 85, axial: -85, flex: 92, pron: 88 };
  for (const [name, f] of Object.entries(keysF)) {
    const p = clone(base);
    p.ch.sc_r = opt.sc ? opt.sc(f) : { protract: r1(3 + 2 * f), elevate: r1(12 * f * f) };
    const Sh = L.fk(p).shoulder_r.p, wrist = pressWrist(f, Sh, opt);
    const elbow = F.elbowFor(Sh, wrist, [Math.sin(plane), -0.25, Math.cos(plane)]);
    const q = F.solveArm(p, { wrist, elbow, wElbow: 1, palm: opt.palm || [1, 0, 0], wPalm: 4, wristFlex: opt.wristFlex ?? -8, guess: g });
    err[name] = q.__err; g = F.armGuess(q); poses[name] = F.mirrorArm(q);
  }
  return { poses, err };
}

/* ---------------- raise keys (standing / seated) ---------------- */
const D2R = Math.PI / 180;
// palm faces the way the arm would come back down
const palmDown = (elev, plane) => { const e = elev * D2R, p = plane * D2R; return [-Math.cos(e) * Math.sin(p), -Math.sin(e), -Math.cos(e) * Math.cos(p)]; };

/* ---------------- bases ---------------- */
// Upright on the end of a flat bench (no back support): trunk tall, thighs on the seat, feet flat. The pose comes from the
// seated base with a vertical pad (back and buttocks on one vertical line = trunk upright); then the bench is replaced by a
// flat bench whose seat end sits under the thighs. Rig v2: the rig buttocks rest on the seat; seatDrop / pitchAdj (default
// 0) are optional extra offsets, not mesh compensation.
function benchEnd({ seatDrop = 0, pitchAdj = 0, stance = 22, toe = 10, front = 14, seatH = 45, footAhead = 4 } = {}) {
  const s = F.seated({ angle: 90, stance, toe, seatH, pitchAdj, seatDrop: 0, footAhead });
  let p = s.pose;
  if (seatDrop) {
    p = clone(p); p.root.pos[1] = r1(p.root.pos[1] - seatDrop);
    p = F.plantLegs(p, s.contacts);
  }
  const W = L.fk(p, s.contacts), hipX = (W.hip_r.p[0] + W.hip_l.p[0]) / 2;
  const bench = DB.bench({ x: r1(hipX + front - 20), angle: 0, height: seatH });
  return { pose: p, contacts: s.contacts, bench, hipX };
}

// Long sit on the floor: legs straight in front (knees soft), heels on the floor, toes up; trunk tall over the pelvis.
// The feet are planted with the FK foot orientation as the world-locked contact orientation.
function longSit({ hipFlex = 89.5, knee = 4, dorsi = -12, abd = 6, lean = 0, l5 = 2, t12 = 0, t6 = 2, sink = 0 } = {}) {
  const st = L.POSES.standing({ stance: 10, toeOut: 0 });
  const p = clone(st.pose); delete p.ik;
  p.root.rot = { pitch: lean };
  p.ch.spine_l5 = { rot: 0, flex: l5, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: t12, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: t6, latFlex: 0 };
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: hipFlex, abd, rot: -4 }; p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi }; }
  p.ch.sc_r = { protract: 2, elevate: 0 }; p.ch.sc_l = { protract: 2, elevate: 0 };
  p.root.pos = [0, 40, 0];
  // sit bones on the floor (legs and pelvis only: the arms are posed later); rig v2: the rig shapes rest on the floor (sink 0)
  const low = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis', 'thigh_r', 'thigh_l', 'calf_r', 'calf_l', 'shank_r', 'shank_l', 'foot_r', 'foot_l'].map((id) => H.bottomOf(W, id)));
  p.root.pos[1] = r1(p.root.pos[1] - low(L.fk(p)) - sink);
  const W = L.fk(p);
  const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: [0, 1, s === 'r' ? 0.1 : -0.1], handRot: H.qArr(W[`ankle_${s}`].q) }));
  p.ik = { leg_r: { target: W.ankle_r.p.map((v) => +v.toFixed(3)), weight: 1 }, leg_l: { target: W.ankle_l.p.map((v) => +v.toFixed(3)), weight: 1 } };
  return { pose: p, contacts };
}

/* ---------------- loop scan ---------------- */
const BODY = rig.shapes.filter((s) => !/^(eye|brow)/.test(s.id));
const PLATE = { s0: 7, s1: 16, r: 6 };
function plateDist(d, p) {
  const v = V.sub(p, d.c), s = Math.abs(V.dot(v, d.ax)), rad = V.len(V.sub(v, V.scale(d.ax, V.dot(v, d.ax))));
  const dz = Math.max(PLATE.s0 - s, s - PLATE.s1), dr = rad - PLATE.r;
  return dz > 0 && dr > 0 ? Math.hypot(dz, dr) : Math.max(dz, dr);
}
// Minimum clearance of the held dumbbells (sides) to the body (own hand/forearm/thumb excluded), each other and a flat or
// inclined pad (bench() result; only over its width) and the seat box.
function clearance(W, { sides = ['r', 'l'], pad = null, box = null } = {}) {
  let best = { d: 1e9 };
  for (const side of sides) {
    const pts = F.dbPoints(W, side);
    for (const s of BODY) {
      if (new RegExp(`^(hand|thumb|forearm)_${side}$`).test(s.id)) continue;
      for (const p of pts) { const d = F.shapeDist(W, s, p); if (d < best.d) best = { d, what: `db${side.toUpperCase()}-${s.id}` }; }
    }
    if (pad) for (const p of pts) {
      if (Math.abs(p[2] - pad.prop.center[2]) > pad.prop.size[2] / 2) continue;
      const along = V.dot(V.sub(p, pad.hinge), pad.padDir);
      if (along < 0 || along > pad.prop.backLength) continue;
      const d = F.padDist(pad, p); if (d < best.d) best = { d, what: `db${side.toUpperCase()}-pad` };
    }
    if (box) { const b = DB.dumbbellBoxClearance(W, side, box); if (b < best.d) best = { d: b, what: `db${side.toUpperCase()}-seat` }; }
  }
  if (sides.length === 2) { const fl = DB.dumbbellAt(W, 'l'); for (const p of F.dbPoints(W, 'r')) { const d = plateDist(fl, p); if (d < best.d) best = { d, what: 'dbR-dbL' }; } }
  return best;
}
const CH = (pz) => { const o = {}; for (const j of ['shoulder_r', 'elbow_r', 'wrist_r', 'sc_r', 'shoulder_l', 'elbow_l', 'wrist_l', 'sc_l']) for (const c in pz.ch[j] || {}) o[`${j}.${c}`] = pz.ch[j][c]; return o; };
function scan(ex, { planted = ['leg_r', 'leg_l'], sides = ['r', 'l'], pad = null, box = null, backPad = null } = {}) {
  let clr = { d: 1e9 }, dbFloor = 1e9, jump = { v: 0 }, prevC = null, back = [1e9, -1e9];
  const rep = H.loopReport(ex, {
    planted,
    probe: (W, pz, t) => {
      const c = clearance(W, { sides, pad, box }); if (c.d < clr.d) clr = { ...c, t: +t.toFixed(2) };
      for (const s of sides) dbFloor = Math.min(dbFloor, DB.dumbbellMinY(W, s));
      const cc = CH(pz);
      if (prevC) for (const k in cc) { const d = Math.abs(cc[k] - (prevC[k] ?? cc[k])); if (d > jump.v) jump = { v: +d.toFixed(2), k, t: +t.toFixed(2) }; }
      prevC = cc;
      if (backPad) { const g = F.backGap(W, backPad); back = [Math.min(back[0], g.d), Math.max(back[1], g.d)]; }
    },
  });
  rep.clear = { d: +clr.d.toFixed(2), what: clr.what, t: clr.t }; rep.dbFloor = +dbFloor.toFixed(1); rep.jump = jump;
  if (backPad) rep.backGap = back.map((v) => +v.toFixed(2));
  return rep;
}

/* ---------------- measures ---------------- */
const elbowAng = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));
const humElev = (W, s = 'r') => V.angle(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p), V.sub(W.pelvis.p, W.neck_c7.p)); // vs the trunk axis
const planeDeg = (W, s = 'r') => { const u = V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p); return Math.atan2(u[0], s === 'r' ? u[2] : -u[2]) / R.DEG; };
const handProps = (sides) => F.DUMBBELLS.filter((d) => sides.includes(d.attach.joint.slice(-1)));

module.exports = { combine, leftOnHip, pressWrist, pressKeys, palmDown, benchEnd, longSit, clearance, scan, elbowAng, humElev, planeDeg, handProps };
