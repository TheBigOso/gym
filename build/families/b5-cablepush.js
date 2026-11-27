// Cable push family (batch 5): cable chest flys and presses with two handles, and cable triceps extensions.
// Builds on build/families/eq-cable.js (right-arm solve on the grip point, loop scan, gates) and equip.js (EQ: towers,
// grip points, line clearance) without changing them.
//  - towers / handles: two-handle work uses one D-handle per hand, each on its own cable with its own pulley (anchor) and
//    its own tower: tower_r / handle_r on the right (+Z), tower_l / handle_l mirrored on the left (-Z).
//  - lineScan: clearance of each cable line (pulley to its hand) from the body over the loop, both sides.
//  - flyPath: fly arc with a soft fixed elbow bend and a configurable handle axis / palm direction (generalises the
//    b3-chest flyPath, which keeps the handle along the trunk axis).
//  - tallKneel: tall kneeling, both knees on the floor under the hips, toes tucked (both legs planted, built from the
//    b4-shoulders3 halfKneel down leg on each side).
const L = require('../lib');
const { V, R, r1, clone } = L;
const H = require('./hips');
const EQ = require('./equip');
const C = require('./eq-cable');
const CH = require('./b3-chest');

const mz = (v) => [v[0], v[1], -v[2]];
const near = (v, ref) => v + 360 * Math.round((ref - v) / 360);

// Two towers: the right pulley at anchorR, the left mirrored across the midline; offset [dx, dz] places the right column
// relative to its pulley (the left one mirrored).
function towers(anchorR, { offset = [0, 12], height = 215 } = {}) {
  return [EQ.cableTower(anchorR, { offset, height, id: 'tower_r' }), EQ.cableTower(mz(anchorR), { offset: [offset[0], -offset[1]], height, id: 'tower_l' })];
}
// One D-handle per hand, each on the cable from its own pulley
function handles(anchorR) {
  return [
    { id: 'handle_r', kind: 'cable', attachment: 'handle', anchor: anchorR.slice(), attach: { joint: 'wrist_r' } },
    { id: 'handle_l', kind: 'cable', attachment: 'handle', anchor: mz(anchorR), attach: { joint: 'wrist_l' } },
  ];
}
// Least clearance (cm) of each cable line from the body over the loop. Only the hand and forearm holding that handle are
// skipped (the other arm must stay clear of the cable too).
function lineScan(ex, anchorR, { planted = ['leg_r', 'leg_l'], sides = ['r', 'l'], extra = null } = {}) {
  const out = {};
  for (const s of sides) out[s] = { d: 1e9 };
  const rep = H.loopReport(ex, { planted, probe: (W, pz, t, o) => {
    for (const s of sides) {
      const a = s === 'r' ? anchorR : mz(anchorR), c = EQ.lineClear(W, a, EQ.gripPoint(W, s).p, 0.5, { skip: new RegExp(`^(hand|thumb|forearm)_${s}$`) });
      if (c.d < out[s].d) out[s] = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
    }
    if (extra) extra(W, pz, t, o);
  } });
  rep.lines = out; rep.lineMin = Math.min(...sides.map((s) => out[s].d));
  return rep;
}
// Channel jumps between frames and joint limits (eq-cable scan) without the two-hand grip width
function jumps(ex, planted = ['leg_r', 'leg_l']) { return C.scan(ex, { planted }).jump; }

// Point of a world point to the nearest body shape (cm, < 0 = inside), skipping ids that match skip
function pointClear(W, p, skip = /^(hand|thumb|forearm)_/) {
  let best = { d: 1e9 };
  for (const s of L.rig.shapes) for (const id of s.bilateral ? [`${s.id}_r`, `${s.id}_l`] : [s.id]) { if (skip.test(id)) continue; const d = EQ.pointShape(W, p, id); if (d < best.d) best = { d, id }; }
  return best;
}

