// Dumbbell Thruster (GymVisual #296812): a front squat with a dumbbell racked on each shoulder (neutral grip), then one
// continuous drive up in which the leg drive pops the dumbbells off the shoulders and the arms press them straight up to
// lockout overhead (palms in); the dumbbells come back to the shoulders before the next squat. Feet planted (constant IK
// targets). Bilateral. The squat is the front squat's solve (build/families/squat.js); the press keys reuse its legs.
const L = require('./lib');
const { V, r1, clone } = L;
const F = require('./families/squat');
const S = require('./families/b3-shoulders');
const K = require('./families/b4-squats2');
const meta = require('./meta/dumbbell-thruster.json');

const STANCE = 19.5, TOE = 15;
const armsFn = (p) => { const q = K.rackArms(p, { level: 1 }); delete q.__err; return q; };
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 118, pitchBottom: -31, backBottom: -16, kneeOut: 1.5,
  spine: { l5: -4, t12: -3, t6: 1 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5, rise20: 0.2, popLegs: 0.04 },
  keyframes: [],
}, meta);
// Press keys (right arm solved, mirrored): hands leave the shoulders at chin height with the elbows forward, pass the
// forehead with the elbows moving out, and lock out straight over the shoulders with the palms facing in.
const PRESS = [
  { n: 'p1', legs: 'popLegs', wrist: [11, 10, 1], elbowHint: [1, -0.6, 0.5], sc: { protract: 6, elevate: 10 } },
  { n: 'p2', legs: 'stand', wrist: [6, 32, 2], elbowHint: [0.6, -0.3, 1], sc: { protract: 5, elevate: 14 } },
  { n: 'lock', legs: 'stand', wrist: [1, r1(L.reach(5) - 0.3), -2], elbowHint: [0.3, 0, 1], sc: { protract: 4, elevate: 18 } },
];
let g = K.chOf(poses.stand);
const err = {};
for (const k of PRESS) { const q = K.pressArm(poses[k.legs], k, g); err[k.n] = q.__err; g = K.chOf(q); delete q.__err; poses[k.n] = K.mirrorArms(q); delete poses[k.n].__err; }
poses.lockHold = clone(poses.lock); poses.lockHold.ch.elbow_r.flex = poses.lockHold.ch.elbow_l.flex = r1(poses.lock.ch.elbow_r.flex + 2);
delete poses.popLegs;
ex.keyframes = [{ t: 0, pose: 'stand' }, { t: 0.6, pose: 'stand' }, { t: 0.95, pose: 'l25' }, { t: 1.3, pose: 'l50' }, { t: 1.7, pose: 'l75' }, { t: 2.05, pose: 'bottom' },
  { t: 2.12, pose: 'bottomSettle' }, { t: 2.2, pose: 'bottom' }, { t: 2.5, pose: 'rise50' }, { t: 2.75, pose: 'rise20' }, { t: 2.92, pose: 'p1' }, { t: 3.1, pose: 'p2' }, { t: 3.3, pose: 'lock' },
  { t: 3.7, pose: 'lockHold' }, { t: 4.1, pose: 'p2' }, { t: 4.45, pose: 'p1' }, { t: 4.8, pose: 'stand' }, { t: 6.0, pose: 'stand' }];
ex.props = S.DUMBBELLS.map((d) => clone(d));
ex.exercise.reference.note = K.NOTE;
// the rear plates rest on the front of the shoulders in the rack (measured on the skinned mesh), so the holding arm's own
// deltoid and upper arm are left out of the rig-shape clearance while the dumbbells are racked (squat part of the loop)
const RACKED = (t) => t < 2.95 || t > 4.4;
const rep = K.scan(ex, { holds: [{ side: 'r' }, { side: 'l' }], planted: ['leg_r', 'leg_l'], skip: (s, id, t) => RACKED(t) && new RegExp(`^(deltoid|upperarm|biceps)_${s}$`).test(id) });
const Wt = L.fk(poses.stand, contacts), Wl = L.fk(poses.lock, contacts);
const elev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const set = (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(rep.kneeR[1])}° (hip ${Math.round(r.hipBottom)}°)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward at the bottom`);
set('Shoulder elevation', 'setup', `≈${Math.round(elev(Wt))}° in the rack (upper arm from vertical)`); set('Shoulder elevation', 'peak', `≈${Math.round(elev(Wl))}° at lockout, elbows ≈${Math.round(elbowAng(Wl))}° from straight`);
set('Press timing', 'setup', 'Dumbbells racked through the squat'); set('Press timing', 'peak', 'Hands leave the shoulders as the knees pass about 20° (0.15 s before full extension); lockout 0.4 s later');
set('Tempo', 'setup', 'Stand 0.6 s'); set('Tempo', 'peak', '1.45 s down, 0.15 s bottom, 1.1 s drive and press, 0.4 s lockout, 1.1 s back to the shoulders');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Thruster: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  press ${JSON.stringify(err)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} slide ${rep.slide}`);
K.gate('dumbbell-thruster', rep);
