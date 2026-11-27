// Curl family helpers (batch 3): arm channels for held-dumbbell curls, dumbbell-to-body clearance on the RepRig shapes,
// and loop checks (elbow range, forearm rotation, dumbbell clearance, contacts) shared by the five curl authors.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const D = require('./dumbbell');

// Set one arm's channels. Wrist pron: 0 = palm forward/up (supinated, the rig's anatomical rest), 90 = neutral (thumb up).
function setArm(p, s, a) {
  p.ch[`shoulder_${s}`] = { plane: r1(a.plane), elev: r1(a.elev), axial: r1(a.axial || 0) };
  p.ch[`elbow_${s}`] = { flex: r1(a.flex) };
  p.ch[`wrist_${s}`] = { pron: r1(a.pron || 0), flex: r1(a.wflex || 0), dev: r1(a.wdev || 0) };
  return p;
}
const mixArm = (a, b, f) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = (a[k] || 0) + ((b[k] || 0) - (a[k] || 0)) * f; return o; };

// Approximate signed distance from a point to a rig shape (cm; < 0 inside)
function shapeDist(W, s, p) {
  const g = R.shapeWorld(W, s);
  if (g.kind === 'capsule') {
    const ab = V.sub(g.b, g.a), t = Math.max(0, Math.min(1, V.dot(V.sub(p, g.a), ab) / V.dot(ab, ab)));
    return V.len(V.sub(p, V.add(g.a, V.scale(ab, t)))) - (g.r[0] + (g.r[1] - g.r[0]) * t);
  }
  const d = V.sub(p, g.c), rs = g.axes.map((a) => V.len(a)), loc = g.axes.map((a, i) => V.dot(d, a) / (rs[i] * rs[i]));
  const k = Math.hypot(...loc);
  return (k - 1) * (k < 1 ? Math.min(...rs) : V.len(d) / Math.max(k, 1e-6));
}
// Dumbbell (plates as discs along the axis, handle between) vs every body shape except the holding hand and forearm.
// Returns the smallest clearance (cm) and the shape it is nearest.
function bodyClearance(W, side, grip = 'handle', skip = []) {
  const d = D.dumbbellAt(W, side, grip), own = new Set([`hand_${side}`, `thumb_${side}`, `forearm_${side}`, ...skip]);
  let best = { d: 1e9, id: null };
  const pts = [];
  for (let k = 0; k <= 10; k++) pts.push([V.add(d.ends[1], V.scale(V.sub(d.ends[0], d.ends[1]), k / 10)), Math.abs(k - 5) >= 3 ? d.r : 1.6]);
  // plate rims: sample the disc edge too (hex plates; use the circumscribed radius)
  for (const e of d.ends) {
    const u = V.norm(V.cross(d.ax, Math.abs(d.ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = V.cross(d.ax, u);
    for (let a = 0; a < 12; a++) { const th = (a / 12) * 2 * Math.PI; pts.push([V.add(e, V.add(V.scale(u, Math.cos(th) * d.r), V.scale(w, Math.sin(th) * d.r))), 0]); }
  }
  for (const s of rig.shapes) {
    if (own.has(s.id) || ['eye', 'brow', 'nose', 'ear'].includes(s.base)) continue;
    for (const [p, r] of pts) { const c = shapeDist(W, s, p) - r; if (c < best.d) best = { d: c, id: s.id }; }
  }
  best.d = +best.d.toFixed(1);
  return best;
}
// Angle between the forearm and the upper arm (elbow flexion, deg) and the palm direction in world space
const elbowFlex = (W, s) => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));
const palmDir = (W, s) => V.norm(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]));
// Upper-arm angle from the trunk line in the sagittal view (0 = along the trunk, + = elbow forward / shoulder flexion)
function upperArmFromTrunk(W, s) {
  const tr = V.norm(V.sub(W.pelvis.p, W.neck_c7.p)), ua = V.norm(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p));
  const fwd = V.norm(V.cross([0, 0, 1], tr));
  return Math.atan2(V.dot(ua, fwd), V.dot(ua, tr)) / R.DEG;
}
// Loop check: samples the timeline, reports elbow range per arm, wrist pron range, dumbbell clearance (body, floor,
// bench) and planted contact slide. sides: hands holding dumbbells. bench: box-like {center,size} for clearance or null.
function loopCheck(ex, { sides = ['r', 'l'], benchBox = null, skip = [], n = 600 } = {}) {
  const tl = R.buildTimeline(ex), Dn = ex.timeline.duration, W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  const out = { slide: 0, floor: 1e9, elbow: {}, pron: {}, body: { d: 1e9 }, dbFloor: 1e9, bench: 1e9 };
  for (const s of sides) { out.elbow[s] = [999, -999]; out.pron[s] = [999, -999]; }
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Dn, pose = tl.pose(t), W = R.evalPose(rig, pose, ex.contacts);
    for (const c of ex.contacts || []) {
      const k = pose.ik && pose.ik[c.id]; if (!k || (k.weight ?? 1) < 0.999) continue;
      out.slide = Math.max(out.slide, V.len(V.sub(W[c.chain[2]].p, k.target)));
    }
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    for (const s of sides) {
      const e = elbowFlex(W, s), pr = pose.ch[`wrist_${s}`].pron;
      out.elbow[s] = [Math.min(out.elbow[s][0], e), Math.max(out.elbow[s][1], e)];
      out.pron[s] = [Math.min(out.pron[s][0], pr), Math.max(out.pron[s][1], pr)];
      const b = bodyClearance(W, s, 'handle', skip); if (b.d < out.body.d) out.body = { d: b.d, id: b.id, side: s, t: +t.toFixed(2) };
      out.dbFloor = Math.min(out.dbFloor, D.dumbbellMinY(W, s, 'handle'));
      if (benchBox) out.bench = Math.min(out.bench, D.dumbbellBoxClearance(W, s, benchBox, 'handle'));
    }
  }
  for (const s of sides) out.elbow[s] = out.elbow[s].map(Math.round);
  out.slide = +out.slide.toFixed(3); out.floor = +out.floor.toFixed(2); out.dbFloor = +out.dbFloor.toFixed(1); out.bench = benchBox ? +out.bench.toFixed(1) : null;
  return out;
}
const dumbbells = (sides) => sides.map((s) => ({ id: s === 'r' ? 'dbR' : 'dbL', kind: 'dumbbell', size: [32, 12, 12], attach: { joint: `wrist_${s}`, grip: 'handle' } }));
const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
module.exports = { setArm, mixArm, shapeDist, bodyClearance, elbowFlex, palmDir, upperArmFromTrunk, loopCheck, dumbbells, NOTE };

