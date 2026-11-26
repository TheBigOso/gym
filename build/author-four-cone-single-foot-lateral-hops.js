// 4 Cone Single Foot Lateral Hops (GymVisual #906712): balance on the right leg beside a line of four small cones,
// hop sideways over each cone, land softly on the same foot, stick, then hop back down the line.
// Right leg authored (the left side is the mirror). The free (left) leg stays bent with the foot lifted behind.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const meta = require('./meta/four-cone-single-foot-lateral-hops.json');

/* ---------------- Layout (cm) ---------------- */
const CONES = meta.props.filter((p) => p.kind === 'cone').map((p) => p.center[2]).sort((a, b) => a - b);
const CONE = meta.props.find((p) => p.kind === 'cone');
const CONE_H = CONE.size[1], CONE_R = CONE.size[0] / 2, CONE_X = CONE.center[0];
const SPACING = CONES[1] - CONES[0];                       // 35 cm
// Foot spots: outside the left end, between each pair of cones, outside the right end.
const SPOTS = [CONES[0] - SPACING / 2, ...CONES.slice(1).map((z, i) => (z + CONES[i]) / 2), CONES[CONES.length - 1] + SPACING / 2];
const FOOT_X = 0;                                          // ankle x of the planted foot (cones sit under the midfoot)
const ANK = L.ANKLE_H;                                     // flat-foot ankle height
const MIDFOOT_X = FOOT_X + 5.8, BALL_X = FOOT_X + 12;

/* ---------------- Foot helpers ---------------- */
const footQ = (pitch) => Q.mul(L.footRot(0), Q.axis([0, 0, 1], -pitch)); // pitch > 0 = heel up / toes down
const qArr = (q) => q.map((v) => +v.toFixed(6));
const legC = (pitch) => Object.assign(L.legContact('r'), { handRot: qArr(footQ(pitch)) });
const contacts = [legC(0)];
const footShape = rig.shapes.find((x) => x.id === 'foot_r');
// Lowest point of the foot ellipsoid relative to the ankle for a world-locked foot at `pitch`.
function footLow(pitch) {
  const q = footQ(pitch), c = Q.rot(q, footShape.c), ax = [0, 1, 2].map((i) => Q.rot(q, [i === 0 ? footShape.r[0] : 0, i === 1 ? footShape.r[1] : 0, i === 2 ? footShape.r[2] : 0]));
  const h = Math.hypot(ax[0][1], ax[1][1], ax[2][1]);
  const off = ax.reduce((s, a) => V.add(s, V.scale(a, -a[1] / h)), [0, 0, 0]); // support point in -Y
  return V.add(c, off);
}
// Ankle position that puts the ball of the foot (lowest point at `pitch`) on the floor at x = BALL_X.
const ankleOnBall = (pitch, z) => { const o = footLow(pitch); return [r1(BALL_X - o[0] - (pitch < 8 ? 0 : 0)), r1(-o[1] + 0.4), r1(z - o[2])]; };
const flatTarget = (z) => [FOOT_X, ANK, r1(z)];
const footMinY = (W, s = 'r') => { const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === `foot_${s}`)); return { y: g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]), c: g.c, axes: g.axes }; };

/* ---------------- Centre of mass (Dempster-style segment fractions) ---------------- */
const mid = (a, b) => V.scale(V.add(a, b), 0.5);
function com(W) {
  const parts = [
    [V.add(W.head_c1.p, Q.rot(W.head_c1.q, [2, 9, 0])), 0.081],
    [V.scale(V.add(V.add(W.pelvis.p, W.spine_t12.p), V.add(W.spine_t6.p, W.neck_c7.p)), 0.25), 0.497],
  ];
  for (const s of ['r', 'l']) {
    parts.push([mid(W[`hip_${s}`].p, W[`knee_${s}`].p), 0.1], [mid(W[`knee_${s}`].p, W[`ankle_${s}`].p), 0.0465], [V.add(W[`ankle_${s}`].p, Q.rot(W[`ankle_${s}`].q, footShape.c)), 0.0145]);
    parts.push([mid(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), 0.028], [mid(W[`elbow_${s}`].p, W[`handtip_${s}`].p), 0.022]);
  }
  return parts.reduce((s, [p, m]) => V.add(s, V.scale(p, m)), [0, 0, 0]);
}

