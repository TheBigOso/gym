// Lying Neck Flexion (GymVisual #022216; page not readable here, movement from the name and standard coaching): on the
// back on a flat bench with the head off its end (the bench ends just above the shoulders), knees bent with the feet on
// the bench, hands holding its sides. The head lowers a little below the bench line, then curls up chin toward the chest
// (neck flexion, split between the C7 and C1 channels) and lowers. A neck-strength exercise for the flexors.
// Built by g3-benches.neckFlexion.
const meta = require('./meta/lying-neck-flexion.json');
module.exports = { ex: require('./families/g3-benches').neckFlexion(meta) };
