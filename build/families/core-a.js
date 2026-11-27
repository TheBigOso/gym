// Core family A (batch 2): supine floor work on a mat. Shared by crunch, reverse crunch, V-up, lying leg raise and
// flutter kicks. Generalised from author-three-quarter-sit-up.js (lying base, hand cradle, planted feet).
// Conventions: head toward -X, feet toward +X, the pelvis is the root. Root pitch ~96 lying; smaller pitch = pelvis rolls
// toward the thighs (trunk rises), larger pitch = pelvis curls back toward the head (posterior tilt, hips lift).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;

const qArr = (q) => q.map((v) => +v.toFixed(6));
const shapeById = Object.fromEntries(rig.shapes.map((s) => [s.id, s]));
const bottomOf = (W, id) => { const g = R.shapeWorld(W, shapeById[id]); return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
const minOf = (W, ids) => Math.min(...ids.map((id) => bottomOf(W, id)));
const trunkFromFloor = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const upperFromFloor = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.spine_t12.p), [0, 1, 0]); // thorax (T12 to C7) angle
const legFromFloor = (W, s = 'r') => { const d = V.sub(W[`ankle_${s}`].p, W[`hip_${s}`].p); return Math.atan2(d[1], d[0]) / R.DEG; }; // legs point +X; >90 = past vertical
const thighFromFloor = (W, s = 'r') => { const d = V.sub(W[`knee_${s}`].p, W[`hip_${s}`].p); return Math.atan2(d[1], d[0]) / R.DEG; };
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
const headPt = (W, v) => V.add(W.head_c1.p, Q.rot(W.head_c1.q, v));
const HAND_C = [-8.6, 5.5, 9], HAND_TIP = [-8.6, 8, -0.6]; // head-local hand centre and fingertips (cradle)
const LEG_IDS = ['thigh_r', 'thigh_l', 'quad_r', 'quad_l', 'shank_r', 'shank_l', 'calf_r', 'calf_l', 'foot_r', 'foot_l'];
const ARM_IDS = (s) => [`upperarm_${s}`, `forearm_${s}`, `hand_${s}`, `thumb_${s}`, `deltoid_${s}`, `biceps_${s}`];
const limitPen = (paths, w = 2) => (W, pose) => paths.map((pth) => { const [, j, c] = pth.split('.'), lim = rig.byId[j].limits && rig.byId[j].limits[c], v = L.getPath(pose, pth) ?? 0; return lim ? (Math.max(0, lim[0] - v) + Math.max(0, v - lim[1])) * w : 0; });
const mirrorArm = (p) => { for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) if (p.ch[`${j}_r`]) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); return p; };
const mirrorLeg = (p) => { for (const j of ['hip', 'knee', 'ankle']) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); return p; };

/* ---------------- Lying base: pelvis, buttocks and upper back on the mat, head resting ---------------- */
// kneeFlex 0 = straight legs resting on the mat (heels and calves down); otherwise knees bent with feet flat.
function lie({ kneeFlex = 90, headRest = 'floor' } = {}) {
  const sup = L.POSES.supine({ kneeFlex });
  const base0 = clone(sup.pose);
  base0.root.pos = [0, base0.root.pos[1], 0];
  let p = L.solvePose(base0, ['root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
    (W) => [bottomOf(W, 'buttock_r') * 4, bottomOf(W, 'chest') * 3, Math.min(0, bottomOf(W, 'neck') - 0.5) * 4, Math.max(0, bottomOf(W, 'ribcage') - 1.2) * 2, Math.min(0, bottomOf(W, 'ribcage')) * 4, Math.min(0, bottomOf(W, 'abdomen') - 1.5) * 4],
    L.obj.reg('ch.spine_l5.flex', -8, 0.15), L.obj.reg('ch.spine_t12.flex', 2, 0.25), L.obj.reg('ch.spine_t6.flex', 4, 0.4), L.obj.reg('root.rot.pitch', 92, 0.2),
  ]).pose;
  p.root.pos[1] = r1(p.root.pos[1] + 0.5);
  p.ch.sc_r = { protract: 0, elevate: 0 }; p.ch.sc_l = { protract: 0, elevate: 0 };
  if (headRest === 'floor') {
    // Back of the head rests on the mat: neck flexion so the head shape just touches.
    p = L.solvePose(p, ['ch.neck_c7.flex'], [(W) => [(minOf(W, ['head', 'hair']) - 0.1) * 3], L.obj.reg('ch.neck_c7.flex', 4, 0.05)]).pose;
    p.ch.head_c1 = { rot: 0, flex: r1(p.ch.neck_c7.flex * 0.8) };
    p = L.solvePose(p, ['ch.neck_c7.flex'], [(W) => [(minOf(W, ['head', 'hair']) - 0.1) * 3]]).pose;
  } else if (headRest === 'hands') {
    // Head cradled in the hands: neck flexion just enough that the back of the hands rests on the mat (as the sit-up).
    const cr = (q) => L.solvePose(q, ['ch.neck_c7.flex'], [(W) => [(headPt(W, [HAND_C[0] - 1.8, HAND_C[1], HAND_C[2]])[1] - 1.6) * 3]]).pose;
    p = cr(p); p.ch.head_c1 = { rot: 0, flex: r1(p.ch.neck_c7.flex * 0.45 / 0.55) }; p = cr(p);
  }
  if (!kneeFlex) {
    // Straight legs resting on the mat: hip flexion so the calves and heels just touch.
    for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: 0, abd: 0, rot: 0 }; p.ch[`knee_${s}`] = { flex: 2 }; p.ch[`ankle_${s}`] = { dorsi: -25 }; }
    p = L.solvePose(p, ['ch.hip_r.flex'], [(W) => [(minOf(W, ['calf_r', 'foot_r', 'shank_r']) - 0.15) * 3]]).pose;
    mirrorLeg(p);
  }
  return { pose: p, P0: p.root.rot.pitch, NECK: p.ch.neck_c7.flex + (p.ch.head_c1 ? p.ch.head_c1.flex : 0) };
}

