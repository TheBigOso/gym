// 3 Leg Chaturanga Pose (GymVisual #591513): high plank -> downward dog -> three-legged dog (right leg up)
// -> shift forward over the hands -> lower to chaturanga with the leg still up -> press back to plank, leg down.
// Hands stay planted (constant targets). The right foot is planted except while lifted (leg contact weight).
// The left foot stays planted on the ball of the foot: its ankle target is constant from plank through
// three-legged dog. With both hands and the foot fixed, a straight body cannot move its shoulders ahead of the wrists,
// so for the forward shift the foot rolls over the toes (ankle on an arc around the toe point, foot orientation keyed
// with ik.leg_l.handRot; the contact point travels about 1 cm along the mat), then rolls back for the press to plank.
const L = require('./lib');
const { R, V, Q, rig, r1, clone, fk, solvePose, obj, reach } = L;
const meta = require('./meta/three-leg-chaturanga-pose.json');

const LEG_D = 83.32;            // hip-to-ankle distance for planted legs (knees straight but not locked, ~7 deg)
const ARM_D = reach(10);        // shoulder-to-wrist distance for straight (soft) arms
const ROLL = 60;                // left-foot roll over the toes for the forward shift (deg)
const CHAT_SY = 31.5;           // shoulder joint height at the bottom of chaturanga (cm)
const LIFT = 12;                // lifted leg sits this many degrees above the body line

/* ---------- Base: POSES.plank(), knees and elbows softened slightly so planted IK limbs keep a margin ---------- */
const P = L.POSES.plank();
const base = clone(P.pose);
base.root.pos[1] = r1(base.root.pos[1] - 0.2);   // shoulders 0.2 cm lower -> elbows ~10 deg soft, not locked
const W0 = fk(base);
const WR = base.ik.arm_r.target, WL = base.ik.arm_l.target;
const footQ = { r: W0.ankle_r.q.map((v) => +v.toFixed(6)), l: W0.ankle_l.q.map((v) => +v.toFixed(6)) };
const anchor = (s) => { const H = W0[`hip_${s}`].p, A = W0[`ankle_${s}`].p; return V.add(H, V.scale(V.norm(V.sub(A, H)), LEG_D)).map(r1); };
const AR = anchor('r'), AL0 = anchor('l');
const toeOf = (A, q) => V.add(A, Q.rot(q, rig.byId.toe_l.offset));
const TL = toeOf(AL0, footQ.l);                 // left toe (ball of foot) point: the roll pivot
// Left foot rolled forward by rho degrees over the toes (rotation about world Z). The ankle is lifted just enough
// that the front of the foot shape stays on the mat, so the foot rolls on its toe tip instead of sinking in.
const footShape = rig.shapes.find((x) => x.id === 'foot_l');
const footMin = (A, q) => { const g = R.shapeWorld({ ankle_l: { p: A, q } }, footShape); return g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
const FOOT_MIN0 = footMin(AL0, footQ.l);
function rolled(rho) {
  const qz = Q.axis([0, 0, 1], -rho), q = Q.norm(Q.mul(qz, footQ.l));
  let A = V.add(TL, Q.rot(qz, V.sub(AL0, TL)));
  A = V.add(A, [0, Math.max(0, FOOT_MIN0 - footMin(A, q)), 0]);
  return { target: A.map((v) => +v.toFixed(2)), handRot: q.map((v) => +v.toFixed(6)) };
}
const contacts = [
  Object.assign(L.handContact('r'), { pole: [-1, 0.05, 0.12] }),
  Object.assign(L.handContact('l'), { pole: [-1, 0.05, -0.12] }),
  Object.assign(L.legContact('r'), { pole: [0.3, -1, 0.08], handRot: footQ.r }), // knees toward the mat (prone)
  Object.assign(L.legContact('l'), { pole: [0.3, -1, -0.08], handRot: footQ.l }),
];
base.ch.ankle_r = { dorsi: 10 }; base.ch.ankle_l = { dorsi: 10 };
base.ik = { arm_r: { target: WR, weight: 1 }, arm_l: { target: WL, weight: 1 }, leg_r: { target: AR, weight: 1 }, leg_l: { target: AL0, weight: 1 } };

/* ---------- helpers ---------- */
const SPINE = ['spine_l5', 'spine_t12', 'spine_t6'];
const setSpine = (p, f) => { SPINE.forEach((j, i) => { p.ch[j] = { rot: 0, latFlex: 0, flex: r1(f * [0.3, 0.35, 0.35][i]) }; }); };
const trunkDir = (W) => V.norm(V.sub(W.neck_c7.p, W.pelvis.p));
const midS = (W) => V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5);
const dist = (a, b) => V.len(V.sub(a, b));
// Residuals for the planted limbs (distances, not IK, so the solve stays smooth).
const armRes = (d, w = 4) => (W) => [(dist(W.shoulder_r.p, WR) - d) * w, (dist(W.shoulder_l.p, WL) - d) * w];
const legRes = (s, A, w = 4) => (W) => [(dist(W[`hip_${s}`].p, A) - LEG_D) * w];
let PLANK_TL = 0; // trunk-to-leg angle of the base plank: 'one straight line' for this rig
// Signed sagittal angle from the leg line (ankle -> hip) to the trunk (pelvis -> C7): + = pike, - = sag.
const sagAngle = (a, b) => Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / R.DEG;
const bodyBend = (W, A) => sagAngle(V.sub(W.hip_l.p, A), trunkDir(W));
const straightBody = (A, w = 3, pike = 0) => (W) => [(bodyBend(W, A) - PLANK_TL - pike) * w * 0.1];

