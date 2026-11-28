// Side Lying Scissors (GymVisual #10802; page not readable here, movement from the name and standard Pilates coaching):
// lying on the left side on a mat, head resting on the outstretched left arm, right hand on the mat in front of the chest
// (planted contact), hips stacked, legs long (the side-lying base of the hip abduction author). Both legs lift off the mat
// together (bottom leg a few centimetres, top leg a little higher), then scissor: the top leg swings forward as the
// bottom leg swings back, then they switch; the pelvis stays stacked and still. Bring the legs together and lower.
// Authored lying on the left side (right leg on top); the player mirrors it.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b6-20');
const meta = require('./meta/side-lying-scissors.json');

const ROT = { yaw: -90, roll: -90 };
const zero = () => ({ rot: 0, flex: 0, latFlex: 0 });
function body() {
  return { root: { pos: [0, 20, 0], rot: { ...ROT } }, ch: {
    spine_l5: zero(), spine_t12: zero(), spine_t6: zero(), neck_c7: { rot: 0, flex: 4, latFlex: -12 }, head_c1: { rot: 0, flex: 4, latFlex: -10 },
    sc_r: { protract: 8, elevate: 0 }, sc_l: { protract: 0, elevate: 12 },
    shoulder_l: { plane: 80, elev: 168, axial: 0 }, elbow_l: { flex: 12 }, wrist_l: { pron: 0, flex: 0, dev: 0 },
    shoulder_r: { plane: 60, elev: 40, axial: 0 }, elbow_r: { flex: 40 }, wrist_r: { pron: 0, flex: 0, dev: 0 },
    hip_l: { flex: 4, abd: 0, rot: 0 }, knee_l: { flex: 4 }, ankle_l: { dorsi: -20 },
    hip_r: { flex: 0, abd: 0, rot: 0 }, knee_r: { flex: 2 }, ankle_r: { dorsi: -20 } } };
}
// Waist sags to the mat; pelvis, bottom shoulder and bottom leg rest on the mat (as the hip abduction author)
const base = L.solvePose(body(), ['root.pos.1', 'ch.spine_l5.latFlex', 'ch.spine_t12.latFlex', 'ch.spine_t6.latFlex', 'ch.hip_l.abd', 'ch.hip_l.flex'], [
  (W) => [(H.bottomOf(W, 'pelvis') - 0.6) * 3, H.bottomOf(W, 'deltoid_l') * 3, (H.bottomOf(W, 'thigh_l') - 0.4) * 2, Math.min(0, H.bottomOf(W, 'thigh_l') - 0.1) * 8, (H.bottomOf(W, 'shank_l') - 0.6) * 2, Math.min(0, H.bottomOf(W, 'foot_l')) * 4,
    ...['ribcage', 'chest', 'abdomen', 'buttock_l', 'upperarm_l', 'hand_l', 'forearm_l'].map((id) => Math.min(0, H.bottomOf(W, id)) * 4)],
  L.obj.reg('ch.spine_l5.latFlex', 0, 0.05), L.obj.reg('ch.spine_t12.latFlex', 0, 0.05), L.obj.reg('ch.spine_t6.latFlex', 0, 0.05), L.obj.reg('ch.hip_l.flex', 4, 0.1)], { iters: 400 }).pose;
