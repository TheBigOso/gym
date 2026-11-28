// Assisted Inverse Leg Curl (GymVisual reference: page not readable here, movement from the name and standard coaching):
// kneeling on a floor pad, ankles under the roller, a band from a rack behind looped round the chest (strands from the rack to the sides of the chest), arms crossed; lean forward to about 30 degrees of knee flexion and curl back up.
// Built by g3-benches.nordic (kneeling pad and roller: the gear-pack decline_bench set flat; shins planted, the body line
// turns about the knees). Bilateral.
const meta = require('./meta/assisted-inverse-leg-curl.json');
module.exports = { ex: require('./families/g3-benches').nordic(meta, { bench: 'floor', assist: 'band', assistRow: ['Band', 'Band from the rack behind to the sides of the chest', 'Band stretches and supports the trunk at the bottom'] }) };
