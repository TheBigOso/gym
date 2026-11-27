// Dumbbell JM Press (GymVisual #1121312, Dumbbell JM Bench Press): lying on a flat bench, glutes on the seat, upper back and
// head on the pad, feet planted (leg contacts). Neutral grip (palms facing each other), elbows tucked over the shoulders.
// A hybrid of a close-grip press and a lying triceps extension: as the elbows bend the upper arms tilt down toward the
// feet, so the dumbbells travel back toward the upper chest / chin; then the elbows extend and the upper arms return to
// vertical. Each key sets the upper-arm tilt and the elbow bend together (linear in the phase). Bilateral. Family
// b4-benchpress.js (extArm).
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const P = require('./families/b4-benchpress');
const meta = require('./meta/dumbbell-jm-press.json');

const TILT = +(process.env.TILT ?? 48), FLEX_BOT = +(process.env.FLEXB ?? 118), FLEX_TOP = 6, TILT_TOP = 2, N = 6;
const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(0);
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0);
const dirs = (th) => { const t = th * R.DEG; return { ua: V.add(V.scale(F.v, Math.cos(t)), V.scale(F.u, -Math.sin(t))), fa: V.add(V.scale(F.u, Math.cos(t)), V.scale(F.v, Math.sin(t))) }; };
const keyAt = (f) => { const th = TILT_TOP + (TILT - TILT_TOP) * f, fl = FLEX_TOP + (FLEX_BOT - FLEX_TOP) * f, { ua, fa } = dirs(th); return C.mirrorArm(P.extArm(base, ua, fa, fl, V.scale(F.w, -1))); };
const path = []; for (let i = 0; i <= N; i++) { const q = keyAt(i / N); path.push({ f: 1 - i / N, pose: C.strip(q), cost: q.__cost }); }
path.reverse();
const settle = C.strip(keyAt(0.985));
const { poses, keyframes } = C.repKeys(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }] });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = P.d0;
const dbB = C.dbAt(Wb, 'r'), uaB = V.angle(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p), [0, 1, 0]);
const chin = L.R.shapeWorld(Wb, require('./families/b3-triceps').shapeOf('jaw'));
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (arms straight over the shoulders)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom`);
set('Upper arm angle', 'setup', `${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} from vertical`); set('Upper arm angle', 'peak', `${d(uaB)} from vertical toward the feet at the bottom`);
set('Dumbbell path', 'setup', 'Over the shoulders'); set('Dumbbell path', 'peak', `Dumbbell centres ${r1(dbB.c[1] - W0.shoulder_r.p[1])} cm above the shoulder joints and ${r1(W0.shoulder_r.p[0] - dbB.c[0])} cm toward the head from them (over the upper chest / chin), ${r1(2 * dbB.c[2])} cm apart`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
P.finish(ex, 'Dumbbell JM Press', { W0, sw, fit: C.benchFit(B, W0) }, `elbow ${r1(C.elbowFlexOf(Wt))}/${r1(C.elbowFlexOf(Wb))} ua ${r1(uaB)} dbB ${dbB.c.map(r1)} jaw ${chin.c.map(r1)} costs ${path.map((k) => k.cost.toFixed(4)).join(',')}`);
