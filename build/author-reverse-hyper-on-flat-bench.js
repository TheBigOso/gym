// Reverse Hyper on Flat Bench (GymVisual #2958; page not readable here, movement from the name and standard coaching).
// Prone on a flat bench, head toward +X (past the far end, face free), the hips just past the near end so they can bend
// freely, hands gripping the pad edges beside the shoulders (arms still: the trunk does not move). Start with the legs
// hanging: hips flexed, knees bent, toes resting lightly on the floor. Squeeze the glutes and raise both legs, straightening
// the knees, until the legs are level with the body; pause; lower with control. On a 45 cm bench straight legs cannot hang
// all the way down, so the knees bend at the bottom (a common flat-bench version). Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const CB = require('./families/core-b');
const H = require('./families/hips');
const DBH = require('./families/dumbbell');
const F = require('./families/b6-20');
const meta = require('./meta/reverse-hyper-on-flat-bench.json');

const TOP = 45;
const BENCH = DBH.bench({ x: 0, seat: 30, height: TOP, width: 30, angle: 0, back: 50 });
const BX = [BENCH.seatX[0] - 50, BENCH.seatX[1]];   // pad spans x -65 .. 15
const zero = () => ({ rot: 0, flex: 0, latFlex: 0 });
// Prone on the pad: chest, belly and the front of the pelvis on the pad; neck a little extended so the face clears the end
let p = { root: { pos: [0, 70, 0], rot: { pitch: -90 } }, ch: { spine_l5: { ...zero(), flex: -2 }, spine_t12: zero(), spine_t6: zero(), neck_c7: { rot: 0, flex: -6 }, head_c1: { rot: 0, flex: -8 },
  sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 }, hip_r: { flex: 0, abd: 0, rot: 0 }, hip_l: { flex: 0, abd: 0, rot: 0 }, knee_r: { flex: 2 }, knee_l: { flex: 2 }, ankle_r: { dorsi: -30 }, ankle_l: { dorsi: -30 },
  shoulder_r: { plane: 60, elev: 60, axial: 0 }, shoulder_l: { plane: 60, elev: 60, axial: 0 }, elbow_r: { flex: 60 }, elbow_l: { flex: 60 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 } } };
const front = (W) => Math.min(CB.bottomOf(W, 'chest'), CB.bottomOf(W, 'pecs_r'), CB.bottomOf(W, 'pecs_l'));
p = L.solvePose(p, ['root.pos.1', 'root.rot.pitch'], [(W) => [(front(W) - TOP - 0.3) * 3, (CB.bottomOf(W, 'pelvis') - TOP - 0.3) * 3, Math.min(0, CB.bottomOf(W, 'abdomen') - TOP - 0.3) * 4]]).pose;
// hips just past the near (-X) end of the pad
let W = L.fk(p);
p.root.pos[0] = r1(p.root.pos[0] + (BX[0] - 7) - W.hip_r.p[0]);
W = L.fk(p);
// Hands grip the pad edges beside the shoulders (wrists just below the top edge, outside the pad), arms then fixed
const HT = [r1(W.shoulder_r.p[0] + 24), TOP - 3, 17.5];
p = L.armToTarget(p, HT, { wrist: { pron: -60, flex: 20, dev: 0 }, guess: [60, 70, 0] });
p = CB.mirrorArm(p);
const base = p;

