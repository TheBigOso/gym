// Decline Crunch (GymVisual #000913; page not readable here, movement from the name and standard coaching): lying on a
// 25-degree decline board (gear pack decline_bench), feet hooked under the roller, fingertips behind the head, elbows
// wide. Curl the head and shoulder blades off the board (low back stays down), pause, uncurl. The curl keys of
// author-decline-sit-up.js without the sit-up (g3-benches.declineSitup). Bilateral.
const G = require('./families/g3-benches');
const meta = require('./meta/decline-crunch.json');
const keys = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, floor: true },
  { name: 'curl', l5: 2, t12: 10, t6: 13, neck: 26, pitch: 0.5 },
  { name: 'top', l5: 4, t12: 15, t6: 19, neck: 30, pitch: 1.5 },
  { name: 'topHold', l5: 4.5, t12: 15.5, t6: 19.5, neck: 30, pitch: 1.6 },
  { name: 'down', l5: 2, t12: 8, t6: 10, neck: 22, pitch: 0.5 },
  { name: 'touch', l5: 0, t12: 3, t6: 5, neck: 14, pitch: 0, floor: true },
];
const kf = [['lie', 0], ['lie', 0.8], ['curl', 1.3], ['top', 1.8], ['topHold', 2.2], ['down', 2.9], ['touch', 3.3], ['lie', 3.6], ['lie', 4.4]];
module.exports = { ex: G.declineSitup(meta, { keys, kf, measure: 'hipFlexion' }) };
