// Band Back Extension (GymVisual 2366, movement reference only; the page could not be read, so the movement follows the
// name and standard coaching: a standing back extension against a band under the feet). Feet hip width standing on the
// band, knees soft (planted contacts). The band ends are held at the front of the shoulders, elbows down: one strand rises
// from under each foot to the hand on that side (two one-hand bands anchored under the balls of the feet). Push the hips
// back and tip the trunk forward with a long back (a little rounding near the bottom), then extend back up against the
// band to stand tall. Hinge balanced over the mid-foot with author-dumbbell-good-morning.js's solve (b3-back hinge,
// lunge family); the hands stay fixed at the shoulders (upper-trunk frame). Bilateral.
const L = require('./lib');
const { V, Q, r1 } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const HG = require('./families/b4-hinges');
const H = require('./families/hips');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const B5 = require('./families/b5-bandcore');
const meta = require('./meta/band-back-extension.json');

const F = makeFamily({ toe: 6, half: 11 });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const PITCH = -66, KNEE_TOP = 5, KNEE = 18;
// hands at the front of the shoulders, palms forward and up, elbows down in front of the ribs (upper-trunk frame)
const spec = (W) => {
  const fr = W.spine_t6.q, S = W.shoulder_r.p, at = (v) => V.add(S, Q.rot(fr, v));
  return { grip: at([17, -5, -2]), axis: Q.rot(fr, [0, 0, 1]), palm: Q.rot(fr, [0.4, 0.9, 0]), wPalm: 1.2, elbow: at([11, -22, 0]), wElbow: 0.8,
    guess: { plane: 70, elev: 45, axial: 60, pron: 0, flex: 140 } };
};
const arms = (p) => { p.ch.sc_r = { protract: 8, elevate: 2 }; p.ch.sc_l = { protract: 8, elevate: 2 }; const q = B5.armSide(p, F.contacts, 'r', spec); delete q.__err; return C.mirrorArm(q); };
function at(f) {
  const g = f * f * (3 - 2 * f) * 0.35 + f * 0.65, sp = Math.max(0, (f - 0.6) / 0.4);
  return B.hinge(F, { pitch: r1(PITCH * g), knee: r1(KNEE_TOP + (KNEE - KNEE_TOP) * Math.min(1, f / 0.5)), feet, spine: { l5: r1(-2 * g + 4 * sp), t12: r1(5 * sp), t6: r1(1 * g + 4 * sp) }, kg: 0.01, midfoot: 5, arms }).pose;
}
const T = HG.phaseT(meta), [T0, T1] = T.lower, [T2, T3] = T.rise, D = meta.timeline.duration;
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`h${i}`] = at(f); });
poses.settle = at(0.985);
const keyframes = [{ t: 0, pose: 'h0' }, ...HG.easedKeys('h', FS, T0, T1), { t: T1 + 0.15, pose: 'settle' }, { t: T2, pose: `h${N}` }, ...HG.easedKeys('h', FS, T2, T3, true), { t: D, pose: 'h0' }];

// a band strand from under the ball of each foot (fixed points: the feet are planted)
const Wt = F.fk(poses.h0), ball = (s) => [r1(Wt[`toe_${s}`].p[0] - 1), 0.8, r1(Wt[`toe_${s}`].p[2])];
const ex = HG.makeEx(meta, { poses, keyframes, props: [B5.band('band_r', { joint: 'wrist_r' }, ball('r')), B5.band('band_l', { joint: 'wrist_l' }, ball('l'))], contacts: F.contacts });
const rep = B5.scan(ex, { still: meta.checks.stillJoints, skip: /^(hand|thumb|forearm|foot)_/, measure: B5.MEASURE.hipFlexion });
B5.gate('band-back-extension', rep, { minBand: 0.3, range: [meta.checks.measure.min, meta.checks.measure.max] });

const Wb = F.fk(poses[`h${N}`]), pb = poses[`h${N}`].ch;
HG.setKin(ex, 'Hip flexion', 'setup', B5.deg(poses.h0.ch.hip_r.flex)); HG.setKin(ex, 'Hip flexion', 'peak', `${B5.deg(pb.hip_r.flex)} (joint channel), trunk ${B5.deg(90 - B.trunkLean(Wb))} above horizontal`);
HG.setKin(ex, 'Knee flexion', 'setup', B5.deg(B.kneeOf(Wt, 'r'))); HG.setKin(ex, 'Knee flexion', 'peak', B5.deg(B.kneeOf(Wb, 'r')));
HG.setKin(ex, 'Lumbar motion', 'setup', 'Neutral'); HG.setKin(ex, 'Lumbar motion', 'peak', `Spine channels ${pb.spine_l5.flex}°/${pb.spine_t12.flex}°/${pb.spine_t6.flex}° (L5/T12/T6): slight rounding at the bottom`);
HG.setKin(ex, 'Hands', 'setup', `At the front of the shoulders, ${Math.round(EQ.gripPoint(Wt, 'r').p[1])} cm high; a band strand rises from under the ball of each foot`); HG.setKin(ex, 'Hands', 'peak', 'Unchanged relative to the shoulders');
HG.setKin(ex, 'Tempo', 'setup', `Stand ${T0} s`); HG.setKin(ex, 'Tempo', 'peak', `${r1(T1 - T0)} s down, ${r1(T2 - T1)} s pause, ${r1(T3 - T2)} s up, ${r1(D - T3)} s reset`);
console.log(`Band Back Extension: wrote ${L.write(ex)}\n  hip ${poses.h0.ch.hip_r.flex}->${pb.hip_r.flex}\n  ${JSON.stringify(rep)}`);
