// Resistance Band Floor Hyperextension (GymVisual reference: page not readable here, movement from the name and standard coaching):
// prone on a mat with the head toward a rack, band handles at the shoulders with the elbows bent back; one band per hand runs forward to a low anchor on the rack uprights. Lift the chest against the bands, hold, lower.
// Built by g3-benches.floorExt (prone lying pose of author-superman.js; pelvis fixed, chest lifts by spine extension).
// Bilateral.
const meta = require('./meta/resistance-band-floor-hyperextension.json');
module.exports = { ex: require('./families/g3-benches').floorExt(meta, { arms: 'band', kf: [['rest', 0], ['rest', 0.8], ['up1', 1.15], ['up2', 1.5], ['top', 1.8], ['topHold', 2.6], ['up2', 3.1], ['up1', 3.6], ['rest', 4.1], ['rest', 5.1]] }) };
