// Lever Full Squat (GymVisual; movement reference only, the page could not be read): full-depth squat on a plate-loaded lever
// squat machine (prop kind 'lever_machine', custom geometry on the calf_raise preset): a shoulder yoke (the lever's end, with
// handles where the hands are) rests on the upper traps, and the lever pivots behind the athlete. The body motion
// is the authored barbell full squat (high bar, hands just outside the shoulders, feet planted), resampled densely; the
// yoke follows the bar position across the back, the pivot is fitted to the bar path, and each key's root is shifted
// fore-aft over the planted feet so the yoke stays exactly on its arc. Bilateral. Family gear-g3lower.js leverFromBase.
const G = require('./families/gear-g3lower');
G.leverFromBase('lever-full-squat', 'barbell-full-squat', {
  type: 'calf_raise', follow: { grip: 'bar' }, fit: { x: [-160, -60], y: [-130, -50] },
  params: { armZ: 54, endKind: 'handles', endSize: [12, 1.8], handleZ: 40, pads: [], range: [-60, 60], plateAt: 0.35 },
  skipClear: /^(hand|thumb|forearm)_|^traps_|^neck$|^chest$/,
  edit: (ex, { piv, M }) => { const k = ex.exercise.kinematics.find((x) => x.measure === 'Bar position'); k.setup = `Yoke on the upper traps; lever pivot ${Math.round(piv[0] - M.P.end[0])} cm ahead of and ${Math.round(M.P.end[1] - piv[1])} cm below it`; },
});
