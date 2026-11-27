// Batch 5 cable pulls (rows, pulldowns, reverse fly): seated-on-a-box bases (feet braced on a box foot plate, or flat on
// the floor), trunk lean with the buttocks kept on the seat, a two-hand row arm solve on the cable attachment, and
// clearance checks of the cable line against box props. Builds on equip.js (EQ), eq-cable.js (C) and hips.js (H)
// without changing them.
const L = require('../lib');
const { R, V, Q, r1, clone } = L;
const H = require('./hips');
const F = require('./b3-shoulders');
const EQ = require('./equip');
const C = require('./eq-cable');

const bis = (lo, hi, fn) => { for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (fn(m)) lo = m; else hi = m; } return (lo + hi) / 2; };
// extreme point of a rig shape along a world direction (ellipsoid or capsule)
const builtShapes = R.buildRig(L.rigDef).shapes;
const shapeById = (id) => builtShapes.find((s) => s.id === id);
function extreme(W, id, dir) {
  const g = R.shapeWorld(W, shapeById(id)), d = V.norm(dir);
  if (g.kind === 'capsule') { const pa = V.add(g.a, V.scale(d, g.r[0])), pb = V.add(g.b, V.scale(d, g.r[1])); return V.dot(pa, d) > V.dot(pb, d) ? pa : pb; }
  const k = Math.hypot(...g.axes.map((a) => V.dot(a, d)));
  return V.add(g.c, V.scale(g.axes.reduce((acc, a) => V.add(acc, V.scale(a, V.dot(a, d))), [0, 0, 0]), 1 / k));
}

const legC = (s, { pole = [0.2, 1, 0.15], pitch = 0, yaw = 6 } = {}) => H.legC(s, { pole: [pole[0], pole[1], s === 'r' ? pole[2] : -pole[2]], rot: H.footQ(pitch, s === 'r' ? -yaw : yaw) });

// Seated on a box seat facing +X. feet 'plate': legs reach forward, soles braced on the near face of a box foot plate
// (foot pitched toes-up by `toeUp` deg, knees bent `knee` deg); feet 'floor': feet flat under / just ahead of the knees.
// Returns { pose, contacts, seat (box prop), plate (box prop or null), seatPt (buttock low point kept on the seat) }.
function seatedBox({ seatH = 46, stance = 15, lean = 0, feet = 'plate', knee = 22, toeUp = 80, dorsi = 26, footAhead = 5, hipAbd = 6, seatDepth = 34, seatW = 36, plateD = 24, plateW = 56 } = {}) {
  const pitch = feet === 'plate' ? -toeUp : 0;
  const contacts = ['r', 'l'].map((s) => legC(s, feet === 'plate' ? { pole: [0.15, 1, 0.12], pitch } : { pole: [1, 0.1, 0.12], pitch: 0 }));
  const st = L.POSES.standing({ stance, toeOut: 6 }), p = clone(st.pose);
  p.root.rot = { pitch: r1(-lean) };
  p.ch.spine_l5 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: 2, latFlex: 0 };
  p.ch.hip_r = { flex: 85, abd: hipAbd, rot: -4 }; p.ch.hip_l = clone(p.ch.hip_r);
  p.ch.knee_r = { flex: feet === 'plate' ? knee : 85 }; p.ch.knee_l = clone(p.ch.knee_r);
  p.root.pos = [0, 60, 0];
  for (let i = 0; i < 3; i++) p.root.pos[1] = r1(p.root.pos[1] - (H.bottomOf(L.fk(p), 'buttock_r') - seatH));
  const W0 = L.fk(p), seatPt = H.lowPoint(W0, 'buttock_r');
  let target;
  if (feet === 'plate') {
    // ankle (x, y) so the knee bends `knee` and the ankle dorsiflexes `dorsi` with the foot pitched toes-up
    const c = contacts[0];
    const res = (x) => { const q = clone(p); q.ik = { leg_r: { target: [x[0], x[1], stance], weight: 1 } }; const W = L.fk(q, [c]); return [(H.kneeOf(W, 'r') - knee) * 0.5, (H.dorsiOf(W, 'r') - dorsi) * 0.5]; };
    const x = R.solveLM([W0.hip_r.p[0] + 75, 25], res, { iters: 300 }).x;
    target = [r1(x[0]), r1(x[1])];
  } else target = [r1(W0.knee_r.p[0] + footAhead), L.ANKLE_H];
  p.ik = { leg_r: { target: [target[0], target[1], stance], weight: 1 }, leg_l: { target: [target[0], target[1], -stance], weight: 1 } };
  const q = F.plantLegs(p, contacts);
  const W = L.fk(q, contacts);
  const seat = { id: 'seat', kind: 'box', center: [r1(seatPt[0] + 3), 0, 0], size: [seatDepth, seatH, seatW] };
  let plate = null;
  if (feet === 'plate') {
    const face = Math.max(extreme(W, 'foot_r', [1, 0, 0])[0], extreme(W, 'foot_l', [1, 0, 0])[0]);
    const top = Math.max(extreme(W, 'foot_r', [0, 1, 0])[1], extreme(W, 'foot_l', [0, 1, 0])[1]);
    plate = { id: 'footplate', kind: 'box', center: [r1(face + plateD / 2), 0, 0], size: [plateD, r1(top + 2), plateW] };
  }
  return { pose: q, contacts, seat, plate, seatPt, seatH, feet };
}
// Same seat with the trunk leaned `lean` deg (+ forward) about the buttocks: root pitch set, root x / y solved so the
// buttock low point stays on the seat at seatPt, legs re-planted on the same targets. Optional spine channels.
function leanTo(base, lean, { spine = null } = {}) {
  const p = clone(base.pose);
  p.root.rot = { ...p.root.rot, pitch: -lean };
  if (spine) for (const j in spine) p.ch[j] = { ...p.ch[j], ...spine[j] };
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1'], [(W) => { const lp = H.lowPoint(W, 'buttock_r'); return [(lp[0] - base.seatPt[0]) * 3, (lp[1] - base.seatPt[1]) * 3]; }], { iters: 100 });
  const q = s.pose; q.root.pos = q.root.pos.map((v) => +v.toFixed(2));
  return F.plantLegs(q, base.contacts);
}

