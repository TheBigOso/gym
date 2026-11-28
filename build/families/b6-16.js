// Batch 6 family b6-16: supine alternating leg raises, lying knee raise, hanging knee / leg / oblique raises, prone arm
// raises, the bench dragon flag and the box reverse extension. Built on core-a (supine base, planted hands), hips
// (fitArm, module_) and b5-barkb (pull-up grip, centre of mass), generalised from author-lying-leg-raise.js and
// author-hanging-leg-hip-raise.js.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./core-a');
const H = require('./hips');
const EQ = require('./equip');
const HB = require('./b5-barkb');

/* ---------------- Supine: arms by the sides, palms down (planted hands) ---------------- */
function supine() {
  const B = C.lie({ kneeFlex: 0 });
  const HC = C.handContacts();
  const targets = C.handTargets(B.pose, { abd: 12 });
  const base = C.plantHands(B.pose, targets, HC);
  return { base, HC, targets };
}
// Each leg: { deg } (hip-to-ankle line from the floor), { heel } (lowest point of the lower leg above the mat), or
// { rest: true } (lying on the mat, as the base)
function legsLR(base, r, l) {
  let p = clone(base);
  for (const [s, o] of [['r', r], ['l', l]]) {
    if (o.rest) { p.ch[`hip_${s}`] = clone(base.ch[`hip_${s}`]); p.ch[`knee_${s}`] = clone(base.ch[`knee_${s}`]); p.ch[`ankle_${s}`] = clone(base.ch[`ankle_${s}`]); continue; }
    p = C.setLeg(p, s, Object.assign({ knee: 3, dorsi: -14 }, o));
  }
  return p;
}
// Head and shoulders curled up (crunch hold) with the pelvis fixed: upper-spine flexion plus neck flexion, hands
// refitted to their planted targets.
function headUp(pose, f, HC, targets) {
  const p = clone(pose);
  p.ch.spine_t12 = { rot: 0, latFlex: 0, flex: r1(pose.ch.spine_t12.flex + 9 * f) };
  p.ch.spine_t6 = { rot: 0, latFlex: 0, flex: r1(pose.ch.spine_t6.flex + 13 * f) };
  const n0 = pose.ch.neck_c7.flex + pose.ch.head_c1.flex;
  C.neck(p, n0 + (30 - n0) * f);
  p.ch.sc_r = { protract: r1(6 * f), elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);
  return C.plantHands(p, targets, HC);
}

