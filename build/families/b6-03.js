// Batch 6 family b6-03: loaded squats and lunges (heels raised on a board, a dumbbell held by its handle in both hands,
// goblet split stances), a barbell carried in one hand, and a few small helpers shared by the b6-03 authors.
// squatAuthor() is a copy of build/families/squat.js author() with one addition: cfg.heel = { pitch, board } raises both
// heels on a board (feet pitched heel-up about the ball of the foot, which stays on the floor; build/families/hips.js
// heelRaise). The board is a box prop whose top meets the heel of the sole (heelBoard). cfg.armsLate solves the arms
// after the legs are fitted (armsFn(p, f, contacts)), for holds that must clear the legs.
const L = require('../lib');
const H = require('./hips');
const DBH = require('./dumbbell');
const B3 = require('./b3-legs');
const BB = require('./b3-back');
const K = require('./b4-squats2');
const { R, V, Q, rig, r1, clone } = L;

const qArr = (q) => q.map((v) => +v.toFixed(6));
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset);
// Leg angles are rotations: keep them in (-180, 180] so a solver that wandered a full turn (e.g. ankle 386) stores the real angle
const wrapLeg = (q, s) => { for (const [j, cs] of [[`hip_${s}`, ['flex', 'abd', 'rot']], [`knee_${s}`, ['flex']], [`ankle_${s}`, ['dorsi']]]) for (const c of cs) if (q.ch[j] && Math.abs(q.ch[j][c] ?? 0) > 180) q.ch[j][c] = Math.round(L.wrap(q.ch[j][c]) * 1e6) / 1e6; };
const SHOULDER_W = 2 * rig.byId.shoulder_r.offset[2] + 2 * rig.byId.sc_r.offset[2];

