// Hips family (batch 2): glute bridge, single-leg hip thrust, standing hip extension, side-lying hip abduction,
// standing calf raise. Shared helpers: a supine base resting on the mat, leg/hand contacts with fitted channels,
// a heel-raise (rolling ball of the foot) target, and a whole-loop report used by every author's self-check.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;

const qArr = (q) => q.map((v) => +v.toFixed(6));
const shapeOf = (id) => rig.shapes.find((x) => x.id === id);
const bottomOf = (W, id) => { const g = R.shapeWorld(W, shapeOf(id)); return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
// lowest world point of an ellipsoid shape
const lowPoint = (W, id) => { const g = R.shapeWorld(W, shapeOf(id)); const ny = Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); return V.sub(g.c, V.scale(V.add(V.add(V.scale(g.axes[0], g.axes[0][1]), V.scale(g.axes[1], g.axes[1][1])), V.scale(g.axes[2], g.axes[2][1])), 1 / ny)); };
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset);
const dorsiOf = (W, s) => ANKLE_REST - V.angle(V.sub(W[`knee_${s}`].p, W[`ankle_${s}`].p), V.sub(W[`toe_${s}`].p, W[`ankle_${s}`].p));
const footQ = (pitch = 0, yaw = 0) => Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch)); // pitch > 0 = heel up

// Lying on the back on the mat (head toward -X), knees bent: pelvis, low ribs and upper back resting, head on the mat.
// Same solve as the 3/4 sit-up, with the head resting on the floor instead of cradled by the hands.
function lieBase() {
  const sup = L.POSES.supine({ kneeFlex: 90 });
  const p0 = clone(sup.pose); p0.root.pos = [0, p0.root.pos[1], 0];
  return L.solvePose(p0, ['root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
    (W) => [bottomOf(W, 'buttock_r') * 4, bottomOf(W, 'chest') * 3, Math.min(0, bottomOf(W, 'neck') - 0.5) * 4, Math.max(0, bottomOf(W, 'ribcage') - 1.2) * 2, Math.min(0, bottomOf(W, 'ribcage')) * 4, Math.min(0, bottomOf(W, 'abdomen') - 1.5) * 4],
    L.obj.reg('ch.spine_l5.flex', -8, 0.15), L.obj.reg('ch.spine_t12.flex', 2, 0.25), L.obj.reg('ch.spine_t6.flex', 4, 0.4), L.obj.reg('root.rot.pitch', 92, 0.2),
  ]).pose;
}

// Leg contact with a custom pole / foot orientation
const legC = (s, opt = {}) => Object.assign(L.legContact(s), opt.pole ? { pole: opt.pole } : {}, { handRot: qArr(opt.rot || footQ(0, 0)) }, opt.id ? { id: opt.id, label: opt.label || L.legContact(s).label } : {});
// Hand contact (palm down, fingers toward +X) with a custom pole
const handC = (s, pole) => Object.assign(L.handContact(s), pole ? { pole } : {});

