// Smith Reverse Grip Bent Over Row (GymVisual; movement reference only, the page could not be read): the authored free-barbell
// module barbell-reverse-grip-bent-over-row turned into a Smith machine move (build/families/gear-g3lower.js smithify, mode 'arms'). The guide-rail line is
// fitted to the free-bar path (incline clamped to 8 degrees) and every dense key is corrected so the hands' midpoint sits
// on the rail line (the arms are re-solved onto the line, keeping the palms and elbows as in the base). Same body motion, timing,
// stance and grip as the base otherwise; pegs a few cm under the top bar height, safety stops just under the bottom.
const G = require('./families/gear-g3lower');
G.smithAuthor('smith-reverse-grip-bent-over-row', 'barbell-reverse-grip-bent-over-row', { mode: 'arms' });
