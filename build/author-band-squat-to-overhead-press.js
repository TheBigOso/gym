// Band Squat to Overhead Press (GymVisual, Band Squat to Overhead Press; movement reference only): standing on the middle
// of a band, feet about shoulder width, toes slightly out (planted leg contacts); one band end in each hand at the front of
// the shoulders, palms in, elbows forward (one band per hand, each strand anchored under the ball of its own foot:
// anchorJoint toe_r / toe_l). Front squat to just below parallel, stand all the way up, then press both hands straight
// overhead to lockout (palms in) and bring them back to the shoulders. Unlike a thruster the press starts after the legs
// have straightened. The squat is the front squat's solve (build/families/squat.js, as the dumbbell thruster); the hands
// sit a little wider than the dumbbell rack so the strands run outside the knees. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const F = require('./families/squat');
const K = require('./families/b4-squats2');
const C = require('./families/eq-cable');
const B = require('./families/b5-bandpull');
const meta = require('./meta/band-squat-to-overhead-press.json');

const STANCE = +(process.env.ST ?? 12), TOE = +(process.env.TOE ?? 10);
const WX = +(process.env.WX ?? 12), LZ = +(process.env.LZ ?? 10); // extra lateral offset of the hands (cm) over the dumbbell rack
const armsFn = (p) => { const q = K.rackArms(p, { level: 1, wrist: [12, -4, 1.5 + WX], elbow: [18, -24, 6 + WX] }); delete q.__err; return q; };
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 115, pitchBottom: -31, backBottom: -16, kneeOut: 1.5,
  spine: { l5: -4, t12: -3, t6: 1 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5, rise20: 0.2 },
  keyframes: [],
}, meta);
// Press keys (right arm solved, mirrored), from the standing pose: hands leave the shoulders at chin height with the
// elbows forward, pass the forehead with the elbows moving out, and lock out over the shoulders with the palms in.
const PRESS = [
  { n: 'p1', legs: 'stand', wrist: [11, 10, 1 + WX], elbowHint: [1, -0.6, 0.5], sc: { protract: 6, elevate: 10 } },
  { n: 'p2', legs: 'stand', wrist: [6, 32, 2 + WX], elbowHint: [0.6, -0.3, 1], sc: { protract: 5, elevate: 14 } },
  { n: 'lock', legs: 'stand', wrist: [1, r1(L.reach(5) - 0.3 - LZ * 0.1), -2 + LZ], elbowHint: [0.3, 0, 1], sc: { protract: 4, elevate: 18 } },
];
let g = K.chOf(poses.stand);
const err = {};
for (const k of PRESS) { const q = K.pressArm(poses[k.legs], k, g); err[k.n] = q.__err; g = K.chOf(q); delete q.__err; poses[k.n] = K.mirrorArms(q); delete poses[k.n].__err; }
poses.lockHold = clone(poses.lock); poses.lockHold.ch.elbow_r.flex = poses.lockHold.ch.elbow_l.flex = r1(poses.lock.ch.elbow_r.flex + 2);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
ex.keyframes = [{ t: 0, pose: 'stand' }, { t: ph.lower.start, pose: 'stand' }, { t: 0.95, pose: 'l25' }, { t: 1.3, pose: 'l50' }, { t: 1.7, pose: 'l75' }, { t: ph.bottom.start, pose: 'bottom' },
  { t: 2.12, pose: 'bottomSettle' }, { t: ph.bottom.end, pose: 'bottom' }, { t: 2.5, pose: 'rise50' }, { t: 2.75, pose: 'rise20' }, { t: ph.rise.end, pose: 'stand' },
  { t: 3.3, pose: 'p1' }, { t: 3.55, pose: 'p2' }, { t: ph.press.end, pose: 'lock' }, { t: ph.lockout.end, pose: 'lockHold' }, { t: 4.55, pose: 'p2' }, { t: 4.9, pose: 'p1' }, { t: ph.return.end, pose: 'stand' }, { t: D, pose: 'stand' }];
ex.props = B.feetBands();
ex.exercise.reference.note = K.NOTE;
// strands clear of the body; skipped: the feet (on the band), the hands, and the arms, along which the strand runs in the
// press as a real band does (the viewer draws straight strands, so they would cut a few cm into the inside of the upper arm
// as the hands pass the head; legs, trunk and head are checked)
const SKIP = new RegExp(process.env.SKIP ?? '^(hand|thumb|forearm|foot|upperarm|biceps|deltoid)_');
const rep = B.scan(ex, { strands: B.feetStrands, skip: SKIP });
B.gate('band-squat-to-overhead-press', rep, { minLine: 0.3 });
C.limits(poses);
const Wt = L.fk(poses.stand, contacts), Wl = L.fk(poses.lock, contacts);
const elev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const set = (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (!k) throw new Error(prefix); k[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(rep.kneeR[1])}° (hip ${Math.round(r.hipBottom)}°)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward at the bottom`);
set('Shoulder elevation', 'setup', `≈${Math.round(elev(Wt))}° with the hands at the shoulders (upper arm from vertical)`); set('Shoulder elevation', 'peak', `≈${Math.round(elev(Wl))}° at lockout, elbows ≈${Math.round(elbowAng(Wl))}° from straight`);
set('Press timing', 'setup', 'Hands stay at the shoulders through the squat'); set('Press timing', 'peak', 'Press starts once standing tall; lockout 0.7 s later');
set('Band', 'setup', `Under the balls of the feet; strand ${rep.strand[0]} cm at the bottom of the squat`); set('Band', 'peak', `Strand ${rep.strand[1]} cm at lockout (most stretch, most tension)`);
set('Tempo', 'setup', 'Stand 0.6 s'); set('Tempo', 'peak', '1.45 s down, 0.15 s bottom, 0.8 s up, 0.7 s press, 0.4 s lockout, 1 s back to the shoulders');
delete r.Wb; delete r.Wt;
console.log(`Band Squat to Overhead Press: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  press ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
