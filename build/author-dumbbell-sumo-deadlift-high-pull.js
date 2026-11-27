// Dumbbell Sumo Deadlift High Pull (GymVisual #1171012): wide stance, toes turned out, one dumbbell held vertically in
// both hands by the handle (grip 'end' on the right hand, the left hand mirrored on the other side of the handle). From a
// sumo squat with the dumbbell just off the floor between the feet (flat back, knees out over the toes), stand up
// explosively, shrug and pull the dumbbell up the body to about chest height with the elbows high and out (above the
// hands), then lower it along the same path back to the floor. Both feet stay flat and planted.
// Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-sumo-deadlift-high-pull.json');

const F = P.makeFamily({ toe: 28, half: 27 });
const POLE = 0.75;   // knees track out over the toes
for (const c of F.contacts) c.pole = [1, 0, (c.id.endsWith('_r') ? 1 : -1) * POLE];
const ZW = 4.5;
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const roll = (pitch) => ({ r: { c: 'roll', pitch, ballX: F.BALL_X }, l: { c: 'roll', pitch, ballX: F.BALL_X } });
const sc = (e, p) => ({ protract: p, elevate: e });
// straight arms hanging toward the midline (hands either side of the handle)
const hang = (fwd, flex = 5) => {
  const dir = (W) => { const S = W.shoulder_r.p, len = L.reach(flex), dz = ZW - S[2]; return [fwd, -Math.sqrt(len * len - dz * dz - fwd * fwd), dz]; };
  return { w: (W) => V.add(W.shoulder_r.p, dir(W)), elbow: (W) => V.add(W.shoulder_r.p, V.scale(V.norm(dir(W)), L.UA)), thumb: [1, 0, 0], elbowW: 0.6 };
};
const A = { bottom: hang(4), mid: hang(5), ext: hang(20),
  // top: hands together under the chin line, elbows lifted forward and out to about hand height (with the hands at the
// midline the forearm length keeps the elbows from flaring straight out to the sides)
  top: { w: (W) => [W.shoulder_r.p[0] + 26, W.shoulder_r.p[1] - 14, ZW], elbow: (W) => V.add(W.shoulder_r.p, [18, -6, 12]), thumb: [1, 0, 0], palm: [0, 0, -1], elbowW: 1, dirW: 3 } };   // dumbbell hangs vertically
const KF = +(process.env.KF ?? 100), DBF = +(process.env.DBF ?? 4);
const botCfg = (pitch) => ({ feet: flat, knee: KF, pitch, shX: 6, spine: { l5: -3, t12: 0, t6: 1 }, sc: sc(-5, 6), neck: [-10, -8] });
let pa = 0, pb = -75;
for (let i = 0; i < 20; i++) { const pm = (pa + pb) / 2, q = P.handArm(P.body(F, botCfg(pm)), A.bottom, {}), W = L.fk(q, F.contacts); if (P.B.dbFloor(W, 'r', 'end') > DBF && L.shapeMinY(W).y > -0.3) pa = pm; else pb = pm; }
const Bd = { bottom: botCfg(r1((pa + pb) / 2)),
  mid: { feet: flat, knee: 40, pitch: -22, shX: 5, spine: { l5: -2, t12: 0, t6: 1 }, sc: sc(-3, 5), neck: [-6, -5] },
  ext: { feet: flat, knee: 4, pitch: 3, sc: sc(6, 0) },
  top: { feet: flat, knee: 5, pitch: 2, sc: sc(16, 2) } };
const K = (name, t, n) => ({ name, t, cfg: Bd[name], arm: A[name], n });
const keys = [K('bottom', 0), { same: 'bottom', t: 0.35 }, K('mid', 0.8, 1), K('ext', 1.02, 1), K('top', 1.22, 1), { same: 'top', t: 1.42 },
  { ref: 'ext', t: 1.85, n: 1 }, { ref: 'mid', t: 2.45, n: 1 }, { ref: 'bottom', t: 3.05, n: 1 }, { same: 'bottom', t: 3.6 }];
const { poses, keyframes, err } = P.chain(F, keys);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r', 'end')];
const held = [{ side: 'r', grip: 'end' }];
const rep = P.B.sweep(ex, { held, skipBody: ['hand_l', 'thumb_l', 'forearm_l'] });
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wb = W('bottom'), Wt = W('top');
set('Stance', 'setup', `Ankles ${2 * F.half} cm apart, toes out 28°`); set('Stance', 'peak', 'Unchanged; knees track over the toes');
set('Bottom position', 'setup', `Knees ≈${Math.round(P.kneeOf(Wb, 'r'))}°, trunk ≈${Math.round(P.trunkLean(Wb))}° forward, dumbbell ${r1(P.B.dbFloor(Wb, 'r', 'end'))} cm off the floor (rig estimate)`);
set('Bottom position', 'peak', `Hip flexion ≈${Math.round(poses.bottom.ch.hip_r.flex)}° (joint channel)`);
set('High pull', 'setup', 'Arms long until the hips and knees extend'); set('High pull', 'peak', `Elbows ${r1(Wt.elbow_r.p[1] - Wt.wrist_r.p[1])} cm above the wrists, hands ${r1(Wt.shoulder_r.p[1] - Wt.wrist_r.p[1])} cm below the shoulders`);
set('Tempo', 'setup', '0.35 s set'); set('Tempo', 'peak', '0.85 s up (explosive), 0.2 s hold, 1.6 s down');
console.log(`Dumbbell SDHP: wrote ${L.write(ex)}\n  bottom pitch ${Bd.bottom.pitch} err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -1) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
