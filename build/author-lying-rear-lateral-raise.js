// Lying Rear Lateral Raise (GymVisual #14677, movement reference only; page not readable here). Chest-supported rear
// delt raise: adjustable bench with the back pad at 40 degrees, straddle the seat and lie chest-down on the pad, chin just
// over the top, balls of the feet planted behind (the chest-supported row / prone incline curl setup, b4-curls2
// chestOnPad). A dumbbell in each hand hangs straight down under the shoulders, palms facing each other, elbows soft.
// Sweep the arms out to the sides (horizontal abduction about the trunk's long axis, as author-dumbbell-rear-delt-fly)
// to about level with the back while the shoulder blades squeeze together; pause, lower slowly. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const C = require('./families/b3-curls');
const B3 = require('./families/b3-back');
const K = require('./families/b4-curls2');
const D = require('./families/dumbbell');
const F = require('./families/b3-shoulders');
const meta = require('./meta/lying-rear-lateral-raise.json');

const ANG = 40;
const P = K.chestOnPad({ ang: ANG, along: +(process.env.SA || 23), foot: [-50, 26] });
const { bench, contacts, body } = P;
const W0 = L.fk(body, contacts);
const TRUNK = Math.atan2(W0.neck_c7.p[1] - W0.pelvis.p[1], W0.neck_c7.p[0] - W0.pelvis.p[0]) * 180 / Math.PI; // trunk line above horizontal
const PLANE0 = 86, PLANE1 = +(process.env.P1 || 2), ELEV0 = r1(90 - TRUNK - 2), ELEV1 = +(process.env.E1 || 82);
const bottom = F.armKeys(body, [{ name: 'bottom', plane: PLANE0, elev: ELEV0, axial: -PLANE0, flex: 14, pron: 0, palm: [0, 0, -1], sc: { protract: 6, elevate: 0 } }], contacts);
const Bp = bottom.poses.bottom, AX = Bp.ch.shoulder_r.axial, PRON = Bp.ch.wrist_r.pron, P0 = Bp.ch.shoulder_r.plane, E0 = Bp.ch.shoulder_r.elev;
const poses = { bottom: Bp };
for (const [name, f] of [['r25', 0.25], ['r50', 0.5], ['r75', 0.75], ['top', 1]]) {
  const p = clone(Bp), k = f * f * (3 - 2 * f) * 0.3 + f * 0.7;
  p.ch.shoulder_r = { plane: r1(P0 + (PLANE1 - P0) * f), elev: r1(E0 + (ELEV1 - E0) * k), axial: AX };
  p.ch.elbow_r = { flex: r1(14 + 4 * f) }; p.ch.wrist_r = { pron: PRON, flex: 0, dev: 0 };
  p.ch.sc_r = { protract: r1(6 - 20 * f), elevate: 0 };
  poses[name] = F.mirrorArm(p);
}
poses.squeeze = clone(poses.top); poses.squeeze.ch.sc_r.protract = poses.squeeze.ch.sc_l.protract = r1(poses.top.ch.sc_r.protract - 2);
for (const p of Object.values(poses)) delete p.__err;
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }, { t: 1.2, pose: 'r25' }, { t: 1.55, pose: 'r50' }, { t: 1.9, pose: 'r75' }, { t: 2.3, pose: 'top' },
  { t: 2.55, pose: 'squeeze' }, { t: 2.8, pose: 'top' }, { t: 3.3, pose: 'r75' }, { t: 3.8, pose: 'r50' }, { t: 4.3, pose: 'r25' }, { t: 4.8, pose: 'bottom' }, { t: 5.6, pose: 'bottom' }];
const props = [bench.prop, ...C.dumbbells(['r', 'l'])];
const ex = K.assemble(meta, { contacts, poses, keyframes, props });
const rep = K.report(ex, { boxes: P.boxes });
const sw = B3.sweep(ex, { held: [{ side: 'r', grip: 'handle', size: D.DB }, { side: 'l', grip: 'handle', size: D.DB }], fixed: ['pelvis', 'ankle_r', 'ankle_l'], boxes: P.boxes, bodySkip: ['chest', 'pecs_r', 'pecs_l', 'ribcage', 'abdomen'] }, 400);
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const armFromDown = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]);
const armToTrunk = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.neck_c7.p, W.pelvis.p));
const set = (m, f, v) => C.setKin(ex, m, f, v);
set('Bench angle', 'setup', `${ANG}° back pad, chest on the pad; trunk ≈${Math.round(TRUNK)}° above horizontal`); set('Bench angle', 'peak', 'Unchanged (the chest stays on the pad)');
set('Horizontal abduction', 'setup', `Arms hanging (upper arm ≈${Math.round(armFromDown(Wb))}° from vertical)`); set('Horizontal abduction', 'peak', `Upper arm ≈${Math.round(armToTrunk(Wt))}° from the trunk line, out to the side about level with the back`);
set('Elbow flexion', 'setup', `≈${Math.round(elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(elbowAng(Wt))}°`);
set('Grip', 'setup', 'Neutral, palms facing each other'); set('Grip', 'peak', 'Palms down, thumbs toward the head');
set('Tempo', 'setup', 'Arms hanging 0.8 s'); set('Tempo', 'peak', '1.5 s up, 0.5 s squeeze, 2.0 s down');
const tf = B3.trunkLean(Wb);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Lying Rear Lateral Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { err: bottom.err, sw: { dbBox: sw.dbBox, bodyBox: sw.bodyBox, bodyBoxAt: sw.bodyBoxAt, drift: sw.drift, db: sw.db }, trunk: r1(TRUNK), top: poses.top.ch.shoulder_r }))}`);
K.fail(rep, 'lying-rear-lateral-raise', [[sw.drift < 0.05, 'pelvis or feet drift'], [sw.dbBox >= 0, 'dumbbell into the bench']]);