// Fly arc for the right arm: the upper arm sweeps from dTop to dBot (world directions, slerp) with the elbow held at a
// soft fixed bend, the forearm bending toward the inside of the arc. ax(f) gives the handle axis (sign-free), palm(f) an
// optional palm direction; keys are solved from the previous one so the channels stay on one branch. Returns [{ f, pose }]
// with f = 0 at dTop ... 1 at dBot.
function flyPath(pose, { dTop, dBot, elbow = 20, n = 6, ax, palm = null, wPalm = 3, seeds = null }) {
  const W = L.fk(pose), S = W.shoulder_r.p, a = V.norm(dTop), b = V.norm(dBot);
  const out = []; let prev = null;
  for (let i = 0; i <= n; i++) {
    const f = i / n, d = CH.slerpV(a, b, f), d2 = CH.slerpV(a, b, Math.min(1, f + 0.01)), d1 = CH.slerpV(a, b, Math.max(0, f - 0.01));
    const tan = V.norm(V.sub(d2, d1)), bend = V.norm(V.sub(V.scale(tan, -1), V.scale(d, V.dot(V.scale(tan, -1), d))));
    const E = V.add(S, V.scale(d, L.UA)), prevCh = prev && clone(prev.ch), axf0 = typeof ax === 'function' ? ax(f) : ax, axf = axf0 ? V.norm(axf0) : null, pf = palm && V.norm(typeof palm === 'function' ? palm(f) : palm);
    const extra = (Wx, qq) => [...V.sub(Wx.elbow_r.p, E).map((v) => v * 3), (V.dot(V.norm(V.sub(Wx.wrist_r.p, Wx.elbow_r.p)), bend) - Math.sin(elbow * R.DEG)) * 6]
      .concat(pf ? V.sub(C.palmOf(Wx), pf).map((v) => v * wPalm) : [])
      .concat(prev ? [(qq.ch.wrist_r.pron - prevCh.wrist_r.pron) * 0.01, (qq.ch.shoulder_r.axial - prevCh.shoulder_r.axial) * 0.01] : []);
    const sd = prev ? [{ shoulder_r: prevCh.shoulder_r, elbow_r: prevCh.elbow_r, wrist_r: prevCh.wrist_r }] : (seeds || [
      { shoulder_r: { plane: 90, elev: 90, axial: 0 }, elbow_r: { flex: elbow }, wrist_r: { pron: 0, flex: 0, dev: 0 } },
      { shoulder_r: { plane: 90, elev: 90, axial: 90 }, elbow_r: { flex: elbow }, wrist_r: { pron: 0, flex: 0, dev: 0 } },
      { shoulder_r: { plane: 90, elev: 90, axial: -90 }, elbow_r: { flex: elbow }, wrist_r: { pron: 90, flex: 0, dev: 0 } },
      { shoulder_r: { plane: 60, elev: 60, axial: 0 }, elbow_r: { flex: elbow }, wrist_r: { pron: 90, flex: 0, dev: 0 } },
      { shoulder_r: { plane: 30, elev: 40, axial: 0 }, elbow_r: { flex: elbow }, wrist_r: { pron: 170, flex: 0, dev: 0 } }]);
    const q = CH.solveArmDB(pose, { c: null, ax: axf, signed: false, elbowFlex: elbow, seeds: sd, extra });
    out.push({ f, pose: q }); prev = q;
  }
  return out;
}
const strip = (p) => { const q = clone(p); delete q.__cost; delete q.__err; return q; };

// Tall kneeling: both knees on the floor under the hips (thighs `thigh` deg behind vertical), toes tucked; leg contacts
// with constant targets. Each leg is the halfKneel down leg (b4-shoulders3) of its own side.
function tallKneel({ width = 11, thigh = 4, toePitch = 72, toe = 6 } = {}) {
  const K = require('./b4-shoulders3');
  const a = K.halfKneel({ down: 'r', width, thigh, toePitch, toe }), b = K.halfKneel({ down: 'l', width, thigh, toePitch, toe });
  const p = clone(a.pose);
  for (const j of ['hip_l', 'knee_l', 'ankle_l']) p.ch[j] = clone(b.pose.ch[j]);
  p.ik = { leg_r: clone(a.pose.ik.leg_r), leg_l: clone(b.pose.ik.leg_l) };
  const contacts = [a.contacts.find((c) => c.id === 'leg_r'), b.contacts.find((c) => c.id === 'leg_l')];
  return { pose: p, contacts, info: { r: a.info, l: b.info } };
}

module.exports = { mz, near, towers, handles, lineScan, jumps, pointClear, flyPath, strip, tallKneel };

