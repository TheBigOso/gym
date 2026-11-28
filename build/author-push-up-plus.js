// Push-Up Plus (GymVisual 7535, movement reference only; page not readable at authoring time): a full push-up (high plank,
// hands a little wider than the shoulders, lower as one piece with the elbows tucked about 30-45 degrees until the chest is
// a few cm above the floor, press back up), then the "plus": with the arms straight, push the floor away so the shoulder
// blades spread apart (protraction) and the upper back rises a little; hold, then settle back to the plank. Bilateral.
// Palms and the balls of the feet planted (family push.js, as author-push-up.js); the plus keys are re-solved with the
// shoulder blades protracted (b6-15.js pushKeyer) so the trunk rises between the planted hands and feet.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const { makePush } = require('./families/push');
const B = require('./families/b6-15');
const meta = require('./meta/push-up-plus.json');

const HAND_X = 46, HAND_Z = 25, BOT_CHEST = 11;
const F = makePush({ handY: 0, handZ: HAND_Z, ankleZ: 8, footTilt: -8, flarePole: [-1, 0.4, 0.45] });
const T = { hold: 0.6, down: 1.6, pause: 0.3, up: 1.0, D: 3.5 };
const { poses, keyframes } = F.rep(HAND_X, { topElbow: 13, botChest: BOT_CHEST, T });
keyframes.pop();   // the rep ends at the top at 3.5 s; the plus follows
const K = B.pushKeyer(F);
const PLUS = { protract: 26, elevate: 2 };
// the plus: keys every few degrees of protraction (straight arms), so the interpolated shoulders never outreach the hands
const PL = [[12, 0.5, 'plus0'], [17, 1, 'plus1'], [22, 1.5, 'plus2'], [PLUS.protract, PLUS.elevate, 'plus']];
for (const [pr, el, n] of PL) { const f = (pr - 8) / (PLUS.protract - 8); poses[n] = K.key(HAND_X, { armD: L.reach(13), sc: { protract: pr, elevate: el }, neck: [r1(1.4 + 1.1 * f), r1(1.6 + 0.9 * f)], spine: [0, r1(2 * f), r1(4 * f)] }); }
keyframes.push({ t: 3.62, pose: 'plus0' }, { t: 3.76, pose: 'plus1' }, { t: 3.92, pose: 'plus2' }, { t: 4.1, pose: 'plus' }, { t: 4.5, pose: 'plus' }, { t: 4.62, pose: 'plus2' }, { t: 4.76, pose: 'plus1' }, { t: 4.88, pose: 'plus0' }, { t: 5.0, pose: 'top' }, { t: 5.4, pose: 'top' });
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [{ id: 'mat', kind: 'mat', center: [-10, 0, 0], size: [183, 0.6, 61] }];
const sw = F.sweep(ex), top = F.stats(poses.top), bot = F.stats(poses.bottom), pl = F.stats(poses.plus);
const Wt = L.fk(poses.top, F.contacts), Wp = L.fk(poses.plus, F.contacts);
const rise = Wp.neck_c7.p[1] - Wt.neck_c7.p[1];
const d = (v) => `≈${Math.round(v)}°`, set = H.setKin(ex);
set('Elbow flexion', 'setup', `${d(top.elbow)} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(bot.elbow)} at the bottom (chest ${BOT_CHEST} cm above the floor); ${d(pl.elbow)} in the plus`);
set('Shoulder blades', 'setup', `Plank: clavicle protraction ${poses.top.ch.sc_r.protract}°`); set('Shoulder blades', 'peak', `Plus: protraction ${PLUS.protract}°, upper back ${rise.toFixed(1)} cm higher with straight arms`);
set('Body line', 'setup', `Trunk ${d(top.bodyAng)} above horizontal; trunk-to-leg bend ${top.bend.toFixed(1)}°`); set('Body line', 'peak', `Bottom: trunk ${d(bot.bodyAng)}, bend ${bot.bend.toFixed(1)}°; plus: bend ${pl.bend.toFixed(1)}°`);
set('Hand width', 'setup', `Wrists ${2 * HAND_Z} cm apart (shoulder joints ${Math.round(top.shW)} cm)`); set('Hand width', 'peak', 'Unchanged (hands planted)');
set('Tempo', 'setup', 'Top 0.6 s'); set('Tempo', 'peak', '1.6 s down, 0.3 s pause, 1.0 s up, 0.6 s into the plus, 0.4 s hold, 0.5 s settle');
console.log(`Push-Up Plus: wrote ${L.write(ex)}\n  plus rise ${rise.toFixed(1)} cm, plus elbow ${pl.elbow.toFixed(0)} armD ${pl.armD.toFixed(1)}\n  sweep ${JSON.stringify(sw)}`);
const viol = [];
for (const [n, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = L.rig.byId[j] && L.rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${n}.${j}.${c}=${p.ch[j][c]}`); }
if (sw.arm > 0.05 || sw.leg > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (sw.floor < -0.5) { console.error('FAIL: body below the floor'); process.exitCode = 1; }
if (viol.length) { console.error(`FAIL: joint limits ${viol.join(', ')}`); process.exitCode = 1; }
if (rise < 1) { console.error('FAIL: the plus does not lift the upper back'); process.exitCode = 1; }
