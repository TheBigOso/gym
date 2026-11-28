// Lay Down Push-up (GymVisual #15131, page not readable; movement from the name): a dead-stop push-up. High plank on the balls
// of the feet, hands a little wider than the shoulders and level with the lower chest; lower as one piece until the chest
// rests on the mat (chin lifted, neck extended so the face clears the mat), rest a moment, then press the whole body back up
// in one line. Bilateral. Palms planted (arm contacts, constant targets), feet planted (leg contacts). Solver: b4-floorpush.
const L = require('./lib');
const B = require('./families/b4-floorpush');
const H = require('./families/hips');
const X = require('./families/b6-14');
const meta = require('./meta/lay-down-push-up.json');

const HAND_X = 42, HAND_Z = 29;  // wrists by the lower chest, 56 cm apart (keeps the elbow inside the rig's 150 degrees on the mat)
const REST_CHEST = 0.4;          // chest (rig shape) this far above the floor on the mat
const NECK_DOWN = -30;           // extra neck extension on the mat (chin clears the floor)
const F = B.makePushG({ handY: 0, handZ: HAND_Z, ankleZ: 8, footTilt: -8, flarePole: [-1, 0.4, 0.6] });
const ph = meta.timeline.phases.map((p) => p.end), D = meta.timeline.duration; // setup, lower, rest, press, reset
const top = F.topKey(HAND_X, { topElbow: 8 }).pose, cTop = F.chestMinY(L.fk(top, F.contacts));
const at = (u, neckU = u) => F.key(HAND_X, { chestY: cTop + (REST_CHEST - cTop) * u, u: Math.min(1, u), neck: NECK_DOWN * neckU }).pose;
const poses = { top }, keyframes = [{ t: 0, pose: 'top' }, { t: ph[0], pose: 'top' }];
const add = (t, n, p) => { if (p) poses[n] = p; keyframes.push({ t: +t.toFixed(3), pose: n }); };
const ND = 6;
for (let i = 1; i < ND; i++) { const u = X.ease(i / ND); add(ph[0] + ((ph[1] - ph[0]) * i) / ND, `down${i}`, at(u, Math.pow(i / ND, 1.5))); }
add(ph[1], 'rest', at(1, 1));
poses.restSettle = F.key(HAND_X, { chestY: REST_CHEST - 0.15, u: 1, neck: NECK_DOWN }).pose; // a breath on the mat
add((ph[1] + ph[2]) / 2, 'restSettle'); add(ph[2], 'rest');
const NU = 5;
for (let i = 1; i < NU; i++) { const u = 1 - X.ease(i / NU); add(ph[2] + ((ph[3] - ph[2]) * i) / NU, `up${i}`, at(u, Math.pow(u, 0.7))); }
add(ph[3], 'top'); add(D, 'top');
const ex = H.module_(meta, F.contacts, poses, keyframes);
const sw = F.sweep(ex), st = F.stats(top), sb = F.stats(poses.rest);
X.pushKin(H.setKin(ex), st, sb, { botNote: `chest resting on the mat`, handNote: (s) => `Wrists ${2 * HAND_Z} cm apart (shoulder joints ${Math.round(s.shW)} cm), level with the lower chest` });
const set = H.setKin(ex);
set('Dead stop', 'setup', 'Arms straight at the top'); set('Dead stop', 'peak', `Chest on the mat for ${(ph[2] - ph[1]).toFixed(1)} s, neck extended so the chin clears the mat`);
set('Tempo', 'setup', `Top ${ph[0]} s`); set('Tempo', 'peak', `${(ph[1] - ph[0]).toFixed(1)} s down, ${(ph[2] - ph[1]).toFixed(1)} s on the mat, ${(ph[3] - ph[2]).toFixed(1)} s up, ${(D - ph[3]).toFixed(1)} s at the top`);
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'trunkFlexion');
console.log(`Lay Down Push-up: wrote ${L.write(ex)}\n  top elbow ${st.elbow.toFixed(0)} chest ${cTop.toFixed(1)}; rest elbow ${sb.elbow.toFixed(0)} flare ${sb.flare.toFixed(0)} chest ${sb.chestY.toFixed(1)}\n  sweep ${JSON.stringify(sw)} peak ${pk.toFixed(1)}`);
X.finishChecks(ex, 'Lay Down Push-up', { slide: Math.max(sw.arm, sw.leg), floor: sw.floor });
