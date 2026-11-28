// Power Sled Rear Drag (GymVisual; movement reference only, the page could not be read): facing a power sled (prop kind
// 'sled', type power_sled, style drag: strap handles to the sled's front ring) and walking backward to drag it. Hips sat
// back, knees bent, trunk upright to slightly back, arms long holding the handles at a constant height (waist level, 38 cm ahead of the shoulders).
// The steps are a forward walk (b4-power.js gait) played backward in time, which gives short backward steps landing on the
// balls of the feet; the sled, 1.2 m in front of the hands, follows the hands along the floor; the loop restarts at the
// start mark. Bilateral. Family gear-g3lower.js sledWalk.
const G = require('./families/gear-g3lower');
G.sledWalk('power-sled-rear-drag', { style: 'drag', step: 40, period: 0.62, pitch: 6, knee: 32, fwd: 38, handY: 100, out: 4 });
