// Dumbbell Seated Neutral Wrist Curl (GymVisual #5052, page not readable here): seated on the end of a flat bench, feet flat
// (planted leg contacts), trunk leaning forward from the hips so the forearms lie along the tops of the thighs with the
// thumbs up (neutral grip, the dumbbells upright), wrists just past the knees. The forearms stay still (one constant arm
// pose); only the wrists move, in deviation: from ulnar deviation (hands tipped down toward the little finger) to radial
// deviation (hands cocked up toward the thumb), short hold, slow lower. Bilateral. Family b6-05.js (wristCurl, seated base
// with the palm-in option).
const F = require('./families/b6-05');
const meta = require('./meta/dumbbell-seated-neutral-wrist-curl.json');
const LOW = +(process.env.LOW ?? -18), HIGH = +(process.env.HIGH ?? 17), mid = (f) => Math.round(LOW + (HIGH - LOW) * f);
F.wristCurl(meta, {
  base: 'seated', baseOpt: { palm: 'in', liftE: 5.3, liftW: -0.7, tW: 1.4, uaV: 12, seatOff: -3.0 }, channel: 'dev',
  keys: [[0, LOW], [0.5, LOW], [1.0, mid(0.5)], [1.5, HIGH], [1.9, HIGH + 1], [2.75, mid(0.5)], [3.6, LOW], [4.0, LOW]],
  wristRow: 'Wrist deviation', wristText: (lo, hi) => [F.degTxt.dev(lo), `${F.degTxt.dev(hi)} (arc ≈${Math.round(hi - lo)}°)`],
  tempo: ['Bottom 0.5 s', '1 s up, 0.4 s hold, 1.7 s down, 0.4 s at the bottom'], label: 'Dumbbell Seated Neutral Wrist Curl',
});
