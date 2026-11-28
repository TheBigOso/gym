// Close grip Push-up on knees (GymVisual #14727, page not readable; movement from the name): knee plank on a mat (knees behind
// the hips, shins flat, insteps down), hands under the chest closer than shoulder width; lower as one piece about the knees
// with the elbows tucked until the chest is just above the hands, then press up. Bilateral. Palms planted (arm contacts,
// constant targets); legs planted at the ankles with world-fixed feet, the knee kept on its mat point (b6-14 makeKneePush).
const L = require('./lib');
const H = require('./families/hips');
const X = require('./families/b6-14');
const meta = require('./meta/close-grip-push-up-on-knees.json');

const HAND_Z = 11;     // wrist |z|: 22 cm apart, inside the shoulder joints
const SH_AHEAD = -3;   // top: shoulders 3 cm behind the wrists (hands under the lower chest)
const BOT_CHEST = 10;  // bottom: chest this many cm above the floor
const F = X.makeKneePush({ handZ: HAND_Z, flarePole: [-1, 0.3, 0.4] });
const HAND_X = F.handXFor(SH_AHEAD);
const T = X.T5(meta);
const { poses, keyframes } = F.rep(HAND_X, { topElbow: 8, botChest: BOT_CHEST, T });
const ex = H.module_(meta, F.contacts, poses, keyframes);
const sw = F.sweep(ex), top = F.stats(poses.top), bot = F.stats(poses.bottom);
X.pushKin(H.setKin(ex), top, bot, { T, botNote: `chest ${BOT_CHEST} cm above the floor`, handNote: (s) => `Wrists ${2 * HAND_Z} cm apart (shoulder joints ${Math.round(s.shW)} cm): about ${Math.round((100 * 2 * HAND_Z) / s.shW)}% of shoulder width; knees ${Math.round(HAND_X - F.K.r[0])} cm behind the wrists` });
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'trunkFlexion');
const f1 = (s) => `elbow ${s.elbow.toFixed(0)} flare ${s.flare.toFixed(0)} chest ${s.chestY.toFixed(1)} shAhead ${s.shAhead.toFixed(1)} body ${s.bodyAng.toFixed(1)} bend ${s.bend.toFixed(1)} knee ${s.knee.toFixed(0)} dorsi ${s.dorsi.toFixed(0)} kneeErr ${s.kneeErr.toFixed(2)}`;
console.log(`Close grip Push-up (on knees): wrote ${L.write(ex)} handX ${HAND_X}\n  top: ${f1(top)}\n  bottom: ${f1(bot)}\n  sweep ${JSON.stringify(sw)} peak ${pk.toFixed(1)}`);
X.finishChecks(ex, 'close-grip-push-up-on-knees', sw);
if (sw.knee > 0.6) { console.error('FAIL: knee leaves its mat point'); process.exitCode = 1; }
