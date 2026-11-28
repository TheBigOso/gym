// Kneeling Plank (GymVisual #10391; page not readable here, movement from the name and standard coaching). Forearms and
// knees on a mat, toes tucked: start with the hips sitting back a little, roll the hips forward until shoulders, hips and
// knees make one line (elbows under the shoulders), hold 9 s with small breathing settles, then sit the hips back.
// Contacts: forearms (wrist IK targets, the elbow point stays on the mat because the shoulder stays one upper-arm length
// from it) and feet (ankle IK targets on the balls of the feet); the knees stay on their mat points in every key
// (hip kept one thigh length from the knee point). Built on the front plank frame (families/b6-18.js forearmPlank).
const L = require('./lib');
const { V, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const B = require('./families/b6-18');
const meta = require('./meta/kneeling-plank.json');

const F = B.forearmPlank();
const { raw, contacts, E, sphere, finish } = F;
for (const s of ['r', 'l']) contacts.find((c) => c.id === `leg_${s}`).pole = [0.3, -1, 0]; // knees stay in the plane of hip and ankle, so they keep their mat point as the hips move
// Kneeling: knees on the mat, toes tucked under (balls of the feet on the mat), shoulders
// over the elbows, body straight from the shoulders to the knees. Legs are posed by FK here, then the ankles become the
// leg contact targets (world-locked feet) and the channels are refitted to the IK.
const TUCK = 15; // toes tucked under: ankle dorsiflexed, balls of the feet on the mat
const k0 = clone(raw); delete k0.ik;
Object.assign(k0.ch, { hip_r: { flex: 10, abd: 0, rot: 0 }, hip_l: { flex: 10, abd: 0, rot: 0 }, knee_r: { flex: 60 }, knee_l: { flex: 60 }, ankle_r: { dorsi: 15 }, ankle_l: { dorsi: 15 } });
k0.root.rot.pitch = -60; k0.root.pos = [0, 22, 0];
const armC = contacts.filter((c) => c.id.startsWith('arm'));
k0.ik = { arm_r: clone(raw.ik.arm_r), arm_l: clone(raw.ik.arm_l) };
const tie = (W, q) => [q.ch.hip_l.flex - q.ch.hip_r.flex, q.ch.knee_l.flex - q.ch.knee_r.flex, q.ch.ankle_l.dorsi - q.ch.ankle_r.dorsi].map((v) => v * 2);
const kSol = B.solve(k0, ['root.pos.0', 'root.pos.1', 'root.rot.pitch', 'ch.hip_r.flex', 'ch.hip_l.flex', 'ch.knee_r.flex', 'ch.knee_l.flex', 'ch.ankle_r.dorsi', 'ch.ankle_l.dorsi'], [
  sphere, (W) => [(W.shoulder_r.p[0] - E.r[0]) * 2, Math.min(P.bottomOf(W, 'shank_r'), P.bottomOf(W, 'quad_r') - 0.3) * 3, P.bottomOf(W, 'foot_r') * 3],
  (W, q) => [q.ch.hip_r.flex * 0.1, (q.ch.ankle_r.dorsi - TUCK) * 0.1, Math.max(0, q.ch.ankle_r.dorsi - 33) * 3], tie], armC, 600);
const kneelFK = kSol.pose, Wf = L.fk(kneelFK, armC);
const AT = { r: Wf.ankle_r.p.map(B.r3), l: Wf.ankle_l.p.map(B.r3) };
for (const s of ['r', 'l']) contacts.find((c) => c.id === `leg_${s}`).handRot = P.qArr(Wf[`ankle_${s}`].q);
kneelFK.ik = Object.assign(clone(raw.ik), { leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } });
const kneel0 = kneelFK;
const Wk = L.fk(kneel0, contacts);
const K = { r: Wk.knee_r.p.slice(), l: Wk.knee_l.p.slice() };
const knees = (W) => ['r', 'l'].flatMap((s) => V.sub(W[`knee_${s}`].p, K[s]).map((v) => v * 4));
// Hips back: the thigh turns `da` degrees about the planted knee toward vertical (hip moves up and back), the elbows stay
// put and the shoulders slide back on their spheres. dy / spineFlex give the small breathing settles in the hold.
const TH = V.len(V.sub(Wk.hip_r.p, K.r)), A0 = Math.atan2(Wk.hip_r.p[1] - K.r[1], Wk.hip_r.p[0] - K.r[0]);
function hipsBack(da, dy = 0, spineFlex = 0) {
  const p = clone(kneel0);
  p.ch.spine_l5 = { rot: 0, latFlex: 0, flex: B.r3(kneel0.ch.spine_l5.flex + spineFlex * 0.5) }; p.ch.spine_t12 = { rot: 0, latFlex: 0, flex: B.r3(kneel0.ch.spine_t12.flex + spineFlex * 0.5) };
  const a = A0 + (da + dy) * Math.PI / 180; // dy: small breathing settle, as an extra turn of the thigh (deg)
  const hip = [K.r[0] + TH * Math.cos(a), K.r[1] + TH * Math.sin(a)];
  const objs = [(W) => [(W.hip_r.p[0] - hip[0]) * 4, (W.hip_r.p[1] - hip[1]) * 4], (W) => ['r', 'l'].map((s) => (V.len(V.sub(W[`shoulder_${s}`].p, E[s])) - P.UA) * 6)];
  const s = B.solve(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], objs, contacts);
  return { pose: finish(s.pose), cost: s.cost };
}

