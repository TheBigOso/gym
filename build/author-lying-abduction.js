// Lying Abduction (GymVisual #24135; page not readable here, movement from the name and standard coaching): supine on a
// mat, palms planted by the hips (arm contacts), both straight legs raised to about vertical. The legs open out to the
// sides into a wide V, pause, and squeeze back together over the hips; two reps per loop. The pelvis and trunk stay
// still. Bilateral and symmetric.
const F = require('./families/b6-20');
const { L, r1 } = F;
const meta = require('./meta/lying-abduction.json');

const { base, HC } = F.supineHands({ kneeFlex: 0 });
const UP = 84, ABD = 34;           // legs nearly vertical (soft hamstrings), each leg opens about 34 degrees
const LEG = { knee: 3, dorsi: -8, rot: 0 };
const at = (abd, flex = UP) => F.legs(base, Object.assign({ flex, abd }, LEG));
const poses = { up: at(-2), open: at(ABD, UP - 2), openHold: at(ABD + 2, UP - 2), mid: at(ABD * 0.5, UP - 1) };
const keyframes = [{ t: 0, pose: 'up' }, { t: 0.6, pose: 'up' }, { t: 1.8, pose: 'open' }, { t: 2.3, pose: 'openHold' }, { t: 3.6, pose: 'up' }, { t: 4.0, pose: 'up' },
  { t: 5.2, pose: 'open' }, { t: 5.7, pose: 'openHold' }, { t: 7.0, pose: 'up' }, { t: 8.0, pose: 'up' }];
delete poses.mid;
const ex = F.CA.buildModule(meta, poses, keyframes, HC);
const pk = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk) - 3, max: Math.ceil(pk) + 3 };

const rep = F.report(ex, { gap: (W) => F.legGap(W).d, heel: (W) => Math.min(F.heelLow(W, 'r'), F.heelLow(W, 'l')) });
const Wu = L.fk(poses.up, HC), Wo = L.fk(poses.openHold, HC);
const vee = (W) => { const a = F.V.sub(W.ankle_r.p, W.hip_r.p), b = F.V.sub(W.ankle_l.p, W.hip_l.p); return F.V.angle(a, b); };
F.setKin(ex, 'Hip abduction', `Legs together (${F.deg(poses.up.ch.hip_r.abd)})`, `${F.deg(poses.openHold.ch.hip_r.abd)} per leg; ${F.deg(vee(Wo))} between the legs`);
F.setKin(ex, 'Hip flexion', F.deg(poses.up.ch.hip_r.flex), `${F.deg(poses.openHold.ch.hip_r.flex)} (legs stay about vertical)`);
F.setKin(ex, 'Pelvis', 'On the mat', `Unchanged (pelvis moves ${rep.still} cm)`);
F.setKin(ex, 'Tempo', 'Legs up 0.6 s', '1.2 s open, 0.5 s pause, 1.3 s close; two reps in 8 s');
console.log(`Lying Abduction: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} vee ${r1(vee(Wo))} legGap(up) ${JSON.stringify(F.legGap(Wu))}`);
F.CA.guard('lying-abduction', rep, [rep.gap[0] < -0.3 && `legs interpenetrate (${rep.gap[0]} cm)`]);
