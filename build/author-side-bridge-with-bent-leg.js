// Side Bridge with Bent Leg (GymVisual #11777, page not readable; movement from the name): the bent-knee (modified) side
// bridge, authored on the right side (the player mirrors). Lying on the right side (head toward -X, chest facing +Z),
// propped on the right forearm with the elbow under the shoulder, top hand on the hip; knees bent about 90 degrees with the shins behind
// (the right shin on its outer side on the mat, the left leg stacked on it). Lift the hips off the mat until shoulder, hip
// and knee line up, hold 3 s with a breathing settle, lower. Pivots: the planted elbow (kept on its mat point, wrist IK
// target) and the right knee (kept on its mat point; ankle planted with a world-locked foot); left ankle planted on the
// right ankle. Each key is placed by solving root x / y / z / roll and the supporting shoulder blade (side-plank method).
const L = require('./lib');
const { R, V, Q, rig, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const X = require('./families/b6-14');
const meta = require('./meta/side-bridge-with-bent-leg.json');

const r3 = (v) => Math.round(v * 1000) / 1000;
const WRIST_Y = P.PALM, SAG = -9, KNEE = 90, HIPF = 0;
const SHANK = rig.shapes.find((s) => s.id === 'shank_r').r; // [knee end, ankle end]
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const base = { root: { pos: [0, 34, 0], rot: { yaw: -90, pitch: 0, roll: 74 } }, ch: {
  spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 },
  hip_r: { flex: HIPF, abd: 0, rot: 0 }, hip_l: { flex: HIPF, abd: -6, rot: 0 }, knee_r: { flex: KNEE }, knee_l: { flex: KNEE }, ankle_r: { dorsi: -20 }, ankle_l: { dorsi: -20 },
  sc_r: { protract: 4, elevate: -4 }, sc_l: { protract: 0, elevate: 0 },
} };
// top hand resting on the hip (channels from the standing hands-on-hips pose)
const HOH = (() => { const st = clone(L.POSES.standing().pose); delete st.ik; return H.handsOnHips(st).ch; })();
Object.assign(base.ch, { shoulder_l: clone(HOH.shoulder_l), elbow_l: clone(HOH.elbow_l), wrist_l: clone(HOH.wrist_l) });
function solveFK(pose, paths, objs) { const s = L.solvePose(pose, paths, objs, { iters: 600 }); return s.pose; }
// Hold frame (FK legs): shoulder over the elbow point, right knee and shin resting on the mat, body straight
const hold0 = solveFK(base, ['root.pos.1', 'root.rot.roll', 'ch.hip_r.rot', 'ch.hip_r.abd', 'ch.ankle_r.dorsi'], [L.obj.atY('shoulder_r', P.ELBOW_Y + P.UA, 3), L.obj.atY('knee_r', SHANK[0] + 0.7, 3), L.obj.atY('ankle_r', 5.2, 3), (W) => [Math.min(0, P.bottomOf(W, 'foot_r') - 0.2) * 3], (W, q) => [q.ch.hip_r.abd * 0.2, (q.ch.ankle_r.dorsi + 20) * 0.02, (q.root.rot.roll - 72) * 0.05, Math.max(0, -68 - q.ch.ankle_r.dorsi) * 3, Math.max(0, q.ch.ankle_r.dorsi - 30) * 3]]);
// Left leg stacked: shin on the right shin, knee on the right knee
const W0a = L.fk(hold0);
const stackK = V.add(W0a.knee_r.p, [0, 2 * SHANK[0] + 0.2, 0]), stackA = V.add(W0a.ankle_r.p, [0, 2 * SHANK[1] + 0.2, 0]);
const hold1 = solveFK(hold0, ['ch.hip_l.flex', 'ch.hip_l.abd', 'ch.hip_l.rot', 'ch.knee_l.flex', 'ch.ankle_l.dorsi'], [L.obj.at('knee_l', stackK, 2), L.obj.at('ankle_l', stackA, 2), (W, q) => [(q.ch.ankle_l.dorsi - hold0.ch.ankle_r.dorsi) * 0.1]]);
const W0 = L.fk(hold1), S0 = W0.shoulder_r.p;
const E = [r3(S0[0]), P.ELBOW_Y, r3(S0[2])];
const WT = [E[0], WRIST_Y, r3(E[2] + Math.sqrt(P.FA ** 2 - (WRIST_Y - P.ELBOW_Y) ** 2))];
const K = W0.knee_r.p.map(r3), AT = { r: W0.ankle_r.p.map(r3), l: W0.ankle_l.p.map(r3) };
const hand = Q.fromBasis([0, -1, 0], [0, 0, -1], [1, 0, 0]);
const contacts = [
  Object.assign(L.handContact('r'), { label: 'Right forearm', pole: [0.15, -1, 0], handRot: P.qArr(hand) }),
  Object.assign(L.legContact('r'), { label: 'Right knee and shin', pole: [0, 0, 1], handRot: P.qArr(W0.ankle_r.q) }),
  Object.assign(L.legContact('l'), { label: 'Left leg (stacked)', pole: [0, 0, 1], handRot: P.qArr(W0.ankle_l.q) }),
];
hold1.ik = { arm_r: { target: WT, weight: 1 }, leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } };
const sphere = (W) => V.sub(W.elbow_r.p, E).map((v) => v * 25);
const kneeFix = (W) => V.sub(W.knee_r.p, K).map((v) => v * 12);
const setSag = (p, s) => { for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 0, latFlex: r3(s * (j === 'spine_t6' ? 0.6 : 1)) }; return p; };
const thighTop = (W) => { const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === 'thigh_r')); return g.a[1] - g.r[0]; }; // hip end of the thigh capsule
const lowHip = (W) => Math.min(P.bottomOf(W, 'pelvis'), P.bottomOf(W, 'buttock_r'), thighTop(W));
function place(pose, extra, { sag = false, sagRef = 0, sagW = 0.1, sagMin = -99 } = {}) {
  const r0 = pose.root, sc0 = base.ch.sc_r;
  const set = (x) => { const q = clone(pose); q.root = { pos: [x[0], x[1], x[2]], rot: { yaw: x[6], pitch: x[7], roll: x[3] } }; q.ch.sc_r = { protract: x[4], elevate: x[5] }; if (sag) setSag(q, x[8]); return q; };
  const res = (x) => { const W = L.fk(set(x), contacts); return [...sphere(W), ...kneeFix(W), ...extra(W), (x[6] + 90) * 0.3, x[7] * 0.3, (x[4] - sc0.protract) * 0.05, (x[5] - sc0.elevate) * 0.05, Math.min(0, x[5] + 9.5) * 3, Math.min(0, x[4] + 22) * 3, Math.max(0, x[4] - 28) * 3].concat(sag ? [(x[8] - sagRef) * sagW, Math.min(0, x[8] - sagMin) * 5] : []); };
  const x0 = [r0.pos[0], r0.pos[1], r0.pos[2] || 0, r0.rot.roll, pose.ch.sc_r.protract, pose.ch.sc_r.elevate, r0.rot.yaw ?? -90, r0.rot.pitch ?? 0].concat(sag ? [pose.ch.spine_l5.latFlex] : []);
  return set(R.solveLM(x0, res, { iters: 900 }).x.map(r3));
}
const finish = (p) => P.fitAll(p, contacts);
const hold = place(clone(hold1), (W) => [(lowHip(W) - lowHip(W0)) * 3]);
const Wh = L.fk(hold, contacts);
const setup = place(Object.assign(setSag(clone(hold), SAG), { root: { pos: [hold.root.pos[0], hold.root.pos[1] - 10, hold.root.pos[2]], rot: { yaw: -90, pitch: 0, roll: hold.root.rot.roll + 8 } } }),
  (W) => [lowHip(W) * 3], { sag: true, sagRef: SAG, sagW: 0.02, sagMin: -14.5 });
