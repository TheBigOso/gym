// Batch 6 family b6-08 (cable rows, pulldowns, flys, overhead triceps work). Builds on equip.js (EQ), eq-cable.js (C),
// b5-cablepull.js (B: seated box base, pullKeys / pullFrames) and b5-cablepush.js (P: towers, handles, flyPath,
// tallKneel) without changing them.
//  - vbar: a close-grip V-handle is drawn with the cable 'bar' attachment, VBAR.len cm long, held with a neutral grip
//    (palms facing, the handle axis vertical in each fist); the player has no dedicated V-handle mesh.
//  - measure: the peak of the meta's checks.measure over the loop, as test/verify.mjs computes it, checked against the
//    expected range.
//  - twoHandChecks: the usual loop checks for a two-hand cable attachment (feet, floor, jumps, constant grip width, cable
//    line clear of the body, the handle / bar clear of the body, thighs on the seat, cable over the foot plate, rope
//    strands clear).
const L = require('../lib');
const { R, V, rig, r1 } = L;
const H = require('./hips');
const EQ = require('./equip');
const C = require('./eq-cable');
const B = require('./b5-cablepull');

const VBAR = { len: 20, half: 8 }; // V-handle: 20 cm drawn, grip points 16 cm apart
const vbarProp = (anchor, id = 'vbar') => ({ id, kind: 'cable', attachment: 'bar', size: [VBAR.len, 3, 3], anchor: anchor.slice(), attach: { joint: 'wrist_r', with: 'wrist_l' } });
const barProp = (anchor, len, id = 'bar') => ({ id, kind: 'cable', attachment: 'bar', size: [len, 3, 3], anchor: anchor.slice(), attach: { joint: 'wrist_r', with: 'wrist_l' } });
const ropeProp = (anchor, id = 'rope') => ({ id, kind: 'cable', attachment: 'rope', anchor: anchor.slice(), attach: { joint: 'wrist_r', with: 'wrist_l' } });

// Peak of checks.measure over the loop (same formulas as test/verify.mjs)
function measurePeak(ex) {
  const m = ex.checks && ex.checks.measure; if (!m) return null;
  const tl = R.buildTimeline(ex), D = ex.timeline.duration; let peak = -1e9; const W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  for (let i = 0; i <= 800; i++) {
    const pose = tl.pose((i / 800) * D), W = R.evalPose(rig, pose, ex.contacts); let v;
    if (m.name === 'trunkFlexion') v = V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
    else if (m.name === 'hipFlexion') v = Math.max(pose.ch.hip_r?.flex ?? 0, pose.ch.hip_l?.flex ?? 0);
    else if (m.name === 'kneeFlexion') v = Math.max(R.measures(W).knee, 180 - V.angle(V.sub(W.hip_l.p, W.knee_l.p), V.sub(W.ankle_l.p, W.knee_l.p)));
    else if (m.name === 'rootTravel') v = V.len(V.sub(W.pelvis.p, W0.pelvis.p));
    else return null;
    peak = Math.max(peak, v);
  }
  return +peak.toFixed(1);
}
function checkMeasure(id, ex) {
  const pk = measurePeak(ex), m = ex.checks.measure;
  if (pk != null && (pk < m.min || pk > m.max)) { console.error(`FAIL ${id}: peak ${m.name} ${pk} outside ${m.min}-${m.max}`); process.exitCode = 1; }
  return pk;
}

// Loop checks for a two-hand cable attachment. opt: { anchor, barLen (bar / V-handle length; omit for a rope), rope,
// seat, plate, planted, minLine, minBar, bodyIds (shapes the grip points must stay 3 cm clear of) }
function twoHandChecks(id, ex, { anchor, barLen = null, rope = false, seat = null, plate = null, planted = ['leg_r', 'leg_l'], minLine = 1, minBar = 0.5, bodyIds = null } = {}) {
  const end = (W) => EQ.attachPoint(W, { two: true, rope, anchor });
  const rep = C.scan(ex, { planted, line: (W) => [anchor, end(W)] });
  let barClr = { d: 1e9 }, seatLow = 1e9, plateClr = 1e9, strand = { d: 1e9 }, hand = { d: 1e9 };
  H.loopReport(ex, { planted, probe: (W, pz, t) => {
    if (barLen) { const b = EQ.barAt(W), c = EQ.segmentClear(W, V.add(b.c, V.scale(b.ax, barLen / 2)), V.sub(b.c, V.scale(b.ax, barLen / 2)), 1.5, { skip: /^(hand|thumb|forearm)_/ }); if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; }
    if (rope) { const rc = B.ropeClear(W, anchor); if (rc.d < strand.d) strand = { d: +rc.d.toFixed(2), id: rc.id, t: +t.toFixed(2) }; }
    if (seat) seatLow = Math.min(seatLow, B.thighOnSeat(W, seat));
    if (plate) plateClr = Math.min(plateClr, B.segBox(anchor, end(W), plate));
    if (bodyIds) for (const s of ['r', 'l']) { const gp = EQ.gripPoint(W, s).p; for (const bid of bodyIds) { const d = EQ.pointShape(W, gp, bid) - 3; if (d < hand.d) hand = { d: +d.toFixed(2), id: bid, t: +t.toFixed(2) }; } }
  } });
  C.gate(id, rep, { minLine });
  C.limits(ex.poses);
  const fail = (m) => { console.error(`FAIL ${id}: ${m}`); process.exitCode = 1; };
  if (barLen && barClr.d < minBar) fail(`bar into the body ${JSON.stringify(barClr)}`);
  if (rope && strand.d < 0) fail(`rope into the body ${JSON.stringify(strand)}`);
  if (seat && seatLow < -1.5) fail(`thighs into the seat ${seatLow.toFixed(2)}`);
  if (plate && plateClr < 1) fail(`cable into the foot plate ${plateClr.toFixed(2)}`);
  if (bodyIds && hand.d < 0) fail(`hands into the body ${JSON.stringify(hand)}`);
  if (rep.dorsiR[1] > 35 || rep.kneeR[1] > 150) fail(`leg limits ${rep.dorsiR} ${rep.kneeR}`);
  const peak = checkMeasure(id, ex);
  return { rep, barClr, seatLow: +seatLow.toFixed(2), plateClr: +plateClr.toFixed(2), strand, hand, peak };
}

