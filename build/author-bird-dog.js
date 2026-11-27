// Bird Dog (GymVisual #124112): all fours on a mat (hands under the shoulders, knees under the hips, shins and tops of
// the feet on the mat). Reach the right arm forward and the left leg back to horizontal, hold, return; then the left arm
// and the right leg. Both sides in one loop (bilateral). The pelvis and trunk stay still and square.
// Contacts: both hands (palms flat, IK wrist targets) and both lower legs (IK ankle targets with the instep on the mat;
// with the pelvis fixed the knee stays on its mat point). A lifting limb's contact weight goes to 0; its FK channels
// at the planted keys are fitted to the IK solution, so lift-off and touch-down blend without a jump.
const L = require('./lib');
const { R, V, Q, rig, clone } = L;
const P = require('./families/prone');
const meta = require('./meta/bird-dog.json');

const r3 = (v) => Math.round(v * 1000) / 1000;
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const KNEE_Y = +(process.env.KY ?? 5.0);   // knee joint height: the rig shin capsule (5.2 cm radius) rests on the mat
const ELBOW = +(process.env.EL ?? 35);   // rig supporting elbows: the athlete's arm is shorter, so its arm is near straight here
const HAND_BACK = +(process.env.HB ?? 6);   // rig wrist this far behind the shoulder: the athlete's shoulder sits further back
const WRIST_Y = +(process.env.WY ?? 4.0);   // wrist height with the hand rolled TILT deg thumb side up (keeps the athlete's thumb out of the mat)
const TILT = +(process.env.TILT ?? 15);

/* ---------- All fours ---------- */
const TH = V.len(rig.byId.knee_r.offset);
const base = { root: { pos: [0, r3(KNEE_Y + TH), 0], rot: { pitch: -86 } }, ch: {
  spine_l5: { ...z0(), flex: 2 }, spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 },
  sc_r: { protract: 6, elevate: 2 }, sc_l: { protract: 6, elevate: 2 },
  hip_r: { flex: 86, abd: 0, rot: 0 }, hip_l: { flex: 86, abd: 0, rot: 0 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, ankle_r: { dorsi: -70 }, ankle_l: { dorsi: -70 } } };
P.head(base, -8);
// Trunk pitch so the shoulders sit one (soft-elbow) arm length above the hands; the thigh stays vertical (hip flex = -pitch).
const ARM = L.reach(ELBOW);
const pitchFit = L.solvePose(base, ['root.rot.pitch'], [(W) => [(W.shoulder_r.p[1] - WRIST_Y - Math.sqrt(ARM * ARM - HAND_BACK * HAND_BACK)) * 2]]).pose;
pitchFit.ch.hip_r.flex = pitchFit.ch.hip_l.flex = r3(-pitchFit.root.rot.pitch);
const W0 = L.fk(pitchFit);
// Ankle targets: shin flat behind the knee, foot plantarflexed with the instep on the mat.
const footQ = (s) => P.qArr(W0[`ankle_${s}`].q);
const handQ = (s) => { const q = Q.mul(Q.axis([1, 0, 0], TILT), L.handRotR); return P.qArr(s === 'r' ? q : Q.mirrorZ(q)); };
const contacts = [
  Object.assign(L.handContact('r'), { pole: [-1, 0.1, 0.25], handRot: handQ('r') }), Object.assign(L.handContact('l'), { pole: [-1, 0.1, -0.25], handRot: handQ('l') }),
  Object.assign(L.legContact('r'), { label: 'Right shin', pole: [0.4, -1, 0.05], handRot: footQ('r') }),
  Object.assign(L.legContact('l'), { label: 'Left shin', pole: [0.4, -1, -0.05], handRot: footQ('l') }),
];
const HT = {}, AT = {};
for (const s of ['r', 'l']) {
  const S = W0[`shoulder_${s}`].p; HT[s] = [r3(S[0] - HAND_BACK), WRIST_Y, r3(S[2])];
  AT[s] = W0[`ankle_${s}`].p.map(r3);
}
pitchFit.ik = { arm_r: { target: HT.r, weight: 1 }, arm_l: { target: HT.l, weight: 1 }, leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } };
const fours = P.fitAll(pitchFit, contacts);
const Wf = L.fk(fours, contacts);

