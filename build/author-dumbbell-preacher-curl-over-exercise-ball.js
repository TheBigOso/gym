// Dumbbell Preacher Curl over Exercise Ball (GymVisual #008716; page not readable here, movement from the name and
// standard coaching): kneeling on the mat behind a stability ball (gear pack stability_ball, sized so its surface meets
// the upper arm at a 32-degree slope: about 53 cm), the right upper arm draped over it, the left hand on the ball; one dumbbell curled
// underhand about the elbow on the ball. Built by g3-benches.preacher with the kneeling base and the ball as the pad.
// Authored on the right.
const meta = require('./meta/dumbbell-preacher-curl-over-exercise-ball.json');
module.exports = { ex: require('./families/g3-benches').preacher(meta, { kneel: true, support: 'ball', item: 'dumbbell', grip: 'under', pitch: -42, hip: 52, kneeX: 0, angle: 32 }) };
