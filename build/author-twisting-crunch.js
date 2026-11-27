// Twisting Crunch (GymVisual #462012). Bilateral, alternating: supine on a mat, knees bent about 90 degrees with the feet
// flat (planted), fingertips behind the head with the elbows wide. Curl up and rotate the upper trunk so the right
// shoulder travels toward the left knee, squeeze, lower; repeat to the other side. The low back and pelvis stay down;
// the rotation comes from the thoracic spine. Lying base calibrated to the athlete mesh.
const L = require('./lib');
const { V, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const M = require('./families/b4-core2');
const meta = require('./meta/twisting-crunch.json');

const lie0 = M.lie({ kneeFlex: 90, headRest: 'hands' });
const F = CA.plantFeet(lie0, 90);
const lie = F.pose, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const SPLIT = { spine_l5: 0.08, spine_t12: 0.46, spine_t6: 0.46 };
// k: curl (segment flexion added), rot (+ = upper trunk turns toward the left knee, right shoulder forward), neck flexion
function key(k, ref) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  for (const j of Object.keys(SPLIT)) Object.assign(p.ch[j], { rot: r1(-(k.rot || 0) * SPLIT[j]), latFlex: r1(-(k.lat || 0) * (j === 'spine_l5' ? 0 : 0.5)) });
  CB.neck(p, k.neck == null ? NECK0 : k.neck, -(k.rot || 0) * 0.35);
  let q = p;
  for (const s of ['r', 'l']) {
    const g = ref ? ref[s] : null;
    q = CB.cradle(q, { side: s, floor: k.floor ? 0.2 : 1.0, elbowAnt: -3, elbowOut: 18, guess: g, ref: g });
    delete q.__cost;
  }
  return q;
}
const lieKey = { l5: 0, t12: 0, t6: 0, neck: null, floor: true };
// arm branch seeded on the lying pose (symmetric guess), then carried through the keys
let best = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  const p = CB.cradle(clone(lie), { floor: 0.2, guess: g }); if (!best || p.__cost < best.__cost) best = p;
}
const REF0 = { r: CB.armOf(best, 'r'), l: CB.armOf(best, 'r') };
const arms = (p) => ({ r: CB.armOf(p, 'r'), l: CB.armOf(p, 'l') });
const poses = { lie: key(lieKey, REF0) };
const R1 = key({ l5: 1, t12: 9, t6: 11, rot: 14, neck: 22 }, arms(poses.lie));
const R2 = key({ l5: 2, t12: 21, t6: 17, rot: 30, lat: 4, neck: 26 }, arms(R1));
const R3 = key({ l5: 2.5, t12: 22, t6: 17.5, rot: 32, lat: 4.5, neck: 26 }, arms(R2));
const R4 = key({ l5: 0.5, t12: 5, t6: 6, rot: 10, neck: 18 }, arms(R3));
Object.assign(poses, { upR: R1, twistR: R2, holdR: R3, downR: R4, upL: CB.mirror(R1), twistL: CB.mirror(R2), holdL: CB.mirror(R3), downL: CB.mirror(R4) });
for (const n of ['upL', 'twistL', 'holdL', 'downL']) delete poses[n].__cost;
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.6, pose: 'lie' }, { t: 1.0, pose: 'upR' }, { t: 1.6, pose: 'twistR' }, { t: 2.0, pose: 'holdR' }, { t: 2.9, pose: 'downR' }, { t: 3.4, pose: 'lie' }, { t: 3.9, pose: 'lie' },
  { t: 4.3, pose: 'upL' }, { t: 4.9, pose: 'twistL' }, { t: 5.3, pose: 'holdL' }, { t: 6.2, pose: 'downL' }, { t: 6.7, pose: 'lie' }, { t: 7.2, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, F.contacts);

const rotOf = (p) => p.ch.spine_l5.rot + p.ch.spine_t12.rot + p.ch.spine_t6.rot;
const shR = (W) => W.shoulder_r.p[1] - W.shoulder_l.p[1];
const rep = CA.scan(ex, { upper: (W) => CA.upperFromFloor(W), lowBack: (W) => CA.minOf(W, ['buttock_r', 'buttock_l', 'pelvis']), shoulderTilt: shR, elbowGap: (W) => V.len(V.sub(W.elbow_r.p, W.knee_l.p)) });
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.holdR, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.holdR;
kin[0].setup = d(CA.upperFromFloor(Wl)); kin[0].peak = `${d(CA.upperFromFloor(Wt))} (C7 up ${r1(Wt.neck_c7.p[1] - Wl.neck_c7.p[1])} cm)`;
kin[1].setup = 'Facing the ceiling'; kin[1].peak = `${d(Math.abs(rotOf(pk)))} toward the opposite knee (lumbar ${d(Math.abs(pk.ch.spine_l5.rot))}, thoracic ${d(Math.abs(pk.ch.spine_t12.rot + pk.ch.spine_t6.rot))}); working shoulder ${r1(shR(Wt))} cm higher than the other`;
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (+${Math.round(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex - lie.ch.spine_t12.flex - lie.ch.spine_t6.flex)}°)`;
kin[3].setup = `Hip ${d(lie.ch.hip_r.flex)}, knee ${d(CA.kneeOf(Wl, 'r'))}`; kin[3].peak = 'Unchanged (pelvis and feet still)';
kin[4].setup = 'Fingertips behind the head, elbows wide'; kin[4].peak = `Elbow ${Math.round(V.len(V.sub(Wt.elbow_r.p, Wt.knee_l.p)))} cm from the opposite knee (reaching toward it, not touching)`;
kin[5].setup = 'Rest 0.6 s'; kin[5].peak = '1.0 s up and turn, 0.4 s squeeze, 1.4 s down, 0.5 s rest per side; 7.2 s loop';
console.log(`Twisting crunch: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
for (const n of ['lie', 'upR', 'twistR', 'holdR', 'downR']) { const p = poses[n], W = L.fk(p, F.contacts); console.log(`  ${n.padEnd(7)} spine=${JSON.stringify([p.ch.spine_l5, p.ch.spine_t12, p.ch.spine_t6].map((c) => [c.flex, c.rot, c.latFlex]))} upper=${CA.upperFromFloor(W).toFixed(1)} shTilt=${shR(W).toFixed(1)} shX=${W.shoulder_r.p[0].toFixed(1)}/${W.shoulder_l.p[0].toFixed(1)} R=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} L=${p.ch.shoulder_l.plane}/${p.ch.shoulder_l.elev}/${p.ch.shoulder_l.axial}`); }
M.guard('twisting-crunch', ex, rep, [shR(Wt) < 4 && 'working shoulder barely turns up', rep.lowBack[1] - rep.lowBack[0] > 1.5 && 'low back lifts']);
