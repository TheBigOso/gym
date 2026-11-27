// Push-up (GymVisual #066212): high plank, hands a little wider than the shoulders, palms flat, on the balls of the
// feet, body in one straight line; lower as one piece with the elbows tucked about 30-45 degrees until the chest is a few
// cm above the floor, then press back up. Bilateral. Palms are planted with arm contacts (constant targets, palm-down
// world orientation); the feet are planted on the balls with leg contacts. Every key is solved (family push.js).
const L = require('./lib');
const { r1, clone } = L;
const { makePush } = require('./families/push');
const meta = require('./meta/push-up.json');

const HAND_X = 46;     // wrists under / just ahead of the shoulders at the top
const HAND_Z = 25;     // wrist |z|: hands a little wider than the shoulder joints (|z| 18.9)
const BOT_CHEST = 11;  // bottom: chest (rig shape) this many cm above the floor
const F = makePush({ handY: 0, handZ: HAND_Z, ankleZ: 8, footTilt: -8, flarePole: [-1, 0.4, 0.45] });
const T = { hold: 0.8, down: 1.8, pause: 0.3, up: 1.1, D: 5.0 };
const { poses, keyframes } = F.rep(HAND_X, { topElbow: 8, botChest: BOT_CHEST, T });

const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const sw = F.sweep(ex), top = F.stats(poses.top), bot = F.stats(poses.bottom);
const d = (v) => `≈${Math.round(v)}°`, kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Elbow flexion', 'setup', `${d(top.elbow)} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(bot.elbow)} at the bottom (chest ${BOT_CHEST} cm above the floor, shoulder joint ${Math.round(bot.sh)} cm)`);
set('Elbow tuck', 'setup', `${d(top.flare)} (arms near vertical)`); set('Elbow tuck', 'peak', d(bot.flare));
set('Hand width', 'setup', `Wrists ${2 * HAND_Z} cm apart (shoulder joints ${Math.round(top.shW)} cm): about ${Math.round((100 * 2 * HAND_Z) / top.shW)}% of shoulder width`); set('Hand width', 'peak', 'Unchanged (hands planted)');
set('Body line', 'setup', `Trunk ${d(top.bodyAng)} above horizontal; trunk-to-leg bend ${top.bend.toFixed(1)}°`); set('Body line', 'peak', `Trunk ${d(bot.bodyAng)} above horizontal; bend ${bot.bend.toFixed(1)}°`);
set('Wrist extension', 'setup', d(top.wristExt)); set('Wrist extension', 'peak', `${d(bot.wristExt)} at the bottom`);
set('Load on the hands', 'setup', 'About 64% of body mass (measured, Wurm et al.)'); set('Load on the hands', 'peak', '–');
set('Tempo', 'setup', 'Top 0.8 s'); set('Tempo', 'peak', '1.8 s down, 0.3 s pause, 1.1 s up, 1.0 s at the top');
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
const f1 = (s) => `elbow ${s.elbow.toFixed(0)} flare ${s.flare.toFixed(0)} wristExt ${s.wristExt.toFixed(0)} chest ${s.chestY.toFixed(1)} sh ${s.sh.toFixed(1)} shAhead ${s.shAhead.toFixed(1)} body ${s.bodyAng.toFixed(1)} bend ${s.bend.toFixed(1)} knee ${s.knee.toFixed(0)} dorsi ${s.dorsi.toFixed(0)}`;
console.log(`Push-up: wrote ${L.write(ex)}\n  top: ${f1(top)}\n  bottom: ${f1(bot)}\n  sweep ${JSON.stringify(sw)}`);
if (sw.arm > 0.05 || sw.leg > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