/* ---------------- Planted feet (knees bent): IK contacts with leg channels fitted to the IK ---------------- */
const footContacts = () => ['r', 'l'].map((sd) => Object.assign(L.legContact(sd), { pole: [0.15, 1, sd === 'r' ? 0.04 : -0.04] }));
function fitLeg(pose, s, ankle, contacts) {
  const c = contacts.find((x) => x.id === `leg_${s}`);
  const q = clone(pose); q.ik = { [c.id]: { target: ankle, weight: 1 } };
  const Wi = R.evalPose(rig, q, [c]);
  return L.solvePose(pose, [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`],
    [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2), L.obj.reg(`ch.hip_${s}.abd`, 0, 0.05), L.obj.reg(`ch.hip_${s}.rot`, 0, 0.05)], { iters: 300 }).pose;
}
// Feet flat at knee angle KNEE (thighs and shins in the sagittal plane). Returns pose with ik + leg contacts + targets.
function plantFeet(pose, KNEE = 90) {
  const contacts = footContacts();
  const TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
  const HIP = L.fk(pose).hip_r.p;
  const hipToAnkle = Math.sqrt(TH * TH + SH * SH - 2 * TH * SH * Math.cos((180 - KNEE) * R.DEG));
  const ankleX = r1(HIP[0] + Math.sqrt(hipToAnkle ** 2 - (HIP[1] - L.ANKLE_H) ** 2));
  const T = { r: [ankleX, L.ANKLE_H, r1(HIP[2])], l: [ankleX, L.ANKLE_H, -r1(HIP[2])] };
  let p = clone(pose);
  for (const sd of ['r', 'l']) { p.ch[`hip_${sd}`] = { flex: 30, abd: 0, rot: 0 }; p.ch[`knee_${sd}`] = { flex: KNEE }; p.ch[`ankle_${sd}`] = { dorsi: -35 }; }
  p = fitLeg(fitLeg(p, 'r', T.r, contacts), 'l', T.l, contacts);
  p.ik = Object.assign(p.ik || {}, { leg_r: { target: T.r, weight: 1 }, leg_l: { target: T.l, weight: 1 } });
  return { pose: p, contacts, targets: T };
}

/* ---------------- Hands lightly behind the head, elbows wide (no pulling) ---------------- */
function cradle(pose, opt = {}) {
  const paths = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev', 'ch.sc_r.protract', 'ch.sc_r.elevate'];
  const p = clone(pose);
  const g = opt.guess || { shoulder_r: { plane: -5, elev: 126, axial: -125 }, elbow_r: { flex: 136 }, wrist_r: { pron: 35, flex: 16, dev: -20 }, sc_r: { protract: -2, elevate: 2 } };
  for (const j in g) p.ch[j] = clone(g[j]);
  const objs = [
    (W) => V.sub(V.add(W.wrist_r.p, Q.rot(W.wrist_r.q, [1.0, -8.4, 0])), headPt(W, HAND_C)).map((v) => v * 3),
    (W) => V.sub(W.handtip_r.p, headPt(W, HAND_TIP)).map((v) => v * 2),
    (W) => V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), Q.rot(W.head_c1.q, [1, 0, 0])).map((v) => v * 3),
    (W) => { const fr = W.spine_t6.q, d = V.sub(W.elbow_r.p, W.shoulder_r.p); return [(V.dot(d, Q.rot(fr, [1, 0, 0])) - (opt.elbowAnt ?? -3)) * 0.8, Math.min(0, V.dot(d, Q.rot(fr, [0, 0, 1])) - 20) * 0.8]; },
    limitPen(paths),
    L.obj.reg('ch.sc_r.protract', 0, 0.15), L.obj.reg('ch.sc_r.elevate', 4, 0.15), L.obj.reg('ch.wrist_r.dev', 0, 0.05), L.obj.reg('ch.wrist_r.flex', 0, 0.03),
  ];
  if (opt.wristRef) objs.push(L.obj.reg('ch.wrist_r.pron', opt.wristRef.pron, 0.3), L.obj.reg('ch.wrist_r.flex', opt.wristRef.flex, 0.3));
  objs.push((W) => ARM_IDS('r').map((id) => Math.min(0, bottomOf(W, id) - (opt.floor ? 0.2 : 1.5)) * 3));
  const s = L.solvePose(p, paths, objs, { iters: 400 });
  const out = mirrorArm(s.pose); out.__cost = s.cost;
  return out;
}

/* ---------------- Arms by the sides, palms down on the mat (planted hands) ---------------- */
const handContacts = () => ['r', 'l'].map((s) => Object.assign(L.handContact(s), { pole: [0, 1, s === 'r' ? 0.3 : -0.3] }));
// Wrist targets beside the hips: arm about `abd` degrees out from the body, elbow nearly straight, palm flat.
function handTargets(pose, { abd = 10, flex = 10, wristY = 2.4 } = {}) {
  const W = L.fk(pose), S = W.shoulder_r.p, d = L.reach(flex), dy = S[1] - wristY, h = Math.sqrt(Math.max(1, d * d - dy * dy));
  const t = [r1(S[0] + h * Math.cos(abd * R.DEG)), wristY, r1(S[2] + h * Math.sin(abd * R.DEG))];
  return { r: t, l: [t[0], t[1], -t[2]] };
}
function fitArm(pose, s, target, contacts) {
  const c = contacts.find((x) => x.id === `arm_${s}`);
  const q = clone(pose); q.ik = { [c.id]: { target, weight: 1 } };
  const Wi = R.evalPose(rig, q, [c]), hq = Wi[`wrist_${s}`].q;
  const paths = [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`];
  let best = null;
  for (const ax of [-60, 0, 60]) {
    const p0 = clone(pose);
    p0.ch[`shoulder_${s}`] = { plane: 0, elev: 15, axial: ax }; p0.ch[`elbow_${s}`] = { flex: 10 }; p0.ch[`wrist_${s}`] = { pron: 0, flex: 0, dev: 0 };
    const r = L.solvePose(p0, paths, [L.obj.at(`elbow_${s}`, Wi[`elbow_${s}`].p, 2), L.obj.at(`wrist_${s}`, Wi[`wrist_${s}`].p, 3),
      (W) => [...V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), Q.rot(hq, [1, 0, 0])), ...V.sub(Q.rot(W[`wrist_${s}`].q, [0, 1, 0]), Q.rot(hq, [0, 1, 0]))].map((v) => v * 10),
      limitPen(paths.filter((x) => !/pron|axial/.test(x)), 3)], { iters: 300 });
    if (!best || r.cost < best.cost) best = r;
  }
  const out = best.pose;
  out.ch[`wrist_${s}`].pron = r1(L.wrap(out.ch[`wrist_${s}`].pron)); out.ch[`shoulder_${s}`].axial = r1(L.wrap(out.ch[`shoulder_${s}`].axial));
  return out;
}
function plantHands(pose, targets, contacts) {
  let p = fitArm(fitArm(pose, 'r', targets.r, contacts), 'l', targets.l, contacts);
  p.ik = Object.assign(p.ik || {}, { arm_r: { target: targets.r.slice(), weight: 1 }, arm_l: { target: targets.l.slice(), weight: 1 } });
  return p;
}