/* ---------------- Standing two-handle cable fly (standing fly, low fly) ---------------- */
// Standing between two towers, feet about hip width (planted leg contacts), a slight forward lean. The right arm follows
// flyPath from dTop (hands together in front) to dBot (open), the left mirrors it. Keys follow the b3-chest repKeys
// convention (start hands together, open, stretch, close, squeeze). opt: { anchorR, dTop(Fr), dBot(Fr) (functions of the
// trunk frame), elbow, ax(Fr, f), palm(Fr, f), lean, stance, knee, towerOffset, label }. Returns { ex, info }.
function standFlyModule(meta, opt) {
  const F = require('./b3-shoulders');
  const st = F.standing({ stance: opt.stance ?? 14, knee: opt.knee ?? 8, lean: opt.lean ?? 8 });
  const base = clone(st.pose);
  base.ch.sc_r = opt.sc || { protract: 0, elevate: -2 }; base.ch.sc_l = clone(base.ch.sc_r);
  base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: opt.head ?? -4 };
  const W0 = L.fk(base, st.contacts), Fr = CH.trunkFrame(W0);
  const path = flyPath(base, { dTop: opt.dTop(Fr), dBot: opt.dBot(Fr), elbow: opt.elbow ?? 20, n: opt.n ?? 6, ax: opt.ax ? (f) => opt.ax(Fr, f) : null, palm: opt.palm ? (f) => opt.palm(Fr, f) : null, wPalm: opt.wPalm ?? 3 });
  // repKeys wants f = 0 bottom (open) ... 1 top (hands together)
  const keys = path.map((k) => ({ f: 1 - k.f, pose: C.mirrorArm(strip(k.pose)) })).reverse();
  const T = CH.phaseT(meta);
  // stretch settle: 3 % of the arc back toward the hands-together position, solved from the open key (same branch)
  const pb = path[path.length - 1].pose, dS = CH.slerpV(V.norm(opt.dBot(Fr)), V.norm(opt.dTop(Fr)), 0.03);
  const settle = C.mirrorArm(strip(flyPath(base, { dTop: dS, dBot: opt.dBot(Fr), elbow: opt.elbow ?? 20, n: 1, ax: opt.ax ? (f) => opt.ax(Fr, 1) : null, palm: opt.palm ? (f) => opt.palm(Fr, 0.97) : null, wPalm: opt.wPalm ?? 3, seeds: [{ shoulder_r: pb.ch.shoulder_r, elbow_r: pb.ch.elbow_r, wrist_r: pb.ch.wrist_r }] })[0].pose));
  const { poses, keyframes } = CH.repKeys(keys, T, settle);
  const ex = H.module_(meta, st.contacts, poses, keyframes);
  ex.props = [...towers(opt.anchorR, { offset: opt.towerOffset ?? [-6, 12] }), ...handles(opt.anchorR)];
  return { ex, base, contacts: st.contacts, poses, Fr, path, costs: path.map((k) => +k.pose.__cost.toFixed(2)) };
}
// Shared loop checks for two-handle cable work: feet, floor, both cable lines, the grip points at least minGap apart (hands
// and handles do not clash), the handles clear of the
// body (the D-handle as a point at the grip, radius 3), channel jumps, joint limits. Returns the report (and fails the
// process on a problem).
function checkTwoHandle(name, ex, anchorR, { minLine = 1, minGap = 12, planted = ['leg_r', 'leg_l'], handleSkip = /^(hand|thumb|forearm)_/, minHandle = 0, maxJump = 4 } = {}) {
  let gap = 1e9, hb = { d: 1e9 };
  const rep = lineScan(ex, anchorR, { planted, extra: (W, pz, t) => {
    const a = EQ.gripPoint(W, 'r').p, b = EQ.gripPoint(W, 'l').p; gap = Math.min(gap, V.len(V.sub(a, b)));
    for (const p of [a, b]) { const c = pointClear(W, p, handleSkip); if (c.d - 3 < hb.d) hb = { d: +(c.d - 3).toFixed(2), id: c.id, t: +t.toFixed(2) }; }
  } });
  rep.handleGap = +gap.toFixed(2); rep.handleBody = hb; rep.jump = jumps(ex, planted);
  const bad = [];
  if (rep.slide > 0.05) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < -0.5) bad.push(`below the floor ${rep.floor}`);
  if (rep.lineMin < minLine) bad.push(`cable line clearance ${JSON.stringify(rep.lines)}`);
  if (rep.handleGap < minGap) bad.push(`grip points only ${rep.handleGap} cm apart`);
  if (hb.d < minHandle) bad.push(`handle into the body ${JSON.stringify(hb)}`);
  if (rep.jump.v > maxJump) bad.push(`channel jump ${JSON.stringify(rep.jump)}`);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
  C.limits(ex.poses);
  return rep;
}
module.exports.standFlyModule = standFlyModule; module.exports.checkTwoHandle = checkTwoHandle;

