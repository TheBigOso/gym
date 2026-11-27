// Curl family, part 2 (batch 4): helpers shared by the ten b4-curls2 authors. Builds on b3-curls (setArm, clearances,
// loop checks, seatOnBench) and b3-back (holdArm, benchBoxes, chest-on-pad support). Adds:
//   - handleArm: solve the right arm so the dumbbell handle centre (not the wrist) reaches a point, with the handle axis
//     (thumb side) along a world direction, an optional elbow target and wrist kept straight
//   - copyArm / mirrorArmTo: copy one arm's channels to the other side (the engine mirrors left joints)
//   - keys: key poses at curl fractions plus up / squeeze / down keyframes timed with a smoothstep profile
//   - chestOnPad: prone body on an incline back pad (chest on the pad, balls of the feet planted behind the bench)
//   - wallStand: standing with the back of the skinned mesh against a wall prop (feet planted a few cm forward)
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const D = require('./dumbbell');
const C = require('./b3-curls');
const B = require('./b3-back');
const P = require('./prone');
const { makeFamily, BALL_PITCH } = require('./lunge');

const ARM = (s) => [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`];
// Right arm: dumbbell handle centre at `handle`, handle axis (thumb side) along `axis`; opt.palm: palm normal (world),
// opt.elbow + opt.elbowW: elbow target; opt.guesses: [plane, elev, axial, flex, pron] starts; opt.extra: more residuals.
function handleArm(pose, handle, opt = {}) {
  const s = 'r', paths = ARM(s);
  const objs = [(W) => V.sub(D.dumbbellAt(W, s, 'handle').c, handle).map((v) => v * 3)];
  if (opt.axis) objs.push((W) => V.sub(Q.rot(W[`wrist_${s}`].q, [0, 0, 1]), V.norm(opt.axis)).map((v) => v * (opt.axisW ?? 4)));
  if (opt.palm) objs.push((W) => V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), V.norm(opt.palm)).map((v) => v * (opt.palmW ?? 4)));
  if (opt.elbow) objs.push(L.obj.at(`elbow_${s}`, opt.elbow, opt.elbowW ?? 0.5));
  objs.push(L.obj.reg(`ch.wrist_${s}.flex`, opt.wflex ?? 0, opt.wristW ?? 0.08), L.obj.reg(`ch.wrist_${s}.dev`, opt.wdev ?? 0, opt.wristW ?? 0.08), L.obj.reg(`ch.shoulder_${s}.axial`, opt.axial ?? 0, opt.axialW ?? 0.005));
  objs.push((W, q) => { const sh = q.ch[`shoulder_${s}`], el = q.ch[`elbow_${s}`].flex, w = q.ch[`wrist_${s}`]; return [Math.min(0, sh.elev - (opt.minElev ?? 3)) * 2, Math.min(0, sh.plane + 59) * 2, Math.max(0, sh.plane - 139) * 2, Math.min(0, el - 1) * 2, Math.max(0, el - 149) * 2, Math.min(0, w.flex + 60), Math.max(0, w.flex - 60), Math.min(0, w.dev + 18), Math.max(0, w.dev - 30)]; });
  if (opt.extra) objs.push(...opt.extra);
  const sh = pose.ch[`shoulder_${s}`] || { plane: 0, elev: 10, axial: 0 };
  const guesses = opt.guesses || [[sh.plane, sh.elev, sh.axial || 0, (pose.ch[`elbow_${s}`] || {}).flex || 10, (pose.ch[`wrist_${s}`] || {}).pron || 0]];
  let best = null;
  for (const g of guesses) {
    const q0 = clone(pose);
    q0.ch[`shoulder_${s}`] = { plane: g[0], elev: g[1], axial: g[2] }; q0.ch[`elbow_${s}`] = { flex: g[3] }; q0.ch[`wrist_${s}`] = { pron: g[4], flex: 0, dev: 0 };
    const r = L.solvePose(q0, paths, objs, { iters: opt.iters || 300, contacts: opt.contacts });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const out = best.pose;
  out.__cost = best.cost;
  return out;
}
const armOf = (p, s) => ({ sc: clone(p.ch[`sc_${s}`]), shoulder: clone(p.ch[`shoulder_${s}`]), elbow: clone(p.ch[`elbow_${s}`]), wrist: clone(p.ch[`wrist_${s}`]) });
function putArm(p, s, a) { for (const j of ['sc', 'shoulder', 'elbow', 'wrist']) if (a[j]) p.ch[`${j}_${s}`] = clone(a[j]); return p; }
const mirrorArmTo = (p) => putArm(p, 'l', armOf(p, 'r'));
// Unwrap each arm channel toward a reference pose so keyframe interpolation never takes the long way round
function unwrapTo(p, ref) {
  for (const j in p.ch) for (const c in p.ch[j]) { if (c === 'elev') continue; const v = p.ch[j][c], r = ref && ref.ch[j] && ref.ch[j][c]; if (typeof v === 'number' && typeof r === 'number') p.ch[j][c] = r1(v + 360 * Math.round((r - v) / 360)); }
  return p;
}

// Keyframes for a curl rep from key poses at fractions FS (0 = bottom, 1 = top): smoothstep timing up (t0..t1), hold the
// top to t2 with a squeeze pose if given, back down (t2..t3), bottom to D. names: pose names for each fraction.
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
function keys(names, FS, { t0, t1, t2, t3, D: Dur, squeeze, lead = 0 }) {
  const N = FS.length - 1, kf = [{ t: 0, pose: names[0] }, { t: t0, pose: names[0] }];
  for (let i = 1; i <= N; i++) kf.push({ t: +(t0 + (t1 - t0) * inv(FS[i])).toFixed(3), pose: names[i] });
  if (squeeze) kf.push({ t: t2, pose: squeeze }); else kf.push({ t: t2, pose: names[N] });
  for (let i = N - 1; i >= 0; i--) kf.push({ t: +(t2 + (t3 - t2) * inv(1 - FS[i])).toFixed(3), pose: names[i] });
  if (Dur > t3 + 1e-6) kf.push({ t: Dur, pose: names[0] });
  return kf;
}

/* ---------------- Curl arc ---------------- */
// Right-arm curl keys: the bottom handle position is solved first; then the handle swings about the elbow in the plane
// given by `fwd` (unit, world; default +X) and `down` (default -Y) while the elbow drifts by `drift` (cm, at f = 1). The
// handle axis follows axis(f) (world, thumb side). flex1: elbow flexion added at the top relative to the bottom (deg).
// Returns { poses: [pose per FS], E0, dh }.
function arcCurl(base, { handle0, axis, flex1 = 125, drift = [0, 0, 0], FS, contacts, guess, fwd = [1, 0, 0], down = [0, -1, 0], elbowW = 2, palm, extra = [], elbow0, elbow0W = 0.5, armOpt = {}, fixBottom = true }) {
  const ax = typeof axis === 'function' ? axis : () => axis;
  const pm = typeof palm === 'function' ? palm : palm ? () => palm : null;
  const p0 = handleArm(base, handle0, { axis: ax(0), palm: pm && pm(0), guesses: guess ? [guess] : undefined, contacts, extra, elbow: elbow0, elbowW: elbow0W, ...armOpt });
  const FW = typeof fwd === 'function' ? fwd : () => fwd, fw0 = FW(0);
  const W0 = L.fk(p0, contacts), E0 = W0.elbow_r.p, H0 = D.dumbbellAt(W0, 'r', 'handle').c, rel = V.sub(H0, E0);
  const a0 = Math.atan2(V.dot(rel, fw0), V.dot(rel, down)), dp = V.dot(rel, down), df = V.dot(rel, fw0), side = V.sub(rel, V.add(V.scale(fw0, df), V.scale(down, dp)));
  const rr = Math.hypot(dp, df);
  const poses = []; let g = [p0.ch.shoulder_r.plane, p0.ch.shoulder_r.elev, p0.ch.shoulder_r.axial, p0.ch.elbow_r.flex, p0.ch.wrist_r.pron];
  for (const f of FS) {
    if (f === 0) { poses.push(p0); continue; }
    const a = a0 + flex1 * f * R.DEG, E = V.add(E0, V.scale(drift, f));
    const H = V.add(V.add(E, side), V.add(V.scale(down, rr * Math.cos(a)), V.scale(FW(f), rr * Math.sin(a))));
    const q = handleArm(base, H, { axis: ax(f), palm: pm && pm(f), elbow: E, elbowW, guesses: [g], contacts, extra, ...armOpt });
    g = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron];
    q.__H = H; poses.push(q);
  }
  // A nearly straight arm leaves the humeral rotation free (the solver can trade it for forearm rotation), so re-solve the
  // bottom with the shoulder rotation and plane held near the next key: the hinge plane then stays put through the rep
  if (fixBottom && poses.length > 1) {
    const n = poses[1].ch.shoulder_r;
    const q = handleArm(base, handle0, { axis: ax(0), palm: pm && pm(0), guesses: [[n.plane, n.elev, n.axial, poses[1].ch.elbow_r.flex * 0.3, poses[1].ch.wrist_r.pron]], contacts, extra: [...extra, L.obj.reg('ch.shoulder_r.axial', n.axial, 0.3), L.obj.reg('ch.shoulder_r.plane', n.plane, 0.1)], elbow: elbow0, elbowW: elbow0W, ...armOpt });
    poses[0] = q;
  }
  return { poses, E0, H0, rr, a0 };
}

/* ---------------- Pure hinge curl ---------------- */
// Keep the shoulder channels of a bottom pose p0 (right arm) and curl about the elbow hinge only: the humeral rotation
// (axial) is chosen so that at flexTop the dumbbell handle points at `target` (world), and the forearm rotation goes from
// pronB (or the value that keeps the bottom handle axis along axisB) to the value that best matches at the top.
// Returns poses at FS (elbow flex and forearm rotation interpolated; shoulder fixed).
function hingeCurl(p0, { flexTop = 125, target, axisB, axisT, FS, contacts, flexB, pronEase = (f) => f }) {
  const s = 'r';
  let top = clone(p0); top.ch.elbow_r = { flex: flexTop };
  const objT = [(W) => V.sub(D.dumbbellAt(W, s, 'handle').c, target).map((v) => v * 1)];
  if (axisT) objT.push((W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), V.norm(axisT)).map((v) => v * 6));
  top = L.solvePose(top, ['ch.shoulder_r.axial', 'ch.wrist_r.pron'], objT, { contacts, iters: 300 }).pose;
  top.ch.wrist_r.pron = r1(L.wrap(top.ch.wrist_r.pron)); top.ch.shoulder_r.axial = r1(L.wrap(top.ch.shoulder_r.axial));
  let bot = clone(p0); bot.ch.shoulder_r.axial = top.ch.shoulder_r.axial; if (flexB != null) bot.ch.elbow_r = { flex: flexB };
  if (axisB) bot = L.solvePose(bot, ['ch.wrist_r.pron'], [(W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), V.norm(axisB)).map((v) => v * 6)], { contacts }).pose;
  bot.ch.wrist_r.pron = r1(bot.ch.wrist_r.pron + 360 * Math.round((top.ch.wrist_r.pron - bot.ch.wrist_r.pron) / 360));
  const fb = bot.ch.elbow_r.flex, pb = bot.ch.wrist_r.pron, pt = top.ch.wrist_r.pron;
  return FS.map((f) => { const q = clone(bot); q.ch.elbow_r = { flex: r1(fb + (flexTop - fb) * f) }; q.ch.wrist_r = { pron: r1(pb + (pt - pb) * pronEase(f)), flex: 0, dev: 0 }; return q; });
}

/* ---------------- Chest on an incline pad (prone incline / spider curls) ---------------- */
// Bench with the pad rising toward +X (side 1): the athlete stands behind the seat end (-X), straddles the seat and lies
// chest-down on the pad, chin just over the top, balls of the feet planted behind. Same setup as the batch 3
// chest-supported row. opt: { ang, along, chestOff, foot:[x,z], neck, head, hip, knee }
function chestOnPad(opt = {}) {
  const ANG = opt.ang ?? 45, PAD = opt.pad ?? 80, BW = opt.width ?? 28, SEAT = opt.seat ?? 40, BENCH_H = opt.height ?? 45;
  const bench = D.bench({ x: -SEAT / 2, z: 0, seat: SEAT, height: BENCH_H, width: BW, angle: ANG, back: PAD, side: 1 });
  const boxes = B.benchBoxes(bench), dir = bench.padDir, nrm = [-dir[1], dir[0], 0];
  const fq = (pitch, yaw) => P.qArr(Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch)));
  const HEEL = opt.heel ?? BALL_PITCH;
  const contacts = [Object.assign(L.legContact('r'), { label: 'Right foot (ball)', pole: [1, 0, 0.7], handRot: fq(HEEL, -15) }),
    Object.assign(L.legContact('l'), { label: 'Left foot (ball)', pole: [1, 0, -0.7], handRot: fq(HEEL, 15) })];
  const footSh = rig.shapes.find((s) => s.id === 'foot_r');
  const ANK = (() => { let a = 2, b = 30; for (let i = 0; i < 40; i++) { const y = (a + b) / 2, st = L.POSES.standing().pose; st.ik = { leg_r: { target: [0, y, 10], weight: 1 } }; const g = R.shapeWorld(L.fk(st, [contacts[0]]), footSh); const lo = g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); if (lo > 0.15) b = y; else a = y; } return r1((a + b) / 2 + 0.05); })();
  const foot = opt.foot || [-50, 26];
  const FT = { r: [foot[0], ANK, foot[1]], l: [foot[0], ANK, -foot[1]] };
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  const PITCH = -(90 - ANG) - 8;
  const hip = opt.hip || { flex: 45, abd: 30, rot: -30 }, knee = opt.knee ?? 55;
  const base = (pos) => ({ root: { pos, rot: { pitch: PITCH } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: opt.neck ?? -14 }, head_c1: { rot: 0, flex: opt.head ?? -16 },
    sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 }, hip_r: clone(hip), hip_l: clone(hip), knee_r: { flex: knee }, knee_l: { flex: knee }, ankle_r: { dorsi: -8 }, ankle_l: { dorsi: -8 },
    shoulder_r: { plane: 90, elev: 60, axial: 0 }, shoulder_l: { plane: 90, elev: 60, axial: 0 }, elbow_r: { flex: 8 }, elbow_l: { flex: 8 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 } },
    ik: { leg_r: { target: FT.r, weight: 1 }, leg_l: { target: FT.l, weight: 1 } } });
  const TRUNK = rig.shapes.filter((s) => /^(chest|pecs_r|pecs_l|ribcage|abdomen)$/.test(s.id));
  const frontGap = (W) => { let m = 1e9; for (const s of TRUNK) { const g = R.shapeWorld(W, s); const ext = Math.sqrt(g.axes.reduce((a, ax) => a + V.dot(ax, nrm) ** 2, 0)); m = Math.min(m, V.dot(V.sub(g.c, bench.hinge), nrm) - ext); } return m; };
  let pos = V.add(V.add(bench.hinge, V.scale(dir, opt.along ?? 23)), V.scale(nrm, 20));
  for (let it = 0; it < 40; it++) { const g = frontGap(L.fk(base(pos))) - (opt.chestOff ?? 0); pos = V.sub(pos, V.scale(nrm, g)); if (Math.abs(g) < 0.005) break; }
  let body = base(pos.map((v) => +v.toFixed(2)));
  body = P.fitLeg(body, 'r', contacts, 'leg_r'); body = P.fitLeg(body, 'l', contacts, 'leg_l'); B.wrapPose(body);
  const along = (W, j) => r1(V.dot(V.sub(W[j].p, bench.hinge), dir));
  return { bench, boxes, dir, nrm, contacts, body, frontGap, along, ANG, PAD };
}

/* ---------------- Whole-loop report for the b4 curls ---------------- */
// Sweep the timeline: floor, planted-contact slide, elbow range per arm, dumbbells vs body (rig), floor and boxes
// (oriented, from B.benchBoxes or custom), arm capsules vs boxes. opt: { sides, boxes, skip, armBoxes }
function report(ex, opt = {}) {
  const sides = opt.sides || ['r', 'l'];
  const rep = C.loopCheck(ex, { sides, skip: opt.skip || [], n: opt.n || 400 });
  if (opt.boxes) {
    const tl = R.buildTimeline(ex), Dn = ex.timeline.duration; let dbBox = 1e9, armBox = 1e9, armAt = null;
    for (let i = 0; i <= 400; i++) {
      const t = (i / 400) * Dn, W = R.evalPose(rig, tl.pose(t), ex.contacts);
      for (const s of sides) {
        dbBox = Math.min(dbBox, B.dbBoxClear(W, s, opt.boxes, 'handle', D.DB));
        if (opt.armBoxes !== false) for (const [a, b, r0, r1_] of [[`shoulder_${s}`, `elbow_${s}`, 4.8, 3.6], [`elbow_${s}`, `wrist_${s}`, 3.9, 2.5]])
          for (let k = 0; k <= 8; k++) { const u = k / 8, p = V.add(W[a].p, V.scale(V.sub(W[b].p, W[a].p), u)); for (const bx of opt.boxes) { if (opt.armSkip && opt.armSkip.includes(bx.id)) continue; const d = B.boxDist(p, bx) - (r0 + (r1_ - r0) * u); if (d < armBox) { armBox = d; armAt = [a, bx.id, +t.toFixed(2)]; } } }
      }
    }
    rep.dbBox = +dbBox.toFixed(1); if (opt.armBoxes !== false) { rep.armBox = +armBox.toFixed(1); rep.armBoxAt = armAt; }
  }
  return rep;
}
function fail(rep, name, extra = [], { bodyTol = -0.3 } = {}) {
  let bad = false;
  if (rep.slide > 0.05) { console.error(`FAIL ${name}: planted contact slides ${rep.slide} cm`); bad = true; }
  if (rep.floor < -0.5) { console.error(`FAIL ${name}: body below the floor ${rep.floor}`); bad = true; }
  if (rep.dbFloor < 0) { console.error(`FAIL ${name}: dumbbell through the floor ${rep.dbFloor}`); bad = true; }
  if (rep.body.d < bodyTol) { console.error(`FAIL ${name}: dumbbell into the body ${JSON.stringify(rep.body)}`); bad = true; }
  if (rep.dbBox != null && rep.dbBox < 0) { console.error(`FAIL ${name}: dumbbell into the bench/wall ${rep.dbBox}`); bad = true; }
  for (const [ok, msg] of extra) if (!ok) { console.error(`FAIL ${name}: ${msg}`); bad = true; }
  if (bad) process.exitCode = 1;
}

// Assemble with the shared curl fields (reference note) from the meta file
function assemble(meta, parts) { return C.assemble(meta, parts); }
const wallBox = (w) => ({ id: w.id || 'wall', c: [w.center[0], w.center[1] + w.size[1] / 2, w.center[2]], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: w.size.map((v) => v / 2) });

module.exports = { hingeCurl, arcCurl, handleArm, armOf, putArm, mirrorArmTo, unwrapTo, ease, inv, keys, chestOnPad, report, fail, assemble, wallBox, ARM };