// Clearance (cm, < 0 = inside) of a segment (radius r) from an axis-aligned box prop (center y = bottom)
function segBox(a, b, box, r = 0.5, n = 24) {
  const [cx, cy, cz] = box.center, [sx, sy, sz] = box.size, lo = [cx - sx / 2, cy, cz - sz / 2], hi = [cx + sx / 2, cy + sy, cz + sz / 2];
  let best = 1e9;
  for (let k = 0; k <= n; k++) {
    const p = V.add(a, V.scale(V.sub(b, a), k / n)), q = p.map((v, i) => Math.max(lo[i], Math.min(hi[i], v)));
    const inside = p.every((v, i) => v > lo[i] && v < hi[i]);
    best = Math.min(best, (inside ? -1 : 1) * V.len(V.sub(p, q)) - r);
  }
  return best;
}
// Body shapes vs the top of the seat box: the lowest point of the thighs inside the seat footprint (cm above the top;
// < 0 = into the seat)
function thighOnSeat(W, seat) {
  const [cx, , cz] = seat.center, [sx, sy, sz] = seat.size; let low = 1e9;
  for (const s of ['r', 'l']) {
    const a = W[`hip_${s}`].p, b = W[`knee_${s}`].p;
    for (let k = 0; k <= 20; k++) { const t = k / 20, p = V.add(a, V.scale(V.sub(b, a), t)), rr = 8.6 + (5.3 - 8.6) * t; if (Math.abs(p[0] - cx) <= sx / 2 && Math.abs(p[2] - cz) <= sz / 2) low = Math.min(low, p[1] - rr - sy); }
  }
  return low;
}

// Two-hand (bar / rope) arm solve: right grip on `grip`, palm `palm`, handle axis `axis`, elbow drawn toward `elbow`
// (weight wElbow), then mirrored to the left.
function rowArm(pose, contacts, { grip, palm, axis, elbow = null, wElbow = 0.6, guess, sc = null, wPalm = 3, wristFlex = 0, wFlex = 0.08 }) {
  const p0 = clone(pose); if (sc) { p0.ch.sc_r = clone(sc); }
  const q = C.armR(p0, contacts, { grip, palm, axis, elbow, wElbow, guess, wPalm, wristFlex, wFlex, wDev: 0.05, axialRef: guess.axial, wAxial: 0.004 });
  const err = q.__err; const out = C.mirrorArm(q); return { pose: out, err, guess: C.guessOf(out) };
}

// Rope: the knot sits 16 cm from the grips' midpoint toward the anchor; the two strands run from the knot to the hands.
// Rope-strand clearance from the body (skipping the hands and forearms that hold it).
function ropeClear(W, anchor) {
  const b = EQ.barAt(W), knot = V.add(b.c, V.scale(V.norm(V.sub(anchor, b.c)), 16));
  const r = EQ.segmentClear(W, knot, b.r, 1.2, { skip: /^(hand|thumb|forearm)_/ }), l = EQ.segmentClear(W, knot, b.l, 1.2, { skip: /^(hand|thumb|forearm)_/ });
  return r.d < l.d ? r : l;
}


