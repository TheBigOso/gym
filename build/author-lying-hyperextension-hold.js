// Lying Hyperextension Hold (GymVisual reference: page not readable here, movement from the name and standard coaching):
// prone on a mat, fingertips behind the head; lift the chest and hold it (6 s shown), then lower.
// Built by g3-benches.floorExt (prone lying pose of author-superman.js; pelvis fixed, chest lifts by spine extension).
// Bilateral.
const meta = require('./meta/lying-hyperextension-hold.json');
module.exports = { ex: require('./families/g3-benches').floorExt(meta, { arms: 'head', holdF: 0.99, kf: [['rest', 0], ['rest', 0.8], ['up1', 1.15], ['up2', 1.5], ['top', 1.8], ['topHold', 4.8], ['top', 7.8], ['up2', 8.3], ['up1', 8.7], ['rest', 9.0], ['rest', 10.0]] }) };
