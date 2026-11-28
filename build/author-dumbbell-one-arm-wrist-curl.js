// Dumbbell One Arm Wrist Curl (GymVisual #5048, page not readable here): seated on the end of a flat bench, feet flat
// (planted leg contacts), trunk leaning forward from the hips so the forearms lie along the tops of the thighs, palms up,
// wrists just past the knees. One light dumbbell in the right hand; the left forearm rests on the left thigh (mirrored,
// no dumbbell). The forearms stay still (one constant arm pose); only the right wrist moves: from extension (dumbbell
// lowered) to flexion (hand curled up), short squeeze, slow lower. Authored right. Family b6-05.js (wristCurl, seated base
// as in the batch 4 seated wrist curl).
const F = require('./families/b6-05');
const meta = require('./meta/dumbbell-one-arm-wrist-curl.json');
const LOW = -55, HIGH = 55, mid = (f) => Math.round(LOW + (HIGH - LOW) * f);
F.wristCurl(meta, {
  base: 'seated', baseOpt: { palm: 'up', liftE: 5.3, liftW: -0.7, tW: 1.22, uaV: 12, seatOff: -3.0 }, channel: 'flex', sides: ['r'], held: ['r'], free: true,
  keys: [[0, LOW], [0.5, LOW], [1.0, mid(0.5)], [1.5, HIGH], [1.9, HIGH + 3], [2.75, mid(0.5)], [3.6, LOW], [4.0, LOW]],
  wristRow: 'Wrist flexion/extension', wristText: (lo, hi) => [F.degTxt.flex(lo), `${F.degTxt.flex(hi)} (arc ≈${Math.round(hi - lo)}°)`],
  tempo: ['Bottom 0.5 s', '1 s up, 0.4 s squeeze, 1.7 s down, 0.4 s at the bottom'], label: 'Dumbbell One Arm Wrist Curl',
});
