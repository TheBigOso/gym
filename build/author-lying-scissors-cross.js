// Lying Scissors Cross (GymVisual #15532; page not readable here, movement from the name and standard coaching): supine
// on a mat, palms planted by the hips (arm contacts). Both straight legs lift a little off the mat, open out to the sides,
// then cross at the shins, the right leg passing over the left; open again, then the left crosses over the right, and so
// on (horizontal scissors). The upper leg of each cross rides a little higher so the legs pass without touching. The
// pelvis stays still. Bilateral, alternating.
const F = require('./families/b6-20');
const { L, r1 } = F;
const meta = require('./meta/lying-scissors-cross.json');

const { base, HC } = F.supineHands({ kneeFlex: 0 });
const H = 24, OPEN = 16, CROSS = -9, OVER = 9;   // hip flexion of the lifted legs, opening, crossing adduction, over-leg lift
const LEG = { knee: 3, dorsi: -28, rot: 0 };
const two = (r, l) => F.legs(base, Object.assign({}, LEG, r), Object.assign({}, LEG, l));
const poses = {
  rest: F.legs(base, { flex: base.ch.hip_r.flex, abd: -1.5, knee: 2, dorsi: -18, rot: 0 }),
  lift: two({ flex: H, abd: -1 }, { flex: H, abd: -1 }),
  open: two({ flex: H, abd: OPEN }, { flex: H, abd: OPEN }),
  crossR: two({ flex: H + OVER, abd: CROSS }, { flex: H - OVER * 0.6, abd: CROSS }),   // right over left
  crossL: two({ flex: H - OVER * 0.6, abd: CROSS }, { flex: H + OVER, abd: CROSS }),   // left over right
};
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.6, pose: 'rest' }, { t: 1.2, pose: 'lift' }];
['open', 'crossR', 'open', 'crossL', 'open', 'crossR', 'open', 'crossL', 'open'].forEach((p, i) => keyframes.push({ t: +(1.6 + 0.4 * i).toFixed(2), pose: p }));
keyframes.push({ t: 5.2, pose: 'lift' }, { t: 6.0, pose: 'rest' }, { t: 6.6, pose: 'rest' });
const ex = F.CA.buildModule(meta, poses, keyframes, HC);
const pk = Math.max(...Object.values(poses).map((p) => Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex)));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk) - 3, max: Math.ceil(pk) + 3 };

// leg gap only while the legs are lifted (resting legs lie side by side)
const rep = F.report(ex, { gap: (W, p) => (p.ch.hip_r.flex > H - 6 ? F.legGap(W).d : 99), heel: (W, p) => (p.ch.hip_r.flex > H - 6 ? Math.min(F.heelLow(W, 'r'), F.heelLow(W, 'l')) : 99), ankleZ: (W) => W.ankle_r.p[2] });
const Wc = L.fk(poses.crossR, HC), Wo = L.fk(poses.open, HC);
F.setKin(ex, 'Leg height', 'Legs on the mat', `Legs ${F.deg(F.CA.legFromFloor(L.fk(poses.lift, HC)))} off the floor (hip ${F.deg(H)}); heels ${Math.round(F.heelLow(L.fk(poses.lift, HC), 'r'))} cm up`);
F.setKin(ex, 'Opening and cross', '–', `Open ${F.deg(OPEN)} per leg (ankles ${Math.round(Wo.ankle_r.p[2] - Wo.ankle_l.p[2])} cm apart); cross ${F.deg(-CROSS)} past the midline, ankles crossed by ${Math.round(Wc.ankle_l.p[2] - Wc.ankle_r.p[2])} cm, upper leg ${Math.round(Wc.ankle_r.p[1] - Wc.ankle_l.p[1])} cm higher`);
F.setKin(ex, 'Pelvis', 'On the mat', `Unchanged (pelvis moves ${rep.still} cm)`);
F.setKin(ex, 'Tempo', 'Rest 0.6 s, lift 0.6 s', '0.4 s per open or cross (four crosses in 4 s), lower 0.8 s');
console.log(`Lying Scissors Cross: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} gap(crossR) ${JSON.stringify(F.legGap(Wc))}`);
F.CA.guard('lying-scissors-cross', rep, [rep.gap[0] < -0.3 && `legs interpenetrate (${rep.gap[0]} cm)`, rep.heel[0] < 3 && `heels near the mat (${rep.heel[0]} cm)`]);