/* ---------------- Two-handle cable chest press (standing, seated) ---------------- */
// Right-arm press path: the grip point moves on a straight line from G0 (handles beside the chest) to G1 (arms extended in
// front, hands a little closer), palms down and slightly forward with the handle across the body (pronated). The end keys
// are solved free (start with a light elbow hint: `flare` deg out from the trunk, `back` deg behind the frontal plane);
// the in-between keys follow the upper arm's slerp between them so the elbow sweeps smoothly. Returns [{ f, pose }],
// f = 0 at the chest ... 1 extended.
function pressPath(base, contacts, { G0, G1, n = 6, flare = 50, back = 30, palm = null, g0 = null, g1 = null }) {
  const W0 = L.fk(base, contacts), Fr = CH.trunkFrame(W0), S = W0.shoulder_r.p;
  const pd = palm || V.norm(V.add(V.scale(Fr.u, -1), V.scale(Fr.v, 0.2)));
  const spec = (G, E, g, w) => ({ grip: G, palm: pd, axis: [0, 0, 1], elbow: E, wElbow: w, guess: g, wGrip: 4 });
  const p0 = C.armR(base, contacts, spec(G0, V.add(S, V.scale(CH.upperArmDir(Fr, flare, back), L.UA)), g0 || { plane: -30, elev: 55, axial: 10, pron: 128, flex: 130 }, 0.6));
  const p1 = C.armR(base, contacts, spec(G1, null, g1 || { plane: 95, elev: 80, axial: -80, pron: 175, flex: 15 }, 0));
  const ua = (p) => { const W = L.fk(p, contacts); return V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); };
  const d0 = ua(p0), d1 = ua(p1), out = [];
  let g = C.guessOf(p0), worst = 0;
  for (let i = 0; i <= n; i++) {
    const f = i / n, G = V.add(G0, V.scale(V.sub(G1, G0), f)), E = V.add(S, V.scale(CH.slerpV(d0, d1, f), L.UA));
    const p = i === 0 ? p0 : i === n ? p1 : C.armR(base, contacts, spec(G, E, g, 1.5));
    worst = Math.max(worst, p.__err.grip); g = C.guessOf(p); out.push({ f, pose: p });
  }
  out.worstGrip = worst;
  return out;
}
module.exports.pressPath = pressPath;
// Trunk lean (neck C7 over the pelvis) as text: forward / back of vertical
function leanText(W) {
  const t = V.sub(W.neck_c7.p, W.pelvis.p), a = Math.atan2(t[0], t[1]) / R.DEG;
  return Math.abs(a) < 2 ? 'Upright (within 2° of vertical)' : `≈${Math.round(Math.abs(a))}° ${a > 0 ? 'forward' : 'back'} of vertical`;
}
module.exports.leanText = leanText;

