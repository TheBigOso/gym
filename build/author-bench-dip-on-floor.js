// Bench Dip on Floor (GymVisual #005118; page not readable here, movement from the name and standard coaching): bench
// dip with the feet on the floor and the legs straight (heels down, toes up; the knees-bent version is bench-dip):
// palms on the edge of a flat 42 cm bench behind the hips, fingers forward (planted); lower until the upper arms are about
// parallel to the floor, press up. Built by g3-benches.handsBehindDip (author-bench-dip.js scheme). Bilateral.
const meta = require('./meta/bench-dip-on-floor.json');
module.exports = { ex: require('./families/g3-benches').handsBehindDip(meta, { surfaceH: 42, bench: true, footX: 75, hip: 70, knee: 8, heel: 55 }) };
