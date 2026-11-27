// Cable arms and trunk family (batch 5): cable curls with the upper arms pinned, rope crunches with the hands held at the
// head (kneeling and seated), and the cable side bend. Builds on build/families/eq-cable.js (C: right-arm solver on the
// grip point, loop scan, gate) and equip.js (EQ) without changing them.
//   - curlKeys: right arm (D-handle or bar grip, palm forward / up) solved at a list of elbow angles with the upper arm
//     held still (the shoulder's plane and elevation come from one free solve at mid range), the grip on a fixed z
//   - lowestFlex: the smallest elbow angle at which a held cable bar still clears the body (thighs) by a margin
//   - barClear: a cable bar (size[0] long) as a capsule between the hands, clearance from the body
//   - tallKneel: kneeling on both knees, toes tucked, thighs about vertical; both leg contacts planted
//   - pitchAboutHips: pitch the pelvis (root) about the mid-hip point, so the thighs and knees stay where they are
//   - headHands: right hand on a point fixed in the head frame (rope ends held beside the forehead), palm medial
//   - ropeClear: the rope's knot, its two strands and the cable line, clearance from the body
const L = require('../lib');
const { V, Q, r1, clone } = L;
const H = require('./hips');
const EQ = require('./equip');
const C = require('./eq-cable');
const S3 = require('./b4-shoulders3');

const DEG = Math.PI / 180;

/* ---------------- curls ---------------- */
// Palm direction for a curl with the upper arm uaFwd degrees forward of the trunk line and the elbow bent `flex`: the
// palm faces forward when the forearm hangs and up / back as it rises (perpendicular to the forearm, sagittal plane).
// `pitch`: trunk pitch (deg, + = leaning back) so the frame follows a reclined or leaning trunk.
const palmUp = (uaFwd, flex, pitch = 0) => { const b = (uaFwd + flex - pitch) * DEG; return [Math.cos(b), Math.sin(b), 0]; };
// Elbow world target: upper arm uaFwd degrees forward of vertical (minus the trunk pitch), in line with the shoulder
function elbowAt(W, uaFwd, pitch = 0, s = 'r') {
  const a = (uaFwd - pitch) * DEG;
  return V.add(W[`shoulder_${s}`].p, V.scale([Math.sin(a), -Math.cos(a), 0], L.UA));
}
// Right-arm curl keys. opt: { uaFwd, gz (grip z), flexes {name: deg}, pitch, mid (flex for the free solve), guess }
function curlKeys(base, contacts, { uaFwd = 6, gz = 20, flexes, pitch = 0, mid = 70, guess = null, wAxial = 0.05 } = {}) {
  const W0 = L.fk(base, contacts), E = elbowAt(W0, uaFwd, pitch);
  const g0 = guess || { plane: 20, elev: 8, axial: -15, pron: 2, flex: mid };
  const m = C.armR(base, contacts, { flex: mid, elbow: E, gripZ: gz, axis: [0, 0, 1], palm: palmUp(uaFwd, mid, pitch), guess: g0, axialRef: g0.axial, wAxial: 0.3, wDev: 0.03 });
  const poses = {}, err = { mid: m.__err };
  let g = C.guessOf(m);
  // solve outward from mid range in both directions so each key starts from its neighbour
  const names = Object.keys(flexes).sort((a, b) => flexes[a] - flexes[b]);
  const up = names.filter((n) => flexes[n] >= mid), down = names.filter((n) => flexes[n] < mid).reverse();
  for (const list of [up, down]) {
    g = C.guessOf(m);
    for (const name of list) {
      const flex = flexes[name];
      const p = C.armR(base, contacts, { flex, lockUA: true, gripZ: gz, axis: [0, 0, 1], palm: palmUp(uaFwd, flex, pitch), guess: { ...g, flex }, axialRef: g.axial, wAxial, wDev: 0.03 });
      err[name] = p.__err; g = C.guessOf(p); poses[name] = p;
    }
  }
  return { poses, err, mid: m, elbow: E };
}
// Cable bar (straight bar attachment) between the two grip points: clearance from the body, hands and forearms skipped
function barClear(W, { half = 25, r = 1.5, skip = /^(hand|thumb|forearm)_/ } = {}) {
  const b = EQ.barAt(W);
  return EQ.segmentClear(W, V.add(b.c, V.scale(b.ax, half)), V.sub(b.c, V.scale(b.ax, half)), r, { skip });
}
// One-hand D-handle: the grip point as a small sphere (radius r) vs the body, the holding hand / forearm skipped
function handleClear(W, { side = 'r', r = 3, ids = null } = {}) {
  const g = EQ.gripPoint(W, side).p, own = new RegExp(`^(hand|thumb|forearm)_${side}$`);
  let best = { d: 1e9 };
  for (const id of ids || shapeIds()) { if (own.test(id)) continue; const d = EQ.pointShape(W, g, id) - r; if (d < best.d) best = { d, id }; }
  return best;
}
let SHAPES = null;
const shapeIds = () => SHAPES || (SHAPES = L.rig.shapes.flatMap((s) => (s.bilateral ? [`${s.id}_r`, `${s.id}_l`] : [s.id])).filter((id) => !/^(eye|brow|nose|ear)/.test(id)));

