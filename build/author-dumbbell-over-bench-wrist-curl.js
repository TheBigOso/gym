// Dumbbell Over Bench Wrist Curl (GymVisual #8645, page not readable here): kneeling on both knees (toes tucked, planted
// leg contacts) facing the side of a flat bench set crosswise, trunk leaning forward from the hips, upper arms hanging
// about vertical, both forearms lying straight across the pad with the palms up and the wrists just past the far edge, a
// light dumbbell in each hand. The forearms stay still (one constant arm pose); only the wrists move: from extension
// (dumbbells lowered past the edge) to flexion (hands curled up), short squeeze, slow lower. Bilateral. Family b6-05.js
// (wristCurl, kneeling base; bench height and depth follow the forearm on the pad).
const F = require('./families/b6-05');
const meta = require('./meta/dumbbell-over-bench-wrist-curl.json');
const LOW = +(process.env.LOW ?? -55), HIGH = +(process.env.HIGH ?? 55), mid = (f) => Math.round(LOW + (HIGH - LOW) * f);
F.wristCurl(meta, {
  base: 'kneel', baseOpt: { lean: +(process.env.LEAN ?? 44.5), uaFwd: 12, palm: 'up', over: +(process.env.OVER ?? 2.5), dz: +(process.env.DZ ?? -4) }, channel: 'flex',
  keys: [[0, LOW], [0.5, LOW], [1.0, mid(0.5)], [1.5, HIGH], [1.9, HIGH + 3], [2.75, mid(0.5)], [3.6, LOW], [4.0, LOW]],
  wristRow: 'Wrist flexion/extension', wristText: (lo, hi) => [F.degTxt.flex(lo), `${F.degTxt.flex(hi)} (arc ≈${Math.round(hi - lo)}°)`],
  tempo: ['Bottom 0.5 s', '1 s up, 0.4 s squeeze, 1.7 s down, 0.4 s at the bottom'], label: 'Dumbbell Over Bench Wrist Curl',
});
