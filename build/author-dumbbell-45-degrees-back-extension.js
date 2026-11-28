// Dumbbell 45 Degrees Back Extension (GymVisual reference: page not readable here, movement from the name and standard coaching): 45-degree
// back extension bench (gear pack hyperextension_bench), soles on the foot plate under the heel roller, legs straight,
// thighs on the hip pad just below the hip crease. Arms: dumbbell. The trunk hinges down to nearly vertical and rises back
// to the leg line. Built by g3-benches.hyper45 (same body and pad fit as author-hyperextension.js). Bilateral.
const meta = require('./meta/dumbbell-45-degrees-back-extension.json');
module.exports = { ex: require('./families/g3-benches').hyper45(meta, { arms: 'dumbbell' }) };
