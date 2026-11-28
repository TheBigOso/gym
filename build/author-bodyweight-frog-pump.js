// Bodyweight Frog Pump (GymVisual 7068, movement reference only; page not readable at authoring time). Supine on a mat,
// soles of the feet pressed together close to the hips with the feet on their outer edges and the knees falling wide
// (hips abducted and turned out), arms on the mat by the sides (planted hands). The pelvis rolls up about the upper back
// until the hips are about level with the shoulders (glute bridge mechanics from author-glute-bridge.js, feet as in
// author-frog-hip-thrust.js), short squeeze, then lowers to just touch the mat. Bilateral.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const FG = require('./families/b4-calvesglutes');
const meta = require('./meta/bodyweight-frog-pump.json');

const UB = (W) => Math.min(H.bottomOf(W, 'chest'), H.bottomOf(W, 'traps_r'), H.bottomOf(W, 'traps_l'));
const lie = H.lieBase();
const W0 = L.fk(lie), SX = W0.shoulder_r.p[0], P0 = lie.root.rot.pitch, L5 = lie.ch.spine_l5.flex;
function trunk(dP, l5) { // as the glute bridge: upper back stays on the mat, head resting
  const p = clone(lie); p.root.rot.pitch = r1(P0 + dP); p.ch.spine_l5.flex = r1(l5);
  return L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.neck_c7.flex', 'ch.head_c1.flex'], [
    (W) => [(UB(W) - 0.2) * 2, Math.min(0, H.bottomOf(W, 'neck') - 0.5) * 6, Math.min(0, UB(W)) * 6, Math.min(0, H.bottomOf(W, 'buttock_r') - 0.1) * 4, Math.min(0, H.bottomOf(W, 'hair') - 0.3) * 6, Math.min(0, H.bottomOf(W, 'thigh_r') - 0.05) * 8, (W.shoulder_r.p[0] - SX) * 2],
    (W, q) => [(q.ch.head_c1.flex - q.ch.neck_c7.flex * 0.5) * 0.3, (q.ch.neck_c7.flex - (-22 + dP * 0.6)) * 0.1, Math.max(0, q.ch.neck_c7.flex - 39) * 3, Math.max(0, q.ch.head_c1.flex - 29) * 3, Math.max(0, -27 - q.ch.neck_c7.flex) * 3, Math.max(0, -27 - q.ch.head_c1.flex) * 3]], { iters: 400 }).pose;
}
const l5At = (f) => L5 + (0 - L5) * f;
// frog feet: rolled ROLL onto the outer edge, toes turned out YAW; knee pole out and up
const ROLL = 60, YAW = 30, KPOLE = [0.3, 0.75, 1];
const footR = Q.mul(L.footRot(-YAW), Q.axis([1, 0, 0], ROLL)), footL = Q.mirrorZ(footR);
const HAND = { r: [r1(W0.hip_r.p[0] + 4), 2.7, 24], l: [r1(W0.hip_r.p[0] + 4), 2.7, -24] };
const contacts = [Object.assign(H.legC('r', { pole: KPOLE }), { handRot: H.qArr(footR) }), Object.assign(H.legC('l', { pole: [KPOLE[0], KPOLE[1], -KPOLE[2]] }), { handRot: H.qArr(footL) }), H.handC('r', [0, 0.5, 1]), H.handC('l', [0, 0.5, -1])];
const legOnly = contacts.slice(0, 2);
const footShape = L.rig.shapes.find((s) => s.id === 'foot_r');
const FOOT_DX = 38; // ankle this far in front of the hip joint (feet close to the hips)
const FOOT = (() => {
  const x = r1(W0.hip_r.p[0] + FOOT_DX);
  const ext = (tgt) => { const p = clone(lie); p.ik = { leg_r: { target: tgt, weight: 1 } }; const g = R.shapeWorld(L.fk(p, legOnly), footShape); return { minY: g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]), minZ: g.c[2] - Math.hypot(g.axes[0][2], g.axes[1][2], g.axes[2][2]) }; };
  let t = [x, 10, 8];
  for (let k = 0; k < 5; k++) { const e = ext(t); t = [x, t[1] - e.minY + 0.15, t[2] - e.minZ + 0.4]; }
  return { r: t.map((v) => +v.toFixed(2)), l: [t[0], t[1], -t[2]].map((v) => +v.toFixed(2)) };
})();
const ARM_GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 30, elev: 15, axial: 0 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 80, flex: 0, dev: 0 } }, { [`shoulder_${s}`]: { plane: -20, elev: 20, axial: 60 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: 0, dev: 0 } }];
function poseAt(dP, f) {
  let p = trunk(dP, l5At(f));
  p.ik = { leg_r: { target: FOOT.r.slice(), weight: 1 }, leg_l: { target: FOOT.l.slice(), weight: 1 } };
  p.ch.sc_r = { protract: 0, elevate: 0 }; p.ch.sc_l = { protract: 0, elevate: 0 };
  p = H.fitLeg(p, 'r', contacts[0], FOOT.r, { rot: -30, abd: 35 }); p = H.fitLeg(p, 'l', contacts[1], FOOT.l, { rot: -30, abd: 35 });
  for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], ARM_GUESS(s)); delete p.__cost; }
  p.ik.arm_r = { target: HAND.r.slice(), weight: 1 }; p.ik.arm_l = { target: HAND.l.slice(), weight: 1 };
  return p;
}
// top: the pelvis rolls up until the shoulder-to-hip line is TOP_TILT degrees short of the hips' natural limit (hip
// flexion channel about 5 degrees, inside the rig's extension range with the hips turned out)
const tilt = (W) => Math.atan2(W.hip_r.p[1] - W.shoulder_r.p[1], W.hip_r.p[0] - W.shoulder_r.p[0]) / R.DEG;
const HIP_TOP = 0;
let lo = 5, hi = 70, DP_TOP = 30;
for (let i = 0; i < 22; i++) { DP_TOP = (lo + hi) / 2; if (poseAt(DP_TOP, 1).ch.hip_r.flex > HIP_TOP) lo = DP_TOP; else hi = DP_TOP; }
DP_TOP = r1(DP_TOP);
const at = (f) => poseAt(DP_TOP * f, f);
const poses = { lie: at(0), u33: at(0.33), u66: at(0.66), top: at(1), squeeze: at(1.02), d66: at(0.66), d33: at(0.33), touch: at(0.03) };
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.05, pose: 'u33' }, { t: 1.3, pose: 'u66' }, { t: 1.6, pose: 'top' }, { t: 1.9, pose: 'squeeze' }, { t: 2.2, pose: 'top' },
  { t: 2.6, pose: 'd66' }, { t: 3.0, pose: 'd33' }, { t: 3.3, pose: 'touch' }, { t: 3.4, pose: 'lie' }, { t: 5.4, pose: 'lie' }];
