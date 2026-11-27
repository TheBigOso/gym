// Fire Hydrant (GymVisual #303512, bent leg side kick kneeling): all fours on a mat (the bird dog's base). The bent right
// leg (knee about 90 degrees) lifts out to the side by hip abduction with the hip flexed, shin kept level with the floor,
// to the rig's 45-degree abduction limit; short pause, controlled lowering until the knee is just over the mat. Pelvis and
// trunk stay still and square. authoredSide 'right'. Contacts as in the donkey kick (right leg weight 0 while lifted).
const L = require('./lib');
const { R, V, r1, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const meta = require('./meta/fire-hydrant.json');

const A = P.allFours(), { fours, contacts, Wf } = A;
const ABD_TOP = 44;
const h0 = fours.ch.hip_r, k0 = fours.ch.knee_r.flex, a0 = fours.ch.ankle_r.dorsi;
// f: 0 = planted, 1 = top. Hip rotation per key keeps the shin level (ankle at knee height) once the knee is off the mat.
function lift(f) {
  const q = clone(fours);
  q.ch.hip_r = { flex: r1(h0.flex - 2 * f), abd: r1(h0.abd + (ABD_TOP - h0.abd) * f), rot: h0.rot };
  q.ch.knee_r = { flex: r1(k0 + 4 * Math.sin(Math.PI * Math.min(1, f))) };
  q.ch.ankle_r = { dorsi: r1(a0 + (-50 - a0) * f) };
  q.ik.leg_r.weight = f > 0 ? 0 : 1;
  if (f > 0) { // shin level: ankle height = knee height, blended in over the first 30% so lift-off stays continuous
    const g = Math.min(1, f / 0.3);
    const tgt = (W) => [(W.ankle_r.p[1] - (W.knee_r.p[1] * g + Wf.ankle_r.p[1] * (1 - g) + 0.6 * Math.sin(Math.PI * Math.min(1, f / 0.3)))) * 2];
    const s = L.solvePose(q, ['ch.hip_r.rot'], [tgt, L.obj.reg('ch.hip_r.rot', h0.rot, 0.01)]);
    q.ch.hip_r.rot = s.pose.ch.hip_r.rot;
  }
  return q;
}
const poses = { fours, peel: lift(0.06), k1: lift(0.25), k2: lift(0.5), k3: lift(0.75), top: lift(1), squeeze: lift(1.0), near: lift(0.03) };
poses.squeeze.ch.hip_r.abd = 45;
const keyframes = [{ t: 0, pose: 'fours' }, { t: 0.8, pose: 'fours' }, { t: 0.95, pose: 'peel' }, { t: 1.25, pose: 'k1' }, { t: 1.5, pose: 'k2' }, { t: 1.75, pose: 'k3' }, { t: 2.0, pose: 'top' }, { t: 2.3, pose: 'squeeze' }, { t: 2.6, pose: 'top' },
  { t: 3.0, pose: 'k3' }, { t: 3.4, pose: 'k2' }, { t: 3.8, pose: 'k1' }, { t: 4.05, pose: 'near' }, { t: 4.2, pose: 'fours' }, { t: 5.0, pose: 'fours' }];
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const sw = P.sweep(ex, [{ joint: 'knee_l', p: Wf.knee_l.p }]);
const Wt = L.fk(poses.top, contacts);
const thighOut = (W) => V.angle(V.sub(W.knee_r.p, W.hip_r.p), [0, -1, 0]);
const shinTilt = (W) => Math.atan2(W.ankle_r.p[1] - W.knee_r.p[1], V.len([W.ankle_r.p[0] - W.knee_r.p[0], 0, W.ankle_r.p[2] - W.knee_r.p[2]])) / R.DEG;
const set = H.setKin(ex);
set('Hands and knees', 'setup', `Hands under the shoulders, knees under the hips (hip ${Math.round(h0.flex)}°, knee ${Math.round(k0)}°)`); set('Hands and knees', 'peak', 'Hands and the left knee stay planted');
set('Hip abduction', 'setup', `≈${Math.round(h0.abd)}°`); set('Hip abduction', 'peak', `${ABD_TOP}° channel (rig limit 45°); thigh ≈${Math.round(thighOut(Wt))}° out from vertical, knee ${r1(Wt.knee_r.p[1] - Wf.knee_r.p[1])} cm up`);
set('Knee flexion', 'setup', `≈${Math.round(P.kneeAngle(Wf, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(P.kneeAngle(Wt, 'r'))}°, shin ${Math.round(Math.abs(shinTilt(Wt)))}° from level`);
set('Pelvis and trunk', 'setup', `Trunk ${Math.round(-fours.root.rot.pitch)}° from vertical`); set('Pelvis and trunk', 'peak', 'Unchanged (pelvis fixed, no lean)');
set('Tempo', 'setup', '0.8 s on all fours'); set('Tempo', 'peak', '1.2 s up, 0.6 s pause, 1.6 s down');
console.log(`Fire Hydrant: wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)} thighOut ${r1(thighOut(Wt))} shinTilt ${r1(shinTilt(Wt))} rotTop ${poses.top.ch.hip_r.rot} kneeUp ${r1(Wt.knee_r.p[1])}`);
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted hand or knee slides'); process.exitCode = 1; }