const ease = (f) => f * f * (3 - 2 * f);
// Keys along a pull, f = i / N (i = 0..N), k = ease(f) for positions (so evenly timed keys give an ease-in-out):
//   trunkAt(f, k) -> base pose (trunk, shoulder girdle, legs); gripAt(f, k, W, pose) -> right grip target (world);
//   elbowAt(f, k, W) -> elbow target or null; palmAt(f, k, W) -> palm dir; axis: handle axis (or axisAt(f, k));
//   wElbowAt(k); flexAt(k) fixes the elbow flexion (straight-arm moves); mirror copies the right arm to the left;
//   post(pose, f, k) may finish the pose (e.g. the free arm). Returns { poses, err, names } with names start, k1.., end.
function pullKeys({ N = 12, contacts, trunkAt, gripAt, elbowAt = null, palmAt, axis = null, axisAt = null, wElbowAt = () => 0.5, flexAt = null, guess, mirror = true, post = null, wPalm = 3, wFlex = 0.08, wristFlex = 0, gripZ = null }) {
  const poses = {}, err = {}, names = [];
  let g = guess;
  for (let i = 0; i <= N; i++) {
    const f = i / N, k = ease(f), name = i === 0 ? 'start' : i === N ? 'end' : `k${i}`;
    const p = trunkAt(f, k), W = L.fk(p, contacts);
    const spec = { grip: gripAt(f, k, W, p), palm: palmAt(f, k, W), guess: { ...g }, wPalm, wFlex, wristFlex, wDev: 0.05, axialRef: g.axial, wAxial: 0.004 };
    const ax = axisAt ? axisAt(f, k, W) : axis; if (ax) spec.axis = ax;
    const el = elbowAt ? elbowAt(f, k, W) : null; if (el) { spec.elbow = el; spec.wElbow = wElbowAt(k); }
    if (flexAt) { spec.flex = flexAt(k); spec.guess.flex = spec.flex; }
    let q = C.armR(p, contacts, spec);
    err[name] = q.__err; g = C.guessOf(q);
    q = mirror ? C.mirrorArm(q) : C.strip(q);
    if (post) q = post(q, f, k);
    poses[name] = q; names.push(name);
  }
  poses.endHold = clone(poses.end); poses.startHold = clone(poses.start);
  return { poses, err, names };
}
// Keyframes for pullKeys: hold `start` through the first phase, keys evenly over `go`, hold over `hold`, keys back over
// `back`, rest at the start over `rest`.
function pullFrames(meta, names, { go, hold, back, rest }) {
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration, N = names.length - 1, kf = [{ t: 0, pose: 'start' }];
  for (let i = 0; i <= N; i++) kf.push({ t: +(ph[go].start + (ph[go].end - ph[go].start) * i / N).toFixed(3), pose: names[i] });
  kf.push({ t: ph[hold].end, pose: 'endHold' });
  for (let i = N - 1; i >= 1; i--) kf.push({ t: +(ph[back].start + (ph[back].end - ph[back].start) * (N - i) / N).toFixed(3), pose: names[i] });
  kf.push({ t: ph[rest].start, pose: 'startHold' }, { t: D, pose: 'start' });
  return kf;
}
// direction from shoulder plane / elevation (deg), right side: plane 0 = out to the side, 90 = forward
const armDir = (plane, elev) => { const e = elev * R.DEG, p = plane * R.DEG; return [Math.sin(e) * Math.sin(p), -Math.cos(e), Math.sin(e) * Math.cos(p)]; };
const lerpV = (a, b, k) => V.add(V.scale(a, 1 - k), V.scale(b, k));
// trunk angle from vertical (deg, + forward) and the upper arm's angle from the trunk line
const trunkDeg = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]) * Math.sign(W.neck_c7.p[0] - W.pelvis.p[0] || 1);
const armTrunk = (W, s = 'r') => V.angle(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p), V.sub(W.pelvis.p, W.neck_c7.p));

// Left hand on the left hip (iliac crest) for a pose whose trunk may be rotated: solve on the mirror image (spine
// rotation and side bend negated) with hips.js handsOnHips, then take its right arm as the left arm.
function leftHandOnHip(pose) {
  const m = clone(pose);
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6', 'neck_c7', 'head_c1']) if (m.ch[j]) { if (m.ch[j].rot != null) m.ch[j].rot = -m.ch[j].rot; if (m.ch[j].latFlex != null) m.ch[j].latFlex = -m.ch[j].latFlex; }
  const h = H.handsOnHips(m), q = clone(pose);
  for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) q.ch[`${j}_l`] = clone(h.ch[`${j}_r`]);
  return q;
}

module.exports = { leftHandOnHip, seatedBox, leanTo, segBox, thighOnSeat, rowArm, ropeClear, extreme, legC, bis, ease, pullKeys, pullFrames, armDir, lerpV, trunkDeg, armTrunk };
