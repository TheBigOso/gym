// Front Plank with Arm and Leg Lift (GymVisual #13322; page not readable here, movement from the name and standard
// coaching). Forearm plank on a mat. The right arm reaches straight forward to about shoulder level while the straight
// left leg lifts a little past the body line; hold, return; then the left arm and the right leg. The pelvis and trunk
// stay still and square (root fixed), so the supporting forearm and foot stay planted. Both sides in one loop.
// Contacts: forearms and feet (prone family); a lifting limb's contact weight goes to 0 and its FK channels at the
// planted keys are fitted to the IK solution, so lift-off and touch-down blend without a jump.
const L = require('./lib');
const { V, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const B = require('./families/b6-18');
const meta = require('./meta/front-plank-with-arm-and-leg-lift.json');

const F = B.forearmPlank();
const { plank0, contacts, E, WT } = F;
for (const s of ['r', 'l']) if (plank0.ch[`wrist_${s}`].pron <= -179.5) plank0.ch[`wrist_${s}`].pron = 180; // same angle, on the branch the reaching arm turns from
const W0 = L.fk(plank0, contacts);
const LIFT = 12;
const lineHip = plank0.ch.hip_r.flex;
const legOpt = (s) => ({ hipTop: B.r3(lineHip - LIFT), knee0: plank0.ch[`knee_${s}`].flex, ankle0: plank0.ch[`ankle_${s}`].dorsi, kneeTop: 2, ankleTop: -28 });
// Right arm from the planted forearm to straight forward (thumb up), f = 0..1; the forearm peels up first.
const S0 = W0.shoulder_r.p, d0 = V.sub(W0.wrist_r.p, S0), L0 = V.len(d0), FWD = V.norm([1, 0.06, 0.05]);
function armR(f, guess) {
  const g = Math.min(1, f);
  const dir = V.norm(V.add(V.scale(V.norm(d0), 1 - B.ease(g)), V.scale(FWD, B.ease(g))));
  const len = L0 + (L.reach(6) - L0) * Math.min(1, g / 0.7);
  const tgt = V.add(V.add(S0, V.scale(dir, len)), [0, 4 * Math.sin(Math.PI * Math.min(1, g / 0.5)) * (g < 0.5 ? 1 : 0), 0]);
  const w0 = plank0.ch.wrist_r, h = Math.min(1, g / 0.6), p0 = w0.pron + 360 * Math.round((90 - w0.pron) / 360);
  const wrist = { pron: B.r3(p0 + (90 - p0) * h), flex: B.r3(w0.flex * (1 - h)), dev: B.r3(w0.dev * (1 - h)) };
  return L.armToTarget(plank0, tgt, { wrist, axial: plank0.ch.shoulder_r.axial, axialW: 0.05, guess });
}
const ARM = {}; { let g = [plank0.ch.shoulder_r.plane, plank0.ch.shoulder_r.elev, plank0.ch.shoulder_r.axial || 0]; for (const f of [0.12, 0.55, 1, 1.03]) { const q = armR(f, g); ARM[f] = q; g = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial]; } }
function lift(arm, f, af) {
  const leg = arm === 'r' ? 'l' : 'r';
  let q = B.liftLeg(plank0, leg, f, legOpt(leg));
  const a = ARM[af];
  for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_${arm}`] = clone(a.ch[`${j}_r`]);
  q.ik[`arm_${arm}`].weight = 0;
  return q;
}
const poses = { plank: plank0, aPeel: lift('r', 0.1, 0.12), aMid: lift('r', 0.55, 0.55), aTop: lift('r', 1, 1), aHold: lift('r', 1.04, 1.03), bPeel: lift('l', 0.1, 0.12), bMid: lift('l', 0.55, 0.55), bTop: lift('l', 1, 1), bHold: lift('l', 1.04, 1.03) };
const keyframes = [
  { t: 0, pose: 'plank' }, { t: 0.8, pose: 'plank' }, { t: 1.0, pose: 'aPeel' }, { t: 1.4, pose: 'aMid' }, { t: 1.8, pose: 'aTop' }, { t: 2.3, pose: 'aHold' }, { t: 2.8, pose: 'aTop' }, { t: 3.3, pose: 'aMid' }, { t: 3.65, pose: 'aPeel' }, { t: 3.8, pose: 'plank' },
  { t: 4.6, pose: 'plank' }, { t: 4.8, pose: 'bPeel' }, { t: 5.2, pose: 'bMid' }, { t: 5.6, pose: 'bTop' }, { t: 6.1, pose: 'bHold' }, { t: 6.6, pose: 'bTop' }, { t: 7.1, pose: 'bMid' }, { t: 7.45, pose: 'bPeel' }, { t: 7.6, pose: 'plank' }, { t: 8.4, pose: 'plank' },
];
const ex = H.module_(meta, contacts, poses, keyframes);
const trunkV = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(trunkV - 1), max: Math.ceil(trunkV + 1) };

const Wt = L.fk(poses.aTop, contacts);
const armAng = (W) => Math.atan2(W.wrist_r.p[1] - W.shoulder_r.p[1], W.wrist_r.p[0] - W.shoulder_r.p[0]) / (Math.PI / 180);
const legAbove = (W, s) => V.angle(V.sub(W[`ankle_${s}`].p, W[`hip_${s}`].p), V.sub(W0[`ankle_${s}`].p, W0[`hip_${s}`].p));
const set = H.setKin(ex);
set('Arm elevation', 'setup', 'Forearm on the mat, elbow under the shoulder'); set('Arm elevation', 'peak', `Straight forward, ${B.deg(armAng(Wt))} from level (hand ${Math.round(Wt.wrist_r.p[1])} cm above the mat)`);
set('Hip extension', 'setup', `Hip ${B.deg(lineHip)} (in line)`); set('Hip extension', 'peak', `Hip ${B.deg(poses.aTop.ch.hip_l.flex)}: leg ${B.deg(legAbove(Wt, 'l'))} above the body line`);
set('Body line', 'setup', `${B.deg(B.bodyLine(W0))} off straight`); set('Body line', 'peak', 'Unchanged (pelvis fixed)');
set('Pelvis', 'setup', 'Level, square to the mat'); set('Pelvis', 'peak', 'Unchanged (no rotation)');
set('Tempo', 'setup', '0.8 s plank'); set('Tempo', 'peak', '1 s out, 1 s hold, 1 s back per side');
ex.exercise.reference.note = B.NOTE;
console.log(`Front Plank with Arm and Leg Lift: wrote ${L.write(ex)}  arm=${JSON.stringify(poses.aTop.ch.shoulder_r)} elb=${poses.aTop.ch.elbow_r.flex} measure=${JSON.stringify(ex.checks.measure)}`);
const sw = P.sweep(ex, [{ joint: 'elbow_r', p: E.r, when: (pz) => pz.ik.arm_r.weight >= 0.999 }, { joint: 'elbow_l', p: E.l, when: (pz) => pz.ik.arm_l.weight >= 0.999 }]);
let limbMin = 1e9; H.loopReport(ex, { probe: (W, pz) => { for (const s of ['r', 'l']) { if (pz.ik[`leg_${s}`].weight < 0.999) limbMin = Math.min(limbMin, H.bottomOf(W, `foot_${s}`)); if (pz.ik[`arm_${s}`].weight < 0.999) limbMin = Math.min(limbMin, H.bottomOf(W, `hand_${s}`), H.bottomOf(W, `forearm_${s}`)); } } });
const lim = require('./families/core-a').scan(ex).limits;
console.log('  sweep', JSON.stringify(sw), 'liftedLimbMin', limbMin.toFixed(2), 'limits', lim.length);
if (sw.slide > 0.05 || sw.drift > 0.05 || sw.floor < -0.5 || lim.length) { console.error('FAIL front-plank-with-arm-and-leg-lift', lim.slice(0, 4)); process.exitCode = 1; }
