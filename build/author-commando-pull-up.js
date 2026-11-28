// Commando Pull-up (GymVisual 11353, movement reference only; page not readable at authoring time): the pull-up bar is
// turned to run front to back over the head (prop rotY 90). Neutral grip with the hands close and staggered (right hand
// in front, left behind, grip points 14 cm apart along the bar, palms facing each other across it). From a dead hang set
// the shoulder blades, then pull up and bring the head past the right side of the bar, the chest turning a little toward
// it, until the chin is above the bar; lower to the centre hang; repeat with the head to the left. Legs hang with a slight
// knee bend. Both sides in one loop (authored bilateral, alternating). Hands planted on the bar (b6-15.js hang): each key
// is solved for the root height that gives the elbow angle of the arm on the near side of the bar, after moving the body
// sideways until the head and trunk clear the bar.
const L = require('./lib');
const { V } = L;
const H = require('./families/hips');
const B = require('./families/b6-15');
const meta = require('./meta/commando-pull-up.json');

const GX = 7;
const Hh = B.hang({ barH: 212, alongX: true, grip: { r: [GX, 0], l: [-GX, 0] }, rot: B.GRIPS.neutral(0), pole: { r: [0.2, -0.2, 1], l: [0.2, -0.2, -1] }, plane: [30, 60], x0: 0 });
const KEY = {
  hang: { side: 'both', flex: 12, sc: { protract: 4, elevate: 24 }, pitch: 0, spine: [0, 0, 0], neck: [0, 0], legs: B.legs(4, 16, -28), x: 0 },
  scap: { side: 'both', flex: 14, sc: { protract: 0, elevate: 8 }, pitch: 1, spine: [-1, -2, -2], neck: [-2, -2], legs: B.legs(6, 18, -28), x: 0 },
};
// head to the right: the left arm (near the bar) sets the height, the body shifts +z and turns toward the right; mirror
const STEPS = [['1', 60, 3, -8, { protract: -6, elevate: 2 }, B.legs(10, 22, -28)], ['2', 105, 9, -14, { protract: -12, elevate: -2 }, B.legs(14, 26, -28)], ['3', 128, 15, -20, { protract: -13, elevate: -4 }, B.legs(15, 27, -28)], ['t', 150, 17, -25, { protract: -14, elevate: -6 }, B.legs(16, 28, -28)]];
for (const s of ['r', 'l']) {
  const sg = s === 'r' ? 1 : -1;   // head to the right (+z) or the left
  // the right hand is the front one: for the head-left side the body sits a few cm back (x) under it, turned a little less
  const LX = { 1: 0, 2: -2, 3: -3, t: -4 }, LYAW = { t: 20 }, LP = { t: 2 };
  for (const [n, f, z, yaw, sc, lg] of STEPS) KEY[`${s}${n}`] = { side: sg > 0 ? 'l' : 'r', flex: f, x: sg > 0 ? 0 : LX[n], z: sg * z, yaw: sg > 0 ? yaw : LYAW[n] ?? -yaw, sc, pitch: sg > 0 ? 1 : LP[n] ?? 1, spine: [-2, -3, -4], neck: [-3, -3], neckRot: [sg * -4, sg * -6], legs: lg, clear: { dir: [0, sg * 0.5], min: 4 } };
}
const poses = {}; for (const [n, k] of Object.entries(KEY)) poses[n] = Hh.solveKey(k);
const keyframes = [['hang', 0], ['hang', 0.8], ['scap', 1.1], ['r1', 1.55], ['r2', 1.9], ['r3', 2.15], ['rt', 2.4], ['rt', 2.8], ['r3', 3.05], ['r2', 3.35], ['r1', 3.95], ['scap', 4.4], ['hang', 4.6], ['hang', 4.85], ['scap', 5.1], ['l1', 5.55], ['l2', 5.9], ['l3', 6.15], ['lt', 6.4], ['lt', 6.8], ['l3', 7.05], ['l2', 7.35], ['l1', 7.95], ['scap', 8.4], ['hang', 8.6], ['hang', 9.2]].map(([pose, t]) => ({ t, pose }));
const ex = H.module_(meta, Hh.contacts, poses, keyframes);
ex.props = [Hh.PB.prop];
Hh.pin(ex);

const rep = B.hangCheck(ex, Hh);
const Wh = L.fk(poses.hang, Hh.contacts), Wt = L.fk(poses.rt, Hh.contacts), Wl = L.fk(poses.lt, Hh.contacts);
const chin = H.bottomOf(Wt, 'jaw') - Hh.barH, chinL = H.bottomOf(Wl, 'jaw') - Hh.barH, shift = Wt.head_c1.p[2] - Wh.head_c1.p[2];
const set = H.setKin(ex);
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(Wh, 'r'))}° / ${Math.round(B.elbowOf(Wh, 'l'))}° in the dead hang`); set('Elbow flexion', 'peak', `Head to the right: left elbow ≈${Math.round(B.elbowOf(Wt, 'l'))}°, right ≈${Math.round(B.elbowOf(Wt, 'r'))}°`);
set('Grip', 'setup', `Neutral, right hand in front, grip points ${2 * GX} cm apart along the bar`); set('Grip', 'peak', 'Unchanged (hands planted on the bar)');
set('Body shift', 'setup', 'Head under the bar in the hang'); set('Body shift', 'peak', `Head ≈${Math.round(shift)} cm to the side of the bar, chest turned ${Math.abs(STEPS[2][3])}° toward it`);
set('Chin height', 'setup', `Chin ${Math.round(-(H.bottomOf(Wh, 'jaw') - Hh.barH))} cm below the bar in the hang`); set('Chin height', 'peak', `Chin ${chin.toFixed(1)} cm (right side) and ${chinL.toFixed(1)} cm (left side) above the bar`);
set('Tempo', 'setup', 'Hang 0.8 s, set 0.3 s'); set('Tempo', 'peak', 'About 1.3 s up, 0.4 s hold, 1.8 s down each side');
const sl = Object.fromEntries(Object.entries(poses).map(([n, p]) => [n, Hh.slack(p)]));
console.log(`Commando Pull-up: wrote ${L.write(ex)}\n  chin ${chin.toFixed(1)} / ${chinL.toFixed(1)} shift ${shift.toFixed(1)} roots ${JSON.stringify(Object.fromEntries(Object.entries(poses).map(([n, p]) => [n, p.root.pos.map((v) => +v.toFixed(1))])))}\n  slack ${JSON.stringify(sl)}\n  ${JSON.stringify(rep)}`);
B.hangGate(rep);
if (chin < 0 || chinL < 0) { console.error('FAIL: chin does not clear the bar'); process.exitCode = 1; }
