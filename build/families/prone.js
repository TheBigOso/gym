// Prone / floor family (batch 2): front plank, side plank, superman, bird dog.
// Shared helpers for floor work on a mat:
//   - shape bottoms (lowest point of any rig shape) and a floor sweep
//   - FK channel fitting for IK limbs (arm and leg), so stored channels match what is drawn and weight blends are seamless
//   - forearm contacts: the elbow sits on the mat directly under the shoulder; the wrist is the IK target and a downward
//     pole puts the elbow back on its mat point as long as the shoulder stays UA from it (solves keep it on that sphere)
//   - a timeline sweep that measures planted-contact slide (wrist / ankle vs target) and the drift of extra points that
//     must not move (elbows, knees) while their limb is weighted
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;

const qArr = (q) => q.map((v) => +v.toFixed(6));
const shape = (id) => rig.shapes.find((s) => s.id === id);
// Lowest point (y) of one shape in a solved frame W.
function bottomOf(W, id) {
  const g = R.shapeWorld(W, shape(id));
  return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]);
}
const UA = V.len(rig.byId.elbow_r.offset), FA = V.len(rig.byId.wrist_r.offset);
const FOREARM_R = shape('forearm_r').r;            // [elbow end, wrist end]
const ELBOW_Y = FOREARM_R[0];                       // elbow joint height with the forearm on the mat
const kneeAngle = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
const elbowAngle = (W, s) => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));

