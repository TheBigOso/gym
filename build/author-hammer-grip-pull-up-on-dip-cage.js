// Hammer Grip Pull-up on Dip Cage (GymVisual #009056; page not readable here, movement from the name and standard
// coaching): hanging from the parallel handles of a dip cage / power tower (gear pack dip_station with the bars at pull-up
// height, 52 cm apart), palms facing each other, fingers over the top of the bars, thumbs back. Dead hang, set the
// shoulder blades, pull until the chin rises above the handles (face between the bars), lower to a full hang. Built by
// g3-benches.cagePullup (key scheme of author-pull-up.js). Bilateral.
const meta = require('./meta/hammer-grip-pull-up-on-dip-cage.json');
module.exports = { ex: require('./families/g3-benches').cagePullup(meta) };