FG.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l', 'arm_r', 'arm_l'] });
const Wl = L.fk(poses.lie, contacts), Wt = L.fk(poses.top, contacts);
const abdOf = (W) => Math.asin(Math.max(-1, Math.min(1, V.dot(V.norm(V.sub(W.knee_r.p, W.hip_r.p)), Q.rot(W.pelvis.q, [0, 0, 1]))))) / R.DEG;
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${Math.round(poses.lie.ch.hip_r.flex)}° (lying)`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° at the top (shoulder-to-hip line ${Math.round(tilt(Wt))}° from the floor)`);
set('Hip abduction and external rotation', 'setup', `Thighs ≈${Math.round(abdOf(Wl))}° out (abd ${poses.lie.ch.hip_r.abd}°, rot ${poses.lie.ch.hip_r.rot}°)`); set('Hip abduction and external rotation', 'peak', `≈${Math.round(abdOf(Wt))}° out (abd ${poses.top.ch.hip_r.abd}°, rot ${poses.top.ch.hip_r.rot}°); soles together, feet on their outer edges`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wl, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Hip height', 'setup', `Hip joint ${r1(Wl.hip_r.p[1])} cm above the floor`); set('Hip height', 'peak', `${r1(Wt.hip_r.p[1])} cm (+${r1(Wt.hip_r.p[1] - Wl.hip_r.p[1])} cm)`);
set('Tempo', 'setup', 'Lying 0.8 s'); set('Tempo', 'peak', '0.8 s up, 0.6 s squeeze, 1.2 s down, 2 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wl.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Bodyweight Frog Pump: feet ${JSON.stringify(FOOT)} roll ${DP_TOP} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} travel ${r1(travel)} tilt ${r1(tilt(Wt))}`);
for (const n of ['lie', 'top']) console.log(`  ${n} hip ${JSON.stringify(poses[n].ch.hip_r)} knee ${r1(H.kneeOf(L.fk(poses[n], contacts), 'r'))} abd ${r1(abdOf(L.fk(poses[n], contacts)))} kneeY ${r1(L.fk(poses[n], contacts).knee_r.p[1])} kneeZ ${r1(L.fk(poses[n], contacts).knee_r.p[2])}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot or hand slides'); process.exitCode = 1; }
if (rep.floor < -0.5) { console.error('FAIL: floor'); process.exitCode = 1; }
