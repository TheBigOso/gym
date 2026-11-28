// Self Assisted Inverse Leg Curl (GymVisual reference: page not readable here, movement from the name and standard coaching):
// kneeling on a floor pad, ankles under the roller; lower forward as far as possible, catch on the hands near the floor (planted at the bottom), push off briefly and curl back up.
// Built by g3-benches.nordic (kneeling pad and roller: the gear-pack decline_bench set flat; shins planted, the body line
// turns about the knees). Bilateral.
const meta = require('./meta/self-assisted-inverse-leg-curl.json');
module.exports = { ex: require('./families/g3-benches').nordic(meta, { bench: 'floor', assist: 'hands', assistRow: ['Hands', 'Arms reach forward on the way down', 'Hands on the floor at the bottom, short push'] }) };
