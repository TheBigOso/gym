// Core family B (batch 2): supine and seated floor helpers shared by dead bug, air bike, hollow hold and russian twist.
// Generalised from author-three-quarter-sit-up.js (lying base, hands-behind-head cradle).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;

const bottomOf = (W, id) => { const s = rig.shapes.find((x) => x.id === id), g = R.shapeWorld(W, s); return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
const headPt = (W, v) => V.add(W.head_c1.p, Q.rot(W.head_c1.q, v));
const trunkFromVertical = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
const shapesOf = (re) => rig.shapes.filter((s) => re.test(s.id)).map((s) => s.id);
const ARM_R = shapesOf(/^(upperarm|forearm|hand|thumb|deltoid|biceps)_r$/), ARM_L = shapesOf(/^(upperarm|forearm|hand|thumb|deltoid|biceps)_l$/);
const LEG_R = shapesOf(/^(thigh|quad|shank|calf|foot)_r$/), LEG_L = shapesOf(/^(thigh|quad|shank|calf|foot)_l$/);
// Keep listed shapes at least `clr` cm above the floor.
const clear = (ids, clr = 0.3, w = 3) => (W) => ids.map((id) => Math.min(0, bottomOf(W, id) - clr) * w);
const limitPen = (paths, w = 2) => (W, pose) => paths.map((pth) => { const [, j, c] = pth.split('.'), lim = rig.byId[j].limits && rig.byId[j].limits[c], v = L.getPath(pose, pth) ?? 0; return lim ? (Math.max(0, lim[0] - v) + Math.max(0, v - lim[1])) * w : 0; });

// Lying base: pelvis (lowest of the buttocks and the back of the thigh at the hip), low ribs and upper back on the mat. spine = desired lying curve (l5 > 0 flattens the low back).
function lie({ kneeFlex = 0, spine = { l5: 2, t12: 2, t6: 4 }, pitch = 92 } = {}) {
  const p0 = clone(L.POSES.supine({ kneeFlex }).pose);
  p0.root.pos = [0, p0.root.pos[1], 0];
  let p = L.solvePose(p0, ['root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
    (W) => [Math.min(bottomOf(W, 'buttock_r'), bottomOf(W, 'thigh_r')) * 4, bottomOf(W, 'chest') * 3, Math.min(0, bottomOf(W, 'neck') - 0.5) * 4, Math.max(0, bottomOf(W, 'ribcage') - 1.2) * 2, Math.min(0, bottomOf(W, 'ribcage')) * 4, Math.min(0, bottomOf(W, 'abdomen') - 1.0) * 4],
    L.obj.reg('ch.spine_l5.flex', spine.l5, 0.15), L.obj.reg('ch.spine_t12.flex', spine.t12, 0.25), L.obj.reg('ch.spine_t6.flex', spine.t6, 0.4), L.obj.reg('root.rot.pitch', pitch, 0.2),
  ]).pose;
  p.root.pos[1] = r1(p.root.pos[1] + 0.2); // a few mm of margin so nothing settles through the mat
  p.ch.sc_r = { protract: 0, elevate: 0 }; p.ch.sc_l = { protract: 0, elevate: 0 };
  return p;
}
const HEAD = shapesOf(/^(head|hair|jaw|nose|brow|ear_[rl]|eye_[rl])$/);
const headBottom = (W) => Math.min(...HEAD.map((id) => bottomOf(W, id)));
// Head resting on the mat (back of the skull touching), neck neutral-ish.
function headDown(pose, clr = 0.2) {
  const set = (q, f) => { q.ch.neck_c7 = { rot: 0, flex: r1(f * 0.55) }; q.ch.head_c1 = { rot: 0, flex: r1(f * 0.45) }; return q; };
  let lo = -25, hi = 40;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2, W = L.fk(set(clone(pose), m)); if (headBottom(W) < clr) lo = m; else hi = m; }
  return set(clone(pose), (lo + hi) / 2);
}
// Set neck + head flexion split 55/45 (total in degrees), optional rotation.
const neck = (p, flex, rot = 0) => { p.ch.neck_c7 = { rot: r1(rot * 0.4), flex: r1(flex * 0.55) }; p.ch.head_c1 = { rot: r1(rot * 0.6), flex: r1(flex * 0.45) }; return p; };

// Mirror a pose left <-> right (sided channels swap, axial spine channels and lateral root terms flip).
function mirror(pose) {
  const p = clone(pose), out = clone(pose);
  for (const j in p.ch) {
    const m = j.match(/^(.*)_(r|l)$/);
    if (m && rig.byId[j] && rig.byId[j].side) out.ch[`${m[1]}_${m[2] === 'r' ? 'l' : 'r'}`] = clone(p.ch[j]);
    else if (/^(spine|neck|head)/.test(j)) { const c = clone(p.ch[j]); if (c.rot != null) c.rot = -c.rot || 0; if (c.latFlex != null) c.latFlex = -c.latFlex || 0; out.ch[j] = c; }
  }
  if (p.root.rot) { out.root.rot = clone(p.root.rot); if (out.root.rot.yaw) out.root.rot.yaw = -out.root.rot.yaw; if (out.root.rot.roll) out.root.rot.roll = -out.root.rot.roll; }
  out.root.pos = [p.root.pos[0], p.root.pos[1], -p.root.pos[2] || 0];
  if (p.ik) { out.ik = {}; for (const id in p.ik) { const m = id.match(/^(.*)_(r|l)$/), nid = m ? `${m[1]}_${m[2] === 'r' ? 'l' : 'r'}` : id; out.ik[nid] = { target: [p.ik[id].target[0], p.ik[id].target[1], -p.ik[id].target[2] || 0], weight: p.ik[id].weight }; } }
  return out;
}
// Copy right-arm channels to the left (symmetric arms).
const mirrorArm = (p, joints = ['shoulder', 'elbow', 'wrist', 'sc']) => { joints.forEach((j) => { if (p.ch[`${j}_r`]) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); }); return p; };

