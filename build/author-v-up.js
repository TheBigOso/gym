// V-up (GymVisual #362212, V-up male). Bilateral: lying flat on a mat, legs straight and together, arms straight overhead
// on the mat. Lift the arms, trunk and legs together, folding at the hips to balance on the buttocks with the hands
// reaching toward the shins; lower both ends under control back to the long lying position.
const L = require('./lib');
const { R, V, r1, clone } = L; // eslint-disable-line no-unused-vars
const C = require('./families/core-a');
const meta = require('./meta/v-up.json');

const B = C.lie({ kneeFlex: 0 });
const lie = B.pose, P0 = B.P0, NECK0 = B.NECK;
const ARMS_IDS = [...C.ARM_IDS('r')];
// Arms straight overhead resting on the mat (slightly wider than the shoulders)
function armsOverhead(p) {
  const q = clone(p); q.ch.shoulder_r = { plane: 85, elev: 175, axial: 0 }; q.ch.elbow_r = { flex: 6 }; q.ch.sc_r = { protract: 0, elevate: 12 }; q.ch.wrist_r = { pron: 0, flex: 0, dev: 0 };
  const paths = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial'];
  const s = L.solvePose(q, paths, [
    (W) => [(C.minOf(W, ARMS_IDS) - 0.4) * 3],                                    // arm resting on the mat
    (W) => [(W.wrist_r.p[2] - W.shoulder_r.p[2] - 5) * 0.5],                      // hands a little wider than the shoulders
    (W, q) => [Math.max(0, q.ch.shoulder_r.elev - 200) * 4, Math.max(0, q.ch.shoulder_r.plane - 132) * 4], L.obj.reg('ch.shoulder_r.plane', 95, 0.03), L.obj.reg('ch.shoulder_r.axial', 0, 0.05),
  ], { iters: 400 });
  return C.mirrorArm(s.pose);
}
// Arms straight, wrists aimed at a point on the shins (fraction f from hip to ankle), hands just outside the legs
function armsToShins(p, f, out = 11, guess = [90, 80, 0]) {
  const W = L.fk(p), tgt = V.add(V.add(W.hip_r.p, V.scale(V.sub(W.ankle_r.p, W.hip_r.p), f)), [0, 4, out]);
  return C.mirrorArm(L.armToTarget(p, tgt, { flex: 6, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess }));
}
// Arms pointing straight up from the shoulders, angle `a` from the floor toward the feet (90 = vertical)
function armsAt(p, a, guess) {
  const W = L.fk(p), S = W.shoulder_r.p, dir = V.norm([Math.cos(a * R.DEG), Math.sin(a * R.DEG), 0.12]);
  return C.mirrorArm(L.armToTarget(p, V.add(S, V.scale(dir, L.reach(6))), { flex: 6, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess }));
}
// Body shape: trunk (pelvis-C7) `trunk` degrees above the floor, legs `legs` degrees, spine curl added, then grounded.
function body(k) {
  let p = clone(lie);
  C.spine(p, lie, k.curl || {}); C.neck(p, k.neck ?? NECK0);
  const setP = (q, P) => { q.root.rot.pitch = r1(P); return q; };
  if (k.trunk != null) { let lo = 0, hi = P0 + 5; for (let i = 0; i < 50; i++) { const P = (lo + hi) / 2; if (C.trunkFromFloor(L.fk(setP(clone(p), P))) > k.trunk) lo = P; else hi = P; } setP(p, (lo + hi) / 2); }
  p = C.setLegs(p, { deg: k.legs, knee: k.knee ?? 2, dorsi: k.dorsi ?? -25, abd: -3 });
  p = k.arms(p);
  // ground: the lowest point (buttocks at the top, back and heels when lying) rests on the mat
  p.root.pos[1] = r1(p.root.pos[1] - L.shapeMinY(L.fk(p)).y + 0.15);
  return p;
}
const lieKey = (p) => { // legs and arms resting on the mat
  let q = C.setLegs(clone(p), { heel: 0.2, knee: 2, dorsi: -20, abd: -3 });
  q = armsOverhead(q); q.root.pos[1] = r1(q.root.pos[1] - L.shapeMinY(L.fk(q)).y + 0.15); return q;
};
const TOP = { trunk: 52, legs: 58 };
const poses = {
  lie: lieKey(lie),
  up1: body({ trunk: 12, legs: 16, curl: { l5: 2, t12: 10, t6: 10 }, neck: 26, arms: (p) => armsAt(p, 112, [90, 150, 0]) }),
  up2: body({ trunk: 32, legs: 38, curl: { l5: 6, t12: 13, t6: 10 }, neck: 24, arms: (p) => armsAt(p, 70, [90, 110, 0]) }),
  top: body({ ...TOP, curl: { l5: 10, t12: 12, t6: 8 }, neck: 20, arms: (p) => armsToShins(p, 0.62) }),
  topHold: body({ trunk: TOP.trunk + 1, legs: TOP.legs + 1, curl: { l5: 10, t12: 12, t6: 8 }, neck: 20, arms: (p) => armsToShins(p, 0.64) }),
  down1: body({ trunk: 30, legs: 34, curl: { l5: 7, t12: 13, t6: 10 }, neck: 24, arms: (p) => armsAt(p, 62, [90, 110, 0]) }),
  down2: body({ trunk: 8, legs: 10, curl: { l5: 2, t12: 8, t6: 8 }, neck: 22, arms: (p) => armsAt(p, 120, [90, 150, 0]) }),
};
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.2, pose: 'up1' }, { t: 1.6, pose: 'up2' }, { t: 2.0, pose: 'top' }, { t: 2.5, pose: 'topHold' }, { t: 3.3, pose: 'down1' }, { t: 4.0, pose: 'down2' }, { t: 4.5, pose: 'lie' }, { t: 6.0, pose: 'lie' }];
const ex = C.buildModule(meta, poses, keyframes, []);
const peakHip = poses.topHold.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 6), max: Math.ceil(peakHip + 4) };

