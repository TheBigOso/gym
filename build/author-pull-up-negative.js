// Pull-up (negative) (GymVisual 18108, movement reference only; page not readable at authoring time): the jumping
// negative. Overhand grip a little wider than the shoulders on a free-standing pull-up bar set low enough to jump to.
// Start at the top (chin over the bar, shoulders down, knees bent so the feet are off the floor), lower as slowly as
// possible (about 4 s) to straight arms, put the feet down under the bar with the knees bent (still holding on), then jump
// and pull straight back to the top. Bilateral. Hands planted on the bar (b6-15.js hang, keys of author-pull-up.js). The
// bar height is found so that, in the landing (elbows nearly straight), the feet reach the floor with the knees bent
// about 40 degrees; on the floor the legs are fitted channels that put the ankles on fixed floor points (no leg contacts).
const L = require('./lib');
const { V, rig } = L;
const H = require('./families/hips');
const B = require('./families/b6-15');
const meta = require('./meta/pull-up-negative.json');

const GZ = 26, TILT = 6, LAND_KNEE = 40, FOOT_Z = 11;
const mk = (barH) => B.hang({ barH, grip: { r: [0, GZ], l: [0, -GZ] }, rot: B.GRIPS.over(TILT), pole: { r: [0.35, -0.25, 1], l: [0.35, -0.25, -1] }, plane: [20] });
const UL = V.len(rig.byId.knee_r.offset), LL = V.len(rig.byId.ankle_r.offset);
const legD = (kf) => Math.sqrt(UL * UL + LL * LL + 2 * UL * LL * Math.cos(kf * Math.PI / 180));
const LAND = { flex: 14, sc: { protract: 2, elevate: 18 }, pitch: -2, spine: [0, 0, 0], neck: [0, 0], legs: B.legs(30, 50, 20), x: -3 };
// ankle point under the hip (a little forward), on the floor
const footAt = (W, s) => [+(W[`hip_${s}`].p[0] + 4).toFixed(1), L.ANKLE_H, s === 'r' ? FOOT_Z : -FOOT_Z];
let a = 170, b = 240;
for (let i = 0; i < 30; i++) {
  const m = (a + b) / 2, Hm = mk(m), W = L.fk(Hm.bodyPose(LAND, LAND.x, Hm.rootY(LAND, LAND.x)));
  if (V.len(V.sub(W.hip_r.p, footAt(W, 'r'))) < legD(LAND_KNEE)) a = m; else b = m;   // higher bar: hips higher, legs straighter
}
const BAR_H = Math.round((a + b) / 2);
const Hh = mk(BAR_H);
const K = B.pullKeys({ topFlex: 142, topPitch: 7, hangFlex: 12 });
// hanging keys: knees bent so the feet stay off the floor (bar lower than for the pull-up)
const bent = B.legs(18, 80, -20);
for (const n of ['top', 'm3', 'm2', 'm1', 'scap', 'hang']) K[n].legs = bent;
const W0 = L.fk(Hh.bodyPose(LAND, LAND.x, Hh.rootY(LAND, LAND.x)));
const FEET = { r: footAt(W0, 'r'), l: footAt(W0, 'l') };
K.land = Object.assign({}, LAND, { feet: FEET });
// feet coming down: same body as the landing, ankles 4 cm above their floor points
K.reach = Object.assign({}, LAND, { feet: { r: V.add(FEET.r, [0, 4, 0]), l: V.add(FEET.l, [0, 4, 0]) } });
// push: knees driving straight, arms starting to pull (feet just leaving the floor)
K.push = { flex: 62, sc: { protract: -4, elevate: 4 }, pitch: 2, spine: [-1, -2, -2], neck: [-2, -2], legs: B.legs(8, 12, -25), clear: K.m1.clear, feet: { r: V.add(FEET.r, [0, 2, 0]), l: V.add(FEET.l, [0, 2, 0]) } };
K.push0 = Object.assign({}, K.push, { flex: 32, sc: { protract: -1, elevate: 10 }, pitch: 0, legs: B.legs(20, 30, 10), feet: { r: V.add(FEET.r, [0, 1, 0]), l: V.add(FEET.l, [0, 1, 0]) } });
const poses = {}; for (const [n, k] of Object.entries(K)) poses[n] = Hh.solveKey(k);
const keyframes = [['top', 0], ['top', 0.8], ['m3', 1.5], ['m2', 2.4], ['m1', 3.4], ['scap', 4.5], ['hang', 5.0], ['hang', 5.4], ['reach', 5.75], ['land', 6.0], ['push0', 6.15], ['push', 6.3], ['m2', 6.55], ['top', 6.8]].map(([pose, t]) => ({ t, pose }));
const ex = H.module_(meta, Hh.contacts, poses, keyframes);
ex.props = [Hh.PB.prop];
Hh.pin(ex);

const rep = B.hangCheck(ex, Hh);
const Wt = L.fk(poses.top, Hh.contacts), Wh = L.fk(poses.hang, Hh.contacts), Wl = L.fk(poses.land, Hh.contacts);
const footErr = Math.max(V.len(V.sub(Wl.ankle_r.p, FEET.r)), V.len(V.sub(Wl.ankle_l.p, FEET.l)));
const chin = H.bottomOf(Wt, 'jaw') - BAR_H, travel = V.len(V.sub(Wt.pelvis.p, Wh.pelvis.p)), shW = V.len(V.sub(Wh.shoulder_r.p, Wh.shoulder_l.p));
const set = H.setKin(ex);
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(Wt))}° at the top`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(Wh))}° in the hang`);
set('Lowering time', 'setup', 'Top hold 0.8 s'); set('Lowering time', 'peak', '4.2 s from the top to straight arms; land 0.6 s, jump 0.8 s');
set('Chin height', 'setup', `Chin ${chin.toFixed(1)} cm above the bar at the top`); set('Chin height', 'peak', `Body lowers ${Math.round(travel)} cm`);
set('Grip width', 'setup', `Overhand, grip points ${2 * GZ} cm apart (shoulder joints ${Math.round(shW)} cm)`); set('Grip width', 'peak', 'Unchanged (hands planted on the bar)');
set('Bar height', 'setup', `Bar ${BAR_H} cm`); set('Bar height', 'peak', `Feet reach the floor with the knees ≈${Math.round(H.kneeOf(Wl, 'r'))}° when landing; ${L.shapeMinY(Wh).y.toFixed(1)} cm clear in the hang`);
console.log(`Pull-up (negative): wrote ${L.write(ex)}\n  bar ${BAR_H} chin ${chin.toFixed(1)} travel ${travel.toFixed(1)} land knee ${H.kneeOf(Wl, 'r').toFixed(0)} footErr ${footErr.toFixed(2)} hang feet ${L.shapeMinY(Wh).y.toFixed(1)} slack ${JSON.stringify(Object.fromEntries(Object.entries(poses).map(([n, p]) => [n, Hh.slack(p)])))}\n  ${JSON.stringify(rep)}`);
B.hangGate(rep, { minFloor: -0.5 });
if (chin < 0) { console.error('FAIL: chin does not clear the bar'); process.exitCode = 1; }
if (footErr > 0.5) { console.error('FAIL: feet miss the floor when landing'); process.exitCode = 1; }
