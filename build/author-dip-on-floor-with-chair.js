// Dip on Floor with Chair (GymVisual #012539; page not readable here, movement from the name and standard coaching):
// hands on the front edge of a chair seat behind the hips (a 45 cm box stands in for the chair), fingers forward
// (planted), legs nearly straight with the feet far out on the floor (planted); lower until the upper arms are about
// parallel and press back up. Built by g3-benches.handsBehindDip (author-bench-dip.js scheme). Bilateral.
const meta = require('./meta/dip-on-floor-with-chair.json');
module.exports = { ex: require('./families/g3-benches').handsBehindDip(meta, { surfaceH: 45, footX: 70, hip: 55, knee: 35 }) };
