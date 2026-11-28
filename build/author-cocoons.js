// Cocoons (GymVisual 5037, movement reference only; page not readable at authoring time). Supine on a mat, arms straight
// overhead, legs long. Brace into a low hollow (arms, shoulders and heels just off the mat), then curl up into a tuck:
// knees drawn to the chest while the trunk curls and the arms sweep over to wrap around the shins, balanced on the hips;
// open back out to the hollow and lower to the mat. Bilateral. Body solve as author-v-up.js (trunk angle by root pitch,
// spine curl, then the lowest point grounded on the mat).
const L = require('./lib');
const { R, V, r1, clone } = L;
const C = require('./families/core-a');
const meta = require('./meta/cocoons.json');

const B = C.lie({ kneeFlex: 0 });
const lie = B.pose, P0 = B.P0, NECK0 = B.NECK;
const ARMS_IDS = [...C.ARM_IDS('r')];
// Arms in one shoulder plane (PLANE, close to pure flexion, hands a little wider than the shoulders) so the elevation
// channel alone carries them from overhead to forward without passing the overhead singularity on another branch.
const PLANE = 80;
function armsElev(p, objective, e0) {
  const q = clone(p); q.ch.shoulder_r = { plane: PLANE, elev: e0, axial: 0 }; q.ch.elbow_r = { flex: 6 }; q.ch.wrist_r = { pron: 0, flex: 0, dev: 0 }; q.ch.sc_r = { protract: 2, elevate: 8 };
  const s = L.solvePose(q, ['ch.shoulder_r.elev'], [objective, (W, qq) => [Math.max(0, qq.ch.shoulder_r.elev - 205) * 4]], { iters: 200 });
  return C.mirrorArm(s.pose);
}
// straight overhead resting on the mat
const armsOverhead = (p) => armsElev(p, (W) => [(C.minOf(W, ARMS_IDS) - 0.4) * 3], 175);
// straight arms at angle a from the floor toward the feet (90 = vertical, ~170 = overhead)
const armsAt = (p, a) => armsElev(p, (W) => { const d = V.sub(W.wrist_r.p, W.shoulder_r.p); return [(Math.atan2(d[1], d[0]) / R.DEG - a) * 0.5]; }, 180 - a + 90);
// hands wrapped around the front of the shins (fraction f from knee to ankle), just outside the legs
function armsHug(p, f, out = 9) {
  const W = L.fk(p), tgt = V.add(V.add(W.knee_r.p, V.scale(V.sub(W.ankle_r.p, W.knee_r.p), f)), [4, 0, out]);
  return C.mirrorArm(L.armToTarget(p, tgt, { wrist: { pron: 60, flex: 10, dev: 0 }, axial: 0, guess: [60, 70, 0] }));
}
function body(k) {
  let p = clone(lie);
  C.spine(p, lie, k.curl || {}); C.neck(p, k.neck ?? NECK0);
  const setP = (q, P) => { q.root.rot.pitch = r1(P); return q; };
  if (k.trunk != null) { let lo = 0, hi = P0 + 5; for (let i = 0; i < 50; i++) { const P = (lo + hi) / 2; if (C.trunkFromFloor(L.fk(setP(clone(p), P))) > k.trunk) lo = P; else hi = P; } setP(p, (lo + hi) / 2); }
  if (k.legs != null) p = C.setLegs(p, { deg: k.legs, knee: 2, dorsi: -25, abd: -3 });
  else for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: k.hip, abd: 2, rot: 0 }; p.ch[`knee_${s}`] = { flex: k.knee }; p.ch[`ankle_${s}`] = { dorsi: -20 }; }
  p = k.arms(p);
  p.root.pos[1] = r1(p.root.pos[1] - L.shapeMinY(L.fk(p)).y + 0.15);
  return p;
}
const lieKey = (() => { let q = C.setLegs(clone(lie), { heel: 0.2, knee: 2, dorsi: -20, abd: -3 }); q = armsOverhead(q); q.root.pos[1] = r1(q.root.pos[1] - L.shapeMinY(L.fk(q)).y + 0.15); return q; })();
const TUCK = { trunk: 46, hip: 124, knee: 125 };
const poses = {
  lie: lieKey,
  hollow: body({ trunk: 9, legs: 12, curl: { l5: 2, t12: 9, t6: 9 }, neck: 24, arms: (p) => armsAt(p, 176) }),
  t1: body({ trunk: 22, hip: 55, knee: 50, curl: { l5: 5, t12: 13, t6: 10 }, neck: 26, arms: (p) => armsAt(p, 125) }),
  t2: body({ trunk: 36, hip: 95, knee: 95, curl: { l5: 9, t12: 15, t6: 11 }, neck: 26, arms: (p) => armsAt(p, 70) }),
  tuck: body({ ...TUCK, curl: { l5: 12, t12: 16, t6: 12 }, neck: 26, arms: (p) => armsHug(p, 0.45) }),
  tuckHold: body({ trunk: TUCK.trunk + 1, hip: TUCK.hip + 2, knee: TUCK.knee + 2, curl: { l5: 12.5, t12: 16, t6: 12 }, neck: 26, arms: (p) => armsHug(p, 0.47) }),
  e1: body({ trunk: 32, hip: 90, knee: 85, curl: { l5: 8, t12: 15, t6: 11 }, neck: 26, arms: (p) => armsAt(p, 80) }),
  e2: body({ trunk: 16, hip: 45, knee: 35, curl: { l5: 4, t12: 11, t6: 10 }, neck: 25, arms: (p) => armsAt(p, 140) }),
};
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.6, pose: 'lie' }, { t: 1.2, pose: 'hollow' }, { t: 1.55, pose: 't1' }, { t: 1.9, pose: 't2' }, { t: 2.2, pose: 'tuck' }, { t: 2.6, pose: 'tuckHold' },
  { t: 3.0, pose: 'e1' }, { t: 3.4, pose: 'e2' }, { t: 3.8, pose: 'hollow' }, { t: 4.6, pose: 'lie' }, { t: 5.6, pose: 'lie' }];