// Standing curls: feet planted about hip width (leg IK contacts with constant targets), trunk tall, eyes level.
// arms: { poseName: { r: armState, l: armState } } where armState = { plane, elev, twist, flex, pron, wflex }
// (axial = twist - plane keeps the elbow hinge in the sagittal plane whatever the plane of elevation).
function standing(arms, { stance = 11, toeOut = 8, sc = { protract: -2, elevate: 0 } } = {}) {
  const st = L.POSES.standing({ stance, toeOut });
  const contacts = st.contacts;
  const base = clone(st.pose);
  Object.assign(base.ch, { sc_r: clone(sc), sc_l: clone(sc), spine_l5: { rot: 0, flex: 0, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 } });
  const poses = {};
  for (const [name, a] of Object.entries(arms)) {
    const p = clone(base);
    for (const s of ['r', 'l']) { const x = a[s]; setArm(p, s, { plane: x.plane, elev: x.elev, axial: (x.twist || 0) - x.plane, flex: x.flex, pron: x.pron, wflex: x.wflex, wdev: x.wdev }); }
    if (a.root) p.root.pos = a.root.slice();
    poses[name] = p;
  }
  return { contacts, poses, base };
}
module.exports.standing = standing;

// Assemble an exercise module from meta + poses + keyframes; fill the measured kinematics rows shared by the curls.
function assemble(meta, { contacts, poses, keyframes, props }) {
  const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: props || meta.props, contacts,
    timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
  ex.exercise.reference.note = NOTE;
  return ex;
}
const phase = (meta, id) => meta.timeline.phases.find((p) => p.id === id);
function setKin(ex, prefix, field, v) { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; }
// Standard curl rows from a bottom and a top pose (side s)
function fillCurlKin(ex, Wb, Wt, pb, pt, s = 'r', tempo) {
  setKin(ex, 'Elbow flexion', 'setup', `≈${Math.round(elbowFlex(Wb, s))}° (arm straight)`);
  setKin(ex, 'Elbow flexion', 'peak', `≈${Math.round(elbowFlex(Wt, s))}° at the top (range ≈${Math.round(elbowFlex(Wt, s) - elbowFlex(Wb, s))}°)`);
  const pr = (p) => p.ch[`wrist_${s}`].pron, word = (v) => (v < 25 ? 'palm forward/up' : v < 65 ? 'semi-supinated' : 'neutral, thumb up');
  setKin(ex, 'Forearm rotation', 'setup', `${pr(pb)}° (${word(pr(pb))})`);
  setKin(ex, 'Forearm rotation', 'peak', `${pr(pt)}° (${word(pr(pt))})`);
  setKin(ex, 'Upper arm', 'setup', `≈${Math.round(upperArmFromTrunk(Wb, s))}°`);
  setKin(ex, 'Upper arm', 'peak', `≈${Math.round(upperArmFromTrunk(Wt, s))}° (elbow ${upperArmFromTrunk(Wt, s) >= 0 ? 'forward' : 'behind the trunk line'})`);
  if (tempo) { setKin(ex, 'Tempo', 'setup', tempo[0]); setKin(ex, 'Tempo', 'peak', tempo[1]); }
}
Object.assign(module.exports, { assemble, phase, setKin, fillCurlKin });

