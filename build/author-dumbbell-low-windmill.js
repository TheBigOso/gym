// Dumbbell Low Windmill (GymVisual 14327; movement reference only, the page could not be read, so the movement follows
// the name and standard coaching): the windmill with the weight in the LOW hand. Authored on the right: feet wider than
// the hips, both feet turned about 40 degrees to the right (planted); the dumbbell hangs in the right hand and the empty
// left arm is locked straight up. Push the left hip out and back, hinge and side-bend to the right so the dumbbell slides
// down the inside of the right leg toward the shin while the left arm stays vertical and the eyes stay on the top hand;
// stand back up the same way. Built with the dumbbell-windmill solve (pelvis from the planted legs, top arm vertical,
// low hand on its path along the leg, gaze on the top hand) on the mirror image, then mirrored so the loaded hand is the
// right one (the player mirrors for the left).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const B3 = require('./families/b3-legs');
const meta = require('./meta/dumbbell-low-windmill.json');

const YAW = 40, HALF = +(process.env.HALF || 22);
const KNEE_R = +(process.env.KNEE_R || 9); // right knee nearly straight (soft enough that the leg never overreaches between keys)
const contactsW = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: [Math.cos(YAW * R.DEG), 0.05, -Math.sin(YAW * R.DEG) + (s === 'r' ? 0.1 : -0.1)], handRot: CA.qArr(L.footRot(YAW)) }));
const FEET = { r: [0, L.ANKLE_H, HALF], l: [0, L.ANKLE_H, -HALF] };
const TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
const legD = (knee) => Math.sqrt(TH * TH + SH * SH + 2 * TH * SH * Math.cos(knee * R.DEG));
const st = L.POSES.standing({ stance: HALF, toeOut: 0 }).pose;
delete st.ik;