/* ---------------- kneeling ---------------- */
// Tall kneeling: both knees on the floor under the hips (thighs `thigh` degrees behind vertical), toes tucked. Built from
// two half-kneel solves (b4-shoulders3), one per down leg. Returns { pose, contacts, info }.
function tallKneel({ width = 11, toe = 6, toePitch = 72, thigh = 0, kneeY = 5.4 } = {}) {
  const a = S3.halfKneel({ down: 'r', width, toe, toePitch, thigh, kneeY }), b = S3.halfKneel({ down: 'l', width, toe, toePitch, thigh, kneeY });
  const cR = a.contacts.find((c) => c.id === 'leg_r'), cL = b.contacts.find((c) => c.id === 'leg_l');
  const contacts = [cR, cL];
  let p = clone(a.pose);
  p.ik = { leg_r: { target: a.info.tD, weight: 1 }, leg_l: { target: b.info.tD, weight: 1 } };
  for (const s of ['r', 'l']) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target);
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in p.ch[j]) p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  return { pose: p, contacts, info: { tR: a.info.tD, tL: b.info.tD, dorsi: a.info.dorsiD, knee: a.info.kneeD } };
}
// Pitch the root to `pitch` keeping the mid-hip point fixed (thighs, knees and planted feet do not move); legs re-fitted
function pitchAboutHips(pose, contacts, pitch) {
  const mid = (W) => V.scale(V.add(W.hip_r.p, W.hip_l.p), 0.5);
  const h0 = mid(L.fk(pose, contacts));
  let p = clone(pose);
  p.root.rot = { ...(p.root.rot || {}), pitch };
  for (let i = 0; i < 4; i++) { const d = V.sub(mid(L.fk(p, contacts)), h0); p.root.pos = p.root.pos.map((v, k) => v - d[k]); }
  p.root.pos = p.root.pos.map((v) => +v.toFixed(3));
  if (p.ik) for (const c of contacts) if (p.ik[c.id]) p = H.fitLeg(p, c.id.slice(-1), c, p.ik[c.id].target);
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) if (p.ch[j]) for (const c in p.ch[j]) p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  return p;
}

/* ---------------- rope at the head ---------------- */
const headPt = (W, v) => V.add(W.head_c1.p, Q.rot(W.head_c1.q, v));
// Right hand's grip point on a head-frame point (rope end held beside the forehead), palm toward the midline, then the
// left arm mirrored (the trunk only flexes in the sagittal plane, so the grip width stays 2 |z|).
function headHands(pose, contacts, { at = [15, 0, 11], guess = null } = {}) {
  const W = L.fk(pose, contacts), target = headPt(W, at);
  const g = guess || { plane: 45, elev: 130, axial: -40, pron: 80, flex: 140 };
  const p = C.armR(pose, contacts, { grip: target, wGrip: 4, palm: [0, 0, -1], wPalm: 1.5, guess: g, axialRef: g.axial, wAxial: 0.02, wDev: 0.05 });
  const err = p.__err;
  C.mirrorArm(p);
  return { pose: p, err };
}
// Rope clearance: the cable line (knot to pulley) and the two strands (knot to each grip), radius 0.5 and 1.2 cm
function ropeClear(W, anchor, { skip = /^(hand|thumb|forearm)_/ } = {}) {
  const knot = EQ.attachPoint(W, { two: true, rope: true, anchor }), b = EQ.barAt(W);
  const line = EQ.segmentClear(W, knot, anchor, 0.5, { skip, n: 16 });
  const sr = EQ.segmentClear(W, knot, b.r, 1.2, { skip, n: 10 }), sl = EQ.segmentClear(W, knot, b.l, 1.2, { skip, n: 10 });
  const strand = sr.d < sl.d ? sr : sl;
  return { line, strand, knot };
}

module.exports = { palmUp, elbowAt, curlKeys, barClear, handleClear, tallKneel, pitchAboutHips, headPt, headHands, ropeClear, DEG };
