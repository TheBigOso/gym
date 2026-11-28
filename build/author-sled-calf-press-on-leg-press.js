// Sled Calf Press On Leg Press (GymVisual; movement reference only, the page could not be read): calf press on the
// 45-degree leg press sled (prop kind 'sled', type leg_press). Seated with the back on the pad (55 degrees back from
// vertical), hands on the side handles, legs nearly straight (knees held at about 12 degrees) with only the balls of the
// feet on the bottom edge of the footplate. The knees stay still: the ankles alone move the sled, from a calf stretch (the
// feet 15 degrees past flat on the plate) to pointed toes (30 degrees the other way). For each ankle angle the sled travel
// is solved so the knee angle stays the same; the carriage follows the balls of the feet (plate turned 28 degrees). Bilateral. Family
// gear-g3lower.js legPress (calf mode).
const G = require('./families/gear-g3lower');
G.legPressAuthor('sled-calf-press-on-leg-press', { mode: 'sled', seat: { x: -30, y: 42, d: 40, w: 46, t: 8 }, back: { x: -48, y: 44, h: 70, w: 46, t: 9, angle: 55 }, dirDeg: 45, plateTilt: 28, h: -5, footOff: -30, stance: 12, toe: 6, calf: { knee: 12, dorsi: 15, plantar: 30 } });
