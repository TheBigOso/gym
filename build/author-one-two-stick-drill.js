// 1 2 Stick Drill (GymVisual #596513): continuous lateral quick feet down a row of floor sticks,
// two contacts per gap (lead foot, then trail foot), quarter-squat athletic stance, hands clasped at the chest.
// Down the row leading with the right foot, short stop, back leading with the left. Bilateral (one clip).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const meta = require('./meta/one-two-stick-drill.json');

/* ---------------- Layout (cm) ---------------- */
const STICKS = meta.props.filter((p) => p.kind === 'stick').map((p) => p.center[2]).sort((a, b) => a - b);
const SPACING = STICKS[1] - STICKS[0];             // 40 cm between sticks
const HALF = 9;                                    // feet 18 cm apart (hip-width) when together in a gap
const STICK_D = meta.props.find((p) => p.kind === 'stick').size[1];
// Centres of the stance: outside the left end, each gap, outside the right end.
const CENTRES = [STICKS[0] - SPACING / 2, ...STICKS.slice(1).map((z, i) => (z + STICKS[i]) / 2), STICKS[STICKS.length - 1] + SPACING / 2];

/* ---------------- Feet: on the balls of the feet (heel up) ---------------- */
const HEEL_UP = 10;                                // planted foot pitched 10° heel-up
const footQ = (pitch) => Q.mul(L.footRot(0), Q.axis([0, 0, 1], -pitch)); // pitch > 0 = heel up / toes down
const qArr = (q) => q.map((v) => +v.toFixed(6));
const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { handRot: qArr(footQ(HEEL_UP)) }));
const footShape = (s) => rig.shapes.find((x) => x.id === `foot_${s}`);
const footMinY = (W, s) => { const g = R.shapeWorld(W, footShape(s)); return g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
// Ankle height that puts the ball of a 10° heel-up foot on the floor.
const ANK = (() => {
  const st = L.POSES.standing({ stance: HALF });
  const p = clone(st.pose); p.ik.leg_r.target = [0, 10, HALF];
  return r1(10 - footMinY(L.fk(p, contacts), 'r') + 0.1);
})();

/* ---------------- Leg channels that reproduce a foot placement (so IK weight blends are seamless) ---------------- */
const LEG_PATHS = (s) => [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
function fitLeg(pose, s, ankle, pitch) {
  const c = Object.assign(L.legContact(s), { handRot: footQ(pitch) });
  const q = clone(pose); q.ik = { [c.id]: { target: ankle, weight: 1 } };
  const Wi = R.evalPose(rig, q, [c]);
  const K = Wi[`knee_${s}`].p, A = Wi[`ankle_${s}`].p, T = Wi[`toe_${s}`].p;
  const res = L.solvePose(pose, LEG_PATHS(s), [L.obj.at(`knee_${s}`, K, 2), L.obj.at(`ankle_${s}`, A, 3), L.obj.at(`toe_${s}`, T, 2), L.obj.reg(`ch.hip_${s}.rot`, 0, 0.02)], { iters: 200 });
  return res.pose;
}

/* ---------------- Base athletic stance ---------------- */
const PITCH = -25;                                 // pelvis tipped forward: hip hinge
const FOOT_X = 1.5;                                // ankle just ahead of the hip joint
const KNEE_TARGET = 42;                            // quarter squat (research design estimate 30-45°)
const st = L.POSES.standing({ stance: HALF, toeOut: 0 });
const base = clone(st.pose);
base.root.rot = { pitch: PITCH };
Object.assign(base.ch, {
  spine_l5: { rot: 0, flex: -3, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: -1, latFlex: 0 },
  neck_c7: { rot: 0, flex: -6 }, head_c1: { rot: 0, flex: -7 }, sc_r: { protract: 6, elevate: 2 }, sc_l: { protract: 6, elevate: 2 },
});
base.ik = { leg_r: { target: [FOOT_X, ANK, HALF], weight: 1 }, leg_l: { target: [FOOT_X, ANK, -HALF], weight: 1 } };
{
  const s = L.solvePose(base, ['root.pos.1'], [(W) => [(R.measures(W).knee - KNEE_TARGET) * 0.5]], { contacts });
  base.root.pos[1] = s.pose.root.pos[1];
}
const PELVIS_Y = base.root.pos[1];

// Hands clasped in front of the chest: right wrist just right of the midline, palm facing in, fingers up and forward.
function clasp(pose) {
  const W = L.fk(pose), T6 = W.spine_t6;
  const target = V.add(T6.p, Q.rot(T6.q, [25, 5, 3.4]));
  const elbow = V.add(T6.p, Q.rot(T6.q, [15, -15, 19]));        // elbows down, slightly forward and out from the ribs
  const extra = (Wx) => V.sub(Wx.elbow_r.p, elbow).map((v) => v * 0.8);
  const p = L.armToTarget(pose, target, { wrist: { pron: -60, flex: 0, dev: 5 }, axial: 25, axialW: 0.005, guess: [80, 30, 40], extra });
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); });
  return p;
}
{ let q = base; for (const sd of ['r', 'l']) q = fitLeg(q, sd, base.ik[`leg_${sd}`].target, HEEL_UP); base.ch = q.ch; }
const armed = clasp(base);
['shoulder', 'elbow', 'wrist'].forEach((j) => { base.ch[`${j}_r`] = armed.ch[`${j}_r`]; base.ch[`${j}_l`] = armed.ch[`${j}_l`]; });

