// Smith Low Bar Squat (GymVisual; movement reference only, the page could not be read): the authored free-barbell
// module barbell-low-bar-squat turned into a Smith machine move (build/families/gear-g3lower.js smithify, mode 'root'). The guide-rail line is
// fitted to the free-bar path (incline clamped to 8 degrees) and every dense key is corrected so the hands' midpoint sits
// on the rail line (the body shifts fore-aft over the planted feet, as the bar rests on the back). Same body motion, timing,
// stance and grip as the base otherwise; pegs a few cm under the top bar height, safety stops just under the bottom.
const G = require('./families/gear-g3lower');
G.smithAuthor('smith-low-bar-squat', 'barbell-low-bar-squat', { mode: 'root', skip: /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$|^deltoid_/ });
