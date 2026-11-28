// Bridge Hip Abduction (GymVisual #989; page not readable here, movement from the name: the glute bridge with knee
// openings at the top, done without a band). Bilateral: supine on a mat, knees bent, feet flat hip width (planted), arms
// on the floor by the sides (planted). Roll the hips up into a bridge (knee-hip-shoulder line straight), then, holding the
// hips high, open both knees out to the sides and bring them back together twice; the feet stay where they are and roll
// onto their outer edges as the knees open. Lower the hips slowly. Bridge base from author-glute-bridge.js; while the knees
// open the legs are FK (foot contacts released) with the ankles held over their floor spots and the soles on the mat.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b6-13');
const meta = require('./meta/bridge-hip-abduction.json');

const BR = F.bridge();
const { contacts, AX } = BR;
const OPEN = +(process.env.OPEN || 11); // cm each knee travels outward at full opening
const foot = (W) => R.shapeWorld(W, rig.shapes.find((x) => x.id === 'foot_r'));
// right leg FK: ankle over its floor spot (x, z), sole on the mat (lowest point 0.15 cm up), foot not pitched, knee at z
function kneesOut(top, dz, prev) {
  const T = top.ik.leg_r.target, W0 = L.fk(top, contacts), kz = W0.knee_r.p[2] + dz;
  const q = clone(prev || top);
  const s = L.solvePose(q, H.LEG_PATHS('r'), [
    (W) => [(W.ankle_r.p[0] - T[0]) * 4, (W.ankle_r.p[2] - T[2]) * 4, (H.bottomOf(W, 'foot_r') - 0.15) * 4, (W.knee_r.p[2] - kz) * 2],
    (W) => { const g = foot(W), ax = V.norm(g.axes[0]); return [ax[1] * 6]; },
    (W, p) => [(p.ch.knee_r.flex - top.ch.knee_r.flex) * 0.02],
  ], { iters: 400 });
  const p = s.pose; for (const c of ['flex', 'abd', 'rot']) p.ch.hip_r[c] = r1(p.ch.hip_r[c]); p.ch.knee_r.flex = r1(p.ch.knee_r.flex); p.ch.ankle_r.dorsi = r1(p.ch.ankle_r.dorsi);
  for (const j of ['hip', 'knee', 'ankle']) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]);
  p.ik.leg_r.weight = 0; p.ik.leg_l.weight = 0;
  p.__err = s.cost;
  return p;
}
const top = BR.poseAt(1);
const fk0 = clone(top); fk0.ik.leg_r.weight = 0; fk0.ik.leg_l.weight = 0; // same pose, feet now driven by the stored channels
const o33 = kneesOut(top, OPEN * 0.33), o66 = kneesOut(top, OPEN * 0.66, o33), open = kneesOut(top, OPEN, o66), openHold = kneesOut(top, OPEN * 1.03, open);
const poses = { lie: BR.poseAt(0), u25: BR.poseAt(0.25), u50: BR.poseAt(0.5), u75: BR.poseAt(0.75), top, fk0, o33, o66, open, openHold, d75: BR.poseAt(0.75), d50: BR.poseAt(0.5), d25: BR.poseAt(0.25), touch: BR.poseAt(0.03) };
const errs = [o33, o66, open, openHold].map((p) => p.__err); for (const p of Object.values(poses)) delete p.__err;
const keyframes = F.kf([[0, 'lie'], [0.8, 'lie'], [1.2, 'u25'], [1.6, 'u50'], [1.95, 'u75'], [2.3, 'top'], [2.5, 'fk0'],
  [2.75, 'o33'], [2.95, 'o66'], [3.2, 'open'], [3.45, 'openHold'], [3.7, 'o66'], [3.9, 'o33'], [4.15, 'fk0'],
  [4.4, 'o33'], [4.6, 'o66'], [4.85, 'open'], [5.1, 'openHold'], [5.35, 'o66'], [5.55, 'o33'], [5.8, 'fk0'], [6.0, 'top'],
  [6.5, 'd75'], [7.0, 'd50'], [7.5, 'd25'], [8.0, 'touch'], [8.3, 'lie'], [8.8, 'lie']]);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wt = L.fk(top, contacts), Wl = L.fk(poses.lie, contacts), Wo = L.fk(open, contacts);
const tz = Wt.knee_r.p[2];
let ankleDrift = 0, footLow = 1e9, kneeZ = 0, hipMin = 1e9;
const A0 = Wt.ankle_r.p;
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l', 'leg_r', 'leg_l'], probe: (W, pz, t) => {
  if (t > 2.3 && t < 6.0) { ankleDrift = Math.max(ankleDrift, Math.hypot(W.ankle_r.p[0] - A0[0], W.ankle_r.p[2] - A0[2])); footLow = Math.min(footLow, H.bottomOf(W, 'foot_r'), H.bottomOf(W, 'foot_l')); hipMin = Math.min(hipMin, W.hip_r.p[1]); }
  kneeZ = Math.max(kneeZ, W.knee_r.p[2] - tz); } });
const set = H.setKin(ex);
set('Hip extension', 'setup', `≈${Math.round(poses.lie.ch.hip_r.flex)}° hip flexion lying`); set('Hip extension', 'peak', `≈${Math.round(top.ch.hip_r.flex)}° (neutral) held through the openings`);
set('Knee opening', 'setup', `Knees ${r1(2 * tz)} cm apart (over the feet)`); set('Knee opening', 'peak', `${r1(2 * Wo.knee_r.p[2])} cm apart (each knee ${r1(Wo.knee_r.p[2] - tz)} cm out; hip abduction channel ≈${Math.round(open.ch.hip_r.abd)}°, rotation ≈${Math.round(open.ch.hip_r.rot)}°)`);
set('Feet', 'setup', `Flat, ${2 * BR.zFoot} cm apart`); set('Feet', 'peak', `Stay over their spots (${r1(ankleDrift)} cm), rolling onto the outer edges`);
set('Hip height', 'setup', `Hip joint ${r1(Wl.hip_r.p[1])} cm above the floor`); set('Hip height', 'peak', `${r1(Wt.hip_r.p[1])} cm at the top, lowest ${r1(hipMin)} cm during the openings`);
set('Tempo', 'setup', 'Lying 0.8 s'); set('Tempo', 'peak', '1.5 s up, two 1.65 s open-close reps at the top, 2.0 s down, 0.8 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wl.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Bridge Hip Abduction: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  ankleDrift ${ankleDrift.toFixed(2)} footLow ${footLow.toFixed(2)} kneeOut ${r1(kneeZ)} errs ${errs.map((e) => e.toFixed(3))} open ${JSON.stringify([open.ch.hip_r, open.ch.knee_r, open.ch.ankle_r])}`);
const bad = [rep.slide > 0.05 && 'planted contact slides', rep.floor < -0.5 && 'below the floor', ankleDrift > 0.6 && 'feet drift while the knees open', footLow < -0.4 && 'feet sink into the mat'].filter(Boolean);
if (bad.length) { console.error('FAIL bridge-hip-abduction: ' + bad.join('; ')); process.exitCode = 1; }
