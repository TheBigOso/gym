// Kneeling Side Leg to Kick (GymVisual #10855; page not readable here, movement from the name and standard coaching).
// All fours on a mat (the bird dog's base). The bent right leg lifts out to the side as in the fire hydrant (hip
// abduction to the rig's 45-degree limit, shin level), then the knee straightens and the hip opens so the straight leg
// kicks out level with the hip, about 45 degrees out from straight back (abduction at its limit); short hold, bend back
// to the hydrant, lower the knee. Pelvis and trunk stay still. authoredSide 'right'. Contacts as in the fire hydrant
// (both hands and the left shin planted; the right leg's contact weight goes to 0 while it is up).
const L = require('./lib');
const { R, V, r1, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const CA = require('./families/core-a');
const F4 = require('./families/b4-calvesglutes');
const B = require('./families/b6-18');
const meta = require('./meta/kneeling-side-leg-to-kick.json');

const A = P.allFours(), { fours, contacts, Wf } = A;
const ABD_TOP = 44;
const h0 = fours.ch.hip_r, k0 = fours.ch.knee_r.flex, a0 = fours.ch.ankle_r.dorsi;
// Fire hydrant lift (as author-fire-hydrant.js): f 0 = planted, 1 = thigh out to the side with the shin level.
function hydrant(f) {
  const q = clone(fours);
  q.ch.hip_r = { flex: r1(h0.flex - 2 * f), abd: r1(h0.abd + (ABD_TOP - h0.abd) * f), rot: h0.rot };
  q.ch.knee_r = { flex: r1(k0 + 4 * Math.sin(Math.PI * Math.min(1, f))) };
  q.ch.ankle_r = { dorsi: r1(a0 + (-50 - a0) * f) };
  q.ik.leg_r.weight = f > 0 ? 0 : 1;
  if (f > 0) {
    const g = Math.min(1, f / 0.3);
    const tgt = (W) => [(W.ankle_r.p[1] - (W.knee_r.p[1] * g + Wf.ankle_r.p[1] * (1 - g) + 0.6 * Math.sin(Math.PI * Math.min(1, f / 0.3)))) * 2];
    q.ch.hip_r.rot = L.solvePose(q, ['ch.hip_r.rot'], [tgt, L.obj.reg('ch.hip_r.rot', h0.rot, 0.01)]).pose.ch.hip_r.rot;
  }
  return q;
}
// Kick: knee straight, the leg level with the hip pointing out-and-back (direction KICK_DIR, abduction near the limit).
const KICK_DIR = V.norm([-1.05, 0, 1]);
const kick = (() => {
  const q = clone(fours); q.ik.leg_r.weight = 0; q.ch.knee_r = { flex: 5 }; q.ch.ankle_r = { dorsi: -35 };
  const paths = ['ch.hip_r.flex', 'ch.hip_r.abd', 'ch.hip_r.rot'];
  return L.solvePose(q, paths, [(W) => V.sub(V.norm(V.sub(W.ankle_r.p, W.hip_r.p)), KICK_DIR).map((v) => v * 10), CA.limitPen(paths, 3), (W, p) => [Math.max(0, p.ch.hip_r.abd - ABD_TOP) * 3], L.obj.reg('ch.hip_r.rot', 0, 0.02)]).pose;
})();
const HY = hydrant(1);
// u: 0 = hydrant, 1 = kick (channels blended; the knee straightens a little behind the hip turn so the foot stays up)
function toKick(u) {
  const q = clone(HY), e = B.ease(u), ek = B.ease(Math.min(1, u * 1.15));
  for (const c of ['flex', 'abd', 'rot']) q.ch.hip_r[c] = r1(HY.ch.hip_r[c] + (kick.ch.hip_r[c] - HY.ch.hip_r[c]) * e);
  q.ch.knee_r = { flex: r1(HY.ch.knee_r.flex + (kick.ch.knee_r.flex - HY.ch.knee_r.flex) * ek) };
  q.ch.ankle_r = { dorsi: r1(HY.ch.ankle_r.dorsi + (kick.ch.ankle_r.dorsi - HY.ch.ankle_r.dorsi) * e) };
  return q;
}
const poses = { fours, peel: hydrant(0.06), h1: hydrant(0.33), h2: hydrant(0.66), hy: HY, x1: toKick(0.35), x2: toKick(0.7), kick: toKick(1), kickHold: toKick(1), near: hydrant(0.03) };
poses.kickHold.ch.hip_r.abd = r1(Math.min(45, poses.kickHold.ch.hip_r.abd + 0.6));
const keyframes = [{ t: 0, pose: 'fours' }, { t: 0.8, pose: 'fours' }, { t: 0.95, pose: 'peel' }, { t: 1.2, pose: 'h1' }, { t: 1.4, pose: 'h2' }, { t: 1.6, pose: 'hy' },
  { t: 1.8, pose: 'x1' }, { t: 2.0, pose: 'x2' }, { t: 2.2, pose: 'kick' }, { t: 2.4, pose: 'kickHold' }, { t: 2.6, pose: 'kick' }, { t: 2.8, pose: 'x2' }, { t: 3.0, pose: 'x1' }, { t: 3.2, pose: 'hy' },
  { t: 3.45, pose: 'h2' }, { t: 3.7, pose: 'h1' }, { t: 3.9, pose: 'near' }, { t: 4.0, pose: 'fours' }, { t: 4.8, pose: 'fours' }];
F4.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.max(fours.ch.hip_r.flex, fours.ch.hip_l.flex) - 2), max: Math.ceil(Math.max(fours.ch.hip_r.flex, fours.ch.hip_l.flex) + 3) };
const sw = P.sweep(ex, [{ joint: 'knee_l', p: Wf.knee_l.p }]);
let footMin = 1e9; H.loopReport(ex, { probe: (W, pz, t) => { if (t > 1.2 && t < 3.7) footMin = Math.min(footMin, H.bottomOf(W, 'foot_r'), H.bottomOf(W, 'shank_r')); } });
const Wh = L.fk(poses.hy, contacts), Wk = L.fk(poses.kick, contacts);
const thighOut = (W) => V.angle(V.sub(W.knee_r.p, W.hip_r.p), [0, -1, 0]);
const legOut = (W) => Math.atan2(W.ankle_r.p[2] - W.hip_r.p[2], -(W.ankle_r.p[0] - W.hip_r.p[0])) / R.DEG;
const set = H.setKin(ex);
set('Hip abduction', 'setup', `≈${Math.round(h0.abd)}°`); set('Hip abduction', 'peak', `${ABD_TOP}° channel (rig limit 45°): thigh ≈${Math.round(thighOut(Wh))}° out from vertical in the hydrant`);
set('Knee extension', 'setup', `≈${Math.round(P.kneeAngle(Wh, 'r'))}° in the hydrant`); set('Knee extension', 'peak', `≈${Math.round(P.kneeAngle(Wk, 'r'))}°: leg level (ankle ${r1(Wk.ankle_r.p[1] - Wk.hip_r.p[1])} cm from hip height), ${Math.round(legOut(Wk))}° out from straight back`);
set('Pelvis and trunk', 'setup', `Trunk ${Math.round(-fours.root.rot.pitch)}° from vertical`); set('Pelvis and trunk', 'peak', 'Unchanged (pelvis fixed, no lean)');
set('Hands and knees', 'setup', `Hands under the shoulders, knees under the hips (hip ${Math.round(h0.flex)}°)`); set('Hands and knees', 'peak', 'Hands and the left knee stay planted');
set('Tempo', 'setup', '0.8 s on all fours'); set('Tempo', 'peak', '0.8 s lift, 0.6 s kick, 0.4 s hold, 0.6 s bend, 0.8 s lower');
ex.exercise.reference.note = B.NOTE;
console.log(`Kneeling Side Leg to Kick: wrote ${L.write(ex)}  kick=${JSON.stringify(kick.ch.hip_r)} measure=${JSON.stringify(ex.checks.measure)}\n  sweep ${JSON.stringify(sw)} liftedFootMin ${footMin.toFixed(2)}`);
const lim = CA.scan(ex).limits;
if (sw.slide > 0.05 || sw.drift > 0.05 || sw.floor < -0.5 || lim.length || footMin < -0.3) { console.error('FAIL kneeling-side-leg-to-kick', lim.slice(0, 4)); process.exitCode = 1; }
