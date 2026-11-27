// Frog Hip Thrust (GymVisual #646412): upper back across the edge of a 45 cm bench, soles of the feet pressed together close
// to the hips with the feet on their outer edges and the knees wide (hips abducted and turned out), arms spread along the
// bench (planted hands). The trunk pivots on the bench edge: hips drop toward the floor, then drive up until the trunk is
// level; 0.8 s squeeze, 2 s down. Bilateral. Built on the single-leg and dumbbell hip thrusts (same bench-edge pivot).
// Feet: planted leg contacts with a constant world-locked foot orientation rolled onto the outer edge (soles facing each
// other); the knee pole points out and up so the thighs open.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const meta = require('./meta/frog-hip-thrust.json');

const BENCH_H = 45, BENCH_D = 36;
const EDGE = [0, BENCH_H, 0];
const BACK_PT = [+(process.env.BACK_X || -3.6), +(process.env.BACK_Y || 4), 0]; // spine_t6 local point on the bench edge (as the hip thrusts)
const HAND = { r: [-12, BENCH_H + +(process.env.HY ?? 4.5), 52], l: [-12, BENCH_H + +(process.env.HY ?? 4.5), -52] }; // raised so the athlete's thumbs and little fingers rest on the pad (mesh check)
const ARM_POLE = { r: [-0.6, -0.1, 1], l: [-0.6, -0.1, -1] };
const HTILT = +(process.env.HTILT ?? 8); // hands rolled thumb side up so the athlete's thumb rests on the pad instead of drooping into it
const handOutR = Q.mul(Q.axis([0, 0, 1], HTILT), Q.mirrorZ(Q.fromBasis([0, -1, 0], [0, 0, 1], [-1, 0, 0]))), handOutL = Q.mirrorZ(handOutR);
const ROLL = +(process.env.ROLL ?? 60), YAW = +(process.env.YAW ?? 30), FOOT_DX = +(process.env.FDX ?? 40), KPOLE = JSON.parse(process.env.KPOLE || '[0.6,0.6,1]');
// right foot: toes turned out YAW, rolled ROLL onto the outer edge (sole facing the left foot); left mirrored
const footR = Q.mul(L.footRot(-YAW), Q.axis([1, 0, 0], ROLL)), footL = Q.mirrorZ(footR);
const contacts = [Object.assign(H.legC('r', { pole: KPOLE }), { handRot: H.qArr(footR) }), Object.assign(H.legC('l', { pole: [KPOLE[0], KPOLE[1], -KPOLE[2]] }), { handRot: H.qArr(footL) }),
  Object.assign(H.handC('r', ARM_POLE.r), { handRot: H.qArr(handOutR) }), Object.assign(H.handC('l', ARM_POLE.l), { handRot: H.qArr(handOutL) })];
