// Dumbbell Overhead Carry (GymVisual #354812, Dumbbell Single Arm Overhead Carry), right arm: one dumbbell locked out
// overhead (neutral grip, biceps by the ear, dumbbell over the shoulder), the free arm relaxed at the side. Walk forward
// tall and braced with controlled steps (a half step, three full steps and a closing step, about 1 m), then stand
// with the feet together; the loop restarts at the start mark. Planted feet use flat contacts; each step rolls the back
// foot onto its ball before it swings through. Authored right.
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-overhead-carry.json');

const F = P.makeFamily({ toe: 6, half: 10 });
const STEP = +(process.env.STEP ?? 50), PERIOD = +(process.env.PERIOD ?? 0.75);
const { keys: gk, travel } = P.gait(F, { step: STEP, period: PERIOD, knee: 6, sc: { protract: 0, elevate: 18 } });
const keys = gk.map((k) => Object.assign(k, { arm: P.OVERHEAD }));
keys.splice(1, 0, { same: 'stand', t: 0.6 });
keys.push({ same: 'end', t: +(keys[keys.length - 1].t + 0.8).toFixed(3) });
const { poses, keyframes, err } = P.chain(F, keys, { both: false });
for (const n in poses) { poses[n].ch.sc_l = { protract: 2, elevate: 0 }; poses[n] = P.leftRelaxed(poses[n], { out: 6, fwd: 2, elbow: 12 }); }
const D = keyframes[keyframes.length - 1].t;
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.timeline = Object.assign({}, ex.timeline, { duration: D });
ex.props = [P.B.heldProp('r')];
const held = [{ side: 'r', grip: 'handle' }];
const rep = P.B.sweep(ex, { held });
const lr = F.report(ex);
const jump = P.jumps(ex);
const set = H.setKin(ex), W0 = L.fk(poses.stand, F.contacts), Wm = L.fk(poses.k2swing, F.contacts);
const elevOf = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), V.sub(Wx.pelvis.p, Wx.neck_c7.p));
const dbOver = (Wx) => { const c = P.DBH.dumbbellAt(Wx, 'r').c; return r1(Math.hypot(c[0] - Wx.shoulder_r.p[0], c[2] - Wx.shoulder_r.p[2])); };
set('Lockout', 'setup', `Upper arm ≈${Math.round(elevOf(W0))}° from the trunk, elbow ≈${Math.round(P.B.elbowOf(W0, 'r'))}°`); set('Lockout', 'peak', `Dumbbell within ${dbOver(Wm)} cm (horizontally) of the shoulder joint while walking`);
set('Step length', 'setup', 'Feet together (hip width)'); set('Step length', 'peak', `${STEP} cm steps, ${travel} cm per loop, ${PERIOD} s per step`);
set('Trunk', 'setup', `≈${Math.round(P.trunkLean(W0))}° from vertical`); set('Trunk', 'peak', `≈${Math.round(P.trunkLean(Wm))}° mid-step (tall, no side lean)`);
console.log(`Dumbbell Overhead Carry: wrote ${L.write(ex)} (${keyframes.length} keys, ${D} s)\n  ${JSON.stringify(rep)}\n  legs ${JSON.stringify(lr)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05 || lr.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -1 || rep.floor < -0.5) { console.error('FAIL: dumbbell through the floor or the body, or a foot below the floor'); process.exitCode = 1; }
