// Lever Seated Calf Press (GymVisual; movement reference only, the page could not be read): calf press on the seated lever
// leg press (seat 46 cm, back pad 20 degrees back from vertical; prop kind 'sled', type leg_press in lever mode). Legs nearly
// straight (knees held at about 12 degrees), balls of the feet on the bottom edge of the footplate, hands on the side
// handles. The knees stay still: the ankles alone swing the plate, from a calf stretch (feet 15 degrees past flat on the
// plate) to pointed toes (30 degrees the other way); for each ankle angle the lever angle is solved so the knee angle stays
// the same, and the plate follows the balls of the feet on its arc. Bilateral. Family gear-g3lower.js legPress (calf mode).
const G = require('./families/gear-g3lower');
G.legPressAuthor('lever-seated-calf-press', { mode: 'lever', seat: { x: -10, y: 46, d: 40, w: 46, t: 8 }, back: { x: -28, y: 48, h: 68, w: 44, t: 9, angle: 20 }, dirDeg: 10, plateTilt: 22, h: 0, footOff: -30, radius: 95, stance: 12, toe: 6, calf: { knee: 12, dorsi: 15, plantar: 30 } });
