// Batch 6 family b6-01: barbell squat / lunge / hip-thrust / press variations. Builds on squat.js, lunge.js, hips.js,
// barbell.js, b5-bbsquat.js, b5-extra.js and b5-bbpress.js without changing them.
//  - heelSquat: the squat family's author() with both heels raised on a block (feet pitched heel-up about the ball of the
//    foot, ankle targets from hips.js heelRaise) plus the block that fits under the heels.
//  - hipBar: a barbell held across the hip crease (hip thrust / glute bridge): bar centre on a line in the pelvis frame,
//    pushed out from the body until the shaft clears it, never lower than the plate radius (plates rest on the floor).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const EQ = require('./equip');
const BB = require('./barbell');

const qArr = (q) => q.map((v) => +v.toFixed(6));
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const wrapLeg = (q, s) => { for (const [j, cs] of [[`hip_${s}`, ['flex', 'abd', 'rot']], [`knee_${s}`, ['flex']], [`ankle_${s}`, ['dorsi']]]) for (const c of cs) if (q.ch[j] && Math.abs(q.ch[j][c] ?? 0) > 180) q.ch[j][c] = Math.round(L.wrap(q.ch[j][c]) * 1e6) / 1e6; };

// dense surface samples of an ellipsoid / capsule rig shape (world)
function surface(W, id, n = 24) {
  const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === id) || rig.shapes.find((x) => x.id === id.replace(/_[rl]$/, ''))), pts = [];
  if (g.kind === 'capsule') return require('./b5-bbpress').shapePts(W, id);
  for (let i = 0; i <= n; i++) { const th = (i / n) * Math.PI; for (let j = 0; j < 2 * n; j++) { const ph = (j / n) * Math.PI; const a = Math.sin(th) * Math.cos(ph), b = Math.sin(th) * Math.sin(ph), c = Math.cos(th); pts.push(V.add(g.c, V.add(V.add(V.scale(g.axes[0], a), V.scale(g.axes[1], b)), V.scale(g.axes[2], c)))); } }
  return pts;
}