// Fingertips cradling the back of the head, elbows wide (from the 3/4 sit-up). Solves the right arm, mirrors to the left
// unless opt.side is given (then only that side is solved, for asymmetric twists).
const HAND_C = [-8.6, 5.5, 9], HAND_TIP = [-8.6, 8, -0.6];
function cradle(pose, opt = {}) {
  const s = opt.side || 'r', sg = s === 'r' ? 1 : -1, mz = (v) => [v[0], v[1], v[2] * sg];
  const paths = [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`, `ch.sc_${s}.protract`, `ch.sc_${s}.elevate`];
  const p = clone(pose);
  const g = opt.guess || { shoulder: { plane: -5, elev: 126, axial: -125 }, elbow: { flex: 136 }, wrist: { pron: 35, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  for (const j in g) p.ch[`${j}_${s}`] = clone(g[j]);
  const sideAx = (W) => Q.rot(W.spine_t6.q, [0, 0, sg]);
  const objs = [
    (W) => V.sub(V.add(W[`wrist_${s}`].p, Q.rot(W[`wrist_${s}`].q, [1.0, -8.4, 0])), headPt(W, mz(HAND_C))).map((v) => v * 3),
    (W) => V.sub(W[`handtip_${s}`].p, headPt(W, mz(HAND_TIP))).map((v) => v * 2),
    (W) => V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), Q.rot(W.head_c1.q, [1, 0, 0])).map((v) => v * 3),
    (W) => { const fr = W.spine_t6.q, d = V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p); return [(V.dot(d, Q.rot(fr, [1, 0, 0])) - (opt.elbowAnt ?? -3)) * 0.8, Math.min(0, V.dot(d, sideAx(W)) - (opt.elbowOut ?? 20)) * 0.8]; },
    limitPen(paths),
    L.obj.reg(`ch.sc_${s}.protract`, 0, 0.15), L.obj.reg(`ch.sc_${s}.elevate`, 4, 0.15), L.obj.reg(`ch.wrist_${s}.dev`, 0, 0.05), L.obj.reg(`ch.wrist_${s}.flex`, 0, 0.03),
    clear(s === 'r' ? ARM_R : ARM_L, opt.floor ?? 1.0),
  ];
  if (opt.ref) objs.push(...['plane', 'elev', 'axial'].map((c) => L.obj.reg(`ch.shoulder_${s}.${c}`, opt.ref.shoulder[c], 0.02)), L.obj.reg(`ch.wrist_${s}.pron`, opt.ref.wrist.pron, 0.05));
  const sol = L.solvePose(p, paths, objs, { iters: 400 });
  const out = sol.pose; out.__cost = sol.cost;
  if (!opt.side) mirrorArm(out);
  return out;
}
const armOf = (p, s = 'r') => ({ shoulder: clone(p.ch[`shoulder_${s}`]), elbow: clone(p.ch[`elbow_${s}`]), wrist: clone(p.ch[`wrist_${s}`]), sc: clone(p.ch[`sc_${s}`]) });

// Whole-loop scan: lowest point, planted-contact slide, still joints, stored channels inside the rig limits.
function scan(ex, { still = [], n = 800 } = {}) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  const out = { floor: 1e9, floorAt: null, slide: 0, drift: 0 };
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pose = tl.pose(t), W = R.evalPose(rig, pose, ex.contacts);
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    for (const c of ex.contacts || []) { const k = pose.ik && pose.ik[c.id]; if (k && (k.weight ?? 1) >= 0.999) out.slide = Math.max(out.slide, V.len(V.sub(W[c.chain[2]].p, k.target))); }
    for (const j of still) out.drift = Math.max(out.drift, V.len(V.sub(W[j].p, W0[j].p)));
  }
  const viol = [];
  for (const [name, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${name}.${j}.${c}=${p.ch[j][c]}`); }
  out.floor = +out.floor.toFixed(2); out.slide = +out.slide.toFixed(3); out.drift = +out.drift.toFixed(3); out.limits = viol;
  return out;
}
function finish(ex, rep, label) {
  ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
  const f = L.write(ex);
  console.log(`${label}: wrote ${f}\n  ${JSON.stringify(rep)}`);
  if (rep.slide > 0.05) { console.error(`FAIL ${label}: planted contact slides ${rep.slide} cm`); process.exitCode = 1; }
  if (rep.drift > 0.05) { console.error(`FAIL ${label}: still joints drift ${rep.drift} cm`); process.exitCode = 1; }
  if (rep.floor < -0.5) { console.error(`FAIL ${label}: below the floor ${rep.floor} cm`); process.exitCode = 1; }
  if (rep.limits && rep.limits.length) { console.error(`FAIL ${label}: joint limits ${rep.limits.join(', ')}`); process.exitCode = 1; }
}
const moduleOf = (meta, poses, keyframes, contacts = []) => ({ schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) });
const setKin = (ex, prefix, setup, peak) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (!k) throw new Error('no kinematics row ' + prefix); if (setup != null) k.setup = setup; if (peak != null) k.peak = peak; };
const deg = (v) => `≈${Math.round(v)}°`;

module.exports = { HEAD, headBottom, bottomOf, headPt, trunkFromVertical, kneeOf, clear, limitPen, ARM_R, ARM_L, LEG_R, LEG_L, lie, headDown, neck, mirror, mirrorArm, cradle, armOf, scan, finish, moduleOf, setKin, deg };
