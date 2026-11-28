// Barbell Lying Seal Row on Rack (GymVisual #19837; page not readable here, movement from the name and standard coaching):
// lying face down on a high flat bench (88 cm pad) set inside a power rack, chest and thighs on the pad, chin past the
// end, legs straight; overhand grip a little wider than the shoulders (64 cm between the handle centres). From a dead
// hang just above the safety pins the bar is rowed strictly, elbows flaring out to the sides, until it touches the
// underside of the bench below the mid chest; squeeze, lower slowly to long arms (the pins only catch a missed rep).
// b6-02.js proneRow, as the lying row on the rack with a wider grip, flared elbows and a higher touch point. Bilateral.
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-lying-seal-row-on-rack.json');
const ENV = (k, d) => +(process.env[k] ?? d);
W6.proneRow(meta, { name: 'Barbell Lying Seal Row on Rack', padY: ENV('PAD', 88), gw: ENV('GW', 64), topDX: ENV('TDX', -5), elbow: [ENV('EU', -2), ENV('EZ', 20)], pins: false });
