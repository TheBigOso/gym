// Dumbbell Side Bridge (GymVisual #11396; page not readable here, movement from the name): the forearm side plank
// (author-side-plank.js, unchanged body: right forearm on the mat under the shoulder, feet stacked, hips lifted into one
// straight line, a 9 s hold with breathing settles, lowered) with one dumbbell held in the top (left) hand, the arm reaching
// straight up to the ceiling over the shoulder, palm facing the feet. The top arm is re-solved on every key so it stays
// vertical as the body lifts and lowers. Authored on the right side (the player mirrors).
const L = require('./lib');
const { R, V, Q, rig, clone } = L;
const P = require('./families/prone');
const DB = require('./families/dumbbell');
const meta = require('./meta/dumbbell-side-bridge.json');

const r3 = (v) => Math.round(v * 1000) / 1000;
const ease = (u) => u * u * (3 - 2 * u);
const DROP = 0;          // upper arm vertical in the hold (cm below a vertical upper arm)
const WRIST_Y = P.PALM;  // wrist joint height: flat palm on the mat
const TILT = 0;          // hand roll, thumb side up (deg)
const FEET_ABD = -3.5;    // legs drawn together so the feet stack (hip adduction, deg)
const SETUP_KNEE = 12; // knees soft while the hips rest on the mat (keeps the legs off full reach)
const SAG = -9;          // setup: lateral flexion toward the top side per spine segment as the hips rest on the mat (deg)

function solve(pose, paths, objs, contacts) {
  const set = (x) => { const q = clone(pose); paths.forEach((p, i) => L.setPathV(q, p, x[i])); return q; };
  const res = (x) => { const q = set(x), W = L.fk(q, contacts); return objs.flatMap((f) => f(W, q)); };
  const sol = R.solveLM(paths.map((p) => L.getPath(pose, p) ?? 0), res, { iters: 400 });
  return { pose: set(sol.x.map(r3)), cost: sol.cost };
}
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
/* ---------- Hold frame: side-lying rotation (yaw -90, roll = 90 - body incline), body straight ---------- */
const base = { root: { pos: [0, 34, 0], rot: { yaw: -90, pitch: 0, roll: 75 } }, ch: {
  spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 },
  hip_r: { flex: 0, abd: FEET_ABD, rot: 0 }, hip_l: { flex: 0, abd: FEET_ABD, rot: 0 }, knee_r: { flex: 9 }, knee_l: { flex: 9 }, ankle_r: { dorsi: 0 }, ankle_l: { dorsi: 0 },
  sc_r: { protract: 4, elevate: -4 }, sc_l: { protract: 0, elevate: 0 },
  // top arm rests along the side, hand on the thigh
  shoulder_l: { plane: 30, elev: 14, axial: 10 }, elbow_l: { flex: 12 }, wrist_l: { pron: 30, flex: 0, dev: 0 } } };
const hold0 = solve(base, ['root.pos.1', 'root.rot.roll'], [L.obj.atY('shoulder_r', P.ELBOW_Y + P.UA - DROP, 3), (W) => [P.bottomOf(W, 'foot_r') * 3]]).pose;
const W0 = L.fk(hold0);
const BACK = Math.sqrt(P.UA ** 2 - (P.UA - DROP) ** 2);
const S0 = W0.shoulder_r.p;
const E = [r3(S0[0] + BACK), P.ELBOW_Y, r3(S0[2])];
const WT = [E[0], WRIST_Y, r3(E[2] + Math.sqrt(P.FA ** 2 - (WRIST_Y - P.ELBOW_Y) ** 2))];
const AT = { r: W0.ankle_r.p.map(r3), l: W0.ankle_l.p.map(r3) };
// Right hand flat, fingers forward (+Z), palm down; rolled TILT deg thumb side up (rotation about the forearm, +Z).
const HAND0 = Q.fromBasis([0, -1, 0], [0, 0, -1], [1, 0, 0]);
const hand = Q.mul(Q.axis([0, 0, 1], TILT), HAND0);
const contacts = [
  Object.assign(L.handContact('r'), { label: 'Right forearm', pole: [0.15, -1, 0], handRot: P.qArr(hand) }),
  Object.assign(L.legContact('r'), { label: 'Right foot (outer edge)', pole: [0, 0, 1], handRot: P.qArr(W0.ankle_r.q) }),   // knees point forward (+Z)
  Object.assign(L.legContact('l'), { label: 'Left foot (stacked)', pole: [0, 0, 1], handRot: P.qArr(W0.ankle_l.q) }),
];
hold0.ik = { arm_r: { target: WT, weight: 1 }, leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } };
// The planted elbow must stay on its mat point: residual on the IK elbow itself (one upper arm from the shoulder, on the pole side).
const sphere = (W) => V.sub(W.elbow_r.p, E).map((v) => v * 25);
const shoulderX = (dx) => (W) => [(E[0] - W.shoulder_r.p[0] - dx) * 2];
const finish = (p) => P.fitAll(p, contacts);
const setSag = (p, s) => { for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 0, latFlex: r3(s * (j === 'spine_t6' ? 0.6 : 1)) }; return p; };