/* ---------- Reaching limbs (FK, contact weight 0) ---------- */
// Arm forward: in line with the trunk, thumb up (hand vertical); f = 0..1 of the reach, `peel` lifts the hand off first.
function armOut(p, s, f) {
  const q = clone(p);
  const tdir = V.norm(V.sub(Wf.neck_c7.p, Wf.pelvis.p));
  const S = L.fk(q).shoulder_r.p;
  // target direction: from straight down (planted) to along the trunk, slightly outward
  const down = V.norm(V.sub(HT.r, S)), fwd = V.norm([1, 0.03, 0.06]);   // reach level with the mat (not up along the inclined trunk)
  const g = Math.min(1, f);
  const dir = V.norm(V.add(V.scale(down, Math.cos(g * Math.PI / 2)), V.scale(fwd, Math.sin(g * Math.PI / 2))));
  const d0 = V.len(V.sub(HT.r, S)), len = d0 + (L.reach(6) - d0) * Math.min(1, g / 0.6);
  const lift = 5 * Math.min(1, g / 0.12) * (1 - g);   // the hand peels straight up first
  const tgt = V.add(V.add(S, V.scale(dir, len)), [0, lift, 0]);
  const w0 = fours.ch.wrist_r, h = Math.min(1, g / 0.5);   // wrist eases from the planted (extended) hand to thumb-up
  const wrist = { pron: r3(w0.pron + (90 - w0.pron) * h), flex: r3(w0.flex * (1 - h)), dev: r3(w0.dev * (1 - h)) };
  const r = L.armToTarget(q, tgt, { wrist, axial: 0, guess: [90, 30 + 150 * g, 0] });
  if (s === 'l') { ['shoulder', 'elbow', 'wrist'].forEach((j) => { q.ch[`${j}_l`] = clone(r.ch[`${j}_r`]); }); q.ik.arm_l.weight = 0; return q; }
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { q.ch[`${j}_r`] = clone(r.ch[`${j}_r`]); }); q.ik.arm_r.weight = 0; return q;
}
// Leg back: hip extends to the trunk line, knee straightens, ankle relaxes; f = 0..1.
function legOut(p, s, f) {
  const q = clone(p), h0 = fours.ch[`hip_${s}`].flex, k0 = fours.ch[`knee_${s}`].flex;
  const kf = f < 0.35 ? k0 + (100 - k0) * (f / 0.35) * 0.3 : k0 + (4 - k0) * ((f - 0.35) / 0.65);    // knee lifts first, then extends
  q.ch[`hip_${s}`] = { flex: r3(h0 + (LEG_HIP - h0) * f), abd: 0, rot: 0 };
  q.ch[`knee_${s}`] = { flex: r3(Math.max(4, kf)) };
  q.ch[`ankle_${s}`] = { dorsi: r3(fours.ch[`ankle_${s}`].dorsi + (-25 - fours.ch[`ankle_${s}`].dorsi) * f) };
  q.ik[`leg_${s}`].weight = 0;
  return q;
}
// Hip angle that puts the straight leg level (horizontal, at hip height).
const LEG_HIP = (() => {
  const q = clone(fours); q.ch.knee_l = { flex: 4 }; q.ik.leg_l.weight = 0;
  const tdir = V.norm(V.sub(Wf.neck_c7.p, Wf.pelvis.p));
  return L.solvePose(q, ['ch.hip_l.flex'], [(W) => V.sub(V.norm(V.sub(W.ankle_l.p, W.hip_l.p)), [-1, 0, 0]).map((v) => v * 10)]).pose.ch.hip_l.flex;
})();

const A = (p, f, g, arm, leg) => legOut(armOut(p, arm, f), leg, g);
const poses = {
  fours,
  aPeel: A(fours, 0.12, 0.12, 'r', 'l'), aMid: A(fours, 0.55, 0.55, 'r', 'l'), aOut: A(fours, 1, 1, 'r', 'l'), aReach: A(fours, 1.03, 1.02, 'r', 'l'),
  bPeel: A(fours, 0.12, 0.12, 'l', 'r'), bMid: A(fours, 0.55, 0.55, 'l', 'r'), bOut: A(fours, 1, 1, 'l', 'r'), bReach: A(fours, 1.03, 1.02, 'l', 'r'),
};
const [a0, a1, a2, a3] = [0.8, 2.0, 3.5, 4.6], [b0, b1, b2, b3] = [5.0, 6.2, 7.7, 8.8];
const keyframes = [
  { t: 0, pose: 'fours' }, { t: a0, pose: 'fours' }, { t: a0 + 0.25, pose: 'aPeel' }, { t: a0 + 0.7, pose: 'aMid' }, { t: a1, pose: 'aOut' }, { t: (a1 + a2) / 2, pose: 'aReach' }, { t: a2, pose: 'aOut' },
  { t: a2 + 0.5, pose: 'aMid' }, { t: a3 - 0.2, pose: 'aPeel' }, { t: a3, pose: 'fours' }, { t: b0, pose: 'fours' },
  { t: b0 + 0.25, pose: 'bPeel' }, { t: b0 + 0.7, pose: 'bMid' }, { t: b1, pose: 'bOut' }, { t: (b1 + b2) / 2, pose: 'bReach' }, { t: b2, pose: 'bOut' },
  { t: b2 + 0.5, pose: 'bMid' }, { t: b3 - 0.2, pose: 'bPeel' }, { t: b3, pose: 'fours' }, { t: 10, pose: 'fours' },
];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };

