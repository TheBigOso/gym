// Kneeling Shoulder Tap (GymVisual #10493; page not readable here, movement from the name and standard coaching): a
// kneeling plank on a mat: hands under the shoulders (palms planted), knees and shins on the mat (planted shin contacts,
// instep down), hips extended so the body is one line from the knees to the head. The right hand lifts and taps the left
// shoulder while the body shifts a little onto the left hand, then returns; then the left hand taps the right shoulder.
// The hips stay level. Bilateral, alternating (the left tap is the mirror of the right). Shin/hand fitting from prone.js.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const P = require('./families/prone');
const CB = require('./families/core-b');
const F = require('./families/b6-20');
const meta = require('./meta/kneeling-shoulder-tap.json');

const qArr = (q) => q.map((v) => +v.toFixed(6));
const SHANK_R = rig.shapes.find((s) => s.id === 'shank_r').r;
const ANKLE_MIN = rig.byId.ankle_r.limits.dorsi[0] + 3;
const ELBOW = 12, WRIST_Y = P.PALM, ARM = L.reach(ELBOW), SH_Y = WRIST_Y + ARM, HIP = 4;
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
// Kneeling plank: knees on the mat (shank capsule on the mat), instep down, hips nearly straight, shoulders over the hands
const base0 = { root: { pos: [0, 40, 0], rot: { pitch: -60 } }, ch: {
  spine_l5: { ...z0(), flex: 2 }, spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 },
  sc_r: { protract: 8, elevate: 2 }, sc_l: { protract: 8, elevate: 2 },
  hip_r: { flex: HIP, abd: 0, rot: 0 }, hip_l: { flex: HIP, abd: 0, rot: 0 }, knee_r: { flex: 60 }, knee_l: { flex: 60 }, ankle_r: { dorsi: -70 }, ankle_l: { dorsi: -70 } } };
P.head(base0, -14);
const tie = (W, q) => [(q.ch.knee_l.flex - q.ch.knee_r.flex), (q.ch.ankle_l.dorsi - q.ch.ankle_r.dorsi)];
const sol = L.solvePose(base0, ['root.pos.1', 'root.rot.pitch', 'ch.knee_r.flex', 'ch.knee_l.flex', 'ch.ankle_r.dorsi', 'ch.ankle_l.dorsi'], [
  (W, q) => [(W.knee_r.p[1] - SHANK_R[0]) * 3, (W.ankle_r.p[1] - SHANK_R[1] - 0.2) * 3, P.bottomOf(W, 'foot_r') * 3, Math.min(0, P.bottomOf(W, 'foot_r') + 0.3) * 20, Math.min(0, P.bottomOf(W, 'thigh_r') + 0.2) * 20, (W.shoulder_r.p[1] - SH_Y) * 2, Math.min(0, q.ch.ankle_r.dorsi - ANKLE_MIN) * 3, (q.ch.ankle_r.dorsi - ANKLE_MIN) * 0.05],
  tie], { iters: 400 }).pose;
const W0 = L.fk(sol);
const handQ = (s) => qArr(s === 'r' ? L.handRotR : L.handRotL);
const contacts = [
  Object.assign(L.handContact('r'), { pole: [-1, 0.1, 0.25], handRot: handQ('r') }), Object.assign(L.handContact('l'), { pole: [-1, 0.1, -0.25], handRot: handQ('l') }),
  Object.assign(L.legContact('r'), { label: 'Right shin', pole: [0.4, -1, 0.05], handRot: qArr(W0.ankle_r.q) }),
  Object.assign(L.legContact('l'), { label: 'Left shin', pole: [0.4, -1, -0.05], handRot: qArr(W0.ankle_l.q) }),
];
const HT = { r: [r1(W0.shoulder_r.p[0]), WRIST_Y, r1(W0.shoulder_r.p[2])], l: [r1(W0.shoulder_l.p[0]), WRIST_Y, r1(W0.shoulder_l.p[2])] };
const AT = { r: W0.ankle_r.p.map(r1), l: W0.ankle_l.p.map(r1) };
sol.ik = { arm_r: { target: HT.r, weight: 1 }, arm_l: { target: HT.l, weight: 1 }, leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } };
const plank = P.fitAll(sol, contacts);

