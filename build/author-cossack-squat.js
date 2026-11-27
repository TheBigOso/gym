// Cossack Squat (GymVisual #463212): bodyweight, very wide stance (ankle centres 92 cm), toes out 20 degrees, arms reaching
// forward. Sit down over the right foot (right knee about 105, heel down; the pelvis tilts 18 degrees down toward it and the
// lumbar spine side-bends back, which keeps the straight hip inside the rig's 45-degree abduction) while the left leg
// straightens and its foot pivots up onto
// the heel (toes up 35 degrees), pause, rise through the middle as the left foot rolls back down flat; then the same to the
// left. Both sides in one loop (bilateral): the left-side keys are exact mirrors of the right-side keys.
// Feet: flat contacts (leg_r/l) or heel contacts (heel_r/l, toes up) with constant targets; while a foot pivots, a third
// contact (pivot_r/l) carries it with a per-key foot orientation and the ankle target that keeps the heel point fixed
// (build/families/b4-squats2.js heelPivot); it hands over exactly to the flat and heel contacts at 0 and 35 degrees.
const L = require('./lib');
const { R, V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const H = require('./families/hips');
const K = require('./families/b4-squats2');
const { com } = require('./families/single');
const meta = require('./meta/cossack-squat.json');

const HALF = +(process.env.HALF || 46), TOE = 20, UP = 35;
const F = makeFamily({ toe: TOE, half: HALF });
const FLAT = { r: [0, L.ANKLE_H, HALF], l: [0, L.ANKLE_H, -HALF] };
const HEEL = { r: K.heelPivot(FLAT.r, UP, -TOE), l: K.heelPivot(FLAT.l, UP, TOE) };
const heelC = { r: K.heelContact('r', UP, -TOE), l: K.heelContact('l', UP, TOE) };
const legC = (s) => F.contacts.find((c) => c.id === `leg_${s}`);
const pivC = { r: K.heelContact('r', 0, -TOE, 'pivot_r'), l: K.heelContact('l', 0, TOE, 'pivot_l') };
const contacts = [...F.contacts, heelC.r, heelC.l, pivC.r, pivC.l];
const knee = (W, s) => F.kneeOf(W, s);

// Right-side key: root, pitch, the left foot's toes-up angle (0 = flat contact; UP = heel contact; between = pivoting)
function key(root, pitch, up, opt = {}) {
  const spine = { l5: -3, t12: -2, t6: 1 };
  const roll = opt.roll || 0; // pelvis tilts down toward the bent leg; the lumbar spine side-bends back so the trunk stays upright
  let p = F.build({ root, pitch, spine, rot: roll ? { roll } : undefined, feet: { r: { c: 'flat', x: 0, z: HALF }, l: { c: 'flat', x: 0, z: -HALF } } });
  delete p.ik.__fit;
  if (roll) { p.ch.spine_l5.latFlex = r1(-roll * 0.65); p.ch.spine_t12.latFlex = r1(-roll * 0.45); }
  p = F.armsForward(p);
  const u = Math.max(0, Math.min(UP, up)), piv = K.heelPivot(FLAT.l, u, TOE), rotL = K.qArr(K.footQ(-u, TOE));
  p.ik.heel_r = { target: HEEL.r.slice(), weight: 0 }; p.ik.heel_l = { target: HEEL.l.slice(), weight: 0 };
  p.ik.pivot_r = { target: FLAT.r.slice(), weight: 0, handRot: K.qArr(K.footQ(0, -TOE)) };
  p.ik.pivot_l = { target: piv, weight: 0, handRot: rotL };
  p = H.fitLeg(p, 'r', legC('r'), FLAT.r, { rot: 0 });
  if (up < 0 || (up === 0 && !opt.pivot)) p = H.fitLeg(p, 'l', legC('l'), FLAT.l, { rot: 0 });       // flat foot planted
  else if (up >= UP && !opt.pivot) { p.ik.leg_l.weight = 0; p.ik.heel_l.weight = 1; p = H.fitLeg(p, 'l', heelC.l, HEEL.l, { rot: 0 }); } // on the heel
  else { p.ik.leg_l.weight = 0; p.ik.pivot_l.weight = 1; p = H.fitLeg(p, 'l', K.heelContact('l', u, TOE, 'pivot_l'), piv, { rot: 0 }); } // pivoting
  // hand-over keys: the flat or heel contact stays at full weight beside the (identical) pivot contact, so the weights can
  // ramp without ever blending with the fitted channels (the rig ankle has no foot roll, so FK cannot match the IK foot)
  if (opt.pivot && u === 0) p.ik.leg_l.weight = 1;
  if (opt.pivot && u === UP && opt.both) p.ik.heel_l.weight = 1;
  for (const j in p.ch) for (const c in p.ch[j]) if (typeof p.ch[j][c] === 'number') p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  return p;
}
const W = (p) => L.fk(p, contacts);
// centre: both knees soft (about 18 degrees), centre of mass over the middle
const centreY = (() => { let a = 60, b = 100; for (let i = 0; i < 40; i++) { const y = (a + b) / 2; if (knee(W(key([-2, y, 0], -6, 0)), 'r') > 18) a = y; else b = y; } return r1((a + b) / 2); })();
const CENTRE = { root: [-2, centreY, 0], pitch: -6 };
// bottom (right): right knee about 110 (the rig ankle allows 35 degrees of dorsiflexion with the heel down), left leg
// straight on its heel (hip to heel at full leg length), centre of mass over the middle of the right foot front to back
const KB = +(process.env.KB || 105), PITCH_B = +(process.env.PB || -38), ROLL = +(process.env.ROLL || 18);
const bottom = (() => {
  const res = (x) => { const Wb = W(key([x[0], x[1], x[2]], PITCH_B, UP, { roll: ROLL })); const c = com(Wb); return [(knee(Wb, 'r') - KB) * 0.5, (L.V.len(L.V.sub(Wb.hip_l.p, HEEL.l)) - +(process.env.REACH || 83.2)) * 0.8, (c[0] - 3) * 0.6]; };
  const x = R.solveLM([-12, 50, 25], res, { iters: 200 }).x.map(r1);
  return { root: x, pitch: PITCH_B };
})();
// depth f (0 = centre, 1 = bottom): root and pitch interpolated; the left foot starts to pivot at f = 0.45 and is on its
// heel by f = 0.85
const upAt = (f) => r1(Math.max(0, Math.min(UP, (f - 0.45) / 0.4 * UP)));
const at = (f, opt = {}) => key(CENTRE.root.map((v, i) => r1(v + (bottom.root[i] - v) * f)), r1(CENTRE.pitch + (bottom.pitch - CENTRE.pitch) * f), upAt(f), Object.assign({ roll: r1(ROLL * f) }, opt));
// r45/r85: the hand-over keys (flat or heel contact still planted); r50..r80: pivoting (pivot contact, every 6-8 degrees)
const poses = { centre: at(0), r25: at(0.25), r45: at(0.45), r45p: at(0.45, { pivot: true }), r50: at(0.5, { pivot: true }), r58: at(0.58, { pivot: true }), r66: at(0.66, { pivot: true }), r74: at(0.74, { pivot: true }), r80: at(0.8, { pivot: true }), r85p: at(0.85, { pivot: true }), r85: at(0.85, { pivot: true, both: true }), bottomR: at(1) };
poses.bottomR = key(bottom.root, bottom.pitch, UP, { roll: ROLL });
poses.settleR = key([bottom.root[0], r1(bottom.root[1] - 0.3), bottom.root[2]], bottom.pitch, UP, { roll: ROLL });
for (const k of ['r25', 'r45', 'r45p', 'r50', 'r58', 'r66', 'r74', 'r80', 'r85p', 'r85', 'bottomR', 'settleR']) poses[k.replace(/^r(\d)/, 'l$1').replace('R', 'L')] = K.mirrorPose(poses[k]);
// one side: down (1.6 s), bottom hold (0.4 s), up (1.4 s); the foot hand-overs sit at the r45 and r85 keys
const DOWN = [['25', 0.35], ['45', 0.62], ['45p', 0.66], ['50', 0.72], ['58', 0.84], ['66', 0.96], ['74', 1.08], ['80', 1.18], ['85p', 1.26], ['85', 1.34]];
const side = (s, t0) => {
  const B = s === 'r' ? 'bottomR' : 'bottomL', St = s === 'r' ? 'settleR' : 'settleL';
  const dn = DOWN.map(([n, dt]) => ({ t: r1(t0 + dt * 100) / 100 * 1, pose: `${s}${n}` }));
  dn.forEach((k, i) => { k.t = +(t0 + DOWN[i][1]).toFixed(2); });
  const up = DOWN.slice().reverse().map(([n, dt]) => ({ t: +(t0 + 2.0 + (1.6 - dt) * (1.4 / 1.6)).toFixed(2), pose: `${s}${n}` }));
  return [...dn, { t: +(t0 + 1.6).toFixed(2), pose: B }, { t: +(t0 + 1.8).toFixed(2), pose: St }, { t: +(t0 + 2.0).toFixed(2), pose: B }, ...up];
};
const keyframes = [{ t: 0, pose: 'centre' }, { t: 0.8, pose: 'centre' }, ...side('r', 0.8), { t: 4.2, pose: 'centre' }, ...side('l', 4.2), { t: 7.6, pose: 'centre' }, { t: 8.0, pose: 'centre' }];
const ex = H.module_(meta, contacts, poses, keyframes);
// heel check: the pivoting foot's heel point stays put (it is the pivot) and the foot stays on the floor
const heelPt = (Wx, s) => V.add(Wx[`ankle_${s}`].p, L.Q.rot(Wx[`ankle_${s}`].q, K.HEEL_PT));
const H0 = { r: V.add(FLAT.r, K.HEEL_PT.map((v, i) => L.Q.rot(K.footQ(0, -TOE), K.HEEL_PT)[i])), l: V.add(FLAT.l, L.Q.rot(K.footQ(0, TOE), K.HEEL_PT)) };
H0.r = V.add(FLAT.r, L.Q.rot(K.footQ(0, -TOE), K.HEEL_PT));
let heelSlide = 0, heelLift = 0;
const rep = K.scan(ex, { planted: ['leg_r', 'leg_l', 'heel_r', 'heel_l'], probe: (Wx) => {
  for (const s of ['r', 'l']) { const d = V.len(V.sub(heelPt(Wx, s), H0[s])); if (d < 4) { heelSlide = Math.max(heelSlide, d); heelLift = Math.max(heelLift, H.bottomOf(Wx, `foot_${s}`)); } else heelSlide = Math.max(heelSlide, d); }
} });
const Wc = W(poses.centre), Wb = W(poses.bottomR);
const dorsi = (Wx, s) => H.dorsiOf(Wx, s);
const set = H.setKin(ex);
set('Stance width', 'setup', `${2 * HALF} cm (≈${(2 * HALF / 36.8).toFixed(1)}x the rig's shoulder width, about one leg length), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Bent knee flexion', 'setup', `≈${Math.round(knee(Wc, 'r'))}°`); set('Bent knee flexion', 'peak', `≈${Math.round(knee(Wb, 'r'))}° (hip ${Math.round(poses.bottomR.ch.hip_r.flex)}°)`);
set('Straight leg', 'setup', `knee ≈${Math.round(knee(Wc, 'l'))}°`); set('Straight leg', 'peak', `knee ≈${Math.round(knee(Wb, 'l'))}°, foot pivoted ${UP}° toes up on the heel`);
set('Bent-side ankle', 'setup', `≈${Math.round(dorsi(Wc, 'r'))}°`); set('Bent-side ankle', 'peak', `≈${Math.round(dorsi(Wb, 'r'))}° dorsiflexion, heel down`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Wc))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}° forward`);
set('Tempo', 'setup', 'Centre 0.8 s'); set('Tempo', 'peak', 'Per side: 1.6 s down, 0.4 s pause, 1.4 s back to the middle');
console.log(`Cossack Squat: centre ${JSON.stringify(CENTRE)} bottom ${JSON.stringify(bottom)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  heel pivot drift ${r1(heelSlide)} cm, foot lift while pivoting ${r1(heelLift)} cm, com bottom ${com(Wb).map(Math.round)}`);
K.gate('cossack-squat', rep, { maxJump: 8 });