// k: { u (0 top .. 1 bottom), yaw, pitch (pelvis; - = hinge forward), lat (spine, - = toward the left), rot (spine, + = chest
// turns right/open), kneeL, hand (left wrist target [x, y, z]) }
function key(k) {
  let p = clone(st);
  p.root.rot = { yaw: k.yaw, pitch: k.pitch, roll: 0 };
  const sp = { spine_l5: 0.2, spine_t12: 0.4, spine_t6: 0.4 };
  for (const j in sp) p.ch[j] = { rot: r1(k.rot * sp[j]), latFlex: r1(k.lat * sp[j]), flex: r1((k.flex || 0) * sp[j]) };
  // pelvis position from the two planted legs (right knee nearly straight, left knee kneeL); roll free, x pulled back
  p = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.pos.2', 'root.rot.roll'], [
    (W) => [(V.len(V.sub(W.hip_r.p, FEET.r)) - legD(KNEE_R)) * 3, (V.len(V.sub(W.hip_l.p, FEET.l)) - legD(k.kneeL)) * 3],
    L.obj.reg('root.pos.0', k.x ?? 0, 0.3), L.obj.reg('root.pos.2', k.z ?? 0, 0.3), L.obj.reg('root.rot.roll', 0, 0.05)], { iters: 400 }).pose;
  p.ik = { leg_r: { target: FEET.r.slice(), weight: 1 }, leg_l: { target: FEET.l.slice(), weight: 1 } };
  for (const s of ['r', 'l']) { p = CA.fitLeg(p, s, FEET[s], contactsW); for (const [j, c] of [[`ankle_${s}`, 'dorsi'], [`hip_${s}`, 'rot'], [`hip_${s}`, 'abd']]) p.ch[j][c] = r1(L.wrap(p.ch[j][c])); }
  // right arm locked straight up (world vertical) above the shoulder, palm facing forward-ish
  p.ch.sc_r = { protract: 4, elevate: 12 };
  const S = L.fk(p).shoulder_r.p;
  p = L.armToTarget(p, V.add(S, [0, L.reach(4), 0]), { flex: 4, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess: k.armGuess || [90, 170, 0] });
  // left arm: solved as the right arm of the mirrored pose, then mirrored back
  const m = CB.mirror(p); m.ch.sc_r = { protract: 6, elevate: 0 };
  const hm = [k.hand[0], k.hand[1], -k.hand[2]];
  const ml = L.armToTarget(m, hm, { wrist: { pron: +(process.env.WP || 85), flex: 0, dev: 0 }, axial: 0, guess: k.lGuess || [30, 40, 0], extra: (W) => [Math.max(0, W.elbow_r.p[2] - W.shoulder_r.p[2] - 6) * 0.5] });
  for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) p.ch[`${j}_l`] = clone(ml.ch[`${j}_r`]);
  // eyes on the dumbbell (capped neck rotation and extension)
  p = L.gaze(p, 'wrist_r', 12, [k.headRot ?? 0, k.headFlex ?? 0], { rot: 60, ext: 30 });
  return p;
}
const KEYS = {
  top: { yaw: 25, pitch: 0, lat: 0, rot: -15, kneeL: 6, x: 0, z: 0, hand: [4, 72, -24], headRot: 0, headFlex: 0 },
  d1: { yaw: 30, pitch: -20, lat: -9, rot: 3, kneeL: 10, x: -3, z: 1.5, hand: [9, 62, -22], headRot: 15, headFlex: -10 },
  d2: { yaw: 34, pitch: -40, lat: -17, rot: 16, kneeL: 15, x: -7, z: 3, hand: [13, 50, -19], headRot: 30, headFlex: -20 },
  bottom: { yaw: 38, pitch: -68, lat: -27, rot: 29, kneeL: 24, x: -10.5, z: 4.2, hand: [15, +(process.env.HY || 34), +(process.env.HZ || -16)], headRot: 40, headFlex: -25 },
  bottomHold: { yaw: 38.5, pitch: -69.5, lat: -27.5, rot: 30, kneeL: 24.5, x: -10.7, z: 4.3, hand: [15, +(process.env.HY || 34) - 1.5, +(process.env.HZ || -16)], headRot: 40, headFlex: -25 },
};
// low-hand path with the dumbbell: beside the thigh at the top, then forward and in toward the inside of the shin
const HP = JSON.parse(process.env.HP || '[[10,73,-33],[16,62,-26],[21,50,-20],[23,35,-16]]');
if (HP) ['top', 'd1', 'd2', 'bottom', 'bottomHold'].forEach((n, i) => { KEYS[n].hand = HP[Math.min(i, 3)].slice(); if (n === 'bottomHold') KEYS[n].hand[1] -= 1.5; });
const solved = {};
let prevArm = null, prevL = null;
for (const n of ['top', 'd1', 'd2', 'bottom', 'bottomHold']) {
  const p = key(Object.assign({ armGuess: prevArm, lGuess: prevL }, KEYS[n]));
  prevArm = [p.ch.shoulder_r.plane, p.ch.shoulder_r.elev, p.ch.shoulder_r.axial];
  prevL = [p.ch.shoulder_l.plane, p.ch.shoulder_l.elev, p.ch.shoulder_l.axial];
  solved[n] = p;
}
// mirror: the low (loaded) hand becomes the right hand, the feet turn to the right
const poses = {};
for (const n of Object.keys(solved)) { const m = CB.mirror(solved[n]); poses[n] = m; }
const contacts = ['r', 'l'].map((s) => { const o = contactsW.find((c) => c.id === `leg_${s === 'r' ? 'l' : 'r'}`); return Object.assign(L.legContact(s), { pole: [o.pole[0], o.pole[1], -o.pole[2]], handRot: CA.qArr(L.footRot(-YAW)) }); });
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }, { t: 1.6, pose: 'd1' }, { t: 2.4, pose: 'd2' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'bottomHold' },
  { t: 4.6, pose: 'd2' }, { t: 5.4, pose: 'd1' }, { t: 6.2, pose: 'top' }, { t: 7.0, pose: 'top' }];
const props = [B3.heldProp('r', 'handle')];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';

