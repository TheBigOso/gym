// Close-grip Push-up (GymVisual #025912): high plank with the hands under the chest, closer than shoulder width, on the
// balls of the feet; lower as one piece with the elbows tucked back along the ribs until the chest is just above the hands,
// then press up. Bilateral. Palms planted with arm contacts (constant targets), feet with leg contacts. Family b4-floorpush.js
// (the batch 2 push-up solver; the top is solved for straight drawn arms with the palms on the floor).
const L = require('./lib');
const { clone } = L;
const B = require('./families/b4-floorpush');
const meta = require('./meta/close-grip-push-up.json');

const HAND_X = 44;     // wrists under the lower chest, a little behind the shoulder joints at the top
const HAND_Z = 11;     // wrist |z|: 22 cm apart, inside the shoulder joints (|z| 18.9)
const BOT_CHEST = 12;  // bottom: chest (rig shape) this many cm above the floor (the hands are under it)
const F = B.makePushG({ handY: 0, handZ: HAND_Z, ankleZ: 8, footTilt: -8, flarePole: [-1, 0.25, 0.12] });
const T = (() => { const ph = meta.timeline.phases; return { hold: ph[0].end, down: ph[1].end - ph[0].end, pause: ph[2].end - ph[1].end, up: ph[3].end - ph[2].end, D: meta.timeline.duration }; })();
const { poses, keyframes } = F.rep(HAND_X, { meshSlack: 0.5, botChest: BOT_CHEST, T });

const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const sw = F.sweep(ex), top = F.stats(poses.top), bot = F.stats(poses.bottom);
const d = (v) => `≈${Math.round(v)}°`, kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Hand width', 'setup', `Wrists ${2 * HAND_Z} cm apart (shoulder joints ${Math.round(top.shW)} cm): about ${Math.round((100 * 2 * HAND_Z) / top.shW)}% of shoulder width`); set('Hand width', 'peak', 'Unchanged (hands planted)');
set('Elbow flexion', 'setup', `${d(top.drawnElbow)} on the drawn arm (straight, not locked; rig channel ${d(top.elbow)})`); set('Elbow flexion', 'peak', `${d(bot.elbow)} at the bottom (chest ${BOT_CHEST} cm above the floor)`);
set('Elbow tuck', 'setup', `${d(top.flare)} (arms near vertical)`); set('Elbow tuck', 'peak', `${d(bot.flare)} at the bottom`);
set('Body line', 'setup', `Trunk ${d(top.bodyAng)} above horizontal; trunk-to-leg bend ${top.bend.toFixed(1)}°`); set('Body line', 'peak', `Trunk ${d(bot.bodyAng)}; bend ${bot.bend.toFixed(1)}°`);
set('Wrist extension', 'setup', d(top.wristExt)); set('Wrist extension', 'peak', `${d(bot.wristExt)} at the bottom`);
set('Tempo', 'setup', `Top ${T.hold} s`); set('Tempo', 'peak', `${T.down.toFixed(1)} s down, ${T.pause.toFixed(1)} s pause, ${T.up.toFixed(1)} s up, ${(T.D - T.hold - T.down - T.pause - T.up).toFixed(1)} s at the top`);
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
const f1 = (s) => `elbow ${s.elbow.toFixed(0)} drawn ${s.drawnElbow.toFixed(0)} flare ${s.flare.toFixed(0)} wristExt ${s.wristExt.toFixed(0)} chest ${s.chestY.toFixed(1)} sh ${s.sh.toFixed(1)} shAhead ${s.shAhead.toFixed(1)} body ${s.bodyAng.toFixed(1)} bend ${s.bend.toFixed(1)} knee ${s.knee.toFixed(0)} dorsi ${s.dorsi.toFixed(0)}`;
console.log(`Close-grip Push-up: wrote ${L.write(ex)}\n  top: ${f1(top)}\n  bottom: ${f1(bot)}\n  sweep ${JSON.stringify(sw)}`);
if (sw.arm > 0.05 || sw.leg > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (sw.floor < -0.5) { console.error('FAIL: below the floor'); process.exitCode = 1; }