// Alternate leg raise with both legs hovering: rest, lift both heels (and optionally the head and shoulders), right leg
// to about vertical and back to the hover, left leg the same, lower to the mat. Timing as the meta phases.
function altHover(meta, { head = false, HOVER = 6, TOP = 82 } = {}) {
  const { base, HC, targets } = supine();
  const up = (p) => (head ? headUp(p, 1, HC, targets) : p);
  const hov = { heel: HOVER, knee: 3, dorsi: -16 };
  const poses = {
    rest: legsLR(base, { rest: true }, { rest: true }),
    hover: up(legsLR(base, hov, hov)),
    rMid: up(legsLR(base, { deg: 42, knee: 4, dorsi: -12 }, hov)), rTop: up(legsLR(base, { deg: TOP, knee: 6, dorsi: -10 }, hov)), rHold: up(legsLR(base, { deg: TOP + 1, knee: 6, dorsi: -10 }, hov)),
    lMid: up(legsLR(base, hov, { deg: 42, knee: 4, dorsi: -12 })), lTop: up(legsLR(base, hov, { deg: TOP, knee: 6, dorsi: -10 })), lHold: up(legsLR(base, hov, { deg: TOP + 1, knee: 6, dorsi: -10 })),
  };
  if (head) poses.headOnly = headUp(poses.rest, 0.5, HC, targets);
  const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.5, pose: 'rest' }, ...(head ? [{ t: 0.8, pose: 'headOnly' }] : []), { t: 1.1, pose: 'hover' },
    { t: 1.65, pose: 'rMid' }, { t: 2.2, pose: 'rTop' }, { t: 2.5, pose: 'rHold' }, { t: 3.05, pose: 'rMid' }, { t: 3.6, pose: 'hover' },
    { t: 4.15, pose: 'lMid' }, { t: 4.7, pose: 'lTop' }, { t: 5.0, pose: 'lHold' }, { t: 5.55, pose: 'lMid' }, { t: 6.1, pose: 'hover' },
    ...(head ? [{ t: 6.5, pose: 'headOnly' }] : []), { t: 6.8, pose: 'rest' }, { t: 7.6, pose: 'rest' }];
  const ex = C.buildModule(meta, poses, keyframes, HC);
  const pk = Math.max(poses.rHold.ch.hip_r.flex, poses.lHold.ch.hip_l.flex);
  ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk - 6), max: Math.ceil(pk + 6) };
  const heel = (W, s) => C.minOf(W, [`foot_${s}`, `calf_${s}`, `shank_${s}`]);
  const rep = C.scan(ex, { legR: (W) => C.legFromFloor(W, 'r'), legL: (W) => C.legFromFloor(W, 'l') });
  // hover leg clearance while the other leg works (1.1 s to 6.1 s)
  const tl = R.buildTimeline(ex); let hoverMin = 1e9;
  for (let t = 1.1; t <= 6.1; t += 0.01) { const W = R.evalPose(rig, tl.pose(t), HC); hoverMin = Math.min(hoverMin, heel(W, 'r'), heel(W, 'l')); }
  rep.hoverMin = +hoverMin.toFixed(2);
  const Wh = L.fk(poses.hover, HC), Wt = L.fk(poses.rTop, HC);
  return { ex, poses, rep, HC, Wh, Wt, heel, chestLift: (W) => C.bottomOf(W, 'chest') };
}

