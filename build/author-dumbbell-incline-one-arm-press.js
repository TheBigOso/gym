// Dumbbell Incline One Arm Press (GymVisual #13789; page not readable here, movement from the name): the incline dumbbell
// press (back pad 30 degrees, glutes in the crease, feet planted) with one dumbbell in the right hand, palm toward the feet.
// The forearm stays vertical under the dumbbell while the upper arm swings from about 55 degrees out from the trunk, just
// below the back plane, to vertical over the shoulder. The free left hand rests on the stomach (constant channels). Authored
// right (the player mirrors). Families b3-chest.js (pressPath, sweep) and b4-benchpress.js (restHand, finish).
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const P = require('./families/b4-benchpress');
const meta = require('./meta/dumbbell-incline-one-arm-press.json');

const ANGLE = 30, FLARE = 55, DIP = 12, TOP = [0.02, 1, 0.04];
const T = C.phaseT(meta), bb = C.benchBase(ANGLE, { footZ: 28 }), { B, contacts, foot } = bb;
const rest = P.restHand(bb.base, { lift: 2.5 }), base = rest.pose;
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0), ax = V.scale(F.w, -1);
const keep = (p) => { const q = C.strip(p); for (const j of ['shoulder_l', 'elbow_l', 'wrist_l', 'sc_l']) q.ch[j] = JSON.parse(JSON.stringify(base.ch[j])); return q; };
const path = C.pressPath(base, { flare: FLARE, dip: DIP, topDir: TOP, ax, n: 6 }).map((k) => ({ f: k.f, pose: keep(k.pose) }));
const settle = keep(C.pressPath(base, { flare: FLARE, dip: DIP - 1.5, topDir: TOP, ax, n: 1 })[0].pose);
const { poses, keyframes } = C.repKeys(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }] });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = P.d0;
const dbB = C.dbAt(Wb, 'r'), dbT = C.dbAt(Wt, 'r');
set('Bench angle', 'setup', `${ANGLE}° back pad, flat seat`); set('Bench angle', 'peak', 'Glutes in the crease, upper back and head on the pad');
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (arm straight, not locked)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom`);
set('Elbow flare', 'setup', 'Arm vertical over the shoulder'); set('Elbow flare', 'peak', `${d(C.elbowFlare(Wb))} at the bottom`);
set('Upper arm depth', 'setup', '–'); set('Upper arm depth', 'peak', `${d(C.armDip(Wb))} below the back plane`);
set('Dumbbell path', 'setup', `Top: dumbbell centre ${r1(dbT.c[2])} cm out from the midline`); set('Dumbbell path', 'peak', `Bottom: ${r1(dbB.c[2])} cm out beside the upper chest, rise ${r1(V.len(V.sub(dbT.c, dbB.c)))} cm`);
set('Free arm', 'setup', 'Left hand resting on the stomach'); set('Free arm', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
P.finish(ex, 'Dumbbell Incline One Arm Press', { W0, sw, fit: C.benchFit(B, W0) }, `elbow top ${C.elbowFlexOf(Wt).toFixed(0)} bottom ${C.elbowFlexOf(Wb).toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)} dip ${C.armDip(Wb).toFixed(0)} rest cost ${rest.cost.toFixed(3)}`);
