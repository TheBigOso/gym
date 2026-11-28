// Incline Twisting Sit-up (GymVisual #014632; page not readable here, movement from the name and standard coaching):
// sit-up on an inclined (decline) board, feet hooked under the roller, fingertips behind the head; on the way up the
// trunk turns so the left elbow heads toward the right knee, then rolls back down. Authored twisting to the right (the
// player mirrors it for the other side). Trunk keys of author-decline-sit-up.js plus spine rotation
// (g3-benches.declineSitup with rot).
const G = require('./families/g3-benches');
const meta = require('./meta/incline-twisting-sit-up.json');
const ROT = { curl: 4, rise: 18, top: 30, topHold: 31, lower: 18, lowBack: 6 };
const keys = G.SITUP_KEYS.map((k) => Object.assign({}, k, ROT[k.name] ? { rot: ROT[k.name] } : {}));
module.exports = { ex: G.declineSitup(meta, { keys, rotRow: true }) };