/* ---------------- Legs ---------------- */
// bottom: knee bent `knee`, hip flexion solved so the toes (lowest foot point) rest `clr` cm above the floor
function hang(knee, clr = 0.4) {
  const q = clone(base);
  for (const s of ['r', 'l']) { q.ch[`knee_${s}`] = { flex: knee }; q.ch[`ankle_${s}`] = { dorsi: -20 }; }
  let lo = 0, hi = 110;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; q.ch.hip_r = { flex: m, abd: 0, rot: 0 }; if (F.minOf(L.fk(q), ['foot_r']) > clr) lo = m; else hi = m; }
  q.ch.hip_r = { flex: r1(lo), abd: 0, rot: 0 }; q.ch.hip_l = clone(q.ch.hip_r);
  return q;
}
const legsAt = (hip, knee, dorsi = -30) => { const q = clone(base); for (const s of ['r', 'l']) { q.ch[`hip_${s}`] = { flex: r1(hip), abd: 0, rot: 0 }; q.ch[`knee_${s}`] = { flex: r1(knee) }; q.ch[`ankle_${s}`] = { dorsi }; } return q; };
const bottom = hang(75);
const HB = bottom.ch.hip_r.flex;
const poses = { bottom, r1: legsAt(HB * 0.6, 45, -25), r2: legsAt(HB * 0.25, 18, -30), top: legsAt(-6, 2, -35), topHold: legsAt(-7, 2, -35), d1: legsAt(HB * 0.3, 20, -30), d2: legsAt(HB * 0.7, 50, -25) };
const keyframes = [['bottom', 0], ['bottom', 0.6], ['r1', 1.0], ['r2', 1.4], ['top', 1.8], ['topHold', 2.4], ['d1', 3.0], ['d2', 3.5], ['bottom', 4.0], ['bottom', 4.6]].map(([pose, t]) => ({ t, pose }));
const ex = H.module_(meta, [], poses, keyframes);
ex.props = [BENCH.prop];
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(HB) - 3, max: Math.ceil(HB) + 3 };

// Leg clearance to the pad (6 cm thick): points along the thigh and shank axes within the pad's footprint must be above
// its top or below its underside by their radius (positive = clear)
function padGap(Wx) {
  let best = 1e9;
  for (const id of ['thigh_r', 'thigh_l', 'shank_r', 'shank_l']) {
    const g = R.shapeWorld(Wx, F.shapeById[id]);
    for (let k = 2; k <= 10; k++) { const t = k / 10, pt = V.add(g.a, V.scale(V.sub(g.b, g.a), t)), rr = g.r[0] + (g.r[1] - g.r[0]) * t; const corner = Math.hypot(pt[0] - BX[0], Math.max(0, pt[1] - TOP, (TOP - 6) - pt[1])) - rr; if (pt[0] <= BX[0]) best = Math.min(best, corner); if (pt[0] > BX[0] && pt[0] < BX[1] && Math.abs(pt[2]) < 15 + rr) best = Math.min(best, Math.max(pt[1] - rr - TOP, (TOP - 6) - (pt[1] + rr))); }
  }
  return best;
}
const rep = F.report(ex, { pad: (Wx) => padGap(Wx), toe: (Wx) => F.minOf(Wx, ['foot_r', 'foot_l']) });
const Wb = L.fk(bottom), Wt = L.fk(poses.topHold);
const legDeg = (Wx) => { const d = V.sub(Wx.ankle_r.p, Wx.hip_r.p); return Math.atan2(d[1], -d[0]) / R.DEG; };
F.setKin(ex, 'Hip extension', `Hip flexed ${F.deg(HB)} (legs hanging, toes on the floor)`, `Hip ${F.deg(poses.topHold.ch.hip_r.flex)} (${F.deg(-poses.topHold.ch.hip_r.flex)} extension); legs ${F.deg(legDeg(Wt))} above level`);
F.setKin(ex, 'Knee', `Bent ${F.deg(bottom.ch.knee_r.flex)}`, `Straight (${F.deg(poses.topHold.ch.knee_r.flex)})`);
F.setKin(ex, 'Trunk', 'Chest and belly on the pad, hands gripping the edges', `Unchanged (pelvis and mid-back move ${rep.still} cm)`);
F.setKin(ex, 'Tempo', 'Legs hanging 0.6 s', '1.2 s up, 0.6 s pause, 1.6 s down');
const low = { chest: r1(front(Wb) - TOP), pelvis: r1(CB.bottomOf(Wb, 'pelvis') - TOP), abdomen: r1(CB.bottomOf(Wb, 'abdomen') - TOP), head: r1(CB.headBottom(Wb) - TOP), hand: r1(F.minOf(Wb, ['hand_r'])) };
console.log(`Reverse Hyper on Flat Bench: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} HB ${HB} low ${JSON.stringify(low)} hipX ${r1(Wb.hip_r.p[0])} arm ${JSON.stringify(base.ch.shoulder_r)} ${base.ch.elbow_r.flex}`);
F.CA.guard('reverse-hyper-on-flat-bench', rep, [rep.pad[0] < -0.5 && `legs pass into the pad (${rep.pad[0]})`, rep.toe[0] < -0.3 && 'toes through the floor']);