/* ---------------- Decline bench (head low) ---------------- */
// The player's adjustable bench draws a negative backAngle with a pad support that pokes through the declined pad, so a
// decline is built from an incline bench turned around: the seat (flat, `seatH` high) sits under the head at the -X end and
// the pad rises toward +X at `angle` degrees (backSide +1). The athlete lies head-down on the pad (upper back near the
// hinge, buttocks near the high end, the back of the head resting on or just off the low seat), knees bent over the high
// end, feet planted on the floor (leg contacts). Returns { B (bench geometry), base, contacts, foot }.
function declineBench({ angle = 15, seatH = 40, back = 80, seat = 36, hingeX = -44, buttFromTip = 10, knee = 80, footZ = 22, yaw = 10 } = {}) {
  const DBF = require('./dumbbell');
  const a = angle * R.DEG, bx = hingeX - seat / 2;
  const Bp = DBF.bench({ x: bx, seat, height: seatH, width: 30, angle, back, side: 1 });
  const padN = [-Math.sin(a), Math.cos(a), 0], padD = V.dot(padN, Bp.hinge), seatN = [0, 1, 0], seatD = seatH;
  const B = { ...Bp, angle, padN, padD, seatN, seatD, tipX: Bp.tip[0] };
  const along = (p) => V.dot(V.sub(p, Bp.hinge), Bp.padDir);
  const sup = L.POSES.supine({ kneeFlex: 90 });
  const p0 = clone(sup.pose);
  p0.root.pos = [Bp.tip[0] - 14, Bp.tip[1] + 10, 0]; p0.root.rot = { pitch: 90 + angle };
  p0.ch.spine_l5 = { rot: 0, flex: -4, latFlex: 0 }; p0.ch.spine_t12 = { rot: 0, flex: 4, latFlex: 0 }; p0.ch.spine_t6 = { rot: 0, flex: 4, latFlex: 0 };
  const pad = (W, id) => CH.planeClear(W, id, padN, padD), st = (W, id) => CH.planeClear(W, id, seatN, seatD);
  const lift = CH.HEAD_LIFT;
  const objs = [
    (W) => [pad(W, 'chest') * 4, Math.min(0, pad(W, 'ribcage')) * 4, Math.max(0, pad(W, 'ribcage') - 1.0) * 2, Math.min(0, pad(W, 'abdomen') - 1.0) * 4, Math.min(0, pad(W, 'traps_r')) * 4, Math.min(0, pad(W, 'neck') + 8) * 4],
    (W) => [Math.min(pad(W, 'buttock_r'), pad(W, 'buttock_l')) * 4, Math.min(0, pad(W, 'pelvis')) * 4],
    (W) => { const h = Math.min(pad(W, 'hair'), pad(W, 'head'), st(W, 'hair'), st(W, 'head')) - lift; return [Math.min(0, h) * 4, Math.max(0, h) * 1]; },
    (W) => { const bp = CH.planePoint(W, 'buttock_r', padN); return [(along(bp) - (back - buttFromTip)) * 2]; },
    L.obj.reg('ch.spine_l5.flex', -6, 0.15), L.obj.reg('ch.spine_t12.flex', 2, 0.25), L.obj.reg('ch.spine_t6.flex', 4, 0.4),
    L.obj.reg('ch.neck_c7.flex', 4, 0.2), L.obj.reg('ch.head_c1.flex', 2, 0.2), L.obj.reg('root.rot.pitch', 90 + angle, 0.3),
    (W, q) => [Math.min(0, q.ch.head_c1.flex + 20) * 3, Math.min(0, q.ch.neck_c7.flex + 20) * 3],
  ];
  const paths = ['root.pos.0', 'root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex', 'ch.neck_c7.flex', 'ch.head_c1.flex'];
  let p = L.solvePose(p0, paths, objs, { iters: 600 }).pose;
  for (const k of paths) { const v = L.getPath(p, k); L.setPath ? L.setPath(p, k, r1(v)) : null; }
  p.ch.sc_r = clone(CH.SC); p.ch.sc_l = clone(CH.SC);
  const contacts = CH.footContacts(yaw), fx = CH.footXForKnee(p, contacts, footZ, knee);
  p = CH.plantFeet(p, contacts, fx, footZ);
  const W = L.fk(p, contacts);
  const fit = { chest: +pad(W, 'chest').toFixed(2), ribcage: +pad(W, 'ribcage').toFixed(2), buttock: +pad(W, 'buttock_r').toFixed(2), hairPad: +pad(W, 'hair').toFixed(2), hairSeat: +st(W, 'hair').toFixed(2), buttAlong: +along(CH.planePoint(W, 'buttock_r', padN)).toFixed(1) };
  return { B, base: p, contacts, foot: [fx, L.ANKLE_H, footZ], fit };
}
// Deepest body shape below the decline bench surfaces (pad and low seat) over the bench footprint (cm, > 0 = sunk in)
function declinePen(B, W) {
  const hz = B.prop.size[2] / 2, x0 = B.seatX[0], x1 = B.tip[0]; let worst = { d: -1e9 };
  const ids = L.rig.shapes.filter((s) => !/^(hand|thumb|forearm|upperarm|biceps|deltoid|foot|shank|calf|jaw|nose|ear|eye|brow|neck)/.test(s.id)).flatMap((s) => (s.bilateral ? [`${s.id}_r`, `${s.id}_l`] : [s.id]));
  for (const id of ids) {
    const pp = CH.planePoint(W, id, B.padN), ps = CH.planePoint(W, id, B.seatN);
    if (Math.abs(pp[2]) < hz && pp[0] > B.hinge[0] && pp[0] < x1) { const d = -CH.planeClear(W, id, B.padN, B.padD); if (d > worst.d) worst = { d: +d.toFixed(2), id, on: 'pad' }; }
    if (Math.abs(ps[2]) < hz && ps[0] > x0 && ps[0] < B.hinge[0]) { const d = -CH.planeClear(W, id, B.seatN, B.seatD); if (d > worst.d) worst = { d: +d.toFixed(2), id, on: 'seat' }; }
  }
  return worst;
}
module.exports.declineBench = declineBench; module.exports.declinePen = declinePen;
