// Weighted Full Squat from Deficit (GymVisual; movement reference only, the page could not be read): full-depth squat standing
// with one foot on each of two 20 cm boxes, loaded by a dip belt whose chains hold a plate between the legs (held item kind
// 'sled', item 'dip_belt', mounted between the hip joints so it hangs upright; src/gear/g3lower-sled.js). The leg and trunk
// motion is the authored barbell full squat (feet a little wider than the hips, toes out, hip crease below the knees),
// resampled densely and raised onto the boxes; the arms reach forward at shoulder height for balance (solved per key). The
// chain length puts the plate 6 cm above the floor at the bottom, between the boxes. Bilateral. Family gear-g3lower.js.
const L = require('./lib');
const { V, R, r1, clone } = L;
const G = require('./families/gear-g3lower');
const H = require('./families/hips');
const EQ = require('./families/equip');
const meta = require('./meta/weighted-full-squat-from-deficit.json');

const BOX = 20, PLATE_D = 30, CLEAR_FLOOR = 6;
const base = G.fromBase('barbell-full-squat'), contacts = base.contacts;
const { poses, keyframes } = G.resample(base, 0.1);
let hipLow = 1e9, prev = null;
for (const k of keyframes) {
  let p = poses[k.pose];
  p.root.pos[1] = +(p.root.pos[1] + BOX).toFixed(2);
  for (const id in p.ik) p.ik[id].target[1] = +(p.ik[id].target[1] + BOX).toFixed(2);
  // arms forward at shoulder height (counterbalance), each key started from the previous one
  const W = L.fk(p, contacts), S = W.shoulder_r.p;
  p.ch.sc_r = { protract: 8, elevate: 2 }; p.ch.sc_l = clone(p.ch.sc_r);
  const tgt = [S[0] + L.reach(6) * 0.99, S[1] - 2, S[2] - 2];
  p = L.armToTarget(p, tgt, { flex: 6, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess: prev ? [prev.ch.shoulder_r.plane, prev.ch.shoulder_r.elev, prev.ch.shoulder_r.axial] : [90, 90, 0] });
  for (const j of ['shoulder', 'elbow', 'wrist']) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]);
  const W2 = L.fk(p, contacts); hipLow = Math.min(hipLow, (W2.hip_r.p[1] + W2.hip_l.p[1]) / 2);
  poses[k.pose] = G.round(p); prev = p;
}
const DROP = Math.floor(hipLow - PLATE_D / 2 - CLEAR_FLOOR);
const ex = G.attachMeta(clone(base), meta); ex.poses = poses; ex.keyframes = keyframes;
const W0 = L.fk(poses[keyframes[0].pose], contacts);
const boxes = ['r', 'l'].map((s) => { const a = W0[`ankle_${s}`].p, t = W0[`toe_${s}`].p; return { id: `box_${s}`, kind: 'box', center: [r1((a[0] + t[0]) / 2 - 1), 0, r1((a[2] + t[2]) / 2)], size: [34, BOX, 22] }; });
ex.props = [...boxes, { id: 'dipbelt', kind: 'sled', params: { item: 'dip_belt', plateD: PLATE_D, drop: DROP }, attach: { joint: 'hip_r', with: 'hip_l', offset: [0, 0, 0] } }];
G.kinFromBase(ex, base);
// loop: plate (disc in the sagittal plane under the hips' midpoint) vs the body, the boxes and the floor
const BODY = G.BODY.filter((id) => !/^(hand|thumb)_/.test(id));
let plate = { d: 1e9 }, plateFloor = 1e9, boxGap = 1e9;
const rep = H.loopReport(ex, { planted: ex.checks.plantedContacts, probe: (W, pz, t) => {
  const c = V.add(V.scale(V.add(W.hip_r.p, W.hip_l.p), 0.5), [0, -DROP, 0]); plateFloor = Math.min(plateFloor, c[1] - PLATE_D / 2);
  for (const b of boxes) boxGap = Math.min(boxGap, Math.abs(b.center[2]) - b.size[2] / 2 - 2);
  if (Math.round(t * 100) % 10) return;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI, p = V.add(c, [Math.cos(a) * PLATE_D / 2, Math.sin(a) * PLATE_D / 2, 0]); for (const id of BODY) { const d = EQ.pointShape(W, p, id) - 2; if (d < plate.d) plate = { d: +d.toFixed(2), id, t: +t.toFixed(2) }; } }
} });
const set = H.setKin(ex);
set('Deficit and belt', 'setup', `Feet on two ${BOX} cm boxes; plate (${PLATE_D} cm) ${DROP} cm below the hip joints`); set('Deficit and belt', 'peak', `Plate ${r1(plateFloor)} cm above the floor at the bottom, between the boxes (${r1(boxGap)} cm to spare each side)`);
set('Knee flexion', 'setup', ex.exercise.kinematics.find((k) => k.measure === 'Knee flexion').setup || '–');
console.log(`Weighted Full Squat from Deficit: wrote ${L.write(ex)}\n  ${JSON.stringify({ DROP, plate, plateFloor: r1(plateFloor), boxGap: r1(boxGap), floor: rep.floor, slide: rep.slide, knee: rep.kneeR })}`);
if (plateFloor < 2) { console.error('FAIL: plate reaches the floor'); process.exitCode = 1; }
if (plate.d < -0.5) { console.error('FAIL: plate through the legs'); process.exitCode = 1; }