// Tap: the body shifts `shift` cm toward the left hand (and rolls `roll` deg onto it); the legs and the left arm refit to
// their planted targets; the right arm (contact weight 0) reaches the top of the left shoulder.
const TAP = JSON.parse(process.env.TAP || '[10, -4, 12]'), WTAP = JSON.parse(process.env.WTAP || '{"pron":150,"flex":0,"dev":0}');
function tap(shift, roll, reach = true) {
  let p = clone(plank);
  p.root.pos[2] = r1(plank.root.pos[2] - shift);
  p.root.rot = Object.assign({}, plank.root.rot, { roll: r1(roll) });
  p = P.fitAll(p, contacts);
  if (reach) {
    const W = L.fk(p), Sl = W.shoulder_l.p;
    const tgt = V.add(Sl, TAP);   // wrist above and just inside the left shoulder: the palm lies on top of the shoulder
    const a0 = plank.ch.shoulder_r;
    p = L.armToTarget(p, tgt, { wrist: WTAP, axial: a0.axial, axialW: 0.01, guess: [a0.plane, a0.elev + 20, a0.axial], extra: (Wx) => [Math.min(0, F.shapeGap(Wx, ['forearm_r', 'hand_r'], ['head', 'jaw', 'chest', 'pecs_l', 'pecs_r', 'neck']).d - 0.5) * 3] });
    p.ik.arm_r.weight = 0;
    p.__tgt = tgt;
  }
  return p;
}
const shift = tap(1.0, 0, false), tapR = tap(1.8, -1.1), holdR = tap(1.9, -1.2);
const tgtErr = +V.len(V.sub(L.fk(tapR).wrist_r.p, tapR.__tgt)).toFixed(2); delete tapR.__tgt; delete holdR.__tgt;
const lift = clone(tapR); // hand half way: a hover pose so the hand lifts straight up first
{ const W = L.fk(shift, contacts); const ht = V.add(HT.r, [-2, 14, -4]); const a0 = shift.ch.shoulder_r, q = L.armToTarget(shift, ht, { wrist: { pron: shift.ch.wrist_r.pron, flex: -45, dev: 0 }, axial: a0.axial, axialW: 0.01, guess: [a0.plane, a0.elev, a0.axial] }); Object.assign(lift.ch, { shoulder_r: q.ch.shoulder_r, elbow_r: q.ch.elbow_r, wrist_r: q.ch.wrist_r }); lift.root = clone(tapR.root); }
// mirror for the left tap, then put the planted targets back exactly (rounding can leave the mirrored ones a hair off)
function mirrorFix(p, freeArm) {
  const q = CB.mirror(p);
  q.ik = { arm_r: { target: HT.r.slice(), weight: freeArm === 'r' ? 0 : 1 }, arm_l: { target: HT.l.slice(), weight: freeArm === 'l' ? 0 : 1 }, leg_r: { target: AT.r.slice(), weight: 1 }, leg_l: { target: AT.l.slice(), weight: 1 } };
  return P.fitAll(q, contacts);
}
const poses = { plank, shift, lift, tapR, holdR, shiftL: mirrorFix(shift), liftL: mirrorFix(lift, 'l'), tapL: mirrorFix(tapR, 'l'), holdL: mirrorFix(holdR, 'l') };
// the mirrored poses keep the planted targets (they are symmetric) but swap which hand is free
for (const k of ['liftL', 'tapL', 'holdL']) { poses[k].ik.arm_l.weight = 0; poses[k].ik.arm_r.weight = 1; }
for (const k of ['lift', 'tapR', 'holdR']) { poses[k].ik.arm_r.weight = 0; poses[k].ik.arm_l.weight = 1; }
const keyframes = [['plank', 0], ['plank', 0.6], ['shift', 0.9], ['lift', 1.15], ['tapR', 1.4], ['holdR', 1.8], ['lift', 2.1], ['shift', 2.4], ['plank', 2.8],
  ['shiftL', 3.1], ['liftL', 3.35], ['tapL', 3.6], ['holdL', 4.0], ['liftL', 4.3], ['shiftL', 4.6], ['plank', 5.0], ['plank', 5.2]].map(([pose, t]) => ({ t, pose }));
const ex = CB.moduleOf(meta, poses, keyframes, contacts);
ex.exercise.reference.note = P.NOTE;
const trunk = (p) => { const W = L.fk(p, contacts); return V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]); };
const tk = Object.values(poses).map(trunk);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(Math.min(...tk)) - 2, max: Math.ceil(Math.max(...tk)) + 2 };
ex.checks.plantedContacts = ['leg_r', 'leg_l'];

