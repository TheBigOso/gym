// Dumbbell Seated Side Bend (GymVisual "Dumbbell Seated Side Bend (male)"; movement reference only). Authored on the right:
// seated tall on the end of a flat bench (no back support), thighs on the seat, feet flat a little wider than the hips
// (planted). One dumbbell in the right hand hangs straight down beside the bench (neutral grip, palm in), left fingertips
// lightly behind the head. Bend straight sideways toward the dumbbell (the pelvis stays square and still on the seat, so the
// bend comes from the lumbar and thoracic spine only), pause, then pull the trunk back up with the left obliques and
// quadratus lumborum to just past upright. Built on the seated bench-end base (b4-shoulders2), the core-b cradle and the
// batch 3 held-dumbbell helpers.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const S = require('./families/b4-shoulders2');
const B3 = require('./families/b3-legs');
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const meta = require('./meta/dumbbell-seated-side-bend.json');

const base = S.benchEnd({ footAhead: -8 });
const OUT = +(process.env.OUT || 10);          // right wrist this far outside the shoulder: the dumbbell hangs clear of the bench and thigh
const LAT = +(process.env.LAT || 38);         // peak lateral flexion of the spine segments (sum), toward the dumbbell
const SPLIT = { spine_l5: 0.4, spine_t12: 0.35, spine_t6: 0.25 };
let LREF = { shoulder: { plane: -5, elev: 126, axial: -125 }, elbow: { flex: 136 }, wrist: { pron: 35, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
function key(lat) {
  const p = clone(base.pose);
  for (const j in SPLIT) p.ch[j] = { rot: 0, flex: j === 'spine_t6' ? 2 : j === 'spine_l5' ? -2 : 0, latFlex: r1(lat * SPLIT[j]) };
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 0 };
  const cr = CB.cradle(p, { side: 'l', elbowAnt: -4, elbowOut: 18, guess: LREF, ref: LREF }); delete cr.__cost; LREF = CB.armOf(cr, 'l');
  const left = { shoulder_l: cr.ch.shoulder_l, elbow_l: cr.ch.elbow_l, wrist_l: cr.ch.wrist_l, sc_l: cr.ch.sc_l };
  const hang = B3.armsHang(p, { out: OUT, fwd: 1, elbow: 6, elevate: -2 });
  delete hang.__armCost;
  Object.assign(hang.ch, clone(left));
  return hang;
}
const lat = (W) => { const d = V.sub(W.neck_c7.p, W.pelvis.p); return Math.atan2(d[2], d[1]) / L.R.DEG; }; // + = toward the right (+Z)
const poses = {
  sit: key(0), down1: key(LAT * 0.5), bottom: key(LAT), bottomHold: key(LAT + 1), up1: key(LAT * 0.45), past: key(-6),
};
const keyframes = [{ t: 0, pose: 'sit' }, { t: 0.7, pose: 'sit' }, { t: 1.5, pose: 'down1' }, { t: 2.3, pose: 'bottom' }, { t: 2.8, pose: 'bottomHold' }, { t: 3.6, pose: 'up1' }, { t: 4.3, pose: 'past' }, { t: 4.8, pose: 'sit' }, { t: 5.4, pose: 'sit' }];
const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.bench.prop, B3.heldProp('r', 'handle')];
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';

const box = { center: base.bench.prop.center, size: base.bench.prop.size };
const rep = CA.scan(ex, { lat: (W) => lat(W), trunk: (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]), armVert: (W) => V.angle(V.sub(W.wrist_r.p, W.shoulder_r.p), [0, -1, 0]) });
Object.assign(rep, B3.dbLoop(ex, [{ side: 'r', grip: 'handle' }], ['thigh', 'quad', 'shank', 'calf', 'buttock', 'pelvis', 'hand_l', 'forearm_l'], { box }));
const seat = H.bottomOf(L.fk(poses.sit, base.contacts), 'buttock_r') - base.bench.top;
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(rep.trunk[1] - 4), max: Math.ceil(rep.trunk[1] + 4) };
const Ws = L.fk(poses.sit, base.contacts), Wb = L.fk(poses.bottomHold, base.contacts), d = (v) => `≈${Math.round(v)}°`, pb = poses.bottomHold;
const latSum = (p) => p.ch.spine_l5.latFlex + p.ch.spine_t12.latFlex + p.ch.spine_t6.latFlex;
const set = H.setKin(ex);
set('Lateral flexion', 'setup', `Upright (${d(lat(Ws))})`); set('Lateral flexion', 'peak', `${d(lat(Wb))} toward the dumbbell (pelvis to C7); spine segments ${d(latSum(pb))} (lumbar ${d(pb.ch.spine_l5.latFlex)}, thoracic ${d(pb.ch.spine_t12.latFlex + pb.ch.spine_t6.latFlex)}); back up to ${d(-lat(L.fk(poses.past, base.contacts)))} past upright`);
set('Dumbbell path', 'setup', `Hanging beside the bench, wrist ${Math.round(Ws.wrist_r.p[1])} cm above the floor`); set('Dumbbell path', 'peak', `Drops ${Math.round(Ws.wrist_r.p[1] - Wb.wrist_r.p[1])} cm straight down beside the bench (arm ${d(rep.armVert[1])} max off vertical; ${rep.dbFloor} cm above the floor, ${rep.dbBox} cm from the bench at the closest)`);
set('Pelvis', 'setup', `Square on the bench end, seat 45 cm, knees ${d(H.kneeOf(Ws, 'r'))}`); set('Pelvis', 'peak', `Unchanged (pelvis moves ${rep.still} cm); no twisting or forward lean`);
set('Tempo', 'setup', 'Sit 0.7 s'); set('Tempo', 'peak', '1.6 s down, 0.5 s pause, 1.5 s up, 0.5 s past upright, 1.1 s reset');
console.log(`Dumbbell Seated Side Bend: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} seatGap ${r1(seat)}`);
CA.guard('dumbbell-seated-side-bend', rep, [rep.dbFloor < 0 && 'dumbbell through the floor', rep.dbClear < -0.5 && `dumbbell into the body (${JSON.stringify(rep.dbClearAt)})`, rep.dbBox < 0.5 && `dumbbell into the bench (${rep.dbBox})`]);
