// Band Kneeling Preacher Curl (GymVisual #009456; page not readable here, movement from the name and standard coaching):
// kneeling on a low cushion (the preacher bench's seat set to 12 cm) behind a 45-degree preacher pad, both upper arms on
// the pad, holding the two ends of a band looped round a heavy block on the floor in front of the pad (two strands). Curl to the
// forearms vertical and lower. Built by g3-benches.preacher with the kneeling base. Bilateral.
const meta = require('./meta/band-kneeling-preacher-curl.json');
module.exports = { ex: require('./families/g3-benches').preacher(meta, { kneel: true, item: 'band', grip: 'under', gw: 36, bandDx: 18 }) };
