// Band Bicycle Crunch (GymVisual 9443, movement reference only; the page could not be read, so the band set-up could not be
// confirmed and nothing in the name implies a loop round the feet: the band is anchored). Supine on the mat, head toward a
// rack whose two uprights stand beyond the head; a band is tied low on each upright and held in the hand on that side,
// fists by the ears, elbows wide (two one-hand bands, so the strands run back and out past the head, clear of it). Head and
// shoulder blades curled up, then pedal: right shoulder toward the left knee as the right leg straightens, then the left
// shoulder toward the right knee; two full alternations per loop; pelvis still. Body and legs as in author-air-bike.js
// (core-b); the hands are solved by the ears in the head frame for every key (each arm separately: the trunk is turned).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const CB = require('./families/core-b');
const B5 = require('./families/b5-bandcore');
const EQ = require('./families/equip');
const meta = require('./meta/band-bicycle-crunch.json');

const lie = CB.lie({ kneeFlex: 90, spine: { l5: 2, t12: 2, t6: 4 }, pitch: 93 });
const leg = (p, s, hip, knee, abd = 0, dorsi = -15) => { p.ch[`hip_${s}`] = { flex: hip, abd, rot: 0 }; p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi }; };
const SPLIT = { spine_l5: 0.08, spine_t12: 0.46, spine_t6: 0.46 };
// fist by the ear (head frame), palm toward the head, elbow out wide (upper-trunk frame)
const spec = (W) => {
  const hq = W.head_c1.q, at = (v) => V.add(W.head_c1.p, Q.rot(hq, v)), fr = W.spine_t6.q;
  return { grip: at([3, 7, 13]), axis: Q.rot(hq, [0, 1, 0]), palm: Q.rot(hq, [0, 0, -1]), wPalm: 1.5, elbow: V.add(W.shoulder_r.p, Q.rot(fr, [2, 9, 20])), wElbow: 0.5, extra: [CB.clear(CB.ARM_R, 1.0, 4)],
    guess: { plane: 0, elev: 125, axial: -110, pron: 40, flex: 135 } };
};
function pose(k) {
  let p = clone(lie);
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: r1(k.rot * SPLIT[j]), latFlex: r1((k.lat || 0) * (j === 'spine_l5' ? 0 : 0.5)), flex: r1(Math.min(rig.byId[j].limits.flex[1] - 1, lie.ch[j].flex + k.curl[j])) };
  CB.neck(p, k.neck, k.rot * 0.25);
  leg(p, 'r', ...k.legs.r); leg(p, 'l', ...k.legs.l);
  p.ch.sc_r = { protract: 0, elevate: 3 }; p.ch.sc_l = { protract: 0, elevate: 3 };
  p = B5.armSide(p, [], 'r', spec); const e = p.__err;
  p = B5.armSide(p, [], 'l', spec); p.__err = [e.grip, p.__err.grip];
  return p;
}
const CURL = { spine_l5: 2, spine_t12: 13, spine_t6: 18 };
const SET = { curl: CURL, rot: 0, neck: 30, legs: { r: [88, 95], l: [88, 95] } };
const A = { curl: { spine_l5: 8, spine_t12: 21, spine_t6: 20 }, rot: -38, lat: -4, neck: 32, legs: { l: [116, 116, -3], r: [22, 6] } };
const Ah = Object.assign({}, A, { rot: -40, curl: { spine_l5: 9, spine_t12: 22, spine_t6: 21 }, legs: { l: [119, 118, -4], r: [20, 5] } });
const poses = { set: pose(SET), A: pose(A), Ahold: pose(Ah) }, err = {};
for (const n in poses) { err[n] = poses[n].__err; delete poses[n].__err; }
poses.B = CB.mirror(poses.A); poses.Bhold = CB.mirror(poses.Ahold);
const keyframes = [{ t: 0, pose: 'set' }, { t: 0.6, pose: 'set' }, { t: 1.35, pose: 'A' }, { t: 1.6, pose: 'Ahold' }, { t: 2.55, pose: 'B' }, { t: 2.8, pose: 'Bhold' },
  { t: 3.75, pose: 'A' }, { t: 4.0, pose: 'Ahold' }, { t: 4.95, pose: 'B' }, { t: 5.2, pose: 'Bhold' }, { t: 5.9, pose: 'set' }, { t: 6.4, pose: 'set' }];

