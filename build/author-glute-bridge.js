// Glute Bridge (GymVisual #247112): supine on a mat, knees bent, feet flat and hip width (planted leg contacts), arms on the
// floor by the sides (planted hand contacts). The pelvis rolls up about the upper back until knees, hips and shoulders form
// one line (about 1.5 s), a 1 s squeeze, about 2 s down. Head stays on the mat; the neck flexes as the trunk tilts. Bilateral.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const meta = require('./meta/glute-bridge.json');

const lie = H.lieBase();
const W0 = L.fk(lie), SX = W0.shoulder_r.p[0], P0 = lie.root.rot.pitch, L5 = lie.ch.spine_l5.flex;
// Trunk for a pelvis roll dP (deg): the upper back stays on the mat (shoulders keep their x), the head stays resting on it.
function trunk(dP, l5) {
  const p = clone(lie); p.root.rot.pitch = r1(P0 + dP); p.ch.spine_l5.flex = r1(l5);
  return L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.neck_c7.flex', 'ch.head_c1.flex'], [
    (W) => [(H.bottomOf(W, 'chest') - 0.2) * 2, Math.min(0, H.bottomOf(W, 'neck') - 0.5) * 6, Math.min(0, H.bottomOf(W, 'chest')) * 6, Math.min(0, H.bottomOf(W, 'buttock_r') - 0.1) * 4, Math.min(0, H.bottomOf(W, 'hair') - 0.3) * 6, Math.min(0, H.bottomOf(W, 'thigh_r') - 0.05) * 8, (W.shoulder_r.p[0] - SX) * 2],
    // rig v2: the head sits forward of the upper back, so with a neutral neck it rests just off the mat (no forcing it down)
    (W, q) => [(q.ch.head_c1.flex - q.ch.neck_c7.flex * 0.5) * 0.3, (q.ch.neck_c7.flex - (-22 + dP * 0.6)) * 0.1, Math.max(0, q.ch.neck_c7.flex - 39) * 3, Math.max(0, q.ch.head_c1.flex - 29) * 3, Math.max(0, -27 - q.ch.neck_c7.flex) * 3, Math.max(0, -27 - q.ch.head_c1.flex) * 3]], { iters: 400 }).pose;
}
// Low back: the slight resting lordosis flattens as the hips rise (pelvis tucks a little, no arching at the top)
const l5At = (f) => L5 + (0 - L5) * f;
// Knee-hip-shoulder straightness at the hip (180 = straight)
const xy = (v) => [v[0], v[1], 0];
const lineAt = (W) => V.angle(xy(V.sub(W.knee_r.p, W.hip_r.p)), xy(V.sub(W.shoulder_r.p, W.hip_r.p))); // sagittal view
// how far (cm) the hip sits below the shoulder-knee line in the side view (> 0 = hips still low)
const sagBelow = (W) => { const a = W.shoulder_r.p, k = W.knee_r.p, h = W.hip_r.p, d = V.norm([k[0] - a[0], k[1] - a[1], 0]); return -((h[0] - a[0]) * -d[1] + (h[1] - a[1]) * d[0]); };

// Feet: hip width; the ankle x is chosen so the knee is 90 degrees at the top (Lehecka 2017 traditional bridge)
const Z_FOOT = 10;
const contacts = [H.legC('r', { pole: [0.15, 1, 0.04] }), H.legC('l', { pole: [0.15, 1, -0.04] }), H.handC('r', [0, 0.5, 1]), H.handC('l', [0, 0.5, -1])];
const legOnly = contacts.slice(0, 2);
const withFeet = (p, ax) => { const q = clone(p); q.ik = { leg_r: { target: [ax, L.ANKLE_H, Z_FOOT], weight: 1 }, leg_l: { target: [ax, L.ANKLE_H, -Z_FOOT], weight: 1 } }; return q; };
function topFor(ax) { // pelvis roll where the line is straight, for feet at ax
  let lo = 5, hi = 70;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, W = L.fk(withFeet(trunk(m, l5At(1)), ax), legOnly); if (sagBelow(W) > 0) lo = m; else hi = m; }
  return r1((lo + hi) / 2);
}
let a = 30, b = 60, AX = 45, DP_TOP = 0;
for (let i = 0; i < 25; i++) { AX = (a + b) / 2; DP_TOP = topFor(AX); const W = L.fk(withFeet(trunk(DP_TOP, l5At(1)), AX), legOnly); if (H.kneeOf(W, 'r') > 90) a = AX; else b = AX; }
AX = r1(AX); DP_TOP = topFor(AX);

