// Scapula Pull-up (GymVisual 12460, movement reference only; page not readable at authoring time): dead hang from a
// free-standing pull-up bar, overhand, hands a little wider than the shoulders. With the elbows straight, pull the shoulder
// blades down and slightly together so the body rises a few cm, hold, then let the shoulders rise slowly back to the full
// hang. Legs hang with a slight knee bend. Bilateral. Hands planted on the bar (b6-15.js hang, built on author-pull-up.js);
// every key solved for the root height that keeps the elbows at the asked (near straight) angle.
const L = require('./lib');
const { V } = L;
const H = require('./families/hips');
const B = require('./families/b6-15');
const meta = require('./meta/scapula-pull-up.json');

const GZ = 26, TILT = 6;
const Hh = B.hang({ barH: 212, grip: { r: [0, GZ], l: [0, -GZ] }, rot: B.GRIPS.over(TILT), pole: { r: [0.35, -0.25, 1], l: [0.35, -0.25, -1] }, plane: [20] });
const KEY = {
  hang: { flex: 8, sc: { protract: 4, elevate: 26 }, pitch: 0, spine: [0, 0, 0], neck: [0, 0], legs: B.legs(4, 16, -28) },
  mid: { flex: 9, sc: { protract: -2, elevate: 10 }, pitch: 1.5, spine: [-1, -1, -2], neck: [-1, -1], legs: B.legs(5, 17, -28) },
  top: { flex: 10, sc: { protract: -8, elevate: -6 }, pitch: 3, spine: [-1, -2, -3], neck: [-2, -2], legs: B.legs(6, 18, -28) },
};
const poses = {}; for (const [n, k] of Object.entries(KEY)) poses[n] = Hh.solveKey(k);
const keyframes = [['hang', 0], ['hang', 0.8], ['mid', 1.2], ['top', 1.6], ['top', 2.2], ['mid', 2.8], ['hang', 3.4], ['hang', 4.4]].map(([pose, t]) => ({ t, pose }));
const ex = H.module_(meta, Hh.contacts, poses, keyframes);
ex.props = [Hh.PB.prop];
Hh.pin(ex);

const rep = B.hangCheck(ex, Hh);
const Wh = L.fk(poses.hang, Hh.contacts), Wt = L.fk(poses.top, Hh.contacts);
const rise = Wt.pelvis.p[1] - Wh.pelvis.p[1], shW = V.len(V.sub(Wh.shoulder_r.p, Wh.shoulder_l.p));
const set = H.setKin(ex);
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(Wh))}° in the dead hang`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(Wt))}° at the top (arms stay straight)`);
set('Shoulder blades', 'setup', `Elevated (elevate ${KEY.hang.sc.elevate}) in the hang`); set('Shoulder blades', 'peak', `Depressed and slightly retracted (elevate ${KEY.top.sc.elevate}, protract ${KEY.top.sc.protract})`);
set('Body rise', 'setup', 'Dead hang'); set('Body rise', 'peak', `Pelvis rises ≈${rise.toFixed(1)} cm`);
set('Grip width', 'setup', `Overhand, grip points ${2 * GZ} cm apart (shoulder joints ${Math.round(shW)} cm)`); set('Grip width', 'peak', 'Unchanged (hands planted on the bar)');
set('Tempo', 'setup', 'Hang 0.8 s'); set('Tempo', 'peak', '0.8 s down, 0.6 s hold, 1.2 s up, 1 s hang');
console.log(`Scapula Pull-up: wrote ${L.write(ex)}\n  rise ${rise.toFixed(1)} cm, slack ${JSON.stringify(Hh.slack(poses.top))}\n  ${JSON.stringify(rep)}`);
B.hangGate(rep);
if (rise < 2) { console.error('FAIL: body barely rises'); process.exitCode = 1; }