const rep = F.report(ex, { armGap: (W, p) => (p.ik.arm_r.weight < 0.5 ? F.shapeGap(W, ['forearm_r', 'hand_r'], ['head', 'jaw', 'nose', 'chest', 'pecs_l', 'neck']).d : 99), kneeY: (W) => W.knee_r.p[1], hipLevel: (W) => W.hip_r.p[1] - W.hip_l.p[1] });
const Wp = L.fk(plank, contacts), Wt = L.fk(holdR, contacts);
const line = (W) => { const a = V.sub(W.hip_r.p, W.knee_r.p), b = V.sub(W.shoulder_r.p, W.hip_r.p); return V.angle(a, b); };
F.setKin(ex, 'Body line', `Knees to shoulders within ${F.deg(line(Wp))} of straight; trunk ${F.deg(trunk(plank))} from vertical`, 'Held');
F.setKin(ex, 'Tap', 'Hands under the shoulders', `Right hand on top of the left shoulder (wrist target missed by ${tgtErr} cm)`);
F.setKin(ex, 'Pelvis', 'Level', `Shifts ${holdR.root.pos[2] - plank.root.pos[2] < 0 ? Math.abs(r1(holdR.root.pos[2] - plank.root.pos[2])) : 0} cm toward the support hand, rolls ${F.deg(-holdR.root.rot.roll)}; hips stay within ${Math.max(Math.abs(rep.hipLevel[0]), Math.abs(rep.hipLevel[1])).toFixed(1)} cm of level`);
F.setKin(ex, 'Tempo', 'Plank 0.6 s', '0.8 s to tap, 0.4 s hold, 1 s back; then the other hand');
console.log(`Kneeling Shoulder Tap: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} tgtErr ${tgtErr} knee ${r1(P.kneeAngle(Wp, 'r'))} pitch ${plank.root.rot.pitch} hip ${plank.ch.hip_r.flex}`);
const sw = P.sweep(ex, [{ joint: 'wrist_l', p: HT.l, when: (pz) => pz.ik.arm_l.weight > 0.999 }, { joint: 'wrist_r', p: HT.r, when: (pz) => pz.ik.arm_r.weight > 0.999 }]);
console.log('  hands', JSON.stringify({ slide: sw.slide, drift: sw.drift, driftAt: sw.driftAt }));
F.CA.guard('kneeling-shoulder-tap', rep, [rep.armGap[0] < -0.5 && `tapping arm passes into the body (${rep.armGap[0]})`, sw.drift > 0.05 && `planted hand drifts ${sw.drift}`, tgtErr > 1.5 && 'tap target missed']);
if (process.env.DBG) {
  for (const k of ['shift', 'lift', 'tapR']) { const W = L.fk(poses[k], contacts); console.log(k, JSON.stringify(poses[k].ch.shoulder_r), poses[k].ch.elbow_r.flex, JSON.stringify(poses[k].ch.wrist_r), JSON.stringify(F.shapeGap(W, ['forearm_r', 'hand_r'], ['head', 'jaw', 'nose', 'chest', 'pecs_l', 'neck'])), r1(F.minOf(W, ['hand_r', 'forearm_r']))); }
  const tl = R.buildTimeline(ex); for (let t = 0.6; t <= 2.8; t += 0.1) { const W = R.evalPose(rig, tl.pose(t), contacts); console.log(t.toFixed(1), r1(F.minOf(W, ['hand_r', 'forearm_r', 'upperarm_r'])), JSON.stringify(F.shapeGap(W, ['forearm_r', 'hand_r'], ['head', 'jaw', 'nose', 'chest', 'pecs_l', 'neck']))); }
}
if (process.env.DBG2) for (const k in poses) { const W = L.fk(poses[k], contacts); console.log(k, poses[k].root.pos.map(r1), JSON.stringify(poses[k].root.rot), 'R', r1(V.len(V.sub(W.wrist_r.p, HT.r)) * 100) / 100, 'L', r1(V.len(V.sub(W.wrist_l.p, HT.l)) * 100) / 100, 'shL-hand', r1(V.len(V.sub(W.shoulder_l.p, HT.l))), 'shR-hand', r1(V.len(V.sub(W.shoulder_r.p, HT.r))), r1(F.minOf(W, ['thigh_r', 'thigh_l']))); }
