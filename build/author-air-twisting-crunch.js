// Air Twisting Crunch (GymVisual #11425, movement reference only; page not readable here). Bilateral, alternating: supine
// on a mat with the legs held up in a tabletop (hips and knees about 90 degrees, shins level), fingertips behind the head
// with the elbows wide. Curl up and rotate the upper trunk so the right elbow travels toward the left knee, squeeze,
// lower the shoulders back toward the mat; repeat to the other side. The legs stay still in the air (unlike the air bike,
// they do not pedal) and the pelvis stays on the mat. Built on core-b (as air-bike).
const L = require('./lib');
const { V, rig, r1, clone } = L;
const C = require('./families/core-b');
const F6 = require('./families/b6-17');
const meta = require('./meta/air-twisting-crunch.json');

const lie = C.lie({ kneeFlex: 90, spine: { l5: 2, t12: 2, t6: 4 }, pitch: 93 });
const HIP = +(process.env.HIP || 90), KNEE = +(process.env.KNEE || 90);
const ARM0 = { shoulder: { plane: -5, elev: 126, axial: -125 }, elbow: { flex: 136 }, wrist: { pron: 35, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
const SPLIT = { spine_l5: 0.08, spine_t12: 0.46, spine_t6: 0.46 };
function pose(k, refArm) {
  const p = clone(lie);
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: r1(k.rot * SPLIT[j]), latFlex: r1((k.lat || 0) * (j === 'spine_l5' ? 0 : 0.5)), flex: r1(Math.min(rig.byId[j].limits.flex[1] - 1, lie.ch[j].flex + k.curl[j])) };
  C.neck(p, k.neck, k.rot * 0.25);
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: HIP, abd: 0, rot: 0 }; p.ch[`knee_${s}`] = { flex: KNEE }; p.ch[`ankle_${s}`] = { dorsi: -15 }; }
  let q = C.cradle(p, { side: 'r', guess: refArm.r, ref: refArm.r, elbowOut: k.elbowOut ?? 18, elbowAnt: k.elbowAnt ?? -3, floor: k.floor ?? 1.0 });
  q = C.cradle(q, { side: 'l', guess: refArm.l, ref: refArm.l, elbowOut: 18, floor: k.floor ?? 1.0 });
  delete q.__cost;
  return q;
}
const CURL = { spine_l5: 2, spine_t12: 13, spine_t6: 18 };
let best = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = clone(ARM0); g.shoulder.axial = axial; g.wrist.pron = pron;
  const p = clone(lie);
  for (const j in CURL) p.ch[j].flex = r1(lie.ch[j].flex + CURL[j]);
  C.neck(p, 30);
  const q = C.cradle(p, { guess: g, elbowOut: 18 });
  if (!best || q.__cost < best.__cost) best = q;
}
const REF = { r: C.armOf(best, 'r'), l: C.armOf(best, 'l') };
const ZERO = { spine_l5: 0, spine_t12: 0, spine_t6: 0 };
const DOWN = { curl: ZERO, rot: 0, neck: +(process.env.NECK0 || -6), floor: 0.3 };
const LOW = { curl: { spine_l5: 1, spine_t12: 6, spine_t6: 8 }, rot: 0, neck: 16 };
// right elbow to the left knee: trunk turns left (negative rot), the right shoulder curls higher
const A = { curl: { spine_l5: 5, spine_t12: 20, spine_t6: 20 }, rot: -36, lat: -4, neck: 30, elbowAnt: 3, elbowOut: 15 };
const Ah = Object.assign({}, A, { rot: -38, curl: { spine_l5: 5.5, spine_t12: 21, spine_t6: 21 } });
const poses = { down: pose(DOWN, REF), low: pose(LOW, REF), A: pose(A, REF), Ahold: pose(Ah, REF) };
poses.B = C.mirror(poses.A); poses.Bhold = C.mirror(poses.Ahold);
for (const n of ['B', 'Bhold']) delete poses[n].__cost;
const keyframes = [{ t: 0, pose: 'down' }, { t: 0.6, pose: 'down' }, { t: 1.4, pose: 'A' }, { t: 1.8, pose: 'Ahold' }, { t: 2.6, pose: 'low' }, { t: 3.0, pose: 'down' },
  { t: 3.3, pose: 'down' }, { t: 4.1, pose: 'B' }, { t: 4.5, pose: 'Bhold' }, { t: 5.3, pose: 'low' }, { t: 5.7, pose: 'down' }, { t: 6.0, pose: 'down' }];
const ex = C.moduleOf(meta, poses, keyframes, []);
ex.checks.measure = { name: 'hipFlexion', min: HIP - 3, max: HIP + 3 };

const rep = C.scan(ex, { still: ['pelvis', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l'] });
const Wd = L.fk(poses.down), Wa = L.fk(poses.Ahold);
const ah = poses.Ahold.ch, rotSum = ah.spine_l5.rot + ah.spine_t12.rot + ah.spine_t6.rot, elbowKnee = V.len(V.sub(Wa.elbow_r.p, Wa.knee_l.p));
Object.assign(rep, { headDown: r1(C.headBottom(Wd)), chestDown: r1(C.bottomOf(Wd, 'chest')), elbowKnee: r1(elbowKnee), rot: r1(rotSum), shR: r1(C.bottomOf(Wa, 'deltoid_r')), shL: r1(C.bottomOf(Wa, 'deltoid_l')), feet: r1(Math.min(C.bottomOf(Wd, 'foot_r'), C.bottomOf(Wd, 'calf_r'))) });
rep.limits = rep.limits.concat(F6.limitViolations(poses)).filter((v, i, a) => a.indexOf(v) === i);
C.setKin(ex, 'Trunk curl', `Shoulders on the mat between reps (upper back ${r1(C.bottomOf(Wd, 'chest'))} cm)`, `Shoulder blades off the mat, thoracic ${C.deg(ah.spine_t12.flex + ah.spine_t6.flex)} flexion`);
C.setKin(ex, 'Trunk rotation', 'Square to the ceiling', `${C.deg(-rotSum)} toward the opposite knee (mostly thoracic), elbow ${Math.round(elbowKnee)} cm from the knee`);
C.setKin(ex, 'Legs', `Hips ${C.deg(HIP)}, knees ${C.deg(KNEE)} (tabletop), feet ${Math.round(Math.min(C.bottomOf(Wd, 'foot_r'), C.bottomOf(Wd, 'calf_r')))} cm off the mat`, 'Unchanged (the legs hold still)');
C.setKin(ex, 'Tempo', 'Set 0.6 s', 'About 1.2 s up and turn, 0.4 s squeeze, 1.2 s down per side; 6 s loop');
console.log(JSON.stringify(poses.A.ch.shoulder_r), JSON.stringify(poses.down.ch.shoulder_r));
C.finish(ex, rep, 'Air Twisting Crunch');
