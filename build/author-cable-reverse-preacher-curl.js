// Cable Reverse Preacher Curl (GymVisual reference: page not readable here, movement from the name and standard coaching):
// as the cable preacher curl with an overhand (palms-down) grip on the straight cable bar. Bilateral.
// Built by g3-benches.preacher (seated base and pad fit of author-barbell-preacher-curl.js; the hand swings about the
// elbow pinned on the pad).
const meta = require('./meta/cable-reverse-preacher-curl.json');
module.exports = { ex: require('./families/g3-benches').preacher(meta, { item: 'cable-bar', grip: 'over' }) };
