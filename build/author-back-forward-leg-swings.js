// Back Forward Leg Swings (GymVisual #12544; page not readable here, movement from the name and standard coaching).
// Stand tall on the left leg (planted, knee soft), hands on the hips. The right leg swings like a pendulum: forward and up
// (hip flexion building over three swings to about 70 degrees), back behind (about 18 degrees of hip extension, rig limit
// 20), with the knee nearly straight and a little bend as the foot passes under the hip so it clears the floor. The
// pelvis tucks a few degrees on the forward swing and tips forward a few on the back swing; the trunk stays tall.
// authoredSide 'right' (the player mirrors for the left leg). The right foot is planted only at the start and the end.
const L = require('./lib');
const { R, V, clone } = L;
const H = require('./families/hips');
const CA = require('./families/core-a');
const B = require('./families/b6-18');
const meta = require('./meta/back-forward-leg-swings.json');

const TOE = 6, HALF = 9;
const contacts = [H.legC('r', { rot: H.footQ(0, -TOE) }), H.legC('l', { rot: H.footQ(0, TOE) })];
const FOOT = { r: [0, L.ANKLE_H, HALF], l: [0, L.ANKLE_H, -HALF] };
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const r1 = L.r1;
// hip: right hip flexion (deg); planted: right foot on the floor (weight 1). Pelvis over the left foot.
function poseAt(hip, { planted = false, shift = 1, dorsi = null, clr = 1.5 } = {}) {
  const p = clone(st);
  const tuck = hip > 0 ? Math.min(7, hip * 0.09) : hip * 0.3;          // + = pelvis tucks (posterior tilt) on the front swing
  p.root.pos = [0, 90, r1(-3.2 * shift)]; p.root.rot = { pitch: r1(tuck), roll: 0 };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: r1(Math.max(0, tuck) * 0.5), latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 } });
  const lean = -(tuck + Math.max(0, tuck) * 0.5); // keep the eyes level
  p.ch.neck_c7 = { rot: 0, flex: r1(-lean * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(-lean * 0.55) };
  p.ch.hip_r = { flex: r1(hip - tuck), abd: 1, rot: 0 }; p.ch.knee_r = { flex: hip > 30 ? 6 : 4 }; p.ch.ankle_r = { dorsi: r1(dorsi ?? (hip > 0 ? -8 : -22)) };
  p.ik = { leg_l: { target: FOOT.l.slice(), weight: 1 }, leg_r: { target: FOOT.r.slice(), weight: planted ? 1 : 0 } };
  let a = 70, b = 100;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, contacts), 'l') > 5) a = y; else b = y; }
  p.root.pos[1] = r1((a + b) / 2);
  p.ch.sc_r = { protract: 4, elevate: 2 }; p.ch.sc_l = { protract: 4, elevate: 2 };
  let q = H.handsOnHips(p);
  q = H.fitLeg(q, 'l', contacts[1], FOOT.l, { rot: -TOE });
  if (planted) q = H.fitLeg(q, 'r', contacts[0], FOOT.r, { rot: TOE });
  else if (H.bottomOf(L.fk(q, contacts), 'foot_r') < clr) { // swinging foot clears the floor: bend the knee just enough
    let k0 = q.ch.knee_r.flex, k1 = 60;
    for (let i = 0; i < 40; i++) { q.ch.knee_r.flex = (k0 + k1) / 2; if (H.bottomOf(L.fk(q, contacts), 'foot_r') < clr) k0 = q.ch.knee_r.flex; else k1 = q.ch.knee_r.flex; }
    q.ch.knee_r.flex = r1(k1 + 0.2);
  }
  q.ik = clone(p.ik);
  return q;
}
const MID = (h) => poseAt(h, { dorsi: 4, clr: 0.8 }); // foot passing under the hip: toes up a little, knee bends just enough to clear
const poses = { stand: poseAt(0, { planted: true, shift: 0 }), shift: poseAt(0, { planted: true }), shiftFK: poseAt(0, { planted: true }), lift: poseAt(14, { dorsi: 14, clr: 2 }),
  f1: poseAt(52), m1: MID(4), b1: poseAt(-14), m2: MID(3), f2: poseAt(64), m3: MID(4), b2: poseAt(-17), m4: MID(3), f3: poseAt(72), m5: MID(4), b3: poseAt(-18), m6: MID(4), down: poseAt(14, { dorsi: 14, clr: 2 }) };
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.5, pose: 'shiftFK' }, { t: 0.8, pose: 'lift' }, { t: 1.3, pose: 'f1' }, { t: 1.7, pose: 'm1' }, { t: 2.1, pose: 'b1' }, { t: 2.5, pose: 'm2' }, { t: 2.9, pose: 'f2' },
  { t: 3.3, pose: 'm3' }, { t: 3.7, pose: 'b2' }, { t: 4.1, pose: 'm4' }, { t: 4.5, pose: 'f3' }, { t: 4.9, pose: 'm5' }, { t: 5.3, pose: 'b3' }, { t: 5.62, pose: 'm6' }, { t: 5.95, pose: 'down' }, { t: 6.2, pose: 'shiftFK' }, { t: 6.6, pose: 'stand' }, { t: 7.2, pose: 'stand' }];
