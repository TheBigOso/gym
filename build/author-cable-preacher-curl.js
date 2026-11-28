// Cable Preacher Curl (GymVisual reference: page not readable here, movement from the name and standard coaching):
// seated at a 45-degree preacher bench facing a low pulley on the pad line, straight cable bar in an underhand grip 42 cm wide, both upper arms on the pad; curl to forearms vertical, lower to nearly straight. Bilateral.
// Built by g3-benches.preacher (seated base and pad fit of author-barbell-preacher-curl.js; the hand swings about the
// elbow pinned on the pad).
const meta = require('./meta/cable-preacher-curl.json');
module.exports = { ex: require('./families/g3-benches').preacher(meta, { item: 'cable-bar', grip: 'under' }) };
