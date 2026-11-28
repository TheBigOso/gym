// Dumbbell Lying One Arm Pronated Triceps Extension (GymVisual #5274, page not readable here): lying on a flat bench, feet
// planted (leg contacts), one dumbbell in the right hand with an overhand grip (palm toward the feet with the arm straight,
// handle across the body). The upper arm stays vertical over the shoulder (constant shoulder channels) while the elbow
// bends, swinging the forearm back so the dumbbell ends just above the head on the working side, then straightens. The
// left hand rests on the stomach. Authored right. Family b6-05.js (lyingExt).
const F = require('./families/b6-05');
const meta = require('./meta/dumbbell-lying-one-arm-pronated-triceps-extension.json');
F.lyingExt(meta, {
  ua: [0, 1, 0], fa: [-1, 0, 0], palm: [0, 1, 0], flexBot: +(process.env.FLEXB ?? 96), label: 'Dumbbell Lying One Arm Pronated Triceps Extension',
  gripText: ['Overhand: palm toward the feet, handle across the body', 'Palm toward the ceiling at the bottom (forearm rotation constant)'],
  planeText: ['Over the shoulder', 'Forearm swings back in the plane of the arm; dumbbell above the head on the working side'],
});
