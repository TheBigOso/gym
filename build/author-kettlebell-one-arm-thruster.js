// Kettlebell One Arm Thruster (GymVisual 21112, movement reference only): one kettlebell racked at the right shoulder (fist
// in front of the shoulder, forearm vertical, elbow down and in, palm facing in), the free left arm out to the side for
// balance. Front squat down until the hip crease is just below the knees, then one continuous drive up in which the leg
// drive pops the bell off the shoulder and the arm presses it straight up to lockout overhead (palm forward-in); the bell
// comes back to the rack before the next squat. Feet planted (constant IK targets). Authored right (the player mirrors).
// The squat is the front squat's solve (build/families/squat.js) with the b4-squats2 rack arm on a kettlebell rack; the
// press keys are solved top-down (lockout and mid-press first, then the pop off the shoulder).
// Note: the player draws a one-hand kettlebell past the knuckles, so with a vertical forearm the bell shows above the fist
// (bottoms-up look) instead of resting on the back of the forearm; see the batch report (needs a 'rack' grip).
const L = require('./lib');
const { V, r1, clone } = L;
const F = require('./families/squat');
const K = require('./families/b4-squats2');
const X = require('./families/b6-12');
const meta = require('./meta/kettlebell-one-arm-thruster.json');

const STANCE = 19, TOE = 15;
const KB_RACK = { wrist: [13, -9, 3], elbow: [7, -27, 4], palm: [0.15, 0, -1], wristFlex: -8, wristDev: 0, sc: { protract: 6, elevate: 6 }, level: 1 };
// free left arm: out to the side and a little forward, elbow soft; solved once on the standing pose, then held (the
// channels ride with the trunk)
let FREE = null;
const freeArm = (p) => {
  if (!FREE) { const W = L.fk(p), SL = W.shoulder_l.p, dir = V.norm([0.35, -0.75, -0.6]); const q = X.leftTo(p, V.add(SL, V.scale(dir, L.reach(14))), [40, 50, 0], { wrist: { pron: 0, flex: 0, dev: 0 } }); FREE = {}; for (const j of ['shoulder_l', 'elbow_l', 'wrist_l', 'sc_l']) FREE[j] = clone(q.ch[j]); }
  const q = clone(p); Object.assign(q.ch, clone(FREE)); return q;
};
const armsFn = (p) => { const q = K.rackArms(p, KB_RACK); delete q.__err; return freeArm(q); };
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 118, pitchBottom: -31, backBottom: -16, kneeOut: 1.5,
  spine: { l5: -4, t12: -3, t6: 1 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5, rise20: 0.2, popLegs: 0.04 },
  keyframes: [],
}, meta);
const PRESS = [
  { n: 'p1', legs: 'popLegs', wrist: [14, 12, 9], elbowHint: [1, -0.6, 0.6], sc: { protract: 6, elevate: 10 }, palm: [0.3, 0, -1] },
  { n: 'p2', legs: 'stand', wrist: [6, 34, 5], elbowHint: [0.5, -0.3, 1], sc: { protract: 5, elevate: 14 }, palm: [0.5, 0, -1] },
  { n: 'lock', legs: 'stand', wrist: [1, r1(L.reach(5) - 0.3), -1], elbowHint: [0.3, 0, 1], sc: { protract: 4, elevate: 18 }, palm: [0.6, 0, -1] },
];
const err = {}, solved = {};
let g = K.chOf(poses.stand);
for (const k of [PRESS[1], PRESS[2]]) { const q = K.pressArm(poses[k.legs], k, g); err[k.n] = q.__err; g = K.chOf(q); delete q.__err; solved[k.n] = q; }
{ const k = PRESS[0], q = K.pressArm(poses[k.legs], k, K.chOf(solved.p2)); err[k.n] = q.__err; delete q.__err; solved.p1 = q; }
for (const n of ['p1', 'p2', 'lock']) poses[n] = freeArm(solved[n]);
poses.lockHold = clone(poses.lock); poses.lockHold.ch.elbow_r.flex = r1(poses.lock.ch.elbow_r.flex + 2);
delete poses.popLegs;
ex.keyframes = [{ t: 0, pose: 'stand' }, { t: 0.6, pose: 'stand' }, { t: 0.95, pose: 'l25' }, { t: 1.3, pose: 'l50' }, { t: 1.7, pose: 'l75' }, { t: 2.05, pose: 'bottom' },
  { t: 2.12, pose: 'bottomSettle' }, { t: 2.2, pose: 'bottom' }, { t: 2.5, pose: 'rise50' }, { t: 2.75, pose: 'rise20' }, { t: 2.92, pose: 'p1' }, { t: 3.1, pose: 'p2' }, { t: 3.3, pose: 'lock' },
  { t: 3.7, pose: 'lockHold' }, { t: 4.1, pose: 'p2' }, { t: 4.45, pose: 'p1' }, { t: 4.8, pose: 'stand' }, { t: 6.0, pose: 'stand' }];
ex.props = [X.kbProp('r')];
ex.exercise.reference.note = X.NOTE;
const rep = X.scan(ex, { planted: ['leg_r', 'leg_l'], kb: ['r'] });
const Wt = L.fk(poses.stand, contacts), Wl = L.fk(poses.lock, contacts);
const elev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]);
const set = (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(rep.kneeR[1])}° (hip ${Math.round(r.hipBottom)}°)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward at the bottom`);
set('Shoulder elevation', 'setup', `≈${Math.round(elev(Wt))}° in the rack (upper arm from vertical)`); set('Shoulder elevation', 'peak', `≈${Math.round(elev(Wl))}° at lockout, elbow ≈${Math.round(X.elbowAng(Wl))}° from straight`);
set('Free arm', 'setup', `Left arm out to the side, ≈${Math.round(V.angle(V.sub(Wt.elbow_l.p, Wt.shoulder_l.p), [0, -1, 0]))}° from the body`); set('Free arm', 'peak', 'Held for balance');
set('Press timing', 'setup', 'Bell racked through the squat'); set('Press timing', 'peak', 'Hand leaves the shoulder as the knees pass about 20° (0.15 s before full extension); lockout 0.4 s later');
set('Tempo', 'setup', 'Stand 0.6 s'); set('Tempo', 'peak', '1.45 s down, 0.15 s bottom, 1.1 s drive and press, 0.4 s lockout, 1.1 s back to the shoulder');
delete r.Wb; delete r.Wt;
console.log(`Kettlebell One Arm Thruster: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  press ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
X.gate('kettlebell-one-arm-thruster', rep, poses, { minBell: 0 });
