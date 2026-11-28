// Old School Reverse Extensions (GymVisual 11401, movement reference only; the page could not be read at authoring
// time). The "old school" reverse hyper without a machine: lying face down on a high plyo box (or sturdy table), chest and
// belly on the top, hips just past the edge so the straight legs hang down with the toes near the floor, hands holding
// the far end of the box. Squeeze the glutes and lift both straight legs until they are level with the body (hip
// extension), short squeeze, lower under control. The trunk stays on the box (root identical in every key); planted
// hands (palm down over the far edge). Bilateral, body weight.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const F = require('./families/b6-16');
const H = require('./families/hips');
const C = require('./families/core-a');
const meta = require('./meta/old-school-reverse-extensions.json');

const BH = 76;                       // box height (cm): the hanging legs just clear the floor
const lying = F.proneLie({ neck: -14 });
// trunk resting on the box top: the lying pose lifted by the box height
const trunk = clone(lying); trunk.root.pos[1] = r1(trunk.root.pos[1] + BH);
const LEG = rig.shapes.map((s) => s.id).filter((id) => /^(thigh|quad|shank|calf|foot)_/.test(id));
const TRUNK = ['chest', 'ribcage', 'abdomen', 'pecs_r', 'pecs_l'];
function legs(hip, knee = 3, dorsi = -35) { const p = clone(trunk); for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: hip, abd: 2, rot: 0 }; p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi }; } return p; }
// start: hip flexion so the toes hang 4 cm above the floor
let lo = 20, hi = 100;
for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (L.shapeMinY(L.fk(legs(m, 5))).y > 4) lo = m; else hi = m; }
const HIP0 = r1(lo);
// box: top at BH, its leg-side edge just in front of the hanging thighs (whichever is further toward the head over the loop)
const W0 = L.fk(legs(HIP0, 5));
let edge = -1e9;
for (const h of [HIP0, HIP0 * 0.6, HIP0 * 0.3, 0]) { const W = L.fk(legs(h, 4)); for (const s of rig.shapes) if (LEG.includes(s.id)) { const g = R.shapeWorld(W, s); const pts = g.kind === 'capsule' ? [g.a, g.b] : [g.c]; for (const p of pts) if (p[1] < BH + 2) edge = Math.max(edge, p[0] + (g.kind === 'capsule' ? Math.max(...g.r) : 6)); } }
edge = r1(Math.max(edge + 1, W0.hip_r.p[0] + 4));
const LEN = 76, box = { id: 'box', kind: 'box', center: [r1(edge + LEN / 2), 0, 0], size: [LEN, BH, 46] };
// hands: palm down on the box top near the far end, a little wider than the shoulders
const HC = ['r', 'l'].map((s) => H.handC(s, [-0.2, 1, s === 'r' ? 0.5 : -0.5]));
const S = W0.shoulder_r.p, endX = edge + LEN;
const T = { r: [r1(Math.min(endX - 9, S[0] + 30)), r1(BH + 2.7), 21], l: [r1(Math.min(endX - 9, S[0] + 30)), r1(BH + 2.7), -21] };
const ARMG = (s) => [{ [`shoulder_${s}`]: { plane: 80, elev: 120, axial: 0 }, [`elbow_${s}`]: { flex: 70 }, [`wrist_${s}`]: { pron: 90, flex: -30, dev: 0 } }, { [`shoulder_${s}`]: { plane: 60, elev: 110, axial: -40 }, [`elbow_${s}`]: { flex: 90 } }];
function withHands(p) { let q = H.fitArm(p, 'r', HC[0], T.r, ARMG('r')); delete q.__cost; q = H.fitArm(q, 'l', HC[1], T.l, ARMG('l')); delete q.__cost; q.ik = { arm_r: { target: T.r, weight: 1 }, arm_l: { target: T.l, weight: 1 } }; return q; }
const TOP = -3;
const poses = { hang: withHands(legs(HIP0, 5)), mid: withHands(legs(r1(HIP0 * 0.5), 4, -38)), top: withHands(legs(TOP, 3, -40)), topHold: withHands(legs(TOP - 1, 3, -40)) };
const keyframes = [{ t: 0, pose: 'hang' }, { t: 0.6, pose: 'hang' }, { t: 1.2, pose: 'mid' }, { t: 1.8, pose: 'top' }, { t: 2.4, pose: 'topHold' }, { t: 3.1, pose: 'mid' }, { t: 3.8, pose: 'hang' }, { t: 5.6, pose: 'hang' }];
const ex = H.module_(meta, HC, poses, keyframes);
ex.props = [box];
ex.checks.stillJoints = ['pelvis', 'spine_t6'];
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(HIP0 - 4), max: Math.ceil(HIP0 + 4) };

// whole loop: floor, hand slide, legs and arms clear of the box, trunk resting on its top
const rep = C.scan(ex, { legBox: (W) => F.boxClear(W, box, LEG).d, trunkBox: (W) => F.boxClear(W, box, TRUNK).d, bodyBox: (W) => F.boxClear(W, box).d, legFromLevel: (W) => F.legFromHorizontal(W) });
const Wt = L.fk(poses.topHold, HC), Wh = L.fk(poses.hang, HC);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${HIP0}° (legs hanging, toes ${r1(L.shapeMinY(Wh).y)} cm off the floor)`); set('Hip flexion', 'peak', `≈${TOP - 1}° (legs level)`);
set('Legs from horizontal', 'setup', `${Math.round(F.legFromHorizontal(Wh))}°`); set('Legs from horizontal', 'peak', `${Math.round(F.legFromHorizontal(Wt))}° (hip-to-ankle line)`);
set('Knees', 'setup', '≈5°'); set('Knees', 'peak', '≈3° (straight)');
set('Trunk', 'setup', `Chest and belly on the box (${BH} cm high), hips just past the edge`); set('Trunk', 'peak', `Unchanged (pelvis moves ${rep.still} cm)`);
set('Tempo', 'setup', 'Hang 0.6 s'); set('Tempo', 'peak', '1.2 s up, 0.6 s squeeze, 1.4 s down, 1.8 s hang');
console.log(`Old School Reverse Extensions: wrote ${L.write(ex)}\n  box ${JSON.stringify(box)} hands ${JSON.stringify(T)}\n  ${JSON.stringify(rep)}`);
C.guard('old-school-reverse-extensions', rep, [rep.legBox[0] < -0.3 && `legs pass into the box (${rep.legBox[0]} cm)`, rep.trunkBox[0] < -0.6 && `trunk sinks into the box (${rep.trunkBox[0]})`, rep.trunkBox[0] > 1 && `trunk floats above the box (${rep.trunkBox[0]})`, rep.bodyBox[0] < -0.8 && `body passes into the box (${rep.bodyBox[0]})`]);
