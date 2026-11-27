// 2 to 1 Jump Box (GymVisual #420813): stand facing a 30 cm plyo box, countermovement dip with an arm swing,
// two-foot takeoff, land on the right foot on the box, stick, stand tall, step down backwards, reset.
const L = require('./lib');
const { R, V, Q, rig, r1, clone, fk, solvePose, obj } = L;
const meta = require('./meta/two-to-one-jump-box.json');

const A = L.ANKLE_H, HZ = rig.byId.hip_r.offset[2];
const TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
const bp = meta.props.find((p) => p.kind === 'box');
const BOX = { x0: bp.center[0] - bp.size[0] / 2, x1: bp.center[0] + bp.size[0] / 2, h: bp.size[1], z0: bp.center[2] - bp.size[2] / 2, z1: bp.center[2] + bp.size[2] / 2 };
const FLOOR = { r: [0, A, HZ], l: [0, A, -HZ] };
const ON_BOX = [48, BOX.h + A, 6];   // right ankle on the box: foot spans x 41–66 on a box top spanning x 35–80
const STEP_L = [14, A, -HZ];         // left foot after stepping back down; toes stay clear of the box front edge (x 35)
const G = 981;                       // cm/s², for the flight arc

const footDir = (pitch) => Q.rot(Q.axis([0, 0, 1], pitch), [16, -5, 0]);
// Pelvis (hip-centre) position for a flat planted foot with a given knee flexion and forward shin tilt (sagittal plane).
function hipFrom(ankle, knee, shin) {
  const kx = ankle[0] + SH * Math.sin(shin * R.DEG), ky = ankle[1] + SH * Math.cos(shin * R.DEG), th = (knee - shin) * R.DEG;
  return [r1(kx - TH * Math.sin(th)), r1(ky + TH * Math.cos(th))];
}
// Lowest point of a foot ellipsoid.
function footLow(W, side) {
  const s = rig.shapes.find((x) => x.id === `foot_${side}`), g = R.shapeWorld(W, s);
  const ay = g.axes.map((a) => a[1]), n = Math.hypot(...ay) || 1;
  return V.sub(g.c, g.axes.reduce((acc, a, i) => V.add(acc, V.scale(a, ay[i] / n)), [0, 0, 0]));
}
const legPaths = (s) => [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
const kneePos = (s) => (W, p) => [Math.min(0, p.ch[`knee_${s}`].flex - 2) * 5];
const DORSI = rig.byId.ankle_r.limits.dorsi;   // keep 2 deg inside the ankle range
const ankleLim = (s) => (W, p) => { const d = p.ch[`ankle_${s}`].dorsi; return [(Math.max(0, d - DORSI[1] + 2) + Math.max(0, DORSI[0] + 2 - d)) * 5]; };
const legObj = (s, leg) => {
  const o = [obj.aim(`ankle_${s}`, `toe_${s}`, footDir(leg.pitch || 0), 20), obj.reg(`ch.hip_${s}.abd`, 0, 0.02), kneePos(s), ankleLim(s)];
  if (leg.ankle) o.push(obj.at(`ankle_${s}`, leg.ankle, 3));
  if (leg.toe) o.push((W) => [(W[`toe_${s}`].p[0] - leg.toe[0]) * 3, (W[`toe_${s}`].p[2] - leg.toe[2]) * 3, (footLow(W, s)[1] - leg.toe[1]) * 3]);
  if (leg.knee != null) o.push(obj.reg(`ch.knee_${s}.flex`, leg.knee, leg.kneeW ?? 0.1));
  return o;
};

const zero = () => ({ rot: 0, flex: 0, latFlex: 0 });
function base() {
  return {
    root: { pos: [0, 90.1, 0], rot: { pitch: 0 } },
    ch: {
      spine_l5: zero(), spine_t12: zero(), spine_t6: zero(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 },
      sc_r: { protract: 0, elevate: 0 }, sc_l: { protract: 0, elevate: 0 },
      shoulder_r: { plane: 0, elev: 6, axial: 0 }, shoulder_l: { plane: 0, elev: 6, axial: 0 }, elbow_r: { flex: 8 }, elbow_l: { flex: 8 },
      hip_r: { flex: 0, abd: 0, rot: 0 }, hip_l: { flex: 0, abd: 0, rot: 0 }, knee_r: { flex: 20 }, knee_l: { flex: 20 }, ankle_r: { dorsi: 0 }, ankle_l: { dorsi: 0 },
    },
  };
}
// Build a key pose from high-level targets: pelvis position/tilt, trunk and head flexion, arm swing, and per-leg targets
// (planted ankle, toe-on-floor, free ankle target, or direct channels). `free` lists extra root paths to solve.
function make(s) {
  const p = base();
  p.root.pos = s.root.slice(); p.root.rot = { pitch: s.pitch || 0 };
  const [a, b, c] = s.trunk || [0, 0, 0];
  p.ch.spine_l5.flex = a; p.ch.spine_t12.flex = b; p.ch.spine_t6.flex = c;
  const [n, h] = s.head || [0, 0];
  p.ch.neck_c7.flex = n; p.ch.head_c1.flex = h;
  for (const side of ['r', 'l']) {
    const arm = (s.arms && s.arms[side]) || s.arms;
    p.ch[`shoulder_${side}`] = { plane: arm.plane, elev: arm.elev, axial: arm.axial || 0 };
    p.ch[`elbow_${side}`] = { flex: arm.elbow };
    p.ch[`sc_${side}`] = { protract: arm.protract || 0, elevate: arm.sc || 0 };
  }
  const paths = [...(s.free || [])], objs = [...(s.objs || [])];
  for (const side of ['r', 'l']) {
    const leg = s.legs[side];
    if (leg.ch) { const [hf, kf, d, ab] = leg.ch; p.ch[`hip_${side}`] = { flex: hf, abd: ab || 0, rot: 0 }; p.ch[`knee_${side}`] = { flex: kf }; p.ch[`ankle_${side}`] = { dorsi: d }; continue; }
    if (leg.knee != null) p.ch[`knee_${side}`].flex = leg.knee;
    paths.push(...legPaths(side)); objs.push(...legObj(side, leg));
  }
  let out = p;
  if (paths.length) {
    const sol = solvePose(p, paths, objs, { iters: 600 });
    out = sol.pose; out.cost = sol.cost;
  }
  out.ik = { leg_r: { target: s.ik.r[0].map(r1), weight: s.ik.r[1] }, leg_l: { target: s.ik.l[0].map(r1), weight: s.ik.l[1] } };
  return out;
}

/* ---------------- key poses ---------------- */
const ARMS = { // shoulder elevation is thorax-relative; values were tuned so the arms point where the cue says in world space
  down: { plane: 0, elev: 6, elbow: 8 }, back: { plane: -60, elev: 40, elbow: 14 }, low: { plane: 70, elev: 22, elbow: 16 },
  up: { plane: 80, elev: 140, elbow: 16, sc: 10 }, high: { plane: 80, elev: 160, elbow: 16, sc: 15 }, overhead: { plane: 80, elev: 148, elbow: 18, sc: 12 },
  reach: { plane: 80, elev: 124, elbow: 20, sc: 7 }, fwd: { plane: 80, elev: 114, elbow: 20, sc: 5 }, catch: { plane: 80, elev: 110, elbow: 22, sc: 4 },
  hold: { plane: 80, elev: 112, elbow: 20, sc: 4 }, side: { plane: 12, elev: 12, elbow: 12 }, bal: { plane: 80, elev: 88, elbow: 22 }, bal2: { plane: 80, elev: 72, elbow: 20 },
  mid: { plane: 60, elev: 36, elbow: 16 }, low2: { plane: 30, elev: 14, elbow: 10 },
};
const plantR = { ankle: FLOOR.r, pitch: 0 }, plantL = { ankle: FLOOR.l, pitch: 0 };
const stance = (knee, shin, z = 0) => [...hipFrom(FLOOR.r, knee, shin), z];
const onBox = (knee, shin, z = 4) => [...hipFrom(ON_BOX, knee, shin), z];

// Flight: pelvis follows a ballistic arc from toe-off to touchdown.
const T_OFF = 1.47, T_TD = 1.84;
const P_OFF = [11.9, 99.6, 0], P_TD = onBox(14, 2);
const vy = (P_TD[1] - P_OFF[1] + 0.5 * G * (T_TD - T_OFF) ** 2) / (T_TD - T_OFF);
const arc = (t) => { const u = t - T_OFF, f = u / (T_TD - T_OFF); return [r1(P_OFF[0] + (P_TD[0] - P_OFF[0]) * f), r1(P_OFF[1] + vy * u - 0.5 * G * u * u), r1(P_OFF[2] + (P_TD[2] - P_OFF[2]) * f)]; };

const IK = { floor: [[FLOOR.r, 1], [FLOOR.l, 1]] };
const S = {
  stand: { root: stance(0, 0), trunk: [0, 0, 0], head: [6, 8], arms: ARMS.down, legs: { r: plantR, l: plantL }, ik: { r: [FLOOR.r, 1], l: [FLOOR.l, 1] } },
  dip: { root: stance(70, 28), pitch: -26, trunk: [8, 6, 4], head: [-6, -6], arms: ARMS.back, legs: { r: plantR, l: plantL }, ik: { r: [FLOOR.r, 1], l: [FLOOR.l, 1] } },
  drive: { root: stance(34, 20), pitch: -16, trunk: [5, 3, 2], head: [-3, -3], arms: ARMS.low, legs: { r: plantR, l: plantL }, ik: { r: [FLOOR.r, 1], l: [FLOOR.l, 1] } },
  toeoff: { root: P_OFF, pitch: -6, trunk: [3, 2, 1], head: [0, 0], arms: ARMS.up, legs: { r: { toe: [17, 1.8, HZ], pitch: -38, knee: 5 }, l: { toe: [17, 1.8, -HZ], pitch: -38, knee: 5 } }, ik: { r: [FLOOR.r, 0], l: [FLOOR.l, 0] } },
  flight1: { root: arc(1.58), pitch: -8, trunk: [3, 2, 1], head: [2, 2], arms: ARMS.high, legs: { r: { ch: [52, 80, -15] }, l: { ch: [34, 62, -25] } }, ik: { r: [ON_BOX, 0], l: [STEP_L, 0] } },
  apex: { root: arc(1.69), pitch: -8, trunk: [3, 2, 1], head: [4, 5], arms: ARMS.overhead, legs: { r: { ch: [66, 82, -10] }, l: { ch: [30, 72, -18] } }, ik: { r: [ON_BOX, 0], l: [STEP_L, 0] } },
  reach: { root: arc(1.79), pitch: -7, trunk: [3, 2, 1], head: [6, 7], arms: ARMS.reach, legs: { r: { ankle: [46, 45, 6], pitch: -12 }, l: { ch: [28, 72, -12] } }, ik: { r: [ON_BOX, 0], l: [STEP_L, 0] } },
  contact: { root: P_TD, pitch: -6, trunk: [4, 3, 1], head: [8, 8], arms: ARMS.fwd, legs: { r: { ankle: ON_BOX, pitch: 0 }, l: { ch: [26, 70, -10] } }, ik: { r: [ON_BOX, 1], l: [STEP_L, 0] } },
  catch: { root: onBox(48, 20), pitch: -14, trunk: [6, 4, 2], head: [10, 10], arms: ARMS.catch, legs: { r: { ankle: ON_BOX, pitch: 0 }, l: { ch: [18, 66, -10] } }, ik: { r: [ON_BOX, 1], l: [STEP_L, 0] } },
  stick: { root: onBox(44, 18), pitch: -12, trunk: [5, 4, 2], head: [10, 10], arms: ARMS.hold, legs: { r: { ankle: ON_BOX, pitch: 0 }, l: { ch: [20, 70, -10] } }, ik: { r: [ON_BOX, 1], l: [STEP_L, 0] } },
  stick2: { root: onBox(42, 17), pitch: -11, trunk: [5, 4, 2], head: [10, 10], arms: ARMS.hold, legs: { r: { ankle: ON_BOX, pitch: 0 }, l: { ch: [20, 70, -10] } }, ik: { r: [ON_BOX, 1], l: [STEP_L, 0] } },
  tall: { root: onBox(13, 3), pitch: 0, trunk: [1, 0, 0], head: [6, 6], arms: ARMS.side, legs: { r: { ankle: ON_BOX, pitch: 0 }, l: { ch: [6, 62, -10] } }, ik: { r: [ON_BOX, 1], l: [STEP_L, 0] } },
  lower: { root: onBox(62, 24, 3), pitch: -20, trunk: [6, 4, 2], head: [10, 10], arms: ARMS.bal, legs: { r: { ankle: ON_BOX, pitch: 0 }, l: { ankle: [17, 24, -7], pitch: -42 } }, ik: { r: [ON_BOX, 1], l: [STEP_L, 0] } },
  leftTouch: {
    root: [36, 95, 1], pitch: -20, trunk: [6, 4, 2], head: [10, 10], arms: ARMS.bal, free: ['root.pos.0', 'root.pos.1'], objs: [obj.reg('root.pos.0', 32, 0.4)],
    legs: { r: { ankle: ON_BOX, pitch: 0 }, l: { toe: [29, 0.2, -HZ], pitch: -26, knee: 6 } }, ik: { r: [ON_BOX, 1], l: [STEP_L, 0] },
  },
  leftFlat: {
    root: [32, 90, 0], pitch: -16, trunk: [5, 3, 2], head: [8, 8], arms: ARMS.bal2, free: ['root.pos.0', 'root.pos.1'], objs: [obj.reg('root.pos.0', 25, 0.4), obj.reg('ch.knee_l.flex', 8, 0.1)],
    legs: { r: { ankle: ON_BOX, pitch: 0 }, l: { ankle: STEP_L, pitch: 0 } }, ik: { r: [ON_BOX, 1], l: [STEP_L, 1] },
  },
  shift: { root: [20, 88, -2], free: ['root.pos.1'], objs: [obj.reg('ch.knee_l.flex', 14, 0.3)], pitch: -12, trunk: [4, 3, 1], head: [8, 8], arms: ARMS.bal2, legs: { r: { ankle: [43, 41, 7], pitch: 0 }, l: { ankle: STEP_L, pitch: 0 } }, ik: { r: [ON_BOX, 0], l: [STEP_L, 1] } },
  rightBack: { root: [15, 89, -2], free: ['root.pos.1'], objs: [obj.reg('ch.knee_l.flex', 12, 0.3)], pitch: -8, trunk: [3, 2, 1], head: [8, 8], arms: ARMS.mid, legs: { r: { ankle: [24, 44, 8], pitch: -12 }, l: { ankle: STEP_L, pitch: 0 } }, ik: { r: [ON_BOX, 0], l: [STEP_L, 1] } },
  rightSwing: { root: [11, 89, -1], free: ['root.pos.1'], objs: [obj.reg('ch.knee_l.flex', 10, 0.3)], pitch: -5, trunk: [2, 1, 1], head: [8, 8], arms: ARMS.low2, legs: { r: { ankle: [7, 20, 8.6], pitch: -10 }, l: { ankle: STEP_L, pitch: 0 } }, ik: { r: [FLOOR.r, 0], l: [STEP_L, 1] } },
  rightDown: {
    root: [7, 89.4, 0], pitch: -3, trunk: [2, 1, 0], head: [7, 8], arms: ARMS.low2,
    legs: { r: plantR, l: { ankle: STEP_L, pitch: 0 } }, ik: { r: [FLOOR.r, 1], l: [STEP_L, 1] },
  },
  leftLift: { root: stance(5, 2, 3), pitch: -2, trunk: [1, 0, 0], head: [6, 8], arms: ARMS.down, legs: { r: plantR, l: { ankle: [11, 13, -HZ], pitch: -6 } }, ik: { r: [FLOOR.r, 1], l: [STEP_L, 0] } },
  leftSwing: { root: stance(4, 2, 2), pitch: -1, trunk: [0, 0, 0], head: [6, 8], arms: ARMS.down, legs: { r: plantR, l: { ankle: [3, 11, -HZ], pitch: 2 } }, ik: { r: [FLOOR.r, 1], l: [FLOOR.l, 0] } },
  settle: { root: stance(5, 2), pitch: 0, trunk: [0, 0, 0], head: [6, 8], arms: ARMS.down, legs: { r: plantR, l: plantL }, ik: { r: [FLOOR.r, 1], l: [FLOOR.l, 1] } },
};
const poses = {};
for (const [name, spec] of Object.entries(S)) { const p = make(spec); delete p.cost; poses[name] = p; }

const contacts = [L.legContact('r'), L.legContact('l')];
const keyframes = [
  { t: 0, pose: 'stand' }, { t: 0.55, pose: 'stand' }, { t: 1.15, pose: 'dip' }, { t: 1.34, pose: 'drive' }, { t: T_OFF, pose: 'toeoff' },
  { t: 1.58, pose: 'flight1' }, { t: 1.69, pose: 'apex' }, { t: 1.79, pose: 'reach' }, { t: T_TD, pose: 'contact' }, { t: 2.08, pose: 'catch' },
  { t: 2.35, pose: 'stick' }, { t: 3.35, pose: 'stick2' }, { t: 4.05, pose: 'tall' }, { t: 4.35, pose: 'tall' }, { t: 4.75, pose: 'lower' },
  { t: 5.0, pose: 'leftTouch' }, { t: 5.12, pose: 'leftFlat' }, { t: 5.32, pose: 'shift' }, { t: 5.48, pose: 'rightBack' }, { t: 5.63, pose: 'rightSwing' }, { t: 5.8, pose: 'rightDown' },
  { t: 6.1, pose: 'leftLift' }, { t: 6.3, pose: 'leftSwing' }, { t: 6.5, pose: 'settle' }, { t: 7.2, pose: 'stand' }, { t: 8, pose: 'stand' },
];
const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks,
};