// cfg: { stance, toe, kneeTop, kneeBottom, pitchBottom, backBottom, rootX, footX, spine: {l5,t12,t6}, arms: 'forward'|'sides',
//        lead, depths: {name: f}, keyframes, gazeLevel }
function squatAuthor(cfg, meta) {
  const TOE = cfg.toe;
  const toeDir = (s, deg = TOE) => [Math.cos(deg * R.DEG), 0, (s === 'r' ? 1 : -1) * Math.sin(deg * R.DEG)];
  const footQ = (s) => L.footRot(s === 'r' ? -TOE : TOE);
  const st = L.POSES.standing({ stance: cfg.stance, toeOut: TOE });
  const TARGET = { r: st.pose.ik.leg_r.target.slice(), l: st.pose.ik.leg_l.target.slice() };
  TARGET.r[0] = TARGET.l[0] = cfg.footX || 0;
  const HR = {};
  if (cfg.heel) for (const s of ['r', 'l']) { // heel up `pitch` degrees, the ball of the foot where a flat foot's ball would be
    const yaw = s === 'r' ? -TOE : TOE, ballX = (cfg.footX || 0) + 12.5 * Math.cos(TOE * R.DEG);
    HR[s] = H.heelRaise(st.pose, s, cfg.heel.pitch, ballX, TARGET[s][2], yaw); TARGET[s] = HR[s].target.slice();
  }
  const mkContacts = (poleDeg) => ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: toeDir(s, poleDeg).map((v) => +v.toFixed(4)), handRot: cfg.heel ? HR[s].handRot.slice() : qArr(footQ(s)) }));
  const lead = (f) => 1 - Math.pow(1 - f, cfg.lead ?? 1.6);
  const sp = cfg.spine || { l5: -4, t12: -2, t6: 1 };

  function trunk(f) {
    const g = lead(f), p = clone(st.pose);
    p.root.pos = [r1((cfg.rootX || 0) + (cfg.backBottom || 0) * g), 60, 0];
    p.root.rot = { pitch: r1((cfg.pitchTop || 0) + ((cfg.pitchBottom || 0) - (cfg.pitchTop || 0)) * g) };
    Object.assign(p.ch, {
      spine_l5: { rot: 0, flex: r1(sp.l5 * g), latFlex: 0 }, spine_t12: { rot: 0, flex: r1(sp.t12 * g), latFlex: 0 }, spine_t6: { rot: 0, flex: r1(sp.t6 * g), latFlex: 0 },
      sc_r: { protract: cfg.arms === 'forward' ? 8 : 2, elevate: 2 }, sc_l: { protract: cfg.arms === 'forward' ? 8 : 2, elevate: 2 },
    });
    // eyes level: the neck extends about as much as the trunk leans
    const lean = -p.root.rot.pitch + (sp.l5 + sp.t12 + sp.t6) * g;
    p.ch.neck_c7 = { rot: 0, flex: r1(-lean * 0.4) }; p.ch.head_c1 = { rot: 0, flex: r1(-lean * 0.45) };
    p.ik = { leg_r: { target: TARGET.r.slice(), weight: 1 }, leg_l: { target: TARGET.l.slice(), weight: 1 } };
    return p;
  }
  // Arms reach forward at shoulder height, parallel to the floor and to each other (counterbalance)
  function armsForward(pose) {
    const W = L.fk(pose), S = W.shoulder_r.p;
    const target = [S[0] + L.reach(6) * 0.995, S[1] - 2, S[2] - 2];
    const p = L.armToTarget(pose, target, { flex: 6, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess: [90, 90, 0] });
    ['shoulder', 'elbow', 'wrist'].forEach((j) => { p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); });
    return p;
  }
  function rootYFor(pose, knee, contacts) {
    let a = 20, b = 100;
    for (let i = 0; i < 60; i++) { const y = (a + b) / 2, p = clone(pose); p.root.pos[1] = y; if (kneeOf(L.fk(p, contacts), 'r') > knee) a = y; else b = y; }
    return r1((a + b) / 2);
  }
  const nFoot = [-Math.sin(TOE * R.DEG), 0, Math.cos(TOE * R.DEG)];
  const kneeLine = (W) => V.dot(V.sub(W.knee_r.p, W.ankle_r.p), nFoot);
  // pole so the knee tracks over the 2nd-3rd toe (target kneeOut cm outside the foot axis at the bottom)
  let lo = TOE - 10, hi = TOE + 40, POLE = TOE;
  const bottomBase = trunk(1);
  for (let i = 0; i < 40; i++) {
    POLE = (lo + hi) / 2;
    const c = mkContacts(POLE), p = clone(bottomBase); p.root.pos[1] = rootYFor(p, cfg.kneeBottom, c);
    if (kneeLine(L.fk(p, c)) < (cfg.kneeOut ?? 1)) lo = POLE; else hi = POLE;
  }
  POLE = r1(POLE);
  const contacts = mkContacts(POLE);
  const Y_TOP = rootYFor(trunk(0), cfg.kneeTop, contacts), Y_BOTTOM = rootYFor(bottomBase, cfg.kneeBottom, contacts);

  const LEG_PATHS = (s) => [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
  function fitLegs(pose) {
    const Wi = L.fk(pose, contacts); let q = pose;
    for (const s of ['r', 'l']) {
      const objs = [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2)];
      q = L.solvePose(q, LEG_PATHS(s), objs, { iters: 200 }).pose;
      wrapLeg(q, s);
    }
    return q;
  }
  function poseAt(f) {
    let p = trunk(f);
    p.root.pos[1] = r1(Y_TOP + (Y_BOTTOM - Y_TOP) * f);
    if (cfg.arms === 'forward') p = armsForward(p);
    if (cfg.armsFn && !cfg.armsLate) p = cfg.armsFn(p, f);
    p = fitLegs(p);
    if (cfg.armsFn && cfg.armsLate) p = cfg.armsFn(p, f, contacts); // arms solved on the fitted legs (clearance to the legs)
    return p;
  }
  const poses = {};
  for (const [name, f] of Object.entries(cfg.depths)) poses[name] = poseAt(f);
  if (cfg.settle) { poses.bottomSettle = clone(poses.bottom); poses.bottomSettle.root.pos[1] = r1(poses.bottom.root.pos[1] - cfg.settle); poses.bottomSettle = fitLegs(poses.bottomSettle); }

  const ex = {
    schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
    timeline: meta.timeline, poses, keyframes: cfg.keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks,
  };
  // self-check over the whole loop
  const tl = R.buildTimeline(ex), D = meta.timeline.duration;
  let floor = 1e9, floorAt = null, board = 1e9, knee = [999, 0], dorsi = 0, feet = 0, line = [999, -999];
  const W0 = R.evalPose(rig, tl.pose(0), contacts);
  for (let i = 0; i <= 1600; i++) {
    const t = (i / 1600) * D, W = R.evalPose(rig, tl.pose(t), contacts);
    const fy = L.shapeMinY(W); if (fy.y < floor) { floor = fy.y; floorAt = [fy.id, +t.toFixed(2)]; }
    if (cfg.heel && cfg.heel.board) board = Math.min(board, boardGap(W, cfg.heel.board));
    const k = kneeOf(W, 'r'); knee = [Math.min(knee[0], k), Math.max(knee[1], k)];
    if (k > 30) { const kl = kneeLine(W); line = [Math.min(line[0], kl), Math.max(line[1], kl)]; }
    dorsi = Math.max(dorsi, ANKLE_REST - V.angle(V.sub(W.knee_r.p, W.ankle_r.p), V.sub(W.toe_r.p, W.ankle_r.p)));
    for (const j of ['ankle_r', 'ankle_l', 'toe_r', 'toe_l']) feet = Math.max(feet, V.len(V.sub(W[j].p, W0[j].p)));
  }
  const Wt = L.fk(poses[cfg.topPose || 'stand'], contacts), Wb = L.fk(poses.bottom, contacts);
  const report = { pole: POLE, Y_TOP, Y_BOTTOM, floor: +floor.toFixed(2), floorAt, knee: knee.map(Math.round), kneeLine: line.map((v) => +v.toFixed(1)), dorsi: +dorsi.toFixed(1), feet: +feet.toFixed(3),
    board: cfg.heel && cfg.heel.board ? +board.toFixed(2) : undefined, trunkTop: +trunkLean(Wt).toFixed(1), trunkBottom: +trunkLean(Wb).toFixed(1), hipTop: poses[cfg.topPose || 'stand'].ch.hip_r.flex, hipBottom: poses.bottom.ch.hip_r.flex, pelvisBottom: Wb.pelvis.p.map(r1), Wb, Wt };
  if (dorsi > 34) { console.error('FAIL: ankle dorsiflexion beyond the rig limit'); process.exitCode = 1; }
  if (feet > 0.05) { console.error('FAIL: feet move'); process.exitCode = 1; }
  ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
  return { ex, report, kneeOf, trunkLean, SHOULDER_W, contacts, poses, TARGET, HR };
}

