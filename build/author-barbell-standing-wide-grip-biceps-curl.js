// Barbell Standing Wide Grip Biceps Curl (GymVisual #5292; page not readable here, movement from the name and standard
// coaching): standing tall, feet about hip width (planted leg contacts), underhand grip (palms forward/up, right thumb
// out) wider than the shoulders (60 cm between the handle points), elbows at the sides, so the forearms angle out to the
// hands. The bar starts just off the front of the thighs; both arms curl it up about pinned elbows (a small forward drift
// at the top), short squeeze, slow lower. The start angle is the smallest that keeps the bar shaft clear of the thighs.
// b6-02.js curlPosesW (the b5-bbarms.js barbell curl with the grip width as a parameter). Bilateral.
const L = require('./lib');
const { r1 } = L;
const C = require('./families/b3-curls');
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-standing-wide-grip-biceps-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const GW = ENV('GW', 60), U = ENV('U', 4), EZ = ENV('EZ', 22), A1 = ENV('A1', 150);
const { contacts, base } = C.standing({}, { sc: { protract: -2, elevate: 0 } });
const S = L.fk(base, contacts).shoulder_r.p, UA = L.V.len(L.rig.byId.elbow_r.offset);
const E = [S[0] + UA * Math.sin((U * Math.PI) / 180), 0, EZ];
E[1] = S[1] - Math.sqrt(UA * UA - (E[0] - S[0]) ** 2 - (E[2] - S[2]) ** 2);
W6.buildCurlW(meta, {
  base, contacts, E, a1: A1, gw: GW, under: true, drift: [4, 1.5, 0], name: 'Barbell Standing Wide Grip Biceps Curl',
  tempo: ['Bar on the thighs 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom'],
  rows: (set, { sw }) => {
    set('Bar clearance', 'setup', `Underhand, ${GW} cm between the handle points (elbows ${r1(2 * EZ)} cm apart); bar ${r1(sw.barBody)} cm or more off the body`);
    set('Bar clearance', 'peak', `Grip width steady within ${sw.widthRange} cm over the rep; nearest the bar comes: ${sw.barBodyAt[0]}`);
  },
});
