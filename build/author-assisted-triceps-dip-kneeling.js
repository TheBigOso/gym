// Assisted Triceps Dip (kneeling) (GymVisual reference: page not readable here, movement from the name and standard coaching):
// kneeling on the counterweighted pad of an assisted dip machine (dip_station params.assist, src/gear/g3-benches-assist.js: the pad follows the knees), trunk upright, elbows straight back.
// Built by g3-benches.dips (generalized from author-triceps-dip.js: hands planted on the parallel bars, each key solves
// the root for a shoulder height and trunk lean). Bilateral.
const meta = require('./meta/assisted-triceps-dip-kneeling.json');
module.exports = { ex: require('./families/g3-benches').dips(meta, { lean0: 3, lean1: 10, hip: 2, knee: 92, ankle: -40, legsWorld: true, assist: 'kneel', assistRow: ['Knee pad', 'Shins on the pad, hips over the knees', 'Pad rides down and up with the knees'], leanNote: 'upright: triceps emphasis' }) };
