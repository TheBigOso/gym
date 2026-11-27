// Barbell Standing Wrist Curl (GymVisual #15741; page not readable here, movement from the name and standard coaching):
// standing tall, feet about hip width (planted leg contacts), the bar in front of the thighs with an underhand grip (palms
// facing forward, right thumb pointing out) about shoulder width, arms straight and hanging just forward of the thighs.
// The arms stay still (one constant arm pose); only the wrists move: from a little extension (bar low, near the thighs)
// into flexion, curling the bar forward and up, short squeeze, slow lower. The arm depth is the least that keeps the bar
// shaft clear of the thighs over the whole wrist range (b5-bbarms.js wristDepth). Bilateral.
const C = require('./families/b3-curls');
const A = require('./families/b5-bbarms');
const meta = require('./meta/barbell-standing-wrist-curl.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const LOW = ENV('LOW', -30), HIGH = ENV('HIGH', 55), MID = Math.round((LOW + HIGH) / 2);
const { contacts, base } = C.standing({}, { sc: { protract: -2, elevate: 0 } });
A.buildWrist(meta, {
  base, contacts, palm: [1, 0, 0], thumb: [0, 0, 1], x0: 6, x1: 35, name: 'Barbell Standing Wrist Curl',
  keys: [[0, LOW], [0.5, LOW], [1.0, MID], [1.5, HIGH], [1.9, HIGH + 3], [2.75, MID], [3.6, LOW], [4.0, LOW]],
  rows: (set) => { set('Wrist flexion', 'setup', `${-LOW}° extension (bar low, wrists bent back a little)`); set('Wrist flexion', 'peak', `${HIGH + 3}° flexion at the top (arc ≈${HIGH + 3 - LOW}°)`); },
});
