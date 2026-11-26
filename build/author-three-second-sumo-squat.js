// 3 Sec Sumo Squat (GymVisual #735012): wide stance (about 1.5x shoulder width), toes out 30 degrees, hands clasped
// at the chest. Slow 3 s lowering with the hips sitting down between the heels to thighs about parallel, brief
// pause, stand in about 1 s, reset. Both feet planted throughout (constant IK targets). Bilateral (one clip).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const meta = require('./meta/three-second-sumo-squat.json');

/* ---------------- Stance ---------------- */
const SHOULDER_W = 2 * rig.byId.shoulder_r.offset[2] + 2 * rig.byId.sc_r.offset[2]; // biacromial (shoulder joint centres), about 37 cm
const STANCE = 28;          // ankle centres 56 cm apart: about 1.5x shoulder width
const TOE = 30;             // toe-out per foot (research: 30 degrees, inside the 0-42 degree tested range)
const KNEE_TOP = 3;         // soft knees when standing
const KNEE_BOTTOM = 110;    // thighs about parallel (research 100-120 degrees)
const PITCH_BOTTOM = -30;   // pelvis tipped forward at the bottom (trunk stays fairly upright)
const BACK_BOTTOM = -17;    // hips travel slightly back as they sit down (keeps the knees over the toes)
const KNEE_OUT = 2;        // knee 2 cm outside the foot axis at the bottom ("knees out over the toes")
const qArr = (q) => q.map((v) => +v.toFixed(6));
const toeDir = (s, deg = TOE) => [Math.cos(deg * R.DEG), 0, (s === 'r' ? 1 : -1) * Math.sin(deg * R.DEG)];
const footQ = (s) => L.footRot(s === 'r' ? -TOE : TOE); // world-locked flat foot turned out
const mkContacts = (poleDeg) => ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: toeDir(s, poleDeg).map((v) => +v.toFixed(4)), handRot: qArr(footQ(s)) }));

const st = L.POSES.standing({ stance: STANCE, toeOut: TOE });
const TARGET = { r: st.pose.ik.leg_r.target.slice(), l: st.pose.ik.leg_l.target.slice() };

/* ---------------- Trunk, head and arms for a depth fraction f (0 = standing, 1 = bottom) ---------------- */
// The hips travel back and the trunk inclines mostly in the first half of the descent (g leads the height fraction f).
const lead = (f) => 1 - Math.pow(1 - f, 1.6);
function trunk(f) {
  f = lead(f);
  const p = clone(st.pose);
  p.root.pos = [r1(BACK_BOTTOM * f), 60, 0];
  p.root.rot = { pitch: r1(PITCH_BOTTOM * f) };
  Object.assign(p.ch, {
    spine_l5: { rot: 0, flex: r1(-4 * f), latFlex: 0 }, spine_t12: { rot: 0, flex: r1(-2 * f), latFlex: 0 }, spine_t6: { rot: 0, flex: r1(1 * f), latFlex: 0 },
    sc_r: { protract: 6, elevate: 2 }, sc_l: { protract: 6, elevate: 2 },
  });
  // Eyes level and forward: the neck extends about as much as the trunk leans.
  const lean = -(PITCH_BOTTOM * f) + (-4 - 2 + 1) * f;
  p.ch.neck_c7 = { rot: 0, flex: r1(-lean * 0.4) }; p.ch.head_c1 = { rot: 0, flex: r1(-lean * 0.45) };
  p.ik = { leg_r: { target: TARGET.r.slice(), weight: 1 }, leg_l: { target: TARGET.l.slice(), weight: 1 } };
  return p;
}
// Hands clasped in front of the chest (fingers interlaced, elbows down and slightly out): fixed in the T6 frame.
function clasp(pose) {
  const W = L.fk(pose), T6 = W.spine_t6;
  const target = V.add(T6.p, Q.rot(T6.q, [25, 5, 3.4]));
  const elbow = V.add(T6.p, Q.rot(T6.q, [15, -15, 19]));
  const extra = (Wx) => V.sub(Wx.elbow_r.p, elbow).map((v) => v * 0.8);
  const p = L.armToTarget(pose, target, { wrist: { pron: -60, flex: 0, dev: 5 }, axial: 25, axialW: 0.005, guess: [80, 30, 40], extra });
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); });
  return p;
}
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
// Pelvis height that gives the wanted knee bend (bisection: knee flexion falls monotonically as the pelvis rises).
function rootYFor(pose, knee, contacts) {
  let a = 20, b = 100;
  for (let i = 0; i < 60; i++) { const y = (a + b) / 2, p = clone(pose); p.root.pos[1] = y; if (kneeOf(L.fk(p, contacts), 'r') > knee) a = y; else b = y; }
  return r1((a + b) / 2);
}
// Knee line from the front: + = knee outside the foot's long axis, - = inside (caving).
const nFoot = [-Math.sin(TOE * R.DEG), 0, Math.cos(TOE * R.DEG)];
const kneeLine = (W) => V.dot(V.sub(W.knee_r.p, W.ankle_r.p), nFoot);

