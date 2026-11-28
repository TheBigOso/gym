// Elbow to Knee Side Plank Crunch (GymVisual #11214, movement reference only; page not readable here). Forearm side plank
// on the right forearm (authored on the right; the player mirrors), feet stacked, left fingertips behind the head with
// the elbow pointing up. Holding the hips up, draw the top (left) knee forward and up while the trunk curls and turns
// down toward it so the left elbow meets the left knee in front of the body; return to the straight side plank and
// repeat. The bottom (right) forearm and right foot stay planted; the left foot leaves the right foot during each crunch.
// Side plank frame, elbow-on-the-mat placement and leg fitting copied from author-side-plank.js.
const L = require('./lib');
const { R, V, Q, rig, clone } = L;
const P = require('./families/prone');
const CB = require('./families/core-b');
const F6 = require('./families/b6-17');
const meta = require('./meta/elbow-to-knee-side-plank-crunch.json');

const r3 = (v) => Math.round(v * 1000) / 1000;
const ease = (u) => u * u * (3 - 2 * u);
const DROP = 0;          // upper arm vertical in the hold (cm below a vertical upper arm)
const WRIST_Y = P.PALM;  // wrist joint height: flat palm on the mat
const TILT = 0;          // hand roll, thumb side up (deg)
const FEET_ABD = -3.5;    // legs drawn together so the feet stack (hip adduction, deg)

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

const KNEE_HOLD = (W) => [(V.len(V.sub(W.hip_r.p, AT.r)) - legLen(KNEE0)) * 12];
const W0c = L.fk(hold0, contacts);
const HOLD = { hip: lowHip(W0c), abd: abdR(W0c), elbow: P.elbowAngle(W0c, 'r') };
// Crunch amount u (0 = straight side plank, 1 = elbow to knee): spine flexion and a turn toward the floor, top leg drawn
// in (hip and knee flexion), top hand behind the head. place() keeps the right elbow on its mat point and the hips up.
const SPL = { spine_l5: 0.2, spine_t12: 0.42, spine_t6: 0.38 }, SPR = { spine_l5: 0.12, spine_t12: 0.46, spine_t6: 0.42 };
const FLEX = +(process.env.FLEX || 60), ROT = +(process.env.ROT || 34), HIPF = +(process.env.HIPF || 105), KNEEF = +(process.env.KNEEF || 110);
let ARM_L = null;
function crunch(u, ref) {
  let p = clone(hold0);
  for (const j in SPL) p.ch[j] = { rot: +(ROT * u * SPR[j]).toFixed(2), flex: +(FLEX * u * SPL[j]).toFixed(2), latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: +(10 * u).toFixed(2) }; p.ch.head_c1 = { rot: 0, flex: +(8 * u).toFixed(2) };
  p.ch.hip_l = { flex: +(HIPF * u).toFixed(2), abd: +(FEET_ABD + 6 * u).toFixed(2), rot: 0 }; p.ch.knee_l = { flex: +(9 + (KNEEF - 9) * u).toFixed(2) }; p.ch.ankle_l = { dorsi: +(-10 * u).toFixed(2) };
  p.ik = clone(hold0.ik); if (u > 0) p.ik.leg_l.weight = 0;
  p = place(p, (W) => [(lowHip(W) - HOLD.hip) * 3, (abdR(W) - HOLD.abd) * 0.5, ...KNEE_HOLD(W), (P.elbowAngle(W, 'r') - HOLD.elbow) * 0.5]);
  p = CB.cradle(p, { side: 'l', guess: ref, ref, elbowAnt: +(process.env.EA || 30), elbowOut: 16, floor: 1.0 }); delete p.__cost;
  return u > 0 ? P.fitAll(p, contacts) : P.fitAll(p, contacts);
}
let seed = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  const q = CB.cradle(clone(hold0), { side: 'l', guess: g }); if (!seed || q.__cost < seed.__cost) seed = q;
}
ARM_L = CB.armOf(seed, 'l');
const US = [0, 0.25, 0.5, 0.75, 1, 1.03];
const poses = {}; let prev = ARM_L;
for (const u of US) { const n = `c${Math.round(u * 100)}`; poses[n] = crunch(u, prev); prev = CB.armOf(poses[n], 'l'); }
// keep the left foot exactly stacked in the straight plank (planted between crunches)
const up = (t0, t1) => [0.25, 0.5, 0.75].map((u, i) => ({ t: +(t0 + ((t1 - t0) * (i + 1)) / 4).toFixed(2), pose: `c${u * 100}` }));
const down = (t0, t1) => [0.75, 0.5, 0.25].map((u, i) => ({ t: +(t0 + ((t1 - t0) * (i + 1)) / 4).toFixed(2), pose: `c${u * 100}` }));
const keyframes = [{ t: 0, pose: 'c0' }, { t: 0.6, pose: 'c0' }, ...up(0.6, 1.6), { t: 1.6, pose: 'c100' }, { t: 2.0, pose: 'c103' }, ...down(2.0, 3.2), { t: 3.2, pose: 'c0' },
  { t: 3.6, pose: 'c0' }, ...up(3.6, 4.6), { t: 4.6, pose: 'c100' }, { t: 5.0, pose: 'c103' }, ...down(5.0, 6.2), { t: 6.2, pose: 'c0' }, { t: 6.8, pose: 'c0' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
const hipPk = Math.max(...Object.values(poses).map((p) => Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex)));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hipPk) - 4, max: Math.ceil(hipPk) + 4 };
ex.exercise.reference.note = P.NOTE;