/* ---------------- Choreography ---------------- */
const T_CONTACT = 0.28;                           // one foot contact every 0.28 s (about 3.6 per second)
const SETUP_END = 0.8, PASS1 = SETUP_END, PASS_LEN = 10 * T_CONTACT, STOP1 = PASS1 + PASS_LEN, PASS2 = STOP1 + 0.6, STOP2 = PASS2 + PASS_LEN, DUR = 8;
const LIFT = { lift: 4, apex: 9, preland: 3 };
const keys = [];                                   // { t, name, feet: {r:{z,lift,pitch,w}, l:{...}}, dip }
const planted = (z) => ({ z, lift: 0, pitch: HEEL_UP, w: 1 });
const feet = { r: planted(CENTRES[0] + HALF), l: planted(CENTRES[0] - HALF) };
const snap = (t, name, dip = 0, over = {}) => {
  const k = { t: +t.toFixed(3), name, dip, feet: { r: Object.assign({}, feet.r, over.r), l: Object.assign({}, feet.l, over.l) } };
  if (keys.length && keys[keys.length - 1].t === k.t) keys[keys.length - 1] = Object.assign(k, { name: keys[keys.length - 1].name }); // one key per instant
  else keys.push(k);
};

// One contact: `s` steps from its current spot to zTo, clearing the stick in between.
function contact(t0, s, zTo, name) {
  const z0 = feet[s].z, dz = zTo - z0, zs = STICKS.find((z) => (z - z0) * (z - zTo) < 0);
  const frac = (zs - z0) / dz, tApex = Math.min(0.15, Math.max(0.085, 0.04 + 0.15 * frac));
  snap(t0, `${name}_push`, 0);
  snap(t0 + 0.04, `${name}_lift`, 0, { [s]: { z: z0 + Math.sign(dz) * 1.5, lift: LIFT.lift, pitch: 22, w: 0 } });
  snap(t0 + tApex, `${name}_clear`, 0.3, { [s]: { z: zs, lift: LIFT.apex, pitch: 12, w: 0 } });
  snap(t0 + 0.19, `${name}_reach`, 0.4, { [s]: { z: zTo - Math.sign(dz) * 2.5, lift: LIFT.preland, pitch: 14, w: 0 } });
  // Touch-down: the target is already on its final spot while the weight ramps to 1, so the foot never slides once planted.
  snap(t0 + 0.205, `${name}_touch`, 0.6, { [s]: { z: zTo, lift: 0, pitch: HEEL_UP, w: 0.85 } });
  feet[s] = planted(zTo);
  snap(t0 + 0.23, `${name}_land`, 0.8);
}
function pass(tStart, dir) {
  const lead = dir > 0 ? 'r' : 'l', trail = dir > 0 ? 'l' : 'r', order = dir > 0 ? CENTRES.slice(1) : CENTRES.slice(0, -1).reverse();
  const tag = dir > 0 ? 'right' : 'left';
  order.forEach((c, i) => {
    const t0 = tStart + i * 2 * T_CONTACT, gap = i < order.length - 1 ? `gap${dir > 0 ? i + 1 : order.length - 1 - i}` : 'out';
    contact(t0, lead, c + dir * HALF, `${tag}_${gap}_lead`);
    contact(t0 + T_CONTACT, trail, c - dir * HALF, `${tag}_${gap}_trail`);
  });
}
snap(0, 'ready'); snap(SETUP_END, 'ready');
pass(PASS1, +1);
snap(STOP1 + 0.05, 'stop_right', 0.8); snap(STOP1 + 0.3, 'settle_right', 1.6); snap(PASS2, 'ready_right', 0);
pass(PASS2, -1);
snap(STOP2 + 0.05, 'stop_left', 0.8); snap(STOP2 + 0.45, 'settle_left', 1.6); snap(DUR, 'ready');

