// Dumbbell Full Swing (GymVisual 7582; movement reference only, the page could not be read, so the movement follows the
// name and standard coaching): the American (overhead) swing. One dumbbell held vertically in both hands by the handle
// (grip 'end' on the right hand, the left hand on the other side of the handle, as in author-dumbbell-swing.js), feet
// wider than the hips. Hike the dumbbell back between the thighs with a hip hinge, snap the hips forward to stand tall
// and let the straight arms carry the dumbbell all the way overhead (arms by the ears, dumbbell vertical over the
// head), then let it fall back into the next hinge. Two swings per loop, then park. Feet planted. Bilateral.
// The hinge follows McGill & Marshall 2012 (kettlebell swing: about 75 degrees of hip flexion and 69 degrees of knee
// flexion at the bottom, about 1-2 degrees at the top); the overhead finish is standard American-swing coaching.
const L = require('./lib');
const { V, r1 } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-full-swing.json');

const F = P.makeFamily({ toe: 12, half: 19 });
const ZW = +(process.env.ZW ?? 4.5);
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
// straight arms at `a` degrees from hanging (+ forward, 180 = straight up), hands meeting at the midline
const arm = (a, flex = 5) => {
  const dir = (W) => { const S = W.shoulder_r.p, len = L.reach(flex), dz = ZW - S[2], ls = Math.sqrt(len * len - dz * dz); return [ls * Math.sin(a * Math.PI / 180), -ls * Math.cos(a * Math.PI / 180), dz]; };
  return { w: (W) => V.add(W.shoulder_r.p, dir(W)), elbow: (W) => V.add(W.shoulder_r.p, V.scale(V.norm(dir(W)), L.UA)), thumb: [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180), 0], palm: [0, 0, -1], elbowW: 0.6 };
};
const sc = (e, p) => ({ protract: p, elevate: e });
const Bd = {
  stand: { feet: flat, knee: 5, pitch: 0, sc: sc(-2, 6) },
  dip: { feet: flat, knee: 14, pitch: -30, shX: 6, sc: sc(-3, 7) },
  back: { feet: flat, knee: 40, pitch: -54, shX: 12, spine: { l5: -2, t12: 0, t6: 1 }, sc: sc(-4, 8), neck: [-14, -10] },
  rise: { feet: flat, knee: 16, pitch: -28, shX: 6, spine: { l5: -1, t12: 0, t6: 0.5 }, sc: sc(-2, 8), neck: [-8, -6] },
  snap: { feet: flat, knee: 4, pitch: 2, sc: sc(2, 8) },
  high: { feet: flat, knee: 3, pitch: 2, sc: sc(12, 8) },
  over: { feet: flat, knee: 3, pitch: 1.5, sc: sc(18, 7) },
  top: { feet: flat, knee: 3, pitch: 1, sc: sc(24, 6), neck: [4, 2] },
  fall: { feet: flat, knee: 5, pitch: 1, sc: sc(10, 8) },
};
const A = { stand: arm(22), dip: arm(0), back: arm(-20), rise: arm(-5), snap: arm(45), high: arm(110), over: arm(142), top: arm(+(process.env.AT ?? 172), 6), fall: arm(110) };
const K = (name, t, n) => ({ name, t, cfg: Bd[name], arm: A[name], n });
const keys = [K('stand', 0), { same: 'stand', t: 0.6 }, K('dip', 1.0), K('back', 1.35, 1), K('rise', 1.6, 1), K('snap', 1.78), K('high', 1.96), K('over', 2.1), K('top', 2.25),
  { ref: 'over', t: 2.4 }, K('fall', 2.55), { ref: 'snap', t: 2.75 }, { ref: 'rise', t: 2.98 }, { ref: 'back', t: 3.25, n: 1 }, { ref: 'rise', t: 3.5, n: 1 }, { ref: 'snap', t: 3.68 }, { ref: 'high', t: 3.86 }, { ref: 'over', t: 4.0 }, { ref: 'top', t: 4.15 },
  { ref: 'over', t: 4.3 }, { ref: 'fall', t: 4.45 }, { ref: 'snap', t: 4.68 }, { ref: 'rise', t: 4.95 }, { ref: 'dip', t: 5.25 }, { ref: 'stand', t: 5.75, n: 1 }, { same: 'stand', t: 6.4 }];
const { poses, keyframes, err } = P.chain(F, keys);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r', 'end')];
const held = [{ side: 'r', grip: 'end' }];
const rep = P.B.sweep(ex, { held, skipBody: (process.env.SKIP || 'hand_l,thumb_l,forearm_l').split(',') });
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wb = W('back'), Wt = W('top');
const armAng = (Wx) => { const d = V.sub(Wx.wrist_r.p, Wx.shoulder_r.p); return Math.round(Math.atan2(d[0], -d[1]) * 180 / Math.PI); };
const armUp = (Wx) => { const d = V.sub(Wx.wrist_r.p, Wx.shoulder_r.p); return Math.round(V.angle(d, [0, -1, 0])); };
set('Hip flexion', 'setup', `≈${Math.round(poses.back.ch.hip_r.flex)}° at the bottom (joint channel), trunk ≈${Math.round(P.trunkLean(Wb))}° forward`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° at the top (standing tall)`);
set('Knee flexion', 'setup', `≈${Math.round(P.kneeOf(Wb, 'r'))}° at the bottom`); set('Knee flexion', 'peak', `≈${Math.round(P.kneeOf(Wt, 'r'))}° at the top`);
set('Arm swing', 'setup', `Arms ${-armAng(Wb)}° behind vertical, dumbbell between the thighs`); set('Arm swing', 'peak', `Arms ≈${armUp(Wt)}° from hanging (overhead, by the ears), shoulder elevation ${Math.round(poses.top.ch.shoulder_r.elev)}°`);
set('Tempo', 'setup', 'Stand 0.6 s, hike back 0.75 s'); set('Tempo', 'peak', 'About 1.9 s per swing (0.9 s up, 1 s down), two swings, then park');
console.log(`Dumbbell Full Swing: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} jump ${JSON.stringify(jump)}\n  top shoulder ${JSON.stringify(poses.top.ch.shoulder_r)} elbow ${poses.top.ch.elbow_r.flex}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -1) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
if (jump.v > 900) { console.error('FAIL: arm channel jump'); process.exitCode = 1; }
require('./families/eq-cable').limits(poses);
