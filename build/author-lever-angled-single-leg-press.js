// Lever Angled Single Leg Press (GymVisual; movement reference only, the page could not be read): single-leg press on an
// angled plate-loaded lever leg press (back pad 45 degrees back from vertical, push 30 degrees up from the floor; prop kind
// 'sled', type leg_press in lever mode, the footplate on an arm swinging about a pivot above it). The right foot presses the
// middle of the plate from a knee at about 95 degrees to nearly straight; the left foot rests flat on the floor beside the
// seat; hands on the side handles. The plate follows the ball of the right foot on its arc. Authored on the right leg.
// Family gear-g3lower.js legPress.
const G = require('./families/gear-g3lower');
G.legPressAuthor('lever-angled-single-leg-press', { mode: 'lever', legs: 'r', seat: { x: -20, y: 44, d: 40, w: 46, t: 8 }, back: { x: -38, y: 46, h: 70, w: 44, t: 9, angle: 45 }, dirDeg: 30, plateTilt: 22, h: -3, radius: 100, stance: 10, toe: 8, kTop: 10, kBot: 95, handleZ: 34, freeFoot: [30, 16] });