/* ---------------- Solve one pose per key ---------------- */
const poses = {}, keyframes = [];
for (const k of keys) {
  const p = clone(base);
  p.root.pos = [0, r1(PELVIS_Y - k.dip), r1((k.feet.r.z + k.feet.l.z) / 2)];
  let q = p;
  for (const s of ['r', 'l']) {
    const f = k.feet[s], ank = [FOOT_X, r1(ANK + f.lift), r1(f.z)];
    q = fitLeg(q, s, ank, f.pitch);
    q.ik[`leg_${s}`] = { target: f.w >= 1 ? [FOOT_X, ANK, r1(f.z)] : ank, weight: f.w };
  }
  // Hold frames re-use a pose name; a name only gets a suffix if its pose differs.
  const name = k.name in poses && JSON.stringify(poses[k.name]) !== JSON.stringify(q) ? `${k.name}_${keyframes.length}` : k.name;
  poses[name] = q; keyframes.push({ t: k.t, pose: name });
}

/* ---------------- Activation: contact-synced pulses for the prime movers ---------------- */
const activation = clone(meta.activation);
const inPass = (t) => (t >= PASS1 && t <= STOP1 + 0.1) || (t >= PASS2 && t <= STOP2 + 0.1);
for (const s of ['r', 'l']) {
  const pts = { calves: [], quads: [] };
  for (let i = 0; i <= DUR * 25; i++) {
    const t = i / 25, k = keys.reduce((a, b) => (b.t <= t ? b : a));
    const swing = k.feet[s].w < 1, other = k.feet[s === 'r' ? 'l' : 'r'].w < 1;
    let calves = 0.35, quads = 0.45;               // holding the quarter squat on the balls of the feet
    if (inPass(t)) { calves = swing ? 0.4 : other ? 1 : 0.75; quads = swing ? 0.45 : other ? 0.95 : 0.75; }
    pts.calves.push([+t.toFixed(2), calves]); pts.quads.push([+t.toFixed(2), quads]);
  }
  // keep only value changes (plus ends) so the curves stay compact
  for (const m of ['calves', 'quads']) activation[`${m}_${s}`] = pts[m].filter((p, i, a) => i === 0 || i === a.length - 1 || p[1] !== a[i - 1][1] || p[1] !== a[i + 1][1]);
}

/* ---------------- Module ---------------- */
const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation, guides: meta.guides, checks: meta.checks,
};

