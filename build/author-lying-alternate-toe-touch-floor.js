// Lying Alternate Toe Touch Floor (GymVisual #11780; page not readable here, movement from the name and standard
// coaching): supine on a mat, legs long, arms overhead on the mat. The straight right leg rises toward vertical while the
// head and shoulders curl up with a turn to the right and the left hand reaches up the right leg toward the foot (it
// touches the shin: with a straight leg the toes are out of reach for most people); squeeze, lower; then the left leg
// and the right hand. The right arm stays overhead on the mat while the left reaches (and vice versa). The pelvis stays
// on the mat. Bilateral, alternating (the left side is the mirror of the right).
const F = require('./families/b6-20');
const { L, V, Q, r1, clone, CB } = F;
const meta = require('./meta/lying-alternate-toe-touch-floor.json');

const handLow = (W, s) => Math.min(...(s === 'r' ? CB.ARM_R : CB.ARM_L).map((id) => CB.bottomOf(W, id)));
let rest = CB.headDown(CB.lie({ kneeFlex: 0, spine: { l5: -2, t12: 2, t6: 4 }, pitch: 92 }), 0.2);
for (const s of ['r', 'l']) { rest.ch[`knee_${s}`] = { flex: 2 }; rest.ch[`ankle_${s}`] = { dorsi: -22 }; rest.ch[`hip_${s}`] = { flex: 0, abd: 0, rot: 0 }; }
rest = L.solvePose(rest, ['ch.hip_r.flex'], [(W) => [(F.heelLow(W, 'r') - 0.3) * 2]]).pose; rest.ch.hip_l = clone(rest.ch.hip_r);
// Arm overhead on (or hovering over) the mat, beside the ear
function armOver(pose, s, hover) {
  const solve = (p0) => {
    const p = clone(p0);
    p.ch.elbow_r = { flex: 8 }; p.ch.wrist_r = { pron: 0, flex: 0, dev: 0 }; p.ch.shoulder_r = { plane: 90, elev: 170, axial: 0 }; p.ch.sc_r = { protract: 2, elevate: 12 };
    return L.solvePose(p, ['ch.shoulder_r.elev'], [(W) => [(handLow(W, 'r') - hover) * 2], L.obj.reg('ch.shoulder_r.elev', 180, 0.02), (W, q) => [Math.max(0, q.ch.shoulder_r.elev - 205) * 5]]).pose;
  };
  return s === 'r' ? solve(pose) : F.mirrorArmSolve(pose, solve);
}
rest = L.groundPose(armOver(armOver(rest, 'r', 0.5), 'l', 0.5));
const P0 = clone(rest.root);

