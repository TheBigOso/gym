// Dumbbell Clean and Press (GymVisual #340012): from standing with the dumbbells at the sides (neutral grip), hinge to the
// hang, clean the dumbbells to the shoulders (explosive triple extension, high pull, elbows turned forward, quarter-squat
// catch), stand tall, then press both dumbbells overhead to straight arms (neutral grip, biceps beside the ears), lower
// them back to the shoulders and then to the sides. Feet planted (flat contacts) except during the rise onto the balls.
// Bilateral. Clean keys shared with the hang clean (build/families/b4-power.js).
const L = require('./lib');
const { V, r1 } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-clean-and-press.json');

const F = P.makeFamily({ toe: 8, half: 11 });
const Bd = P.cleanBodies(F), A = Object.assign({}, P.CLEAN_ARMS);
Bd.p50 = { feet: Bd.stand.feet, knee: 4, pitch: 1, sc: { protract: 2, elevate: 10 } };
Bd.top = { feet: Bd.stand.feet, knee: 4, pitch: 1, sc: { protract: 0, elevate: 20 } };
A.p50 = P.PRESS_MID; A.top = P.OVERHEAD;
const K = (name, t, n) => ({ name, t, cfg: Bd[name], arm: A[name], n });
const keys = [K('stand', 0), { same: 'stand', t: 0.5 }, K('h50', 0.85), K('hang', 1.2), { same: 'hang', t: 1.32 }, K('ext', 1.5, 2), K('pull', 1.63, 2), K('turn', 1.74, 1), K('catch', 1.85, 1),
  K('absorb', 2.02), K('rise', 2.45), K('rack', 2.85), { same: 'rack', t: 3.05 }, K('p50', 3.5, 1), K('top', 3.95, 1), { same: 'top', t: 4.35 }, { ref: 'p50', t: 4.95, n: 1 }, { ref: 'rack', t: 5.45, n: 1 },
  { same: 'rack', t: 5.65 }, K('low1', 6.05, 1), K('low2', 6.4, 1), { ref: 'stand', t: 6.8, n: 1 }, { same: 'stand', t: 7.4 }];
const { poses, keyframes, err } = P.chain(F, keys);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r'), P.B.heldProp('l')];
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle' }));
const rep = P.B.sweep(ex, { held });
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wc = W('absorb'), Wr = W('rack'), Wt = W('top');
const elevOf = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), V.sub(Wx.pelvis.p, Wx.neck_c7.p));
set('Catch', 'setup', `Knees ≈${Math.round(P.kneeOf(Wc, 'r'))}°, trunk ≈${Math.round(P.trunkLean(Wc))}° forward`); set('Catch', 'peak', `Dumbbells on the shoulders, elbows ≈${Math.round(P.B.elbowOf(Wc, 'r'))}°`);
set('Press', 'setup', `Upper arm ≈${Math.round(elevOf(Wr))}° from the trunk in the rack`); set('Press', 'peak', `≈${Math.round(elevOf(Wt))}° overhead, elbows ≈${Math.round(P.B.elbowOf(Wt, 'r'))}° (nearly straight), dumbbells over the shoulders`);
set('Tempo', 'setup', 'Clean: 0.7 s hinge, explosive 0.5 s pull and catch'); set('Tempo', 'peak', 'Press 0.9 s up, 0.4 s lockout, 1.1 s down to the shoulders, 1.15 s back to the sides');
console.log(`Dumbbell Clean and Press: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
// rig shapes: racked dumbbells rest on the deltoids (checked on the skinned mesh with b2/b4p/mesh.mjs)
if (rep.dbFloor < 0 || rep.dbBody < -3) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
