// Squat family (batch 2): both feet planted, pelvis travels on a depth fraction f (0 = top, 1 = bottom).
// Shared by the bodyweight squat and the wall squat. Generalised from author-three-second-sumo-squat.js.
const L = require('../lib');
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
function author(cfg, meta) {
  const TOE = cfg.toe;
  const toeDir = (s, deg = TOE) => [Math.cos(deg * R.DEG), 0, (s === 'r' ? 1 : -1) * Math.sin(deg * R.DEG)];
  const footQ = (s) => L.footRot(s === 'r' ? -TOE : TOE);
  const mkContacts = (poleDeg) => ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: toeDir(s, poleDeg).map((v) => +v.toFixed(4)), handRot: qArr(footQ(s)) }));
  const st = L.POSES.standing({ stance: cfg.stance, toeOut: TOE });
  const TARGET = { r: st.pose.ik.leg_r.target.slice(), l: st.pose.ik.leg_l.target.slice() };
  TARGET.r[0] = TARGET.l[0] = cfg.footX || 0;
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
    if (cfg.armsFn) p = cfg.armsFn(p, f);
    return fitLegs(p);
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
  let floor = 1e9, floorAt = null, knee = [999, 0], dorsi = 0, feet = 0, line = [999, -999];
  const W0 = R.evalPose(rig, tl.pose(0), contacts);
  for (let i = 0; i <= 1600; i++) {
    const t = (i / 1600) * D, W = R.evalPose(rig, tl.pose(t), contacts);
    const fy = L.shapeMinY(W); if (fy.y < floor) { floor = fy.y; floorAt = [fy.id, +t.toFixed(2)]; }
    const k = kneeOf(W, 'r'); knee = [Math.min(knee[0], k), Math.max(knee[1], k)];
    if (k > 30) { const kl = kneeLine(W); line = [Math.min(line[0], kl), Math.max(line[1], kl)]; }
    dorsi = Math.max(dorsi, ANKLE_REST - V.angle(V.sub(W.knee_r.p, W.ankle_r.p), V.sub(W.toe_r.p, W.ankle_r.p)));
    for (const j of ['ankle_r', 'ankle_l', 'toe_r', 'toe_l']) feet = Math.max(feet, V.len(V.sub(W[j].p, W0[j].p)));
  }
  const Wt = L.fk(poses[cfg.topPose || 'stand'], contacts), Wb = L.fk(poses.bottom, contacts);
  const report = { pole: POLE, Y_TOP, Y_BOTTOM, floor: +floor.toFixed(2), floorAt, knee: knee.map(Math.round), kneeLine: line.map((v) => +v.toFixed(1)), dorsi: +dorsi.toFixed(1), feet: +feet.toFixed(3),
    trunkTop: +trunkLean(Wt).toFixed(1), trunkBottom: +trunkLean(Wb).toFixed(1), hipTop: poses[cfg.topPose || 'stand'].ch.hip_r.flex, hipBottom: poses.bottom.ch.hip_r.flex, pelvisBottom: Wb.pelvis.p.map(r1), Wb, Wt };
  if (dorsi > 34) { console.error('FAIL: ankle dorsiflexion beyond the rig limit'); process.exitCode = 1; }
  if (feet > 0.05) { console.error('FAIL: feet move'); process.exitCode = 1; }
  ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
  return { ex, report, kneeOf, trunkLean, SHOULDER_W, contacts, poses };
}
module.exports = { author, kneeOf, trunkLean, SHOULDER_W };
