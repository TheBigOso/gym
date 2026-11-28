// Cable Hip Abduction, standing (GymVisual #087912, Cable hip abduction (version 2)): an ankle strap on the right ankle,
// clipped to a low pulley on the athlete's left. Stand tall on the left leg (planted contact), hands on the hips, the
// strapped leg straight and slightly forward so the cable runs in front of the stance shin. The right leg sweeps out to
// the side to about 35 degrees of hip abduction with the toes forward, pauses, and returns slowly against the cable. The
// pelvis stays level over the stance foot (a small lean toward the stance side is allowed). Authored on the right leg.
// Gear: GA.ankleStrap (src/gear/attach.js ankle-strap cuff, body-mounted on ankle_r) and EQ.cableTower.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const GA = require('./families/gear-attach');
const meta = require('./meta/cable-hip-abduction.json');

const TOE = 4, HALF = 9, SHIFT_Z = -3.5, ABD_TOP = 35, ABD_REST = 3, FLEX = 9, LEAN = 4;
const contacts = [H.legC('l', { rot: H.footQ(0, TOE) })];
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const FOOT_L = [0, L.ANKLE_H, -HALF];
// low pulley on the left, level with the front of the strapped ankle so the cable passes in front of the stance shin
const PULLEY = [14, 12, -78];
const strap = GA.ankleStrap(PULLEY, { side: 'r', id: 'strap' });
function poseAt(f) {
  const p = clone(st);
  p.root.pos = [0, 90, SHIFT_Z]; p.root.rot = { roll: r1(-LEAN * f * 0.5) }; // pelvis tips slightly toward the stance side
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 0, latFlex: r1(LEAN * f * 0.25) }, spine_t12: { rot: 0, flex: 0, latFlex: r1(LEAN * f * 0.25) }, spine_t6: { rot: 0, flex: 0, latFlex: 0 } });
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 0 };
  p.ch.hip_r = { flex: FLEX, abd: r1(ABD_REST + (ABD_TOP - ABD_REST) * f), rot: 0 }; p.ch.knee_r = { flex: 3 }; p.ch.ankle_r = { dorsi: -4 };
  p.ik = { leg_l: { target: FOOT_L.slice(), weight: 1 } };
  let a = 70, b = 100;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, contacts), 'l') > 5) a = y; else b = y; }
  p.root.pos[1] = r1((a + b) / 2);
  const ph = H.handsOnHips(p); Object.assign(p.ch, ph.ch);
  const q = H.fitLeg(p, 'l', contacts[0], FOOT_L, { rot: -TOE });
  return q;
}
const ease = (x) => x * x * (3 - 2 * x);
const poses = { stand: poseAt(0), u25: poseAt(ease(0.25)), u50: poseAt(0.5), u75: poseAt(ease(0.75)), top: poseAt(1), hold: poseAt(1.02), d70: poseAt(ease(0.7)), d40: poseAt(ease(0.4)), d15: poseAt(ease(0.15)), near: poseAt(0.03) };
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.1, pose: 'u25' }, { t: 1.4, pose: 'u50' }, { t: 1.7, pose: 'u75' }, { t: 2.0, pose: 'top' }, { t: 2.25, pose: 'hold' }, { t: 2.5, pose: 'top' },
  { t: 3.0, pose: 'd70' }, { t: 3.5, pose: 'd40' }, { t: 3.9, pose: 'd15' }, { t: 4.3, pose: 'near' }, { t: 4.6, pose: 'stand' }, { t: 5.0, pose: 'stand' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [EQ.cableTower(PULLEY, { offset: [0, -12], id: 'tower' }), strap];
let lineMin = { d: 1e9 }, footMin = 1e9, trunkMax = 0, cable = [1e9, -1e9];
const rep = H.loopReport(ex, { planted: ['leg_l'], probe: (W) => {
  const c = GA.strapLineClear(W, strap); if (c.d < lineMin.d) lineMin = c;
  footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]));
  const k = GA.strapCable(W, strap); cable = [Math.min(cable[0], k), Math.max(cable[1], k)]; } });
const Ws = L.fk(poses.stand, contacts), Wt = L.fk(poses.top, contacts);
const legAngle = (W) => Math.atan2(W.ankle_r.p[2] - W.hip_r.p[2], W.hip_r.p[1] - W.ankle_r.p[1]) / R.DEG; // frontal-plane leg angle from vertical
const set = H.setKin(ex);
set('Hip abduction', 'setup', `≈${poses.stand.ch.hip_r.abd}° (leg under the hip, toes just off the floor)`); set('Hip abduction', 'peak', `≈${poses.top.ch.hip_r.abd}° (joint channel); leg ≈${Math.round(legAngle(Wt))}° from vertical in the frontal plane`);
set('Pelvis and trunk', 'setup', 'Tall, pelvis level over the stance foot'); set('Pelvis and trunk', 'peak', `≈${Math.round(trunkMax)}° lean toward the stance side (small, controlled)`);
set('Cable line', 'setup', `Pulley at ankle height on the left; cable ${Math.round(cable[0])} cm`); set('Cable line', 'peak', `Cable ${Math.round(cable[1])} cm; clears the stance shin by ${lineMin.d.toFixed(1)} cm or more`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.2 s out, 0.5 s hold, 1.8 s back');
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: Math.ceil(trunkMax + 2) };
console.log(`Cable Hip Abduction: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR min ${footMin.toFixed(2)} trunk max ${trunkMax.toFixed(1)} leg ${r1(legAngle(Ws))}->${r1(legAngle(Wt))} line ${JSON.stringify(lineMin)} cable ${cable.map(r1)} strap ${JSON.stringify(strap.attach)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (lineMin.d < 0.5) { console.error('FAIL: cable passes through the body'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: strapped foot scuffs the floor'); process.exitCode = 1; }