// Store FK leg channels that match the IK solution (used for weight blending and the joint-limit / hip measures).
function matchLeg(pose, s) {
  const Wi = fk(pose, contacts), p = clone(pose);
  const set = (x) => { const q = clone(p); q.ch[`hip_${s}`] = { flex: x[0], abd: x[1], rot: x[2] }; q.ch[`knee_${s}`] = { flex: x[3] }; q.ch[`ankle_${s}`] = { dorsi: x[4] }; return q; };
  const res = (x) => { const W = fk(set(x)); return [...V.sub(W[`knee_${s}`].p, Wi[`knee_${s}`].p), ...V.sub(W[`ankle_${s}`].p, Wi[`ankle_${s}`].p), ...V.sub(W[`toe_${s}`].p, Wi[`toe_${s}`].p).map((v) => v * 0.15)].concat([x[1] * 0.05, x[2] * 0.05]); };
  const c = p.ch[`hip_${s}`] || {}, x0 = [c.flex || 0, c.abd || 0, c.rot || 0, (p.ch[`knee_${s}`] || {}).flex || 5, (p.ch[`ankle_${s}`] || {}).dorsi || 0];
  const x = R.solveLM(x0, res, { iters: 300 }).x.map(L.wrap).map(r1);
  return set(x);
}
// Right leg lifted in line with the body (plus LIFT deg), hips square: FK only (contact weight 0).
function liftRight(pose, lift = LIFT, dorsi = -55) {
  const p = clone(pose);
  p.ch.knee_r = { flex: 3 }; p.ch.ankle_r = { dorsi };
  p.ch.hip_r = { flex: (p.ch.hip_r || {}).flex || 0, abd: 0, rot: 0 };
  const t = trunkDir(fk(p)), want = V.norm(V.add(V.scale(t, -1), V.scale(upOf(t), Math.tan(lift * R.DEG))));
  const s = solvePose(p, ['ch.hip_r.flex'], [(Wx) => V.sub(V.norm(V.sub(Wx.knee_r.p, Wx.hip_r.p)), want).map((v) => v * 20)]);
  s.pose.ik.leg_r = { target: AR, weight: 0 };
  return s.pose;
}
// Dorsal ("up" for a prone body) direction perpendicular to the trunk, in the sagittal plane.
function upOf(t) { let u = V.norm(V.cross([0, 0, 1], t)); if (u[1] < 0) u = V.scale(u, -1); return u; }
function head(p, flex, rot = 0) { p.ch.neck_c7 = { rot: 0, flex: r1(flex * 0.45) }; p.ch.head_c1 = { rot, flex: r1(flex * 0.55) }; return p; }
function sc(p, protract, elevate) { p.ch.sc_r = { protract, elevate }; p.ch.sc_l = { protract, elevate }; return p; }
const finish = (p, footL) => { p.ik.leg_l = Object.assign({ weight: 1 }, footL || rolled(0)); let q = matchLeg(p, 'l'); if (q.ik.leg_r.weight === 1) q = matchLeg(q, 'r'); return q; };

