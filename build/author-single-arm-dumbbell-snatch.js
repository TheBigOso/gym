// Single-Arm Dumbbell Snatch (GymVisual #388812, Dumbbell One Arm Snatch), right arm: feet a little wider than the hips,
// one lighter dumbbell on the floor between the feet, handle across (overhand grip); the knees track out over the toes so the plates clear the shins. Hips back and down with a flat back, push the
// floor away to the knees, then extend hips, knees and ankles explosively (heels rise), pull the elbow high and out with
// the dumbbell close to the body, turn the hand under and punch the dumbbell overhead, catching it on a straight arm in a
// quarter squat. Stand tall with the arm locked out, lower the dumbbell to the shoulder, to the hip, and back to the
// floor with a flat back. The free (left) arm hangs relaxed. Feet planted (flat contacts) except during the rise onto
// the balls. Authored right.
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/single-arm-dumbbell-snatch.json');

const F = P.makeFamily({ toe: 14, half: 21 });
// knees track out over the toes (IK pole turned out) so the plates pass between the shins
const POLE = +(process.env.POLE ?? 0.6);
for (const c of F.contacts) c.pole = [1, 0, (c.id.endsWith('_r') ? 1 : -1) * POLE];
const SIZE = [28, 11, 11], DSZ = { length: 28, diameter: 11 };
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const roll = (pitch) => ({ r: { c: 'roll', pitch, ballX: F.BALL_X }, l: { c: 'roll', pitch, ballX: F.BALL_X } });
const sc = (e, p = 4) => ({ protract: p, elevate: e });
const S_ = (o) => (W) => V.add(W.shoulder_r.p, o);
const TH = [0, 0, -1];    // overhand grip: thumb toward the midline, handle across
// straight arm reaching down toward the midline (handle centre near z = HZ), hand in line with the forearm
const reachKey = (fwd, hz, flex = 4) => ({ w: (W) => { const S = W.shoulder_r.p, len = L.reach(flex), d = [fwd, 0, hz + 0 - S[2]]; d[1] = -Math.sqrt(Math.max(1, len * len - d[0] * d[0] - d[2] * d[2])); return V.add(S, d); },
  elbow: (W) => { const S = W.shoulder_r.p, len = L.reach(flex), d = [fwd, 0, hz - S[2]]; d[1] = -Math.sqrt(Math.max(1, len * len - d[0] * d[0] - d[2] * d[2])); return V.add(S, V.scale(V.norm(d), L.UA)); }, thumb: TH, elbowW: 0.6 });
