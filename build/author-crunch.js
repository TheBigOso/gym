// Crunch (GymVisual #027412, Crunch Floor). Bilateral: supine on a mat, knees bent about 90 degrees with the feet flat
// (planted), fingertips lightly behind the head with the elbows wide. Curl the head, shoulders and shoulder blades off the
// mat while the low back and pelvis stay down, squeeze briefly, then lower: shoulder blades first, head last.
const L = require('./lib');
const { r1, clone } = L;
const C = require('./families/core-a');
const meta = require('./meta/crunch.json');

const B = C.lie({ kneeFlex: 90, headRest: 'hands' });
const F = C.plantFeet(B.pose, 90);
const lie = F.pose, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
// Curl: segment flexion added to the lying curve (pelvis and legs fixed, so the hips do not flex).
function curl(k, guess) {
  const p = C.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  C.neck(p, k.neck == null ? NECK0 : k.neck);
  return C.cradle(p, { floor: k.floor, elbowAnt: k.elbowAnt, guess, wristRef: k.floor && guess ? guess.wrist_r : null });
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, floor: true, elbowAnt: -3 },
  { name: 'peel', l5: 0.5, t12: 7, t6: 10, neck: 24 },        // head and shoulders start to lift
  { name: 'top', l5: 2, t12: 20, t6: 16, neck: 30 },          // shoulder blades off the mat, low back down
  { name: 'topHold', l5: 2.5, t12: 21, t6: 16.5, neck: 30 },
  { name: 'down', l5: 0.5, t12: 4, t6: 6, neck: 22 },         // shoulder blades down first, head still up
  { name: 'touch', l5: 0, t12: 1, t6: 2, neck: 12, floor: true, elbowAnt: -2 },
];
// One arm branch for every key: seed from the top pose
let best = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder_r: { plane: -5, elev: 126, axial }, elbow_r: { flex: 136 }, wrist_r: { pron, flex: 16, dev: -20 }, sc_r: { protract: -2, elevate: 2 } };
  const p = curl(KEYS[2], g); if (!best || p.__cost < best.__cost) best = p;
}
const arm = (p) => ({ shoulder_r: p.ch.shoulder_r, elbow_r: p.ch.elbow_r, wrist_r: p.ch.wrist_r, sc_r: p.ch.sc_r });
const ARM0 = arm(best);
const poses = {}; let prev = ARM0;
for (const k of KEYS) { const p = curl(k, k.floor ? ARM0 : prev); prev = arm(p); delete p.__cost; poses[k.name] = p; }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.2, pose: 'peel' }, { t: 1.8, pose: 'top' }, { t: 2.3, pose: 'topHold' }, { t: 3.3, pose: 'down' }, { t: 3.9, pose: 'touch' }, { t: 4.4, pose: 'lie' }, { t: 5.0, pose: 'lie' }];
const ex = C.buildModule(meta, poses, keyframes, F.contacts);

const rep = C.scan(ex, { upper: (W) => C.upperFromFloor(W), trunk: (W) => C.trunkFromFloor(W), c7: (W) => W.neck_c7.p[1], lowBack: (W) => C.minOf(W, ['abdomen', 'pelvis', 'buttock_r']) });
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.top, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.top;
const blade = (W) => C.bottomOf(W, 'chest');
kin[0].setup = d(C.upperFromFloor(Wl)); kin[0].peak = `${d(C.upperFromFloor(Wt))} (upper back ${r1(blade(Wt))} cm off the mat; C7 up ${r1(Wt.neck_c7.p[1] - Wl.neck_c7.p[1])} cm)`;
kin[1].setup = d(lie.ch.spine_l5.flex) + ' (slight lordosis)'; kin[1].peak = `${d(pk.ch.spine_l5.flex)} (+${r1(pk.ch.spine_l5.flex - lie.ch.spine_l5.flex)}°, low back stays on the mat)`;
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (+${Math.round(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex - lie.ch.spine_t12.flex - lie.ch.spine_t6.flex)}°)`;
kin[3].setup = `Hip ${d(lie.ch.hip_r.flex)}, knee ${d(C.kneeOf(Wl, 'r'))}`; kin[3].peak = 'Unchanged (pelvis and feet still)';
kin[4].setup = d(NECK0) + ' (head resting in the hands)'; kin[4].peak = d(pk.ch.neck_c7.flex + pk.ch.head_c1.flex);
kin[5].setup = 'Rest 0.8 s'; kin[5].peak = '1.0 s up, 0.5 s squeeze, 1.6 s down, 1.1 s rest';
console.log(`Crunch: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
for (const k of KEYS) { const p = poses[k.name], W = L.fk(p, F.contacts); console.log(`  ${k.name.padEnd(8)} spine=${p.ch.spine_l5.flex}/${p.ch.spine_t12.flex}/${p.ch.spine_t6.flex} neck=${p.ch.neck_c7.flex}+${p.ch.head_c1.flex} upper=${C.upperFromFloor(W).toFixed(1)} chestBottom=${blade(W).toFixed(1)} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} elb=${p.ch.elbow_r.flex}`); }
C.guard('crunch', rep, [(C.upperFromFloor(Wt) < 25 || C.upperFromFloor(Wt) > 50) && 'upper-trunk curl outside 25-50 degrees', rep.lowBack[1] > 1.5 && `low back lifts ${rep.lowBack[1]} cm`]);
