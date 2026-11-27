// Dumbbell Swing (GymVisual #336812): one dumbbell held vertically in both hands by the handle (plates above and below
// the hands; grip 'end' on the right hand, the left hand mirrored on the other side of the handle), feet wider than the
// hips, toes out. Hike the dumbbell back between the legs with a hip hinge (flat back, knees soft), snap the hips forward
// to stand tall so the straight arms float the dumbbell up to chest height, let it fall back into the next hinge. Two
// swings per loop, then the dumbbell is brought to rest hanging in front. Both feet stay planted. Bilateral.
// Hip hinge, not a squat: McGill & Marshall 2012 measured 75 degrees of hip flexion and 69 degrees of knee flexion at the
// bottom of the kettlebell swing, extending to about 1-2 degrees at the top.
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-swing.json');

const F = P.makeFamily({ toe: 12, half: 19 });
const ZW = +(process.env.ZW ?? 4.5);     // wrist |z|: the hands either side of the handle
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
// straight arms at `a` degrees from hanging (+ forward), hands meeting at the midline
const arm = (a, flex = 5) => {
  const dir = (W) => { const S = W.shoulder_r.p, len = L.reach(flex), dz = ZW - S[2], ls = Math.sqrt(len * len - dz * dz); return [ls * Math.sin(a * Math.PI / 180), -ls * Math.cos(a * Math.PI / 180), dz]; };
  return { w: (W) => V.add(W.shoulder_r.p, dir(W)), elbow: (W) => V.add(W.shoulder_r.p, V.scale(V.norm(dir(W)), L.UA)), thumb: [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180), 0], elbowW: 0.6 };
};
const sc = (e, p) => ({ protract: p, elevate: e });
const KB = +(process.env.KB ?? 40), PB = +(process.env.PB ?? -52), AB = +(process.env.AB ?? -35);
const Bd = {
  stand: { feet: flat, knee: 5, pitch: 0, sc: sc(-2, 6) },
  back: { feet: flat, knee: KB, pitch: PB, shX: 12, spine: { l5: -2, t12: 0, t6: 1 }, sc: sc(-4, 8), neck: [-14, -10] },
  rise: { feet: flat, knee: 16, pitch: -28, shX: 6, spine: { l5: -1, t12: 0, t6: 0.5 }, sc: sc(-2, 8), neck: [-8, -6] },
  snap: { feet: flat, knee: 4, pitch: 2, sc: sc(0, 8) },
  top: { feet: flat, knee: 3, pitch: 3, sc: sc(2, 10) },
  fall: { feet: flat, knee: 6, pitch: 0, sc: sc(0, 8) },
};
const A = { stand: arm(14), back: arm(AB), rise: arm(-5), snap: arm(40), top: arm(88), fall: arm(40), dip: arm(-10) };
Bd.dip = { feet: flat, knee: 14, pitch: -30, shX: 6, sc: sc(-3, 7) };
const K = (name, t, n) => ({ name, t, cfg: Bd[name], arm: A[name], n });
const keys = [K('stand', 0), { same: 'stand', t: 0.6 }, K('dip', 1.0), K('back', 1.35, 1), K('rise', 1.62, 1), K('snap', 1.82), K('top', 2.08, 1),
  { ref: 'fall', t: 2.34 }, { ref: 'rise', t: 2.58, n: 1 }, { ref: 'back', t: 2.85, n: 1 }, { ref: 'rise', t: 3.12, n: 1 }, { ref: 'snap', t: 3.32 }, { ref: 'top', t: 3.58, n: 1 },
  { ref: 'fall', t: 3.84 }, { ref: 'rise', t: 4.08, n: 1 }, { ref: 'dip', t: 4.35 }, { ref: 'stand', t: 4.85, n: 1 }, { same: 'stand', t: 5.6 }];
// 'fall' is the way down from the top (same body as the snap); solve it once after the top
keys.splice(7, 0, K('fall', 2.34, 1)); keys.splice(8, 1);
const { poses, keyframes, err } = P.chain(F, keys);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r', 'end')];
const held = [{ side: 'r', grip: 'end' }];
// The dumbbell passes between the thighs with the forearms brushing them: the rig thigh shapes are fatter than the
// athlete's, so the legs are checked on the skinned mesh (b2/b4p/mesh.mjs: >= -0.4 cm, grazing) and left out here.
const rep = P.B.sweep(ex, { held, skipBody: ['hand_l', 'thumb_l', 'forearm_l', 'thigh_r', 'thigh_l', 'quad_r', 'quad_l', 'shank_r', 'shank_l', 'calf_r', 'calf_l'] });
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wb = W('back'), Wt = W('top');
const armAng = (Wx) => { const d = V.sub(Wx.wrist_r.p, Wx.shoulder_r.p); return Math.round(Math.atan2(d[0], -d[1]) * 180 / Math.PI); };
set('Hip flexion', 'setup', `≈${Math.round(poses.back.ch.hip_r.flex)}° at the bottom (joint channel), trunk ≈${Math.round(P.trunkLean(Wb))}° forward`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° at the top (standing tall)`);
set('Knee flexion', 'setup', `≈${Math.round(P.kneeOf(Wb, 'r'))}° at the bottom`); set('Knee flexion', 'peak', `≈${Math.round(P.kneeOf(Wt, 'r'))}° at the top`);
set('Arm swing', 'setup', `Arms ${-armAng(Wb)}° behind vertical, dumbbell between the thighs`); set('Arm swing', 'peak', `Arms ≈${armAng(Wt)}° forward (about chest height) at the top`);
set('Tempo', 'setup', 'Stand 0.6 s, hike back 0.75 s'); set('Tempo', 'peak', 'About 1.5 s per swing (0.7 s up, 0.8 s down), two swings, then park');
console.log(`Dumbbell Swing: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -1) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
