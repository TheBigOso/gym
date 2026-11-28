// Lever Horizontal Leg Press (GymVisual; movement reference only, the page could not be read): leg press on a plate-loaded
// lever machine with a reclined back pad (35 degrees back from vertical) and a nearly horizontal push (5 degrees up), prop
// kind 'sled', type leg_press in lever mode (footplate on an arm swinging about a pivot above it; src/gear/g3lower-sled.js).
// Hands on the side handles. Both feet hip width on the plate (turned 20 degrees, toes out 8 degrees) press from knees at
// about 90 degrees to nearly straight; the plate follows the balls of the feet on its arc. Bilateral. Family
// gear-g3lower.js legPress.
const G = require('./families/gear-g3lower');
G.legPressAuthor('lever-horizontal-leg-press', { mode: 'lever', seat: { x: -10, y: 46, d: 40, w: 46, t: 8 }, back: { x: -28, y: 48, h: 68, w: 44, t: 9, angle: 35 }, dirDeg: 5, plateTilt: 20, h: 0, radius: 100, stance: 13, toe: 8, kTop: 10, kBot: 90 });
