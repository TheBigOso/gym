// Dumbbell Floor Fly (GymVisual #414912): lying on the mat, knees bent and feet flat (planted leg contacts), a dumbbell in
// each hand with a neutral grip. The arms open in a wide arc with the elbows held at a soft fixed bend (about 22 degrees,
// elbow angle about 158 as in Solstad 2020) until the backs of the upper arms rest on the floor, pause, then sweep back up
// and squeeze. Bilateral. The bottom of the arc is solved so the arm shapes just touch the floor. Families b4-floorpush.js
// (floor lying, sweep) and b3-chest.js (fly arc).
const L = require('./lib');
const { V, r1 } = L;
const B = require('./families/b4-floorpush');
const C = require('./families/b3-chest');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-floor-fly.json');
const ELBOW = 22, TO_FEET = 14, TOP_OUT = 0.06;
// Rig v2: the dumbbell estimate matches the drawn hand, so the plates must stay above the floor (DB_CLR cm).
const DB_CLR = 0.5;
const T = C.phaseT(meta), { base, contacts, foot } = B.lieFloor();
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0);
const dTop = V.norm(V.add([0, 1, 0], V.scale(F.w, TOP_OUT)));
const botAt = (dip) => C.flyPath(base, { dTop, dBot: C.upperArmDir(F, 90 - TO_FEET, dip), elbow: ELBOW, n: 1 })[1].pose;
const dbLow = (W) => Math.min(...['r', 'l'].map((sd) => { const d = C.dbAt(W, sd); return Math.min(...d.ends.map((e) => e[1])) - d.r; }));
// deepest point where either the upper arm or the dumbbell plates reach the floor
const DIP = r1(B.bisect((dip) => { const W = L.fk(C.mirrorArm(botAt(dip)), contacts); return Math.min(B.armMinY(W) - 0.05, dbLow(W) - DB_CLR); }, -10, 30) - 0.1);
const dBot = C.upperArmDir(F, 90 - TO_FEET, DIP);
const path = C.flyPath(base, { dTop, dBot, elbow: ELBOW, n: 6 }).map((k) => ({ f: 1 - k.f, pose: C.mirrorArm(C.strip(k.pose)) })).reverse();
const settle = C.mirrorArm(C.strip(C.flyPath(base, { dTop, dBot: C.upperArmDir(F, 90 - TO_FEET, DIP - 1.2), elbow: ELBOW, n: 1 })[1].pose));
const { poses, keyframes } = C.repKeys(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
let elbowR = [999, -999];
const sw = B.floorSweep(ex, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }], probe: (W) => { const e = C.elbowFlexOf(W); elbowR = [Math.min(elbowR[0], e), Math.max(elbowR[1], e)]; } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const dbT = C.dbAt(Wt, 'r'), dbB = C.dbAt(Wb, 'r'), fromVert = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, 1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} flexion (elbow angle ${d(180 - C.elbowFlexOf(Wt))})`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom; ${r1(elbowR[0])}-${r1(elbowR[1])}° through the loop`);
set('Arm opening', 'setup', `Upper arm ${d(fromVert(Wt))} from vertical`); set('Arm opening', 'peak', `${d(fromVert(Wb))} from vertical at the bottom, ${TO_FEET}° toward the hips`);
set('Upper arm on the floor', 'setup', '–'); set('Upper arm on the floor', 'peak', `Arm shapes ${r1(B.armMinY(Wb))} cm above the floor, dumbbells ${r1(dbLow(Wb))} cm; upper arm ${d(C.armDip(Wb))} below the back plane`);
set('Grip', 'setup', `Neutral; dumbbells ${r1(2 * dbT.c[2] - 12)} cm apart at the top`); set('Grip', 'peak', `Palms up at the bottom; dumbbell centres ${r1(2 * dbB.c[2])} cm apart, ${r1(dbB.c[1])} cm above the floor`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s on the floor, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s squeeze`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Dumbbell Floor Fly: wrote ${L.write(ex)}\n  dip ${DIP} elbow ${elbowR.map(r1)} bottom fromVert ${fromVert(Wb).toFixed(0)} top gap ${r1(2 * dbT.c[2] - 12)}\n  sweep ${JSON.stringify(sw)}`);
if (sw.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (sw.floor < -0.5 || sw.dbFloor < 0 || sw.dbBody > 0.5 || sw.dbGap[0] < 1) { console.error('FAIL: floor or dumbbell collision'); process.exitCode = 1; }
