// Dumbbell Wrist Curl (GymVisual #040112, Dumbbell Seated Palms-up Wrist Curl): seated on the end of a flat bench, feet
// flat (planted leg contacts), trunk leaning forward from the hips so both forearms lie along the tops of the thighs,
// palms up, wrists just past the knees, a light dumbbell in each hand. The forearms stay still (one constant arm pose);
// only the wrists move: from extension (dumbbells lowered) to flexion (hands curled up), short squeeze, slow lower.
// Bilateral.
const F = require('./families/b4-forearms');
const meta = require('./meta/dumbbell-wrist-curl.json');
const LOW = +(process.env.LOW || -55), HIGH = +(process.env.HIGH || 55);
const mid = (f) => Math.round(LOW + (HIGH - LOW) * f);
F.seatedCurl(meta, {
  palm: 'up', name: 'Dumbbell Wrist Curl', wristRow: 'Wrist flexion/extension',
  keys: [[0, LOW], [0.5, LOW], [1.0, mid(0.5)], [1.5, HIGH], [1.9, HIGH + 3], [2.75, mid(0.5)], [3.6, LOW], [4.0, LOW]],
  tempo: ['Bottom 0.5 s', '1 s up, 0.4 s squeeze, 1.7 s down, 0.4 s at the bottom'],
  seat: JSON.parse(process.env.SEAT || '{"liftE":5.3,"liftW":-0.7,"tW":1.22,"uaV":12,"seatOff":-3.0}'),
});