/* ---------------- Straight legs off the floor ---------------- */
// One leg at `deg` from the floor (hip-to-ankle line), or with its lowest point (foot, calf, shank) at `heel` cm.
function setLeg(pose, s, { deg = 0, heel = null, knee = 3, dorsi = -12, abd = -3 } = {}) {
  const p = clone(pose);
  p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi };
  const f = heel == null ? (W) => legFromFloor(W, s) - deg : (W) => minOf(W, [`foot_${s}`, `calf_${s}`, `shank_${s}`]) - heel;
  let lo = -20, hi = 140;
  for (let i = 0; i < 50; i++) { const h = (lo + hi) / 2; p.ch[`hip_${s}`] = { flex: h, abd, rot: 0 }; if (f(L.fk(p)) < 0) lo = h; else hi = h; }
  p.ch[`hip_${s}`] = { flex: r1((lo + hi) / 2), abd, rot: 0 };
  return p;
}
const setLegs = (pose, o) => setLeg(setLeg(pose, 'r', o), 'l', o);

/* ---------------- Spine / neck setters ---------------- */
function spine(p, base, add) {
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) {
    const lim = rig.byId[j].limits.flex;
    p.ch[j] = { rot: 0, latFlex: 0, flex: r1(Math.max(lim[0] + 1, Math.min(lim[1] - 1, (base.ch[j].flex || 0) + (add[j.slice(6)] || 0)))) };
  }
  return p;
}
function neck(p, total, split = 0.55) { p.ch.neck_c7 = { rot: 0, flex: r1(total * split) }; p.ch.head_c1 = { rot: 0, flex: r1(total * (1 - split)) }; return p; }