/* ---------------- heels-raised squat ---------------- */
// cfg as squat.js author() plus heel (deg, foot pitch heel-up) and ballX (ball of the foot, world x)
function heelSquat(cfg, meta) {
  const TOE = cfg.toe, HEEL = cfg.heel;
  const toeDir = (s, deg = TOE) => [Math.cos(deg * R.DEG), 0, (s === 'r' ? 1 : -1) * Math.sin(deg * R.DEG)];
  const st = L.POSES.standing({ stance: cfg.stance, toeOut: TOE });
  const HR = { r: H.heelRaise(st.pose, 'r', HEEL, cfg.ballX, r1(cfg.stance), -TOE), l: H.heelRaise(st.pose, 'l', HEEL, cfg.ballX, r1(-cfg.stance), TOE) };
  const mkContacts = (poleDeg) => ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: toeDir(s, poleDeg).map((v) => +v.toFixed(4)), handRot: HR[s].handRot }));
  const TARGET = { r: HR.r.target.slice(), l: HR.l.target.slice() };
  const lead = (f) => 1 - Math.pow(1 - f, cfg.lead ?? 1.6);
  const sp = cfg.spine;
  function trunk(f) {
    const g = lead(f), p = clone(st.pose);
    p.root.pos = [r1((cfg.rootX || 0) + (cfg.backBottom || 0) * g), 60, 0];
    p.root.rot = { pitch: r1((cfg.pitchBottom || 0) * g) };
    Object.assign(p.ch, { spine_l5: { rot: 0, flex: r1(sp.l5 * g), latFlex: 0 }, spine_t12: { rot: 0, flex: r1(sp.t12 * g), latFlex: 0 }, spine_t6: { rot: 0, flex: r1(sp.t6 * g), latFlex: 0 }, sc_r: { protract: 2, elevate: 2 }, sc_l: { protract: 2, elevate: 2 } });
    const lean = -p.root.rot.pitch + (sp.l5 + sp.t12 + sp.t6) * g;
    p.ch.neck_c7 = { rot: 0, flex: r1(-lean * 0.4) }; p.ch.head_c1 = { rot: 0, flex: r1(-lean * 0.45) };
    p.ik = { leg_r: { target: TARGET.r.slice(), weight: 1 }, leg_l: { target: TARGET.l.slice(), weight: 1 } };
    return p;
  }
  function rootYFor(pose, knee, contacts) {
    let a = 20, b = 100;
    for (let i = 0; i < 60; i++) { const y = (a + b) / 2, p = clone(pose); p.root.pos[1] = y; if (kneeOf(L.fk(p, contacts), 'r') > knee) a = y; else b = y; }
    return r1((a + b) / 2);
  }
  const nFoot = [-Math.sin(TOE * R.DEG), 0, Math.cos(TOE * R.DEG)];
  const kneeLine = (W) => V.dot(V.sub(W.knee_r.p, W.ankle_r.p), nFoot);
  let lo = TOE - 10, hi = TOE + 40, POLE = TOE;
  const bottomBase = trunk(1);
  for (let i = 0; i < 40; i++) { POLE = (lo + hi) / 2; const c = mkContacts(POLE), p = clone(bottomBase); p.root.pos[1] = rootYFor(p, cfg.kneeBottom, c); if (kneeLine(L.fk(p, c)) < (cfg.kneeOut ?? 1)) lo = POLE; else hi = POLE; }
  POLE = r1(POLE);
  const contacts = mkContacts(POLE);
  const Y_TOP = rootYFor(trunk(0), cfg.kneeTop, contacts), Y_BOTTOM = rootYFor(bottomBase, cfg.kneeBottom, contacts);
  const LEG_PATHS = (s) => [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
  function fitLegs(pose) {
    const Wi = L.fk(pose, contacts); let q = pose;
    for (const s of ['r', 'l']) { q = L.solvePose(q, LEG_PATHS(s), [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2)], { iters: 200 }).pose; wrapLeg(q, s); }
    return q;
  }
  function poseAt(f) { let p = trunk(f); p.root.pos[1] = r1(Y_TOP + (Y_BOTTOM - Y_TOP) * f); if (cfg.armsFn) p = cfg.armsFn(p, f); return fitLegs(p); }
  const poses = {};
  for (const [name, f] of Object.entries(cfg.depths)) poses[name] = poseAt(f);
  if (cfg.settle) { poses.bottomSettle = clone(poses.bottom); poses.bottomSettle.root.pos[1] = r1(poses.bottom.root.pos[1] - cfg.settle); poses.bottomSettle = fitLegs(poses.bottomSettle); }
  const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts, timeline: meta.timeline, poses, keyframes: cfg.keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
  ex.exercise.reference.note = H.NOTE;
  // the heel block: top just under the lowest point of the heel, front edge where the sloping sole comes down to it
  const W0 = L.fk(poses[Object.keys(cfg.depths)[0]], contacts);
  const sole = surface(W0, 'foot_r', 40), ankX = W0.ankle_r.p[0];
  const lowAt = (x) => Math.min(...sole.filter((p) => Math.abs(p[0] - x) < 0.6).map((p) => p[1]), 1e9);
  const top = lowAt(ankX - (cfg.heelPad ?? 3)) - 0.2; // under the heel pad, a few cm behind the ankle
  let xf = ankX; for (let x = ankX - (cfg.heelPad ?? 3); x < ankX + 20; x += 0.25) { if (lowAt(x) < top) { xf = x - 0.5; break; } }
  const xb = Math.min(...sole.map((p) => p[0])) - 6;
  const block = { id: 'heelBlock', kind: 'box', center: [r1((xb + xf) / 2), 0, 0], size: [r1(xf - xb), r1(top), r1(2 * cfg.stance + 18)], color: '#5c6370' };
  // whole-loop report (as squat.js) plus the soles against the block
  const tl = R.buildTimeline(ex), D = meta.timeline.duration;
  let floor = 1e9, knee = [999, 0], dorsi = 0, feet = 0, blockPen = 1e9;
  const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset);
  const W00 = R.evalPose(rig, tl.pose(0), contacts);
  for (let i = 0; i <= 600; i++) {
    const t = (i / 600) * D, W = R.evalPose(rig, tl.pose(t), contacts);
    floor = Math.min(floor, L.shapeMinY(W).y);
    const k = kneeOf(W, 'r'); knee = [Math.min(knee[0], k), Math.max(knee[1], k)];
    dorsi = Math.max(dorsi, ANKLE_REST - V.angle(V.sub(W.knee_r.p, W.ankle_r.p), V.sub(W.toe_r.p, W.ankle_r.p)));
    for (const j of ['ankle_r', 'ankle_l', 'toe_r', 'toe_l']) feet = Math.max(feet, V.len(V.sub(W[j].p, W00[j].p)));
  }
  for (const s of ['r', 'l']) for (const p of surface(W0, `foot_${s}`, 40)) if (p[0] > xb && p[0] < xf && Math.abs(p[2]) < block.size[2] / 2) blockPen = Math.min(blockPen, p[1] - top);
  const Wt = L.fk(poses[cfg.topPose || 'stand'], contacts), Wb = L.fk(poses.bottom, contacts);
  const report = { pole: POLE, Y_TOP, Y_BOTTOM, floor: +floor.toFixed(2), knee: knee.map(Math.round), dorsi: +dorsi.toFixed(1), feet: +feet.toFixed(3), blockGap: +blockPen.toFixed(2), block,
    trunkTop: +trunkLean(Wt).toFixed(1), trunkBottom: +trunkLean(Wb).toFixed(1), hipTop: poses[cfg.topPose || 'stand'].ch.hip_r.flex, hipBottom: poses.bottom.ch.hip_r.flex };
  if (dorsi > 34) { console.error('FAIL: ankle dorsiflexion beyond the rig limit'); process.exitCode = 1; }
  if (feet > 0.05) { console.error('FAIL: feet move'); process.exitCode = 1; }
  if (blockPen < -0.3) { console.error('FAIL: sole through the heel block'); process.exitCode = 1; }
  return { ex, report, contacts, poses, block, Wt, Wb };
}

