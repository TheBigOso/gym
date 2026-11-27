// Incline Push-up (GymVisual #049312): hands on the edge of a 45 cm bench, a little wider than the shoulders, palms flat
// on top; feet on the balls on the floor, body in one straight line; lower the chest to the edge with the elbows tucked
// about 30-45 degrees, then press back up. Bilateral. Palms planted on the bench top with arm contacts (constant
// targets at bench height + palm thickness, palm-down world orientation); feet planted with leg contacts.
const L = require('./lib');
const { clone } = L;
const { makePush } = require('./families/push');
const meta = require('./meta/incline-push-up.json');

const BENCH_H = 45, BENCH_W = 30, BENCH_L = 110;
const HAND_X = 29;     // wrists about under the shoulders at the top
const HAND_Z = 25;     // wrist |z|: a little wider than the shoulder joints (|z| 18.9)
const EDGE_IN = 4;     // the bench's near edge sits this far behind the wrist joint (heel of the hand just inside it)
const BOT_CHEST = 3;   // bottom: chest (rig shape) this many cm above the bench top, at the edge
const F = makePush({ handY: BENCH_H, handZ: HAND_Z, ankleZ: 8, footTilt: 0, flarePole: [-1, 0.4, 0.45] });
const T = { hold: 0.8, down: 1.7, pause: 0.3, up: 1.0, D: 4.8 };
const { poses, keyframes } = F.rep(HAND_X, { topElbow: 8, botChest: BOT_CHEST, T });
const props = [{ id: 'bench', kind: 'bench', center: [HAND_X - EDGE_IN + BENCH_W / 2, 0, 0], size: [BENCH_W, BENCH_H, BENCH_L] }];

const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const sw = F.sweep(ex, props[0]), top = F.stats(poses.top), bot = F.stats(poses.bottom);
const d = (v) => `≈${Math.round(v)}°`, kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Elbow flexion', 'setup', `${d(top.elbow)} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(bot.elbow)} at the bottom (chest ${BOT_CHEST} cm above the bench edge)`);
set('Elbow tuck', 'setup', d(top.flare)); set('Elbow tuck', 'peak', d(bot.flare));
set('Hand width', 'setup', `Wrists ${2 * HAND_Z} cm apart (shoulder joints ${Math.round(top.shW)} cm): about ${Math.round((100 * 2 * HAND_Z) / top.shW)}% of shoulder width`); set('Hand width', 'peak', 'Unchanged (hands planted on the bench)');
set('Body line', 'setup', `Trunk ${d(top.bodyAng)} above horizontal; trunk-to-leg bend ${top.bend.toFixed(1)}°`); set('Body line', 'peak', `Trunk ${d(bot.bodyAng)} above horizontal; bend ${bot.bend.toFixed(1)}°`);
set('Wrist extension', 'setup', d(top.wristExt)); set('Wrist extension', 'peak', `${d(bot.wristExt)} at the bottom`);
set('Load on the hands', 'setup', `Hands ${BENCH_H} cm up: between the measured 55% (30 cm box) and 41% (61 cm box) of body mass, roughly 48% by straight-line interpolation (estimate)`); set('Load on the hands', 'peak', '–');
set('Tempo', 'setup', 'Top 0.8 s'); set('Tempo', 'peak', '1.7 s down, 0.3 s pause, 1.0 s up, 1.0 s at the top');
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
const f1 = (s) => `elbow ${s.elbow.toFixed(0)} flare ${s.flare.toFixed(0)} wristExt ${s.wristExt.toFixed(0)} chest ${s.chestY.toFixed(1)} sh ${s.sh.toFixed(1)} shAhead ${s.shAhead.toFixed(1)} body ${s.bodyAng.toFixed(1)} bend ${s.bend.toFixed(1)} knee ${s.knee.toFixed(0)} dorsi ${s.dorsi.toFixed(0)}`;
console.log(`Incline Push-up: wrote ${L.write(ex)}\n  top: ${f1(top)}\n  bottom: ${f1(bot)}\n  sweep ${JSON.stringify(sw)}`);
if (sw.arm > 0.05 || sw.leg > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (sw.prop < -0.5) { console.error('FAIL: body passes into the bench'); process.exitCode = 1; }