/* ---------- Key poses ---------- */
const poses = {};
poses.plank = finish(head(clone(base), 4));
PLANK_TL = bodyBend(fk(poses.plank, contacts), AL0);

// Downward dog family: hips up and back, arms in line with the trunk, feet on the balls (heels lifted).
function dogPose(u) {
  const p = clone(base);
  setSpine(p, -6 * u);
  sc(p, r1(6 - 4 * u), r1(10 * u));
  head(p, r1(4 + 10 * u));
  p.root.rot.pitch = r1(base.root.rot.pitch + (u * ((u < 1 ? DOG_PITCH : -135) - base.root.rot.pitch)));
  const s = solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [armRes(ARM_D), legRes('l', AL0), legRes('r', AR), obj.reg('root.rot.pitch', p.root.rot.pitch, u < 1 ? 3 : 0)].concat(u < 1 ? [] : [
    // arms in line with the trunk (shoulder flexion ~170 deg)
    (W) => [(V.angle(trunkDir(W), V.sub(WR, W.shoulder_r.p)) - 4) * 0.15],
  ]));
  return finish(s.pose);
}
const ease = (f) => f * f * (3 - 2 * f);
const DOG_T = [0.6, 1.8], DOG_N = 6;
let DOG_PITCH = 0;
const dogFinal = dogPose(1); DOG_PITCH = dogFinal.root.rot.pitch;
for (let i = 1; i < DOG_N; i++) poses[`dog${i}`] = dogPose(ease(i / DOG_N));
poses.dog = dogFinal;
const dogPitch = poses.dog.root.rot.pitch;
// Three-legged dog: same frame, right leg straight up behind in line with the trunk, hips square.
poses.tld = liftRight(poses.dog, 4, -50);

// Forward shift: hips come down and forward into a three-legged plank with the shoulders ahead of the wrists,
// rolling the left foot over the toes. Intermediate keys are solved, so the limbs stay planted all the way.
function shiftPose(u) {
  const p = clone(poses.dog);
  setSpine(p, -6 * (1 - u));
  sc(p, r1(2 + 6 * u), r1(10 * (1 - u)));
  head(p, r1(14 - 16 * u));
  const foot = rolled(ROLL * u);
  const objs = [armRes(ARM_D), legRes('l', foot.target)];
  if (u < 1) { p.root.rot.pitch = r1(dogPitch + u * (TLP_PITCH - dogPitch)); objs.push(obj.reg('root.rot.pitch', p.root.rot.pitch, 3)); }
  else { p.root.pos = base.root.pos.slice(); p.root.rot.pitch = -76; objs.push(straightBody(foot.target)); }
  const s = solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], objs);
  s.pose.ik.leg_r = { target: AR, weight: 0 };
  return finish(liftRight(s.pose, 4 + (LIFT - 4) * u, -50 - 5 * u), foot);
}
const SHIFT_T = [3.7, 4.9], SHIFT_N = 8;
let TLP_PITCH = 0;
const tlpFinal = shiftPose(1); TLP_PITCH = tlpFinal.root.rot.pitch;
for (let i = 1; i < SHIFT_N; i++) poses[`shift${i}`] = shiftPose(ease(i / SHIFT_N));
poses.tlp = tlpFinal;