const A = {
  floor: reachKey(3, 0), knee: reachKey(3, 1), hang: reachKey(4, 4), ext: reachKey(18, 11),
  pull: { w: S_([22, -23, 6]), elbow: S_([8, -14, 24]), thumb: TH, elbowW: 1.5 },
  punch: { w: S_([24, 8, 18]), elbow: S_([2, 4, 27]), thumb: TH, elbowW: 1.5 },
  catch: { w: S_([2, 54.8, -1]), elbow: S_([1, 29.8, 1]), thumb: TH, elbowW: 1 },
  sh: { w: S_([14, -2, 0]), elbow: S_([12, -26, 6]), thumb: TH, elbowW: 1 },
  mid: reachKey(16, 8, 6),
};
A.absorb = A.catch; A.top = A.catch;
const Bd = {
  knee: { feet: flat, knee: 45, shX: 10, pitch: -50, spine: { l5: -3, t12: 0, t6: 1 }, sc: sc(-5, 7), neck: [-10, -8] },
  hang: { feet: flat, knee: 26, shX: 8, pitch: -32, spine: { l5: -2, t12: 0, t6: 1 }, sc: sc(-3, 6) },
  ext: { feet: roll(24), knee: 4, pitch: 4, sc: sc(12, 0) },
  pull: { feet: roll(17), knee: 10, pitch: 2, sc: sc(16, 0) },
  punch: { feet: flat, knee: 25, pitch: -4, sc: sc(18, 0) },
  catch: { feet: flat, knee: 42, pitch: -10, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(20, 0) },
  absorb: { feet: flat, knee: 48, pitch: -12, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(20, 0) },
  top: { feet: flat, knee: 5, pitch: 0, sc: sc(20, 0) },
  sh: { feet: flat, knee: 8, pitch: -2, sc: sc(4, 2) },
  mid: { feet: flat, knee: 16, shX: 6, pitch: -14, sc: sc(-2, 4) },
};
const KNEE_F = +(process.env.KF ?? 105), FLOOR = +(process.env.DBF ?? 7);
const floorCfg = (pitch) => ({ feet: flat, knee: KNEE_F, shX: 10, pitch, spine: { l5: -2, t12: 4, t6: 5 }, sc: sc(-6, 8), neck: [-12, -10] });
let pa = -20, pb = -85;
for (let i = 0; i < 20; i++) { const pm = (pa + pb) / 2, q = P.handArm(P.body(F, floorCfg(pm)), A.floor, {}), W = L.fk(q, F.contacts); if (P.B.dbFloor(W, 'r', 'handle', DSZ) > FLOOR && L.shapeMinY(W).y > -0.3) pa = pm; else pb = pm; }
Bd.floor = floorCfg(r1((pa + pb) / 2));
const K = (name, t, n) => ({ name, t, cfg: Bd[name], arm: A[name], n });
const keys = [K('floor', 0), { same: 'floor', t: 0.5 }, K('knee', 1.0, 1), K('hang', 1.18), K('ext', 1.34, 2), K('pull', 1.46, 2), K('punch', 1.56, 1), K('catch', 1.66, 1), K('absorb', 1.84),
  K('top', 2.35, 1), { same: 'top', t: 2.85 }, K('sh', 3.4, 2), K('mid', 3.85, 1), { ref: 'knee', t: 4.35, n: 1 }, { ref: 'floor', t: 4.85, n: 1 }, { same: 'floor', t: 5.6 }];
const { poses, keyframes, err } = P.chain(F, keys, { both: false, bow: { pull: (f) => [6 * Math.sin(Math.PI * f), 0, 0], sh: (f) => [12 * Math.sin(Math.PI * f), 0, 18 * Math.sin(Math.PI * f)] } });
for (const n in poses) { poses[n].ch.sc_l = { protract: 3, elevate: 0 }; if (poses[n].ch.elbow_r.flex > 150) poses[n].ch.elbow_r.flex = 150; const lean = P.trunkLean(L.fk(poses[n], F.contacts)); poses[n] = P.leftRelaxed(poses[n], { out: 7, fwd: 2 + lean * 0.2, elbow: r1(12 + Math.max(0, lean - 15) * 1.2) }); }
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r', 'handle', SIZE)];
const held = [{ side: 'r', grip: 'handle', size: DSZ }];
const rep = P.B.sweep(ex, { held });
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wf = W('floor'), Wc = W('absorb'), Wt = W('top');
set('Start position', 'setup', `Knees ≈${Math.round(P.kneeOf(Wf, 'r'))}°, trunk ≈${Math.round(P.trunkLean(Wf))}° forward, dumbbell between the feet`); set('Start position', 'peak', `Dumbbell ${r1(P.B.dbFloor(Wf, 'r', 'handle', DSZ))} cm off the floor (rig estimate)`);
set('Catch', 'setup', `Knees ≈${Math.round(P.kneeOf(Wc, 'r'))}°, trunk ≈${Math.round(P.trunkLean(Wc))}° forward`); set('Catch', 'peak', `Arm locked overhead (elbow ≈${Math.round(P.B.elbowOf(Wc, 'r'))}°), dumbbell over the shoulder`);
set('Tempo', 'setup', '0.5 s set, 0.5 s first pull'); set('Tempo', 'peak', '0.5 s from the hang to the catch, 0.7 s stand, 0.5 s lockout hold, 2.0 s back to the floor');
console.log(`Single-Arm Dumbbell Snatch: wrote ${L.write(ex)}\n  start pitch ${Bd.floor.pitch}; err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -1) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