/* ---------------- Leg channels reproducing an IK foot placement (seamless weight blends) ---------------- */
const LEG_PATHS = ['ch.hip_r.flex', 'ch.hip_r.abd', 'ch.hip_r.rot', 'ch.knee_r.flex', 'ch.ankle_r.dorsi'];
function fitLeg(pose, ankle, pitch) {
  const c = legC(pitch);
  const q = clone(pose); q.ik = { leg_r: { target: ankle, weight: 1 } };
  const Wi = R.evalPose(rig, q, [c]);
  const K = Wi.knee_r.p, A = Wi.ankle_r.p, T = Wi.toe_r.p;
  return L.solvePose(pose, LEG_PATHS, [L.obj.at('knee_r', K, 2), L.obj.at('ankle_r', A, 3), L.obj.at('toe_r', T, 2), L.obj.reg('ch.hip_r.rot', 0, 0.02)], { iters: 250 }).pose;
}

/* ---------------- Upper body + free leg presets ---------------- */
const st = L.POSES.standing({ toeOut: 0 });
const base = clone(st.pose);
delete base.ik.leg_l;
const ARMS = {
  ready: { sh: { plane: 65, elev: 22, axial: -50 }, el: 75 },
  load: { sh: { plane: 55, elev: 12, axial: -45 }, el: 85 },
  drive: { sh: { plane: 72, elev: 40, axial: -62 }, el: 72 },
  flight: { sh: { plane: 55, elev: 36, axial: -52 }, el: 70 },
  land: { sh: { plane: 42, elev: 34, axial: -55 }, el: 65 },
  stick: { sh: { plane: 55, elev: 25, axial: -52 }, el: 72 },
};
const FREE = {
  ready: { hip: { flex: 6, abd: 0, rot: 0 }, knee: 88, ankle: -25 },
  hop: { hip: { flex: 10, abd: 0, rot: 0 }, knee: 95, ankle: -25 },
  absorb: { hip: { flex: 14, abd: 0, rot: 0 }, knee: 90, ankle: -25 },
};
function upper(p, k) {
  const a = ARMS[k.arms], f = FREE[k.free];
  p.root.rot = { pitch: k.pitch };
  const lat = k.lat || 0;
  p.ch.spine_l5 = { rot: 0, flex: -3, latFlex: r1(lat * 0.3) };
  p.ch.spine_t12 = { rot: 0, flex: 2, latFlex: r1(lat * 0.4) };
  p.ch.spine_t6 = { rot: 0, flex: 2, latFlex: r1(lat * 0.3) };
  // Eyes forward: the head cancels most of the trunk lean (looks about 12 deg down).
  const tilt = -k.pitch + 1;
  p.ch.neck_c7 = { rot: 0, flex: r1(-0.4 * (tilt - 12)), latFlex: r1(-lat * 0.4) };
  p.ch.head_c1 = { rot: 0, flex: r1(-0.6 * (tilt - 12)), latFlex: r1(-lat * 0.5) };
  p.ch.sc_r = { protract: 4, elevate: 0 }; p.ch.sc_l = { protract: 4, elevate: 0 };
  for (const s of ['r', 'l']) { p.ch[`shoulder_${s}`] = clone(a.sh); p.ch[`elbow_${s}`] = { flex: a.el }; p.ch[`wrist_${s}`] = { pron: 10, flex: 5, dev: 0 }; }
  p.ch.hip_l = clone(f.hip); p.ch.knee_l = { flex: f.knee }; p.ch.ankle_l = { dorsi: f.ankle };
  return p;
}

