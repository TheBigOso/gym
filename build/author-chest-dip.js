// Chest Dip (GymVisual reference: page not readable here, movement from the name and standard coaching):
// parallel bars, forward lean growing from about 10 to 30 degrees, knees bent, elbows a little out; lower to upper arms about parallel, press up.
// Built by g3-benches.dips (generalized from author-triceps-dip.js: hands planted on the parallel bars, each key solves
// the root for a shoulder height and trunk lean). Bilateral.
const meta = require('./meta/chest-dip.json');
module.exports = { ex: require('./families/g3-benches').dips(meta, { lean0: 10, lean1: 30, dx1: 24, hip: 20, knee: 85, pole: 0.8, leanNote: 'forward lean: chest emphasis' }) };
