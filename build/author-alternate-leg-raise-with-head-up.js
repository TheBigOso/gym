// Alternate Leg Raise with Head-up (GymVisual 9282, movement reference only; the page could not be read at authoring
// time). As the alternate leg raise (both heels hovering, one straight leg at a time to about vertical), but with the
// head and the tops of the shoulders curled up off the mat in a crunch hold for the whole set (upper-spine and neck
// flexion; the pelvis stays down). Hands by the sides, palms down (planted). Bilateral, alternating.
const L = require('./lib');
const { r1 } = L;
const F = require('./families/b6-16');
const C = require('./families/core-a');
const meta = require('./meta/alternate-leg-raise-with-head-up.json');

const { ex, poses, rep, Wh, Wt, heel, HC } = F.altHover(meta, { head: true });
const Wr = L.fk(poses.rest, HC), d = (v) => `≈${Math.round(v)}°`;
const set = (p, s, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k.setup = s; k.peak = v; };
const chest = (W) => C.bottomOf(W, 'chest'), headLow = (W) => C.minOf(W, ['head', 'hair']);
set('Head and shoulders', `Resting (head ${r1(headLow(Wr))} cm, upper back on the mat)`, `Head ${r1(headLow(Wh))} cm and upper chest ${r1(chest(Wh))} cm off the mat; neck ${d(poses.hover.ch.neck_c7.flex + poses.hover.ch.head_c1.flex)} flexion`);
set('Lifting leg', `Hover, ${d(C.legFromFloor(Wh, 'r'))}`, `${d(C.legFromFloor(Wt, 'r'))} at the top`);
set('Hip flexion', `${d(poses.hover.ch.hip_r.flex)} in the hover`, `${d(poses.rHold.ch.hip_r.flex)} on the lifting side`);
set('Pelvis', 'On the mat', `Unchanged (pelvis moves ${rep.still} cm); hover leg never below ${rep.hoverMin} cm`);
set('Tempo', 'Rest 0.5 s, curl up and lift 0.6 s', 'Per leg: 1.1 s up, 0.3 s pause, 1.1 s down');
console.log(`Alternate Leg Raise with Head-up: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} chest ${chest(Wh).toFixed(1)} head ${headLow(Wh).toFixed(1)}`);
C.guard('alternate-leg-raise-with-head-up', rep, [rep.hoverMin < 2 && `hover leg touches the mat (${rep.hoverMin} cm)`, chest(Wh) < 2 && 'upper back barely lifts']);
