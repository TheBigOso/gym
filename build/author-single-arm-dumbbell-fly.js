// Single-Arm Dumbbell Fly (GymVisual #128512, Dumbbell One Arm Bench Fly): lying on a flat bench, glutes on the seat, upper
// back and head on the pad, feet planted a little wider than for the two-arm fly (leg contacts). One dumbbell in the right
// hand, neutral grip; the arm opens in a wide arc with the elbow held at a soft fixed bend (about 22 degrees of flexion, as in
// Solstad 2020) until the upper arm is about level with the bench, then sweeps back over the chest. The left hand rests on
// the stomach (constant channels). Authored right (the player mirrors). Families b3-chest.js (flyPath) and b4-benchpress.js.
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const P = require('./families/b4-benchpress');
const meta = require('./meta/single-arm-dumbbell-fly.json');

const ELBOW = 22, DIP = 4, TO_FEET = 12;
const T = C.phaseT(meta), bb = C.benchBase(0, { footZ: 28 }), { B, contacts, foot } = bb;
const rest = P.restHand(bb.base, { lift: +(process.env.LIFT ?? 2.5) }), base = rest.pose;
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0);
const dTop = V.norm(V.add([0, 1, 0], V.scale(F.w, 0.06))), dBot = C.upperArmDir(F, 90 - TO_FEET, DIP);
const path = C.flyPath(base, { dTop, dBot, elbow: ELBOW, n: 6 }).map((k) => ({ f: 1 - k.f, pose: C.strip(k.pose) })).reverse();
const settle = C.strip(C.flyPath(base, { dTop, dBot: C.upperArmDir(F, 90 - TO_FEET, DIP - 1.5), elbow: ELBOW, n: 1 })[1].pose);
const { poses, keyframes } = C.repKeys(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
let elbowR = [999, -999];
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }], probe: (W) => { const e = C.elbowFlexOf(W); elbowR = [Math.min(elbowR[0], e), Math.max(elbowR[1], e)]; } });
// free hand vs the body: wrist above the abdomen surface
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = P.d0;
const fromVert = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, 1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} flexion (elbow angle ${d(180 - C.elbowFlexOf(Wt))})`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom; ${r1(elbowR[0])}-${r1(elbowR[1])}° through the loop`);
set('Arm opening', 'setup', `Upper arm ${d(fromVert(Wt))} from vertical`); set('Arm opening', 'peak', `${d(fromVert(Wb))} from vertical at the bottom, ${TO_FEET}° toward the hips`);
set('Upper arm depth', 'setup', '–'); set('Upper arm depth', 'peak', `${d(C.armDip(Wb))} below the back plane`);
set('Free arm', 'setup', 'Left hand resting on the stomach'); set('Free arm', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s stretch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s squeeze`);
P.finish(ex, 'Single-Arm Dumbbell Fly', { W0, sw, fit: C.benchFit(B, W0) }, `elbow ${elbowR.map(r1)} fromVert ${fromVert(Wb).toFixed(0)} rest cost ${rest.cost.toFixed(3)} left ${JSON.stringify(base.ch.shoulder_l)} ${JSON.stringify(base.ch.elbow_l)} ${JSON.stringify(base.ch.wrist_l)}`);