{ const pk = Math.max(poses.bottomHold.ch.hip_r.flex, poses.bottomHold.ch.hip_l.flex); ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk - 8), max: Math.ceil(pk + 4) }; }
const armVert = (W) => V.angle(V.sub(W.wrist_l.p, W.shoulder_l.p), [0, 1, 0]);
const trunkFlex = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const segGap = (P, a, b) => { const ab = V.sub(b, a), t = Math.max(0, Math.min(1, V.dot(V.sub(P, a), ab) / V.dot(ab, ab))); return V.len(V.sub(P, V.add(a, V.scale(ab, t)))); };
const legGap = (W) => Math.min(segGap(W.wrist_r.p, W.hip_r.p, W.knee_r.p), segGap(W.wrist_r.p, W.knee_r.p, W.ankle_r.p));
const rep = CA.scan(ex, { armVert, trunk: trunkFlex, hipFlexR: (W, p) => p.ch.hip_r.flex, hipFlexL: (W, p) => p.ch.hip_l.flex, handY: (W) => W.wrist_r.p[1], legGap });
Object.assign(rep, B3.dbLoop(ex, [{ side: 'r', grip: 'handle' }], ['head', 'hair', 'upperarm_l', 'forearm_l', 'hand_l', 'thigh_r', 'quad_r', 'shank_r', 'calf_r', 'foot_r', 'thigh_l', 'quad_l', 'shank_l', 'calf_l', 'foot_l', 'pelvis', 'abdomen', 'chest', 'ribcage']));
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottomHold, contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pb = poses.bottomHold;
kin[0].setup = `Upright (${d(trunkFlex(Wt))} from vertical)`; kin[0].peak = `${d(trunkFlex(Wb))} from vertical (pelvis to C7): hips hinge ${d(-pb.root.rot.pitch)}, spine side-bends ${d(Math.abs(pb.ch.spine_l5.latFlex + pb.ch.spine_t12.latFlex + pb.ch.spine_t6.latFlex))} to the right and turns ${d(Math.abs(pb.ch.spine_l5.rot + pb.ch.spine_t12.rot + pb.ch.spine_t6.rot))} open toward the top hand`;
kin[1].setup = `Vertical (${d(armVert(Wt))} off vertical)`; kin[1].peak = `Stays vertical (${d(rep.armVert[1])} max off vertical over the rep)`;
kin[2].setup = `Hips ${d(poses.top.ch.hip_r.flex)} R / ${d(poses.top.ch.hip_l.flex)} L; knees ${d(CA.kneeOf(Wt, 'r'))} R / ${d(CA.kneeOf(Wt, 'l'))} L`; kin[2].peak = `Hips ${d(pb.ch.hip_r.flex)} R / ${d(pb.ch.hip_l.flex)} L; knees ${d(CA.kneeOf(Wb, 'r'))} R (soft) / ${d(CA.kneeOf(Wb, 'l'))} L (locked)`;
kin[3].setup = `Dumbbell hand beside the right thigh, wrist ${Math.round(Wt.wrist_r.p[1])} cm up`; kin[3].peak = `Slides to ${Math.round(Wb.wrist_r.p[1])} cm above the floor along the inside of the right shin (lowest dumbbell point ${rep.dbFloor} cm)`;
kin[4].setup = `Feet ${2 * HALF} cm apart, both turned ${YAW}° to the right`; kin[4].peak = 'Unchanged (planted)';
kin[5].setup = 'Stand 0.8 s'; kin[5].peak = '2.4 s down, 0.6 s pause, 2.4 s up, 0.8 s at the top';
console.log(`Dumbbell low windmill: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
CA.guard('dumbbell-low-windmill', rep, [rep.armVert[1] > 12 && `top arm leaves vertical by ${rep.armVert[1]} degrees`, rep.dbClear < -0.3 && `dumbbell into the body ${JSON.stringify(rep.dbClearAt)}`, rep.dbFloor < 0 && 'dumbbell through the floor', rep.legGap[1] > 28 && 'low hand far from the leg']);
