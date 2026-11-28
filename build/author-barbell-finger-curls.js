// Barbell Finger Curls (GymVisual #19708; page not readable here, movement from the name, standard coaching and the
// library's Dumbbell Finger Curl): seated on the end of a flat bench, feet flat (planted leg contacts), forearms along the
// tops of the thighs with the palms up and the wrists just past the knees, a light barbell in both hands (underhand, about
// 40 cm between the handle points). The wrists bend back as the bar rolls toward the fingertips, short hold, then the
// fingers and wrists curl it back up a little past straight with a squeeze. Limitation (as in the dumbbell version): the
// player closes a holding hand into a fist and the bar stays in it, so the finger opening is carried by the cues, the
// phases and the wrist motion. Seated base: b4-forearms.js seatedForearms; module: b6-02.js seatedBarWrist. Bilateral.
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-finger-curls.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const TOP = ENV('TOP', 15), BOT = ENV('BOT', -45), MID = Math.round((TOP + BOT) / 2);
const out = W6.seatedBarWrist(meta, {
  palm: 'up', name: 'Barbell Finger Curls', wristRow: 'Wrist position', plateD: 32,
  keys: [[0, TOP], [0.5, TOP], [1.25, MID], [2.0, BOT], [2.4, BOT - 2], [3.1, MID], [3.8, TOP], [4.4, TOP + 5], [5.0, TOP]],
  wristText: (lo, hi) => [`${hi}° flexion with a closed fist at the top`, `${-lo}° extension at the bottom (arc ≈${hi - lo}°)`],
  tempo: ['Top 0.5 s', '1.5 s roll down, 0.4 s hold, 1.4 s curl up, 0.6 s squeeze'],
  seat: JSON.parse(process.env.SEAT || '{"liftE":5.3,"liftW":-0.7,"tW":1.22,"uaV":12,"seatOff":-3.0,"hipAbd":4,"stance":18}'),
  rows: (set) => {
    set('Finger action', 'setup', 'Full fist around the bar');
    set('Finger action', 'peak', 'Not animated: the player keeps a holding hand closed with the bar fixed in it, so the roll to the fingertips is shown by the wrist bending back and by the cues');
  },
});
