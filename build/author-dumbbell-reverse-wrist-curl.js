// Dumbbell Reverse Wrist Curl (GymVisual #038512, Dumbbell Reverse Wrist Curl): seated on the end of a flat bench, feet
// flat (planted leg contacts), forearms along the tops of the thighs with the palms down and the wrists just past the
// knees (same seated base as the wrist curl, measured on the skinned mesh). The forearms stay still; only the wrists
// move: from flexion (hands hanging down) to extension (knuckles lifted), pause, slow lower. Bilateral.
const F = require('./families/b4-forearms');
const meta = require('./meta/dumbbell-reverse-wrist-curl.json');
const LOW = +(process.env.LOW || 45), HIGH = +(process.env.HIGH || -48); // flexion at the bottom, extension at the top
const mid = (f) => Math.round(LOW + (HIGH - LOW) * f);
F.seatedCurl(meta, {
  palm: 'down', name: 'Dumbbell Reverse Wrist Curl', wristRow: 'Wrist extension/flexion',
  keys: [[0, LOW], [0.5, LOW], [1.0, mid(0.5)], [1.5, HIGH], [1.9, HIGH - 3], [2.75, mid(0.5)], [3.6, LOW], [4.0, LOW]],
  tempo: ['Bottom 0.5 s', '1 s up, 0.4 s pause, 1.7 s down, 0.4 s at the bottom'],
  seat: JSON.parse(process.env.SEAT || '{"liftE":5.3,"liftW":-0.7,"tW":1.22,"uaV":12,"seatOff":-3.0}'),
});