/* ---------------- Hanging from a pull-up bar ---------------- */
// KEY entries: { hip, knee, ankle, spine:[l5,t12,t6] flex, neck:[c7,c1], sc, shX, flex, legR?, legL?, yaw?, side? }
// legR / legL override the hip { flex, abd, rot } per side; yaw turns the pelvis (deg, + = toward the right knee drive)
// with the spine counter-rotating so the shoulders stay square to the bar; side bends the trunk (+ = right side shortens).
function hanging({ barH = 214, gz = 25, keys, seq, meta }) {
  const PB = EQ.pullupBar({ height: barH, width: 120 });
  const bar = PB.bar;
  const G = HB.overhandGrip({ bar, barH, gz, tilt: 5 });
  const { WT, contacts, grip } = G;
  const st = L.POSES.standing();
  function bodyPose(k, root = [0, 100, 0], pitch = 0, twist = 0, bend = 0) {
    const p = clone(st.pose); delete p.ik;
    p.root.pos = root.slice(); p.root.rot = { pitch, yaw: k.yaw || 0, roll: 0 };
    const rotSplit = [0.1, 0.45, 0.45], latSplit = [0.4, 0.4, 0.2];
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j] = { rot: twist * rotSplit[i], latFlex: bend * latSplit[i], flex: k.spine[i] }; });
    p.ch.neck_c7 = { rot: 0, flex: k.neck[0] }; p.ch.head_c1 = { rot: 0, flex: k.neck[1] };
    p.ch.sc_r = clone(k.sc); p.ch.sc_l = clone(k.sc);
    for (const s of ['r', 'l']) {
      const o = (s === 'r' ? k.legR : k.legL) || {};
      p.ch[`hip_${s}`] = { flex: o.flex ?? k.hip, abd: o.abd ?? 1, rot: o.rot ?? 0 }; p.ch[`knee_${s}`] = { flex: o.knee ?? k.knee }; p.ch[`ankle_${s}`] = { dorsi: k.ankle };
    }
    p.ch.shoulder_r = { plane: 20, elev: 170, axial: 0 }; p.ch.shoulder_l = clone(p.ch.shoulder_r); p.ch.elbow_r = { flex: k.flex }; p.ch.elbow_l = { flex: k.flex };
    return p;
  }
  function placeKey(k) {
    const want = L.reach(k.flex), asym = !!(k.yaw || k.side || k.legR || k.legL);
    const paths = ['root.pos.0', 'root.pos.1', 'root.rot.pitch'];
    const objs = [
      (W) => [(V.len(V.sub(W.shoulder_r.p, WT.r)) - want) * 3, k.shX == null ? 0 : (W.shoulder_r.p[0] - (WT.r[0] + k.shX)) * 2, (HB.comX(W) - WT.r[0]) * 2, Math.max(0, W.shoulder_r.p[1] - WT.r[1] + 20) * 5],
      (W, q) => [k.shX == null ? q.root.rot.pitch * 0.5 : 0],
    ];
    if (asym) objs.push(
      (W) => [(V.len(V.sub(W.shoulder_l.p, WT.l)) - want) * 3, HB.com(W)[2] * 1.5],
      // shoulders square to the bar: shoulder line along Z (no turn, no tilt)
      (W) => { const d = V.norm(V.sub(W.shoulder_r.p, W.shoulder_l.p)); return [d[0] * 20, d[1] * 20]; },
    );
    if (!asym) return L.solvePose(bodyPose(k, [0, 110, 0], 0), paths, objs, { iters: 400 });
    // asymmetric key: root position, pitch, roll and one spine twist (shared over L5 / T12 / T6) solved together
    const mk = (x) => { const q = bodyPose(k, [x[0], x[1], x[2]], x[3], x[5], k.side || 0); q.root.rot.roll = x[4]; return q; };
    const res = (x) => { const q = mk(x), W = L.fk(q); return objs.flatMap((f) => f(W, q)); };
    const sol = R.solveLM([0, 110, 0, 0, -(k.side || 0), -(k.yaw || 0)], res, { iters: 400 });
    const out = mk(sol.x.map(r1));
    for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) { out.ch[j].rot = r1(out.ch[j].rot); out.ch[j].latFlex = r1(out.ch[j].latFlex); }
    return { pose: out, cost: sol.cost };
  }
  const poses = {}, place = {};
  const solveNamed = (n, k) => { const s = placeKey(k); place[n] = { cost: +s.cost.toFixed(4), pitch: s.pose.root.rot.pitch }; poses[n] = G.fitArms(s.pose, k.flex); };
  for (const [n, k] of Object.entries(keys)) solveNamed(n, k);
  const lerpN = (a, b, f) => (a == null && b == null ? null : (a ?? 0) + ((b ?? 0) - (a ?? 0)) * f);
  const lerpLeg = (a, b, f, ka, kb) => { if (!a && !b) return undefined; const A = a || { flex: ka.hip, abd: 1, rot: 0, knee: ka.knee }, B = b || { flex: kb.hip, abd: 1, rot: 0, knee: kb.knee }; const o = {}; for (const c of ['flex', 'abd', 'rot', 'knee']) o[c] = lerpN(A[c] ?? (c === 'flex' ? ka.hip : c === 'knee' ? ka.knee : c === 'abd' ? 1 : 0), B[c] ?? (c === 'flex' ? kb.hip : c === 'knee' ? kb.knee : c === 'abd' ? 1 : 0), f); return o; };
  function lerpKey(a, b, f) {
    const o = { spine: a.spine.map((v, i) => v + (b.spine[i] - v) * f), neck: a.neck.map((v, i) => v + (b.neck[i] - v) * f), sc: { protract: lerpN(a.sc.protract, b.sc.protract, f), elevate: lerpN(a.sc.elevate, b.sc.elevate, f) } };
    for (const c of ['hip', 'knee', 'ankle', 'flex']) o[c] = lerpN(a[c], b[c], f);
    o.shX = a.shX == null && b.shX == null ? null : lerpN(a.shX ?? 0, b.shX ?? 0, f);
    const yaw = lerpN(a.yaw, b.yaw, f), side = lerpN(a.side, b.side, f);
    if (yaw) o.yaw = yaw; if (side) o.side = side;
    const lr = lerpLeg(a.legR, b.legR, f, a, b), ll = lerpLeg(a.legL, b.legL, f, a, b);
    if (lr) o.legR = lr; if (ll) o.legL = ll;
    return o;
  }
  const keyframes = [];
  seq.forEach(([n, t], i) => {
    if (i > 0 && seq[i - 1][0] !== n) {
      const [pn, pt] = seq[i - 1], nm = [pn, n].sort().join('_');
      if (!poses[nm]) solveNamed(nm, lerpKey(keys[pn], keys[n], 0.5));
      keyframes.push({ t: +((pt + t) / 2).toFixed(3), pose: nm });
    }
    keyframes.push({ t, pose: n });
  });
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [PB.prop];
  for (const p of Object.values(ex.poses)) p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 } };
  // whole-loop self-check
  const barA = V.sub(bar.c, [0, 0, 60]), barB = V.add(bar.c, [0, 0, 60]);
  const tl = R.buildTimeline(ex), Dur = ex.timeline.duration;
  const rep = { slide: 0, floor: 1e9, floorAt: null, bar: 1e9, barAt: null, gripErr: 0, comX: 0, comZ: 0, selfHit: 1e9 };
  for (let i = 0; i <= 1080; i++) {
    const t = (i / 1080) * Dur, W = R.evalPose(rig, tl.pose(t), ex.contacts);
    for (const s of ['r', 'l']) { const sl = V.len(V.sub(W[`wrist_${s}`].p, WT[s])); if (sl > rep.slide) { rep.slide = sl; rep.slideAt = [s, +t.toFixed(2)]; } rep.gripErr = Math.max(rep.gripErr, V.len(V.sub(EQ.gripPoint(W, s).p, grip[s]))); }
    const f = L.shapeMinY(W); if (f.y < rep.floor) { rep.floor = f.y; rep.floorAt = [f.id, +t.toFixed(2)]; }
    const c = EQ.segmentClear(W, barA, barB, bar.r, { skip: /^(hand|thumb)_/, n: 24 }); if (c.d < rep.bar) { rep.bar = c.d; rep.barAt = [c.id, +t.toFixed(2)]; }
    const cm = HB.com(W); rep.comX = Math.max(rep.comX, Math.abs(cm[0] - WT.r[0])); rep.comZ = Math.max(rep.comZ, Math.abs(cm[2]));
    rep.selfHit = Math.min(rep.selfHit, legGap(W));
  }
  for (const k of ['slide', 'floor', 'bar', 'gripErr', 'comX', 'comZ', 'selfHit']) rep[k] = +rep[k].toFixed(3);
  const viol = HB.limitViolations(ex);
  const fail = [];
  if (rep.slide > 0.05) fail.push('hands slide on the bar');
  if (rep.floor < 0) fail.push('feet touch the floor');
  if (rep.bar < 0.5) fail.push('body through the bar');
  if (rep.selfHit < -1) fail.push(`legs pass through each other (${rep.selfHit} cm)`);
  if (viol.length) fail.push(`joint limits ${viol.join(', ')}`);
  return { ex, poses, place, rep, fail, WT, PB };
}
// distance between the right and left lower legs (shank capsules): < 0 means they intersect
function legGap(W) {
  const seg = (a0, a1, b0, b1) => { let best = 1e9; for (let i = 0; i <= 8; i++) { const p = V.add(W[a0].p, V.scale(V.sub(W[a1].p, W[a0].p), i / 8)); for (let j = 0; j <= 8; j++) { const q = V.add(W[b0].p, V.scale(V.sub(W[b1].p, W[b0].p), j / 8)); best = Math.min(best, V.len(V.sub(p, q))); } } return best; };
  return Math.min(seg('knee_r', 'ankle_r', 'knee_l', 'ankle_l'), seg('hip_r', 'knee_r', 'hip_l', 'knee_l') - 2) - 10; // shank radii about 5 cm each
}
const legFromHorizontal = (W, s = 'r') => Math.atan2(W[`ankle_${s}`].p[1] - W[`hip_${s}`].p[1], Math.hypot(W[`ankle_${s}`].p[0] - W[`hip_${s}`].p[0], W[`ankle_${s}`].p[2] - W[`hip_${s}`].p[2])) / R.DEG;


