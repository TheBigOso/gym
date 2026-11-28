// Bridge Mountain Climber, cross body (GymVisual #22561; page not readable here, movement from the name and the common
// description: alternating cross-body knee drives from a held glute bridge). Supine on a mat, knees bent, feet flat hip
// width, arms on the floor by the sides. Roll the hips up into a bridge, then, holding the hips high and level, drive the
// right knee toward the chest and across the body while the left arm lifts and the left elbow reaches toward the right
// knee (the upper trunk turns a little, the left shoulder blade peels off the mat); return, then the same with the left
// knee and right elbow. Lower the hips slowly. Bilateral, alternating in one loop (no mirroring needed). Bridge base from
// author-glute-bridge.js; the driving leg and reaching arm are FK (their contacts released) while the other foot, the
// other hand and the upper back stay down.
const L = require('./lib');
const { V, rig, r1, clone } = L;
const H = require('./families/hips');
const CB = require('./families/core-b');
const F = require('./families/b6-13');
const meta = require('./meta/bridge-mountain-climber-cross-body.json');

const BR = F.bridge();
const { contacts } = BR;
const ROT = +(process.env.ROT || -8), HIPF = +(process.env.HIPF || 92), ADD = +(process.env.ADD || -14);
const ARM_L = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron', 'ch.wrist_l.flex', 'ch.wrist_l.dev'];
const lim = (pth, v) => { const [, j, c] = pth.split('.'), l = rig.byId[j].limits && rig.byId[j].limits[c]; return l ? (Math.max(0, l[0] + 1 - v) + Math.max(0, v - l[1] + 1)) * 10 : 0; };
// Right knee drive (fraction f) with the left arm reaching across; the left foot and right hand stay planted
function drive(f) {
  const p = BR.poseAt(1, { rot: ROT * f, arms: ['r'], legs: ['l'] });
  const top = BR.poseAt(1);
  // right leg FK from its top-of-bridge channels toward the knee drive
  const h0 = top.ch.hip_r, k0 = top.ch.knee_r.flex, a0 = top.ch.ankle_r.dorsi;
  p.ch.hip_r = { flex: r1(h0.flex + (HIPF - h0.flex) * f), abd: r1(h0.abd + (ADD - h0.abd) * f), rot: r1(h0.rot + (8 - h0.rot) * f) };
  p.ch.knee_r = { flex: r1(k0 + (112 - k0) * f) }; p.ch.ankle_r = { dorsi: r1(a0 + (-20 - a0) * f) };
  p.ik.leg_r.weight = f > 0 ? 0 : 1;
  // left arm: from its planted channels, the elbow reaches toward the right knee
  const W = L.fk(p), K = W.knee_r.p;
  if (f > 0) {
    const top0 = BR.poseAt(1, { rot: ROT * f }), Wp = L.fk(top0);
    const reachE = V.add(W.shoulder_l.p, V.scale(V.sub(K, W.shoulder_l.p), 0.7));
    const tgtE = V.add(Wp.elbow_l.p, V.scale(V.sub(reachE, Wp.elbow_l.p), f));
    const g = clone(top0.ch), ax0 = g.shoulder_l.axial, pr0 = g.wrist_l.pron;
    const q0 = clone(p); for (const j of ['shoulder_l', 'elbow_l', 'wrist_l']) q0.ch[j] = clone(g[j]);
    q0.ch.elbow_l.flex = Math.max(q0.ch.elbow_l.flex, 30 * f);
    const s = L.solvePose(q0, ARM_L, [
      (Wx) => V.sub(Wx.elbow_l.p, tgtE).map((v) => v * 2),
      (Wx) => { const fa = V.norm(V.sub(Wx.wrist_l.p, Wx.elbow_l.p)); return [(fa[1] - 0.6 * f) * 2]; },
      (Wx, q) => [(q.ch.elbow_l.flex - 110 * f) * 0.05, ...ARM_L.map((pth) => lim(pth, L.getPath(q, pth))), q.ch.wrist_l.flex * 0.03, q.ch.wrist_l.dev * 0.03, (q.ch.wrist_l.pron - pr0) * 0.01, (q.ch.shoulder_l.axial - ax0) * 0.01],
      (Wx) => ['upperarm_l', 'forearm_l', 'hand_l', 'thumb_l'].map((id) => Math.min(0, H.bottomOf(Wx, id) - 0.6) * 4),
    ], { iters: 600 });
    for (const j of ['shoulder_l', 'elbow_l', 'wrist_l']) p.ch[j] = s.pose.ch[j];
    p.ch.sc_l = { protract: r1(14 * f), elevate: r1(4 * f) };
    p.ik.arm_l.weight = 0;
  }
  return p;
}
const full = drive(1), half = drive(0.5), hold = drive(1.03);
const mir = (p) => { const q = CB.mirror(p); return q; };
const top = BR.poseAt(1);
const poses = { lie: BR.poseAt(0), u25: BR.poseAt(0.25), u50: BR.poseAt(0.5), u75: BR.poseAt(0.75), top,
  rHalf: half, rFull: full, rHold: hold, lHalf: mir(half), lFull: mir(full), lHold: mir(hold),
  d75: BR.poseAt(0.75), d50: BR.poseAt(0.5), d25: BR.poseAt(0.25), touch: BR.poseAt(0.03) };
