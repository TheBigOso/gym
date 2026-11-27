// Shoulders 3 family (batch 4): rear delt, rotator cuff and shoulder mobility. Builds on b3-shoulders (standing and hinge
// bases, the held-dumbbell arm solver, clearance scan) and adds:
//   - halfKneel: half-kneeling stance (one knee on the floor with the toes tucked, the other foot flat in front), both legs
//     planted with leg contacts whose targets and foot orientations come from the solved pose (constant, so nothing slides)
//   - seatedFlat: sitting tall on the end of a flat bench (no back support), feet planted
//   - solveLeft: the left arm solved as the mirror image of a right-arm problem (body symmetric about z = 0 above the hips)
//   - kneeFloor / bodyMinY helpers and a scan wrapper for one held dumbbell
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const F = require('./b3-shoulders');
const DB = require('./dumbbell');

const qArr = (q) => q.map((v) => +v.toFixed(6));
const mz = (v) => (v ? [v[0], v[1], -v[2]] : v);
const shapeOf = (id) => rig.shapes.find((x) => x.id === id);
const bottomOf = H.bottomOf;

// Left arm: solve the mirrored right-arm problem on a copy whose right shoulder girdle equals the left one, then copy the
// right arm channels to the left. Valid when the trunk has no rotation / side bend and the root has no yaw / roll.
function solveLeft(pose, spec) {
  const m = clone(pose);
  m.ch.sc_r = clone(pose.ch.sc_l || { protract: 0, elevate: 0 });
  for (const j of ['shoulder', 'elbow', 'wrist']) if (pose.ch[`${j}_l`]) m.ch[`${j}_r`] = clone(pose.ch[`${j}_l`]);
  const q = F.solveArm(m, { ...spec, wrist: mz(spec.wrist), elbow: mz(spec.elbow), palm: mz(spec.palm), thumb: mz(spec.thumb) });
  const out = clone(pose);
  for (const j of ['shoulder', 'elbow', 'wrist']) out.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  out.__errL = q.__err;
  return out;
}
// Lowest point of the knee region of a leg (thigh end + shank start capsules) above the floor, cm (rig shapes)
function kneeLow(W, s) {
  const k = W[`knee_${s}`].p;
  const th = R.shapeWorld(W, shapeOf(`thigh_${s}`)), sh = R.shapeWorld(W, shapeOf(`shank_${s}`));
  return Math.min(th.b[1] - th.r[1], sh.a[1] - sh.r[0], k[1] - 5.4);
}

// Half-kneeling: `down` knee on the floor under the hip (thigh vertical), toes tucked; the other foot flat in front with the
// knee bent about 90 degrees. Trunk tall. Returns { pose, contacts, info }.
// opt: { down: 'r', kneeY: rest height of the down knee joint (cm, set from the skinned mesh), toePitch: foot pitch
//        (heel up, deg), frontKnee: deg, width: half distance between the legs (cm), thigh: down-thigh angle behind vertical,
//        footDrop: lower the tucked foot this far below the rig-shape contact (skinned toes sit higher than the rig foot) }
function halfKneel({ down = 'r', kneeY = 5.4, toePitch = 72, frontKnee = 90, width = 10, thigh = 4, toe = 6, footDrop = 0 } = {}) {
  const up = down === 'r' ? 'l' : 'r', sd = (s) => (s === 'r' ? 1 : -1);
  const st = L.POSES.standing({ stance: width, toeOut: toe });
  const p = clone(st.pose);
  p.root.pos = [0, 60, 0]; p.root.rot = { pitch: 0 };
  p.ch.spine_l5 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: 0, latFlex: 0 };
  p.ch.sc_r = { protract: 2, elevate: 0 }; p.ch.sc_l = { protract: 2, elevate: 0 };
  // down leg by FK: thigh `thigh` degrees behind vertical, knee joint at kneeY; the shin runs back to the ankle, foot pitched
  const TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
  p.root.pos[1] = r1(kneeY + TH * Math.cos(thigh * R.DEG));
  // the down leg's ankle: foot pitched toePitch (heel up), its lowest point on the floor; shin from the knee to the ankle
  const footC = (s, pitch) => Object.assign(L.legContact(s), { handRot: qArr(H.footQ(pitch, s === 'r' ? -toe : toe)) });
  const W0 = L.fk(p), hip = W0[`hip_${down}`].p;
  const knee = [hip[0] - TH * Math.sin(thigh * R.DEG), kneeY, hip[2]];
  // ankle height that puts the foot's lowest point on the floor at this pitch (measured on a probe with the foot rotated)
  const cD = footC(down, toePitch);
  const ankleFor = (ay) => [knee[0] - Math.sqrt(Math.max(1, SH * SH - (ay - kneeY) ** 2)), ay, knee[2]];
  let ay = 12;
  for (let i = 0; i < 30; i++) { const q = clone(p); q.ik = { [cD.id]: { target: ankleFor(ay), weight: 1 } }; const Wq = L.fk(q, [cD]); const lp = H.lowPoint(Wq, `foot_${down}`); ay -= lp[1] - 0.1; }
  ay -= footDrop; // the skinned toes sit higher than the rig foot shape: let the rig foot dip up to footDrop cm
  const tD = ankleFor(ay).map((v) => +v.toFixed(2));
  // front leg: foot flat, shin about vertical, knee at frontKnee
  const cU = footC(up, 0);
  const W1 = L.fk(p), hu = W1[`hip_${up}`].p;
  const fx = (ax) => { const q = clone(p); q.ik = { [cU.id]: { target: [ax, L.ANKLE_H, hu[2]], weight: 1 } }; return H.kneeOf(L.fk(q, [cU]), up); };
  let a = hu[0] + 5, b = hu[0] + 80; // knee flexion falls as the foot moves forward (past the knee-over-ankle point)
  for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (fx(m) > frontKnee) a = m; else b = m; }
  const tU = [r1((a + b) / 2), L.ANKLE_H, r1(hu[2])];
  const contacts = [cD, cU].sort((x, y) => (x.id < y.id ? 1 : -1));
  // poles: both knees bend forward
  for (const c of contacts) c.pole = [1, 0, c.id.endsWith('_r') ? 0.1 : -0.1];
  p.ik = { [`leg_${down}`]: { target: tD, weight: 1 }, [`leg_${up}`]: { target: tU, weight: 1 } };
  let q = p;
  for (const s of ['r', 'l']) q = H.fitLeg(q, s, contacts.find((c) => c.id === `leg_${s}`), q.ik[`leg_${s}`].target);
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in q.ch[j]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  const W = L.fk(q, contacts);
  return { pose: q, contacts, info: { kneeLow: +kneeLow(W, down).toFixed(2), footLow: +H.lowPoint(W, `foot_${down}`)[1].toFixed(2), kneeD: +H.kneeOf(W, down).toFixed(1), kneeU: +H.kneeOf(W, up).toFixed(1), dorsiD: +H.dorsiOf(W, down).toFixed(1), tD, tU } };
}