module.exports = { heelSquat, surface, kneeOf, trunkLean, qArr, wrapLeg };

/* ---------------- barbell across the hips ---------------- */
// Bar centre on the line from the pelvis-frame point [0, y0, 0] along the pelvis +x (out of the front of the pelvis), as close
// to the body as the shaft between the hands allows (clearance `clear` cm from every body shape but the hands / forearms), and
// never lower than the plate radius (the plates then rest on the floor and the bar on them).
const HIPSKIP = /^(hand|thumb|forearm|upperarm|biceps|triceps)_/;
function hipBarCentre(W, opt = {}) {
  const { y0 = -1, gw = 70, clear = 0.4, plateR = 22.5, inset = 7 } = opt;
  const P = W.pelvis, o = V.add(P.p, Q.rot(P.q, [0, y0, 0])), n = V.norm(Q.rot(P.q, [1, 0, 0])), half = gw / 2 - inset;
  const shaft = (c) => EQ.segmentClear(W, [c[0], c[1], -half], [c[0], c[1], half], EQ.BAR.shaftR, { skip: HIPSKIP, n: 16 }).d;
  // directions in the pelvis sagittal plane, from straight out of the front (0) toward the head (+): the bar settles into the
  // crease between the thighs and the belly, where it is closest to the hip joints
  const up = V.norm(Q.rot(P.q, [0, 1, 0]));
  let best = null;
  for (let th = -10; th <= 70; th += 2.5) {
    const dir = V.add(V.scale(n, Math.cos(th * R.DEG)), V.scale(up, Math.sin(th * R.DEG)));
    let a = 0, b = 45;
    if (shaft(V.add(o, V.scale(dir, b))) <= clear) continue;
    for (let i = 0; i < 26; i++) { const m = (a + b) / 2, c = V.add(o, V.scale(dir, m)); if (shaft([c[0], c[1], c[2]]) > clear) b = m; else a = m; }
    const cost = b + Math.abs(th - (opt.th ?? 10)) * (opt.thW ?? 0.03);
    if (!best || cost < best.cost) best = { cost, b, th, c: V.add(o, V.scale(dir, b)) };
  }
  const c = best.c.slice(); c[2] = 0;
  const onPlates = c[1] < plateR + 0.3; if (onPlates) c[1] = plateR + 0.3;
  return { c, onPlates, gap: shaft(c), th: best.th, dist: best.b };
}
// Both hands overhand on a bar at centre c (grip width gw): the palms press down on the bar (toward the hips), elbows out
const HIP_SEEDS = [[60, 40, 0, 60, 90], [80, 30, 40, 80, 60], [40, 60, -40, 50, 120], [90, 50, 0, 90, 0], [20, 30, 60, 70, 90]];
function hipBarArms(p, contacts, c, gw, { seed = null, palm = null } = {}) {
  const W = L.fk(p, contacts), n = palm || V.scale(V.norm(Q.rot(W.pelvis.q, [1, 0, 0])), -1);
  const grips = EQ.barGrips(c, BB.AX, gw);
  const q = BB.armsOnBar(p, grips.r, { palm: n, thumb: [0, 0, -1], dirW: 1.0, guesses: seed ? [seed, ...HIP_SEEDS.slice(0, 2)] : HIP_SEEDS });
  const err = BB.gripErr(L.fk(q, contacts), grips); delete q.__cost;
  return { pose: q, err, seed: [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev] };
}
Object.assign(module.exports, { hipBarCentre, hipBarArms, HIPSKIP });