/* ---------- Measures, kinematics fill ---------- */
const deg = (v) => `≈${Math.round(v)}°`;
const trunkDir = V.norm(V.sub(Wf.neck_c7.p, Wf.pelvis.p));
const meas = (n) => {
  const W = L.fk(poses[n], contacts);
  return { armR: V.angle(V.sub(W.wrist_r.p, W.shoulder_r.p), trunkDir), legL: V.angle(V.sub(W.ankle_l.p, W.hip_l.p), V.scale(trunkDir, -1)), hipL: poses[n].ch.hip_l.flex,
    handY: W.wrist_r.p[1], footY: W.ankle_l.p[1], min: L.shapeMinY(W), knee: W.knee_r.p, shank: P.bottomOf(W, 'shank_r') };
};
const mf = meas('fours'), mo = meas('aOut');
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
const trunkPitch = V.angle(trunkDir, [1, 0, 0]);
set('Hands and knees', 'setup', `Hands ${Math.round(HAND_BACK)} cm behind the shoulder joints (rig), knees under the hips (hip ${deg(fours.ch.hip_r.flex)}, knee ${deg(fours.ch.knee_r.flex)})`);
set('Hands and knees', 'peak', `Supporting hand and knee stay planted (elbow ${deg(P.elbowAngle(L.fk(poses.aOut, contacts), 'l'))})`);
set('Arm elevation', 'setup', `${deg(180 - mf.armR)} to the trunk (hand on the mat)`); set('Arm elevation', 'peak', `${deg(180 - mo.armR)} (arm level)`);
set('Hip extension', 'setup', `Hip ${deg(fours.ch.hip_l.flex)} flexion`); set('Hip extension', 'peak', `Hip ${deg(poses.aOut.ch.hip_l.flex)} (leg level, ${deg(mo.legL)} off the inclined trunk line), knee ${deg(poses.aOut.ch.knee_l.flex)}`);
set('Pelvis and trunk', 'setup', `Trunk ${deg(trunkPitch)} from level, neutral spine`); set('Pelvis and trunk', 'peak', 'Pelvis and trunk unchanged (pelvis fixed, no rotation)');
set('Tempo', 'setup', '0.8 s on all fours'); set('Tempo', 'peak', '1.2 s out, 1.5 s hold, 1.1 s back per side');
ex.exercise.reference.note = P.NOTE;
console.log(`Bird Dog: wrote ${L.write(ex)}  pitch=${pitchFit.root.rot.pitch} rootY=${pitchFit.root.pos[1]} legHip=${LEG_HIP} hands=${JSON.stringify(HT)} ankles=${JSON.stringify(AT)}`);
for (const n of Object.keys(poses)) { const m = meas(n); console.log(`  ${n.padEnd(7)} armR=${m.armR.toFixed(1)} legL=${m.legL.toFixed(1)} hipL=${m.hipL} handY=${m.handY.toFixed(1)} footY=${m.footY.toFixed(1)} shank=${m.shank.toFixed(2)} min=${m.min.y.toFixed(2)}(${m.min.id})`); }
const kneeFixed = ['r', 'l'].map((s) => ({ joint: `knee_${s}`, p: Wf[`knee_${s}`].p, when: (pz) => pz.ik[`leg_${s}`].weight >= 0.999 }));
const sw = P.sweep(ex, kneeFixed);
console.log('  sweep', JSON.stringify(sw));
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted hand or knee slides'); process.exitCode = 1; }
