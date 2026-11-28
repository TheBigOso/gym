// Front Plank with Leg Lift (GymVisual #12543; page not readable here, movement from the name and standard coaching).
// Forearm plank on a mat (elbows under the shoulders, body in one line, on the balls of the feet). The straight right leg
// lifts from the hip a little past the body line, holds, lowers; then the left leg. The pelvis and trunk stay still and
// square (root fixed), so the forearms and the supporting foot stay planted. Both sides in one loop (bilateral).
// Contacts: forearms (prone family forearm contacts) and feet; a lifting leg's contact weight goes to 0 and its FK
// channels at the planted keys are fitted to the IK solution, so lift-off and touch-down blend without a jump.
const L = require('./lib');
const { V, clone } = L;
const P = require('./families/prone');
const B = require('./families/b6-18');
const meta = require('./meta/front-plank-with-leg-lift.json');

const F = B.forearmPlank();
const { plank0, contacts, E } = F;
const W0 = L.fk(plank0, contacts);
// hip angle that lifts the straight leg LIFT degrees above the plank body line
const LIFT = 14;
const lineHip = plank0.ch.hip_r.flex;
const opt = (s) => ({ hipTop: B.r3(lineHip - LIFT), knee0: plank0.ch[`knee_${s}`].flex, ankle0: plank0.ch[`ankle_${s}`].dorsi, kneeTop: 2, ankleTop: -28 });
const up = (s, f) => B.liftLeg(plank0, s, f, opt(s));
const poses = { plank: plank0, rPeel: up('r', 0.1), rMid: up('r', 0.55), rTop: up('r', 1), rHold: up('r', 1.04), lPeel: up('l', 0.1), lMid: up('l', 0.55), lTop: up('l', 1), lHold: up('l', 1.04) };
const keyframes = [
  { t: 0, pose: 'plank' }, { t: 0.8, pose: 'plank' }, { t: 1.0, pose: 'rPeel' }, { t: 1.4, pose: 'rMid' }, { t: 1.8, pose: 'rTop' }, { t: 2.3, pose: 'rHold' }, { t: 2.8, pose: 'rTop' }, { t: 3.3, pose: 'rMid' }, { t: 3.65, pose: 'rPeel' }, { t: 3.8, pose: 'plank' },
  { t: 4.6, pose: 'plank' }, { t: 4.8, pose: 'lPeel' }, { t: 5.2, pose: 'lMid' }, { t: 5.6, pose: 'lTop' }, { t: 6.1, pose: 'lHold' }, { t: 6.6, pose: 'lTop' }, { t: 7.1, pose: 'lMid' }, { t: 7.45, pose: 'lPeel' }, { t: 7.6, pose: 'plank' }, { t: 8.4, pose: 'plank' },
];
const H = require('./families/hips');
const ex = H.module_(meta, contacts, poses, keyframes);
const trunkV = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(trunkV - 1), max: Math.ceil(trunkV + 1) };

const Wt = L.fk(poses.rTop, contacts);
const legAbove = (W, s) => V.angle(V.sub(W[`ankle_${s}`].p, W[`hip_${s}`].p), V.sub(W0[`ankle_${s}`].p, W0[`hip_${s}`].p));
const set = H.setKin(ex);
set('Body line', 'setup', `${B.deg(B.bodyLine(W0))} off straight (shoulder-hip-ankle)`); set('Body line', 'peak', 'Unchanged on the supporting leg (pelvis fixed)');
set('Hip extension', 'setup', `Hip ${B.deg(lineHip)} (in line with the trunk)`); set('Hip extension', 'peak', `Hip ${B.deg(poses.rTop.ch.hip_r.flex)}: leg ${B.deg(legAbove(Wt, 'r'))} above the body line, foot ${Math.round(Wt.ankle_r.p[1] - W0.ankle_r.p[1])} cm up`);
set('Elbow position', 'setup', `Directly under the shoulders, ${Math.round(2 * E.r[2])} cm apart`); set('Elbow position', 'peak', 'Unchanged (forearms planted)');
set('Pelvis', 'setup', 'Level, square to the mat'); set('Pelvis', 'peak', 'Unchanged (no rotation toward the lifted leg)');
set('Tempo', 'setup', '0.8 s plank'); set('Tempo', 'peak', '1 s up, 1 s hold, 1 s down per leg');
ex.exercise.reference.note = B.NOTE;
console.log(`Front Plank with Leg Lift: wrote ${L.write(ex)}  hipTop=${poses.rTop.ch.hip_r.flex} measure=${JSON.stringify(ex.checks.measure)}`);
const fixed = ['r', 'l'].map((s) => ({ joint: `elbow_${s}`, p: E[s] }));
const sw = P.sweep(ex, fixed);
let footMin = 1e9; H.loopReport(ex, { probe: (W, pz) => { for (const s of ['r', 'l']) if (pz.ik[`leg_${s}`].weight < 0.999) footMin = Math.min(footMin, H.bottomOf(W, `foot_${s}`)); } });
const lim = require('./families/core-a').scan(ex).limits;
console.log('  sweep', JSON.stringify(sw), 'liftedFootMin', footMin.toFixed(2), 'limits', lim.length);
if (sw.slide > 0.05 || sw.drift > 0.05 || sw.floor < -0.5 || lim.length) { console.error('FAIL front-plank-with-leg-lift', lim.slice(0, 4)); process.exitCode = 1; }
