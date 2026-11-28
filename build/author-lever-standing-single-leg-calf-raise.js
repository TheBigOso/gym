// Lever Standing Single Leg Calf Raise (GymVisual; movement reference only, the page could not be read): single-leg calf
// raise under the shoulder yoke of a plate-loaded standing calf machine (prop kind 'lever_machine', type calf_raise,
// src/gear/lever.js). The body motion is the authored barbell standing single-leg calf raise (standing on the right foot,
// left foot lifted behind, rising onto the ball of the foot and lowering the heel to the floor), resampled densely; the
// hands that held the bar now hold the yoke's handles, and the yoke (the lever's end) follows the bar position across the
// upper back. The lever pivots in front of the athlete (47 cm ahead of and 60 cm below the yoke), so the yoke's arc runs up and forward
// like the free calf raise's bar path; each key's root is shifted (about 1 cm at most) so the yoke
// stays exactly on its arc. Authored on the right leg. Family gear-g3lower.js leverFromBase.
const G = require('./families/gear-g3lower');
G.leverFromBase('lever-standing-single-leg-calf-raise', 'barbell-standing-single-leg-calf-raise', {
  type: 'calf_raise', follow: { grip: 'bar' }, pivotRel: [47, -60],
  params: { armZ: 52, endKind: 'handles', endSize: [12, 1.8], handleZ: 40, pads: [], range: [-25, 25] },
  skipClear: /^(hand|thumb|forearm)_|^traps_|^neck$|^chest$/,
});
