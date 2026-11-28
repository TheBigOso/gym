// Floor T Raise (GymVisual 13818, movement reference only; the page could not be read at authoring time). Prone on a mat,
// forehead just off the mat, legs long, arms straight out to the sides at shoulder level (a T) with the thumbs pointing
// up. The shoulder blades squeeze back and together and the straight arms lift a hand's height off the mat (horizontal
// abduction with external rotation, Ekstrom 2003); hold about 2 s, lower. Chest, pelvis and legs stay on the mat (the
// root is the same in every key). Bilateral, body weight.
const L = require('./lib');
const { R, V, rig, r1 } = L;
const F = require('./families/b6-16');
const P = require('./families/prone');
const C = require('./families/core-a');
const meta = require('./meta/floor-t-raise.json');

const lying = F.proneLie({ neck: -10 });
const ELEV = 90;
const arms = (handY, f) => F.proneArms(lying, { mode: 'T', handY, elev: ELEV, sc: { protract: r1(2 - 16 * f), elevate: r1(-2 * f) } });
const poses = { rest: arms(0.3, 0), half: arms(4.5, 0.55), top: arms(9, 1), topHold: arms(9.6, 1.05) };
for (const p of Object.values(poses)) { if (p.__cost > 0.05) console.warn('arm solve cost', p.__cost); delete p.__cost; }
const keyframes = [{ t: 0, pose: 'rest' }, { t: 1.0, pose: 'rest' }, { t: 1.5, pose: 'half' }, { t: 2.0, pose: 'top' }, { t: 4.0, pose: 'topHold' }, { t: 4.5, pose: 'half' }, { t: 5.0, pose: 'rest' }, { t: 6.0, pose: 'rest' }];
const ex = C.buildModule(meta, poses, keyframes, []);
const hip = poses.rest.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hip - 3), max: Math.ceil(hip + 3) };
const hand = (W) => P.bottomOf(W, 'hand_r');
const rep = C.scan(ex, { hand, chest: (W) => F.lowestOf(W, ['chest', 'ribcage']), head: (W) => F.lowestOf(W, ['head', 'nose', 'jaw']), thumbUp: (W) => L.Q.rot(W.wrist_r.q, [0, 0, 1])[1], armOut: (W) => { const d = V.sub(W.wrist_r.p, W.shoulder_r.p); return Math.atan2(Math.abs(d[2]), Math.abs(d[0])) / R.DEG; } });
const p0 = poses.rest, p1 = poses.topHold, W1 = L.fk(p1);
const set = (pf, s, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(pf)); k.setup = s; k.peak = v; };
set('Arm position', `Shoulder elevation ${p0.ch.shoulder_r.elev}° (arm out to the side), thumbs up`, `Arms ${Math.round(rep.armOut[0])}-${Math.round(rep.armOut[1])}° from the long axis of the body (T)`);
set('Arm lift', 'Hands resting on the mat', `Hands ${r1(hand(W1))} cm off the mat (horizontal abduction: plane ${p0.ch.shoulder_r.plane}° to ${p1.ch.shoulder_r.plane}°)`);
set('Shoulder blade retraction', `Clavicle protraction ${p0.ch.sc_r.protract}°`, `${p1.ch.sc_r.protract}° (${Math.round(p0.ch.sc_r.protract - p1.ch.sc_r.protract)}° of retraction)`);
set('Trunk', 'Chest and pelvis on the mat', `Unchanged (pelvis moves ${rep.still} cm)`);
set('Tempo', 'Rest 1 s', '1 s up, 2 s hold, 1 s down, 1 s rest');
console.log(`Floor T Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  rest ${JSON.stringify(p0.ch.shoulder_r)} top ${JSON.stringify(p1.ch.shoulder_r)} wrist ${JSON.stringify(p1.ch.wrist_r)}`);
C.guard('floor-t-raise', rep, [rep.thumbUp[0] < 0.8 && `thumbs not up (${rep.thumbUp[0]})`]);
