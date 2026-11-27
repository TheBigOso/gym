// Barbell Standing Wrist Reverse Curl (GymVisual #15742; page not readable here, movement from the name and standard
// coaching): standing tall, feet about hip width (planted leg contacts), the bar in front of the thighs with an overhand
// grip (palms facing the thighs, right thumb toward the midline) about shoulder width, arms straight and hanging just
// forward of the thighs. Only the wrists move: from a little flexion (bar low) into extension, the knuckles lifting the bar
// forward and up, short squeeze, slow lower. Arm depth: the least that keeps the bar clear of the thighs over the wrist
// range (b5-bbarms.js wristDepth). Bilateral.
const C = require('./families/b3-curls');
const A = require('./families/b5-bbarms');
const meta = require('./meta/barbell-standing-wrist-reverse-curl.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const LOW = ENV('LOW', 20), HIGH = ENV('HIGH', -42), MID = Math.round((LOW + HIGH) / 2); // flexion channel: + flexion, - extension
const { contacts, base } = C.standing({}, { sc: { protract: -2, elevate: 0 } });
A.buildWrist(meta, {
  base, contacts, palm: [-1, 0, 0], thumb: [0, 0, -1], x0: 6, x1: 35, name: 'Barbell Standing Wrist Reverse Curl',
  keys: [[0, LOW], [0.5, LOW], [1.0, MID], [1.5, HIGH], [1.9, HIGH - 3], [2.75, MID], [3.6, LOW], [4.0, LOW]],
  rows: (set) => { set('Wrist extension/flexion', 'setup', `${LOW}° flexion (bar low, wrists bent forward a little)`); set('Wrist extension/flexion', 'peak', `${3 - HIGH}° extension at the top (arc ≈${LOW - HIGH + 3}°)`); },
});
