// Lever Belt Bulgarian Split Squat (GymVisual; movement reference only, the page could not be read): the authored dumbbell-bulgarian-split-squat
// movement on a plate-loaded belt squat machine (prop kind 'lever_machine', custom geometry on the calf_raise preset): the load
// hangs from a hip belt (held item kind 'sled', item 'belt', mounted between the hip joints) whose front ring sits on the end of
// a lever pivoting in front of and below the athlete; the arm runs back along the midline. The base loop is resampled
// densely and each key's root is shifted fore-aft over the planted feet so the ring stays exactly on the lever's arc; the
// hands hold a fixed handle bar in front (solved per key). Family gear-g3lower.js beltAuthor / leverFromBase.
const G = require('./families/gear-g3lower');
G.beltAuthor('lever-belt-bulgarian-split-squat', 'dumbbell-bulgarian-split-squat', { handleAhead: 42, handleDrop: 36, fit: { x: [60, 120], y: [-90, -10] } });
