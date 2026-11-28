// Kneeling Hip Thrust (GymVisual #15541; page not readable here, movement from the name: the body-weight kneeling hip
// hinge to tall kneeling). Bilateral: kneeling on a mat, knees about hip width, toes tucked (planted leg contacts: shins
// and feet stay put), hands on the hips. Sit the hips back toward the heels while the trunk hinges forward with a neutral
// back (the thighs tilt back about 38 degrees), then drive the hips forward by squeezing the glutes until thighs and trunk
// are upright in tall kneeling; brief squeeze, repeat. (The knee centres roll up to about 0.9 cm as the thighs tilt.) Knees stay on their floor spots: each key is a tall-kneel base
// (b5-cablearms.js tallKneel) with the thigh tilted back, slid so the knees stay put, then pitched about the hips.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const B = require('./families/b5-cablearms');
const F = require('./families/b6-13');
const meta = require('./meta/kneeling-hip-thrust.json');

const THIGH = +(process.env.THIGH || -38), PITCH = +(process.env.PITCH || -34), TOE = 80;
const base = B.tallKneel({ thigh: 0, toePitch: TOE }), contacts = base.contacts;
const K0 = L.fk(base.pose, contacts).knee_r.p;
const ease = (f) => f * f * (3 - 2 * f);
// f = 0 tall (thigh vertical, trunk upright, slight posterior tilt) .. 1 bottom (hips back, trunk hinged forward)
function key(f) {
  const k = B.tallKneel({ thigh: r1(THIGH * f * 100) / 100, toePitch: TOE });
  const dx = K0[0] - L.fk(k.pose, k.contacts).knee_r.p[0];
  const p = clone(k.pose); p.root.pos[0] = +(p.root.pos[0] + dx).toFixed(3);
  for (const s of ['r', 'l']) p.ik[`leg_${s}`].target = base.pose.ik[`leg_${s}`].target.slice();
  let q = B.pitchAboutHips(p, contacts, r1(2 + (PITCH - 2) * ease(f)));
  q.ch.spine_l5 = { rot: 0, flex: r1(-4 * (1 - f) + 2 * f), latFlex: 0 }; q.ch.spine_t12 = { rot: 0, flex: r1(1 * f), latFlex: 0 }; q.ch.spine_t6 = { rot: 0, flex: r1(2 * f), latFlex: 0 };
  const lean = -q.root.rot.pitch + 3 * f;
  q.ch.neck_c7 = { rot: 0, flex: r1(-lean * 0.35) }; q.ch.head_c1 = { rot: 0, flex: r1(-lean * 0.35) };
  q = H.handsOnHips(q);
  for (const s of ['r', 'l']) q = H.fitLeg(q, s, contacts.find((c) => c.id === `leg_${s}`), q.ik[`leg_${s}`].target);
  return q;
};
const N = 6, poses = {};
for (let i = 0; i <= N; i++) poses[`k${i}`] = key(i / N);
poses.squeeze = key(-0.04); poses.bottomHold = key(1.02);
const T = [0.8, 2.6], U = [3.0, 4.3]; // down (sit back), up (thrust)
const keyframes = [{ t: 0, pose: 'k0' }, { t: T[0], pose: 'k0' }];
for (let i = 1; i <= N; i++) keyframes.push({ t: r1(100 * (T[0] + (T[1] - T[0]) * i / N)) / 100, pose: `k${i}` });
keyframes.push({ t: 2.8, pose: 'bottomHold' });
for (let i = N; i >= 0; i--) keyframes.push({ t: r1(100 * (U[0] + (U[1] - U[0]) * (N - i) / N)) / 100, pose: `k${i}` });
keyframes.push({ t: 4.6, pose: 'squeeze' }, { t: 5.0, pose: 'k0' }, { t: 5.6, pose: 'k0' });
const ex = H.module_(meta, contacts, poses, keyframes);
let kneeDrift = 0;
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => { kneeDrift = Math.max(kneeDrift, V.len(V.sub(W.knee_r.p, K0))); } });
const Wt = L.fk(poses.k0, contacts), Wb = L.fk(poses[`k${N}`], contacts);
const thighV = (W) => Math.atan2(W.knee_r.p[0] - W.hip_r.p[0], W.hip_r.p[1] - W.knee_r.p[1]) / Math.PI * 180;
const trunkV = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${Math.round(poses.k0.ch.hip_r.flex)}° (tall kneeling)`); set('Hip flexion', 'peak', `≈${Math.round(poses[`k${N}`].ch.hip_r.flex)}° sitting back`);
set('Thigh angle', 'setup', `≈${Math.round(thighV(Wt))}° from vertical`); set('Thigh angle', 'peak', `≈${Math.round(thighV(Wb))}° (hips back toward the heels)`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wt, 'r'))}° (toes tucked)`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wb, 'r'))}°`);
set('Trunk inclination', 'setup', `≈${Math.round(trunkV(Wt))}°`); set('Trunk inclination', 'peak', `≈${Math.round(trunkV(Wb))}° forward, back neutral`);
set('Tempo', 'setup', 'Tall kneel 0.8 s'); set('Tempo', 'peak', '1.8 s back, 0.4 s pause, 1.3 s thrust, 0.3 s squeeze');
const peakHip = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 6), max: Math.ceil(peakHip + 3) };
console.log(`Kneeling Hip Thrust: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} kneeDrift ${kneeDrift.toFixed(2)} hips ${poses.k0.ch.hip_r.flex}/${poses[`k${N}`].ch.hip_r.flex} knee ${r1(H.kneeOf(Wb, 'r'))} trunk ${r1(trunkV(Wb))}`);
const bad = [rep.slide > 0.05 && 'planted contact slides', rep.floor < -0.5 && `below the floor ${JSON.stringify(rep.floorAt)}`, kneeDrift > 1.2 && 'knees slide on the mat', rep.kneeR[1] > 150 && 'knee past its limit'].filter(Boolean);
if (bad.length) { console.error('FAIL kneeling-hip-thrust: ' + bad.join('; ')); process.exitCode = 1; }
