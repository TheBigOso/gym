// Barbell Reverse Curl (GymVisual #4999, Barbell Reverse Curl; page not readable here, movement from the name): standing
// tall, feet about hip width (planted leg contacts), overhand grip (palms down, right thumb toward the midline) about
// shoulder width (42 cm between the handle points), the bar resting just off the front of the thighs. Both arms curl the
// bar up about pinned elbows (a small forward drift at the top), knuckles leading and wrists straight, short squeeze, slow
// lower. The start angle is the smallest that keeps the bar shaft clear of the thighs (b5-bbarms.js curlPoses). Bilateral.
const L = require('./lib');
const { r1 } = L;
const C = require('./families/b3-curls');
const A = require('./families/b5-bbarms');
const meta = require('./meta/barbell-reverse-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const U = ENV('U', 8), EZ = ENV('EZ', 21.5), A1 = ENV('A1', 135); // upper arm forward of vertical (deg), elbow z, top grip angle
const { contacts, base } = C.standing({}, { sc: { protract: -2, elevate: 0 } });
const S = L.fk(base, contacts).shoulder_r.p, UA = L.V.len(L.rig.byId.elbow_r.offset);
const E = [S[0] + UA * Math.sin((U * Math.PI) / 180), 0, EZ];
E[1] = S[1] - Math.sqrt(UA * UA - (E[0] - S[0]) ** 2 - (E[2] - S[2]) ** 2);
A.buildCurl(meta, {
  base, contacts, E, a1: A1, under: false, drift: [3, 1, 0], name: 'Barbell Reverse Curl',
  tempo: ['Bar on the thighs 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom'],
  rows: (set, { sw, Wb }) => {
    set('Bar clearance', 'setup', `Bar ${r1(sw.barBody)} cm or more off the body; ${A.GW} cm between the handle points, overhand`);
    set('Bar clearance', 'peak', `Grip width steady within ${sw.widthRange} cm over the rep; nearest the bar comes: ${sw.barBodyAt[0]}`);
  },
});