// Hands: on the floor beside the hips, palms down, fingers toward the feet (constant targets)
const HAND = { r: [r1(W0.hip_r.p[0] + 4), 2.7, 24], l: [r1(W0.hip_r.p[0] + 4), 2.7, -24] };
const ARM_GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 30, elev: 15, axial: 0 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 80, flex: 0, dev: 0 } }, { [`shoulder_${s}`]: { plane: -20, elev: 20, axial: 60 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: 0, dev: 0 } }];
function poseAt(f) {
  let p = withFeet(trunk(DP_TOP * f, l5At(f)), AX);
  p.ch.sc_r = { protract: 0, elevate: 0 }; p.ch.sc_l = { protract: 0, elevate: 0 };
  for (const s of ['r', 'l']) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target);
  for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], ARM_GUESS(s)); delete p.__cost; }
  p.ik.arm_r = { target: HAND.r.slice(), weight: 1 }; p.ik.arm_l = { target: HAND.l.slice(), weight: 1 };
  return p;
}
// Keys along the roll: monotone fractions so the upper back pivots without sliding between keys
const poses = { lie: poseAt(0), u25: poseAt(0.25), u50: poseAt(0.5), u75: poseAt(0.75), top: poseAt(1), squeeze: poseAt(1.02), d75: poseAt(0.75), d50: poseAt(0.5), d25: poseAt(0.25), touch: poseAt(0.03) };
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.2, pose: 'u25' }, { t: 1.6, pose: 'u50' }, { t: 1.95, pose: 'u75' }, { t: 2.3, pose: 'top' }, { t: 2.8, pose: 'squeeze' }, { t: 3.3, pose: 'top' },
  { t: 3.8, pose: 'd75' }, { t: 4.3, pose: 'd50' }, { t: 4.8, pose: 'd25' }, { t: 5.3, pose: 'touch' }, { t: 5.6, pose: 'lie' }, { t: 6.0, pose: 'lie' }];

const ex = H.module_(meta, contacts, poses, keyframes);
let shX = [1e9, -1e9], chestMax = -1e9, headMin = 1e9;
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l', 'arm_r', 'arm_l'], probe: (W) => { shX = [Math.min(shX[0], W.shoulder_r.p[0]), Math.max(shX[1], W.shoulder_r.p[0])]; chestMax = Math.max(chestMax, H.bottomOf(W, 'neck')); headMin = Math.min(headMin, H.bottomOf(W, 'hair')); } });
const Wl = L.fk(poses.lie, contacts), Wt = L.fk(poses.top, contacts);
const tilt = (W) => Math.atan2(W.hip_r.p[1] - W.shoulder_r.p[1], W.hip_r.p[0] - W.shoulder_r.p[0]) / R.DEG;
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${Math.round(poses.lie.ch.hip_r.flex)}° (lying)`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° (neutral; knee-hip-shoulder line ${Math.round(lineAt(Wt))}°)`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wl, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}° (shin about vertical)`);
set('Trunk line', 'setup', `≈${Math.round(tilt(Wl))}° (shoulder-to-hip line from the floor)`); set('Trunk line', 'peak', `≈${Math.round(tilt(Wt))}° from the floor`);
set('Hip height', 'setup', `Hip joint ${r1(Wl.hip_r.p[1])} cm above the floor`); set('Hip height', 'peak', `${r1(Wt.hip_r.p[1])} cm (+${r1(Wt.hip_r.p[1] - Wl.hip_r.p[1])} cm)`);
set('Tempo', 'setup', 'Lying 0.8 s'); set('Tempo', 'peak', '1.5 s up, 1.0 s squeeze, 2.0 s down, 0.7 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wl.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Glute Bridge: feet x ${AX} (hip at ${W0.hip_r.p[0]}), roll ${DP_TOP}° wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} shoulderX ${shX.map(r1)} neckBottomMax ${r1(chestMax)} headMin ${headMin.toFixed(2)} travel ${r1(travel)}`);
console.log('  top', JSON.stringify({ neck: poses.top.ch.neck_c7, head: poses.top.ch.head_c1, sh: poses.top.ch.shoulder_r, el: poses.top.ch.elbow_r, wr: poses.top.ch.wrist_r, hip: poses.top.ch.hip_r, knee: poses.top.ch.knee_r, ank: poses.top.ch.ankle_r }));
if (rep.slide > 0.05) { console.error('FAIL: planted hand or foot slides'); process.exitCode = 1; }
