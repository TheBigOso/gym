// 3/4 Sit-up (GymVisual #247613). Bilateral, symmetric: supine, knees ~90°, feet flat and free,
// fingertips behind the head with elbows wide; curl head and shoulders first, then the trunk to ~60–70°
// from the floor (three-quarters of the way up); lower under control, low back first and head last.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const meta = require('./meta/three-quarter-sit-up.json');

const DEBUG = process.argv.includes('--debug');
const bottomOf = (W, id) => { const s = rig.shapes.find((x) => x.id === id), g = R.shapeWorld(W, s); return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
const trunkFromVertical = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const headPt = (W, v) => V.add(W.head_c1.p, Q.rot(W.head_c1.q, v));
const { HAND_C, HAND_TIP, headInHands } = require('./families/core-a'); // head-local hand centre and fingertips (rig v2: follow the fitted head)

/* ---------------- 1) Lying base: pelvis and upper back on the mat ---------------- */
const sup = L.POSES.supine({ kneeFlex: 90 });
const base0 = clone(sup.pose);
base0.root.pos = [0, base0.root.pos[1], 0];
// Pitch the pelvis and give the spine a small lordosis so the buttocks, low ribs and upper back all rest on the mat.
let lie = L.solvePose(base0, ['root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
  (W) => [bottomOf(W, 'buttock_r') * 4, Math.min(bottomOf(W, 'chest'), bottomOf(W, 'traps_r'), bottomOf(W, 'traps_l')) * 3, Math.min(0, bottomOf(W, 'neck') - 0.5) * 4, Math.max(0, bottomOf(W, 'ribcage') - 1.2) * 2, Math.min(0, bottomOf(W, 'ribcage')) * 4, Math.min(0, bottomOf(W, 'abdomen') - 1.5) * 4],
  L.obj.reg('ch.spine_l5.flex', -8, 0.15), L.obj.reg('ch.spine_t12.flex', 2, 0.25), L.obj.reg('ch.spine_t6.flex', 4, 0.4), L.obj.reg('root.rot.pitch', 92, 0.2),
]).pose;
// The pelvis rolls on the buttocks as it tips toward the thighs; sit it 0.5 cm high at rest so the buttocks
// press at most ~0.5 cm into the mat at the top (the pelvis joint itself never moves).
lie.root.pos[1] = r1(lie.root.pos[1] + 0.5);
// Head cradled: neck flexion just enough that the back of the hands rests on the mat.
lie = headInHands(lie);
const NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const P0 = lie.root.rot.pitch, ROOT = lie.root.pos.slice();

/* ---------------- 2) Feet flat and free, knees ~90° ---------------- */
const KNEE = 90, TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
const Wl = L.fk(lie), HIP = Wl.hip_r.p;
const hipToAnkle = Math.sqrt(TH * TH + SH * SH - 2 * TH * SH * Math.cos((180 - KNEE) * R.DEG));
const ankleX = r1(HIP[0] + Math.sqrt(hipToAnkle ** 2 - (HIP[1] - L.ANKLE_H) ** 2));
const tR = [ankleX, L.ANKLE_H, r1(HIP[2])], tLft = [ankleX, L.ANKLE_H, -r1(HIP[2])];
// Supine knees point at the ceiling, so the leg pole is +Y (lib's standing pole points forward, +X).
const contacts = ['r', 'l'].map((sd) => Object.assign(L.legContact(sd), { pole: [0.15, 1, sd === 'r' ? 0.04 : -0.04] }));
// Leg channels that reproduce the IK foot placement (so FK and IK agree and the stored hip angle is real).
function fitLeg(pose, s, ankle) {
  const c = contacts.find((x) => x.id === `leg_${s}`);
  const q = clone(pose); q.ik = { [c.id]: { target: ankle, weight: 1 } };
  const Wi = R.evalPose(rig, q, [c]);
  return L.solvePose(pose, [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`],
    [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2), L.obj.reg(`ch.hip_${s}.abd`, 0, 0.05), L.obj.reg(`ch.hip_${s}.rot`, 0, 0.05)], { iters: 300 }).pose;
}
for (const sd of ['r', 'l']) { lie.ch[`hip_${sd}`] = { flex: 30, abd: 0, rot: 0 }; lie.ch[`ankle_${sd}`] = { dorsi: -35 }; }
lie = fitLeg(fitLeg(lie, 'r', tR), 'l', tLft);
lie.ik = { leg_r: { target: tR, weight: 1 }, leg_l: { target: tLft, weight: 1 } };
lie.ch.sc_r = { protract: 0, elevate: 0 }; lie.ch.sc_l = { protract: 0, elevate: 0 };
const LEG = { hip: clone(lie.ch.hip_r), knee: lie.ch.knee_r.flex, ankle: lie.ch.ankle_r.dorsi };

/* ---------------- 3) Hands behind the head, elbows wide ---------------- */
// Fingertips cradle the back of the head (they meet near the midline); the hands never pull the head.
const limitPen = (paths, w = 2) => (W, pose) => paths.map((pth) => { const [, j, c] = pth.split('.'), lim = rig.byId[j].limits && rig.byId[j].limits[c], v = L.getPath(pose, pth) ?? 0; return lim ? (Math.max(0, lim[0] - v) + Math.max(0, v - lim[1])) * w : 0; });
function cradle(pose, opt = {}) {
  const paths = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev', 'ch.sc_r.protract', 'ch.sc_r.elevate'];
  const p = clone(pose);
  const g = opt.guess || { shoulder_r: { plane: 10, elev: 150, axial: -70 }, elbow_r: { flex: 130 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, sc_r: { protract: 0, elevate: 4 } };
  for (const j in g) p.ch[j] = clone(g[j]);
  const objs = [
    (W) => V.sub(V.add(W.wrist_r.p, Q.rot(W.wrist_r.q, [1.0, -8.9, 0])), headPt(W, HAND_C)).map((v) => v * 3),
    (W) => V.sub(W.handtip_r.p, headPt(W, HAND_TIP)).map((v) => v * 2),
    // Palm faces the head: wrist X axis along the head's forward axis.
    (W) => V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), Q.rot(W.head_c1.q, [1, 0, 0])).map((v) => v * 3),
    // Elbows wide: elbow level with the shoulder in the upper-back frame (not pulled forward), well out to the side.
    (W) => { const fr = W.spine_t6.q, d = V.sub(W.elbow_r.p, W.shoulder_r.p); return [(V.dot(d, Q.rot(fr, [1, 0, 0])) - (opt.elbowAnt ?? -3)) * 0.8, Math.min(0, V.dot(d, Q.rot(fr, [0, 0, 1])) - 20) * 0.8]; },
    limitPen(paths),
    L.obj.reg('ch.sc_r.protract', 0, 0.15), L.obj.reg('ch.sc_r.elevate', 4, 0.15), L.obj.reg('ch.wrist_r.dev', 0, 0.05), L.obj.reg('ch.wrist_r.flex', 0, 0.03),
  ];
  if (opt.wristRef) objs.push(L.obj.reg('ch.wrist_r.pron', opt.wristRef.pron, 0.3), L.obj.reg('ch.wrist_r.flex', opt.wristRef.flex, 0.3));
  const ARM = ['upperarm_r', 'forearm_r', 'hand_r', 'thumb_r', 'deltoid_r', 'biceps_r'];
  objs.push((W) => ARM.map((id) => Math.min(0, bottomOf(W, id) - (opt.floor ? 0.2 : 1.5)) * 3));
  const s = L.solvePose(p, paths, objs, { iters: 400 });
  const out = s.pose; out.__cost = s.cost;
  for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) out.ch[`${j}_l`] = clone(out.ch[`${j}_r`]); // mirror: same channels, left side
  return out;
}

/* ---------------- 4) Key poses ---------------- */
// Trunk angles come from root pitch (pelvis rolling toward the thighs = hip flexion) plus segmental spine flexion.
// Legs stay world-fixed: hip flexion grows by exactly the pelvis pitch change, knee and ankle do not change.
function trunk(k) {
  const p = clone(lie);
  // Segment flexion is added to the lying curve and kept 1° inside the rig limits.
  const sp = (j, f) => { p.ch[j] = { rot: 0, latFlex: 0, flex: r1(Math.min(rig.byId[j].limits.flex[1] - 1, lie.ch[j].flex + f)) }; };
  sp('spine_l5', k.l5); sp('spine_t12', k.t12); sp('spine_t6', k.t6);
  const nk = k.neck == null ? NECK0 : k.neck;
  p.ch.neck_c7 = { rot: 0, flex: r1(nk * 0.55) }; p.ch.head_c1 = { rot: 0, flex: r1(nk * 0.45) };
  const setP = (q, P) => { q.root.rot.pitch = r1(P); for (const s of ['r', 'l']) q.ch[`hip_${s}`] = Object.assign(clone(LEG.hip), { flex: r1(LEG.hip.flex + (P0 - P)) }); return q; };
  let P = P0;
  if (k.fromFloor != null) {
    // Solve the pelvis pitch so the pelvis-to-C7 line sits k.fromFloor degrees above the floor.
    let lo = 0, hi = P0 + 10;
    for (let i = 0; i < 60; i++) { P = (lo + hi) / 2; const a = 90 - trunkFromVertical(L.fk(setP(clone(p), P))); if (a > k.fromFloor) lo = P; else hi = P; }
  } else if (k.pitch != null) P = P0 + k.pitch;
  setP(p, P);
  return cradle(p, { floor: k.floor, elbowAnt: k.elbowAnt, guess: k.guess, wristRef: k.floor && k.guess ? k.guess.wrist_r : null });
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, floor: true, elbowAnt: -3 },
  { name: 'curl', l5: 3, t12: 12, t6: 18, neck: 30, pitch: 1 },                 // head and shoulder blades peel off the mat
  { name: 'rise', l5: 18, t12: 20, t6: 18, neck: 26, fromFloor: 38 },          // spine peeled, hips start to flex
  { name: 'top', l5: 30, t12: 18, t6: 12, neck: 16, fromFloor: 66 },           // three-quarters up, trunk still gently curled
  { name: 'topHold', l5: 30, t12: 19, t6: 13, neck: 16, fromFloor: 67 },
  { name: 'lower', l5: 32, t12: 22, t6: 17, neck: 22, fromFloor: 42 },         // pelvis rolls back first, spine stays curled
  { name: 'lowBack', l5: 8, t12: 16, t6: 18, neck: 28, pitch: 0 },             // low back down, shoulders still up
  { name: 'touch', l5: 0, t12: 3, t6: 7, neck: 16, pitch: 0, floor: true, elbowAnt: -2 }, // upper back down, head last
];
const poses = {}, report = [];
// Solve the arm branch once from a mid-rep pose so every key (including the floor-constrained ones) shares it.
let prevArm = (() => {
  let best = null;
  for (const pron of [-90, -30, 30, 90, 150]) for (const axial of [-120, -60]) for (const elev of [120, 150]) {
    const guess = { shoulder_r: { plane: 0, elev, axial }, elbow_r: { flex: 140 }, wrist_r: { pron, flex: 0, dev: 0 }, sc_r: { protract: 0, elevate: 4 } };
    const p = trunk({ l5: 3, t12: 12, t6: 18, neck: 30, pitch: 1, guess });
    if (DEBUG) console.log('seed', pron, axial, elev, p.__cost.toFixed(2), JSON.stringify([p.ch.shoulder_r, p.ch.elbow_r, p.ch.wrist_r]));
    if (!best || p.__cost < best.__cost) best = p;
  }
  return { shoulder_r: best.ch.shoulder_r, elbow_r: best.ch.elbow_r, wrist_r: best.ch.wrist_r, sc_r: best.ch.sc_r };
})();
const ARM0 = prevArm;
for (const k of KEYS) {
  const p = trunk(Object.assign({ guess: k.floor ? ARM0 : prevArm }, k));
  prevArm = { shoulder_r: p.ch.shoulder_r, elbow_r: p.ch.elbow_r, wrist_r: p.ch.wrist_r, sc_r: p.ch.sc_r };
  delete p.__cost; poses[k.name] = p;
  const W = L.fk(p, contacts), m = L.shapeMinY(W);
  report.push(`${k.name.padEnd(8)} pitch=${p.root.rot.pitch} hip=${p.ch.hip_r.flex} spine=${p.ch.spine_l5.flex}/${p.ch.spine_t12.flex}/${p.ch.spine_t6.flex} neck=${p.ch.neck_c7.flex}+${p.ch.head_c1.flex} trunk=${(90 - trunkFromVertical(W)).toFixed(1)}° from floor  sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} elb=${p.ch.elbow_r.flex} wr=${p.ch.wrist_r.pron}/${p.ch.wrist_r.flex}/${p.ch.wrist_r.dev} sc=${p.ch.sc_r.protract}/${p.ch.sc_r.elevate} minY=${m.y.toFixed(1)}(${m.id}) elbowY=${W.elbow_r.p[1].toFixed(1)}`);
}

/* ---------------- 5) Module ---------------- */
const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses,
  keyframes: [
    { t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.7, pose: 'curl' }, { t: 2.3, pose: 'rise' }, { t: 2.9, pose: 'top' },
    { t: 3.6, pose: 'topHold' }, { t: 4.6, pose: 'lower' }, { t: 5.5, pose: 'lowBack' }, { t: 6.1, pose: 'touch' }, { t: 6.8, pose: 'lie' }, { t: 8, pose: 'lie' },
  ],
  activation: meta.activation, guides: meta.guides, checks: clone(meta.checks),
};

// Peak hip-flexion band that corresponds to a trunk 60–70° from the floor with the authored top-of-rep spine curl.
const band = [60, 70].map((a) => trunk(Object.assign({}, KEYS.find((k) => k.name === 'top'), { fromFloor: a })).ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.min(...band)), max: Math.ceil(Math.max(...band)) };

// Timeline scan: trunk range, feet, pelvis, floor.
const tl = R.buildTimeline(ex);
let minTrunk = 1e9, maxTrunk = -1e9, floor = { y: 1e9 }, footLift = 0, pelvisDrift = 0, buttockMax = -1e9;
const W0 = R.evalPose(rig, tl.pose(0), contacts);
for (let i = 0; i <= 800; i++) {
  const t = (i / 800) * ex.timeline.duration, W = R.evalPose(rig, tl.pose(t), contacts);
  const a = 90 - trunkFromVertical(W); minTrunk = Math.min(minTrunk, a); maxTrunk = Math.max(maxTrunk, a);
  const f = L.shapeMinY(W); if (f.y < floor.y) floor = { y: f.y, id: f.id, t: +t.toFixed(2) };
  for (const j of ['ankle_r', 'ankle_l', 'toe_r', 'toe_l']) footLift = Math.max(footLift, V.len(V.sub(W[j].p, W0[j].p)));
  pelvisDrift = Math.max(pelvisDrift, V.len(V.sub(W.pelvis.p, W0.pelvis.p)));
  buttockMax = Math.max(buttockMax, Math.min(bottomOf(W, 'buttock_r'), bottomOf(W, 'pelvis')));
}
if (maxTrunk < 60 || maxTrunk > 70) throw new Error(`peak trunk angle ${maxTrunk.toFixed(1)}° from floor is outside 60–70°`);
const pk = poses.top, Wpk = L.fk(pk, contacts), Wlie = L.fk(lie, contacts), M = R.measures(Wpk), kin = ex.exercise.kinematics;
const d = (v) => `≈${Math.round(v)}°`;
kin[0].setup = 'Lying flat'; kin[0].peak = d(maxTrunk) + ' from the floor';
kin[1].setup = d(lie.ch.spine_l5.flex) + ' (slight lordosis)'; kin[1].peak = d(pk.ch.spine_l5.flex) + ' flexion (L5–T12 segment)';
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (+${Math.round(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex - lie.ch.spine_t12.flex - lie.ch.spine_t6.flex)}° from lying)`;
kin[3].setup = `${d(lie.ch.hip_r.flex)} flexion (thigh ${d(Math.atan2(Wlie.knee_r.p[1] - Wlie.hip_r.p[1], Wlie.knee_r.p[0] - Wlie.hip_r.p[0]) / R.DEG)} above the floor)`; kin[3].peak = d(pk.ch.hip_r.flex) + ' flexion (pelvis rolled toward the thighs)';
kin[4].setup = d(R.measures(Wlie).knee); kin[4].peak = d(M.knee) + ', feet unchanged';
kin[5].setup = 'Fingertips behind head, elbows wide'; kin[5].peak = 'Elbows still wide, in line with the ears';
ex.exercise.reference.note = 'Used only to identify the movement. This rig, model and animation are original.';
console.log(`3/4 sit-up: pitch0=${P0} root=${ROOT} knee=${KNEE} feet=${tR} wrote ${L.write(ex)}`);
report.forEach((r) => console.log('  ' + r));
console.log(`  trunk ${minTrunk.toFixed(1)}–${maxTrunk.toFixed(1)}° from floor; hipFlexion band ${JSON.stringify(ex.checks.measure)}; lowest ${floor.y.toFixed(2)} (${floor.id} @${floor.t}s); feet move ${footLift.toFixed(3)} cm; pelvis drift ${pelvisDrift.toFixed(3)} cm; buttock/pelvis bottom max ${buttockMax.toFixed(2)} cm`);
if (DEBUG) console.log(JSON.stringify(lie.ch));