// Lowering: shoulders come down (and a little forward) to elbow height, elbows hug the ribs, body stays in one line.
const footRolled = rolled(ROLL);
function lowerPose(u, sy) {
  const p = clone(poses.tlp);
  sc(p, r1(8 - 2 * u), 0);
  head(p, r1(-2 - 6 * u));
  const s = solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [legRes('l', footRolled.target), straightBody(footRolled.target), obj.atY('shoulder_r', sy, 4)]);
  s.pose.ik.leg_r = { target: AR, weight: 0 };
  return finish(liftRight(s.pose, LIFT, -55), footRolled);
}
const SY_TLP = fk(poses.tlp).shoulder_r.p[1];
poses.low1 = lowerPose(0.5, (SY_TLP + CHAT_SY) / 2);
poses.chat = lowerPose(1, CHAT_SY);
// Breath at the bottom: hold the shape (tiny settle).
poses.chatHold = lowerPose(1, CHAT_SY + 0.5);

// Press back to plank: shoulders rise and move back over the wrists, the foot rolls back, the right leg comes down.
function pressPose(u) {
  const SY0 = CHAT_SY, SY1 = fk(poses.plank).shoulder_r.p[1];
  const p = clone(poses.chat);
  sc(p, r1(6 + 0 * u), 0);
  head(p, r1(-8 + 12 * u));
  const foot = rolled(ROLL * (1 - u));
  const s = solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [legRes('l', foot.target), straightBody(foot.target), obj.atY('shoulder_r', SY0 + (SY1 - SY0) * u, 4)]);
  s.pose.ik.leg_r = { target: AR, weight: 0 };
  return finish(liftRight(s.pose, LIFT - 4 * u, -55 + 20 * u), foot);
}
poses.press1 = pressPose(0.25);
poses.press2 = pressPose(0.5);
poses.press3 = pressPose(0.75);

/* ---------- Timeline ---------- */
const keyframes = [
  { t: 0, pose: 'plank' }, { t: 0.6, pose: 'plank' },
  ...Array.from({ length: DOG_N - 1 }, (_, i) => ({ t: +(DOG_T[0] + ((DOG_T[1] - DOG_T[0]) * (i + 1)) / DOG_N).toFixed(3), pose: `dog${i + 1}` })), { t: 1.8, pose: 'dog' }, { t: 2.3, pose: 'dog' },
  { t: 3.2, pose: 'tld' }, { t: 3.7, pose: 'tld' },
  ...Array.from({ length: SHIFT_N - 1 }, (_, i) => ({ t: +(SHIFT_T[0] + ((SHIFT_T[1] - SHIFT_T[0]) * (i + 1)) / SHIFT_N).toFixed(3), pose: `shift${i + 1}` })), { t: 4.9, pose: 'tlp' },
  { t: 4.95, pose: 'tlp' }, { t: 5.5, pose: 'low1' }, { t: 6.0, pose: 'chat' }, { t: 6.35, pose: 'chatHold' },
  { t: 6.65, pose: 'press1' }, { t: 6.92, pose: 'press2' }, { t: 7.18, pose: 'press3' }, { t: 7.5, pose: 'plank' }, { t: 8, pose: 'plank' },
];

const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks,
};

