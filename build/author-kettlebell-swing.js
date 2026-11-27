// Kettlebell Swing (GymVisual 7252, movement reference only): two-hand Russian swing. One kettlebell held by the handle
// in both hands (overhand, palms toward the body, hands side by side; attach wrist_r with wrist_l), feet a little wider
// than the hips, toes slightly out. Hike the bell back between the thighs with a hip hinge (flat back, soft knees), snap
// the hips forward to stand tall so the straight arms float the bell to about chest / shoulder height, let it fall back
// into the next hinge. Two swings per loop, then the bell is parked hanging in front. Both feet stay planted. Bilateral.
// Hinge solve as in author-dumbbell-swing.js (b4-power chain); bell clearance from the legs and the floor checked with
// EQ.kettlebellClear / kettlebellMinY (two: true).
const L = require('./lib');
const { R, V, rig } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const EQ = require('./families/equip');
const meta = require('./meta/kettlebell-swing.json');

const env = (k, d) => +(process.env[k] ?? d);
const F = P.makeFamily({ toe: 12, half: env('HALF', 23) });
const ZW = env('ZW', 5);   // wrist |z|: the hands side by side on the handle (grip width 2 * ZW)
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const D2R = Math.PI / 180;
// straight arms at `a` degrees from hanging (+ forward), wrists at z = +-ZW; overhand: palm faces the body (back, normal
// to the arm in the sagittal plane), thumb medial, so the handle runs across (Z) and both grip points stay 2 * ZW apart
const arm = (a, flex = 5) => {
  const dir = (W) => { const S = W.shoulder_r.p, len = L.reach(flex), dz = ZW - S[2], ls = Math.sqrt(len * len - dz * dz); return [ls * Math.sin(a * D2R), -ls * Math.cos(a * D2R), dz]; };
  return { w: (W) => V.add(W.shoulder_r.p, dir(W)), elbow: (W) => V.add(W.shoulder_r.p, V.scale(V.norm(dir(W)), L.UA)), palm: [-Math.cos(a * D2R), -Math.sin(a * D2R), 0], thumb: [0, 0, -1], elbowW: 0.6 };
};
const sc = (e, p) => ({ protract: p, elevate: e });
const KB = env('KB', 40), PB = env('PB', -52), AB = env('AB', -20);
const Bd = {
  stand: { feet: flat, knee: 5, pitch: 0, sc: sc(-2, 6) },
  dip: { feet: flat, knee: 14, pitch: -30, shX: 6, sc: sc(-3, 7) },
  back: { feet: flat, knee: KB, pitch: PB, shX: 12, spine: { l5: -2, t12: 0, t6: 1 }, sc: sc(-4, 8), neck: [-14, -10] },
  rise: { feet: flat, knee: 16, pitch: -28, shX: 6, spine: { l5: -1, t12: 0, t6: 0.5 }, sc: sc(-2, 8), neck: [-8, -6] },
  snap: { feet: flat, knee: 4, pitch: 2, sc: sc(0, 8) },
  top: { feet: flat, knee: 3, pitch: 3, sc: sc(2, 10) },
  fall: { feet: flat, knee: 6, pitch: 0, sc: sc(0, 8) },
};
const ANG = { stand: env('AS', 20), dip: env('AD', 6), back: AB, rise: env('AR', 8), snap: 40, top: env('AT', 84), fall: 40 };
// Every key (in-betweens too) is solved with straight arms at an interpolated swing angle on an interpolated body, so the
// arcs stay arcs (no elbow bend from lerped wrist chords) and both grip points stay on the handle.
const NB = env('NB', 2); // in-between keys per segment
const KEYS = [['stand', 0], ['stand', 0.6], ['dip', 1.0, NB], ['back', 1.35, NB], ['rise', 1.62, NB], ['snap', 1.82, 1], ['top', 2.08, NB],
  ['fall', 2.34, NB], ['rise', 2.58, NB], ['back', 2.85, NB], ['rise', 3.12, NB], ['snap', 3.32, 1], ['top', 3.58, NB],
  ['fall', 3.84, NB], ['rise', 4.08, NB], ['dip', 4.35, NB], ['stand', 4.85, NB], ['stand', 5.6]];
