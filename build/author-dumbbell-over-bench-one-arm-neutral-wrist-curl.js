// Dumbbell Over Bench One Arm Neutral Wrist Curl (GymVisual #18527, page not readable here): kneeling on both knees (toes
// tucked, planted leg contacts) facing the side of a flat bench set crosswise, trunk leaning forward from the hips, upper
// arms hanging about vertical, forearms lying straight across the pad with the thumbs up (neutral grip; the right hand
// holds an upright light dumbbell, the left forearm rests beside it with no dumbbell) and the wrists past the far edge.
// The forearms stay still (one constant arm pose); only the right wrist moves, in deviation: from ulnar deviation (hand
// tipped down toward the little finger) to radial deviation (hand cocked up toward the thumb), short hold, slow lower.
// Authored right. Family b6-05.js (wristCurl, kneeling base with the palm-in option).
const F = require('./families/b6-05');
const meta = require('./meta/dumbbell-over-bench-one-arm-neutral-wrist-curl.json');
const LOW = +(process.env.LOW ?? -18), HIGH = +(process.env.HIGH ?? 17), mid = (f) => Math.round(LOW + (HIGH - LOW) * f);
F.wristCurl(meta, {
  base: 'kneel', baseOpt: { lean: +(process.env.LEAN ?? 44.5), uaFwd: 12, palm: 'in', over: +(process.env.OVER ?? 4), dz: +(process.env.DZ ?? -2) }, channel: 'dev', sides: ['r'], held: ['r'], free: true,
  keys: [[0, LOW], [0.5, LOW], [1.0, mid(0.5)], [1.5, HIGH], [1.9, HIGH + 1], [2.75, mid(0.5)], [3.6, LOW], [4.0, LOW]],
  wristRow: 'Wrist deviation', wristText: (lo, hi) => [F.degTxt.dev(lo), `${F.degTxt.dev(hi)} (arc ≈${Math.round(hi - lo)}°)`],
  tempo: ['Bottom 0.5 s', '1 s up, 0.4 s hold, 1.7 s down, 0.4 s at the bottom'], label: 'Dumbbell Over Bench One Arm Neutral Wrist Curl',
});