/* ---------- Report + kinematics fill ---------- */
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_l.offset, -1), rig.byId.toe_l.offset);
const M = (name) => {
  const p = poses[name], W = fk(p, contacts), m = R.measures(W);
  const hipL = bodyBend(W, p.ik.leg_l.target);
  const elbowAhead = W.elbow_r.p[0] - WR[0], shAhead = midS(W)[0] - WR[0];
  const toe = W.toe_l.p, toeErr = dist(toe, TL);
  const dorsiL = ANKLE_REST - V.angle(V.sub(W.knee_l.p, W.ankle_l.p), V.sub(W.toe_l.p, W.ankle_l.p));
  return { name, elbowR: m.elbowR, sh: W.shoulder_r.p[1], el: W.elbow_r.p[1], shAhead, elbowAhead, hipFlexL: p.ch.hip_l.flex, hipFlexR: p.ch.hip_r.flex, trunkLeg: hipL, toeErr, dorsiL, armD: dist(W.shoulder_r.p, WR), legD: dist(W.hip_l.p, p.ik.leg_l.target), minY: L.shapeMinY(W), pitch: p.root.rot.pitch };
};
const rep = Object.keys(poses).map(M);
const kin = ex.exercise.kinematics, chat = rep.find((r) => r.name === 'chat'), dog = rep.find((r) => r.name === 'dog'), tld = rep.find((r) => r.name === 'tld');
const d = (v) => `≈${Math.round(v)}°`;
const byMeasure = (s) => kin.find((k) => k.measure.startsWith(s));
byMeasure('Elbow flexion').peak = `${d(chat.elbowR)} (shoulder joint ${Math.round(chat.sh - chat.el)} cm above the elbow)`;
byMeasure('Hip flexion').peak = `${d(dog.hipFlexL)} in downward dog (thighs to trunk ${d(180 + dog.trunkLeg)})`;
byMeasure('Lifted leg').peak = `In line with the trunk in three-legged dog (hip ${d(tld.hipFlexR)}); ${LIFT}° above the body line in chaturanga`;
// Wrist extension: angle between the forearm line (elbow -> wrist) and the flat hand (wrist -> fingertip).
const wristExt = (name) => { const W = fk(poses[name], contacts); return V.angle(V.sub(W.wrist_r.p, W.elbow_r.p), V.sub(W.handtip_r.p, W.wrist_r.p)); };
byMeasure('Wrist extension').setup = `${d(wristExt('plank'))} (palms flat, forearms vertical)`;
byMeasure('Wrist extension').peak = `${d(wristExt('plank'))} in plank, ${d(wristExt('dog'))} in dog, ${d(wristExt('chat'))} at the bottom of chaturanga`;
byMeasure('Shoulders ahead').peak = `≈${Math.round(chat.shAhead)} cm ahead of the wrists at the bottom`;
console.log(`wrote ${L.write(ex)}`);
for (const r of rep) console.log(`  ${r.name.padEnd(9)} pitch=${r.pitch} elbow=${r.elbowR.toFixed(0)} sh=${r.sh.toFixed(1)} el=${r.el.toFixed(1)} shAhead=${r.shAhead.toFixed(1)} elbowAhead=${r.elbowAhead.toFixed(1)} hipL=${r.hipFlexL} hipR=${r.hipFlexR} bend=${r.trunkLeg.toFixed(1)} dorsiL=${r.dorsiL.toFixed(0)} toeErr=${r.toeErr.toFixed(2)} armD=${r.armD.toFixed(2)} legD=${r.legD.toFixed(2)} minY=${r.minY.y.toFixed(1)}(${r.minY.id})`);
// Timeline sweep: planted-limb reach margins, left-foot contact point travel and floor.
const tl = R.buildTimeline(ex); let worst = { arm: 0, leg: 0, floor: 1e9 };
for (let i = 0; i <= 800; i++) {
  const t = (i / 800) * ex.timeline.duration, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts);
  const a = Math.max(dist(W.wrist_r.p, WR), dist(W.wrist_l.p, WL)); if (a > worst.arm) { worst.arm = a; worst.armAt = +t.toFixed(2); }
  let lg = dist(W.ankle_l.p, pose.ik.leg_l.target);
  if (pose.ik.leg_r.weight >= 0.999) lg = Math.max(lg, dist(W.ankle_r.p, AR));
  if (lg > worst.leg) { worst.leg = lg; worst.legAt = +t.toFixed(2); }
  // Left foot contact point (lowest point of the foot shape): how far it travels along the mat while rolling.
  const g = R.shapeWorld(W, footShape), n = Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]);
  const cp = g.axes.reduce((c, a) => V.sub(c, V.scale(a, a[1] / n)), g.c);
  worst.cx = [Math.min(worst.cx?.[0] ?? 1e9, cp[0]), Math.max(worst.cx?.[1] ?? -1e9, cp[0])]; worst.cy = Math.max(worst.cy ?? -1e9, cp[1]);
  const f = L.shapeMinY(W); if (f.y < worst.floor) { worst.floor = f.y; worst.floorAt = [f.id, +t.toFixed(2)]; }
}
console.log('  sweep', JSON.stringify(worst, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v)));