// Seated tall on the end of a flat bench (pad continues behind, toward -X), thighs on the seat, feet flat in front.
// seatDrop lowers the pelvis (measured on the skinned mesh: the buttocks of the athlete sink a little into the seat).
function seatedFlat({ seatH = 45, stance = 16, toe = 8, hipFlex = 88, footAhead = 4, seatDrop = 0, lean = 0, benchX = null } = {}) {
  const contacts = F.legContacts(toe + 4, toe);
  const st = L.POSES.standing({ stance, toeOut: toe });
  const p = clone(st.pose);
  p.root.rot = { pitch: lean };
  p.ch.spine_l5 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: 0, latFlex: 0 };
  p.ch.sc_r = { protract: 2, elevate: 0 }; p.ch.sc_l = { protract: 2, elevate: 0 };
  p.ch.hip_r = { flex: hipFlex, abd: 6, rot: -4 }; p.ch.hip_l = clone(p.ch.hip_r);
  p.ch.knee_r = { flex: 85 }; p.ch.knee_l = { flex: 85 };
  p.root.pos = [0, 60, 0];
  const bot = (W) => Math.min(bottomOf(W, 'buttock_r'), bottomOf(W, 'thigh_r'));
  p.root.pos[1] = r1(p.root.pos[1] - (bot(L.fk(p)) - seatH) - seatDrop);
  const W = L.fk(p);
  const fx = r1(W.knee_r.p[0] + footAhead);
  p.ik = { leg_r: { target: [fx, L.ANKLE_H, stance], weight: 1 }, leg_l: { target: [fx, L.ANKLE_H, -stance], weight: 1 } };
  let q = F.plantLegs(p, contacts);
  // feet under the knees (shins about vertical): move the foot targets to the solved knees and refit
  for (let it = 0; it < 3; it++) {
    const Wk = L.fk(q, contacts);
    for (const s of ['r', 'l']) q.ik[`leg_${s}`].target[0] = r1(Wk[`knee_${s}`].p[0] + footAhead);
    q = F.plantLegs(q, contacts);
  }
  // bench: seat front edge a little behind the knees (thighs supported over most of their length), pad flat behind
  const Wq = L.fk(q, contacts);
  const front = Wq.knee_r.p[0] - 12;
  const bench = DB.bench({ x: benchX ?? r1(front - 20), angle: 0, height: seatH, back: 80 });
  return { pose: q, contacts, bench };
}

