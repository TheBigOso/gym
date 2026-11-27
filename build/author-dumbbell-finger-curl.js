// Dumbbell Finger Curl (GymVisual #143712, Dumbbell Finger Curls): seated on the end of a flat bench, feet flat (planted
// leg contacts), forearms along the tops of the thighs with the palms up and the wrists just past the knees (the wrist
// curl's seated base). The wrists bend back as the handle rolls toward the fingertips, then curl back up a little past
// straight with a squeeze. Limitation: the player always closes a holding hand into a fist and attach.offset is one
// constant per prop, so the fingers cannot open and the handle cannot roll; the handle is set a little toward the
// fingers (in the finger crease, OFF) and the finger action is carried by the cues, phases and the wrist motion.
const F = require('./families/b4-forearms');
const meta = require('./meta/dumbbell-finger-curl.json');
const TOP = +(process.env.TOP || 15), BOT = +(process.env.BOT || -40);
const OFF = process.env.OFF ? JSON.parse(process.env.OFF) : [8.4, 1.8, 0]; // [toward fingers, out of palm, thumb axis] cm
const out = F.seatedCurl(meta, {
  palm: 'up', name: 'Dumbbell Finger Curl', wristRow: 'Wrist position', offset: OFF,
  keys: [[0, TOP], [0.5, TOP], [1.25, Math.round((TOP + BOT) / 2)], [2.0, BOT], [2.4, BOT - 2], [3.1, Math.round((TOP + BOT) / 2)], [3.8, TOP], [4.4, TOP + 5], [5.0, TOP]],
  wristText: (lo, hi) => [`${hi}° flexion with a closed fist at the top`, `${-lo}° extension at the bottom (arc ≈${hi - lo}°)`],
  tempo: ['Top 0.5 s', '1.5 s roll down, 0.4 s hold, 1.4 s curl up, 0.6 s squeeze'],
  seat: JSON.parse(process.env.SEAT || '{"liftE":5.3,"liftW":-0.7,"tW":1.22,"uaV":12,"seatOff":-3.0}'),
});
// Finger action row: what the animation can and cannot show (the fist stays closed in the player)
const fa = out.ex.exercise.kinematics.find((k) => k.measure === 'Finger action');
fa.setup = `Full fist; handle set ${OFF[0]} cm toward the fingers (finger crease)`;
fa.peak = 'Not animated: the player keeps a holding hand closed and the handle fixed in it, so the roll to the fingertips is shown by the wrist bending back and by the cues';
require('./lib').write(out.ex);