/* ---------------- Pose solvers ---------------- */
// Foot on the floor (flat or on the ball): solve the pelvis so the right knee has the given flexion and the
// centre of mass sits `comDz` cm from the foot spot along Z (over the midfoot / ball along X).
function grounded(k) {
  const p = upper(clone(base), k);
  const pitch = k.footPitch || 0;
  const ankle = pitch ? ankleOnBall(pitch, k.z) : flatTarget(k.z);
  p.ik = { leg_r: { target: ankle, weight: 1 } };
  const c = [legC(pitch)], comX = pitch ? BALL_X - 2 : MIDFOOT_X - 1;
  // Initial guess: pelvis over the COM target, height from the hip-ankle distance for the wanted knee bend.
  const TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
  const d = Math.sqrt(TH * TH + SH * SH + 2 * TH * SH * Math.cos(k.knee * R.DEG));
  const gx = comX - 3, gz = k.z + k.comDz, hz = gz + rig.byId.hip_r.offset[2];
  p.root.pos = [gx, ankle[1] + Math.sqrt(Math.max(1, d * d - (hz - ankle[2]) ** 2 - (gx - ankle[0]) ** 2)), gz];
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.pos.2'], [
    (W) => [(R.measures(W).knee - k.knee) * 0.6],
    (W) => { const m = com(W); return [(m[0] - comX) * 1, (m[2] - (k.z + k.comDz)) * 1]; },
  ], { contacts: c, iters: 300 });
  let q = fitLeg(s.pose, ankle, pitch);
  q.ik = { leg_r: { target: flatTarget(k.landZ ?? k.z), weight: k.w } };
  return q;
}
// Airborne: pelvis given (ballistic), ankle at a given point with the foot pitched.
function airborne(k, root) {
  const p = upper(clone(base), k);
  p.root.pos = root.map(r1);
  const q = fitLeg(p, k.ankle.map(r1), k.footPitch);
  q.ik = { leg_r: { target: flatTarget(k.landZ), weight: 0 } };
  return q;
}

/* ---------------- Choreography ---------------- */
const SETUP = 0.8, HOP = 1.4, TURN = 0.4, G = 981;
const KNEE = { ready: 22, stick: 50, load: 46, push: 30, heel: 20, toeoff: 12, touch: 32, settle: 39, land: 45, absorb: 60 };
// Key times within a hop (s from the start of the hop phase); the previous stick is held until `load` begins.
const TT = { load: 0.2, push: 0.27, pushfk: 0.285, heel: 0.31, toeoff: 0.34, lift: 0.4, clear: 0.49, reach: 0.57, touch: 0.64, settle: 0.67, flatfk: 0.695, land: 0.71, absorb: 0.88, stick: 1.1 };
const CLEAR = 6;                                            // foot sole about this far above the cone tip at mid-flight
const keys = []; // { t, name, pose }
const add = (t, name, pose) => { t = +t.toFixed(3); if (keys.length && keys[keys.length - 1].t === t) keys[keys.length - 1] = { t, name: keys[keys.length - 1].name, pose }; else keys.push({ t, name, pose }); };
const P = {};
const ready = grounded({ z: SPOTS[0], knee: KNEE.ready, comDz: 0, w: 1, pitch: -8, arms: 'ready', free: 'ready' });
const stickAt = (z, lat = 0) => grounded({ z, knee: KNEE.stick, comDz: 0, w: 1, pitch: -20, arms: 'stick', free: 'ready', lat });
add(0, 'ready', ready); add(0.35, 'ready', ready); add(SETUP, 'stick_0', stickAt(SPOTS[0]));

