// Close Grip Chin-Up (GymVisual 5218, movement reference only; page not readable at authoring time): underhand (supinated)
// grip with the hands close together (grip points 16 cm apart, well inside the shoulders) on a free-standing pull-up bar.
// From a dead hang set the shoulder blades down, pull with the elbows travelling down and in front of the trunk until the
// chin clears the bar, hold briefly, lower under control to a full hang. Legs hang with a slight knee bend. Bilateral.
// Hands planted on the bar (b6-15.js hang, built on author-chin-up.js); every key solved for the root height that gives
// the asked elbow angle and moved back until the face and chest clear the bar.
const L = require('./lib');
const { V } = L;
const H = require('./families/hips');
const B = require('./families/b6-15');
const meta = require('./meta/close-grip-chin-up.json');

const GZ = 8, TILT = -6;   // fingers lean in a little: the forearms converge toward the close grip
const Hh = B.hang({ barH: 212, grip: { r: [0, GZ], l: [0, -GZ] }, rot: B.GRIPS.under(TILT), pole: { r: [1, -0.3, 0.35], l: [1, -0.3, -0.35] }, plane: [50, 75] });
const KEY = B.pullKeys({ topFlex: 130, topPitch: 6, hangFlex: 11 });
const poses = {}; for (const [n, k] of Object.entries(KEY)) poses[n] = Hh.solveKey(k);
const keyframes = [['hang', 0], ['hang', 0.8], ['scap', 1.1], ['m1', 1.5], ['m2', 1.8], ['m3', 2.0], ['top', 2.2], ['top', 2.6], ['m3', 2.95], ['m2', 3.3], ['m1', 3.75], ['scap', 4.3], ['hang', 4.6], ['hang', 5.2]].map(([pose, t]) => ({ t, pose }));
const ex = H.module_(meta, Hh.contacts, poses, keyframes);
ex.props = [Hh.PB.prop];
Hh.pin(ex);

const rep = B.hangCheck(ex, Hh);
const Wh = L.fk(poses.hang, Hh.contacts), Wt = L.fk(poses.top, Hh.contacts);
const chin = H.bottomOf(Wt, 'jaw') - Hh.barH, travel = V.len(V.sub(Wt.pelvis.p, Wh.pelvis.p)), shW = V.len(V.sub(Wh.shoulder_r.p, Wh.shoulder_l.p));
const set = H.setKin(ex);
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(Wh))}° in the dead hang`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(Wt))}° at the top`);
set('Grip width', 'setup', `Underhand, grip points ${2 * GZ} cm apart (shoulder joints ${Math.round(shW)} cm): about ${Math.round(100 * 2 * GZ / shW)}% of shoulder width`); set('Grip width', 'peak', 'Unchanged (hands planted on the bar)');
set('Chin height', 'setup', `Chin ${Math.round(-(H.bottomOf(Wh, 'jaw') - Hh.barH))} cm below the bar in the dead hang`); set('Chin height', 'peak', `Chin ${chin.toFixed(1)} cm above the bar at the top; body rises ${Math.round(travel)} cm`);
set('Shoulder blades', 'setup', `Elevated (${KEY.hang.sc.elevate}) in the hang`); set('Shoulder blades', 'peak', `Depressed and retracted (elevate ${KEY.top.sc.elevate}, protract ${KEY.top.sc.protract}) at the top`);
set('Tempo', 'setup', 'Hang 0.8 s, set the shoulders 0.3 s'); set('Tempo', 'peak', 'About 1.1 s up, 0.4 s hold, 2 s down');
console.log(`Close Grip Chin-Up: wrote ${L.write(ex)}\n  chin ${chin.toFixed(1)} travel ${travel.toFixed(1)} feet ${L.shapeMinY(Wh).y.toFixed(1)}\n  ${JSON.stringify(rep)}`);
B.hangGate(rep);
if (chin < 0) { console.error('FAIL: chin does not clear the bar'); process.exitCode = 1; }