/* ---------------- heel board (elevated-heel squats) ---------------- */
const footShape = (s) => rig.shapes.find((x) => x.id === `foot_${s}`);
// surface samples of a rig foot shape (ellipsoid) in world cm
function footSamples(W, s, n = 18) {
  const g = R.shapeWorld(W, footShape(s)), out = [];
  for (let i = 0; i <= n; i++) for (let j = 0; j < 2 * n; j++) {
    const v = -Math.PI / 2 + (i / n) * Math.PI, u = (j / (2 * n)) * 2 * Math.PI;
    out.push(V.add(g.c, V.add(V.add(V.scale(g.axes[0], Math.cos(v) * Math.cos(u)), V.scale(g.axes[1], Math.cos(v) * Math.sin(u))), V.scale(g.axes[2], Math.sin(v)))));
  }
  return out;
}
// Board under both heels: from just behind the heels to `front` cm ahead of the ankle joints (under the heel pad); its top meets the lowest point of the soles in
// that strip (so it never cuts into the foot), as wide as the feet plus a margin. Box prop (center y 0 = base on the floor).
function heelBoard(W, { front = -1, margin = 4, id = 'board' } = {}) {
  const pts = [...footSamples(W, 'r'), ...footSamples(W, 'l')];
  const xr = Math.min(...pts.map((p) => p[0])), x0 = xr - 1.5, x1 = Math.max(W.ankle_r.p[0], W.ankle_l.p[0]) + front;
  const top = Math.min(...pts.filter((p) => p[0] >= x0 && p[0] <= x1).map((p) => p[1])) - 0.1;
  const zs = pts.map((p) => p[2]), z0 = Math.min(...zs) - margin, z1 = Math.max(...zs) + margin;
  return { id, kind: 'box', center: [r1((x0 + x1) / 2), 0, r1((z0 + z1) / 2)], size: [r1(x1 - x0), r1(top), r1(z1 - z0)] };
}
// Lowest foot point over the board footprint minus the board top (cm, < 0 = the foot cuts into the board)
function boardGap(W, box) {
  const [cx, , cz] = box.center, [sx, sy, sz] = box.size;
  let m = 1e9;
  for (const s of ['r', 'l']) for (const p of footSamples(W, s, 12)) if (Math.abs(p[0] - cx) <= sx / 2 && Math.abs(p[2] - cz) <= sz / 2) m = Math.min(m, p[1] - sy);
  return m;
}
// heel point of the sole (rearmost foot sample), its height over the board
function heelOver(W, box) {
  let best = null;
  for (const s of ['r', 'l']) { const pts = footSamples(W, s, 12); const p = pts.reduce((a, b) => (b[0] < a[0] ? b : a)); if (!best || p[1] - box.size[1] > best) best = p[1] - box.size[1]; }
  return best;
}

