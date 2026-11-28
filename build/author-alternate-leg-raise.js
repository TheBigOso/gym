// Alternate Leg Raise (GymVisual 11008, movement reference only; the page could not be read at authoring time). Supine
// on a mat, arms by the sides palms down (planted hands), legs straight. Both heels lift into a low hover; the right leg
// rises to about vertical and lowers back to the hover while the left leg holds just off the mat, then the left leg; the
// legs lower to the mat at the end of the set. Pelvis, upper back and head stay down. Bilateral, alternating.
const L = require('./lib');
const { r1 } = L;
const F = require('./families/b6-16');
const C = require('./families/core-a');
const meta = require('./meta/alternate-leg-raise.json');

const { ex, poses, rep, Wh, Wt, heel } = F.altHover(meta, { head: false });
const d = (v) => `≈${Math.round(v)}°`;
const set = (p, s, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k.setup = s; k.peak = v; };
set('Lifting leg', `Hover, ${d(C.legFromFloor(Wh, 'r'))}`, `${d(C.legFromFloor(Wt, 'r'))} at the top`);
set('Hover leg', `Heels ${r1(heel(Wh, 'r'))} cm off the mat`, `Holds at ${r1(heel(Wt, 'l'))} cm while the other leg lifts (never below ${rep.hoverMin} cm)`);
set('Hip flexion', `${d(poses.hover.ch.hip_r.flex)} in the hover`, `${d(poses.rHold.ch.hip_r.flex)} on the lifting side`);
set('Pelvis', 'On the mat', `Unchanged (pelvis moves ${rep.still} cm)`);
set('Tempo', 'Rest 0.5 s, lift 0.6 s', 'Per leg: 1.1 s up, 0.3 s pause, 1.1 s down');
console.log(`Alternate Leg Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
C.guard('alternate-leg-raise', rep, [rep.hoverMin < 2 && `hover leg touches the mat (${rep.hoverMin} cm)`]);
