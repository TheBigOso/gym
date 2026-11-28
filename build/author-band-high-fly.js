// Band High Fly (GymVisual, Band high fly; movement reference only, page not readable): standing in a staggered stance
// (right foot forward, knees soft, a slight forward lean, planted leg contacts) with the back to a rack. A band is looped
// round each rack upright behind the lifter well above head height, one band end per hand. From the arms up and out in a
// wide V (elbows bent about 20 degrees) the arms sweep down, forward and in, in a wide arc, until the hands meet in front
// of the hips (a high-to-low fly, the band version of the high cable crossover), then rise and open again under control.
// The elbow angle stays fixed. Read as a high-to-low fly from the name; see the report. Bilateral (right arm solved, left
// mirrored). Shared fly set-up: build/families/b6-10.js flyModule.
const G = require('./families/b6-10');
const meta = require('./meta/band-high-fly.json');
const { V } = require('./lib');
G.flyModule(meta, {
  name: 'Band High Fly',
  d0: V.norm([-0.05, 0.72, 0.7]), d1: V.norm([0.72, -0.68, -0.26]),
  hint0: [-1, -0.2, 0.2], hint1: [0, -0.2, 1],
  anchorY: +(process.env.AY ?? 205), lean: 8, rackX: +(process.env.RX ?? -35),
  rows: (set, info) => {
    set('Arm path', 'setup', `Arms up and out, ${info.elev0} of elevation`);
    set('Arm path', 'peak', `Hands together in front of the hips (${info.elev1} of elevation), ${info.gap} cm apart`);
  },
});