const hops = [];
for (let k = 0; k < 8; k++) hops.push({ T: SETUP + k * HOP + (k >= 4 ? TURN : 0), from: k < 4 ? k : 8 - k, to: k < 4 ? k + 1 : 7 - k });
const report = [];
hops.forEach((h, i) => {
  const z0 = SPOTS[h.from], z1 = SPOTS[h.to], dir = Math.sign(z1 - z0), zc = (z0 + z1) / 2, T = h.T, tag = `h${i + 1}`;
  const g = (o) => grounded(Object.assign({ free: 'hop' }, o));
  // Push-off: the foot stays flat and IK-planted while the knee starts to extend, then the contact hands over to
  // FK on an identical pose (no visible change) so the heel can rise about the ball without moving the IK target.
  const load = g({ z: z0, knee: KNEE.load, comDz: 4 * dir, w: 1, pitch: -18, arms: 'load', lat: 2 * dir });
  const push = g({ z: z0, knee: KNEE.push, comDz: 7 * dir, w: 1, pitch: -14, arms: 'drive', lat: 3 * dir });
  const pushFk = Object.assign(clone(push), { ik: { leg_r: { target: flatTarget(z0), weight: 0 } } });
  const heel = g({ z: z0, landZ: z0, footPitch: 18, knee: KNEE.heel, comDz: 9 * dir, w: 0, pitch: -12, arms: 'drive', lat: 4 * dir });
  const toe = g({ z: z0, landZ: z1, footPitch: 38, knee: KNEE.toeoff, comDz: 11 * dir, w: 0, pitch: -10, arms: 'drive', lat: 4 * dir });
  // Landing: ball first, heel settles (FK), then the contact plants on an identical flat-foot pose.
  const touch = g({ z: z1, footPitch: 20, knee: KNEE.touch, comDz: -9 * dir, w: 0, pitch: -12, arms: 'land', lat: -2 * dir });
  const settle = g({ z: z1, footPitch: 9, knee: KNEE.settle, comDz: -7 * dir, w: 0, pitch: -14, arms: 'land', lat: -2 * dir });
  const flatFk = g({ z: z1, knee: KNEE.land, comDz: -5 * dir, w: 0, pitch: -16, arms: 'land', free: 'absorb', lat: -2 * dir });
  const land = Object.assign(clone(flatFk), { ik: { leg_r: { target: flatTarget(z1), weight: 1 } } });
  const absorb = g({ z: z1, knee: KNEE.absorb, comDz: -1 * dir, w: 1, pitch: -24, arms: 'stick', free: 'absorb', lat: -1 * dir });
  const stick = stickAt(z1);
  // Flight: pelvis follows a ballistic arc between the toe-off and touch-down pelvis positions.
  const tTo = T + TT.toeoff, tTd = T + TT.touch, FT = tTd - tTo, r0 = toe.root.pos, r1v = touch.root.pos;
  const v0 = (r1v[1] - r0[1]) / FT + (G * FT) / 2;
  const rootAt = (t) => { const u = (t - tTo) / FT, tau = t - tTo; return [r0[0] + (r1v[0] - r0[0]) * u, r0[1] + v0 * tau - (G * tau * tau) / 2, r0[2] + (r1v[2] - r0[2]) * u]; };
  const fl = (t, ankle, footPitch, arms) => airborne({ landZ: z1, ankle, footPitch, pitch: -11, arms, free: 'hop', lat: dir }, rootAt(t));
  const lift = fl(T + TT.lift, [BALL_X - footLow(30)[0] - 2, 22, z0 + 0.15 * (z1 - z0)], 30, 'drive');
  const clr = fl(T + TT.clear, [MIDFOOT_X - footLow(6)[0] - 1.5, CONE_H + CLEAR - footLow(6)[1], zc], 6, 'flight');
  const reach = fl(T + TT.reach, [BALL_X - footLow(22)[0], 18, z1 - 0.08 * (z1 - z0)], 22, 'land');
  add(T, `stick_${i}`, keys[keys.length - 1].pose);
  const seq = [['load', load], ['push', push], ['pushfk', pushFk], ['heel', heel], ['toeoff', toe], ['lift', lift], ['clear', clr], ['reach', reach], ['touch', touch], ['settle', settle], ['flatfk', flatFk], ['land', land], ['absorb', absorb]];
  for (const [n, p] of seq) add(T + TT[n], `${tag}_${n}`, p);
  add(T + TT.stick, `stick_${i + 1}`, stick);
  report.push(`${tag} z ${z0}->${z1} apex ${(r0[1] + (v0 * v0) / (2 * G)).toFixed(1)} pelvis toe ${r0.map((v) => v.toFixed(1))} touch ${r1v.map((v) => v.toFixed(1))}`);
});
const END = hops[7].T + HOP;                                // 12.4
add(END, 'stick_8', keys[keys.length - 1].pose);
add(END + 0.6, 'ready', ready); add(meta.timeline.duration, 'ready', ready);

/* ---------------- Poses + keyframes (identical poses share a name) ---------------- */
const poses = {}, keyframes = [];
for (const k of keys) {
  let name = k.name;
  if (name in poses && JSON.stringify(poses[name]) !== JSON.stringify(k.pose)) name = `${name}_${keyframes.length}`;
  poses[name] = k.pose; keyframes.push({ t: k.t, pose: name });
}