/* ---------------- Module + whole-loop scan ---------------- */
function buildModule(meta, poses, keyframes, contacts) {
  const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
    timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
  ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
  return ex;
}
// fns: { name: (W, pose) => number } tracked as [min, max] over the loop
function scan(ex, fns = {}, n = 1200) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, cs = ex.contacts || [];
  const out = { floor: 1e9, floorAt: null, slide: 0, still: 0, limits: [] };
  const still = (ex.checks && ex.checks.stillJoints) || [];
  const W0 = R.evalPose(rig, tl.pose(0), cs); let prev = null;
  for (const k in fns) out[k] = [1e9, -1e9];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, cs);
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    for (const c of cs) { const k = pz.ik && pz.ik[c.id]; if (!k || (k.weight ?? 1) < 0.999) continue; out.slide = Math.max(out.slide, V.len(V.sub(W[c.chain[2]].p, k.target))); if (prev && prev[c.id] && (prev[c.id].weight ?? 1) >= 0.999) out.slide = Math.max(out.slide, V.len(V.sub(k.target, prev[c.id].target))); }
    prev = pz.ik ? clone(pz.ik) : null;
    for (const j of still) out.still = Math.max(out.still, V.len(V.sub(W[j].p, W0[j].p)));
    for (const k in fns) { const v = fns[k](W, pz); out[k] = [Math.min(out[k][0], v), Math.max(out[k][1], v)]; }
  }
  for (const [name, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) out.limits.push(`${name}.${j}.${c}=${p.ch[j][c]}`); }
  out.floor = +out.floor.toFixed(2); out.slide = +out.slide.toFixed(3); out.still = +out.still.toFixed(3);
  for (const k in fns) out[k] = out[k].map((v) => +v.toFixed(1));
  return out;
}
function guard(name, rep, extra = []) {
  const bad = [];
  if (rep.slide > 0.05) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < -0.5) bad.push(`below the floor ${rep.floor} cm (${rep.floorAt})`);
  if (rep.still > 0.05) bad.push(`still joints move ${rep.still} cm`);
  if (rep.limits.length) bad.push(`joint limits: ${rep.limits.slice(0, 4).join(', ')}`);
  bad.push(...extra.filter(Boolean));
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
}

module.exports = { qArr, bottomOf, minOf, trunkFromFloor, upperFromFloor, legFromFloor, thighFromFloor, kneeOf, headPt, HAND_C, HAND_TIP, LEG_IDS, ARM_IDS, limitPen, mirrorArm, mirrorLeg,
  lie, setLeg, setLegs, footContacts, fitLeg, plantFeet, cradle, handContacts, handTargets, fitArm, plantHands, spine, neck, buildModule, scan, guard };
