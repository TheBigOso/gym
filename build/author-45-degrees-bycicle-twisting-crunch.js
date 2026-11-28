// 45 degrees Bycicle Twisting Crunch (GymVisual #1347, movement reference only; page not readable here). Bilateral,
// alternating: sit on the mat and lean the trunk back to about 45 degrees, balancing on the buttocks, fingertips behind the
// head with the elbows wide, both feet off the floor. Pedal the legs while the trunk turns: right elbow toward the left
// knee as the right leg extends long and low, then the left elbow toward the right knee. The trunk stays at about 45
// degrees throughout (the difference from the floor air bike). Built on core-b (as air-bike); the pelvis pitch is set so
// the pelvis-to-C7 line sits at 45 degrees, and the buttocks rest on the mat.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const C = require('./families/core-b');
const CA = require('./families/core-a');
const F6 = require('./families/b6-17');
const meta = require('./meta/45-degrees-bycicle-twisting-crunch.json');

const lie = C.lie({ kneeFlex: 90, spine: { l5: 2, t12: 2, t6: 4 }, pitch: 93 });
const P0 = lie.root.rot.pitch, TRUNK = +(process.env.TRUNK || 45);
const SPLIT = { spine_l5: 0.08, spine_t12: 0.46, spine_t6: 0.46 };
const sitBottom = (W) => Math.min(C.bottomOf(W, 'buttock_r'), C.bottomOf(W, 'buttock_l'), C.bottomOf(W, 'pelvis'));
// legs: world thigh angle above the floor (deg) and knee flexion; hip flexion = thigh + (P0 - pitch)
const leg = (p, s, [thigh, knee, abd = 0], P, dorsi = -15) => { p.ch[`hip_${s}`] = { flex: r1(thigh + (P0 - P)), abd, rot: 0 }; p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi }; };
function body(k) {
  const p = clone(lie);
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: r1(k.rot * SPLIT[j]), latFlex: r1((k.lat || 0) * (j === 'spine_l5' ? 0 : 0.5)), flex: r1(Math.min(rig.byId[j].limits.flex[1] - 1, lie.ch[j].flex + k.curl[j])) };
  C.neck(p, k.neck, k.rot * 0.25);
  // pitch so the pelvis-to-C7 line is TRUNK degrees above the floor, then the buttocks on the mat
  let lo = 0, hi = P0;
  for (let i = 0; i < 50; i++) { const P = (lo + hi) / 2; p.root.rot.pitch = P; if (CA.trunkFromFloor(L.fk(p)) > TRUNK) lo = P; else hi = P; }
  p.root.rot.pitch = r1((lo + hi) / 2);
  const P = p.root.rot.pitch;
  leg(p, 'r', k.legs.r, P); leg(p, 'l', k.legs.l, P);
  p.root.pos[1] = r1(p.root.pos[1] - sitBottom(L.fk(p)));
  return p;
}
function pose(k, refArm) {
  let q = C.cradle(body(k), { side: 'r', guess: refArm.r, ref: refArm.r, elbowOut: k.elbowOut ?? 18, elbowAnt: k.elbowAnt ?? -3 });
  q = C.cradle(q, { side: 'l', guess: refArm.l, ref: refArm.l, elbowOut: 18 });
  delete q.__cost;
  return q;
}
const CURL = { spine_l5: 2, spine_t12: 10, spine_t6: 12 };
const SET = { curl: CURL, rot: 0, neck: 14, legs: { r: [52, 100], l: [52, 100] } };
let best = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  const q = C.cradle(body(SET), { guess: g, elbowOut: 18 });
  if (!best || q.__cost < best.__cost) best = q;
}
const REF = { r: C.armOf(best, 'r'), l: C.armOf(best, 'l') };
// Peak A: right elbow to the left knee (trunk turns left, negative rot); right leg long and low
const A = { curl: { spine_l5: 4, spine_t12: 16, spine_t6: 16 }, rot: -38, lat: -3, neck: 18, elbowAnt: 3, elbowOut: 15, legs: { l: [78, 115, -3], r: [16, 8] } };
const Ah = Object.assign({}, A, { rot: -40, curl: { spine_l5: 4.5, spine_t12: 17, spine_t6: 17 }, legs: { l: [80, 117, -4], r: [15, 7] } });
const poses = { set: pose(SET, REF), A: pose(A, REF), Ahold: pose(Ah, REF) };
poses.B = C.mirror(poses.A); poses.Bhold = C.mirror(poses.Ahold);
for (const n of ['B', 'Bhold']) delete poses[n].__cost;
const keyframes = [{ t: 0, pose: 'set' }, { t: 0.6, pose: 'set' }, { t: 1.35, pose: 'A' }, { t: 1.6, pose: 'Ahold' }, { t: 2.55, pose: 'B' }, { t: 2.8, pose: 'Bhold' },
  { t: 3.75, pose: 'A' }, { t: 4.0, pose: 'Ahold' }, { t: 4.95, pose: 'B' }, { t: 5.2, pose: 'Bhold' }, { t: 5.9, pose: 'set' }, { t: 6.4, pose: 'set' }];