const poses = {}, keyframes = [], err = {}, state = {}, cfgs = {};
const solveKey = (name, cfg, ang) => {
  const b = P.body(F, cfg), p = P.mirror(P.handArm(b, arm(ang), state)); delete p.__spec; err[name] = state.err; return p;
};
for (const [n] of KEYS) if (!cfgs[n]) { cfgs[n] = JSON.parse(JSON.stringify(Bd[n])); P.body(F, cfgs[n]); }
let prev = null, mid = 0;
for (const [n, t, between] of KEYS) {
  if (prev && between) {
    for (let i = 1; i <= between; i++) {
      const f = i / (between + 1), nm = `${n}_m${mid++}`;
      poses[nm] = solveKey(nm, P.lerpCfg(cfgs[prev.n], cfgs[n], f), ANG[prev.n] + (ANG[n] - ANG[prev.n]) * f);
      keyframes.push({ t: +(prev.t + (t - prev.t) * f).toFixed(3), pose: nm });
    }
  }
  if (!poses[n]) poses[n] = solveKey(n, cfgs[n], ANG[n]);
  keyframes.push({ t, pose: n }); prev = { n, t };
}
const ex = H.module_(meta, F.contacts, poses, keyframes);
// the kettlebell: two-hand prop between the hands' handle points
ex.props = [{ id: 'kettlebell', kind: 'kettlebell', size: [EQ.KB.width, EQ.KB.bell, EQ.KB.bell], attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' } }];

// Self-check over the loop: feet, floor, bell clearance (legs, trunk; the hands and forearms hold it), grip width
const rep = P.B.sweep(ex, {});
const jump = P.jumps(ex);
const kb = { floor: 1e9, body: 1e9, bodyAt: null, wMin: 1e9, wMax: -1e9 };
{
  const tl = R.buildTimeline(ex), D = ex.timeline.duration;
  for (let i = 0; i <= 600; i++) {
    const t = (i / 600) * D, W = R.evalPose(rig, tl.pose(t), ex.contacts);
    kb.floor = Math.min(kb.floor, EQ.kettlebellMinY(W, 'r', { two: true }));
    const c = EQ.kettlebellClear(W, 'r', { two: true }); if (c.d < kb.body) { kb.body = c.d; kb.bodyAt = [c.id, +t.toFixed(2)]; }
    const w = EQ.barAt(W).width; kb.wMin = Math.min(kb.wMin, w); kb.wMax = Math.max(kb.wMax, w);
  }
  for (const k of ['floor', 'body', 'wMin', 'wMax']) kb[k] = +kb[k].toFixed(2);
}
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wb = W('back'), Wt = W('top');
const armAng = (Wx) => { const d = V.sub(Wx.wrist_r.p, Wx.shoulder_r.p); return Math.round(Math.atan2(d[0], -d[1]) * 180 / Math.PI); };
set('Hip flexion', 'setup', `≈${Math.round(poses.back.ch.hip_r.flex)}° at the bottom (joint channel), trunk ≈${Math.round(P.trunkLean(Wb))}° forward`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° at the top (standing tall)`);
set('Knee flexion', 'setup', `≈${Math.round(P.kneeOf(Wb, 'r'))}° at the bottom`); set('Knee flexion', 'peak', `≈${Math.round(P.kneeOf(Wt, 'r'))}° at the top`);
set('Arm swing', 'setup', `Arms ${-armAng(Wb)}° behind vertical, kettlebell between the thighs`); set('Arm swing', 'peak', `Arms ≈${armAng(Wt)}° forward at the top: hands at about ${Math.round(Wt.wrist_r.p[1])} cm, shoulders ${Math.round(Wt.shoulder_r.p[1])} cm`);
set('Grip', 'setup', `Hands side by side on the handle, grip points ${kb.wMin.toFixed(1)} cm apart`); set('Grip', 'peak', `Unchanged (${kb.wMin.toFixed(1)}-${kb.wMax.toFixed(1)} cm)`);
set('Tempo', 'setup', 'Stand 0.6 s, hike back 0.75 s'); set('Tempo', 'peak', 'About 1.5 s per swing (0.7 s up, 0.8 s down), two swings, then park');
console.log(`Kettlebell Swing: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} jump ${JSON.stringify(jump)}\n  kettlebell ${JSON.stringify(kb)} hands top ${Wt.wrist_r.p.map(Math.round)} back ${Wb.wrist_r.p.map(Math.round)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.floor < -0.5) { console.error('FAIL: body through the floor'); process.exitCode = 1; }
if (kb.floor < 0 || kb.body < 0) { console.error('FAIL: kettlebell through the floor or the body'); process.exitCode = 1; }
if (kb.wMax - kb.wMin > 1.5) { console.error('FAIL: grip width varies'); process.exitCode = 1; }
