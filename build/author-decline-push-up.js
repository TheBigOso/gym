// Decline Push-up (GymVisual #027912): feet on a 45 cm bench on the balls of the feet (toes curled over its far edge), hands
// on the floor a little wider than the shoulders, body in one straight line sloping down toward the head; lower as one piece
// with the elbows tucked about 30-45 degrees until the chest is a hand's width above the floor, then press up. Bilateral.
// Palms planted with arm contacts, feet planted on the bench top with leg contacts (constant targets). Family b4-floorpush.js.
const L = require('./lib');
const { clone } = L;
const B = require('./families/b4-floorpush');
const meta = require('./meta/decline-push-up.json');

const BENCH_H = 45, BENCH_W = 30, BENCH_L = 110;
const HAND_X = 55;     // wrists just behind the shoulders at the top
const HAND_Z = 25;     // wrist |z|: a little wider than the shoulder joints (|z| 18.9)
const BOT_CHEST = 16;  // bottom: chest (rig shape) this many cm above the floor (the head is lower than the chest)
const FOOT_TILT = -35; // foot orientation (deg about z from the plank foot; - = heel higher): keeps the ankle within its range
const F = B.makePushG({ handY: 0, handZ: HAND_Z, footY: BENCH_H, ankleZ: 8, footTilt: FOOT_TILT, flarePole: [-1, 0.4, 0.45] });
const W0 = L.fk(F.topKey(HAND_X, { topElbow: 8 }).pose, F.contacts);
const EDGE = +(Math.min(W0.toe_r.p[0], W0.toe_l.p[0]) - 1.5).toFixed(1); // the bench's far edge just behind the balls of the feet
const props = [meta.props[0], { id: 'bench', kind: 'bench', center: [EDGE + BENCH_W / 2, 0, 0], size: [BENCH_W, BENCH_H, BENCH_L] }];
const ph = meta.timeline.phases, T = { hold: ph[0].end, down: ph[1].end - ph[0].end, pause: ph[2].end - ph[1].end, up: ph[3].end - ph[2].end, D: meta.timeline.duration };
const { poses, keyframes } = F.rep(HAND_X, { topElbow: 8, botChest: BOT_CHEST, T });

const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
const sw = F.sweep(ex, [{ prop: props[1], skip: /^foot_/ }]), top = F.stats(poses.top), bot = F.stats(poses.bottom);
const Wb = L.fk(poses.bottom, F.contacts), headY = B.minOf(Wb, ['head', 'hair', 'nose', 'jaw']);
const d = (v) => `≈${Math.round(v)}°`, kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Elbow flexion', 'setup', `${d(top.elbow)} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(bot.elbow)} at the bottom (chest ${BOT_CHEST} cm, head ${Math.round(headY)} cm above the floor)`);
set('Elbow tuck', 'setup', d(top.flare)); set('Elbow tuck', 'peak', `${d(bot.flare)} at the bottom`);
set('Body angle', 'setup', `Trunk ${d(top.bodyAng)} from horizontal at the top (feet on a ${BENCH_H} cm bench)`); set('Body angle', 'peak', `${d(Math.abs(bot.bodyAng))} head-down at the bottom; trunk-to-leg bend ${bot.bend.toFixed(1)}°`);
set('Hand width', 'setup', `Wrists ${2 * HAND_Z} cm apart (shoulder joints ${Math.round(top.shW)} cm): about ${Math.round((100 * 2 * HAND_Z) / top.shW)}% of shoulder width`); set('Hand width', 'peak', 'Unchanged (hands planted)');
set('Load on the hands', 'setup', `Feet ${BENCH_H} cm up: between the measured 70% (30.5 cm) and 74% (61 cm) of body mass, roughly 72% by straight-line interpolation (estimate)`); set('Load on the hands', 'peak', '–');
set('Tempo', 'setup', `Top ${T.hold} s`); set('Tempo', 'peak', `${T.down.toFixed(1)} s down, ${T.pause.toFixed(1)} s pause, ${T.up.toFixed(1)} s up, ${(T.D - T.hold - T.down - T.pause - T.up).toFixed(1)} s at the top`);
const tf = (p) => L.V.angle(L.V.sub(L.fk(p, F.contacts).neck_c7.p, L.fk(p, F.contacts).pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(Math.min(tf(poses.top), tf(poses.bottom)) - 2), max: Math.ceil(Math.max(tf(poses.top), tf(poses.bottom)) + 2) };
const f1 = (s) => `elbow ${s.elbow.toFixed(0)} flare ${s.flare.toFixed(0)} wristExt ${s.wristExt.toFixed(0)} chest ${s.chestY.toFixed(1)} sh ${s.sh.toFixed(1)} shAhead ${s.shAhead.toFixed(1)} body ${s.bodyAng.toFixed(1)} bend ${s.bend.toFixed(1)} knee ${s.knee.toFixed(0)} dorsi ${s.dorsi.toFixed(0)}`;
console.log(`Decline Push-up: wrote ${L.write(ex)}\n  feet ${JSON.stringify(F.AR)} bench edge ${EDGE}\n  top: ${f1(top)}\n  bottom: ${f1(bot)} head ${headY.toFixed(1)}\n  sweep ${JSON.stringify(sw)}`);
if (sw.arm > 0.05 || sw.leg > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (sw.floor < -0.5 || sw.prop < -0.5) { console.error('FAIL: below the floor or into the bench'); process.exitCode = 1; }
