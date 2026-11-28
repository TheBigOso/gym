// Dumbbell Hammer Preacher Curl (GymVisual reference: page not readable here, movement from the name and standard coaching):
// one dumbbell in a neutral (thumb-up) grip, right upper arm on the pad, the left hand resting on the pad. Authored on the right.
// Built by g3-benches.preacher (seated base and pad fit of author-barbell-preacher-curl.js; the hand swings about the
// elbow pinned on the pad).
const meta = require('./meta/dumbbell-hammer-preacher-curl.json');
module.exports = { ex: require('./families/g3-benches').preacher(meta, { item: 'dumbbell', grip: 'neutral' }) };