const keyframes = F.kf([[0, 'lie'], [0.8, 'lie'], [1.2, 'u25'], [1.6, 'u50'], [1.95, 'u75'], [2.3, 'top'], [2.6, 'top'],
  [3.0, 'rHalf'], [3.4, 'rFull'], [3.7, 'rHold'], [4.1, 'rHalf'], [4.5, 'top'], [4.7, 'top'],
  [5.1, 'lHalf'], [5.5, 'lFull'], [5.8, 'lHold'], [6.2, 'lHalf'], [6.6, 'top'], [6.9, 'top'],
  [7.4, 'd75'], [7.9, 'd50'], [8.4, 'd25'], [8.9, 'touch'], [9.2, 'lie'], [9.8, 'lie']]);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wt = L.fk(top, contacts), Wl = L.fk(poses.lie, contacts), Wf = L.fk(full, contacts);
let hipMin = 1e9, footMin = 1e9, armMin = 1e9;
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l', 'leg_r', 'leg_l'], probe: (W, pz, t) => {
  if (t > 2.3 && t < 6.9) hipMin = Math.min(hipMin, W.hip_r.p[1], W.hip_l.p[1]);
  if (t > 3.0 && t < 4.1) { footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); armMin = Math.min(armMin, H.bottomOf(W, 'forearm_l')); } } });
const set = H.setKin(ex);
const kd = V.len(V.sub(Wf.knee_r.p, Wf.elbow_l.p));
set('Hip extension', 'setup', `≈${Math.round(poses.lie.ch.hip_r.flex)}° hip flexion lying`); set('Hip extension', 'peak', `≈${Math.round(top.ch.hip_l.flex)}° on the support leg (neutral), held`);
set('Knee drive', 'setup', 'Both feet planted'); set('Knee drive', 'peak', `Driving hip ≈${Math.round(full.ch.hip_r.flex)}° flexion, ${Math.round(-full.ch.hip_r.abd)}° across the midline, knee ≈${Math.round(full.ch.knee_r.flex)}°`);
set('Cross-body reach', 'setup', 'Arms on the floor'); set('Cross-body reach', 'peak', `Opposite elbow ${r1(kd)} cm from the knee; upper trunk turned ≈${Math.abs(ROT)}°`);
set('Hip height', 'setup', `Hip joint ${r1(Wl.hip_r.p[1])} cm above the floor`); set('Hip height', 'peak', `${r1(Wt.hip_r.p[1])} cm in the bridge, lowest ${r1(hipMin)} cm during the knee drives`);
set('Tempo', 'setup', 'Lying 0.8 s'); set('Tempo', 'peak', '1.5 s up, about 1.9 s per side, 2.0 s down, 0.9 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wl.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Bridge Mountain Climber (Cross Body): wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  hipMin ${r1(hipMin)} top ${r1(Wt.hip_r.p[1])} footMin ${r1(footMin)} armMin ${r1(armMin)} elbow-knee ${r1(kd)} arm ${JSON.stringify([full.ch.shoulder_l, full.ch.elbow_l])}`);
const bad = [rep.slide > 0.05 && 'planted contact slides', rep.floor < -0.5 && `below the floor (${rep.floorAt})`, footMin < 1 && 'driving foot scuffs the mat', kd > 36 && 'elbow far from the knee'].filter(Boolean);
if (bad.length) { console.error('FAIL bridge-mountain-climber-cross-body: ' + bad.join('; ')); process.exitCode = 1; }