// Setup: hips resting on the mat (pelvis on the floor), trunk side-bent toward the ceiling, shoulder over the elbow.
const setup0 = setSag(clone(hold0), SAG);
// Knee bend through the hip-to-ankle distance (smooth even when a leg would over-reach, where the IK angle saturates).
const TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
const legLen = (k) => Math.sqrt(TH * TH + SH * SH + 2 * TH * SH * Math.cos(k * R.DEG));
const knee = (k) => (W) => ['r', 'l'].map((sd) => (V.len(V.sub(W[`hip_${sd}`].p, AT[sd])) - legLen(k)) * 0.6);
const KNEE0 = P.kneeAngle(L.fk(hold0, contacts), 'r');
// Right-leg abduction measured in the pelvis frame (deg, + away from the midline).
const abdR = (W) => Math.asin(Math.max(-1, Math.min(1, V.dot(V.norm(V.sub(W.knee_r.p, W.hip_r.p)), Q.rot(W.pelvis.q, [0, 0, 1]))))) / R.DEG;
// Leg flexion in the pelvis frame (deg, + forward): the legs stay in line with the pelvis front-to-back.
const flexOf = (W, sd) => Math.asin(Math.max(-1, Math.min(1, -V.dot(V.norm(V.sub(W[`knee_${sd}`].p, W[`hip_${sd}`].p)), Q.rot(W.pelvis.q, [1, 0, 0]))))) / R.DEG;
const lowHip = (W) => Math.min(P.bottomOf(W, 'pelvis'), P.bottomOf(W, 'buttock_r'), P.bottomOf(W, 'thigh_r'));
// Place the body (root position and rotation, plus optional spine side bend) so the planted elbow stays on its point.
// extra(W) adds residuals; small pulls keep the root near the starting values (the chest stays square to the front).
// Free: root x, y, z and roll, the supporting shoulder blade (protract / elevate) and optionally the side bend.
function place(pose, extra, { sag = false, sagRef = 0, sagW = 0.1, sagMin = -99 } = {}) {
  const r0 = pose.root, sc0 = base.ch.sc_r;
  const set = (x) => { const q = clone(pose); q.root = { pos: [x[0], x[1], x[2]], rot: { yaw: -90, pitch: 0, roll: x[3] } }; q.ch.sc_r = { protract: x[4], elevate: x[5] }; if (sag) setSag(q, x[6]); return q; };
  const res = (x) => { const W = L.fk(set(x), contacts); return [...sphere(W), ...extra(W), x[2] * 0.3, (x[4] - sc0.protract) * 0.05, (x[5] - sc0.elevate) * 0.05, Math.min(0, x[5] + 9.5) * 3, Math.min(0, x[4] + 22) * 3, Math.max(0, x[4] - 28) * 3].concat(sag ? [(x[6] - sagRef) * sagW, Math.min(0, x[6] - sagMin) * 5] : []); };
  const x0 = [r0.pos[0], r0.pos[1], r0.pos[2] || 0, r0.rot.roll, pose.ch.sc_r.protract, pose.ch.sc_r.elevate].concat(sag ? [pose.ch.spine_l5.latFlex] : []);
  return set(R.solveLM(x0, res, { iters: 800 }).x.map(r3));
}
const setup = place(Object.assign(setSag(clone(hold0), SAG), { root: { pos: [hold0.root.pos[0], hold0.root.pos[1] - 12, 0], rot: { yaw: -90, pitch: 0, roll: hold0.root.rot.roll + 8 } } }),
  (W) => [lowHip(W) * 3, ...knee(SETUP_KNEE)(W).map((v) => v * 8), (abdR(W) + 20) * 0.5], { sag: true, sagRef: SAG, sagW: 0.02, sagMin: -14.5 });