/* ---------------- one dumbbell held by its handle in both hands ---------------- */
// Two-hand dumbbell (attach wrist_r with wrist_l, grip 'handle'): the player draws it midway between the two grip points
// with its axis from the left grip to the right grip.
const DB2 = { length: 32, diameter: 12 };
function db2At(W, size = DB2) {
  const r = DBH.dumbbellAt(W, 'r', 'handle', size).c, l = DBH.dumbbellAt(W, 'l', 'handle', size).c;
  return { c: V.lerp(l, r, 0.5), ax: V.norm(V.sub(r, l)), gap: V.len(V.sub(r, l)), r: size.diameter / 2, half: size.length / 2 };
}
// plate sample points (plates centred +-11.5 cm along the axis, 9 cm long, radius r)
function db2Points(d) {
  const t = V.norm(V.cross(d.ax, Math.abs(d.ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), b = V.cross(d.ax, t), out = [];
  for (const sg of [-1, 1]) for (const s of [7, 11.5, 16]) {
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 2 * Math.PI; out.push(V.add(d.c, V.add(V.scale(d.ax, sg * s), V.add(V.scale(t, Math.cos(a) * d.r), V.scale(b, Math.sin(a) * d.r))))); }
    out.push(V.add(d.c, V.scale(d.ax, sg * s)));
  }
  return out;
}
const db2MinY = (d) => Math.min(...db2Points(d).map((p) => p[1]));
const BODY = rig.shapes.filter((s) => !/^(eye|brow|hand|thumb|forearm)/.test(s.id));
function db2Clear(W, size = DB2) {
  const d = db2At(W, size), pts = db2Points(d);
  let best = { d: 1e9 };
  for (const s of BODY) for (const p of pts) { const c = B3.shapeDist(W, s, p); if (c < best.d) best = { d: c, id: s.id }; }
  return { d, clear: best, minY: db2MinY(d) };
}
// Both arms hanging long in front, pronated (palms toward the body, thumbs in), the hands side by side on the handle
// (handle centres hz cm either side of the midline); the handle slides forward until the plates clear the legs by `clear`
// cm and sits as low as straight arms reach. Right arm solved, left mirrored.
function db2Hang(p, contacts, { hz = 4.6, clear = 2.5, elbow = 5, sc = { protract: 8, elevate: -3 } } = {}) {
  let q = clone(p); q.ch.sc_r = clone(sc); q.ch.sc_l = clone(sc);
  const W0 = L.fk(q, contacts), S = W0.shoulder_r.p;
  const palm = [-1, 0, 0], thumb = [0, 0, -1];
  const legs = rig.shapes.filter((s) => /^(thigh|quad|buttock|calf|shank|pelvis|abdomen)/.test(s.id));
  const clr = (c) => { const d = { c, ax: [0, 0, 1], r: DB2.diameter / 2 }; let m = 1e9; for (const pt of db2Points(d)) for (const s of legs) m = Math.min(m, B3.shapeDist(W0, s, pt)); return m; };
  const place = (y) => { let a = S[0] - 30, b = S[0] + 50; for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if (clr([m, y, 0]) > clear) b = m; else a = m; } return [b, y, 0]; };
  const R_ = L.reach(elbow);
  const wristOf = (c) => BB.wristFromHandle([c[0], c[1], hz], palm, thumb, 'handle');
  let ya = -10, yb = S[1];
  for (let i = 0; i < 36; i++) { const y = (ya + yb) / 2; if (V.len(V.sub(wristOf(place(y)), S)) > R_) ya = y; else yb = y; }
  const c = place(yb), w = wristOf(c);
  q = BB.holdArm(q, w, { palm, axis: thumb, axialW: 0.02, guesses: [[60, 20, 30, 5, 150], [80, 30, 0, 5, 100], [40, 10, 20, 5, 160], [20, 10, 0, 5, 120]] });
  const cost = q.__cost; BB.mirrorArm(q); q.__cost = cost; q.__handle = c;
  return q;
}

