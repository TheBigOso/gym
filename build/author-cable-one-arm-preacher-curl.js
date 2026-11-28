// Cable One Arm Preacher Curl (GymVisual reference: page not readable here, movement from the name and standard coaching):
// one D-handle from a low pulley in line with the right hand, underhand; the left hand rests on the pad. Authored on the right.
// Built by g3-benches.preacher (seated base and pad fit of author-barbell-preacher-curl.js; the hand swings about the
// elbow pinned on the pad).
const meta = require('./meta/cable-one-arm-preacher-curl.json');
module.exports = { ex: require('./families/g3-benches').preacher(meta, { item: 'cable-handle', grip: 'under' }) };
