// Cable Standing Side Bend (GymVisual, Cable Standing Side Bend version 3; movement reference only). Authored on the
// right: standing tall side-on to a low pulley on the right, feet hip width (planted), right hand holding a D-handle
// (cable attachment 'handle') at the side with a neutral grip, arm long; left fingertips behind the head. Bend sideways
// toward the pulley so the handle slides down the outside of the right thigh, then pull the trunk back up against the
// cable with the left obliques and quadratus lumborum to just past upright. The pelvis shifts a little away from the
// bend; the right arm hangs straight throughout. Poses from author-dumbbell-side-bend.js (lunge family planted feet,
// core-b cradle, batch 3 hanging arm); the cable runs down and out to the pulley, clear of the leg.
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B3 = require('./families/b3-legs');
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablearms');
const meta = require('./meta/cable-standing-side-bend.json');

const F = makeFamily({ toe: 6, half: 11 });
const base = F.stand({ r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } }, { knee: 5 });
const OUT = 7.5;                                // right wrist this far outside the shoulder (handle clears the thigh)
const SPLIT = { spine_l5: 0.38, spine_t12: 0.36, spine_t6: 0.26 };
let LREF = { shoulder: { plane: -5, elev: 126, axial: -125 }, elbow: { flex: 136 }, wrist: { pron: 35, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
function key(k) {
  const s0 = clone(base); s0.root[2] = r1(-(k.shift || 0));
  const p = F.pose(F.rootY(s0, 5));
  for (const j in SPLIT) p.ch[j] = { rot: 0, flex: 0, latFlex: r1((k.lat || 0) * SPLIT[j]) };
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 0 };
  const cr = CB.cradle(p, { side: 'l', elbowAnt: -4, elbowOut: 18, guess: LREF, ref: LREF }); delete cr.__cost; LREF = CB.armOf(cr, 'l');
  const left = { shoulder_l: cr.ch.shoulder_l, elbow_l: cr.ch.elbow_l, wrist_l: cr.ch.wrist_l, sc_l: cr.ch.sc_l };
  const hang = B3.armsHang(p, { out: OUT, fwd: 1, elbow: 6, elevate: -2 });
  delete hang.__armCost;
  Object.assign(hang.ch, clone(left));
  return hang;
}
const lat = (W) => { const d = V.sub(W.neck_c7.p, W.pelvis.p); return Math.atan2(d[2], d[1]) / L.R.DEG; }; // + = toward the right
const LAT = 32;
const poses = {
  stand: key({ lat: 0 }),
  down1: key({ lat: LAT * 0.5, shift: 1.2 }),
  bottom: key({ lat: LAT, shift: 2.5 }),
  bottomHold: key({ lat: LAT + 1, shift: 2.6 }),
  up1: key({ lat: LAT * 0.45, shift: 1.1 }),
  past: key({ lat: -8, shift: -0.6 }),
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.7, pose: 'stand' }, { t: 1.5, pose: 'down1' }, { t: 2.3, pose: 'bottom' }, { t: 2.8, pose: 'bottomHold' }, { t: 3.6, pose: 'up1' }, { t: 4.3, pose: 'past' }, { t: 4.8, pose: 'stand' }, { t: 5.4, pose: 'stand' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
// low pulley out to the right of the handle, a little behind its line so the cable runs down the outside of the leg
const Ws = L.fk(poses.stand, F.contacts), gs = EQ.gripPoint(Ws, 'r').p;
const ANCHOR = [r1(gs[0]), 14, r1(gs[2] + 34)];
ex.props = [EQ.cableTower(ANCHOR, { offset: [0, 12] }), { id: 'handle', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } }];

const rep = CA.scan(ex, { lat: (W) => lat(W), handDrop: (W) => W.wrist_r.p[1], armVert: (W) => V.angle(V.sub(W.wrist_r.p, W.shoulder_r.p), [0, -1, 0]) });
const crep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { side: 'r' })], lineSkip: /^(hand|thumb|forearm)_r$/ });
let hc = { d: 1e9 };
H.loopReport(ex, { probe: (W, pz, t) => { const c = B.handleClear(W); if (c.d < hc.d) hc = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; } });
C.gate('cable-standing-side-bend', crep, { minLine: 1, checkWidth: false });
C.limits(poses);
CA.guard('cable-standing-side-bend', rep, [hc.d < 0 && `handle into the body (${JSON.stringify(hc)})`]);

const Wb = L.fk(poses.bottomHold, F.contacts), pb = poses.bottomHold, d = (v) => `≈${Math.round(v)}°`, set = H.setKin(ex);
const latSum = (p) => p.ch.spine_l5.latFlex + p.ch.spine_t12.latFlex + p.ch.spine_t6.latFlex;
set('Lateral flexion', 'setup', `Upright (${d(lat(Ws))})`); set('Lateral flexion', 'peak', `${d(lat(Wb))} toward the pulley (pelvis to C7); spine segments ${d(latSum(pb))} (lumbar ${d(pb.ch.spine_l5.latFlex)}, thoracic ${d(pb.ch.spine_t12.latFlex + pb.ch.spine_t6.latFlex)}); back up to ${d(-lat(L.fk(poses.past, F.contacts)))} past upright`);
set('Handle path', 'setup', `Handle beside the thigh, wrist ${Math.round(Ws.wrist_r.p[1])} cm above the floor`); set('Handle path', 'peak', `Slides ${Math.round(Ws.wrist_r.p[1] - Wb.wrist_r.p[1])} cm down the outside of the thigh (arm stays vertical, ${d(rep.armVert[1])} max off vertical)`);
set('Cable', 'setup', `Low pulley ${Math.round(ANCHOR[2] - gs[2])} cm out to the right of the handle, ${ANCHOR[1]} cm high`); set('Cable', 'peak', `Runs down the outside of the leg, clear of the body by at least ${crep.line.d} cm`);
set('Pelvis', 'setup', 'Hips square, feet planted'); set('Pelvis', 'peak', `Pelvis shifts ${r1(Ws.pelvis.p[2] - Wb.pelvis.p[2])} cm away from the bend; no twisting or forward lean`);
set('Tempo', 'setup', 'Stand 0.7 s'); set('Tempo', 'peak', '1.6 s down, 0.5 s pause, 1.5 s up, 0.5 s past upright, 1.1 s reset');
console.log(`Cable standing side bend: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  cable ${JSON.stringify(crep)}\n  handleClear ${JSON.stringify(hc)} anchor ${ANCHOR}`);