/* ---------------- Report + self-checks ---------------- */
const tl = R.buildTimeline(ex);
let clear = 1e9, clearAt = null, floor = 1e9, floorAt = null, knee = [999, 0], kneeStance = [999, 0], travel = 0, headBob = [1e9, -1e9], cross = 1e9;
const W0 = R.evalPose(rig, tl.pose(0), contacts);
for (let i = 0; i <= 1600; i++) {
  const t = (i / 1600) * DUR, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts), m = R.measures(W);
  for (const s of ['r', 'l']) {
    const az = W[`ankle_${s}`].p[2], fy = footMinY(W, s);
    for (const zs of STICKS) if (Math.abs(az - zs) < 4.6 + STICK_D / 2 + 0.5) { const c = fy - STICK_D; if (c < clear) { clear = c; clearAt = [s, +t.toFixed(3), zs]; } }
  }
  const f = L.shapeMinY(W); if (f.y < floor) { floor = f.y; floorAt = [f.id, +t.toFixed(2)]; }
  const kl = 180 - V.angle(V.sub(W.hip_l.p, W.knee_l.p), V.sub(W.ankle_l.p, W.knee_l.p));
  knee = [Math.min(knee[0], m.knee, kl), Math.max(knee[1], m.knee, kl)];
  if (pose.ik.leg_r.weight >= 0.999 && pose.ik.leg_l.weight >= 0.999) kneeStance = [Math.min(kneeStance[0], m.knee, kl), Math.max(kneeStance[1], m.knee, kl)];
  travel = Math.max(travel, V.len(V.sub(W.pelvis.p, W0.pelvis.p)));
  headBob = [Math.min(headBob[0], W.head_c1.p[1]), Math.max(headBob[1], W.head_c1.p[1])];
  cross = Math.min(cross, W.ankle_r.p[2] - W.ankle_l.p[2]);
}
const B = L.fk(base, contacts), mB = R.measures(B);
const trunk = V.angle(V.sub(B.neck_c7.p, B.pelvis.p), [0, 1, 0]);
const kin = ex.exercise.kinematics, set = (measure, field, v) => { const r = kin.find((x) => x.measure === measure); if (r) r[field] = v; };
set('Knees', 'setup', `≈${Math.round(mB.knee)}°`);
set('Knees', 'peak', `${Math.round(kneeStance[0])}–${Math.round(kneeStance[1])}° on the ground; up to ≈${Math.round(knee[1])}° on the swing leg`);
set('Hips', 'setup', `≈${Math.round(base.ch.hip_r.flex)}°`);
set('Trunk inclination', 'setup', `≈${Math.round(trunk)}° forward`);
set('Trunk inclination', 'peak', `≈${Math.round(trunk)}° forward (unchanged)`);
set('Lateral travel per pass', 'peak', `${Math.round(travel)} cm (5 moves × ${SPACING} cm)`);
set('Head height change', 'peak', `${(headBob[1] - headBob[0]).toFixed(1)} cm`);
set('Swing foot clearance over a stick', 'peak', `≥${clear.toFixed(1)} cm`);
console.log(`1-2 Stick Drill: ANK ${ANK} pelvisY ${PELVIS_Y} hipFlex ${base.ch.hip_r.flex} knee ${mB.knee.toFixed(1)} trunk ${trunk.toFixed(1)}° keys ${keyframes.length} poses ${Object.keys(poses).length}  wrote ${L.write(ex)}`);
console.log(`  arms R`, JSON.stringify({ sh: base.ch.shoulder_r, el: base.ch.elbow_r, wr: base.ch.wrist_r }));
console.log(`  check ${JSON.stringify({ stickClearance: +clear.toFixed(2), clearAt, floor: +floor.toFixed(2), floorAt, knee: knee.map(Math.round), kneeStance: kneeStance.map(Math.round), travel: +travel.toFixed(1), headBob: +(headBob[1] - headBob[0]).toFixed(2), minFootGap: +cross.toFixed(1) })}`);
if (clear < 0.5) { console.error('FAIL: swing foot does not clear a stick'); process.exitCode = 1; }
if (cross < 12) { console.error('FAIL: feet too close or crossing'); process.exitCode = 1; }
