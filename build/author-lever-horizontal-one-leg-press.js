// Lever Horizontal One leg Press (GymVisual; movement reference only, the page could not be read): the horizontal lever leg
// press (back pad 35 degrees back from vertical, push 5 degrees up; prop kind 'sled', type leg_press in lever mode) with one
// leg: the right foot presses the middle of the plate from a knee at about 90 degrees to nearly straight, the left foot rests
// flat on the floor beside the seat. The plate follows the ball of the right foot on its arc. Authored on the right leg.
// Family gear-g3lower.js legPress.
const G = require('./families/gear-g3lower');
G.legPressAuthor('lever-horizontal-one-leg-press', { mode: 'lever', legs: 'r', seat: { x: -10, y: 46, d: 40, w: 46, t: 8 }, back: { x: -28, y: 48, h: 68, w: 44, t: 9, angle: 35 }, dirDeg: 5, plateTilt: 20, h: 0, radius: 100, stance: 10, toe: 8, kTop: 10, kBot: 90, handleZ: 34, freeFoot: [30, 16] });
