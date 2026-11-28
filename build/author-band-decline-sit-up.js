// Band Decline Sit-up (GymVisual #008997; page not readable here, movement from the name and standard coaching): decline
// sit-up (gear pack decline_bench, 25 degrees, feet hooked under the roller), hands behind the head holding the ends of two
// bands anchored low at the head end of the bench, so they stretch as the trunk rises. Same trunk and arm keys as
// author-decline-sit-up.js (g3-benches.declineSitup). Bilateral.
const meta = require('./meta/band-decline-sit-up.json');
module.exports = { ex: require('./families/g3-benches').declineSitup(meta, { arms: 'band', bandRow: true }) };
