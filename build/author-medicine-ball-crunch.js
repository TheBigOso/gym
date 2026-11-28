// Medicine Ball Crunch (GymVisual #25783, movement reference only): lying on the back on a mat, knees bent about 90 degrees
// with the feet flat (planted), a medicine ball held in both hands with the arms straight up over the chest. Curl the head,
// shoulders and shoulder blades off the mat, pushing the ball toward the ceiling, while the low back and pelvis stay down;
// squeeze, then lower with control. The arms stay locked to the trunk the whole time. Bilateral.
// Built on the floor crunch (build/families/core-a.js). Gear: medicine ball (src/gear/g3attach-balls.js, plate with
// params.shape 'ball') held between the hands; arm solve in build/families/gear-g3attach.js (armsOnBall).
const L = require('./lib');
const { V, r1, clone } = L;
const C = require('./families/core-a');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'medicine-ball-crunch', name: 'Medicine Ball Crunch', url: 'https://gymvisual.com/videos/25783-medicine-ball-crunch.html',
  aliases: ['Crunch with medicine ball', 'Straight-arm medicine ball crunch'], bodyPart: 'Waist (rectus abdominis)', secondary: ['Obliques'], equipment: ['Medicine ball', 'Mat'],
  mechanics: 'Isolation (trunk flexion)', plane: 'Sagittal', side: 'bilateral', cam: 'side',
  muscles: { target: ['core'], synergist: G.both('obliques'), stabilizer: [...G.both('ant_deltoid'), ...G.both('serratus'), ...G.both('triceps')], lengthened: G.both('spinal_extensors') },
  notes: { core: 'Rectus abdominis curls the trunk (Escamilla 2006); the ball held over the chest adds a little load.', obliques_r: 'Assist trunk flexion (Escamilla 2006).', obliques_l: 'Assist trunk flexion (Escamilla 2006).', ant_deltoid_r: 'Hold the arms up (clinical opinion).', ant_deltoid_l: 'Hold the arms up (clinical opinion).', serratus_r: 'Reaches the ball toward the ceiling (clinical opinion).', serratus_l: 'Reaches the ball toward the ceiling (clinical opinion).', triceps_r: 'Keep the elbows straight (clinical opinion).', triceps_l: 'Keep the elbows straight (clinical opinion).', spinal_extensors_r: 'Lengthen as the trunk curls (clinical opinion).', spinal_extensors_l: 'Lengthen as the trunk curls (clinical opinion).' },
  breathing: { pattern: 'Exhale as you curl up, inhale as you lower.', cadence: 'About 1 s up, 0.5 s squeeze, 1.6 s down' },
  rx: { reps: '12-20', tempo: '1-0.5-2-0', progression: 'Heavier ball, or hold the ball overhead' },
  phases: [
    { id: 'setup', label: 'Lie, ball up', end: 0.8, cue: 'Lie on your back, knees bent, feet flat; hold the ball in both hands with the arms straight over the chest.', w: 0.1 },
    { id: 'up', label: 'Curl up', end: 1.8, breath: 'exhale', cue: 'Breathe out and curl the head and shoulders up, pressing the ball toward the ceiling.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.3, cue: 'Squeeze the abs; low back stays on the mat.', w: 1 },
    { id: 'down', label: 'Lower with control', end: 3.9, breath: 'inhale', cue: 'Breathe in and lower the shoulder blades, then the head.', w: 0.15 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Rest briefly with the arms still up; repeat.', w: 0.1 },
  ],
  mistakes: [['Swinging the ball forward to sit up', 'Keep the arms vertical to the trunk; the abs lift you.'], ['Lifting the low back', 'Curl only until the shoulder blades clear the mat.'], ['Tucking the chin hard', 'Keep a fist of space between chin and chest.'], ['Bending the elbows', 'Arms long and locked.']],
  kin: [['Upper trunk', 'About 25-45 degrees off the mat (clinical opinion); crunches excite the rectus abdominis (Escamilla 2006)', ['escamilla2006']], ['Lumbar', 'Low back stays on the mat (Escamilla 2006)', []], ['Arms', 'Straight, perpendicular to the trunk, holding the ball (standard technique)', []], ['Hips and knees', 'Feet flat, knees about 90 degrees (standard setup)', []], ['Tempo', 'Controlled, slower down (clinical opinion)', []]],
  safety: { cautions: ['Hold the ball securely so it cannot fall on the face.'], modify: ['Neck strain: lighter ball, smaller curl.'], regressions: ['Floor crunch.'], progressions: ['Heavier ball.', 'Medicine ball held overhead.'] },
  act: { core: [0.08, 0.7], obliques_r: [0.06, 0.4], obliques_l: [0.06, 0.4], ant_deltoid_r: [0.2, 0.28], ant_deltoid_l: [0.2, 0.28], serratus_r: [0.15, 0.3], serratus_l: [0.15, 0.3], triceps_r: [0.12, 0.16], triceps_l: [0.12, 0.16] },
  props: [{ id: 'mat', kind: 'mat', center: [-10, 0, 0], size: [180, 0.6, 62] }],
  guides: [{ id: 'ballPath', kind: 'path', joint: 'wrist_r', from: 0.8, to: 1.8, label: 'Ball rises toward the ceiling' }],
  checks: { stillJoints: ['ankle_r', 'ankle_l', 'pelvis'], plantedContacts: ['leg_r', 'leg_l'] },
});

