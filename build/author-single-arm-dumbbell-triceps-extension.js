// Single-Arm Lying Dumbbell Triceps Extension (GymVisual #036212, Dumbbell One Arm Triceps Extension on bench): lying on a
// flat bench, glutes on the seat, upper back and head on the pad, feet planted (leg contacts). One dumbbell in the right
// hand, palm facing in (neutral handle grip). The right upper arm stays vertical over the shoulder (constant shoulder
// channels) while the elbow bends, lowering the dumbbell beside the head, then straightens. The left hand rests on the
// stomach (constant channels; holding the working upper arm across the body needs more horizontal adduction than the rig
// shoulder allows). Authored right. Families b3-chest.js and b4-benchpress.js (extArm, restHand).
const L = require('./lib');
const { V, R, Q, r1, clone } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const P = require('./families/b4-benchpress');
const meta = require('./meta/single-arm-dumbbell-triceps-extension.json');

const FLEX_TOP = 6, FLEX_BOT = +(process.env.FLEXB ?? 100), N = 4;
const T = C.phaseT(meta), { B, base: base0, contacts, foot } = C.benchBase(0);
const ua = [0, 1, 0], fa = [-1, 0, 0];
const rest = P.restHand(base0, { lift: 2.5 }), base = rest.pose;
const keyAt = (f) => { const q = P.extArm(base, ua, fa, FLEX_TOP + (FLEX_BOT - FLEX_TOP) * f, [0, 0, -1]); return q; };
const path = []; for (let i = 0; i <= N; i++) { const q = keyAt(i / N); path.push({ f: 1 - i / N, pose: C.strip(q), cost: q.__cost }); }
path.reverse();
const settle = C.strip(keyAt(0.985));
const { poses, keyframes } = C.repKeys(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
let uaDev = 0;
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }], probe: (Wx) => { uaDev = Math.max(uaDev, V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), ua)); } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = P.d0;
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom`);
set('Upper arm angle', 'setup', `${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} from vertical`); set('Upper arm angle', 'peak', `Unchanged: shoulder channels constant (max ${uaDev.toFixed(1)}° drift)`);
set('Dumbbell clearance', 'setup', 'Over the shoulder'); set('Dumbbell clearance', 'peak', `Closest approach to the body ${r1(-sw.dbBody)} cm (rig shapes), to the bench ${r1(-sw.dbBench)} cm`);
set('Free hand', 'setup', 'Left hand resting on the stomach'); set('Free hand', 'peak', 'Unchanged (constant left-arm channels)');
set('Knee flexion', 'setup', `${d(H.kneeOf(L.fk(base, contacts), 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
P.finish(ex, 'Single-Arm Lying Dumbbell Triceps Extension', { W0: L.fk(base, contacts), sw, fit: C.benchFit(B, L.fk(base, contacts)) }, `elbow ${r1(C.elbowFlexOf(Wt))}/${r1(C.elbowFlexOf(Wb))} rest cost ${rest.cost.toFixed(3)} left ${JSON.stringify(base.ch.shoulder_l)} ${JSON.stringify(base.ch.elbow_l)} ${JSON.stringify(base.ch.wrist_l)}`);
