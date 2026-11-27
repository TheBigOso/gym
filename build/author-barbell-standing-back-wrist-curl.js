// Barbell Standing Back Wrist Curl (GymVisual #4366; page not readable here, movement from the name and standard coaching;
// the barbell version of author-dumbbell-behind-back-wrist-curl.js): standing tall, feet about hip width (planted leg
// contacts), the bar held behind the thighs, palms facing back (right thumb toward the midline), hands about shoulder width,
// arms straight and hanging slightly back with the shoulders drawn back so the bar clears the backs of the thighs and the
// buttocks. Only the wrists move: from a nearly straight wrist (bar hanging) into flexion, curling the bar up and back,
// short squeeze, slow lower. Arm depth: the least that keeps the bar clear over the wrist range. Bilateral.
const C = require('./families/b3-curls');
const A = require('./families/b5-bbarms');
const meta = require('./meta/barbell-standing-back-wrist-curl.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const LOW = ENV('LOW', -10), HIGH = ENV('HIGH', 55), MID = Math.round((LOW + HIGH) / 2);
const { contacts, base } = C.standing({}, { sc: { protract: -12, elevate: -2 } });
base.ch.neck_c7 = { rot: 0, flex: 2 }; base.ch.head_c1 = { rot: 0, flex: 2 };
A.buildWrist(meta, {
  base, contacts, palm: [-1, 0, 0], thumb: [0, 0, -1], x0: -6, x1: -35, name: 'Barbell Standing Back Wrist Curl',
  keys: [[0, LOW], [0.5, LOW], [1.0, MID], [1.5, HIGH], [1.9, HIGH + 3], [2.75, MID], [3.6, LOW], [4.0, LOW]],
  rows: (set) => { set('Wrist flexion', 'setup', `${-LOW}° extension (bar hanging, wrists about straight)`); set('Wrist flexion', 'peak', `${HIGH + 3}° flexion at the top (arc ≈${HIGH + 3 - LOW}°)`); },
});
