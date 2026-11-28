// Pelvic Tilt (GymVisual #11667; page not readable here, movement from the name and standard coaching): supine on a mat,
// knees bent about 90 degrees with the feet flat (planted leg contacts), palms planted by the hips (arm contacts). The
// pelvis rolls back (posterior tilt) so the low back flattens into the mat while the buttocks stay down; hold, then
// release to neutral. The upper back and head stay put; the legs follow the pelvis from the planted feet. Bilateral.
const F = require('./families/b6-20');
const { L, V, r1, clone, CA } = F;
const meta = require('./meta/pelvic-tilt.json');

const lie = CA.lie({ kneeFlex: 90 });
const FT = CA.plantFeet(lie.pose, 90);
const HC = CA.handContacts();
const contacts = [...FT.contacts, ...HC];
const HT = CA.handTargets(FT.pose, { abd: 12 });
const neutral = CA.plantHands(FT.pose, HT, HC);
const W0 = L.fk(neutral, contacts);
const butt = (W) => Math.min(F.bottomOf(W, 'buttock_r'), F.bottomOf(W, 'buttock_l'));
const back = (W) => Math.min(F.bottomOf(W, 'chest'), F.bottomOf(W, 'traps_r'), F.bottomOf(W, 'traps_l'));
const lumbarGap = (W) => F.bottomOf(W, 'abdomen');   // the low back (abdomen shape bottom) above the mat
const B0 = butt(W0), K0 = back(W0), T6 = W0.spine_t6.p.slice();

// Tilt by d degrees: pelvis pitch P0 + d; lumbar and thoracic segments, root height and x solved so the buttocks stay on
// the mat (no bridge), the upper back stays where it was, and the lumbar segment flexes (flattens) to absorb the tilt.
function tilt(d) {
  let p = clone(neutral);
  p.root.rot.pitch = r1(neutral.root.rot.pitch + d);
  p = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
    (W) => [(butt(W) - B0) * 2, (back(W) - K0) * 2, ...V.sub(W.spine_t6.p, T6).map((v) => v * 40), Math.min(0, F.bottomOf(W, 'thigh_r') - 0.1) * 8, Math.min(0, F.bottomOf(W, 'thigh_l') - 0.1) * 8],
    L.obj.reg('ch.spine_t6.flex', neutral.ch.spine_t6.flex, 0.3), L.obj.reg('ch.spine_t12.flex', neutral.ch.spine_t12.flex, 0.1),
  ]).pose;
  for (const s of ['r', 'l']) p = CA.fitLeg(p, s, FT.targets[s], FT.contacts);
  for (const s of ['r', 'l']) p = CA.fitArm(p, s, HT[s], HC);
  p.ik = clone(neutral.ik);
  return p;
}
const TILT = 9;
const poses = { neutral, half: tilt(TILT / 2), tilt: tilt(TILT), tiltHold: tilt(TILT + 1) };
const keyframes = [{ t: 0, pose: 'neutral' }, { t: 0.8, pose: 'neutral' }, { t: 1.4, pose: 'half' }, { t: 2.0, pose: 'tilt' }, { t: 3.5, pose: 'tiltHold' }, { t: 4.15, pose: 'half' }, { t: 4.8, pose: 'neutral' }, { t: 6.0, pose: 'neutral' }];
const ex = CA.buildModule(meta, poses, keyframes, contacts);
const hips = Object.values(poses).map((p) => Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.max(...hips)) - 2, max: Math.ceil(Math.max(...hips)) + 2 };

const rep = F.report(ex, { butt: (W) => butt(W), lumbar: (W) => lumbarGap(W) });
const Wn = L.fk(neutral, contacts), Wt = L.fk(poses.tiltHold, contacts), pt = poses.tiltHold;
F.setKin(ex, 'Pelvic tilt', `Neutral (pelvis pitch ${F.deg(neutral.root.rot.pitch - 90)})`, `Posterior tilt ${F.deg(pt.root.rot.pitch - neutral.root.rot.pitch)} (hip flexion ${F.deg(neutral.ch.hip_r.flex)} to ${F.deg(pt.ch.hip_r.flex)})`);
F.setKin(ex, 'Lumbar curve', `Lumbar segment ${F.deg(neutral.ch.spine_l5.flex)} (small arch; low back ${lumbarGap(Wn).toFixed(1)} cm off the mat)`, `Lumbar segment ${F.deg(pt.ch.spine_l5.flex)} (flattened; ${lumbarGap(Wt).toFixed(1)} cm off the mat)`);
F.setKin(ex, 'Buttocks', `On the mat (${butt(Wn).toFixed(1)} cm)`, `Still on the mat (${butt(Wt).toFixed(1)} cm); no bridge`);
F.setKin(ex, 'Tempo', 'Neutral 0.8 s', '1.2 s tilt, 1.5 s hold, 1.3 s release');
console.log(`Pelvic Tilt: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} l5 ${neutral.ch.spine_l5.flex}->${pt.ch.spine_l5.flex} t12 ${neutral.ch.spine_t12.flex}->${pt.ch.spine_t12.flex} t6dev ${V.len(V.sub(Wt.spine_t6.p, T6)).toFixed(2)}`);
CA.guard('pelvic-tilt', rep, [rep.butt[1] > 1.5 && `buttocks lift off the mat (${rep.butt[1]} cm)`]);