const handToShin = (W) => { const a = W.hip_r.p, b = W.ankle_r.p, h = W.handtip_r.p, ab = V.sub(b, a), t = Math.max(0, Math.min(1, V.dot(V.sub(h, a), ab) / V.dot(ab, ab))); return V.len(V.sub(h, V.add(a, V.scale(ab, t)))); };
const rep = C.scan(ex, { trunk: (W) => C.trunkFromFloor(W), legs: (W) => C.legFromFloor(W), hip: (W, p) => p.ch.hip_r.flex, pelvisX: (W) => W.pelvis.p[0] });
const Wl = L.fk(poses.lie), Wt = L.fk(poses.top), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, tp = poses.top, lp = poses.lie;
const contactAt = (W) => L.shapeMinY(W).id;
kin[0].setup = d(C.trunkFromFloor(Wl)); kin[0].peak = `${d(C.trunkFromFloor(Wt))} (balanced on the ${contactAt(Wt).replace(/_[rl]$/, '')})`;
kin[1].setup = d(C.legFromFloor(Wl)) + ' (resting)'; kin[1].peak = d(C.legFromFloor(Wt));
kin[2].setup = d(lp.ch.hip_r.flex); kin[2].peak = `${d(tp.ch.hip_r.flex)} (trunk-to-leg angle ${d(180 - C.trunkFromFloor(Wt) - C.legFromFloor(Wt))})`;
kin[3].setup = d(lp.ch.spine_l5.flex + lp.ch.spine_t12.flex + lp.ch.spine_t6.flex) + ' (resting curve)'; kin[3].peak = `${d(tp.ch.spine_l5.flex + tp.ch.spine_t12.flex + tp.ch.spine_t6.flex)} (+${Math.round(tp.ch.spine_l5.flex + tp.ch.spine_t12.flex + tp.ch.spine_t6.flex - lp.ch.spine_l5.flex - lp.ch.spine_t12.flex - lp.ch.spine_t6.flex)}°)`;
kin[4].setup = 'Straight overhead, resting on the mat about shoulder width'; kin[4].peak = `Reaching toward the shins (fingertips ${r1(handToShin(Wt))} cm from the shin line)`;
kin[5].setup = 'Lie 0.8 s'; kin[5].peak = '1.2 s up, 0.5 s balance, 2.0 s down, 1.5 s reset';
console.log(`V-up: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
for (const [n, p] of Object.entries(poses)) { const W = L.fk(p); console.log(`  ${n.padEnd(8)} pitch=${p.root.rot.pitch} root=${p.root.pos.map(r1)} trunk=${C.trunkFromFloor(W).toFixed(1)} legs=${C.legFromFloor(W).toFixed(1)} hip=${p.ch.hip_r.flex} spine=${p.ch.spine_l5.flex}/${p.ch.spine_t12.flex}/${p.ch.spine_t6.flex} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} min=${contactAt(W)} hand-shin=${handToShin(W).toFixed(1)}`); }
C.guard('v-up', rep, [/^(arm|fore|hand|head)/.test(contactAt(Wt)) && 'top pose is not balanced on the hips']);