const legOnly = contacts.slice(0, 2);
const base = (() => { const p = H.lieBase(); p.root.pos = [40, 50, 0]; Object.assign(p.ch, { spine_l5: { rot: 0, flex: -3, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 3, latFlex: 0 } }); return p; })();
const TUCK = +(process.env.TUCK ?? 6); // posterior pelvic tilt at the top (deg): the pelvis tucks under while the ribcage stays level
function trunk(pitch, tuck = 0) {
  const p = clone(base); p.root.rot = { pitch: r1(pitch - tuck) };
  p.ch.spine_l5.flex = r1(p.ch.spine_l5.flex + 0.6 * tuck); p.ch.spine_t12.flex = r1(p.ch.spine_t12.flex + 0.4 * tuck);
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1'], [(W) => V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BACK_PT)), EDGE).map((v) => v * 3)]).pose;
  const tilt = pitch - 90;
  s.ch.neck_c7 = { rot: 0, flex: r1(18 + 0.15 * tilt) }; s.ch.head_c1 = { rot: 0, flex: r1(12 + 0.1 * tilt) };
  return s;
}
const trunkTilt = (W) => Math.atan2(W.hip_r.p[1] - W.shoulder_r.p[1], W.hip_r.p[0] - W.shoulder_r.p[0]) / R.DEG;
let lo = 60, hi = 120, P_TOP = 90;
for (let i = 0; i < 40; i++) { P_TOP = (lo + hi) / 2; if (trunkTilt(L.fk(trunk(P_TOP))) < 0) lo = P_TOP; else hi = P_TOP; }
P_TOP = r1(P_TOP);
const TOP_TILT = +(process.env.TOPTILT ?? -4); // final trunk line at the top (deg, hips slightly below the shoulders)
let P_TOPT = P_TOP;
{ let a = 60, b = 130; for (let i = 0; i < 40; i++) { P_TOPT = (a + b) / 2; if (trunkTilt(L.fk(trunk(P_TOPT, TUCK))) < TOP_TILT) a = P_TOPT; else b = P_TOPT; } P_TOPT = r1(P_TOPT + TUCK); }
if (!process.env.TOPTILT) P_TOPT = P_TOP; // default: the tucked top keeps the untucked pitch target (hips stay about level, within the hip limits)
// foot placement: ankle FOOT_DX in front of the hips at the top; height and side so the rolled foot's outer edge is on the
// floor and its sole meets the midline (soles together)
const footShape = L.rig.shapes.find((s) => s.id === 'foot_r');
const Wtop = L.fk(trunk(P_TOP));
const FOOT = (() => {
  const x = r1(Wtop.hip_r.p[0] + FOOT_DX);
  const ext = (tgt) => { const p = trunk(P_TOP); p.ik = { leg_r: { target: tgt, weight: 1 } }; const g = L.R.shapeWorld(L.fk(p, legOnly), footShape); return { minY: g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]), minZ: g.c[2] - Math.hypot(g.axes[0][2], g.axes[1][2], g.axes[2][2]) }; };
  let t = [x, 10, 8];
  for (let k = 0; k < 4; k++) { const e = ext(t); t = [x, t[1] - e.minY + 0.15, t[2] - e.minZ + 0.4]; }
  return { r: t.map((v) => +v.toFixed(2)), l: [t[0], t[1], -t[2]].map((v) => +v.toFixed(2)) };
})();
const buttY = (W) => Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'buttock_l'), H.bottomOf(W, 'pelvis'));
lo = P_TOP - 70; hi = P_TOP;
let P_BOT = P_TOP;
for (let i = 0; i < 40; i++) { P_BOT = (lo + hi) / 2; const p = trunk(P_BOT); p.ik = { leg_r: { target: FOOT.r, weight: 1 }, leg_l: { target: FOOT.l, weight: 1 } }; if (buttY(L.fk(p, legOnly)) < 7) lo = P_BOT; else hi = P_BOT; }
P_BOT = r1(P_BOT);
function poseAt(f) {
  const g = Math.max(0, Math.min(1.1, (f - 0.5) / 0.5)) ** 2, ptop = P_TOP + (P_TOPT - P_TOP) * Math.min(1, g);
  let p = trunk(P_BOT + (ptop - P_BOT) * f, TUCK * Math.max(0, Math.min(1.1, (f - 0.5) / 0.5)) ** 2);
  p.ik = { leg_r: { target: FOOT.r.slice(), weight: 1 }, leg_l: { target: FOOT.l.slice(), weight: 1 } };
  p.ch.sc_r = { protract: 0, elevate: 4 }; p.ch.sc_l = { protract: 0, elevate: 4 };
  p = H.fitLeg(p, 'r', contacts[0], FOOT.r, { rot: -30, abd: 35 }); p = H.fitLeg(p, 'l', contacts[1], FOOT.l, { rot: -30, abd: 35 });
  for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], [{ [`shoulder_${s}`]: { plane: 0, elev: 80, axial: 0 }, [`elbow_${s}`]: { flex: 60 }, [`wrist_${s}`]: { pron: 0, flex: 0, dev: 0 } }, { [`shoulder_${s}`]: { plane: 30, elev: 70, axial: -60 }, [`elbow_${s}`]: { flex: 60 }, [`wrist_${s}`]: { pron: 80, flex: 0, dev: 0 } }]); delete p.__cost; }
  p.ik.arm_r = { target: HAND.r.slice(), weight: 1 }; p.ik.arm_l = { target: HAND.l.slice(), weight: 1 };
  return p;
}
const poses = { bottom: poseAt(0), u25: poseAt(0.25), u50: poseAt(0.5), u75: poseAt(0.75), top: poseAt(1), squeeze: poseAt(1.015), d75: poseAt(0.75), d50: poseAt(0.5), d25: poseAt(0.25), low: poseAt(0.02) };
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }, { t: 1.1, pose: 'u25' }, { t: 1.4, pose: 'u50' }, { t: 1.7, pose: 'u75' }, { t: 2.0, pose: 'top' }, { t: 2.4, pose: 'squeeze' }, { t: 2.8, pose: 'top' },
  { t: 3.3, pose: 'd75' }, { t: 3.8, pose: 'd50' }, { t: 4.3, pose: 'd25' }, { t: 4.8, pose: 'low' }, { t: 5.3, pose: 'bottom' }, { t: 6.0, pose: 'bottom' }];
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [{ id: 'bench', kind: 'bench', center: [r1(EDGE[0] - BENCH_D / 2), 0, 0], size: [BENCH_D, BENCH_H, 150] }];
let pivot = 0, feetGap = 1e9;
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l', 'arm_r', 'arm_l'], probe: (W) => { pivot = Math.max(pivot, V.len(V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BACK_PT)), EDGE))); } });
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts);
const abdOf = (W) => Math.asin(Math.max(-1, Math.min(1, V.dot(V.norm(V.sub(W.knee_r.p, W.hip_r.p)), Q.rot(W.pelvis.q, [0, 0, 1]))))) / R.DEG;
const set = H.setKin(ex);
set('Bench height', 'setup', `${BENCH_H} cm bench across the upper back`); set('Bench height', 'peak', 'Upper back pivots on the bench edge');
set('Hip flexion', 'setup', `≈${Math.round(poses.bottom.ch.hip_r.flex)}° at the bottom`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° (pelvis tucked; shoulder-to-hip line about 10° short of level, inside the rig's hip extension and rotation limits)`);
set('Hip abduction and external rotation', 'setup', `Thighs ≈${Math.round(abdOf(Wb))}° out from the pelvis midline (channels abd ${poses.bottom.ch.hip_r.abd}°, rot ${poses.bottom.ch.hip_r.rot}°)`); set('Hip abduction and external rotation', 'peak', `≈${Math.round(abdOf(Wt))}° out (abd ${poses.top.ch.hip_r.abd}°, rot ${poses.top.ch.hip_r.rot}°); soles together, feet on their outer edges`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wb, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Trunk inclination', 'setup', `≈${Math.round(-trunkTilt(Wb))}° (hips below the shoulders)`); set('Trunk inclination', 'peak', `Shoulder-to-hip line ≈${Math.round(trunkTilt(Wt))}° from level (+ = hips higher), pelvis tucked ${TUCK}°`);
set('Tempo', 'setup', 'Hips down 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.8 s squeeze, 2.0 s down, 1.2 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Frog Hip Thrust: pitch ${P_BOT}..${P_TOP}, feet ${JSON.stringify(FOOT)}, wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} pivotErr ${pivot.toFixed(2)} travel ${r1(travel)}`);
for (const n of ['bottom', 'u50', 'top']) console.log(`  ${n} hip ${JSON.stringify(poses[n].ch.hip_r)} knee ${r1(H.kneeOf(L.fk(poses[n], contacts), 'r'))} abd ${r1(abdOf(L.fk(poses[n], contacts)))} kneeY ${r1(L.fk(poses[n], contacts).knee_r.p[1])}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot or hand slides'); process.exitCode = 1; }