/* ---------------- left arm via the mirror ---------------- */
// Solve something for the left arm by mirroring the pose, solving the right arm, and mirroring back (K.mirrorPose)
function viaMirror(p, solveRight) { const m = K.mirrorPose(p); const s = solveRight(m); const extra = { cost: s.__cost }; delete s.__cost; const back = K.mirrorPose(s); back.__cost = extra.cost; return back; }

/* ---------------- misc ---------------- */
// Shoulder solved on the negative-elevation branch -> the equivalent positive one (plane + 180, -elev, axial + 180);
// checked by FK in the authors (the hand lands in the same place)
function posElev(p) {
  for (const s of ['r', 'l']) { const sh = p.ch[`shoulder_${s}`]; if (sh && sh.elev < 0) p.ch[`shoulder_${s}`] = { plane: r1(L.wrap(sh.plane + 180)), elev: r1(-sh.elev), axial: r1(L.wrap((sh.axial || 0) + 180)) }; }
  return p;
}
const setKin = (ex) => (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (!k) throw new Error(`no kinematics row ${prefix}`); k[field] = v; };
// joint-limit scan over the loop (rig limits); returns { 'joint.channel': [min, max] } for any channel out of range
function limits(ex, tol = 0.5) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, bad = {};
  for (let i = 0; i <= 600; i++) {
    const pz = tl.pose((i / 600) * D);
    for (const j in pz.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in pz.ch[j]) { const L2 = lim[c]; const v = pz.ch[j][c]; if (!L2 || typeof v !== 'number') continue; if (v < L2[0] - tol || v > L2[1] + tol) { const k = `${j}.${c}`; bad[k] = bad[k] ? [Math.min(bad[k][0], v), Math.max(bad[k][1], v)] : [v, v]; } } }
  }
  return bad;
}
function gateMeasure(name, ex, value) { const m = ex.checks.measure; if (value < m.min || value > m.max) { console.error(`FAIL ${name}: peak ${m.name} ${value} outside [${m.min}, ${m.max}]`); process.exitCode = 1; } }
const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
module.exports = { posElev, squatAuthor, kneeOf, trunkLean, SHOULDER_W, footSamples, heelBoard, boardGap, heelOver, DB2, db2At, db2Points, db2MinY, db2Clear, db2Hang, viaMirror, setKin, limits, gateMeasure, NOTE };
