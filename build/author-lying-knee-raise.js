// Lying Knee Raise (GymVisual 19022, movement reference only; the page could not be read at authoring time). Supine on
// a mat, arms by the sides palms down (planted hands), legs long with the heels hovering just off the mat. Bend the
// knees and draw them in toward the chest (hips about 115 degrees), pause, then push the legs back out long to the
// hover. The pelvis stays on the mat (curling it up would be the reverse crunch). Bilateral.
const L = require('./lib');
const { R, V, r1, clone } = L;
const C = require('./families/core-a');
const F = require('./families/b6-16');
const meta = require('./meta/lying-knee-raise.json');

const { base, HC } = F.supine();
const HOVER = 6;
// thigh at `thigh` degrees from the floor with the knee bent `knee`; ankle relaxed
function tuck(thigh, knee, dorsi = -15) {
  const q = clone(base);
  for (const s of ['r', 'l']) { q.ch[`knee_${s}`] = { flex: knee }; q.ch[`ankle_${s}`] = { dorsi }; }
  let lo = -10, hi = 140;
  for (let i = 0; i < 50; i++) { const h = (lo + hi) / 2; q.ch.hip_r = { flex: h, abd: -2, rot: 0 }; if (C.thighFromFloor(L.fk(q)) < thigh) lo = h; else hi = h; }
  q.ch.hip_r = { flex: r1((lo + hi) / 2), abd: -2, rot: 0 };
  return C.mirrorLeg(q);
}
const hover = F.legsLR(base, { heel: HOVER, knee: 3, dorsi: -16 }, { heel: HOVER, knee: 3, dorsi: -16 });
// the in-between keys keep the feet above the hover height as the knees bend (heels travel along the mat line, not into it)
const poses = { hover, mid: tuck(52, 70, -18), top: tuck(118, 118, -15), topHold: tuck(119, 119, -15), out: tuck(30, 40, -18) };
const keyframes = [{ t: 0, pose: 'hover' }, { t: 0.5, pose: 'hover' }, { t: 1.05, pose: 'mid' }, { t: 1.6, pose: 'top' }, { t: 2.0, pose: 'topHold' }, { t: 2.8, pose: 'mid' }, { t: 3.3, pose: 'out' }, { t: 3.6, pose: 'hover' }, { t: 5.4, pose: 'hover' }];
const ex = C.buildModule(meta, poses, keyframes, HC);
const pk = poses.topHold.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk - 6), max: Math.ceil(pk + 4) };
const heel = (W) => C.minOf(W, ['foot_r', 'calf_r', 'shank_r', 'foot_l', 'calf_l', 'shank_l']);
const rep = C.scan(ex, { hip: (W, p) => p.ch.hip_r.flex, heel, thigh: (W) => C.thighFromFloor(W) });
const Wh = L.fk(poses.hover, HC), Wt = L.fk(poses.topHold, HC), d = (v) => `≈${Math.round(v)}°`;
const set = (p, s, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k.setup = s; k.peak = v; };
set('Hip flexion', d(poses.hover.ch.hip_r.flex), `${d(pk)} (thighs ${d(C.thighFromFloor(Wt))} from the floor, knees over the chest)`);
set('Knees', d(C.kneeOf(Wh, 'r')), d(C.kneeOf(Wt, 'r')));
set('Heels', `${r1(heel(Wh))} cm off the mat`, `Never below ${rep.heel[0]} cm during the rep`);
set('Pelvis', 'On the mat', `Unchanged (pelvis moves ${rep.still} cm)`);
set('Tempo', 'Hover 0.5 s', '1.1 s in, 0.4 s pause, 1.6 s out, 1.8 s hover');
console.log(`Lying Knee Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
C.guard('lying-knee-raise', rep, [rep.heel[0] < 2 && `heels touch the mat (${rep.heel[0]} cm)`]);
