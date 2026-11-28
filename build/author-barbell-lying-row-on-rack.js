// Barbell Lying Row on Rack (GymVisual #14306; page not readable here, movement from the name and standard coaching):
// lying face down on a high flat bench (88 cm pad) set inside a power rack, chest and thighs on the pad, chin past the
// end, legs straight; overhand grip about shoulder width (54 cm between the handle centres). Each rep starts with the bar
// resting on the rack's safety pins under straight arms, rows it up with the elbows driving back toward the hips until it
// touches the underside of the bench below the lower chest, squeezes, lowers slowly and sets it back on the pins. Only
// the arms and the shoulder blades move. b6-02.js proneRow (body on the pad, arms on the bar via b5-bbhinge.js barArms,
// bar / hands / body checked against the bench solids). Bilateral.
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-lying-row-on-rack.json');
const ENV = (k, d) => +(process.env[k] ?? d);
W6.proneRow(meta, { name: 'Barbell Lying Row on Rack', padY: ENV('PAD', 88), gw: ENV('GW', 54), topDX: ENV('TDX', -12), elbow: [ENV('EU', -18), ENV('EZ', 8)], pins: true, slack: ENV('SL', -1), pron: ENV('PR', 150) });
