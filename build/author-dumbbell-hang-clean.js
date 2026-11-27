// Dumbbell Hang Clean (GymVisual #444912): stand tall, feet hip width, a dumbbell in each hand at the sides (neutral grip).
// Hinge to the hang (dumbbells just above the knees, hips back, flat back), then extend hips, knees and ankles explosively
// (heels rise onto the balls of the feet, shoulders shrug), pull the elbows up and out with the dumbbells close to the
// body, turn the elbows forward under the dumbbells and catch them on the shoulders in a quarter squat. Stand tall with
// the dumbbells racked, then lower them under control (a reverse hammer curl) back to the sides. Both feet stay planted
// (flat contacts) except during the rise onto the balls (rolling feet). Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-hang-clean.json');

const F = P.makeFamily({ toe: 8, half: 11 });
const Bd = P.cleanBodies(F), A = P.CLEAN_ARMS;
const K = (name, t, n) => ({ name, t, cfg: Bd[name], arm: A[name], n });
const keys = [K('stand', 0), { same: 'stand', t: 0.6 }, K('h50', 1.0), K('hang', 1.4), { same: 'hang', t: 1.55 }, K('ext', 1.74, 2), K('pull', 1.87, 2), K('turn', 1.98, 1),
  K('catch', 2.09, 1), K('absorb', 2.27), K('rise', 2.75), K('rack', 3.2), { same: 'rack', t: 3.6 }, K('low1', 3.98, 1), K('low2', 4.32, 1), { ref: 'stand', t: 4.7, n: 1 }, { same: 'stand', t: 5.6 }];
const { poses, keyframes, err } = P.chain(F, keys);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r'), P.B.heldProp('l')];
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle' }));
const rep = P.B.sweep(ex, { held });
const jump = P.jumps(ex);
console.log(`Dumbbell Hang Clean: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
// rig shapes: the racked dumbbells rest on the deltoids (the rig upper-arm capsule is fatter than the athlete's shoulder;
// the skinned mesh keeps about 1.4 cm of clearance, b2/b4p/mesh.mjs)
if (rep.dbFloor < 0 || rep.dbBody < -3) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wh = W('hang'), We = W('ext'), Wc = W('absorb');
set('Hang position', 'setup', `Dumbbells ${r1(P.DBH.dumbbellAt(Wh, 'r').c[1] - Wh.knee_r.p[1])} cm above the knee joints, knees ≈${Math.round(P.kneeOf(Wh, 'r'))}°, trunk ≈${Math.round(P.trunkLean(Wh))}° forward`);
set('Hang position', 'peak', `Hip flexion ≈${Math.round(poses.hang.ch.hip_r.flex)}° (joint channel)`);
set('Triple extension', 'setup', `Knees ≈${Math.round(P.kneeOf(We, 'r'))}°, heels up ${Bd.ext.feet.r.pitch}° (foot pitch), shoulders shrugged`);
set('Triple extension', 'peak', `Elbows ≈${Math.round(P.B.elbowOf(W('pull'), 'r'))}° at the high pull, elbows above the hands`);
set('Catch', 'setup', `Knees ≈${Math.round(P.kneeOf(Wc, 'r'))}°, trunk ≈${Math.round(P.trunkLean(Wc))}° forward`);
set('Catch', 'peak', `Dumbbells resting on the shoulders, elbows ≈${Math.round(P.B.elbowOf(Wc, 'r'))}°`);
set('Tempo', 'setup', 'Stand 0.6 s, 0.8 s hinge to the hang, 0.15 s pause'); set('Tempo', 'peak', '0.32 s extend and pull, 0.4 s catch and absorb, 0.9 s stand, 0.4 s hold, 1.1 s lower, 0.9 s reset');
L.write(ex);