/* ---------------- Activation: contact-synced curves for the hopping leg ---------------- */
const activation = clone(meta.activation);
const curve = (fn) => { const pts = []; for (const k of keys) pts.push([k.t, +fn(k.name).toFixed(2)]); return pts.filter((p, i, a) => i === 0 || i === a.length - 1 || p[1] !== a[i - 1][1] || p[1] !== a[i + 1][1]); };
const phaseOf = (n) => (n.startsWith('ready') ? 'ready' : n.startsWith('stick') ? 'stick' : n.split('_')[1]);
const lv = {
  calves_r: { ready: 0.35, stick: 0.5, load: 0.65, toeoff: 1, lift: 0.3, clear: 0.2, reach: 0.55, touch: 0.85, land: 0.9, absorb: 0.75 },
  quads_r: { ready: 0.3, stick: 0.6, load: 0.75, toeoff: 0.85, lift: 0.25, clear: 0.15, reach: 0.4, touch: 0.8, land: 0.95, absorb: 1 },
  glute_max_r: { ready: 0.25, stick: 0.5, load: 0.6, toeoff: 0.85, lift: 0.3, clear: 0.25, reach: 0.5, touch: 0.75, land: 0.85, absorb: 0.85 },
  glute_med_r: { ready: 0.45, stick: 0.65, load: 0.7, toeoff: 0.75, lift: 0.35, clear: 0.3, reach: 0.55, touch: 0.8, land: 0.9, absorb: 0.85 },
  hamstrings_r: { ready: 0.2, stick: 0.4, load: 0.45, toeoff: 0.55, lift: 0.5, clear: 0.45, reach: 0.45, touch: 0.6, land: 0.6, absorb: 0.55 },
  adductors_r: { ready: 0.15, stick: 0.3, load: 0.35, toeoff: 0.5, lift: 0.25, clear: 0.2, reach: 0.25, touch: 0.4, land: 0.45, absorb: 0.4 },
};
// Hand-over keys share the level of the key they sit next to.
const ALIAS = { pushfk: 'push', heel: 'toeoff', settle: 'touch', flatfk: 'land' };
for (const m in lv) {
  lv[m].push = +((lv[m].load + lv[m].toeoff) / 2).toFixed(2);
  activation[m] = curve((n) => { const ph = phaseOf(n); return lv[m][ALIAS[ph] || ph] ?? 0.3; });
}

/* ---------------- Module ---------------- */
const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation, guides: meta.guides, checks: meta.checks,
};