const Wb = L.fk(base);
const HAND_R = [r1(Wb.spine_t12.p[0] + 6), 2.7, r1(Wb.shoulder_r.p[2] + 2)];
const contacts = [H.handC('r', [-0.3, 1, 0.6])];
const lowL = (W) => Math.min(H.bottomOf(W, 'foot_l'), H.bottomOf(W, 'shank_l'), H.bottomOf(W, 'calf_l'));
// Legs: bottom-leg lift (cm, solved on the left hip adduction), top leg `gap` cm (ankle to ankle) above it, hip flexions
function legsAt({ lift, gap, flexR, flexL }) {
  let p = clone(base);
  p.ch.hip_l = { flex: r1(base.ch.hip_l.flex + flexL), abd: base.ch.hip_l.abd, rot: 0 };
  p.ch.hip_r = { flex: r1(flexR), abd: 0, rot: 0 };
  if (lift > 0) { let a = -25, b = base.ch.hip_l.abd; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; p.ch.hip_l.abd = m; if (lowL(L.fk(p)) > lift) a = m; else b = m; } p.ch.hip_l.abd = r1((a + b) / 2); }
  let a = -25, b = 30; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; p.ch.hip_r.abd = m; const W = L.fk(p); if (W.ankle_r.p[1] - W.ankle_l.p[1] > gap) b = m; else a = m; } p.ch.hip_r.abd = r1((a + b) / 2);
  p.ik = { arm_r: { target: HAND_R.slice(), weight: 1 } };
  p = H.fitArm(p, 'r', contacts[0], HAND_R, [{ shoulder_r: { plane: 60, elev: 40, axial: 0 }, elbow_r: { flex: 40 }, wrist_r: { pron: 0, flex: -60, dev: 0 } }]); delete p.__cost;
  return p;
}
const LIFT = 6, GAP = 14, FW = 24, BK = -12;
const poses = {
  rest: legsAt({ lift: 0, gap: 7, flexR: -2, flexL: 0 }),
  lift: legsAt({ lift: LIFT, gap: GAP, flexR: 0, flexL: 0 }),
  sA: legsAt({ lift: LIFT, gap: GAP, flexR: FW, flexL: BK }),     // top leg forward, bottom leg back
  sB: legsAt({ lift: LIFT, gap: GAP, flexR: BK, flexL: FW }),     // top leg back, bottom leg forward
};
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.6, pose: 'rest' }, { t: 1.2, pose: 'lift' }];
['sA', 'sB', 'sA', 'sB', 'sA', 'sB'].forEach((p, i) => keyframes.push({ t: +(1.6 + 0.5 * i).toFixed(2), pose: p }));
keyframes.push({ t: 4.6, pose: 'lift' }, { t: 5.2, pose: 'rest' }, { t: 5.8, pose: 'rest' });
const ex = H.module_(meta, contacts, poses, keyframes);
const pk = Math.max(...Object.values(poses).map((p) => Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex)));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk) - 3, max: Math.ceil(pk) + 3 };

const lifted = (p) => p.ch.hip_l.abd < base.ch.hip_l.abd - 3;   // probes only while the legs are up
const rep = F.report(ex, { gap: (W, p) => (lifted(p) ? F.legGap(W).d : 99), lowL: (W, p) => (lifted(p) ? lowL(W) : 99) });
const Wl = L.fk(poses.lift, contacts), Wa = L.fk(poses.sA, contacts);
F.setKin(ex, 'Leg lift', 'Legs stacked on the mat', `Bottom leg ${Math.round(lowL(Wl))} cm off the mat (hip adduction ${F.deg(-poses.lift.ch.hip_l.abd)}), top ankle ${Math.round(Wl.ankle_r.p[1] - Wl.ankle_l.p[1])} cm above the bottom one`);
F.setKin(ex, 'Scissor', '–', `Top leg ${F.deg(FW)} forward / ${F.deg(-BK)} back; bottom leg the opposite (ankles ${Math.round(Math.abs(Wa.ankle_r.p[0] - Wa.ankle_l.p[0]))} cm apart at each switch)`);
F.setKin(ex, 'Pelvis', 'Stacked on the mat', `Unchanged (pelvis moves ${rep.still} cm)`);
F.setKin(ex, 'Tempo', 'Rest 0.6 s, lift 0.6 s', '0.5 s per switch (6 switches), lower 0.6 s');
console.log(`Side Lying Scissors: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} abd L ${poses.lift.ch.hip_l.abd} R ${poses.lift.ch.hip_r.abd}`);
F.CA.guard('side-lying-scissors', rep, [rep.gap[0] < -0.3 && `legs touch (${rep.gap[0]})`, rep.lowL[0] < 1.5 && `bottom leg drops to the mat (${rep.lowL[0]})`]);