// Every other key comes from one family: spine side bend, pelvis height above the mat, right-leg abduction and knee bend
// interpolated between the setup and the hold; the solve (root x, y, roll) keeps the elbow on its mat point.
const Ws = L.fk(setup, contacts);
// The elbow angle is interpolated too, so the shoulder travels smoothly over its sphere about the planted elbow.
const KEY = { setup: { sag: setup.ch.spine_l5.latFlex, hip: lowHip(Ws), abd: abdR(Ws), knee: SETUP_KNEE, elbow: P.elbowAngle(Ws, 'r') }, hold: { sag: 0, hip: lowHip(W0), abd: abdR(W0), knee: KNEE0, elbow: P.elbowAngle(L.fk(hold0, contacts), 'r') } };
function key(k, start) {
  const p = setSag(clone(start || hold0), k.sag);
  return finish(place(p, (W) => [(lowHip(W) - k.hip) * 3, (abdR(W) - k.abd) * 0.5, ...knee(k.knee)(W).map((v) => v * 6), (P.elbowAngle(W, 'r') - k.elbow) * 0.5]));
}
function between(u) {
  const e = u, mix = (f) => KEY.setup[f] + (KEY.hold[f] - KEY.setup[f]) * e;
  const lerp = (a, b) => r3(a + (b - a) * e);
  const start = clone(hold0); start.root = { pos: setup.root.pos.map((v, i) => lerp(v, hold0.root.pos[i])), rot: { yaw: -90, pitch: 0, roll: lerp(setup.root.rot.roll, hold0.root.rot.roll) } };
  return key({ sag: mix('sag'), hip: mix('hip'), abd: mix('abd'), knee: mix('knee'), elbow: mix('elbow') }, start);
}
// Breathing settle: the hips dip dy cm toward the mat (or lift) with a matching small side bend; legs keep their length.
const breath = (dy) => key({ sag: dy * +(0.8), hip: KEY.hold.hip + dy, abd: KEY.hold.abd, knee: KNEE0, elbow: KEY.hold.elbow });
const poses = { setup: finish(setup), hold: key(KEY.hold) };
// Hold: breathing settle sampled every 0.4 s (solved keys, so the elbow stays planted between them too).
// dy: hips dip up to 0.6 cm on each breath (about 3 s per breath) and come back up.
const HOLD = [2.2, 10.8], breathKeys = [];
for (let t = HOLD[0] + 0.4, i = 0; t < HOLD[1] - 0.2; t += 0.4, i++) {
  const ph = (t - HOLD[0]) / 3 * 2 * Math.PI, dy = r3(-0.3 * (1 - Math.cos(ph)) * Math.min(1, (t - HOLD[0]) / 1.5) + 0.15 * Math.sin(ph / 2));
  poses[`b${i}`] = breath(dy); breathKeys.push({ t: +t.toFixed(2), pose: `b${i}` });
}
const N = 14;
for (let i = 1; i < N; i++) poses[`lift${i}`] = between(i / N);
const lift = (t0, t1, rev) => Array.from({ length: N - 1 }, (_, i) => ({ t: +(t0 + ((t1 - t0) * (i + 1)) / N).toFixed(3), pose: `lift${rev ? N - 1 - i : i + 1}` }));
const keyframes = [
  { t: 0, pose: 'setup' }, { t: 1.0, pose: 'setup' }, ...lift(1.0, 2.2), { t: 2.2, pose: 'hold' },
  ...breathKeys, { t: 10.8, pose: 'hold' },
  { t: 11.2, pose: 'hold' }, ...lift(11.2, 12.2, true), { t: 12.2, pose: 'setup' }, { t: 13.0, pose: 'setup' },
];
// top arm: wrist straight above the left shoulder (elbow almost straight), palm toward the feet, thumb side forward
const ARM_L = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron'];
let prevL = null;
function topArm(p) {
  const q0 = clone(p);
  q0.ch.elbow_l = { flex: 5 }; q0.ch.wrist_l = { pron: 0, flex: 0, dev: 0 };
  if (prevL) for (const j of ['shoulder_l', 'elbow_l', 'wrist_l']) q0.ch[j] = clone(prevL[j]); else q0.ch.shoulder_l = { plane: 90, elev: 90, axial: 0 };
  const S = L.fk(q0, contacts).shoulder_l.p, tgt = V.add(S, [0, L.reach(5), 0]);
  let best = null;
  for (const g of prevL ? [null] : [[90, 90, 0], [0, 90, 0], [45, 90, 60], [90, 90, -60]]) {
    const q1 = clone(q0); if (g) q1.ch.shoulder_l = { plane: g[0], elev: g[1], axial: g[2] };
    const r = L.solvePose(q1, ARM_L, [(W) => V.sub(W.wrist_l.p, tgt).map((v) => v * 3), (W) => V.sub(Q.rot(W.wrist_l.q, [1, 0, 0]), [1, 0, 0]).map((v) => v * 3), (W, q) => [q.ch.elbow_l.flex < 0 ? -q.ch.elbow_l.flex : 0]], { contacts, iters: 400 });
    if (!best || r.cost < best.cost) best = r;
  }
  prevL = { shoulder_l: best.pose.ch.shoulder_l, elbow_l: best.pose.ch.elbow_l, wrist_l: best.pose.ch.wrist_l };
  best.pose.ch.sc_l = { protract: 4, elevate: 4 };
  return best.pose;
}
const armCost = {};
for (const n of ['hold', ...Object.keys(poses).filter((k) => k !== 'hold')]) poses[n] = topArm(poses[n]);
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };

/* ---------- Measures, kinematics fill, checks ---------- */
const setK = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
let dbMin = 1e9, vert = 0;
{ const tl = R.buildTimeline(ex); for (let i = 0; i <= 600; i++) { const W = R.evalPose(rig, tl.pose((i / 600) * ex.timeline.duration), contacts); dbMin = Math.min(dbMin, DB.dumbbellMinY(W, 'l')); vert = Math.max(vert, V.angle(V.sub(W.wrist_l.p, W.shoulder_l.p), [0, 1, 0])); } }
console.log(`  dumbbell lowest ${dbMin.toFixed(1)} cm, top arm max ${vert.toFixed(1)}° from vertical`);
setK('Top arm', 'setup', 'Dumbbell held straight up over the left shoulder'); setK('Top arm', 'peak', `Within ${Math.ceil(vert)}° of vertical through the whole set`);
const deg = (v) => `≈${Math.round(v)}°`;
const meas = (name) => {
  const p = poses[name], W = L.fk(p, contacts);
  const mid = (a, b) => V.scale(V.add(W[a].p, W[b].p), 0.5);
  const trunk = V.sub(mid('shoulder_r', 'shoulder_l'), W.pelvis.p), leg = V.sub(mid('hip_r', 'hip_l'), mid('ankle_r', 'ankle_l'));
  return { line: V.angle(trunk, leg), latFlex: ['spine_l5', 'spine_t12', 'spine_t6'].reduce((s, j) => s + p.ch[j].latFlex, 0), elbow: P.elbowAngle(W, 'r'), pelvisY: Math.min(P.bottomOf(W, 'pelvis'), P.bottomOf(W, 'buttock_r')),
    incline: V.angle(leg, [1, 0, 0]) , hipR: p.ch.hip_r, knee: P.kneeAngle(W, 'r'), min: L.shapeMinY(W) };
};
const ms = meas('setup'), mh = meas('hold');
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Body line', 'setup', `Hips on the mat: trunk ${deg(ms.line)} off the leg line`); set('Body line', 'peak', `${deg(mh.line)} off straight (trunk vs legs); legs ${deg(mh.incline)} up from the mat`);
set('Elbow position', 'setup', 'On the mat under the shoulder, forearm pointing forward'); set('Elbow position', 'peak', 'Directly under the shoulder, forearm pointing forward');
set('Elbow flexion', 'setup', deg(ms.elbow)); set('Elbow flexion', 'peak', deg(mh.elbow));
set('Pelvis lift', 'setup', 'Pelvis resting on the mat'); set('Pelvis lift', 'peak', `Pelvis ${Math.round(mh.pelvisY)} cm off the mat`);
set('Trunk lateral bend', 'setup', `${deg(-ms.latFlex)} toward the ceiling`); set('Trunk lateral bend', 'peak', deg(Math.abs(mh.latFlex)));
set('Tempo', 'setup', '1 s propped on the forearm'); set('Tempo', 'peak', '1.2 s lift, 9 s hold with breathing settles, 1 s lower, 0.8 s rest');
ex.exercise.reference.note = P.NOTE;
console.log(`Dumbbell Side Bridge: wrote ${L.write(ex)}  E=${E} W=${WT} BACK=${BACK.toFixed(1)}`);
for (const n of Object.keys(poses)) { const m = meas(n); console.log(`  ${n.padEnd(7)} elbErr=${V.len(V.sub(L.fk(poses[n], contacts).elbow_r.p, E)).toFixed(3)} line=${m.line.toFixed(1)} incline=${m.incline.toFixed(1)} latFlex=${m.latFlex.toFixed(1)} elbow=${m.elbow.toFixed(1)} pelvisY=${m.pelvisY.toFixed(1)} knee=${m.knee.toFixed(1)} hipR=${JSON.stringify(m.hipR)} hipL=${JSON.stringify(poses[n].ch.hip_l)} min=${m.min.y.toFixed(2)}(${m.min.id})`); }
const sw = P.sweep(ex, [{ joint: 'elbow_r', p: E }]);
console.log('  sweep', JSON.stringify(sw));
if (dbMin < 0 || vert > 12) { console.error('FAIL: top arm / dumbbell'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted forearm or foot slides'); process.exitCode = 1; }