/* ---------------- Prone on the mat (from author-superman.js): head toward +X, face down ---------------- */
const P = require('./prone');
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const sym = (p, j, v) => { p.ch[`${j}_r`] = clone(v); p.ch[`${j}_l`] = clone(v); };
const lowest = (W, ids) => Math.min(...ids.map((id) => P.bottomOf(W, id)));
const BODY = ['chest', 'pecs_r', 'ribcage', 'abdomen', 'pelvis'], THIGH = ['thigh_r', 'quad_r', 'shank_r'];
const NOT_ARMS = rig.shapes.map((x) => x.id).filter((id) => !/^(deltoid|upperarm|biceps|forearm|hand|thumb)_/.test(id));
// Lying prone with the arms parked out of the way (the caller places them); chest, thighs and insteps on the mat.
function proneLie({ neck = -10 } = {}) {
  const p = { root: { pos: [0, 12, 0], rot: { pitch: -90 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 } } };
  sym(p, 'hip', { flex: 0, abd: 3, rot: 0 }); sym(p, 'knee', { flex: 2 }); sym(p, 'ankle', { dorsi: -62 });
  sym(p, 'sc', { protract: 0, elevate: 0 }); sym(p, 'elbow', { flex: 6 });
  sym(p, 'shoulder', { plane: 80, elev: 165, axial: 0 }); sym(p, 'wrist', { pron: 90, flex: 0, dev: 0 });
  P.head(p, neck);
  const s = L.solvePose(p, ['root.pos.1', 'root.rot.pitch', 'ch.hip_r.flex', 'ch.ankle_r.dorsi', 'ch.knee_r.flex'], [
    (W) => [lowest(W, BODY) * 3, lowest(W, THIGH) * 2, lowest(W, ['foot_r']) * 1, Math.min(0, lowest(W, ['foot_r']) + 0.1) * 8, Math.min(0, lowest(W, NOT_ARMS)) * 6],
    (W, q) => [Math.min(0, q.ch.ankle_r.dorsi + 73) * 5, (q.ch.knee_r.flex - 2) * 0.05, Math.min(0, q.ch.knee_r.flex) * 5, Math.max(0, q.ch.hip_r.flex - 3) * 5],
  ]);
  sym(s.pose, 'hip', s.pose.ch.hip_r); sym(s.pose, 'ankle', s.pose.ch.ankle_r); sym(s.pose, 'knee', s.pose.ch.knee_r);
  const W = L.fk(s.pose); s.pose.root.pos[1] = r1(s.pose.root.pos[1] - Math.min(lowest(W, BODY), lowest(W, THIGH)));
  return s.pose;
}
// Straight arm (both sides, mirrored) with the lowest point of the hand `handY` cm above the mat and the thumb pointing up.
// mode 'T': out to the side (shoulder elevation `elev`, plane solved); mode 'I': overhead (plane fixed, elevation solved).
function proneArms(pose, { mode, handY, elev = 90, plane = 85, sc = { protract: 0, elevate: 0 }, elbow = 4 }) {
  const p = clone(pose);
  p.ch.sc_r = clone(sc); p.ch.elbow_r = { flex: elbow };
  p.ch.shoulder_r = mode === 'T' ? { plane: 10, elev, axial: 60 } : { plane, elev: 170, axial: 60 };
  p.ch.wrist_r = { pron: 0, flex: 0, dev: 0 };
  const paths = mode === 'T' ? ['ch.shoulder_r.plane', 'ch.shoulder_r.axial', 'ch.wrist_r.pron'] : ['ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.wrist_r.pron'];
  const thumbUp = (W) => { const t = Q.rot(W.wrist_r.q, [0, 0, 1]); return [(t[1] - 1) * 8]; };
  let best = null;
  for (const ax of [-60, 0, 60, 120]) {
    const q0 = clone(p); q0.ch.shoulder_r.axial = ax;
    const s = L.solvePose(q0, paths, [(W) => [(P.bottomOf(W, 'hand_r') - handY) * 3], thumbUp, L.obj.reg('ch.wrist_r.pron', 0, 0.02), C.limitPen(paths, 3)], { iters: 300 });
    if (!best || s.cost < best.cost) best = s;
  }
  const q = best.pose;
  q.ch.shoulder_r.axial = r1(L.wrap(q.ch.shoulder_r.axial)); q.ch.wrist_r.pron = r1(L.wrap(q.ch.wrist_r.pron));
  for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  q.__cost = best.cost;
  return q;
}

