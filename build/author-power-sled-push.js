// Power Sled Push (GymVisual; movement reference only, the page could not be read): pushing a plate-loaded power sled
// (prop kind 'sled', type power_sled, style push; src/gear/g3lower-sled.js) across the floor. The body leans well forward
// (root pitched 38 degrees) with the knees bent, hands on the sled's upright poles at a constant height 40 cm ahead of the
// shoulders, arms long; short driving steps (b4-power.js gait: a half step, full 45 cm steps and a closing step, each back
// foot rolling onto its ball). The sled follows the hands' midpoint along the floor; the loop restarts at the start mark.
// Bilateral. Family gear-g3lower.js sledWalk.
const G = require('./families/gear-g3lower');
G.sledWalk('power-sled-push', { style: 'push', step: 45, period: 0.62, pitch: -38, knee: 22, fwd: 50, handY: 102 });