/* ---------------- measurements and self-checks ---------------- */
const tl = R.buildTimeline(ex);
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
function boxPen(W) { // deepest penetration of any body shape into the box (cm, > 0 means inside)
  const sd = (p) => { const d = [Math.max(BOX.x0 - p[0], p[0] - BOX.x1), Math.max(-p[1], p[1] - BOX.h), Math.max(BOX.z0 - p[2], p[2] - BOX.z1)]; const o = Math.hypot(...d.map((v) => Math.max(0, v))); return o > 0 ? o : Math.max(...d); };
  let worst = { pen: -1e9 };
  for (const s of rig.shapes) {
    const g = R.shapeWorld(W, s);
    const pts = [];
    if (g.kind === 'capsule') for (let k = 0; k <= 8; k++) { const f = k / 8; pts.push([V.lerp(g.a, g.b, f), g.r[0] + (g.r[1] - g.r[0]) * f]); }
    else for (const u of [-1, 0, 1]) for (const v of [-1, 0, 1]) for (const w of [-1, 0, 1]) { const n = Math.hypot(u, v, w) || 1; pts.push([V.add(g.c, V.add(V.scale(g.axes[0], u / n), V.add(V.scale(g.axes[1], v / n), V.scale(g.axes[2], w / n)))), 0]); }
    for (const [p, r] of pts) { const pen = r - sd(p); if (pen > worst.pen) worst = { pen, id: s.id }; }
  }
  return worst;
}
const st = { floor: 1e9, pen: -1e9, travel: 0, kneeR: 0 };
const W0 = R.evalPose(rig, tl.pose(0), contacts);
for (let i = 0; i <= 1600; i++) {
  const t = (i / 1600) * 8, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts);
  const f = L.shapeMinY(W); if (f.y < st.floor) Object.assign(st, { floor: f.y, floorAt: `${f.id}@${t.toFixed(2)}` });
  const b = boxPen(W); if (b.pen > st.pen) Object.assign(st, { pen: b.pen, penAt: `${b.id}@${t.toFixed(2)}` });
  const tr = V.len(V.sub(W.pelvis.p, W0.pelvis.p)); if (tr > st.travel) Object.assign(st, { travel: tr, travelAt: t.toFixed(2) });
  if (t > 1.8 && t < 3.4) { const k = kneeOf(W, 'r'); if (k > st.kneeR) Object.assign(st, { kneeR: k, kneeAt: t.toFixed(2) }); }
}
const hipLand = Math.max(...[2.0, 2.04, 2.08, 2.12, 2.16].map((t) => tl.pose(t).ch.hip_r.flex));
const Wd = R.evalPose(rig, poses.dip, contacts), Wc = R.evalPose(rig, poses.contact, contacts);
const facts = {
  dipKnee: kneeOf(Wd, 'r'), dipDrop: W0.pelvis.p[1] - Wd.pelvis.p[1], contactKnee: kneeOf(Wc, 'r'),
  peakKnee: st.kneeR, peakHip: hipLand, travel: st.travel,
  stepKnee: Math.max(...['leftTouch', 'leftFlat'].map((n) => kneeOf(R.evalPose(rig, poses[n], contacts), 'r'))),
};
const kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
kin[0].peak = `${d(facts.dipKnee)} (quarter-to-half squat)`;
kin[1].peak = `≈${Math.round(facts.dipDrop)} cm`;
kin[2].peak = d(facts.contactKnee);
kin[3].peak = d(facts.peakKnee);
kin[4].peak = d(facts.peakHip);
kin[6].peak = `≈${Math.round(facts.travel)} cm (30 cm up, ≈${Math.round(R.evalPose(rig, poses.tall, contacts).pelvis.p[0])} cm forward)`;
console.log(`wrote ${L.write(ex)}`);
for (const [n, p] of Object.entries(poses)) {
  const W = R.evalPose(rig, p, contacts);
  console.log(`  ${n.padEnd(11)} pelvis ${W.pelvis.p.map((v) => v.toFixed(1)).join(',')}  kneeR ${kneeOf(W, 'r').toFixed(0)} kneeL ${kneeOf(W, 'l').toFixed(0)} hipR ${p.ch.hip_r.flex} hipL ${p.ch.hip_l.flex} ankR ${p.ch.ankle_r.dorsi} ankL ${p.ch.ankle_l.dorsi}  ankleR ${W.ankle_r.p.map((v) => v.toFixed(1)).join(',')} ankleL ${W.ankle_l.p.map((v) => v.toFixed(1)).join(',')}  minY ${L.shapeMinY(W).y.toFixed(1)}`);
}
console.log('  facts', JSON.stringify(Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, +v.toFixed(1)]))));
console.log('  check', JSON.stringify({ floor: +st.floor.toFixed(2), floorAt: st.floorAt, boxPen: +st.pen.toFixed(2), penAt: st.penAt, travel: +st.travel.toFixed(1), travelAt: st.travelAt, kneeAt: st.kneeAt }));