const ex = C.buildModule(meta, poses, keyframes, []);
const peakHip = poses.tuckHold.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 5), max: Math.ceil(peakHip + 4) };
const rep = C.scan(ex, { trunk: (W) => C.trunkFromFloor(W), hip: (W, p) => p.ch.hip_r.flex });
// hands must not pass through the legs: distance from the wrist to the shin line, and the lowest support at the tuck
const segD = (pt, a, b) => { const ab = V.sub(b, a), t = Math.max(0, Math.min(1, V.dot(V.sub(pt, a), ab) / V.dot(ab, ab))); return V.len(V.sub(pt, V.add(a, V.scale(ab, t)))); };
const Wt = L.fk(poses.tuck), Wh = L.fk(poses.hollow), Wl = L.fk(poses.lie);
const handShin = segD(Wt.wrist_r.p, Wt.knee_r.p, Wt.ankle_r.p);
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k[f] = v; }, d = (v) => `≈${Math.round(v)}°`;
set('Trunk from the floor', 'setup', `${d(C.trunkFromFloor(Wl))} lying, ${d(C.trunkFromFloor(Wh))} in the hollow`); set('Trunk from the floor', 'peak', `${d(C.trunkFromFloor(Wt))} in the tuck (balanced on the ${L.shapeMinY(Wt).id.replace(/_[rl]$/, '')})`);
set('Hip flexion', 'setup', `${d(poses.hollow.ch.hip_r.flex)} in the hollow`); set('Hip flexion', 'peak', d(poses.tuckHold.ch.hip_r.flex));
set('Knee flexion', 'setup', d(C.kneeOf(Wh, 'r'))); set('Knee flexion', 'peak', d(C.kneeOf(Wt, 'r')));
set('Arms', 'setup', 'Straight overhead'); set('Arms', 'peak', `Around the shins (wrist ${r1(handShin)} cm from the shin line)`);
set('Tempo', 'setup', 'Lie 0.6 s, hollow 0.6 s'); set('Tempo', 'peak', '1 s in, 0.4 s squeeze, 1.2 s out, 0.8 s down');
console.log(`Cocoons: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} handShin ${handShin.toFixed(1)} tuckSupport ${L.shapeMinY(Wt).id} hollowHeel ${C.minOf(Wh, ['foot_r', 'calf_r']).toFixed(1)} hollowHand ${C.minOf(Wh, ['hand_r']).toFixed(1)}`);
for (const [n, p] of Object.entries(poses)) { const W = L.fk(p); console.log(`  ${n.padEnd(8)} trunk=${C.trunkFromFloor(W).toFixed(1)} hip=${p.ch.hip_r.flex} knee=${p.ch.knee_r.flex} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev} el=${p.ch.elbow_r.flex} min=${L.shapeMinY(W).id}`); }
C.guard('cocoons', rep, [handShin < 4 && 'hands inside the shins', /^(arm|fore|hand|head|hair)/.test(L.shapeMinY(Wt).id) && 'tuck not balanced on the hips']);
