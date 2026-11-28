// Dumbbell Lying Extension, across face (GymVisual #963, page not readable here): lying on a flat bench, feet planted (leg
// contacts), one dumbbell in the right hand with a neutral grip (palm toward the midline, handle along the body). The upper
// arm stays still over the shoulder, tilted 10 degrees toward the head and turned in (constant shoulder channels), so as the elbow bends the forearm swings
// across the body: the dumbbell passes above the chin and face to over the opposite shoulder,
// palm toward the face, handle still along the body, then the elbow straightens along the
// same path. The left hand rests on the stomach. Authored right. Family b6-05.js (lyingExt).
const F = require('./families/b6-05');
const TILT = +(process.env.TILT ?? 10) * Math.PI / 180;
const meta = require('./meta/dumbbell-lying-extension-across-face.json');
F.lyingExt(meta, {
  ua: [-Math.sin(TILT), Math.cos(TILT), 0], fa: [0, 0, -1], palm: [0, -1, 0], flexBot: +(process.env.FLEXB ?? 90), label: 'Dumbbell Lying Extension (across face)',
  gripText: ['Neutral: palm toward the midline, handle along the body', 'Palm toward the face at the bottom, handle still along the body (forearm rotation constant)'],
  planeText: ['Over the shoulder, upper arm tilted 10° toward the head', 'Forearm swings across the body above the face; dumbbell over the opposite shoulder'],
});
