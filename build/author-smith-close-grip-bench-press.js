// Smith Close Grip Bench Press (GymVisual; movement reference only, the page could not be read): the close-grip bench press
// (b5-bbpress.js lyingPress: flat bench base, 36 cm between the bar grips, elbows tucked about 22 degrees, bottom on the
// lower chest 16 cm toward the feet from the shoulder joints) with the bar path made vertical for the Smith machine: the
// rails run through the touch point, so the bar goes straight down to the lower chest and straight back up (no curve back
// over the shoulders). Pegs 5 cm under the top, safety stops 4 cm under the chest touch. Bilateral.
const G = require('./families/gear-g3lower');
G.smithPressAuthor('smith-close-grip-bench-press', { GW: 36, bottomDX: 16, flare: 22, dip: 38, foreW: 1.0, wristBot: -15, wristTop: -8, baseId: 'barbell-close-grip-bench-press', where: 'on the lower chest (bar resting on the rig chest shapes)' });
