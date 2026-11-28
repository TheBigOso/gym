// Dumbbell Lying Alternate Extension (GymVisual #9137, page not readable here): lying face up on a flat bench, head, upper
// back and buttocks on the pad, feet planted (leg contacts). A dumbbell in each hand, palms facing each other, both arms
// straight up over the shoulders. The right elbow bends, lowering the dumbbell back beside the head, and straightens while
// the left arm holds straight; then the left arm does the same. Upper arms stay vertical (constant shoulder channels).
// Both sides in one loop (authoredSide bilateral). Family b6-05.js (lyingAltExt).
const F = require('./families/b6-05');
const meta = require('./meta/dumbbell-lying-alternate-extension.json');
F.lyingAltExt(meta, { flexBot: +(process.env.FLEXB ?? 104), label: 'Dumbbell Lying Alternate Extension' });
