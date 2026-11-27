// Dumbbell Fly (GymVisual #030812): lying on a flat bench, glutes on the seat and the upper back and head on the pad, feet
// planted (leg contacts). A dumbbell in each hand with a neutral grip (palms facing each other at the top). The arms open
// in a wide arc with the elbows held at a soft fixed bend (about 22 degrees, elbow angle about 158 as in Solstad 2020) until
// the upper arms are about level with the bench, pause in the stretch, then sweep back up along the same arc and squeeze.
// Bilateral; the left arm mirrors the right. Family b3-chest.js.
const L = require('./lib');
const { V, R, r1 } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
module.exports = function fly(meta, { angle, elbow = 22, dip = 4, toFeet = 12, topOut = 0.06, label }) {
  const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(angle);
  const W0 = L.fk(base, contacts), F = C.trunkFrame(W0);
  // top: upper arm vertical (world); bottom: out to the side, angled `toFeet` deg toward the hips, `dip` deg below the back plane
  const dTop = V.norm(V.add([0, 1, 0], V.scale(F.w, topOut))), dBot = C.upperArmDir(F, 90 - toFeet, dip);
  const path = C.flyPath(base, { dTop, dBot, elbow, n: 6 }).map((k) => ({ f: 1 - k.f, pose: C.mirrorArm(C.strip(k.pose)) })).reverse(); // f: 0 bottom .. 1 top
  const settle = C.mirrorArm(C.strip(C.flyPath(base, { dTop, dBot: C.upperArmDir(F, 90 - toFeet, dip - 1.5), elbow, n: 1 })[1].pose));
  const { poses, keyframes } = C.repKeys(path, T, settle);
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props.find((p) => p.id === 'bench').center = B.prop.center;
  let elbowR = [999, -999];
  const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }], probe: (W) => { const e = C.elbowFlexOf(W); elbowR = [Math.min(elbowR[0], e), Math.max(elbowR[1], e)]; } });
  const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
  const fit = C.benchFit(B, W0), dbT = C.dbAt(Wt, 'r'), dbB = C.dbAt(Wb, 'r');
  const fromVert = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, 1, 0]);
  set('Bench angle', 'setup', angle ? `${angle}° back pad, flat seat` : 'Flat (0°)'); set('Bench angle', 'peak', 'Glutes on the seat, upper back and head on the pad (skinned mesh within about 1 cm, measured with b2/chest_mesh.mjs)');
  set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} flexion (elbow angle ${d(180 - C.elbowFlexOf(Wt))})`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom; ${r1(elbowR[0])}-${r1(elbowR[1])}° through the loop`);
  set('Arm opening', 'setup', `Upper arm ${d(fromVert(Wt))} from vertical`); set('Arm opening', 'peak', `${d(fromVert(Wb))} from vertical at the bottom, ${toFeet}° toward the hips`);
  set('Upper arm depth', 'setup', '–'); set('Upper arm depth', 'peak', `${d(C.armDip(Wb))} below the back plane`);
  set('Grip', 'setup', `Neutral; dumbbells ${r1(2 * dbT.c[2] - 12)} cm apart at the top`); set('Grip', 'peak', `Palms up at the bottom; dumbbell centres ${r1(2 * dbB.c[2])} cm apart`);
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s stretch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s squeeze`);
  const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
  ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
  console.log(`${label}: wrote ${L.write(ex)}\n  bench ${JSON.stringify(fit)} knee ${H.kneeOf(W0, 'r').toFixed(0)} hip ${base.ch.hip_r.flex}\n  elbow ${elbowR.map(r1)} top dbZ ${r1(dbT.c[2])} bottom fromVert ${fromVert(Wb).toFixed(0)} dip ${C.armDip(Wb).toFixed(0)}\n  sweep ${JSON.stringify(sw)}`);
  if (sw.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
  if (sw.dbBody > 0.5 || sw.dbBench > 0 || sw.dbFloor < 0 || sw.dbGap < 1 || sw.bodyBench > 2.5) { console.error('FAIL: dumbbell or body collision'); process.exitCode = 1; }
  return ex;
};
if (require.main === module) module.exports(require('./meta/dumbbell-fly.json'), { angle: 0, label: 'Dumbbell Fly' });
