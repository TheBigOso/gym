// Band Assisted Dip (GymVisual reference: page not readable here, movement from the name and standard coaching):
// a band stretched from bar to bar runs under the shins (knees bent 90 degrees, thighs nearly vertical); upright dip to upper arms parallel. The band is drawn as strands from each bar to the shin below each knee and across between the knees.
// Built by g3-benches.dips (generalized from author-triceps-dip.js: hands planted on the parallel bars, each key solves
// the root for a shoulder height and trunk lean). Bilateral.
const meta = require('./meta/band-assisted-dip.json');
module.exports = { ex: require('./families/g3-benches').dips(meta, { lean0: 4, lean1: 12, hip: 6, knee: 92, ankle: -25, assist: 'band', assistRow: ['Band', 'Band strands from the bars to the shins below the knees', 'Stretches as the body lowers'] }) };