const deg = (v) => `≈${Math.round(v)}°`;
const Wh = L.fk(poses.c0, contacts), Wc = L.fk(poses.c100, contacts);
const ek = (W) => V.len(V.sub(W.elbow_l.p, W.knee_l.p));
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (!k) throw new Error('kin ' + p); k[f] = v; };
set('Body line', 'setup', `Straight side plank, pelvis ${Math.round(lowHip(Wh))} cm off the mat`); set('Body line', 'peak', `Hips held (pelvis ${Math.round(lowHip(Wc))} cm off the mat)`);
set('Trunk', 'setup', 'Neutral'); set('Trunk', 'peak', `${deg(FLEX)} spinal flexion with ${deg(ROT)} turn toward the floor`);
set('Top leg', 'setup', 'Stacked on the bottom leg'); set('Top leg', 'peak', `Hip ${deg(poses.c100.ch.hip_l.flex)}, knee ${deg(P.kneeAngle(Wc, 'l'))}; elbow ${Math.round(ek(Wc))} cm from the knee`);
set('Support', 'setup', `Elbow under the shoulder, elbow ${deg(HOLD.elbow)}`); set('Support', 'peak', 'Unchanged (forearm and bottom foot planted)');
set('Tempo', 'setup', 'Plank 0.6 s'); set('Tempo', 'peak', '1 s in, 0.4 s squeeze, 1.2 s out, 0.4 s plank per rep; 2 reps per 6.8 s loop');
const sw = P.sweep(ex, [{ joint: 'elbow_r', p: E }]);
const lim = F6.limitViolations(poses);
console.log(`Elbow to knee side plank crunch: wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)} limits ${JSON.stringify(lim)} measure ${JSON.stringify(ex.checks.measure)}`);
for (const n of Object.keys(poses)) { const W = L.fk(poses[n], contacts); console.log(`  ${n.padEnd(5)} elbErr=${V.len(V.sub(W.elbow_r.p, E)).toFixed(2)} lowHip=${lowHip(W).toFixed(1)} ek=${ek(W).toFixed(1)} gap=${Math.min(...['thigh_l', 'quad_l'].map((id) => F6.gapTo(W, id, W.elbow_l.p))).toFixed(1)} footL=${P.bottomOf(W, 'foot_l').toFixed(1)} root=${JSON.stringify(poses[n].root)}`); }
if (sw.slide > 0.05 || sw.drift > 0.5 || sw.floor < -0.5 || lim.length) { console.error('FAIL elbow-to-knee-side-plank-crunch'); process.exitCode = 1; }