const ex = C.moduleOf(meta, poses, keyframes, []);
const hipPk = Math.max(...Object.values(poses).map((p) => Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex)));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hipPk) - 3, max: Math.ceil(hipPk) + 3 };

// the pelvis rocks a little on the buttocks between keys (pitch re-solved per key), so no still joints
const rep = C.scan(ex, {});
const tl = R.buildTimeline(ex); let sitMax = -1e9, heelMin = 1e9, trunk = [1e9, -1e9];
for (let i = 0; i <= 400; i++) { const W = L.fk(tl.pose((i / 400) * ex.timeline.duration)); sitMax = Math.max(sitMax, sitBottom(W)); heelMin = Math.min(heelMin, ...['foot_r', 'foot_l', 'calf_r', 'calf_l'].map((id) => C.bottomOf(W, id))); const tf = CA.trunkFromFloor(W); trunk = [Math.min(trunk[0], tf), Math.max(trunk[1], tf)]; }
const Ws = L.fk(poses.set), Wa = L.fk(poses.Ahold), ah = poses.Ahold.ch, rotSum = ah.spine_l5.rot + ah.spine_t12.rot + ah.spine_t6.rot, elbowKnee = V.len(V.sub(Wa.elbow_r.p, Wa.knee_l.p));
const legDeg = (W, s) => Math.atan2(W[`ankle_${s}`].p[1] - W[`hip_${s}`].p[1], W[`ankle_${s}`].p[0] - W[`hip_${s}`].p[0]) / R.DEG;
Object.assign(rep, { sitMax: r1(sitMax), heelMin: r1(heelMin), trunk: trunk.map(r1), pitch: [poses.set.root.rot.pitch, poses.A.root.rot.pitch], elbowKnee: r1(elbowKnee), rot: r1(rotSum), measure: ex.checks.measure });
rep.limits = rep.limits.concat(F6.limitViolations(poses)).filter((v, i, a) => a.indexOf(v) === i);
C.setKin(ex, 'Trunk angle', `${C.deg(CA.trunkFromFloor(Ws))} above the floor (pelvis-to-C7 line), on the buttocks`, `${C.deg(trunk[0])}-${C.deg(trunk[1])} through the twists`);
C.setKin(ex, 'Trunk rotation', 'Square, facing the knees', `${C.deg(-rotSum)} toward the bent knee (mostly thoracic), elbow ${Math.round(elbowKnee)} cm from the opposite knee`);
C.setKin(ex, 'Bent leg', `Both knees bent ${C.deg(CA.kneeOf(Ws, 'r'))}, feet off the floor`, `Hip ${C.deg(ah.hip_l.flex)}, knee ${C.deg(CA.kneeOf(Wa, 'l'))}`);
C.setKin(ex, 'Straight leg', '–', `Knee ${C.deg(CA.kneeOf(Wa, 'r'))}, leg ${C.deg(legDeg(Wa, 'r'))} above the floor; heel ${r1(Math.min(C.bottomOf(Wa, 'foot_r'), C.bottomOf(Wa, 'calf_r')))} cm off the mat`);
C.setKin(ex, 'Tempo', 'Set 0.6 s', 'About 1.2 s per twist with a short pause, 4 twists per 6.4 s loop');
C.finish(ex, rep, '45 degrees Bycicle Twisting Crunch');
if (sitMax > 0.6 || heelMin < 1 || trunk[0] < 38 || trunk[1] > 52) { console.error('FAIL 45-degree bicycle: seat/heel/trunk', sitMax, heelMin, trunk); process.exitCode = 1; }
