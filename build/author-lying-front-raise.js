// Lying Front Raise (GymVisual 20162, movement reference only; the page could not be read at authoring time; taken as the
// body-weight prone version). Prone on a mat, forehead just off the mat, legs long and relaxed, arms straight overhead
// a little wider than the shoulders with the thumbs up. The straight arms lift off the mat in front of the head (shoulder
// flexion past overhead with the shoulder blades rotating up and set down, Ekstrom 2003); hold about 2 s, lower. Chest,
// pelvis and legs stay on the mat (the root is the same in every key; unlike the superman the legs do not lift). Bilateral.
const L = require('./lib');
const { r1 } = L;
const F = require('./families/b6-16');
const P = require('./families/prone');
const C = require('./families/core-a');
const meta = require('./meta/lying-front-raise.json');

const lying = F.proneLie({ neck: -10 });
const PLANE = 78; // a little wider than straight ahead (between an I and a Y)
const arms = (handY, f) => F.proneArms(lying, { mode: 'I', handY, plane: PLANE, sc: { protract: r1(2 - 6 * f), elevate: r1(10 + 2 * f) } });
const poses = { rest: arms(0.3, 0), half: arms(4, 0.55), top: arms(8, 1), topHold: arms(8.6, 1.05) };
for (const p of Object.values(poses)) { if (p.__cost > 0.05) console.warn('arm solve cost', p.__cost); delete p.__cost; }
const keyframes = [{ t: 0, pose: 'rest' }, { t: 1.0, pose: 'rest' }, { t: 1.5, pose: 'half' }, { t: 2.0, pose: 'top' }, { t: 4.0, pose: 'topHold' }, { t: 4.5, pose: 'half' }, { t: 5.0, pose: 'rest' }, { t: 6.0, pose: 'rest' }];
const ex = C.buildModule(meta, poses, keyframes, []);
const hip = poses.rest.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hip - 3), max: Math.ceil(hip + 3) };
const hand = (W) => P.bottomOf(W, 'hand_r');
const rep = C.scan(ex, { hand, chest: (W) => F.lowestOf(W, ['chest', 'ribcage']), head: (W) => F.lowestOf(W, ['head', 'nose', 'jaw']), thumbUp: (W) => L.Q.rot(W.wrist_r.q, [0, 0, 1])[1], elev: (W, p) => p.ch.shoulder_r.elev });
const p0 = poses.rest, p1 = poses.topHold, W1 = L.fk(p1);
const set = (pf, s, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(pf)); k.setup = s; k.peak = v; };
set('Shoulder flexion', `≈${Math.round(p0.ch.shoulder_r.elev)}° (arms overhead, hands on the mat)`, `≈${Math.round(p1.ch.shoulder_r.elev)}°`);
set('Arm lift', 'Hands resting on the mat', `Hands ${r1(hand(W1))} cm off the mat`);
set('Shoulder blades', `Clavicle elevation ${p0.ch.sc_r.elevate}°`, `${p1.ch.sc_r.elevate}°, protraction ${p1.ch.sc_r.protract}° (blades set back and down, not shrugged further)`);
set('Trunk and legs', 'On the mat', `Unchanged (pelvis moves ${rep.still} cm; chest ${rep.chest[1]} cm)`);
set('Tempo', 'Rest 1 s', '1 s up, 2 s hold, 1 s down, 1 s rest');
console.log(`Lying Front Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  rest ${JSON.stringify(p0.ch.shoulder_r)} top ${JSON.stringify(p1.ch.shoulder_r)} wrist ${JSON.stringify(p1.ch.wrist_r)}`);
C.guard('lying-front-raise', rep, [rep.thumbUp[0] < 0.8 && `thumbs not up (${rep.thumbUp[0]})`]);