// rack beyond the head (uprights at z = +-60), bands tied 12 cm up each upright
const Ws = L.fk(poses.set), headTop = Math.min(...['head', 'hair'].map((id) => { const g = R.shapeWorld(Ws, rig.shapes.find((s) => s.id === id)); return g.c[0] - Math.hypot(g.axes[0][0], g.axes[1][0], g.axes[2][0]); }));
const RX = r1(headTop - 45), ANCHOR_Y = 12;
const rack = { id: 'rack', kind: 'rack', center: [RX, 0, 0], size: [0, 120, 120], hookY: 90 };
const ex = CB.moduleOf(meta, poses, keyframes, []);
ex.props = [...meta.props, rack, B5.band('band_r', { joint: 'wrist_r' }, [RX, ANCHOR_Y, 60]), B5.band('band_l', { joint: 'wrist_l' }, [RX, ANCHOR_Y, -60])];
const hipPk = Math.max(...Object.values(poses).map((p) => Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex)));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hipPk) - 3, max: Math.ceil(hipPk) + 3 };
const rep = B5.scan(ex, { still: ['pelvis'], measure: B5.MEASURE.hipFlexion });
B5.gate('band-bicycle-crunch', rep, { minBand: 0.3, range: [ex.checks.measure.min, ex.checks.measure.max] });

const Wa = L.fk(poses.Ahold), ah = poses.Ahold.ch, rotSum = ah.spine_l5.rot + ah.spine_t12.rot + ah.spine_t6.rot;
const legDeg = (W, s) => Math.atan2(W[`ankle_${s}`].p[1] - W[`hip_${s}`].p[1], W[`ankle_${s}`].p[0] - W[`hip_${s}`].p[0]) / R.DEG;
CB.setKin(ex, 'Trunk curl', `Shoulder blades ${Math.round(CB.bottomOf(Ws, 'chest'))} cm off the mat (thoracic ${CB.deg(poses.set.ch.spine_t12.flex + poses.set.ch.spine_t6.flex)} flexion)`, 'Held up through every twist, against the bands');
CB.setKin(ex, 'Trunk rotation', 'Square to the ceiling', `${CB.deg(-rotSum)} toward the bent knee (mostly thoracic), elbow ${Math.round(V.len(V.sub(Wa.elbow_r.p, Wa.knee_l.p)))} cm from the opposite knee`);
CB.setKin(ex, 'Bent leg', `Hip ${CB.deg(poses.set.ch.hip_r.flex)}, knee ${CB.deg(CB.kneeOf(Ws, 'r'))} (both knees over the hips)`, `Hip ${CB.deg(ah.hip_l.flex)}, knee ${CB.deg(CB.kneeOf(Wa, 'l'))}`);
CB.setKin(ex, 'Straight leg', '-', `Hip ${CB.deg(ah.hip_r.flex)}, knee ${CB.deg(CB.kneeOf(Wa, 'r'))}, leg ${CB.deg(legDeg(Wa, 'r'))} above the floor`);
CB.setKin(ex, 'Hands', `Fists by the ears; bands tied ${ANCHOR_Y} cm up the uprights, ${Math.round(Ws.head_c1.p[0] - RX)} cm beyond the head`, 'Unchanged relative to the head');
CB.setKin(ex, 'Tempo', 'Set 0.6 s', 'About 1.2 s per twist with a short pause, 4 twists per 6.4 s loop');
CB.finish(ex, rep, 'Band Bicycle Crunch');
console.log(`  grip err ${JSON.stringify(err)} hands ${EQ.gripPoint(Ws, 'r').p.map(Math.round)}`);
