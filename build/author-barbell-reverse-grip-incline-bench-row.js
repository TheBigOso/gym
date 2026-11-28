// Barbell Reverse Grip Incline Bench Row (GymVisual #9707; page not readable here, movement from the name and standard
// coaching): adjustable bench at 40 degrees, straddling the seat with the chest on the pad, chin just over the top, the
// balls of the feet planted behind (the body solve of author-chest-supported-dumbbell-row.js). Underhand grip (palms
// forward, right thumb out) about shoulder width (46 cm between the handle centres); the bar hangs from straight arms in
// front of the pad, then is rowed straight up with the elbows close to the sides until it nears the underside of
// the pad, shoulder blades squeezing; pause; lower slowly. The chest stays on the pad. b6-02.js inclineRow (top point found
// along the bar path against the bench solids, arms by b5-bbhinge.js barArms from the top down). Bilateral.
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-reverse-grip-incline-bench-row.json');
const ENV = (k, d) => +(process.env[k] ?? d);
W6.inclineRow(meta, { name: 'Barbell Reverse Grip Incline Bench Row', gw: ENV('GW', 46), thumb: [0, 0, 1], elbow: [ENV('EU', -20), ENV('EZ', 7)], back: ENV('BK', 0), slack: ENV('SL', -1), dx: ENV('DX', 9), pron: process.env.PR ? +process.env.PR : null });
