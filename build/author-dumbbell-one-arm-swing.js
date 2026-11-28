// Dumbbell One Arm Swing (GymVisual 15884; movement reference only, the page could not be read, so the movement follows
// the name and standard coaching): one dumbbell in the right hand, neutral grip (thumb forward, handle pointing fore and
// aft so it passes between the thighs), feet wider than the hips; the free left arm hangs relaxed. Hike the dumbbell back
// between the thighs with a hip hinge, snap the hips forward to stand tall so the straight arm floats the dumbbell to
// about chest height, let it fall back into the next hinge; two swings, then park. Same body keys as
// author-dumbbell-swing.js (McGill & Marshall 2012 hinge depths); the arm is solved for one hand only. Authored right
// (the player mirrors for the left).
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-one-arm-swing.json');

const F = P.makeFamily({ toe: 14, half: +(process.env.HALF ?? 26) });
const ZW = +(process.env.ZW ?? 2.5);     // wrist |z|: the hand swings close to the midline, between the thighs
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
// straight right arm at `a` degrees from hanging (+ forward); neutral grip: thumb along the swing, palm toward the midline
const arm = (a, zw = ZW, flex = 6) => {
  const dir = (W) => { const S = W.shoulder_r.p, len = L.reach(flex), dz = zw - S[2], ls = Math.sqrt(len * len - dz * dz); return [ls * Math.sin(a * Math.PI / 180), -ls * Math.cos(a * Math.PI / 180), dz]; };
  return { w: (W) => V.add(W.shoulder_r.p, dir(W)), elbow: (W) => V.add(W.shoulder_r.p, V.scale(V.norm(dir(W)), L.UA)), thumb: [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180), 0], palm: [0, 0, -1], elbowW: 0.6 };
};
const sc = (e, p) => ({ protract: p, elevate: e });
const Bd = {
  stand: { feet: flat, knee: 5, pitch: 0, sc: sc(-2, 6) },
  dip: { feet: flat, knee: 14, pitch: -30, shX: 6, sc: sc(-3, 7) },
  back: { feet: flat, knee: 40, pitch: -54, shX: 12, spine: { l5: -2, t12: 0, t6: 1 }, sc: sc(-4, 8), neck: [-14, -10] },
  rise: { feet: flat, knee: 16, pitch: -28, shX: 6, spine: { l5: -1, t12: 0, t6: 0.5 }, sc: sc(-2, 8), neck: [-8, -6] },
  snap: { feet: flat, knee: 4, pitch: 2, sc: sc(0, 8) },
  top: { feet: flat, knee: 3, pitch: 3, sc: sc(3, 10) },
  fall: { feet: flat, knee: 6, pitch: 0, sc: sc(0, 8) },
};
const ZS = +(process.env.ZS ?? 9), AS = +(process.env.AS ?? 28), ZT = +(process.env.ZT ?? 6);
const A = { stand: arm(AS, ZS), dip: arm(2, ZW + 1), back: arm(-22), rise: arm(-5, +(process.env.ZR ?? 4)), snap: arm(40, ZT), top: arm(+(process.env.AT ?? 86), ZT), fall: arm(40, ZT) };
const K = (name, t, n) => ({ name, t, cfg: Bd[name], arm: A[name], n });
const keys = [K('stand', 0), { same: 'stand', t: 0.6 }, K('dip', 1.0), K('back', 1.35, 1), K('rise', 1.62, 1), K('snap', 1.82), K('top', 2.08),
  K('fall', 2.34), { ref: 'rise', t: 2.58 }, { ref: 'back', t: 2.85, n: 1 }, { ref: 'rise', t: 3.12, n: 1 }, { ref: 'snap', t: 3.32 }, { ref: 'top', t: 3.58 },
  { ref: 'fall', t: 3.84 }, { ref: 'rise', t: 4.08 }, { ref: 'dip', t: 4.35 }, { ref: 'stand', t: 4.85, n: 1 }, { same: 'stand', t: 5.6 }];
const { poses, keyframes, err } = P.chain(F, keys, { both: false });
// free left arm hanging relaxed (straight down in the hinge, beside the thigh standing)
for (const n of Object.keys(poses)) { const q = P.leftRelaxed(poses[n], { out: 9, fwd: 3, elbow: 14 }); q.ch.sc_l = clone(q.ch.sc_r); poses[n] = q; }
// near the elevation singularity the solve can pick a far plane branch: reuse the snap key's hanging left arm there
for (const n of Object.keys(poses)) { const pl = poses[n].ch.shoulder_l.plane; if (pl < -55 || pl > 135) for (const j of ['shoulder', 'elbow', 'wrist']) poses[n].ch[`${j}_l`] = clone(poses.snap.ch[`${j}_l`]); }
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r', 'handle')];
const held = [{ side: 'r', grip: 'handle' }];
const rep = P.B.sweep(ex, { held });
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wb = W('back'), Wt = W('top');
const armAng = (Wx) => { const d = V.sub(Wx.wrist_r.p, Wx.shoulder_r.p); return Math.round(Math.atan2(d[0], -d[1]) * 180 / Math.PI); };
set('Hip flexion', 'setup', `≈${Math.round(poses.back.ch.hip_r.flex)}° at the bottom (joint channel), trunk ≈${Math.round(P.trunkLean(Wb))}° forward`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° at the top (standing tall)`);
set('Knee flexion', 'setup', `≈${Math.round(P.kneeOf(Wb, 'r'))}° at the bottom`); set('Knee flexion', 'peak', `≈${Math.round(P.kneeOf(Wt, 'r'))}° at the top`);
set('Arm swing', 'setup', `Right arm ${-armAng(Wb)}° behind vertical, dumbbell between the thighs`); set('Arm swing', 'peak', `Right arm ≈${armAng(Wt)}° forward (about chest height) at the top; free arm hanging`);
set('Trunk rotation', 'setup', 'Square to the front'); set('Trunk rotation', 'peak', 'Square (the trunk resists the pull of the one-sided load)');
set('Tempo', 'setup', 'Stand 0.6 s, hike back 0.75 s'); set('Tempo', 'peak', 'About 1.5 s per swing, two swings, then park');
console.log(`Dumbbell One Arm Swing: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -1) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
require('./families/eq-cable').limits(poses);