const Ws = L.fk(setup, contacts);
const KEY = { setup: { sag: setup.ch.spine_l5.latFlex, hip: lowHip(Ws), elbow: P.elbowAngle(Ws, 'r') }, hold: { sag: 0, hip: lowHip(Wh), elbow: P.elbowAngle(Wh, 'r') } };
function key(k, start) { const p = setSag(clone(start || hold), k.sag); return finish(place(p, (W) => [(lowHip(W) - k.hip) * 3, (P.elbowAngle(W, 'r') - k.elbow) * 0.5])); }
function between(u) {
  const mix = (f) => KEY.setup[f] + (KEY.hold[f] - KEY.setup[f]) * u, lerp = (a, b) => r3(a + (b - a) * u);
  const start = clone(hold); start.root = { pos: setup.root.pos.map((v, i) => lerp(v, hold.root.pos[i])), rot: { yaw: lerp(setup.root.rot.yaw, hold.root.rot.yaw), pitch: lerp(setup.root.rot.pitch, hold.root.rot.pitch), roll: lerp(setup.root.rot.roll, hold.root.rot.roll) } };
  return key({ sag: mix('sag'), hip: mix('hip'), elbow: mix('elbow') }, start);
}
const poses = { setup: finish(setup), hold: key(KEY.hold) };
const ph = meta.timeline.phases.map((p) => p.end), D = meta.timeline.duration; // setup, lift, hold, lower, reset
const N = 10;
for (let i = 1; i < N; i++) poses[`lift${i}`] = between(X.ease(i / N));
const lift = (t0, t1, rev) => Array.from({ length: N - 1 }, (_, i) => ({ t: +(t0 + ((t1 - t0) * (i + 1)) / N).toFixed(3), pose: `lift${rev ? N - 1 - i : i + 1}` }));
const breathKeys = [];
for (let t = ph[1] + 0.5, i = 0; t < ph[2] - 0.2; t += 0.5, i++) { const phs = ((t - ph[1]) / 3) * 2 * Math.PI, dy = r3(-0.35 * (1 - Math.cos(phs))); poses[`b${i}`] = key({ sag: dy * 0.8, hip: KEY.hold.hip + dy, elbow: KEY.hold.elbow }); breathKeys.push({ t: +t.toFixed(2), pose: `b${i}` }); }
const keyframes = [{ t: 0, pose: 'setup' }, { t: ph[0], pose: 'setup' }, ...lift(ph[0], ph[1]), { t: ph[1], pose: 'hold' }, ...breathKeys, { t: ph[2], pose: 'hold' }, ...lift(ph[2], ph[3], true), { t: ph[3], pose: 'setup' }, { t: D, pose: 'setup' }];
X.wrapPoses(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const sw = P.sweep(ex, [{ joint: 'elbow_r', p: E }]);
const swK = P.sweep(ex, [{ joint: 'knee_r', p: K }]);
const meas = (p) => { const W = L.fk(p, contacts); return { line: V.angle(V.sub(W.shoulder_r.p, W.hip_r.p), V.sub(W.hip_r.p, W.knee_r.p)), latFlex: ['spine_l5', 'spine_t12', 'spine_t6'].reduce((s, j) => s + p.ch[j].latFlex, 0), elbow: P.elbowAngle(W, 'r'), knee: P.kneeAngle(W, 'r'), pelvisY: lowHip(W), kneeL: P.kneeAngle(W, 'l') }; };
const ms = meas(poses.setup), mh = meas(poses.hold);
const set = H.setKin(ex);
set('Body line', 'setup', `Hips on the mat: trunk ${Math.round(ms.line)}° off the hip-knee line`); set('Body line', 'peak', `${Math.round(mh.line)}° off straight (shoulder-hip vs hip-knee)`);
set('Elbow position', 'setup', 'On the mat under the shoulder, forearm pointing forward'); set('Elbow position', 'peak', 'Unchanged (planted)');
set('Knee flexion', 'setup', `Right ≈${Math.round(ms.knee)}°, left ≈${Math.round(ms.kneeL)}°`); set('Knee flexion', 'peak', `Right ≈${Math.round(mh.knee)}° (knee and shin on the mat)`);
set('Pelvis lift', 'setup', 'Pelvis resting on the mat'); set('Pelvis lift', 'peak', `Lowest hip point ${Math.round(mh.pelvisY)} cm off the mat`);
set('Tempo', 'setup', `${ph[0]} s propped`); set('Tempo', 'peak', `${(ph[1] - ph[0]).toFixed(1)} s lift, ${(ph[2] - ph[1]).toFixed(1)} s hold with a breathing settle, ${(ph[3] - ph[2]).toFixed(1)} s lower`);
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'rootTravel', 2);
console.log(`Side Bridge with Bent Leg: wrote ${L.write(ex)} E=${E} K=${K}\n  setup line ${ms.line.toFixed(1)} sag ${ms.latFlex.toFixed(1)} pelvisY ${ms.pelvisY.toFixed(1)} elbow ${ms.elbow.toFixed(0)}; hold line ${mh.line.toFixed(1)} pelvisY ${mh.pelvisY.toFixed(1)} knee ${mh.knee.toFixed(0)} kneeL ${mh.kneeL.toFixed(0)}\n  sweep ${JSON.stringify(sw)} kneeDrift ${swK.drift} travel ${pk.toFixed(1)}`);
X.finishChecks(ex, 'side-bridge-with-bent-leg', sw);
if (sw.drift > 0.05) { console.error('FAIL: elbow leaves its mat point'); process.exitCode = 1; }
if (swK.drift > 1.0) { console.error('FAIL: knee leaves its mat point'); process.exitCode = 1; }