// B.pullKeys with two options: reverse (solve from the end key back to the start, so the near-straight-arm keys inherit
// the bent-arm branch of shoulder axial rotation / forearm pronation instead of flipping between the two equivalent
// solutions) and wAxial (stronger pull of the axial rotation toward the previous key). Same names and returns.
function pullKeys2({ N = 12, contacts, trunkAt, gripAt, elbowAt = null, palmAt, axis = null, axisAt = null, wElbowAt = () => 0.5, flexAt = null, guess, mirror = true, post = null, wPalm = 3, wFlex = 0.08, wristFlex = 0, reverse = true, wAxial = 0.004 }) {
  const poses = {}, err = {}, names = [];
  let g = guess;
  const order = [...Array(N + 1).keys()]; if (reverse) order.reverse();
  for (const i of order) {
    const f = i / N, k = B.ease(f), name = i === 0 ? 'start' : i === N ? 'end' : `k${i}`;
    const p = trunkAt(f, k), W = L.fk(p, contacts);
    const spec = { grip: gripAt(f, k, W, p), palm: palmAt(f, k, W), guess: { ...g }, wPalm, wFlex, wristFlex, wDev: 0.05, axialRef: g.axial, wAxial };
    const ax = axisAt ? axisAt(f, k, W) : axis; if (ax) spec.axis = ax;
    const el = elbowAt ? elbowAt(f, k, W) : null; if (el) { spec.elbow = el; spec.wElbow = wElbowAt(k); }
    if (flexAt) { spec.flex = flexAt(k); spec.guess.flex = spec.flex; }
    let q = C.armR(p, contacts, spec);
    err[name] = q.__err; g = C.guessOf(q);
    q = mirror ? C.mirrorArm(q) : C.strip(q);
    if (post) q = post(q, f, k);
    poses[name] = q;
  }
  for (let i = 0; i <= N; i++) names.push(i === 0 ? 'start' : i === N ? 'end' : `k${i}`);
  poses.endHold = L.clone(poses.end); poses.startHold = L.clone(poses.start);
  return { poses, err, names };
}

// Kneeling (tall or half) base leaned `lean` deg (+ forward, - back) about the hip joints: root pitch set, root moved so
// the mid-hip point stays put, legs refitted to the same contact targets. Optional spine channels.
function kneelLean(kn, lean, { spine = null } = {}) {
  let p = L.clone(kn.pose);
  const W0 = L.fk(p, kn.contacts), hm0 = V.scale(V.add(W0.hip_r.p, W0.hip_l.p), 0.5);
  p.root.rot = { ...(p.root.rot || {}), pitch: -lean };
  if (spine) for (const j in spine) p.ch[j] = { ...p.ch[j], ...spine[j] };
  const W1 = L.fk(p, kn.contacts), hm1 = V.scale(V.add(W1.hip_r.p, W1.hip_l.p), 0.5);
  p.root.pos = V.add(p.root.pos, V.sub(hm0, hm1)).map((v) => +v.toFixed(2));
  for (const s of ['r', 'l']) p = H.fitLeg(p, s, kn.contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target);
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in p.ch[j]) p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  return p;
}

const d = (v) => `≈${Math.round(v)}°`;
// shoulder extension: upper arm angle from the trunk line (in front = small)
const shExt = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p), tr = V.sub(W.neck_c7.p, W.pelvis.p); return 180 - V.angle(u, tr); };

module.exports = { kneelLean, pullKeys2, VBAR, vbarProp, barProp, ropeProp, measurePeak, checkMeasure, twoHandChecks, d, shExt };
