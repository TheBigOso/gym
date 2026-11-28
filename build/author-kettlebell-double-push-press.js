// Kettlebell Double Push Press (GymVisual 13775, movement reference only): standing with the feet about hip to shoulder
// width, a kettlebell in each hand racked at the shoulders (fists in front of the shoulders, forearms vertical, elbows down
// and in, palms facing in). A short, quick dip of the knees with the trunk upright, then an explosive drive of the legs
// that launches the bells, and the arms finish the press to lockout overhead (palms forward-in, biceps by the ears); the
// bells come back down to the rack under control. Feet planted (constant IK targets). Bilateral.
// The dip is the squat family's solve (build/families/squat.js) with a shallow knee bend; the rack and press arms are the
// b4-squats2 armSolve on a kettlebell rack (wrist straight); the press keys reuse the standing legs.
// Note: the player draws a one-hand kettlebell past the knuckles, so with a vertical forearm the bell shows above the fist
// (bottoms-up look) instead of resting on the back of the forearm; see the batch report (needs a 'rack' grip).
const L = require('./lib');
const { V, r1, clone } = L;
const F = require('./families/squat');
const K = require('./families/b4-squats2');
const X = require('./families/b6-12');
const meta = require('./meta/kettlebell-double-push-press.json');

const STANCE = 15, TOE = 10, DIP = +(process.env.DIP ?? 26);
// kettlebell rack (right arm, trunk frame relative to the shoulder: [fwd, up, out]): fist in front of the shoulder at about
// collarbone height, elbow down against the side, palm facing in, wrist straight
const KB_RACK = { wrist: [+(process.env.RW ?? 13), +(process.env.RY ?? -9), +(process.env.RO ?? 3)], elbow: [7, -27, 4], palm: [0.15, 0, -1], wristFlex: -8, wristDev: 0, sc: { protract: 6, elevate: 6 }, level: 1 };
const armsFn = (p) => { const q = K.rackArms(p, KB_RACK); delete q.__err; return q; };
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 4, kneeBottom: DIP, pitchBottom: -2, backBottom: -1, kneeOut: 0.5,
  spine: { l5: -1, t12: -1, t6: 0 }, arms: 'none', armsFn, lead: 1.0, settle: 0,
  depths: { stand: 0, dip50: 0.5, bottom: 1, drive50: 0.5, drive: 0.04 },
  keyframes: [],
}, meta);
// Press keys (right arm solved, mirrored): the bells leave the shoulders at chin height as the legs finish the drive, pass
// the forehead with the elbows moving out, and lock out straight over the shoulders with the palms facing forward-in.
const PRESS = [
  { n: 'p1', legs: 'drive', wrist: [14, +(process.env.P1Y ?? 12), +(process.env.P1O ?? 9)], elbowHint: [1, -0.6, 0.6], sc: { protract: 6, elevate: 10 }, palm: [0.3, 0, -1] },
  { n: 'p2', legs: 'stand', wrist: [6, 34, +(process.env.P2O ?? 5)], elbowHint: [0.5, -0.3, 1], sc: { protract: 5, elevate: 14 }, palm: [0.5, 0, -1] },
  { n: 'lock', legs: 'stand', wrist: [1, r1(L.reach(5) - 0.3), -1], elbowHint: [0.3, 0, 1], sc: { protract: 4, elevate: 18 }, palm: [0.6, 0, -1] },
];
// solved top-down (p2, lock from the rack guess, then p1 from p2's channels): the rack's folded arm is a poor seed for p1
let g = K.chOf(poses.stand);
const err = {}, solved = {};
for (const k of [PRESS[1], PRESS[2]]) { const q = K.pressArm(poses[k.legs], k, g); err[k.n] = q.__err; g = K.chOf(q); delete q.__err; solved[k.n] = q; }
{ const k = PRESS[0], q = K.pressArm(poses[k.legs], k, K.chOf(solved.p2)); err[k.n] = q.__err; delete q.__err; solved.p1 = q; }
for (const n of ['p1', 'p2', 'lock']) { poses[n] = K.mirrorArms(solved[n]); delete poses[n].__err; }
poses.lockHold = clone(poses.lock); poses.lockHold.ch.elbow_r.flex = poses.lockHold.ch.elbow_l.flex = r1(poses.lock.ch.elbow_r.flex + 2);
poses.l2 = clone(poses.p2); poses.l1 = clone(poses.p1); poses.l1.root = clone(poses.stand.root); poses.l1.ik = clone(poses.stand.ik);
for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) poses.l1.ch[j] = clone(poses.stand.ch[j]);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
ex.keyframes = [{ t: 0, pose: 'stand' }, { t: ph.dip.start, pose: 'stand' }, { t: +((ph.dip.start + ph.dip.end) / 2).toFixed(3), pose: 'dip50' }, { t: ph.dip.end, pose: 'bottom' },
  { t: +(ph.drive.start + 0.12).toFixed(3), pose: 'drive50' }, { t: +(ph.drive.start + 0.24).toFixed(3), pose: 'p1' }, { t: +(ph.drive.start + 0.4).toFixed(3), pose: 'p2' }, { t: ph.drive.end, pose: 'lock' },
  { t: +((ph.lockout.start + ph.lockout.end) / 2).toFixed(3), pose: 'lockHold' }, { t: ph.lockout.end, pose: 'lock' }, { t: +(ph.lower.start + 0.45).toFixed(3), pose: 'l2' }, { t: +(ph.lower.start + 0.85).toFixed(3), pose: 'l1' },
  { t: ph.lower.end, pose: 'stand' }, { t: D, pose: 'stand' }];
delete poses.drive;
ex.props = [X.kbProp('r'), X.kbProp('l')];
ex.exercise.reference.note = X.NOTE;
const rep = X.scan(ex, { planted: ['leg_r', 'leg_l'], kb: ['r', 'l'] });
const Wt = L.fk(poses.stand, contacts), Wl = L.fk(poses.lock, contacts), Wd = L.fk(poses.bottom, contacts);
const elev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]);
const set = (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Dip', 'setup', `Knees ≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Dip', 'peak', `Knees ≈${Math.round(F.kneeOf(Wd, 'r'))}°, pelvis ${r1(Wt.pelvis.p[1] - Wd.pelvis.p[1])} cm lower, trunk ≈${Math.round(F.trunkLean(Wd))}° from vertical`);
set('Rack', 'setup', `Fists in front of the shoulders, elbows ≈${Math.round(X.elbowAng(Wt))}° bent, upper arms ≈${Math.round(elev(Wt))}° from vertical`); set('Rack', 'peak', 'Bells return here after each rep');
set('Shoulder elevation', 'setup', `≈${Math.round(elev(Wt))}° in the rack`); set('Shoulder elevation', 'peak', `≈${Math.round(elev(Wl))}° at lockout, elbows ≈${Math.round(X.elbowAng(Wl))}° from straight`);
set('Tempo', 'setup', `Rack ${ph.setup.end} s`); set('Tempo', 'peak', `${r1(ph.dip.end - ph.dip.start)} s dip, ${r1(ph.drive.end - ph.drive.start)} s drive and press, ${r1(ph.lockout.end - ph.lockout.start)} s lockout, ${r1(ph.lower.end - ph.lower.start)} s back to the rack`);
delete r.Wb; delete r.Wt;
console.log(`Kettlebell Double Push Press: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  press ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
X.gate('kettlebell-double-push-press', rep, poses, { minBell: 0 });