/* ---------------- Pole: knee over the 2nd-3rd toe at the bottom ---------------- */
let lo = TOE, hi = 75, POLE = TOE;
const bottomBase = trunk(1);
for (let i = 0; i < 40; i++) {
  POLE = (lo + hi) / 2;
  const c = mkContacts(POLE), p = clone(bottomBase); p.root.pos[1] = rootYFor(p, KNEE_BOTTOM, c);
  if (kneeLine(L.fk(p, c)) < KNEE_OUT) lo = POLE; else hi = POLE;
}
POLE = r1(POLE);
const contacts = mkContacts(POLE);
const Y_TOP = rootYFor(trunk(0), KNEE_TOP, contacts), Y_BOTTOM = rootYFor(bottomBase, KNEE_BOTTOM, contacts);

/* ---------------- Leg channels that reproduce the IK legs (stored data matches what is drawn) ---------------- */
const LEG_PATHS = (s) => [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
function fitLegs(pose) {
  const Wi = L.fk(pose, contacts);
  let q = pose;
  for (const s of ['r', 'l']) {
    const objs = [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2)];
    q = L.solvePose(q, LEG_PATHS(s), objs, { iters: 200 }).pose;
  }
  return q;
}

/* ---------------- Key poses by depth (pelvis height fraction) ---------------- */
let armCh = null;
function poseAt(f) {
  let p = trunk(f);
  p.root.pos[1] = r1(Y_TOP + (Y_BOTTOM - Y_TOP) * f);
  if (!armCh) { const a = clasp(p); armCh = {}; ['shoulder', 'elbow', 'wrist'].forEach((j) => ['r', 'l'].forEach((s) => { armCh[`${j}_${s}`] = a.ch[`${j}_${s}`]; })); }
  Object.assign(p.ch, clone(armCh));     // arm channels are relative to the chest, so one clasp fits every depth
  p = fitLegs(p);
  return p;
}
const DEPTHS = { stand: 0, lower12: 0.12, lower30: 0.3, lower48: 0.48, lower66: 0.66, lower84: 0.84, bottom: 1, rise50: 0.5 };
const poses = {};
for (const [name, f] of Object.entries(DEPTHS)) poses[name] = poseAt(f);
// Bottom pause: a slight settle (0.3 cm) so the hold reads as alive, not frozen.
poses.bottomSettle = clone(poses.bottom); poses.bottomSettle.root.pos[1] = r1(poses.bottom.root.pos[1] - 0.3);
poses.bottomSettle = fitLegs(poses.bottomSettle);

const keyframes = [
  { t: 0, pose: 'stand' }, { t: 1.0, pose: 'stand' },
  // 3 s lowering at a near-constant speed, easing in and out at the ends
  { t: 1.5, pose: 'lower12' }, { t: 2.0, pose: 'lower30' }, { t: 2.5, pose: 'lower48' }, { t: 3.0, pose: 'lower66' }, { t: 3.5, pose: 'lower84' }, { t: 4.0, pose: 'bottom' },
  { t: 4.25, pose: 'bottomSettle' }, { t: 4.5, pose: 'bottom' },
  // stand up in about 1 s
  { t: 5.05, pose: 'rise50' }, { t: 5.6, pose: 'stand' }, { t: 8, pose: 'stand' },
];

/* ---------------- Module ---------------- */
const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks,
};