const BACK = 30;
const poses = { back: hipsBack(BACK).pose, k75: hipsBack(BACK * 0.75).pose, k50: hipsBack(BACK * 0.5).pose, k25: hipsBack(BACK * 0.25).pose, line: hipsBack(0).pose,
  inhale: hipsBack(0, -0.8, -0.8).pose, exhale: hipsBack(0, 0.5, 0.4).pose, settle: hipsBack(0, -1.2, -1.2).pose };
const keyframes = [
  { t: 0, pose: 'back' }, { t: 1.0, pose: 'back' }, { t: 1.3, pose: 'k75' }, { t: 1.55, pose: 'k50' }, { t: 1.8, pose: 'k25' }, { t: 2.0, pose: 'line' },
  { t: 3.5, pose: 'inhale' }, { t: 5.0, pose: 'exhale' }, { t: 6.5, pose: 'inhale' }, { t: 8.0, pose: 'exhale' }, { t: 9.5, pose: 'settle' }, { t: 10.6, pose: 'line' },
  { t: 11.0, pose: 'line' }, { t: 11.25, pose: 'k25' }, { t: 11.5, pose: 'k50' }, { t: 11.75, pose: 'k75' }, { t: 12.0, pose: 'back' }, { t: 13.0, pose: 'back' },
];
const ex = H.module_(meta, contacts, poses, keyframes);
const hb = poses.back.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hb - 3), max: Math.ceil(hb + 3) };
const meas = (n) => { const W = L.fk(poses[n], contacts); return { W, line: B.kneeLine(W), trunk: V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [1, 0, 0]), elbow: P.elbowAngle(W, 'r'), knee: P.kneeAngle(W, 'r'), hip: poses[n].ch.hip_r.flex, ahead: E.r[0] - W.shoulder_r.p[0], min: L.shapeMinY(W) }; };
const mb = meas('back'), ml = meas('line');
const set = H.setKin(ex);
set('Body line', 'setup', `Hips back: ${B.deg(mb.line)} off straight (shoulder-hip-knee)`); set('Body line', 'peak', `${B.deg(ml.line)} off straight`);
set('Elbow position', 'setup', `On the mat, shoulders ${Math.round(mb.ahead)} cm behind the elbows`); set('Elbow position', 'peak', `Directly under the shoulders, ${Math.round(2 * E.r[2])} cm apart`);
set('Hip flexion', 'setup', B.deg(mb.hip)); set('Hip flexion', 'peak', B.deg(ml.hip));
set('Knee flexion', 'setup', `${B.deg(mb.knee)}, knees on the mat, toes tucked`); set('Knee flexion', 'peak', B.deg(ml.knee));
set('Trunk angle', 'setup', B.deg(mb.trunk)); set('Trunk angle', 'peak', B.deg(ml.trunk));
set('Tempo', 'setup', '1 s hips back'); set('Tempo', 'peak', '1 s into line, 9 s hold with breathing settles, 1 s back, 1 s rest');
ex.exercise.reference.note = B.NOTE;
console.log(`Kneeling Plank: wrote ${L.write(ex)}  measure=${JSON.stringify(ex.checks.measure)} kneelCost=${kSol.cost.toFixed(4)} ankles=${JSON.stringify(AT)}`);
for (const n of Object.keys(poses)) { const m = meas(n); console.log(`  ${n.padEnd(7)} line=${m.line.toFixed(1)} trunk=${m.trunk.toFixed(1)} elbow=${m.elbow.toFixed(1)} knee=${m.knee.toFixed(1)} hip=${m.hip} pitch=${poses[n].root.rot.pitch} min=${m.min.y.toFixed(2)}(${m.min.id})`); }
const sw = P.sweep(ex, [...['r', 'l'].map((s) => ({ joint: `elbow_${s}`, p: E[s] })), ...['r', 'l'].map((s) => ({ joint: `knee_${s}`, p: K[s] }))]);
const lim = require('./families/core-a').scan(ex).limits;
console.log('  sweep', JSON.stringify(sw), 'limits', lim.length);
if (sw.slide > 0.05 || sw.drift > 0.25 || sw.floor < -0.5 || lim.length) { console.error('FAIL kneeling-plank', lim.slice(0, 4)); process.exitCode = 1; }
