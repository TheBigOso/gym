// Diamond Push-up (GymVisual #7571, page not readable; movement from the name): high plank on the balls of the feet with the
// hands together under the sternum, thumbs and index fingers touching in a diamond (fingers turned in about 40 degrees);
// lower as one piece with the elbows travelling back and a little out until the chest is just above the hands, press up.
// Bilateral. Palms planted (arm contacts, constant targets, palms turned in), feet planted (leg contacts).
const L = require('./lib');
const B = require('./families/b4-floorpush');
const X = require('./families/b6-14');
const meta = require('./meta/diamond-push-up.json');

const HAND_X = 42;     // wrists under the sternum, behind the shoulder joints at the top
const HAND_Z = 12.5;   // wrist |z|: with the palms turned in, the fingertips meet on the midline (diamond)
const YAW = 40;        // fingers turned in (deg)
const BOT_CHEST = 11;  // bottom: chest this many cm above the floor (the hands are under it)
const F = B.makePushG({ handY: 0, handZ: HAND_Z, ankleZ: 8, footTilt: -8, flarePole: [-1, 0.3, 0.8] });
F.contacts[0].handRot = X.handYaw('r', YAW); F.contacts[1].handRot = X.handYaw('l', YAW);
const T = X.T5(meta);
const out = X.pushAuthor(meta, F, { handX: HAND_X, botChest: BOT_CHEST, T,
  kin: (set, top, bot) => X.pushKin(set, top, bot, { T, botNote: `chest ${BOT_CHEST} cm above the floor`, handNote: (s) => `Wrists ${2 * HAND_Z} cm apart, fingers turned in ${YAW}° so the thumbs and index fingers meet (shoulder joints ${Math.round(s.shW)} cm apart)` }) });
// hands must not pass through each other: the right fingertip stays on its side of the midline
const tl = L.R.buildTimeline(out.ex); let tipZ = 1e9;
for (let i = 0; i <= 100; i++) { const W = L.R.evalPose(L.rig, tl.pose((i / 100) * tl.duration), out.ex.contacts); tipZ = Math.min(tipZ, W.handtip_r.p[2]); }
console.log(`  right fingertip z min ${tipZ.toFixed(2)}`);
if (tipZ < -0.6) { console.error('FAIL: hands overlap'); process.exitCode = 1; }
