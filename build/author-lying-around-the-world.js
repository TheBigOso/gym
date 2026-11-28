// Lying Around the World (GymVisual #9012; page not readable here, movement from the name and standard coaching): supine
// on a mat, palms planted by the hips (arm contacts). Both straight legs lift together and the feet draw a big circle:
// up, out to the right, down, across to the left and back up (one circle), then the same circle the other way; the legs
// lower to the mat. The legs stay together (the right hip abducts while the left adducts) and the pelvis stays still.
// Bilateral (both directions in one loop).
const F = require('./families/b6-20');
const { L, r1 } = F;
const meta = require('./meta/lying-around-the-world.json');

const { base, HC } = F.supineHands({ kneeFlex: 0 });
const C = 44, A = 20, SIDE = 20;   // circle centre (hip flexion), up/down radius, side sweep (deg)
const LEG = { knee: 3, dorsi: -20, rot: 0 };
// Circle angle a (deg): 0 = top, 90 = right, 180 = bottom, 270 = left. Both legs keep their resting 2 cm gap.
const ADD0 = -1.5;
const at = (a) => {
  const f = C + A * Math.cos(a * Math.PI / 180), s = SIDE * Math.sin(a * Math.PI / 180);
  return F.legs(base, Object.assign({ flex: f, abd: ADD0 + s }, LEG), Object.assign({ flex: f, abd: ADD0 - s }, LEG));
};
const rest = F.legs(base, { flex: base.ch.hip_r.flex, abd: ADD0, knee: 2, dorsi: -18, rot: 0 });
const poses = { rest };
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.6, pose: 'rest' }];
const N = 8, T1 = 1.4, PER = 2.8;
for (let i = 0; i <= N; i++) { const nm = `cw${i % N}`; if (!poses[nm]) poses[nm] = at((360 * i) / N); keyframes.push({ t: +(T1 + (PER * i) / N).toFixed(3), pose: nm }); }
for (let i = 1; i <= N; i++) { const nm = `cw${(N - i) % N}`; keyframes.push({ t: +(T1 + PER + (PER * i) / N).toFixed(3), pose: nm }); }
keyframes.push({ t: 7.8, pose: 'rest' }, { t: 8.4, pose: 'rest' });
const ex = F.CA.buildModule(meta, poses, keyframes, HC);
const pk = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk) - 3, max: Math.ceil(pk) + 3 };

const rep = F.report(ex, { gap: (W) => F.legGap(W).d, heel: (W, p) => (p.ch.hip_r.flex > 15 ? Math.min(F.heelLow(W, 'r'), F.heelLow(W, 'l')) : 99), legDeg: (W) => F.CA.legFromFloor(W, 'r') });
const Wb = L.fk(poses.cw4, HC), Wt = L.fk(poses.cw0, HC), Wr = L.fk(poses.cw2, HC);
const sideDeg = (W) => Math.atan2(W.ankle_r.p[2] - W.hip_r.p[2], W.ankle_r.p[0] - W.hip_r.p[0]) * 180 / Math.PI;
F.setKin(ex, 'Leg height', 'Legs on the mat', `Circle from ${F.deg(F.CA.legFromFloor(Wb))} to ${F.deg(F.CA.legFromFloor(Wt))} above the floor (hip ${F.deg(poses.cw4.ch.hip_r.flex)}-${F.deg(poses.cw0.ch.hip_r.flex)}); heels ${Math.round(F.heelLow(Wb, 'r'))} cm off the mat at the bottom`);
F.setKin(ex, 'Side sweep', '–', `${F.deg(sideDeg(Wr))} to each side (right hip abduction ${F.deg(poses.cw2.ch.hip_r.abd)}, left hip adduction ${F.deg(-poses.cw2.ch.hip_l.abd)})`);
F.setKin(ex, 'Pelvis', 'On the mat', `Unchanged (pelvis moves ${rep.still} cm)`);
F.setKin(ex, 'Tempo', 'Rest 0.6 s, lift 0.8 s', `${PER} s per circle, one each way, lower 0.8 s`);
console.log(`Lying Around the World: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} side ${r1(sideDeg(Wr))}`);
F.CA.guard('lying-around-the-world', rep, [rep.gap[0] < -0.3 && `legs interpenetrate (${rep.gap[0]} cm)`, rep.heel[0] < 3 && `heels near the mat during the circle (${rep.heel[0]} cm)`]);
