// Sled Full Hack Squat (GymVisual; movement reference only, the page could not be read): squat on a plate-loaded hack squat
// sled (prop kind 'sled', type hack_squat, src/gear/g3lower-sled.js). The back rests on the carriage pad, reclined 30 degrees,
// with the shoulders under the shoulder pads and the hands on the carriage handles; the feet stand hip width on the fixed
// platform (tilted 10 degrees toes up), toes out 12 degrees. The carriage can only slide along the rails, so the trunk keeps its
// angle and the hips travel on a straight line parallel to the rails: the body translates down the rails while the knees bend
// from about 10 to about 128 degrees, then drives back up. The carriage follows the top of the shoulders exactly (the trunk
// only translates). Bilateral. Family build/families/gear-g3lower.js (hackSquat / hackAuthor).
const G = require('./families/gear-g3lower');
G.hackAuthor('sled-full-hack-squat', { lean: 30, beta: 42, kBot: 128, pf: 10 });