// Arm helpers: elbow flexion and world-space shoulder angles for kinematics rows
const elbowAng = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));
const humElev = (W, s = 'r') => V.angle(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p), V.sub(W.pelvis.p, W.neck_c7.p));
// Smoothstep keyframe times for a set of fractions spread over [t0, t1]
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const easeTimes = (fs, t0, t1) => fs.map((f) => +(t0 + (t1 - t0) * inv(f)).toFixed(3));

// Grip key for a grip with an attach.offset (athlete grip frame [toward fingers, out of palm, little-finger side]) on the
// RepRig skeleton (dumbbell.js GRIP offsets are [palm, -fingers, thumb axis]); same conversion as b3-legs gripSpec
function gripKey(grip, offset) {
  if (!offset) return grip;
  const key = `${grip}@${offset.join(',')}`;
  if (!DB.GRIP[key]) DB.GRIP[key] = { off: [offset[1], -offset[0], -offset[2]], axis: DB.GRIP[grip].axis };
  return key;
}
// Surface points of a held dumbbell (two hex plates as cylinders, s = 7..16 cm from the centre, radius 6)
// size: [length, plate diameter] cm (the player draws a handle of min(14, 0.45 L) and two plates filling the rest)
function platePoints(W, side, grip = 'handle', offset, size = [32, 12]) {
  const d = DB.dumbbellAt(W, side, gripKey(grip, offset)), ax = d.ax;
  const Lh = size[0] / 2, s0 = Math.min(14, size[0] * 0.45) / 2, R0 = size[1] / 2;
  const t = V.norm(V.cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), b = V.cross(ax, t), out = [];
  for (const sg of [-1, 1]) for (const s of [s0, (s0 + Lh) / 2, Lh]) {
    for (let k = 0; k < 12; k++) { const a = (k / 12) * 2 * Math.PI; out.push(V.add(d.c, V.add(V.scale(ax, sg * s), V.add(V.scale(t, Math.cos(a) * R0), V.scale(b, Math.sin(a) * R0))))); }
    if (s === Lh) for (const r of [0, R0 / 2]) for (let k = 0; k < (r ? 6 : 1); k++) { const a = (k / 6) * 2 * Math.PI; out.push(V.add(d.c, V.add(V.scale(ax, sg * s), V.add(V.scale(t, Math.cos(a) * r), V.scale(b, Math.sin(a) * r))))); }
  }
  return out;
}
// Clearance of the listed held dumbbells to the body shapes (skip: shape ids that touch it by design: holding hands)
function heldClear(W, held) {
  let best = { d: 1e9 };
  for (const h of held) {
    const skip = new Set(h.skip || [`hand_${h.side}`, `thumb_${h.side}`, `forearm_${h.side}`]);
    const pts = platePoints(W, h.side, h.grip, h.offset, h.size);
    for (const s of rig.shapes) { if (skip.has(s.id) || /^(eye|brow)/.test(s.id)) continue; for (const p of pts) { const d = F.shapeDist(W, s, p); if (d < best.d) best = { d, what: `db${h.side.toUpperCase()}-${s.id}` }; } }
  }
  return best;
}
const dbLow = (W, held) => Math.min(...held.map((h) => Math.min(...platePoints(W, h.side, h.grip, h.offset, h.size).map((p) => p[1]))));
// Whole-loop report for exercises with any set of held dumbbells (b3-shoulders scan assumes two handle dumbbells)
function scanHeld(ex, held, { planted = ['leg_r', 'leg_l'], probe } = {}) {
  let clr = { d: 1e9 }, floorDb = 1e9, jump = { v: 0 }, prevC = null;
  const ARMCH = ['shoulder_r', 'elbow_r', 'wrist_r', 'sc_r', 'shoulder_l', 'elbow_l', 'wrist_l', 'sc_l'];
  const rep = H.loopReport(ex, { planted, probe: (W, pz, t, out) => {
    if (held.length) { const c = heldClear(W, held); if (c.d < clr.d) clr = { ...c, t: +t.toFixed(2) }; floorDb = Math.min(floorDb, dbLow(W, held)); }
    const cc = {}; for (const j of ARMCH) for (const c in pz.ch[j] || {}) cc[`${j}.${c}`] = pz.ch[j][c];
    if (prevC) for (const k in cc) { const d = Math.abs(cc[k] - (prevC[k] ?? cc[k])); if (d > jump.v) jump = { v: +d.toFixed(2), k, t: +t.toFixed(2) }; }
    prevC = cc;
    if (probe) probe(W, pz, t, out);
  } });
  rep.clear = { d: +clr.d.toFixed(2), what: clr.what, t: clr.t }; rep.dbFloor = +floorDb.toFixed(1); rep.jump = jump;
  return rep;
}

module.exports = { gripKey, platePoints, heldClear, scanHeld, solveLeft, kneeLow, halfKneel, seatedFlat, elbowAng, humElev, easeTimes, mz, qArr };
