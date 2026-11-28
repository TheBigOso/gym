// Captain's Chair Straight Leg Raise (GymVisual reference: page not readable here, movement from the name and standard coaching):
// captain's chair (gear pack dip_station variant 'captain', fitted to the body), back on the pad, forearms on the rests,
// hands on the handles (planted, world-locked). Legs: legs-to-horizontal; the pelvis tilts back at the top under a still upper trunk.
// Built by g3-benches.captain. Bilateral.
const meta = require('./meta/captains-chair-straight-leg-raise.json');
module.exports = { ex: require('./families/g3-benches').captain(meta, { legs: 'straight' }) };
