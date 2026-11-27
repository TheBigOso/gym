// Dumbbell Power Clean (GymVisual #488912): dumbbells on the floor beside the feet (neutral grip), feet hip width. From a
// flat-back squat-hinge start, push the floor away so the dumbbells pass the knees with the trunk angle held (first pull),
// then extend hips, knees and ankles explosively (heels rise, shrug), pull the elbows high and out, turn them forward and
// catch the dumbbells on the shoulders in a quarter squat. Stand tall, then lower the dumbbells to the sides and back to
// the floor beside the feet with a flat back. Feet planted (flat contacts) except during the rise onto the balls.
// Bilateral. Shares the clean keys with the hang clean (build/families/b4-power.js).
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-power-clean.json');

const F = P.makeFamily({ toe: 10, half: 12 });
// knees track a little out over the toes at the floor (IK pole turned out), which also keeps the hips inside the rig's
// flexion range
const POLE = +(process.env.POLE ?? 0.6);
for (const c of F.contacts) c.pole = [1, 0, (c.id.endsWith('_r') ? 1 : -1) * POLE];
const Bd = P.cleanBodies(F), A = Object.assign({}, P.CLEAN_ARMS);
Object.assign(A, { stand: P.hangKey(1, 8, 5) });
const OUT = +(process.env.OUT ?? 12), FLOOR = +(process.env.DBF ?? 3.1), KNEE_F = +(process.env.KF ?? 110);
const flat = Bd.stand.feet;
A.floor = P.hangKey(0, OUT, 4); A.knee = P.hangKey(0, OUT, 4);
// start: the trunk pitch that sets the dumbbell plates FLOOR cm above the floor (rig) with the knees at KNEE_F
const floorCfg = (pitch) => ({ feet: flat, knee: KNEE_F, pitch, shX: 9, spine: { l5: -2, t12: +(process.env.T12 ?? 4), t6: +(process.env.T6 ?? 5) }, sc: { protract: 10, elevate: -9 }, neck: [-14, -12] });
let pa = -20, pb = -85;
for (let i = 0; i < 20; i++) { const pm = (pa + pb) / 2, q = P.handArm(P.body(F, floorCfg(pm)), A.floor, {}); if (P.B.dbFloor(L.fk(q, F.contacts), 'r') > FLOOR) pa = pm; else pb = pm; }
Bd.floor = floorCfg(r1((pa + pb) / 2));
Bd.knee = { feet: flat, knee: 42, shX: 9, pitch: r1(Bd.floor.pitch * 0.95), spine: { l5: -3, t12: 0, t6: 1 }, sc: { protract: 7, elevate: -5 }, neck: [-10, -8] };
const K = (name, t, n) => ({ name, t, cfg: Bd[name], arm: A[name], n });
const keys = [K('floor', 0), { same: 'floor', t: 0.5 }, K('knee', 1.05, 1), K('hang', 1.25), K('ext', 1.42, 2), K('pull', 1.55, 2), K('turn', 1.66, 1), K('catch', 1.77, 1), K('absorb', 1.95),
  K('rise', 2.4), K('rack', 2.85), { same: 'rack', t: 3.2 }, K('low1', 3.55, 1), K('low2', 3.9, 1), { ref: 'knee', t: 4.45, n: 1 }, { ref: 'floor', t: 4.9, n: 1 }, { same: 'floor', t: 5.6 }];
const { poses, keyframes, err } = P.chain(F, keys);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r'), P.B.heldProp('l')];
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle' }));
const rep = P.B.sweep(ex, { held });
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wf = W('floor'), Wk = W('knee'), Wc = W('absorb');
set('Start position', 'setup', `Knees ≈${Math.round(P.kneeOf(Wf, 'r'))}°, hip flexion ≈${Math.round(poses.floor.ch.hip_r.flex)}°, trunk ≈${Math.round(P.trunkLean(Wf))}° forward, hips ${r1(Wf.pelvis.p[1])} cm high (shoulders ${r1(Wf.shoulder_r.p[1])} cm)`);
set('Start position', 'peak', `Dumbbells ${r1(P.B.dbFloor(Wf, 'r'))} cm off the floor beside the feet (rig estimate)`);
set('First pull', 'setup', `Trunk ≈${Math.round(P.trunkLean(Wf))}° at the start`); set('First pull', 'peak', `≈${Math.round(P.trunkLean(Wk))}° as the dumbbells pass the knees (knees ≈${Math.round(P.kneeOf(Wk, 'r'))}°)`);
set('Catch', 'setup', `Knees ≈${Math.round(P.kneeOf(Wc, 'r'))}°, trunk ≈${Math.round(P.trunkLean(Wc))}° forward`); set('Catch', 'peak', `Dumbbells on the shoulders, elbows ≈${Math.round(P.B.elbowOf(Wc, 'r'))}°`);
set('Tempo', 'setup', '0.5 s set, 0.55 s first pull to the knees'); set('Tempo', 'peak', '0.5 s second pull and turnover, 0.2 s absorb, 0.9 s stand, 0.35 s hold, 1.7 s back to the floor, 0.7 s reset');
console.log(`Dumbbell Power Clean: wrote ${L.write(ex)}\n  start pitch ${Bd.floor.pitch}; err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
// rig shapes: racked dumbbells rest on the deltoids (checked on the skinned mesh with b2/b4p/mesh.mjs)
if (rep.dbFloor < 0 || rep.dbBody < -3) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