const BALL = 24;
const B = C.lie({ kneeFlex: 90, headRest: 'floor' });
const F = C.plantFeet(B.pose, 90);
const lie = F.pose, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
lie.ch.sc_r = { protract: 10, elevate: 4 }; lie.ch.sc_l = { protract: 10, elevate: 4 };
// ball over the chest, arms straight up (perpendicular to the thorax): centre found once in the T6 frame
const W0 = L.fk(lie, F.contacts), up = V.norm(L.Q.rot(W0.spine_t6.q, [1, 0, 0])); // thorax front (ceiling when lying)
const shMid = V.scale(V.add(W0.shoulder_r.p, W0.shoulder_l.p), 0.5);
const C0 = V.add(V.add(shMid, V.scale(up, L.reach(12) + 4)), [0, 0, 0]);
const armed = G.armsOnBall(lie, C0, BALL + 3, { guess: { plane: 85, elev: 85, axial: 0, elbow: 12, pron: 0, flex: 0, dev: 0 } });
const ARMS = {}; for (const j of ['shoulder_r', 'shoulder_l', 'elbow_r', 'elbow_l', 'wrist_r', 'wrist_l']) ARMS[j] = clone(armed.ch[j]);
function curl(k) {
  const p = C.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  C.neck(p, k.neck == null ? NECK0 : k.neck);
  Object.assign(p.ch, clone(ARMS));
  return p;
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null }, { name: 'peel', l5: 0.5, t12: 7, t6: 10, neck: 22 }, { name: 'top', l5: 2, t12: 20, t6: 16, neck: 28 },
  { name: 'topHold', l5: 2.5, t12: 21, t6: 16.5, neck: 28 }, { name: 'down', l5: 0.5, t12: 4, t6: 6, neck: 20 }, { name: 'touch', l5: 0, t12: 1, t6: 2, neck: 10 },
];
const poses = {}; for (const k of KEYS) poses[k.name] = curl(k);
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.1, pose: 'peel' }, { t: 1.8, pose: 'top' }, { t: 2.3, pose: 'topHold' }, { t: 3.3, pose: 'down' }, { t: 3.9, pose: 'touch' }, { t: 4.4, pose: 'lie' }, { t: 5.0, pose: 'lie' }];
const ex = C.buildModule(meta, poses, keyframes, F.contacts);
const ball = G.medBall({ d: BALL });
ex.props = ex.props.concat([ball]);
let width = [1e9, -1e9], ballClr = 1e9, faceGap = 1e9;
const rep = C.scan(ex, { trunk: (W) => G.trunkLean(W), upper: (W) => C.upperFromFloor(W), lowBack: (W) => C.minOf(W, ['abdomen', 'pelvis', 'buttock_r']), ball: (W) => { const b = G.medBallAt(W, ball); width = [Math.min(width[0], b.width), Math.max(width[1], b.width)]; ballClr = Math.min(ballClr, G.medBallClear(W, ball).d); faceGap = Math.min(faceGap, V.len(V.sub(b.c, W.head_c1.p)) - BALL / 2 - 12); return b.c[1]; } });
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.top, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].setup = d(C.upperFromFloor(Wl)); kin[0].peak = `${d(C.upperFromFloor(Wt))} (C7 up ${r1(Wt.neck_c7.p[1] - Wl.neck_c7.p[1])} cm)`;
kin[1].setup = 'On the mat'; kin[1].peak = `Low back ${rep.lowBack[1]} cm off the mat at most`;
kin[2].setup = `Elbows ≈${Math.round(ARMS.elbow_r.flex)}°, hands ${width[0].toFixed(0)} cm apart on the ball`; kin[2].peak = `Ball rises ${r1(rep.ball[1] - rep.ball[0])} cm with the trunk`;
kin[3].setup = `Hip ${d(lie.ch.hip_r.flex)}, knee ${d(C.kneeOf(Wl, 'r'))}`; kin[3].peak = 'Unchanged';
kin[4].setup = 'Rest 0.8 s'; kin[4].peak = '1.0 s up, 0.5 s squeeze, 1.6 s down, 1.1 s rest';
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(rep.trunk[1] - 3), max: Math.ceil(rep.trunk[1] + 3) };
console.log(`Medicine Ball Crunch: wrote ${L.write(ex)} armErr ${armed.__err.toFixed(2)}\n  ${JSON.stringify(rep)} width ${width.map((v) => v.toFixed(2))} ballBody ${ballClr.toFixed(1)} faceGap ${faceGap.toFixed(1)}`);
C.guard('medicine-ball-crunch', rep, [width[1] - width[0] > 1.5 && 'grip width changes', ballClr < -1 && 'ball inside the body', armed.__err > 1 && 'hands miss the ball']);