poses.shiftFK.ik.leg_r.weight = 0; // same fitted channels: the right foot rests by FK, so the lift-off is a plain FK blend
const ex = H.module_(meta, contacts, poses, keyframes);
const peak = poses.f3.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peak - 4), max: Math.ceil(peak + 4) };
let footMin = 1e9, trunkMax = 0;
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const rep = H.loopReport(ex, { planted: ['leg_l', 'leg_r'], probe: (W, pz, t) => { if (t > 0.9 && t < 5.8) footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, trunkLean(W)); } });
const thigh = (W) => Math.atan2(W.knee_r.p[0] - W.hip_r.p[0], -(W.knee_r.p[1] - W.hip_r.p[1])) / R.DEG; // + = forward of vertical
const Wf = L.fk(poses.f3, contacts), Wb = L.fk(poses.b3, contacts), Ws = L.fk(poses.stand, contacts);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${Math.round(poses.stand.ch.hip_r.flex)}°`); set('Hip flexion', 'peak', `≈${Math.round(peak)}° on the third swing (thigh ≈${Math.round(thigh(Wf))}° forward of vertical)`);
set('Hip extension', 'setup', 'Neutral'); set('Hip extension', 'peak', `≈${Math.round(-poses.b3.ch.hip_r.flex)}° (rig limit 20°), thigh ≈${Math.round(-thigh(Wb))}° behind vertical with the pelvis tip`);
set('Knee', 'setup', `Standing knee ≈${Math.round(H.kneeOf(Ws, 'l'))}°`); set('Knee', 'peak', `Swinging knee ≈${Math.round(H.kneeOf(Wf, 'r'))}-${Math.round(Math.max(...['m1', 'm3', 'm5'].map((n) => poses[n].ch.knee_r.flex)))}° (bends a little as the foot passes under the hip)`);
set('Trunk', 'setup', 'Tall'); set('Trunk', 'peak', `Within ≈${Math.round(trunkMax)}° of vertical`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Three swings of about 1.6 s, building the range');
ex.exercise.reference.note = B.NOTE;
const lim = CA.scan(ex).limits;
console.log(`Back Forward Leg Swings: wrote ${L.write(ex)}  measure=${JSON.stringify(ex.checks.measure)}\n  ${JSON.stringify(rep)} footMin ${footMin.toFixed(2)} trunkMax ${trunkMax.toFixed(1)} mid knees ${['m1', 'm2', 'm5'].map((n) => poses[n].ch.knee_r.flex)} limits ${lim.length}`);
if (rep.slide > 0.05 || rep.floor < -0.5 || footMin < -0.3 || lim.length) { console.error('FAIL back-forward-leg-swings', lim.slice(0, 4)); process.exitCode = 1; }