/* ---------------- lying / incline press with a chosen hand orientation ---------------- */
// b5-bbpress.js lyingPress with the palm / thumb directions and seeds as options (reverse grip: palms toward the head,
// thumbs pointing out) and an optional base. Same path: bar from the chest touch point (bottomDX toward the feet from the
// shoulder joints, just clear of the chest) to straight arms over the shoulders, keys refined where the grip width could drift.
function pressPath(meta, { angle = 0, GW, bottomDX, topDX = 2, flare, dip, foreW = 1.0, wristBot = -20, wristTop = -10, topElbow = 8, n = 18, settleDY = 0.2, touch = 0.5, palm, thumb = [0, 0, -1], seeds, base: L0 = null, dirW = 0.4, chestSkip, pron = null, pronW = 0.08 }) {
  const C = require('./b3-chest'), P5 = require('./b5-bbpress');
  const T = C.phaseT(meta), { B, base, contacts, foot } = L0 || C.benchBase(angle);
  const W0 = L.fk(base, contacts), S = W0.shoulder_r.p, Fr = C.trunkFrame(W0);
  const vertFore = (w) => (W) => { const d = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); return [d[0] * w]; };
  let gripWorst = 0;
  const arm = (c, f, seed) => {
    const grips = EQ.barGrips(c, BB.AX, GW), E = V.add(S, V.scale(C.upperArmDir(Fr, flare, dip), L.UA));
    const q = P5.armKey(base, contacts, grips.r, { palm, thumb, dirW, E: f < 1 ? E : null, elbowW: 0.5 * (1 - f), wrist: wristBot + (wristTop - wristBot) * f, seeds: seed ? [seed] : seeds, extra: [vertFore(foreW * (1 - f) + 0.3), ...(pron == null ? [] : [(W, q) => [(q.ch.wrist_r.pron - pron) * pronW]])] });
    gripWorst = Math.max(gripWorst, q.__err);
    return q;
  };
  const xb = r1(S[0] + bottomDX), cb = [xb, r1(BB.chestTop(W0, xb, chestSkip) + touch), 0];
  const xt = r1(S[0] + topDX);
  let ya = cb[1] + 10, yb = cb[1] + 70;
  for (let i = 0; i < 24; i++) { const y = (ya + yb) / 2, q = P5.armKey(base, contacts, EQ.barGrips([xt, y, 0], BB.AX, GW).r, { palm, thumb, dirW, wrist: wristTop, seeds, extra: pron == null ? [] : [(W, q) => [(q.ch.wrist_r.pron - pron) * pronW]] }); if (q.__err < 0.1 && q.ch.elbow_r.flex > topElbow) ya = y; else yb = y; }
  const ct = [xt, r1(ya), 0];
  const cAt = (f) => { const gx = 1 - Math.pow(1 - f, 1.8); return [r1(cb[0] + (ct[0] - cb[0]) * gx), r1(cb[1] + (ct[1] - cb[1]) * f), 0]; };
  const path = P5.refine((f, prev) => P5.strip(arm(cAt(f), f, prev && P5.seedOf(prev))), n, GW, contacts);
  const settle = P5.strip(arm([cb[0], cb[1] - settleDY, 0], 0, P5.seedOf(path[0].pose)));
  const { poses, keyframes } = P5.repKeysF(path, T, settle);
  return { T, B, base, contacts, foot, W0, S, Fr, poses, keyframes, cb, ct, gripWorst: () => gripWorst };
}
Object.assign(module.exports, { pressPath });

