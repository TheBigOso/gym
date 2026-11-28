// Kneeling Scapular Push-up (GymVisual #20771, page not readable; movement from the name): knee plank on a mat (knees behind
// the hips, shins flat), hands under the shoulders, arms straight throughout. Only the shoulder blades move: the chest sinks
// between the arms as they draw together (retraction), then the hands push the floor away so they spread around the rib
// cage (protraction) and the upper back rises. Bilateral. Palms planted (arm contacts), legs planted at the ankles with the
// knee on its mat point (b6-14 makeKneePush); each key is solved with the arm length fixed and the scapula channels set.
const L = require('./lib');
const { r1, clone } = L;
const H = require('./families/hips');
const X = require('./families/b6-14');
const meta = require('./meta/kneeling-scapular-push-up.json');

const HAND_Z = 20;            // wrists under the shoulder joints
const ELBOW = 5;              // arms straight (soft)
const SC = { sink: { protract: -20, elevate: -2 }, mid: { protract: 4, elevate: 0 }, push: { protract: 27, elevate: 2 } };
const F = X.makeKneePush({ handZ: HAND_Z, flarePole: [-1, 0.2, 0.4] });
const HAND_X = F.handXFor(0, ELBOW);
const at = (sc) => F.key(HAND_X, { armD: L.reach(ELBOW), u: 0, sc }).pose;
const lerpSc = (a, b, f) => ({ protract: r1(a.protract + (b.protract - a.protract) * f), elevate: r1(a.elevate + (b.elevate - a.elevate) * f) });
const ph = meta.timeline.phases.map((p) => p.end), D = meta.timeline.duration; // setup, sink, squeeze, push, top
const poses = { mid: at(SC.mid), sink: at(SC.sink), push: at(SC.push) }, keyframes = [];
const add = (t, n, p) => { if (p) poses[n] = p; keyframes.push({ t: +t.toFixed(3), pose: n }); };
// loop: start spread (top), ease to mid, sink, hold, push through mid to spread, hold
add(0, 'push'); add(ph[0] * 0.5, 'p1', at(lerpSc(SC.push, SC.mid, 0.5))); add(ph[0], 'mid');
for (let i = 1; i < 4; i++) add(ph[0] + ((ph[1] - ph[0]) * i) / 4, `s${i}`, at(lerpSc(SC.mid, SC.sink, X.ease(i / 4))));
add(ph[1], 'sink'); add((ph[1] + ph[2]) / 2, 'sinkHold', at(lerpSc(SC.sink, SC.mid, 0.03))); add(ph[2], 'sink');
for (let i = 1; i < 6; i++) add(ph[2] + ((ph[3] - ph[2]) * i) / 6, `u${i}`, at(lerpSc(SC.sink, SC.push, X.ease(i / 6))));
add(ph[3], 'push'); add((ph[3] + D) / 2, 'pushHold', at(lerpSc(SC.push, SC.mid, 0.03))); add(D, 'push');
const ex = H.module_(meta, F.contacts, poses, keyframes);
const sw = F.sweep(ex);
const Ws = L.fk(poses.sink, F.contacts), Wp = L.fk(poses.push, F.contacts), sS = F.stats(poses.sink), sP = F.stats(poses.push);
const set = H.setKin(ex);
set('Elbow flexion', 'setup', `≈${Math.round(sS.elbow)}° (arms straight)`); set('Elbow flexion', 'peak', `≈${Math.round(sP.elbow)}° (unchanged)`);
set('Scapular travel', 'setup', `Shoulder blades drawn together (protraction channel ${SC.sink.protract}°)`); set('Scapular travel', 'peak', `Spread around the ribs (protraction ${SC.push.protract}°)`);
set('Chest travel', 'setup', `Chest ${r1(sS.chestY)} cm above the floor when sunk`); set('Chest travel', 'peak', `${r1(sP.chestY)} cm when spread (+${r1(sP.chestY - sS.chestY)} cm); upper back (C7) +${r1(Wp.neck_c7.p[1] - Ws.neck_c7.p[1])} cm`);
set('Body line', 'setup', `Trunk ${Math.round(sS.bodyAng)}° above horizontal; knee-hip-shoulder bend ${sS.bend.toFixed(1)}°`); set('Body line', 'peak', `Trunk ${Math.round(sP.bodyAng)}°; bend ${sP.bend.toFixed(1)}°`);
set('Tempo', 'setup', `${ph[0]} s settle`); set('Tempo', 'peak', `${r1(ph[1] - ph[0])} s sink, ${r1(ph[2] - ph[1])} s hold, ${r1(ph[3] - ph[2])} s push, ${r1(D - ph[3])} s hold`);
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'trunkFlexion');
console.log(`Kneeling Scapular Push-up: wrote ${L.write(ex)} handX ${HAND_X}\n  sink: elbow ${sS.elbow.toFixed(1)} chest ${sS.chestY.toFixed(1)} body ${sS.bodyAng.toFixed(1)} bend ${sS.bend.toFixed(1)} kneeErr ${sS.kneeErr.toFixed(2)}\n  push: elbow ${sP.elbow.toFixed(1)} chest ${sP.chestY.toFixed(1)} body ${sP.bodyAng.toFixed(1)} bend ${sP.bend.toFixed(1)}\n  sweep ${JSON.stringify(sw)} peak ${pk.toFixed(1)}`);
X.finishChecks(ex, 'kneeling-scapular-push-up', sw);
if (sw.knee > 0.6) { console.error('FAIL: knee leaves its mat point'); process.exitCode = 1; }