/* ---------------- Self-checks ---------------- */
const tl = R.buildTimeline(ex), DUR = ex.timeline.duration;
const W0 = R.evalPose(rig, tl.pose(0), contacts);
let clear = 1e9, clearAt = null, freeClear = 1e9, freeAt = null, floor = 1e9, floorAt = null, kneeR = [999, 0], travel = 0, ankleR = [999, -999], slide = 0, prevAnk = null;
const coneSurf = (dx) => CONE_H * (1 - Math.min(1, Math.abs(dx) / CONE_R)); // cone height at horizontal distance dx from its axis
// Max cone surface height under a foot ellipsoid (sampled on its bottom outline).
function footOverCone(W, s) {
  const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === `foot_${s}`));
  let worst = 1e9;
  for (let a = 0; a < 24; a++) for (const b of [-0.9, -0.6, -0.3, 0]) {
    const ca = Math.cos((a / 24) * 2 * Math.PI), sa = Math.sin((a / 24) * 2 * Math.PI), cb = Math.sqrt(1 - b * b);
    const p = V.add(g.c, V.add(V.add(V.scale(g.axes[0], ca * cb), V.scale(g.axes[1], b)), V.scale(g.axes[2], sa * cb)));
    for (const zc of CONES) { const d = Math.hypot(p[0] - CONE_X, p[2] - zc); if (d < CONE_R) worst = Math.min(worst, p[1] - coneSurf(d)); }
  }
  return worst;
}
for (let i = 0; i <= 2640; i++) {
  const t = (i / 2640) * DUR, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts), m = R.measures(W);
  const c = footOverCone(W, 'r'); if (c < clear) { clear = c; clearAt = +t.toFixed(3); }
  const cl = footOverCone(W, 'l'); if (cl < freeClear) { freeClear = cl; freeAt = +t.toFixed(3); }
  const f = L.shapeMinY(W); if (f.y < floor) { floor = f.y; floorAt = [f.id, +t.toFixed(2)]; }
  if (pose.ik.leg_r.weight >= 0.5) kneeR = [Math.min(kneeR[0], m.knee), Math.max(kneeR[1], m.knee)];
  travel = Math.max(travel, V.len(V.sub(W.pelvis.p, W0.pelvis.p)));
}
// Knee flexion at each touch-down and peak on each landing.
const kneeAt = (t) => R.measures(R.evalPose(rig, tl.pose(t), contacts)).knee;
const touches = hops.map((h) => kneeAt(h.T + TT.touch)), peaks = hops.map((h) => { let mx = 0; for (let t = h.T + TT.touch; t <= h.T + 1.4; t += 0.01) mx = Math.max(mx, kneeAt(t)); return mx; });
const Ws = L.fk(poses.stick_1, contacts), Wr = L.fk(ready, contacts);
const trunk = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const Wpk = L.fk(poses.h1_absorb, contacts);
const kin = ex.exercise.kinematics, set = (measure, field, v) => { const r = kin.find((x) => x.measure === measure); if (r) r[field] = v; };
const rng = (a) => { const lo = Math.round(Math.min(...a)), hi = Math.round(Math.max(...a)); return lo === hi ? `${lo}°` : `${lo}–${hi}°`; };
set('Knee flexion at initial contact', 'peak', `≈${rng(touches)} at touch-down (ball of the foot)`);
set('Knees', 'setup', `≈${Math.round(R.measures(Wr).knee)}° balancing; ≈${Math.round(R.measures(Ws).knee)}° in the stick`);
set('Knees', 'peak', `≈${rng(peaks)} at the bottom of each landing`);
set('Hips', 'setup', `≈${Math.round(ready.ch.hip_r.flex)}° balancing`);
set('Hips', 'peak', `≈${Math.round(poses.h1_absorb.ch.hip_r.flex)}° at the bottom of the landing (trunk ≈${Math.round(trunk(Wpk))}° from vertical)`);
set('Free leg', 'setup', `Knee ≈${FREE.ready.knee}°, foot ≈${Math.round(footMinY(Wr, 'l').y)} cm off the floor, behind the support leg`);
set('Cone spacing and height', 'setup', `${SPACING} cm apart, ${CONE_H} cm tall`);
set('Cone spacing and height', 'peak', `${SPACING} cm apart, ${CONE_H} cm tall`);
set('Lateral travel per pass', 'peak', `${Math.round(travel)} cm (4 hops × ${SPACING} cm)`);
set('Stick', 'peak', `≈${(HOP - TT.absorb).toFixed(1)} s held after the landing (≈${(HOP + TURN - TT.absorb).toFixed(1)} s at the turn); ≈${(HOP + TT.toeoff - TT.touch).toFixed(1)} s on the ground per hop`);
set('Foot clearance over a cone', 'peak', `≥${clear.toFixed(1)} cm`);
console.log(`4 Cone Lateral Hops: keys ${keyframes.length} poses ${Object.keys(poses).length}  wrote ${L.write(ex)}`);
report.forEach((r) => console.log('  ' + r));
console.log(`  ready knee ${R.measures(Wr).knee.toFixed(1)} hip ${ready.ch.hip_r.flex} pelvis ${ready.root.pos}  stick knee ${R.measures(Ws).knee.toFixed(1)} trunk ${trunk(Ws).toFixed(1)}`);
console.log(`  touch knees ${touches.map((v) => v.toFixed(1))}  peak knees ${peaks.map((v) => v.toFixed(1))}`);
console.log(`  check ${JSON.stringify({ coneClearance: +clear.toFixed(2), clearAt, freeFootCone: freeClear > 1e8 ? "never over a cone" : +freeClear.toFixed(2), freeAt, floor: +floor.toFixed(2), floorAt, kneeStance: kneeR.map(Math.round), travel: +travel.toFixed(1) })}`);
if (clear < 1) { console.error('FAIL: hopping foot does not clear a cone'); process.exitCode = 1; }
if (freeClear < 1) { console.error('FAIL: free foot hits a cone'); process.exitCode = 1; }
if (touches.some((v) => v < 27 || v > 40)) { console.error('FAIL: knee at touch-down outside 27-40°'); process.exitCode = 1; }
if (peaks.some((v) => v < 55 || v > 66)) { console.error('FAIL: peak landing knee outside 55-66°'); process.exitCode = 1; }
