// Dumbbell Bench Press (GymVisual #028912): lying on a flat bench, glutes on the seat and the upper back and head on the pad,
// feet planted (leg contacts, constant targets). A dumbbell in each hand (handle grip, palms toward the feet). From straight
// arms over the shoulders the dumbbells lower beside the chest with the elbows about 55 degrees from the trunk and the
// forearms vertical, pause, then press up and slightly in. Bilateral; the left arm mirrors the right. Family b3-chest.js.
const L = require('./lib');
const { V, r1, clone } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-bench-press.json');
module.exports = function press(meta, { angle, flare = 55, dip = 22, topTilt = [0.03, 1, 0.12], label }) {
  const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(angle);
  const W0 = L.fk(base, contacts), F = C.trunkFrame(W0), ax = V.scale(F.w, -1); // right thumb toward the midline: palms toward the feet
  const path = C.pressPath(base, { flare, dip, topDir: topTilt, ax, n: 6 }).map((k) => ({ f: k.f, pose: C.mirrorArm(C.strip(k.pose)) }));
  const settle = C.mirrorArm(C.strip(C.pressPath(base, { flare, dip: dip - 1.5, topDir: topTilt, ax, n: 1 })[0].pose));
  const { poses, keyframes } = C.repKeys(path, T, settle);
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props.find((p) => p.id === 'bench').center = B.prop.center;
  const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }] });
  const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
  const fit = C.benchFit(B, W0), dbB = C.dbAt(Wb, 'r'), dbT = C.dbAt(Wt, 'r');
  set('Bench angle', 'setup', angle ? `${angle}° back pad, flat seat` : 'Flat (0°)'); set('Bench angle', 'peak', 'Glutes on the seat, upper back and head on the pad (skinned mesh within about 1 cm, measured with b2/chest_mesh.mjs)');
  set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom`);
  set('Elbow flare', 'setup', 'Arms vertical over the shoulders'); set('Elbow flare', 'peak', `${d(C.elbowFlare(Wb))} at the bottom`);
  set('Upper arm depth', 'setup', '–'); set('Upper arm depth', 'peak', `${d(C.armDip(Wb))} below the back plane; dumbbell centre ${r1(dbB.c[1] - W0.shoulder_r.p[1])} cm above the shoulder joint`);
  set('Dumbbell path', 'setup', `Top: dumbbells ${r1(2 * dbT.c[2] - 32)} cm apart over the shoulders`); set('Dumbbell path', 'peak', `Bottom: centres ${r1(2 * dbB.c[2])} cm apart beside the chest, rise ${r1(dbT.c[1] - dbB.c[1])} cm`);
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
  const tf = L.V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
  ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
  console.log(`${label}: wrote ${L.write(ex)}\n  bench ${JSON.stringify(fit)} knee ${H.kneeOf(W0, 'r').toFixed(0)} hip ${base.ch.hip_r.flex} foot ${foot}\n  top elbow ${C.elbowFlexOf(Wt).toFixed(0)} bottom elbow ${C.elbowFlexOf(Wb).toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)} dip ${C.armDip(Wb).toFixed(0)} trunk ${tf.toFixed(1)}\n  sweep ${JSON.stringify(sw)}`);
  if (sw.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
  if (sw.dbBody > 0.5 || sw.dbBench > 0 || sw.dbFloor < 0 || sw.dbGap < 1 || sw.bodyBench > 2.5) { console.error('FAIL: dumbbell or body collision'); process.exitCode = 1; }
  return ex;
};
if (require.main === module) module.exports(meta, { angle: 0, label: 'Dumbbell Bench Press' });