/* ---------------- arm paths on a bar (presses, curls, extensions) ---------------- */
// One arm-path segment: solve(f) builds the body for fraction f (spec.body(f) -> pose), the bar target (spec.bar(W, p, f) ->
// centre, world), the elbow hint (spec.elbow(W, f, c) or null), palm / thumb (spec.palm(f), spec.thumb) and extra residuals;
// keys are seeded from the previous key and refined where the blend between neighbours lets the grip width drift
// (b5-bbpress refine). Returns [{ f, pose, err }] sorted by f.
function segment(spec, contacts, GW, { n = 10, tol = 0.35, seeds, from = null } = {}) {
  const P5 = require('./b5-bbpress');
  let worst = 0;
  const solve = (f, prev) => {
    const p = spec.body(f), W = L.fk(p, contacts), c = spec.bar(W, p, f), grips = EQ.barGrips(c, BB.AX, GW);
    const E = spec.elbow ? spec.elbow(W, f, c) : null;
    const q = P5.armKey(p, contacts, grips.r, { palm: spec.palm(f), thumb: spec.thumb || [0, 0, -1], dirW: spec.dirW ?? 0.6, E, elbowW: spec.elbowW ? spec.elbowW(f) : 0.5, wrist: spec.wrist ? spec.wrist(f) : null, wristW: 0.2, seeds: prev ? [P5.seedOf(prev)] : (from ? [P5.seedOf(from)] : seeds), extra: spec.extra ? spec.extra(f) : [] });
    worst = Math.max(worst, q.__err);
    return P5.strip(q);
  };
  const keys = P5.refine((f, prev) => solve(f, prev || from), n, GW, contacts, { tol });
  keys.worst = worst;
  return keys;
}
// Bar centre pushed forward (+x) until the shaft between the hands clears the head, neck and trunk by `margin` cm
const FACE = rig.shapes.flatMap((s) => (s.bilateral ? [`${s.id}_r`, `${s.id}_l`] : [s.id])).filter((id) => /^(head|hair|ear_[rl]|jaw|nose|brow_[rl]|eye_[rl]|neck|chest|pecs_[rl]|traps_[rl]|ribcage|deltoid_[rl])$/.test(id));
function clearFront(W, c, half, margin = 1.5, ids = FACE) {
  const q = c.slice();
  const d = () => { let best = 1e9; for (let k = -10; k <= 10; k++) { const p = [q[0], q[1], q[2] + (k / 10) * half]; for (const id of ids) best = Math.min(best, EQ.pointShape(W, p, id) - EQ.BAR.shaftR); } return best; };
  for (let i = 0; i < 80 && d() < margin; i++) q[0] += 0.25;
  return q;
}
const smooth = (f) => f * f * (3 - 2 * f);
Object.assign(module.exports, { segment, clearFront, smooth, FACE });
