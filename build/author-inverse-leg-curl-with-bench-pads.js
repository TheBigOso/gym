// Inverse Leg Curl with Bench Pads (GymVisual reference: page not readable here, movement from the name and standard coaching):
// kneeling on a flat bench (50 cm) with the ankles hooked under the roller pads at its end, arms crossed; lean forward under control and curl back up.
// Built by g3-benches.nordic (kneeling pad and roller: the gear-pack decline_bench set flat; shins planted, the body line
// turns about the knees). Bilateral.
const meta = require('./meta/inverse-leg-curl-with-bench-pads.json');
module.exports = { ex: require('./families/g3-benches').nordic(meta, { bench: 'bench', assistRow: ['Bench', 'Knees on the bench pad, ankles under the roller', 'Shins stay on the pad'] }) };
