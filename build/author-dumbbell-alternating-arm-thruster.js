// Dumbbell Alternating Arm Thruster (GymVisual "Dumbbell Alternating Arm Thruster", movement reference only): a front squat
// with a dumbbell racked on each shoulder (neutral grip), then one continuous drive up in which the leg drive pops ONE
// dumbbell off its shoulder and that arm presses it straight up to lockout (palm in) while the other dumbbell stays racked;
// the pressed dumbbell comes back to the shoulder before the next squat, and the next rep presses the other arm. Two reps
// per loop (right, then left: the left rep's keys are exact mirrors of the right rep's). Feet planted (constant IK
// targets). Bilateral. Built on the dumbbell thruster (squat.js front squat solve, b4-squats2 rackArms / pressArm).
const L = require('./lib');
const { V, r1, clone } = L;
const F = require('./families/squat');
const S = require('./families/b3-shoulders');
const K = require('./families/b4-squats2');
const G = require('./families/b6-03');
const meta = require('./meta/dumbbell-alternating-arm-thruster.json');

const STANCE = 19.5, TOE = 15;
const armsFn = (p) => { const q = K.rackArms(p, { level: 1 }); delete q.__err; return q; };
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 118, pitchBottom: -31, backBottom: -16, kneeOut: 1.5,
  spine: { l5: -4, t12: -3, t6: 1 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5, rise20: 0.2, popLegs: 0.04 },
  keyframes: [],
}, meta);
// Press keys, right arm only (the left arm keeps the racked channels of the same leg pose). One-arm press: the trunk leans a
// touch toward the racked side would be natural, but the trunk is kept square (both shoulders loaded)
const PRESS = [
  { n: 'p1', legs: 'popLegs', wrist: [11, 10, 1], elbowHint: [1, -0.6, 0.5], sc: { protract: 6, elevate: 10 } },
  { n: 'p2', legs: 'stand', wrist: [6, 32, 2], elbowHint: [0.6, -0.3, 1], sc: { protract: 5, elevate: 14 } },
  { n: 'lock', legs: 'stand', wrist: [1, r1(L.reach(5) - 0.3), -2], elbowHint: [0.3, 0, 1], sc: { protract: 4, elevate: 18 } },
];
let g = K.chOf(poses.stand);
const err = {};
for (const k of PRESS) {
  const q = K.pressArm(poses[k.legs], k, g); err[k.n] = q.__err; g = K.chOf(q); delete q.__err;
  for (const j of ['sc_l', 'shoulder_l', 'elbow_l', 'wrist_l']) q.ch[j] = clone(poses[k.legs].ch[j]);   // left dumbbell stays racked
  poses[k.n] = q;
}
poses.lockHold = clone(poses.lock); poses.lockHold.ch.elbow_r.flex = r1(poses.lock.ch.elbow_r.flex + 2);
delete poses.popLegs;
// left rep: mirrors of the press keys (the squat keys are symmetric)
for (const n of ['p1', 'p2', 'lock', 'lockHold']) poses[`${n}L`] = K.mirrorPose(poses[n]);
const REP = [[0.6, 'stand'], [0.95, 'l25'], [1.3, 'l50'], [1.7, 'l75'], [2.05, 'bottom'], [2.12, 'bottomSettle'], [2.2, 'bottom'], [2.5, 'rise50'], [2.75, 'rise20'],
  [2.92, 'p1'], [3.1, 'p2'], [3.3, 'lock'], [3.7, 'lockHold'], [4.1, 'p2'], [4.45, 'p1'], [4.8, 'stand']];
const SHIFT = 4.2, D = meta.timeline.duration;
ex.keyframes = [{ t: 0, pose: 'stand' }, ...REP.map(([t, p]) => ({ t, pose: p })),
  ...REP.slice(1).map(([t, p]) => ({ t: +(t + SHIFT).toFixed(3), pose: /^(p1|p2|lock|lockHold)$/.test(p) ? `${p}L` : p })), { t: D, pose: 'stand' }];
ex.props = S.DUMBBELLS.map((d) => clone(d));
ex.exercise.reference.note = G.NOTE;
// a racked dumbbell rests on its own shoulder (measured on the skinned mesh for the thruster): the holding arm's deltoid and
// upper arm are left out while that dumbbell is racked
const pressR = (t) => t > 2.95 && t < 4.4, pressL = (t) => t > 2.95 + SHIFT && t < 4.4 + SHIFT;
const rep = K.scan(ex, { holds: [{ side: 'r' }, { side: 'l' }], planted: ['leg_r', 'leg_l'], skip: (s, id, t) => !(s === 'r' ? pressR(t) : pressL(t)) && new RegExp(`^(deltoid|upperarm|biceps)_${s}$`).test(id) });
const Wt = L.fk(poses.stand, contacts), Wl = L.fk(poses.lock, contacts);
const elev = (W, s) => V.angle(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p), [0, -1, 0]);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const lim = G.limits(ex), set = G.setKin(ex);
set('Stance width', 'setup', `${2 * STANCE} cm, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(rep.kneeR[1])}° (hip ${Math.round(r.hipBottom)}°)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward at the bottom`);
set('Shoulder elevation', 'setup', `≈${Math.round(elev(Wt, 'r'))}° in the rack (upper arm from vertical)`); set('Shoulder elevation', 'peak', `≈${Math.round(elev(Wl, 'r'))}° at lockout on the pressing side, elbow ≈${Math.round(elbowAng(Wl))}° from straight; the other arm stays racked (≈${Math.round(elev(Wl, 'l'))}°)`);
set('Press timing', 'setup', 'Both dumbbells racked through the squat'); set('Press timing', 'peak', 'One hand leaves its shoulder as the knees pass about 20°; lockout 0.4 s later; arms alternate each rep');
set('Tempo', 'setup', 'Stand 0.6 s'); set('Tempo', 'peak', 'Per rep: 1.45 s down, 0.15 s bottom, 1.1 s drive and press, 0.4 s lockout, 1.1 s back to the shoulder');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Alternating Arm Thruster: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  press ${JSON.stringify(err)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} slide ${rep.slide} limits ${JSON.stringify(lim)}`);
K.gate('dumbbell-alternating-arm-thruster', rep);
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
G.gateMeasure('dumbbell-alternating-arm-thruster', ex, Math.round(rep.kneeR[1]));
