// Lever Pendulum Squat (plate loaded) (GymVisual; movement reference only, the page could not be read): deep squat in a
// plate-loaded pendulum squat (prop kind 'lever_machine', custom geometry on the calf_raise preset): the shoulder pads and
// handles ride on a long swing arm whose pivot sits 126 cm behind and 55 cm below the pads (about hip height), so the pads
// travel down and a little forward on an arc. The body motion is the authored barbell full squat (feet planted, deep knee
// bend), resampled densely; the pads follow the bar position across the upper back, and each key's root is shifted
// fore-aft over the planted feet (up to about 2 cm forward at the bottom: the knees travel a little further over the toes
// than in the free squat) so the pads stay exactly on the arc. Bilateral. Family gear-g3lower.js
// leverFromBase.
const G = require('./families/gear-g3lower');
G.leverFromBase('lever-pendulum-squat-plate-loaded', 'barbell-full-squat', {
  type: 'calf_raise', follow: { grip: 'bar' }, pivotRel: [-126, -55],
  params: { armZ: 54, endKind: 'handles', endSize: [12, 1.8], handleZ: 40, pads: [], range: [-60, 60], plateAt: 0.5 },
  skipClear: /^(hand|thumb|forearm)_|^traps_|^neck$|^chest$/,
  edit: (ex, { piv, M }) => { const k = ex.exercise.kinematics.find((x) => x.measure === 'Bar position'); k.setup = `Pads on the upper traps; swing-arm pivot ${Math.round(M.P.end[0] - piv[0])} cm behind and ${Math.round(piv[1] - M.P.end[1])} cm ${piv[1] > M.P.end[1] ? 'above' : 'below'} them`; },
});