/* ---------------- Seated on a bench ---------------- */
// Signed distance from a rig shape to a plane through point o with unit normal n (cm; < 0 means it sinks in)
function shapePlaneDist(W, id, o, n) {
  const s = rig.shapes.find((x) => x.id === id), g = R.shapeWorld(W, s);
  if (g.kind === 'capsule') return Math.min(V.dot(V.sub(g.a, o), n) - g.r[0], V.dot(V.sub(g.b, o), n) - g.r[1]);
  return V.dot(V.sub(g.c, o), n) - Math.hypot(...g.axes.map((a) => V.dot(a, n)));
}
// Pad geometry from the bench helper: u along the pad from the hinge, n the surface normal on the athlete's side
// (for a pad rising toward -X, u = (-cos a, sin a, 0) and n = (sin a, cos a, 0)), and the pad slab size
function padFrame(b, width = 30, thick = 6) {
  const u = b.padDir, n = u[0] <= 0 ? [u[1], -u[0], 0] : [-u[1], u[0], 0];
  return { o: b.hinge, u, n: V.norm(n), len: V.len(V.sub(b.tip, b.hinge)), width, thick };
}
// Approximate box distance from a point to the pad slab (> 0 outside)
function padDist(pad, p) {
  const rel = V.sub(p, pad.o), a = V.dot(rel, pad.u), h = V.dot(rel, pad.n);
  return Math.max(-a, a - pad.len, h, -pad.thick - h, Math.abs(rel[2]) - pad.width / 2);
}
// Clearance of the dumbbell (sampled along its axis, plates as radius) to the back pad slab and the seat block
function benchClearance(W, side, pad, seatBox) {
  const d = D.dumbbellAt(W, side, 'handle'); let best = 1e9;
  for (let k = 0; k <= 10; k++) {
    const p = V.add(d.ends[1], V.scale(V.sub(d.ends[0], d.ends[1]), k / 10)), r = Math.abs(k - 5) >= 3 ? d.r : 1.6;
    best = Math.min(best, padDist(pad, p) - r);
  }
  if (seatBox) best = Math.min(best, D.dumbbellBoxClearance(W, side, seatBox, 'handle'));
  return +best.toFixed(1);
}
// Arm capsules (upper arm, forearm) vs the pad slab: smallest clearance (cm)
function armPadClearance(W, side, pad) {
  let best = 1e9;
  for (const [a, b, r0, r1] of [[`shoulder_${side}`, `elbow_${side}`, 4.8, 3.6], [`elbow_${side}`, `wrist_${side}`, 3.9, 2.5]])
    for (let k = 0; k <= 8; k++) { const t = k / 8, p = V.add(W[a].p, V.scale(V.sub(W[b].p, W[a].p), t)); best = Math.min(best, padDist(pad, p) - (r0 + (r1 - r0) * t)); }
  return +best.toFixed(1);
}
Object.assign(module.exports, { shapePlaneDist, padFrame, padDist, benchClearance, armPadClearance });