/* ---------------- Body shapes against an axis-aligned box prop (bench seat, plyo box) ---------------- */
// Signed clearance (cm) of the listed rig shapes from a box { center:[x,0,z] (bottom centre), size:[sx,sy,sz] }:
// > 0 = gap, < 0 = penetration depth. Sampled on the shape surfaces (ellipsoids: 26 directions; capsules: 9 rings of 8).
const BUILT = R.buildRig(rig);
const shapeIdsAll = BUILT.shapes.map((s) => s.id);
const DIRS = []; for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) DIRS.push(V.norm([x, y, z]));
function boxSigned(p, lo, hi) {
  const q = p.map((v, i) => Math.max(lo[i], Math.min(hi[i], v))), d = V.len(V.sub(p, q));
  if (d > 0) return d;
  return -Math.min(...p.map((v, i) => Math.min(v - lo[i], hi[i] - v)));
}
function boxClear(W, box, ids = shapeIdsAll) {
  const [cx, cy, cz] = box.center, [sx, sy, sz] = box.size, lo = [cx - sx / 2, cy, cz - sz / 2], hi = [cx + sx / 2, cy + sy, cz + sz / 2];
  let best = { d: 1e9, id: null };
  for (const s of BUILT.shapes) {
    if (!ids.includes(s.id)) continue;
    const g = R.shapeWorld(W, s), pts = [];
    if (g.kind === 'capsule') {
      const ax = V.sub(g.b, g.a), n = V.norm(ax), u = V.norm(V.cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = V.cross(n, u);
      for (let i = 0; i <= 8; i++) { const c = V.add(g.a, V.scale(ax, i / 8)), r = g.r[0] + (g.r[1] - g.r[0]) * (i / 8); for (let k = 0; k < 8; k++) { const a = (k / 8) * 2 * Math.PI; pts.push(V.add(c, V.add(V.scale(u, r * Math.cos(a)), V.scale(w, r * Math.sin(a))))); } }
    } else for (const d of DIRS) pts.push(V.add(g.c, V.add(V.add(V.scale(g.axes[0], d[0]), V.scale(g.axes[1], d[1])), V.scale(g.axes[2], d[2]))));
    for (const p of pts) { const d = boxSigned(p, lo, hi); if (d < best.d) best = { d, id: s.id }; }
  }
  return best;
}

module.exports = { boxClear, shapeIdsAll, proneLie, proneArms, lowestOf: lowest, BODY, supine, legsLR, headUp, altHover, hanging, legGap, legFromHorizontal };
