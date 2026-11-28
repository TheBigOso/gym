// Bent Knee Back to Side Kick (GymVisual 10856, movement reference only; page not readable at authoring time). All fours
// on a mat (hands under the shoulders, knees under the hips; the bird dog base). With the right knee bent about 90
// degrees the hip extends until the thigh is level (back kick, as the donkey kick), short squeeze; the knee returns under
// the hip without touching down, then the bent leg lifts out to the side by hip abduction with the shin level (side kick,
// as the fire hydrant), short pause, and lowers until the knee touches the mat. Pelvis and trunk stay still.
// authoredSide 'right'. Contacts: both hands and the left shin stay planted; the right leg's weight is 0 while lifted.
const L = require('./lib');
const { R, V, r1, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const FG = require('./families/b4-calvesglutes');
const meta = require('./meta/bent-knee-back-to-side-kick.json');

const A = P.allFours(), { fours, contacts, Wf } = A;
const h0 = fours.ch.hip_r, k0 = fours.ch.knee_r.flex, a0 = fours.ch.ankle_r.dorsi;
// back kick (donkey kick): f 0 = planted, 1 = thigh level
const THIGH_LEVEL = (() => { const q = clone(fours); q.ik.leg_r.weight = 0; let a = -40, b = 40; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; q.ch.hip_r = { flex: m, abd: 0, rot: 0 }; if (L.fk(q).knee_r.p[1] > L.fk(q).hip_r.p[1]) a = m; else b = m; } return r1((a + b) / 2); })();
const HIP_TOP = Math.max(-19, THIGH_LEVEL - 1);
function back(f) {
  const q = clone(fours);
  q.ch.hip_r = { flex: r1(h0.flex + (HIP_TOP - h0.flex) * f), abd: r1(h0.abd * (1 - f)), rot: r1(h0.rot * (1 - f)) };
  q.ch.knee_r = { flex: r1(k0 + 8 * Math.sin(Math.PI * Math.min(1, f)) + 2 * f) };
  q.ch.ankle_r = { dorsi: r1(a0 + (-5 - a0) * Math.min(1, f / 0.7)) };
  q.ik.leg_r.weight = f > 0 ? 0 : 1;
  return q;
}
// side kick (fire hydrant): f 0 = planted, 1 = top; hip rotation keeps the shin level once the knee is off the mat
const ABD_TOP = 44;
function side(f) {
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
// hover under the hip between the two kicks: knee about 3 cm off the mat
const hover = side(0.3);
const poses = { fours, peel: back(0.06), b1: back(0.33), b2: back(0.66), btop: back(1), bsq: back(1.03), bret: back(0.4), hover,
  s1: side(0.33), s2: side(0.66), stop: side(1), spause: side(1), s3: side(0.5), near: side(0.03) };
poses.spause.ch.hip_r.abd = 45;
const keyframes = [{ t: 0, pose: 'fours' }, { t: 0.8, pose: 'fours' }, { t: 0.95, pose: 'peel' }, { t: 1.35, pose: 'b1' }, { t: 1.7, pose: 'b2' }, { t: 2.0, pose: 'btop' }, { t: 2.4, pose: 'bsq' },
  { t: 2.8, pose: 'bret' }, { t: 3.2, pose: 'hover' }, { t: 3.6, pose: 's1' }, { t: 4.0, pose: 's2' }, { t: 4.4, pose: 'stop' }, { t: 4.8, pose: 'spause' }, { t: 5.4, pose: 's3' }, { t: 5.85, pose: 'near' }, { t: 6.0, pose: 'fours' }, { t: 6.8, pose: 'fours' }];
FG.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const sw = P.sweep(ex, [{ joint: 'knee_l', p: Wf.knee_l.p }]);
let footMin = 1e9, kneeMinMid = 1e9;
H.loopReport(ex, { probe: (W, pz, t) => { if (pz.ik.leg_r.weight < 0.999) footMin = Math.min(footMin, H.bottomOf(W, 'foot_r'), H.bottomOf(W, 'shank_r')); if (t > 2.4 && t < 3.6) kneeMinMid = Math.min(kneeMinMid, H.bottomOf(W, 'shank_r')); } });
const Wb = L.fk(poses.btop, contacts), Ws = L.fk(poses.stop, contacts);
const thighAng = (W) => Math.atan2(W.knee_r.p[1] - W.hip_r.p[1], W.hip_r.p[0] - W.knee_r.p[0]) / R.DEG;
const thighOut = (W) => V.angle(V.sub(W.knee_r.p, W.hip_r.p), [0, -1, 0]);
const set = H.setKin(ex);
set('Hands and knees', 'setup', `Hands under the shoulders, knees under the hips (hip ${Math.round(h0.flex)}°, knee ${Math.round(k0)}°)`); set('Hands and knees', 'peak', 'Hands and the left knee stay planted');
set('Hip extension', 'setup', `Hip ${Math.round(h0.flex)}° flexion (thigh vertical)`); set('Hip extension', 'peak', `Hip ${Math.round(poses.btop.ch.hip_r.flex)}° (thigh ${Math.round(thighAng(Wb))}° from level)`);
set('Hip abduction', 'setup', `≈${Math.round(h0.abd)}°`); set('Hip abduction', 'peak', `${ABD_TOP}-45° channel (rig limit 45°); thigh ≈${Math.round(thighOut(Ws))}° out from vertical`);
set('Knee flexion', 'setup', `≈${Math.round(P.kneeAngle(Wf, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(P.kneeAngle(Wb, 'r'))}° on the back kick, ≈${Math.round(P.kneeAngle(Ws, 'r'))}° on the side kick`);
set('Pelvis and trunk', 'setup', `Trunk ${Math.round(-fours.root.rot.pitch)}° from vertical`); set('Pelvis and trunk', 'peak', 'Unchanged (pelvis fixed)');
set('Tempo', 'setup', '0.8 s on all fours'); set('Tempo', 'peak', '1.2 s back, 0.4 s squeeze, 0.8 s return, 1.2 s side, 0.4 s pause, 1.2 s down');
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(h0.flex - 6), max: Math.ceil(h0.flex + 6) };
console.log(`Bent Knee Back to Side Kick: wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)} liftedFootMin ${footMin.toFixed(2)} kneeOffMatBetween ${kneeMinMid.toFixed(2)} thighBack ${r1(thighAng(Wb))} thighOut ${r1(thighOut(Ws))}`);
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted hand or knee slides'); process.exitCode = 1; }
if (sw.floor < -0.5 || footMin < -0.3 || kneeMinMid < 0.3) { console.error('FAIL: floor'); process.exitCode = 1; }
