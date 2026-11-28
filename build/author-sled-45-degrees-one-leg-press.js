// Sled 45 degrees One Leg Press (GymVisual; movement reference only, the page could not be read): single-leg press on a
// 45-degree plate-loaded leg press sled (prop kind 'sled', type leg_press, src/gear/g3lower-sled.js). Seated with the hips
// on the seat and the back on the pad (reclined 55 degrees from vertical), hands on the side handles. The right foot pushes
// the middle of the footplate (plate turned 30 degrees from square to the rails, toes out 8 degrees); the left foot rests
// flat on the floor beside the seat. The carriage slides on 45-degree rails and follows the ball of the right foot exactly,
// from a nearly straight knee to about 95 degrees and back. Authored on the right leg. Family gear-g3lower.js legPress.
const G = require('./families/gear-g3lower');
G.legPressAuthor('sled-45-degrees-one-leg-press', { mode: 'sled', legs: 'r', seat: { x: -30, y: 42, d: 40, w: 46, t: 8 }, back: { x: -48, y: 44, h: 70, w: 46, t: 9, angle: 55 }, dirDeg: 45, plateTilt: 30, h: -5, stance: 11, toe: 8, kTop: 10, kBot: 95, handleZ: 34, freeFoot: [30, 16] });