// Reach (right leg up, left hand to the right shin). k: spine flexion adds (l5, t12, t6), trunk rotation toward the
// right (deg, split t12/t6), neck flexion, hip flexion of the lifted leg, touch point along the shin (0 knee, 1 ankle)
function reach(k) {
  let p = clone(rest);
  for (const [j, a] of [['spine_l5', k.l5], ['spine_t12', k.t12], ['spine_t6', k.t6]]) p.ch[j] = { rot: 0, latFlex: 0, flex: r1(rest.ch[j].flex + a) };
  p.ch.spine_t12.rot = r1(k.rot * 0.5); p.ch.spine_t6.rot = r1(k.rot * 0.5); p.ch.spine_l5.rot = r1(Math.min(5, k.rot * 0.15));
  CB.neck(p, k.neck, k.rot * 0.4);
  p = F.leg(p, 'r', { flex: k.hip, abd: 0, rot: 0, knee: 3, dorsi: -20 });
  p.ch.sc_l = { protract: 18, elevate: 8 };
  const W = L.fk(p), K = W.knee_r.p, A = W.ankle_r.p, touch = V.add(K, V.scale(V.sub(A, K), k.along));
  const S = V.add(W.shoulder_l.p, [0, 0, 0]), dir = V.norm(V.sub(touch, S)), dist = V.len(V.sub(touch, S));
  const HAND = 10, reachMax = L.reach(4);
  const wrist = V.add(S, V.scale(dir, Math.min(reachMax, dist - HAND)));
  p = F.mirrorArmSolve(p, (m) => L.armToTarget(m, F.flipZ(wrist), { wrist: { pron: 0, flex: 0, dev: 0 }, guess: [90, 120, 0] }));
  p = armOver(p, 'r', k.hover);
  const Wq = L.fk(p);
  p.__info = { gap: +V.len(V.sub(V.add(Wq.wrist_l.p, V.scale(V.norm(V.sub(Wq.wrist_l.p, Wq.elbow_l.p)), HAND)), touch)).toFixed(1), wristErr: +V.len(V.sub(Wq.wrist_l.p, wrist)).toFixed(2), dist: +dist.toFixed(1) };
  return p;
}
const KR = { l5: 6, t12: 18, t6: 16, rot: 16, neck: 30, hip: 76, along: 0.35, hover: 2 };
const reachR = reach(KR), holdR = reach(Object.assign({}, KR, { t12: 20, t6: 17, rot: 18, hip: 79, along: 0.4, neck: 32 }));
const infoR = reachR.__info, infoH = holdR.__info; delete reachR.__info; delete holdR.__info;
const poses = { rest, reachR, holdR, reachL: CB.mirror(reachR), holdL: CB.mirror(holdR) };
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.6, pose: 'rest' }, { t: 1.6, pose: 'reachR' }, { t: 2.0, pose: 'holdR' }, { t: 3.0, pose: 'rest' }, { t: 3.4, pose: 'rest' },
  { t: 4.4, pose: 'reachL' }, { t: 4.8, pose: 'holdL' }, { t: 5.8, pose: 'rest' }, { t: 6.4, pose: 'rest' }];
const ex = CB.moduleOf(meta, poses, keyframes, []);
const pk = Math.max(holdR.ch.hip_r.flex, reachR.ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk) - 3, max: Math.ceil(pk) + 3 };

const rep = CB.scan(ex, { still: ['pelvis'] });
const Wh = L.fk(holdR), Wr = L.fk(rest);
const trunkUp = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.spine_t12.p), [0, 1, 0]);
F.setKin(ex, 'Trunk curl', `Lying (upper trunk ${F.deg(trunkUp(Wr))})`, `Upper trunk ${F.deg(trunkUp(Wh))} from the floor; shoulder blades ${Math.round(Math.min(CB.bottomOf(Wh, 'chest'), CB.bottomOf(Wh, 'traps_l')))} cm off the mat`);
F.setKin(ex, 'Trunk rotation', '0°', `${F.deg(holdR.ch.spine_t12.rot + holdR.ch.spine_t6.rot + holdR.ch.spine_l5.rot)} toward the lifted leg (thoracic and lumbar segments)`);
F.setKin(ex, 'Lifted leg', 'On the mat', `Hip ${F.deg(holdR.ch.hip_r.flex)}, knee straight`);
F.setKin(ex, 'Hand reach', 'Overhead on the mat', `Hand to the shin, ${Math.round(100 * 0.4)}% of the way from the knee to the ankle (gap ${infoH.gap} cm)`);
F.setKin(ex, 'Tempo', 'Rest 0.6 s', '1 s up, 0.4 s squeeze, 1 s down, 0.4 s rest; then the other side');
Object.assign(rep, { reach: infoR, hold: infoH, lowHand: r1(handLow(Wh, 'r')), floorChest: r1(CB.bottomOf(Wh, 'ribcage')) });
CB.finish(ex, rep, 'Lying Alternate Toe Touch Floor');
if (infoH.gap > 4 || infoH.wristErr > 1) { console.error('FAIL toe-touch: hand does not reach the shin'); process.exitCode = 1; }
