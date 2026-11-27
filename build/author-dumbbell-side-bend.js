// Dumbbell Side Bend (GymVisual #040712). Authored on the right: standing tall, feet hip width (planted), one dumbbell in
// the right hand hanging at the side (neutral grip, palm to the thigh), left fingertips behind the head. Bend sideways toward the
// dumbbell so it slides down the outside of the right thigh, then pull the trunk back up with the left obliques and
// quadratus lumborum to just past upright. The pelvis shifts a little away from the bend; the right arm hangs straight
// down throughout. Built on the lunge family (planted feet), the core-b cradle and the batch 3 held-dumbbell helpers.
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B3 = require('./families/b3-legs');
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const meta = require('./meta/dumbbell-side-bend.json');

const F = makeFamily({ toe: 6, half: 11 });
const base = F.stand({ r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } }, { knee: 5 });
const OUT = +(process.env.OUT || 8.5);         // right wrist this far outside the shoulder (dumbbell clears the thigh)
const SPLIT = { spine_l5: 0.38, spine_t12: 0.36, spine_t6: 0.26 };
// k.lat: lateral flexion (deg, + toward the right/dumbbell side); k.shift: pelvis shift to the left (cm)
let LREF = { shoulder: { plane: -5, elev: 126, axial: -125 }, elbow: { flex: 136 }, wrist: { pron: 35, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
function key(k) {
  const s0 = clone(base); s0.root[2] = r1(-(k.shift || 0));
  let p = F.pose(F.rootY(s0, 5)); // root height re-solved so the planted legs keep their soft knees
  for (const j in SPLIT) p.ch[j] = { rot: 0, flex: 0, latFlex: r1((k.lat || 0) * SPLIT[j]) };
  // head stays roughly level with the eyes forward (neck has no side-bend channel: a small turn keeps the gaze square)
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 0 };
  // left fingertips lightly behind the head, elbow wide (core-b cradle, left side only, carried from key to key)
  const cr = CB.cradle(p, { side: 'l', elbowAnt: -4, elbowOut: 18, guess: LREF, ref: LREF }); delete cr.__cost; LREF = CB.armOf(cr, 'l');
  const left = { shoulder_l: cr.ch.shoulder_l, elbow_l: cr.ch.elbow_l, wrist_l: cr.ch.wrist_l, sc_l: cr.ch.sc_l };
  const hang = B3.armsHang(p, { out: OUT, fwd: 1, elbow: 6, elevate: -2 });
  delete hang.__armCost;
  Object.assign(hang.ch, clone(left));
  return hang;
}
const lat = (W) => { const d = V.sub(W.neck_c7.p, W.pelvis.p); return Math.atan2(d[2], d[1]) / L.R.DEG; }; // + = trunk leaning to the right (+Z is right)
const LAT = +(process.env.LAT || 36);
const poses = {
  stand: key({ lat: 0 }),
  down1: key({ lat: LAT * 0.5, shift: 1.2 }),
  bottom: key({ lat: LAT, shift: 2.5 }),
  bottomHold: key({ lat: LAT + 1, shift: 2.6 }),
  up1: key({ lat: LAT * 0.45, shift: 1.1 }),
  past: key({ lat: -6, shift: -0.5 }),
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.7, pose: 'stand' }, { t: 1.5, pose: 'down1' }, { t: 2.3, pose: 'bottom' }, { t: 2.8, pose: 'bottomHold' }, { t: 3.6, pose: 'up1' }, { t: 4.3, pose: 'past' }, { t: 4.8, pose: 'stand' }, { t: 5.4, pose: 'stand' }];
const props = (meta.props || []).filter((p) => p.kind !== 'dumbbell').concat([B3.heldProp('r', 'handle')]);
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';

const rep = CA.scan(ex, { lat: (W) => lat(W), handDrop: (W) => W.wrist_r.p[1], armVert: (W) => V.angle(V.sub(W.wrist_r.p, W.shoulder_r.p), [0, -1, 0]) });
Object.assign(rep, B3.dbLoop(ex, [{ side: 'r', grip: 'handle' }], ['thigh', 'quad', 'shank', 'calf', 'buttock', 'pelvis', 'hand_l', 'forearm_l']));
const Ws = L.fk(poses.stand, F.contacts), Wb = L.fk(poses.bottomHold, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pb = poses.bottomHold;
const latSum = (p) => p.ch.spine_l5.latFlex + p.ch.spine_t12.latFlex + p.ch.spine_t6.latFlex;
kin[0].setup = `Upright (${d(lat(Ws))})`; kin[0].peak = `${d(lat(Wb))} toward the dumbbell (pelvis to C7); spine segments ${d(latSum(pb))} (lumbar ${d(pb.ch.spine_l5.latFlex)}, thoracic ${d(pb.ch.spine_t12.latFlex + pb.ch.spine_t6.latFlex)}); back up to ${d(-lat(L.fk(poses.past, F.contacts)))} past upright`;
kin[1].setup = `Dumbbell beside the thigh, wrist ${Math.round(Ws.wrist_r.p[1])} cm above the floor`; kin[1].peak = `Slides ${Math.round(Ws.wrist_r.p[1] - Wb.wrist_r.p[1])} cm down the outside of the thigh (arm stays vertical, ${d(rep.armVert[1])} max off vertical)`;
kin[2].setup = 'Hips square, feet planted'; kin[2].peak = `Pelvis shifts ${r1(Ws.pelvis.p[2] - Wb.pelvis.p[2])} cm away from the bend; no twisting or forward lean`;
kin[3].setup = `Knees ${d(F.kneeOf(Ws, 'r'))} (soft)`; kin[3].peak = 'Unchanged';
kin[4].setup = 'Stand 0.7 s'; kin[4].peak = '1.6 s down, 0.5 s pause, 1.5 s up, 0.5 s past upright, 1.1 s reset';
console.log(`Dumbbell side bend: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
CA.guard('dumbbell-side-bend', rep, [rep.dbFloor < 0 && 'dumbbell through the floor', rep.dbClear < -0.5 && `dumbbell into the body (${JSON.stringify(rep.dbClearAt)})`]);
