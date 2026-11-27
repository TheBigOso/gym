// Donkey Kick (GymVisual #303412, bent leg kickback kneeling): all fours on a mat (hands under the shoulders, knees under
// the hips, shins and insteps on the mat; the bird dog's base). The right knee stays bent about 90 degrees while the hip
// extends: the sole presses up toward the ceiling until the thigh is level with the floor, short squeeze, controlled
// return until the knee is just over the mat. Pelvis and trunk stay still. authoredSide 'right'.
// Contacts: both hands and the left shin stay planted; the right leg's contact weight goes to 0 as it lifts (its FK
// channels at the planted key are fitted to the IK solution, so lift-off and touch-down blend without a jump).
const L = require('./lib');
const { R, V, r1, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const meta = require('./meta/donkey-kick.json');

const A = F.allFours(), { fours, contacts, Wf } = A;
// hip flexion that puts the thigh level (knee at hip height), from the all-fours trunk pitch
const THIGH_LEVEL = (() => { const q = clone(fours); q.ik.leg_r.weight = 0; let a = -40, b = 40; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; q.ch.hip_r = { flex: m, abd: 0, rot: 0 }; if (L.fk(q).knee_r.p[1] > L.fk(q).hip_r.p[1]) a = m; else b = m; } return r1((a + b) / 2); })();
const HIP_TOP = Math.max(-19, THIGH_LEVEL - 1);
const h0 = fours.ch.hip_r, k0 = fours.ch.knee_r.flex, a0 = fours.ch.ankle_r.dorsi;
// f: 0 = planted, 1 = thigh level. The knee keeps about 90 degrees (a little more early on so the toes clear the mat).
function kick(f) {
  const q = clone(fours), e = f;
  q.ch.hip_r = { flex: r1(h0.flex + (HIP_TOP - h0.flex) * e), abd: r1(h0.abd * (1 - e)), rot: r1(h0.rot * (1 - e)) };
  q.ch.knee_r = { flex: r1(k0 + 8 * Math.sin(Math.PI * Math.min(1, f)) + 2 * f) };
  q.ch.ankle_r = { dorsi: r1(a0 + (-5 - a0) * Math.min(1, f / 0.7)) };   // foot flexes so the sole faces the ceiling
  q.ik.leg_r.weight = f > 0 ? 0 : 1;
  return q;
}
const poses = { fours, peel: kick(0.06), k1: kick(0.25), k2: kick(0.5), k3: kick(0.75), top: kick(1), squeeze: kick(1.03), near: kick(0.03) };
const keyframes = [{ t: 0, pose: 'fours' }, { t: 0.8, pose: 'fours' }, { t: 0.95, pose: 'peel' }, { t: 1.25, pose: 'k1' }, { t: 1.5, pose: 'k2' }, { t: 1.75, pose: 'k3' }, { t: 2.0, pose: 'top' }, { t: 2.3, pose: 'squeeze' }, { t: 2.6, pose: 'top' },
  { t: 3.0, pose: 'k3' }, { t: 3.4, pose: 'k2' }, { t: 3.8, pose: 'k1' }, { t: 4.05, pose: 'near' }, { t: 4.2, pose: 'fours' }, { t: 5.0, pose: 'fours' }];
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const kneeFixed = ['l'].map((s) => ({ joint: `knee_${s}`, p: Wf[`knee_${s}`].p }));
const sw = P.sweep(ex, kneeFixed);
let footMin = 1e9; H.loopReport(ex, { probe: (W, pz) => { if (pz.ik.leg_r.weight < 0.999) footMin = Math.min(footMin, H.bottomOf(W, 'foot_r'), H.bottomOf(W, 'shank_r')); } });
const Wt = L.fk(poses.top, contacts);
const thighAng = (W) => Math.atan2(W.knee_r.p[1] - W.hip_r.p[1], W.hip_r.p[0] - W.knee_r.p[0]) / R.DEG; // + = above level (behind the hip)
const set = H.setKin(ex);
set('Hands and knees', 'setup', `Hands under the shoulders, knees under the hips (hip ${Math.round(h0.flex)}°, knee ${Math.round(k0)}°)`); set('Hands and knees', 'peak', 'Hands and the left knee stay planted');
set('Hip extension', 'setup', `Hip ${Math.round(h0.flex)}° flexion (thigh vertical)`); set('Hip extension', 'peak', `Hip ${Math.round(poses.top.ch.hip_r.flex)}° (thigh ${Math.round(thighAng(Wt))}° from level)`);
set('Knee flexion', 'setup', `≈${Math.round(P.kneeAngle(Wf, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(P.kneeAngle(Wt, 'r'))}° (sole toward the ceiling)`);
set('Pelvis and trunk', 'setup', `Trunk ${Math.round(-fours.root.rot.pitch)}° from vertical, neutral spine`); set('Pelvis and trunk', 'peak', 'Unchanged (pelvis fixed, no rotation or arch)');
set('Tempo', 'setup', '0.8 s on all fours'); set('Tempo', 'peak', '1.2 s up, 0.6 s squeeze, 1.6 s down');
console.log(`Donkey Kick: wrote ${L.write(ex)}  thighLevel=${THIGH_LEVEL} hipTop=${HIP_TOP}\n  sweep ${JSON.stringify(sw)} liftedFootMin ${footMin.toFixed(2)} thigh ${r1(thighAng(Wt))} knee ${r1(P.kneeAngle(Wt, 'r'))}`);
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted hand or knee slides'); process.exitCode = 1; }