/* ---------------- Report + self-checks ---------------- */
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset);
const tl = R.buildTimeline(ex);
let floor = 1e9, floorAt = null, knee = [999, 0], line = [999, -999], dorsi = 0, feet = 0, elbowThigh = 1e9;
const W0 = R.evalPose(rig, tl.pose(0), contacts);
for (let i = 0; i <= 1600; i++) {
  const t = (i / 1600) * 8, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts);
  const f = L.shapeMinY(W); if (f.y < floor) { floor = f.y; floorAt = [f.id, +t.toFixed(2)]; }
  const k = kneeOf(W, 'r'); knee = [Math.min(knee[0], k, kneeOf(W, 'l')), Math.max(knee[1], k, kneeOf(W, 'l'))];
  if (k > 30) { const kl = kneeLine(W); line = [Math.min(line[0], kl), Math.max(line[1], kl)]; }
  dorsi = Math.max(dorsi, ANKLE_REST - V.angle(V.sub(W.knee_r.p, W.ankle_r.p), V.sub(W.toe_r.p, W.ankle_r.p)));
  for (const j of ['ankle_r', 'ankle_l', 'toe_r', 'toe_l']) feet = Math.max(feet, V.len(V.sub(W[j].p, W0[j].p)));
  // elbow clearance from the thigh axis (thigh capsule radius about 7-8 cm)
  const a = W.hip_r.p, b = W.knee_r.p, e = W.elbow_r.p, ab = V.sub(b, a), u = Math.max(0, Math.min(1, V.dot(V.sub(e, a), ab) / V.dot(ab, ab)));
  elbowThigh = Math.min(elbowThigh, V.len(V.sub(e, V.add(a, V.scale(ab, u)))));
}
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts);
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const thigh = V.sub(Wb.knee_r.p, Wb.hip_r.p), thighIncl = Math.asin(-thigh[1] / V.len(thigh)) / R.DEG;
const hb = poses.bottom.ch.hip_r, ht = poses.stand.ch.hip_r;
const hipM = (W) => R.measures(W).hip;
const kin = ex.exercise.kinematics, set = (prefix, field, v) => { const r = kin.find((x) => x.measure.startsWith(prefix)); if (r) r[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm (≈${(2 * STANCE / SHOULDER_W).toFixed(1)}x the rig's ${Math.round(SHOULDER_W)} cm shoulder width)`);
set('Toe-out', 'setup', `${TOE}°`);
set('Knee flexion', 'setup', `≈${Math.round(kneeOf(Wt, 'r'))}°`);
set('Knee flexion', 'peak', `≈${Math.round(knee[1])}° (thigh ${Math.abs(thighIncl).toFixed(0)}° ${thighIncl >= 0 ? 'below' : 'above'} horizontal)`);
set('Hip flexion', 'setup', `≈${Math.round(ht.flex)}°`);
set('Hip flexion', 'peak', `≈${Math.round(hb.flex)}° (joint channel, as in the HUD); ≈${Math.round(hipM(Wb))}° between thigh and trunk line`);
const thighOut = (W) => Math.asin(V.dot(V.norm(V.sub(W.knee_r.p, W.hip_r.p)), Q.rot(W.pelvis.q, [0, 0, 1]))) / R.DEG; // thigh angle out of the pelvis sagittal plane
set('Hip abduction', 'setup', `≈${Math.round(thighOut(Wt))}° (set by the stance)`);
set('Hip abduction', 'peak', `≈${Math.round(thighOut(Wb))}° (thigh angle out of the sagittal plane, knees pushed out over the toes)`);
set('Trunk inclination', 'setup', `≈${Math.round(trunkLean(Wt))}°`);
set('Trunk inclination', 'peak', `≈${Math.round(trunkLean(Wb))}° forward`);
set('Knee line', 'peak', `Knee ${line[1].toFixed(1)} cm outside the foot's long axis at the bottom; at most ${Math.abs(line[0]).toFixed(1)} cm inside it early in the descent (knee under 45°)`);
set('Tempo', 'setup', 'Stand 1.0 s');
set('Tempo', 'peak', '3.0 s down, 0.5 s pause, 1.1 s up, 2.4 s reset');
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
console.log(`3 Sec Sumo Squat: pole ${POLE}° rootY ${Y_TOP} -> ${Y_BOTTOM}  wrote ${L.write(ex)}`);
console.log(`  bottom: knee ${kneeOf(Wb, 'r').toFixed(1)} hipMeasure ${hipM(Wb).toFixed(1)} hipCh ${JSON.stringify(hb)} trunk ${trunkLean(Wb).toFixed(1)} thighIncl ${thighIncl.toFixed(1)} knee ${Wb.knee_r.p.map(r1)} toe ${Wb.toe_r.p.map(r1)}`);
console.log(`  arms R ${JSON.stringify({ sh: armCh.shoulder_r, el: armCh.elbow_r, wr: armCh.wrist_r })}`);
console.log(`  check ${JSON.stringify({ floor: +floor.toFixed(2), floorAt, knee: knee.map(Math.round), kneeLine: line.map((v) => +v.toFixed(1)), maxDorsi: +dorsi.toFixed(1), feetDrift: +feet.toFixed(3), elbowThigh: +elbowThigh.toFixed(1) })}`);
if (dorsi > 34) { console.error('FAIL: ankle dorsiflexion beyond the rig limit'); process.exitCode = 1; }
if (feet > 0.05) { console.error('FAIL: feet move'); process.exitCode = 1; }
