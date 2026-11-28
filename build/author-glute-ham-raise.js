// Glute Ham Raise (GymVisual #011225, version 2; page not readable here, movement from the name and standard coaching):
// glute-ham developer (gear pack hyperextension_bench variant 'ghd'), soles on the foot plate between the rollers
// (planted), lower thighs on the round pad, arms crossed on the chest. From a straight horizontal body the knees bend and
// the straight knee-to-shoulder line turns up to upright, then lowers back. Pad fitted in the script. Built by
// g3-benches.gluteHam. Bilateral.
const meta = require('./meta/glute-ham-raise.json');
module.exports = { ex: require('./families/g3-benches').gluteHam(meta, { hip: 10 }) };
