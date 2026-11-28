// Archer Pull-up (GymVisual 11668, movement reference only; page not readable at authoring time): very wide overhand grip
// (grip points 90 cm apart) on a free-standing pull-up bar. From a dead hang, set the shoulder blades, then pull up toward
// the right hand: the right elbow bends and drives down while the left arm stays nearly straight and the body travels
// sideways under the right hand until the chin clears the bar beside it; lower under control to the centre hang, then the
// same to the left. Legs hang with a slight knee bend. Both sides in one loop (authored bilateral, alternating).
// Hands planted on the bar (b6-15.js hang): each key is solved for the root height that gives the working elbow angle and
// the sideways shift that keeps the assisting elbow at its (near straight) angle, then moved back until the face clears.
const L = require('./lib');
const { V } = L;
const H = require('./families/hips');
const B = require('./families/b6-15');
const meta = require('./meta/archer-pull-up.json');

const GZ = 45, TILT = 12;
const Hh = B.hang({ barH: 212, grip: { r: [0, GZ], l: [0, -GZ] }, rot: B.GRIPS.over(TILT), pole: { r: [0.35, -0.25, 1], l: [0.35, -0.25, -1] }, plane: [20, 0] });
const clear = { dir: [-0.5, 0], min: 3 };
const base = (o) => Object.assign({ spine: [-1, -2, -3], neck: [-2, -2], clear }, o);
const KEY = {
  hang: base({ flex: 12, sc: { protract: 4, elevate: 24 }, pitch: 0, spine: [0, 0, 0], neck: [0, 0], legs: B.legs(4, 16, -28) }),
  scap: base({ flex: 14, sc: { protract: 0, elevate: 8 }, pitch: 2, legs: B.legs(6, 18, -28) }),
};
// working side s: [name suffix, working elbow, assisting elbow, shoulder blades, pitch, legs, lean of the head away from the straight arm]
const STEPS = [['1', 70, 26, { protract: -6, elevate: 2 }, 3, B.legs(10, 22, -28)], ['2', 108, 18, { protract: -12, elevate: -2 }, 4.5, B.legs(14, 26, -28)], ['t', 146, 14, { protract: -14, elevate: -8 }, 5, B.legs(16, 28, -28)]];
for (const s of ['r', 'l']) for (const [n, f, fo, sc, pitch, lg] of STEPS) KEY[`${s}${n}`] = base({ side: s, flex: f, flexOther: fo, sc, pitch, legs: lg, spine: [-2, -4, -5], neck: [-3, -3], neckRot: s === 'r' ? [4, 6] : [-4, -6] });
const poses = {}; for (const [n, k] of Object.entries(KEY)) poses[n] = Hh.solveKey(k);
const keyframes = [['hang', 0], ['hang', 0.8], ['scap', 1.1], ['r1', 1.55], ['r2', 2.0], ['rt', 2.4], ['rt', 2.8], ['r2', 3.35], ['r1', 3.95], ['scap', 4.4], ['hang', 4.6], ['hang', 4.85], ['scap', 5.1], ['l1', 5.55], ['l2', 6.0], ['lt', 6.4], ['lt', 6.8], ['l2', 7.35], ['l1', 7.95], ['scap', 8.4], ['hang', 8.6], ['hang', 9.2]].map(([pose, t]) => ({ t, pose }));
const ex = H.module_(meta, Hh.contacts, poses, keyframes);
ex.props = [Hh.PB.prop];
Hh.pin(ex);

const rep = B.hangCheck(ex, Hh);
const Wh = L.fk(poses.hang, Hh.contacts), Wt = L.fk(poses.rt, Hh.contacts);
const chin = H.bottomOf(Wt, 'jaw') - Hh.barH, shift = Wt.pelvis.p[2] - Wh.pelvis.p[2], shW = V.len(V.sub(Wh.shoulder_r.p, Wh.shoulder_l.p));
const set = H.setKin(ex);
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(Wh))}° in the dead hang`); set('Elbow flexion', 'peak', `Working elbow ≈${Math.round(B.elbowOf(Wt, 'r'))}°, assisting elbow ≈${Math.round(B.elbowOf(Wt, 'l'))}° at the top`);
set('Grip width', 'setup', `Overhand, grip points ${2 * GZ} cm apart (shoulder joints ${Math.round(shW)} cm): about ${Math.round(100 * 2 * GZ / shW)}% of shoulder width`); set('Grip width', 'peak', 'Unchanged (hands planted on the bar)');
set('Body shift', 'setup', 'Centred under the bar in the hang'); set('Body shift', 'peak', `Pelvis ≈${Math.round(shift)} cm toward the working hand`);
set('Chin height', 'setup', `Chin ${Math.round(-(H.bottomOf(Wh, 'jaw') - Hh.barH))} cm below the bar in the hang`); set('Chin height', 'peak', `Chin ${chin.toFixed(1)} cm above the bar beside the working hand`);
set('Tempo', 'setup', 'Hang 0.8 s, set 0.3 s'); set('Tempo', 'peak', 'About 1.3 s up, 0.4 s hold, 1.8 s down on each side');
const sl = Object.fromEntries(Object.entries(poses).map(([n, p]) => [n, Hh.slack(p)]));
console.log(`Archer Pull-up: wrote ${L.write(ex)}\n  chin ${chin.toFixed(1)} shift ${shift.toFixed(1)} slack ${JSON.stringify(sl)}\n  ${JSON.stringify(rep)}`);
B.hangGate(rep);
if (chin < 0) { console.error('FAIL: chin does not clear the bar'); process.exitCode = 1; }