// Fit FK arm channels (shoulder, elbow, wrist) to the IK solution of contact `cid` (side s).
function fitArm(pose, s, contacts, cid) {
  const c = contacts.find((x) => x.id === (cid || `arm_${s}`));
  const tmp = clone(pose); tmp.ik = { [c.id]: Object.assign({}, pose.ik[c.id], { weight: 1 }) };
  const Wi = L.fk(tmp, [c]);
  const paths = [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`];
  const hq = Wi[`wrist_${s}`].q;
  const objs = [L.obj.at(`elbow_${s}`, Wi[`elbow_${s}`].p, 3), L.obj.at(`wrist_${s}`, Wi[`wrist_${s}`].p, 3),
    (W) => [...V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), Q.rot(hq, [1, 0, 0])), ...V.sub(Q.rot(W[`wrist_${s}`].q, [0, 1, 0]), Q.rot(hq, [0, 1, 0]))].map((v) => v * 6),
    L.obj.reg(`ch.wrist_${s}.dev`, 0, 0.02), L.obj.reg(`ch.wrist_${s}.flex`, 0, 0.005)];
  let best = null;
  const sh = pose.ch[`shoulder_${s}`] || { plane: 90, elev: 80, axial: 0 };
  for (const g of [[sh.plane, sh.elev, sh.axial || 0, 90], [90, 80, 0, 90], [90, 80, 60, 60], [60, 100, -40, 90], [100, 60, 40, 90]]) for (const pr of [0, 90, 170, -90]) {
    const q0 = clone(pose);
    q0.ch[`shoulder_${s}`] = { plane: g[0], elev: g[1], axial: g[2] }; q0.ch[`elbow_${s}`] = { flex: g[3] }; q0.ch[`wrist_${s}`] = { pron: pr, flex: 0, dev: 0 };
    const r = L.solvePose(q0, paths, objs, { iters: 250 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const out = best.pose;
  out.ch[`wrist_${s}`].pron = r1(L.wrap(out.ch[`wrist_${s}`].pron));
  return out;
}
// Fit FK leg channels (hip, knee, ankle) to the IK solution of contact `cid`.
function fitLeg(pose, s, contacts, cid) {
  const c = contacts.find((x) => x.id === (cid || `leg_${s}`));
  const tmp = clone(pose); tmp.ik = { [c.id]: Object.assign({}, pose.ik[c.id], { weight: 1 }) };
  const Wi = L.fk(tmp, [c]);
  const paths = [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
  const objs = [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2), L.obj.reg(`ch.hip_${s}.rot`, 0, 0.03), L.obj.reg(`ch.hip_${s}.abd`, 0, 0.02)];
  let best = null;
  for (const h of [pose.ch[`hip_${s}`] || { flex: 0 }, { flex: 0, abd: 0, rot: 0 }, { flex: 60, abd: 5, rot: 0 }, { flex: 90, abd: 0, rot: 0 }, { flex: -10, abd: 5, rot: 0 }]) {
    const q0 = clone(pose); q0.ch[`hip_${s}`] = { flex: 0, abd: 0, rot: 0, ...h };
    if (!q0.ch[`knee_${s}`]) q0.ch[`knee_${s}`] = { flex: 10 };
    const r = L.solvePose(q0, paths, objs, { iters: 250 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  return best.pose;
}
// Fit every weighted contact of a pose (arms first, then legs).
function fitAll(pose, contacts) {
  let p = pose;
  for (const c of contacts) {
    const k = p.ik && p.ik[c.id]; if (!k || (k.weight ?? 1) < 0.999) continue;
    const s = c.chain[0].slice(-1);
    p = c.chain[0].startsWith('shoulder') ? fitArm(p, s, contacts, c.id) : fitLeg(p, s, contacts, c.id);
  }
  return p;
}
// Forearm on the mat: elbow point E directly under the shoulder S (same x and z), wrist target ahead along `dir`
// (unit vector in the floor plane) at height wy. Returns { E, W }.
function forearm(S, dir, wy) {
  const E = [S[0], ELBOW_Y, S[2]];
  const dy = wy - ELBOW_Y, horiz = Math.sqrt(FA * FA - dy * dy);
  return { E: E.map(r1), W: [r1(E[0] + dir[0] * horiz), r1(wy), r1(E[2] + dir[2] * horiz)] };
}
// Sweep a module: floor, planted-contact slide (end effector vs target and target changes), drift of fixed points.
// fixed: [{ joint, p, when(pose) }] points that must stay at p whenever when(pose) is true.
function sweep(ex, fixed = [], n = 1200) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, planted = (ex.checks && ex.checks.plantedContacts) || [];
  const out = { floor: 1e9, floorAt: null, slide: 0, slideAt: null, drift: 0, driftAt: null, shapes: {} };
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    for (const id of planted) {
      const k = pz.ik && pz.ik[id]; if (!k || (k.weight ?? 1) < 0.999) continue;
      const c = ex.contacts.find((x) => x.id === id);
      let s = V.len(V.sub(W[c.chain[2]].p, k.target));
      if (prev && prev[id] && (prev[id].weight ?? 1) >= 0.999) s = Math.max(s, V.len(V.sub(k.target, prev[id].target)));
      if (s > out.slide) { out.slide = s; out.slideAt = [id, +t.toFixed(2)]; }
    }
    for (const fx of fixed) {
      if (fx.when && !fx.when(pz)) continue;
      const d = V.len(V.sub(W[fx.joint].p, fx.p)); if (d > out.drift) { out.drift = d; out.driftAt = [fx.joint, +t.toFixed(2)]; }
    }
    prev = pz.ik ? clone(pz.ik) : null;
  }
  out.floor = +out.floor.toFixed(2); out.slide = +out.slide.toFixed(3); out.drift = +out.drift.toFixed(3);
  return out;
}
// Head and neck: total flex split 45/55 between C7 and C1.
function head(p, flex, rot = 0) { p.ch.neck_c7 = { rot: r1(rot * 0.4), flex: r1(flex * 0.45) }; p.ch.head_c1 = { rot: r1(rot * 0.6), flex: r1(flex * 0.55) }; return p; }
const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
module.exports = { qArr, shape, bottomOf, UA, FA, FOREARM_R, ELBOW_Y, kneeAngle, elbowAngle, fitArm, fitLeg, fitAll, forearm, sweep, head, NOTE };