// Seat the athlete on a bench facing +X: buttocks on the seat, buttocks and upper back on the back pad (offsets in cm let
// the author correct for the skinned mesh, which is measured in the player), head resting on the pad if headOn.
// Returns the trunk pose (no arms) plus leg contacts with the feet flat on the floor at footX ahead of the hip.
function seatOnBench(b, pad, { stance = 17, footDX = 34, seatOff = 0, padOff = 0, lowOff = null, upOff = null, headOff = null, hipAbd = 8, headOn = true, spine = { l5: 0, t12: 0, t6: 0 } } = {}) {
  const st = L.POSES.standing({ stance, toeOut: 8 });
  let p = clone(st.pose); delete p.ik;
  p.root.rot = { pitch: 90 - (b.prop.backAngle || 0) };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: spine.l5, latFlex: 0 }, spine_t12: { rot: 0, flex: spine.t12, latFlex: 0 }, spine_t6: { rot: 0, flex: spine.t6, latFlex: 0 },
    hip_r: { flex: 40, abd: hipAbd, rot: 0 }, hip_l: { flex: 40, abd: hipAbd, rot: 0 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, sc_r: { protract: -6, elevate: 0 }, sc_l: { protract: -6, elevate: 0 } });
  const seatN = [0, 1, 0], seatO = [0, b.top, 0];
  const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => shapePlaneDist(W, id, seatO, seatN)));
  const lowBack = (W) => Math.min(shapePlaneDist(W, 'buttock_r', pad.o, pad.n), shapePlaneDist(W, 'pelvis', pad.o, pad.n));
  const upBack = (W) => Math.min(...['chest', 'ribcage', 'traps_r', 'traps_l'].map((id) => shapePlaneDist(W, id, pad.o, pad.n)));
  p = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [(W) => [(seatY(W) - seatOff) * 3], (W) => [(lowBack(W) - (lowOff ?? padOff)) * 3], (W) => [(upBack(W) - (upOff ?? padOff)) * 3]]).pose;
  if (headOn) { p = L.solvePose(p, ['ch.neck_c7.flex'], [(W) => [(shapePlaneDist(W, 'head', pad.o, pad.n) - (headOff ?? padOff) - 0.3) * 3]]).pose; p.ch.head_c1 = { rot: 0, flex: r1(p.ch.neck_c7.flex * 0.3) }; }
  const W = L.fk(p);
  p.ik = {};
  for (const s of ['r', 'l']) p.ik[`leg_${s}`] = { target: [r1(W.hip_r.p[0] + footDX), L.ANKLE_H, s === 'r' ? stance : -stance], weight: 1 };
  return { pose: p, contacts: st.contacts, measure: (Wx) => ({ seat: +seatY(Wx).toFixed(2), lowBack: +lowBack(Wx).toFixed(2), upBack: +upBack(Wx).toFixed(2), head: +shapePlaneDist(Wx, 'head', pad.o, pad.n).toFixed(2) }) };
}
module.exports.seatOnBench = seatOnBench;
