// Lever Seated Leg Press (GymVisual; movement reference only, the page could not be read): seated leg press on a
// plate-loaded lever machine (prop kind 'sled', type leg_press in lever mode: the footplate rides on an arm that swings
// about a pivot above and in front of the plate; src/gear/g3lower-sled.js). Seat 46 cm high, back pad 20 degrees back
// from vertical, hands on the side handles. Both feet hip width in the middle of the plate (plate turned 15 degrees,
// toes out 8 degrees) press it from knees at about 90 degrees to nearly straight; the plate swings on its arc and follows
// the balls of the feet exactly (the plate's turn is part of the foot path). Bilateral. Family gear-g3lower.js legPress.
const G = require('./families/gear-g3lower');
G.legPressAuthor('lever-seated-leg-press', { mode: 'lever', seat: { x: -10, y: 46, d: 40, w: 46, t: 8 }, back: { x: -28, y: 48, h: 68, w: 44, t: 9, angle: 20 }, dirDeg: 10, plateTilt: 15, h: 0, radius: 95, stance: 13, toe: 8, kTop: 10, kBot: 90 });