// Leg channels that reproduce the IK solution of a contact (stored channels then match what is drawn).
const LEG_PATHS = (s) => [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
function fitLeg(pose, s, contact, target, opt = {}) {
  const tmp = clone(pose); tmp.ik = { [contact.id]: { target, weight: 1 } };
  if (opt.handRot) tmp.ik[contact.id].handRot = opt.handRot;
  const Wi = L.fk(tmp, [contact]);
  const objs = [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2), L.obj.reg(`ch.hip_${s}.rot`, opt.rot ?? 0, 0.03), L.obj.reg(`ch.hip_${s}.abd`, opt.abd ?? 0, 0.02)];
  let best = null;
  for (const h of [pose.ch[`hip_${s}`] || {}, { flex: 20, abd: 5, rot: 0 }, { flex: 70, abd: 5, rot: 0 }, { flex: -10, abd: 5, rot: 0 }]) {
    const q0 = clone(pose); q0.ch[`hip_${s}`] = { flex: 0, abd: 0, rot: 0, ...h };
    if (!q0.ch[`knee_${s}`]) q0.ch[`knee_${s}`] = { flex: 20 };
    if (!q0.ch[`ankle_${s}`]) q0.ch[`ankle_${s}`] = { dorsi: 0 };
    const r = L.solvePose(q0, LEG_PATHS(s), objs, { iters: 250 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  return best.pose;
}
// Arm channels that reproduce a hand contact's IK solution (shoulder, elbow; wrist from the planted orientation)
const ARM_PATHS = (s) => [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`];
function fitArm(pose, s, contact, target, guess) {
  const tmp = clone(pose); tmp.ik = { [contact.id]: { target, weight: 1 } };
  const Wi = L.fk(tmp, [contact]), hq = Wi[`wrist_${s}`].q;
  const objs = [L.obj.at(`elbow_${s}`, Wi[`elbow_${s}`].p, 2), L.obj.at(`wrist_${s}`, Wi[`wrist_${s}`].p, 3),
    (W) => [...V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), Q.rot(hq, [1, 0, 0])), ...V.sub(Q.rot(W[`wrist_${s}`].q, [0, 1, 0]), Q.rot(hq, [0, 1, 0]))].map((v) => v * 8),
    L.obj.reg(`ch.shoulder_${s}.axial`, 0, 0.01),
    (W, q) => ARM_PATHS(s).map((pth) => { const [, j, c] = pth.split('.'), lim = rig.byId[j].limits && rig.byId[j].limits[c], v = L.getPath(q, pth) ?? 0; return lim ? (Math.max(0, lim[0] + 2 - v) + Math.max(0, v - lim[1] + 2)) * 25 : 0; })];
  let best = null;
  const seeds = [];
  for (const g of guess) for (const pron of [null, -90, 0, 90, 170]) { const g2 = clone(g); if (pron != null) g2[`wrist_${s}`] = { pron, flex: 0, dev: 0 }; seeds.push(g2); }
  for (const g of seeds) {
    const q0 = clone(pose); Object.assign(q0.ch, clone(g));
    const r = L.solvePose(q0, ARM_PATHS(s), objs, { iters: 300 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const out = best.pose;
  for (const [j, c] of [[`shoulder_${s}`, 'plane'], [`shoulder_${s}`, 'axial'], [`wrist_${s}`, 'pron']]) out.ch[j][c] = r1(((out.ch[j][c] + 540) % 360) - 180);
  out.__cost = best.cost;
  return out;
}

// Heel raise: ankle target + foot orientation that keep the lowest point of the (rigid) foot shape at ballX on the floor
// for a heel-up pitch (deg). The rig foot has no toe joint, so the contact point rolls along the sole like the toes would.
function heelRaise(st, s, pitch, ballX, z, yaw = 0) {
  const rot = footQ(pitch, yaw), c = legC(s, { rot, id: `hr_${s}` });
  const res = (x) => { const p = clone(st); p.ik = { [c.id]: { target: [x[0], x[1], z], weight: 1 } }; const lp = lowPoint(L.fk(p, [c]), `foot_${s}`); return [(lp[0] - ballX) * 3, (lp[1] - 0.1) * 3]; };
  const x = R.solveLM([ballX - 12 + pitch / 10, L.ANKLE_H + pitch / 6], res, { iters: 300 }).x;
  return { target: [r1(x[0] * 100) / 100, r1(x[1] * 100) / 100, z].map((v) => +v.toFixed(2)), handRot: qArr(rot) };
}

// Whole-loop scan: floor, planted-contact slide, contact-driven knee/ankle, hip extension, custom per-frame probes.
function loopReport(ex, { planted = [], probe } = {}) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, contacts = ex.contacts;
  const out = { floor: 1e9, floorAt: null, slide: 0, kneeR: [999, -999], kneeL: [999, -999], dorsiR: [999, -999], hipFlexR: [999, -999], hipFlexL: [999, -999] };
  let prev = null;
  for (let i = 0; i <= 1600; i++) {
    const t = (i / 1600) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, contacts);
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    const mm = (k, v) => { out[k] = [Math.min(out[k][0], v), Math.max(out[k][1], v)]; };
    mm('kneeR', kneeOf(W, 'r')); mm('kneeL', kneeOf(W, 'l')); mm('dorsiR', dorsiOf(W, 'r'));
    mm('hipFlexR', pz.ch.hip_r.flex); mm('hipFlexL', pz.ch.hip_l.flex);
    for (const id of planted) { const k = pz.ik[id]; if (!k || (k.weight ?? 1) < 0.999) continue; const c = contacts.find((x) => x.id === id); out.slide = Math.max(out.slide, V.len(V.sub(W[c.chain[2]].p, k.target))); if (prev && prev[id] && (prev[id].weight ?? 1) >= 0.999) out.slide = Math.max(out.slide, V.len(V.sub(k.target, prev[id].target))); }
    prev = clone(pz.ik || {});
    if (probe) probe(W, pz, t, out);
  }
  out.floor = +out.floor.toFixed(2); out.slide = +out.slide.toFixed(3);
  for (const k of ['kneeR', 'kneeL', 'dorsiR', 'hipFlexR', 'hipFlexL']) out[k] = out[k].map((v) => +v.toFixed(1));
  return out;
}
// Hands on hips: wrists on the iliac crests, elbows out to the side (fixed in the pelvis frame); same as the lunge family
function handsOnHips(p) {
  const W = L.fk(p), P = W.pelvis;
  const target = V.add(P.p, Q.rot(P.q, [1, 9, 15.5])), elbow = V.add(P.p, Q.rot(P.q, [-6, 22, 30]));
  const q = L.armToTarget(p, target, { wrist: { pron: -80, flex: 15, dev: 20 }, axial: 0, axialW: 0.005, guess: [10, 40, 40], extra: (Wx) => V.sub(Wx.elbow_r.p, elbow).map((v) => v * 0.8) });
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]); });
  q.ch.sc_r = { protract: 2, elevate: 2 }; q.ch.sc_l = { protract: 2, elevate: 2 };
  return q;
}
// Hand resting on a wall in front (+X): palm toward the wall, fingers up. The Studio clay athlete's palm and fingers reach
// WALL_PALM cm past the rig wrist target in this orientation (measured on the skinned mesh with b2/hips_wall.mjs).
const handRotWallL = Q.fromBasis([1, 0, 0], [0, -1, 0], [0, 0, -1]), handRotWallR = Q.mirrorZ(handRotWallL);
const WALL_PALM = 6.6;
const wallHand = (s) => Object.assign(L.handContact(s), { label: `${s === 'r' ? 'Right' : 'Left'} hand (wall)`, pole: [-0.3, -1, s === 'r' ? 0.6 : -0.6], handRot: qArr(s === 'r' ? handRotWallR : handRotWallL) });
const WALL_ARM_GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 85, elev: 80, axial: 0 }, [`elbow_${s}`]: { flex: 30 }, [`wrist_${s}`]: { pron: 0, flex: -60, dev: 0 } }, { [`shoulder_${s}`]: { plane: 85, elev: 80, axial: -60 }, [`elbow_${s}`]: { flex: 30 }, [`wrist_${s}`]: { pron: 80, flex: -60, dev: 0 } }];
// Rig v2 (shapes fitted to the body): wall hand targets in front of the shoulder S with the elbow bent about `flex` degrees,
// and the wall face where the rig hand shape's palm meets it (no mesh measurement needed any more).
function wallHandTargets(S, { flex = 40, drop = 6, inset = 2 } = {}) {
  const dx = Math.sqrt(Math.max(0, L.reach(flex) ** 2 - drop * drop - inset * inset));
  return { r: [r1(S[0] + dx), r1(S[1] - drop), r1(S[2] - inset)], l: [r1(S[0] + dx), r1(S[1] - drop), r1(-(S[2] - inset))] };
}
const frontOf = (W, id) => { const g = R.shapeWorld(W, shapeOf(id)); return g.kind === 'capsule' ? Math.max(g.a[0] + g.r[0], g.b[0] + g.r[1]) : g.c[0] + Math.hypot(g.axes[0][0], g.axes[1][0], g.axes[2][0]); };
const wallFaceX = (pose, contacts) => { const W = L.fk(pose, contacts); return r1(Math.max(frontOf(W, 'hand_r'), frontOf(W, 'hand_l'))); };
const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
function module_(meta, contacts, poses, keyframes, extra = {}) {
  const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: clone(meta.props), contacts,
    timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks), ...extra };
  ex.exercise.reference.note = NOTE;
  return ex;
}
const setKin = (ex) => (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (!k) throw new Error(`no kinematics row ${prefix}`); k[field] = v; };

module.exports = { wallHand, WALL_PALM, wallHandTargets, wallFaceX, frontOf, WALL_ARM_GUESS, handsOnHips, qArr, bottomOf, lowPoint, kneeOf, dorsiOf, footQ, lieBase, legC, handC, fitLeg, fitArm, heelRaise, loopReport, module_, setKin, NOTE, LEG_PATHS };
