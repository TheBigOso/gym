// Band Chest Fly (GymVisual, Band Chest Fly; movement reference only, page not readable): standing in a staggered stance
// (right foot forward, knees soft, planted leg contacts) with the back to a rack. A band is looped round each rack upright
// behind the lifter at about shoulder height, one band end per hand. From the arms out to the sides at shoulder height
// (a little behind the body line, elbows bent about 20 degrees, palms forward) the straight-ish arms hug forward in a wide
// arc until the hands meet in front of the chest, then open again under control. The elbow angle stays fixed (a fly, not
// a press). Bilateral (right arm solved, left mirrored). Shared fly set-up: build/families/b6-10.js flyModule.
const G = require('./families/b6-10');
const meta = require('./meta/band-chest-fly.json');
const { V } = require('./lib');
G.flyModule(meta, {
  name: 'Band Chest Fly',
  d0: V.norm([-0.12, -0.05, 1]), d1: V.norm([1, -0.08, -0.29]),
  hint0: [-1, -0.45, 0], hint1: [0, -0.45, 1],
  anchorDY: 0, lean: 4, rackX: -30,
  rows: (set, info) => {
    set('Horizontal adduction', 'setup', `Arms ${info.hAbd0} behind the frontal plane, hands at shoulder height`);
    set('Horizontal adduction', 'peak', `Hands together in front of the chest, ${info.gap} cm apart`);
    set('Arm height', 'setup', `${info.elev0} of elevation`); set('Arm height', 'peak', `${info.elev1} of elevation`);
  },
});
