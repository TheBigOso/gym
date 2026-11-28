// Lying Floor Hyperextension (GymVisual reference: page not readable here, movement from the name and standard coaching):
// prone on a mat, legs straight, fingertips behind the head and elbows wide; lift the head and chest a few centimetres, hold briefly, lower.
// Built by g3-benches.floorExt (prone lying pose of author-superman.js; pelvis fixed, chest lifts by spine extension).
// Bilateral.
const meta = require('./meta/lying-floor-hyperextension.json');
module.exports = { ex: require('./families/g3-benches').floorExt(meta, { arms: 'head', kf: [['rest', 0], ['rest', 0.8], ['up1', 1.15], ['up2', 1.5], ['top', 1.8], ['topHold', 2.6], ['up2', 3.1], ['up1', 3.6], ['rest', 4.1], ['rest', 5.1]] }) };
