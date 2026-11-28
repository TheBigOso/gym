// Batch 6 family b6-02 (barbell rows, pulls, curls, forearm work, twists and the Olympic lifts). Builds on barbell.js
// (armsOnBar, sweep, placement helpers), b5-bbarms.js (standing barbell curls and wrist curls), b5-bbhinge.js (balanced
// hinge, rows, bar-arm continuity), b4-forearms.js (seated forearms on the thighs) and the clean-and-press machinery.
// Adds:
//   - curlPosesW / buildCurlW: the b5-bbarms.js barbell curl with the grip width (and plate size) as parameters (the
//     batch 5 version is fixed at 42 cm), and an optional elbow that follows a body that leans (hinged concentration curl)
//   - prone rows on a raised flat bench: body lying face down on the pad, arms hanging, bar rowed to the pad underside
const L = require('../lib');
const { V, R, r1, clone } = L;
const BB = require('./barbell');
const EQ = require('./equip');
const C = require('./b3-curls');
const K = require('./b4-curls2');
const A = require('./b5-bbarms');
const H = require('./hips');

const ARM_GUESS = [[0, 10, 0, 20, 0], [-58, 14, 113, 4, 137], [-50, 15, 90, 4, 150], [20, 15, 10, 40, 10], [-20, 10, -10, 20, 170], [10, 20, 20, 60, 160], [0, 5, 0, 5, 90]];
const barClear = (W, plateD, skip = A.SKIP) => BB.barBodyClear(W, { plates: 1, plateD, skip });

// Curl poses with grip width gw (handle points). E: elbow (world, right side); a: grip angle about the elbow, measured in
// the plane spanned by `down` (the forearm hanging) and `fwd` (the direction the hand travels at 90 degrees); defaults:
// straight down and +X. under: palms forward/up (true) or back/down (false). a0 null: smallest start angle with the bar
// `clear` cm off the body.
function curlPosesW(base, contacts, { E, a1, FS, gw, plateD = A.PLATE_D, under = true, drift = [0, 0, 0], clear = 0.8, a0 = null, elbowW = 2, down = [0, -1, 0], fwd = [1, 0, 0], skip = A.SKIP }) {
  const dz = gw / 2 - E[2], rr = Math.sqrt(A.forearmReach(base, under ? 0 : 175) ** 2 - dz * dz);
  const dir = (a) => V.add(V.scale(V.norm(down), Math.cos(a * R.DEG)), V.scale(V.norm(fwd), Math.sin(a * R.DEG)));
  // palm normal: perpendicular to the forearm in the swing plane (facing the way the hand moves when under)
  const palmAt = (a) => { const v = V.add(V.scale(V.norm(down), -Math.sin(a * R.DEG)), V.scale(V.norm(fwd), Math.cos(a * R.DEG))); return under ? v : V.scale(v, -1); };
  const thumb = under ? [0, 0, 1] : [0, 0, -1];
  let guesses = ARM_GUESS, gErr = 0;
  const solve = (a, f, extra = []) => {
    const Ef = V.add(E, V.scale(drift, f)), d = dir(a), g = [Ef[0] + rr * d[0], Ef[1] + rr * d[1], gw / 2];
    const q = BB.armsOnBar(base, g, { palm: palmAt(a), thumb, elbow: Ef, elbowW, guesses, extra });
    const W = L.fk(q, contacts); gErr = Math.max(gErr, BB.gripErr(W, EQ.barGrips([g[0], g[1], 0], BB.AX, gw)));
    delete q.__cost; return q;
  };
  if (a0 == null) {
    let lo = 0, hi = 70;
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2, q = solve(m, 0); if (barClear(L.fk(q, contacts), plateD, skip).d >= clear) hi = m; else lo = m; }
    a0 = r1(hi + 0.05);
  }
  const poses = [];
  for (const f of FS) {
    const q = solve(a0 + (a1 - a0) * f, f);
    guesses = [[q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev]];
    if (poses.length) K.unwrapTo(q, poses[poses.length - 1]);
    poses.push(q);
  }
  if (FS.length > 1) { guesses = [[poses[1].ch.shoulder_r.plane, poses[1].ch.shoulder_r.elev, poses[1].ch.shoulder_r.axial, poses[1].ch.elbow_r.flex * 0.5, poses[1].ch.wrist_r.pron]]; // near a straight arm the humeral rotation and the forearm pronation trade freely: hold the second key's split
    const ax1 = poses[1].ch.shoulder_r.axial, pr1 = poses[1].ch.wrist_r.pron;
    poses[0] = K.unwrapTo(solve(a0, 0, [(W, q) => [(q.ch.shoulder_r.axial - ax1) * 0.3, (q.ch.wrist_r.pron - pr1) * 0.3]]), poses[1]); }
  return { poses, a0, rr, gripErr: gErr };
}
const ph = (meta, id) => meta.timeline.phases.find((p) => p.id === id);
// Barbell curl module (b5-bbarms.js buildCurl with grip width, plate size, swing plane and extra sweep options)
function buildCurlW(meta, { base, contacts, E, a1, gw, plateD = A.PLATE_D, under = true, drift = [0, 0, 0], down, fwd, props = [], name, tempo, rows, checks = () => [], fixed = [], skip = A.SKIP, a0 = null, clear = 0.8 }) {
  const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1];
  const c = curlPosesW(base, contacts, { E, a1, FS, gw, plateD, under, drift, down, fwd, skip, a0, clear });
  const poses = {}, names = [];
  c.poses.forEach((p, i) => { poses[`c${i}`] = p; names.push(`c${i}`); });
  const top = names[names.length - 1];
  poses.squeeze = clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`wrist_${s}`].flex = r1(poses.squeeze.ch[`wrist_${s}`].flex + (under ? 3 : 0));
  const keyframes = K.keys(names, FS, { t0: ph(meta, 'lift').start, t1: ph(meta, 'lift').end, t2: ph(meta, 'top').end, t3: ph(meta, 'lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [...props, BB.barbellProp({ plateD })];
  const sw = BB.sweep(ex, { skip, fixed });
  const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts), bb = EQ.barAt(Wb, BB.GRIP);
  C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', tempo);
  if (rows) rows(H.setKin(ex), { Wb, Wt, sw, c, poses });
  const info = { a0: c.a0, gripErr: +c.gripErr.toFixed(2), elbow: [r1(C.elbowFlex(Wb, 'r')), r1(C.elbowFlex(Wt, 'r'))], bar0: bb.c.map(r1), barTop: EQ.barAt(Wt, BB.GRIP).c.map(r1), elbowPos: [Wb.elbow_r.p.map(r1), Wt.elbow_r.p.map(r1)] };
  A.report(name, L.write(ex), sw, info, A.failures(sw, [[c.gripErr < 0.5, `hands off the bar (${c.gripErr.toFixed(2)} cm)`], ...checks(sw, { Wb, Wt, poses })]));
  return { ex, sw, c, poses };
}

module.exports = { curlPosesW, buildCurlW, barClear, ARM_GUESS };

/* ---------------- both arms on a bar for an asymmetric (rotated) body ---------------- */
// Mirror image of a pose across the sagittal plane (z -> -z): spine / neck / head rotation and side bend change sign,
// left and right channels swap, root yaw / roll and z change sign, IK targets swap sides with z negated.
function mirrorPose(p) {
  const q = clone(p);
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6', 'neck_c7', 'head_c1']) if (q.ch[j]) { if (q.ch[j].rot != null) q.ch[j].rot = -q.ch[j].rot; if (q.ch[j].latFlex != null) q.ch[j].latFlex = -q.ch[j].latFlex; }
  for (const k of Object.keys(p.ch)) { const m = k.match(/^(.*)_([rl])$/); if (!m) continue; q.ch[k] = clone(p.ch[`${m[1]}_${m[2] === 'r' ? 'l' : 'r'}`]); }
  q.root.pos[2] = -q.root.pos[2];
  if (q.root.rot) { if (q.root.rot.yaw != null) q.root.rot.yaw = -q.root.rot.yaw; if (q.root.rot.roll != null) q.root.rot.roll = -q.root.rot.roll; }
  if (q.ik) { const ik = {}; for (const [id, v] of Object.entries(p.ik)) { const m = id.match(/^(.*)_([rl])$/), id2 = m ? `${m[1]}_${m[2] === 'r' ? 'l' : 'r'}` : id; ik[id2] = Object.assign(clone(v), { target: [v.target[0], v.target[1], -v.target[2]] }); } q.ik = ik; }
  return q;
}
const mz = (v) => (v ? [v[0], v[1], -v[2]] : v);
// Right hand to grip gr and left hand to grip gl (world), bar axis ax; palm / thumb / elbow given for the right hand
// (world) and mirrored for the left (opt.left overrides). The left arm is solved as the right arm of the mirrored pose.
// state.r / state.l keep each arm's previous solution as the first guess (continuity).
function armsOnBarBoth(p, gr, gl, opt = {}, state = {}) {
  const solveR = (pp, g, o, key) => {
    const gs = state[key] ? [state[key], ...(o.guesses || [])] : (o.guesses || ARM_GUESS);
    const q = BB.armsOnBar(pp, g, { palm: o.palm, thumb: o.thumb, elbow: o.elbow, elbowW: o.elbowW ?? 0.5, dirW: o.dirW ?? 1.5, wristW: o.wristW ?? 0.04, ax: o.ax, guesses: state.keep && state[key] ? [state[key]] : gs, extra: o.extra || [] });
    const c = q.__cost; delete q.__cost;
    const prev = state[key];
    if (prev) { const near = (v, ref) => v + 360 * Math.round((ref - v) / 360); q.ch.shoulder_r.plane = r1(near(q.ch.shoulder_r.plane, prev[0])); q.ch.shoulder_r.axial = r1(near(q.ch.shoulder_r.axial, prev[2])); q.ch.wrist_r.pron = r1(near(q.ch.wrist_r.pron, prev[4])); }
    state[key] = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];
    return { q, c };
  };
  const R_ = solveR(p, gr, opt, 'r');
  const lo = opt.left || { palm: mz(opt.palm), thumb: mz(opt.thumb), elbow: null };
  const pm = mirrorPose(p);
  const L_ = solveR(pm, mz(gl), Object.assign({}, opt, lo, { ax: mz(opt.ax || BB.AX), elbow: lo.elbow ? mz(lo.elbow) : (opt.elbowL ? mz(opt.elbowL) : null) }), 'l');
  const q = clone(p);
  for (const j of ['sc', 'shoulder', 'elbow', 'wrist']) { q.ch[`${j}_r`] = clone(R_.q.ch[`${j}_r`]); q.ch[`${j}_l`] = clone(L_.q.ch[`${j}_r`]); }
  const W = L.fk(q);
  const err = Math.max(V.len(V.sub(EQ.gripPoint(W, 'r', BB.GRIP).p, gr)), V.len(V.sub(EQ.gripPoint(W, 'l', BB.GRIP).p, gl)));
  state.err = Math.max(state.err || 0, err);
  return q;
}
Object.assign(module.exports, { mirrorPose, armsOnBarBoth });

/* ---------------- seated barbell wrist / finger curl (forearms on the thighs) ---------------- */
// b4-forearms.js seatedCurl with a barbell held in both hands: one constant seated pose (forearms along the thighs, wrists
// just past the knees, palms up or down), only the wrist flexion channel keyed. Grip width = the distance between the
// handle points, checked over the loop. keys: [[t, flex], ...]
function seatedBarWrist(meta, { palm = 'up', keys, seat = {}, plateD = A.PLATE_D, name, wristRow, wristText, tempo, rows }) {
  const FA = require('./b4-forearms');
  const s = FA.seatedForearms(Object.assign({ palm }, seat));
  const poses = {}, keyframes = [], seen = {};
  for (const [t, fl] of keys) { const k = `w${fl < 0 ? 'm' : 'p'}${Math.abs(fl)}`; if (!seen[k]) { seen[k] = 1; poses[k] = FA.withWrist(s.pose, fl); } keyframes.push({ t, pose: k }); }
  const ex = H.module_(meta, s.contacts, poses, keyframes);
  const W0 = L.fk(s.pose, s.contacts), bench = FA.benchUnder(W0, { seatH: seat.seatH || 45 });
  ex.props = [bench, BB.barbellProp({ plateD })];
  const SK = /^(hand|thumb|forearm)_/;
  const sw = BB.sweep(ex, { skip: SK, fixed: ['elbow_r', 'elbow_l', 'wrist_r', 'wrist_l', 'pelvis'] });
  const trunk = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
  const set = H.setKin(ex), lo = Math.min(...keys.map((k) => k[1])), hi = Math.max(...keys.map((k) => k[1]));
  const sideTxt = (v) => (v >= 0 ? `${Math.round(v)}° flexion` : `${Math.round(-v)}° extension`);
  if (wristText) { set(wristRow, 'setup', wristText(lo, hi)[0]); set(wristRow, 'peak', wristText(lo, hi)[1]); }
  else { set(wristRow, 'setup', sideTxt(palm === 'up' ? lo : hi)); set(wristRow, 'peak', `${sideTxt(palm === 'up' ? hi : lo)} (arc ≈${Math.round(hi - lo)}°)`); }
  const m = s.measure(W0);
  set('Forearm on the thigh', 'setup', `Elbow at ${Math.round(m.elbowFrac * 100)}% of the thigh, wrist at ${Math.round(m.wristFrac * 100)}% (just past the knee); grip ${r1(EQ.barAt(W0, BB.GRIP).width)} cm between the handle points`);
  set('Forearm on the thigh', 'peak', `Forearms still (elbows and wrists move ${sw.drift} cm over the loop); bar at least ${sw.barBody} cm off the legs`);
  if (tempo) { set('Tempo', 'setup', tempo[0]); set('Tempo', 'peak', tempo[1]); }
  if (rows) rows(set, { W0, sw, s });
  ex.checks.measure.min = Math.floor(trunk - 8); ex.checks.measure.max = Math.ceil(trunk + 8);
  const fails = A.failures(sw, [[sw.drift < 0.05, 'forearms move'], [Math.max(...s.res.slice(0, 4)) < 1.5, `seat solve residual ${JSON.stringify(s.res)}`]]);
  A.report(name, L.write(ex), sw, { res: s.res, m, trunk: r1(trunk), root: s.pose.root }, fails);
  return { ex, s, sw, W0 };
}
Object.assign(module.exports, { seatedBarWrist });

/* ---------------- kneeling behind a flat bench, forearms across the pad ---------------- */
// Tall kneel (b5-cablearms.js tallKneel), trunk pitched forward about the hips (pitchAboutHips) so both forearms lie
// across a flat bench in front, palms up (or down), the wrists `past` cm beyond the far edge. Solved: root pitch, spine
// flexion and the right arm (forearm horizontal along +X at the pad height, elbow `uaV` degrees off vertical); the left
// arm mirrored. Returns { pose, contacts, bench (box prop), padY, edgeX, res }.
function kneelOnBench({ benchH = 42, past = 4, palm = 'up', uaV = 10, lift = 0, width = 11, pitch0 = 50, toePitch = 76 } = {}) {
  const CA = require('./b5-cablearms');
  const k = CA.tallKneel({ width, toePitch });
  const contacts = k.contacts;
  const FR = 3.6 + lift;                        // forearm capsule radius at mid-forearm (rig shapes, rig v2)
  const palmUp = palm === 'up' ? 1 : -1;
  const build = (x) => {
    let p = CA.pitchAboutHips(k.pose, contacts, -x[0]);
    p.ch.spine_l5 = { rot: 0, flex: x[1] * 0.4, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: x[1] * 0.35, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: x[1] * 0.25, latFlex: 0 };
    p.ch.neck_c7 = { rot: 0, flex: -x[0] * 0.25 }; p.ch.head_c1 = { rot: 0, flex: -x[0] * 0.2 };
    p.ch.sc_r = { protract: 6, elevate: 0 }; p.ch.sc_l = { protract: 6, elevate: 0 };
    p.ch.shoulder_r = { plane: x[2], elev: x[3], axial: x[4] }; p.ch.elbow_r = { flex: x[5] }; p.ch.wrist_r = { pron: x[6], flex: 0, dev: 0 };
    return p;
  };
  const padY = benchH;
  const res = (x) => {
    const p = build(x), W = L.fk(p, contacts), E = W.elbow_r.p, Wr = W.wrist_r.p, fa = V.norm(V.sub(Wr, E));
    const up = C.palmDir(W, 'r');
    return [(E[1] - FR - 0.4 - padY) * 3, (Wr[1] - 2.6 - padY) * 3, (Wr[2] - E[2]) * 2, fa[2] * 4,
      ...V.sub(up, [0, palmUp, 0]).map((v) => v * 4),
      (V.angle(V.sub(E, W.shoulder_r.p), [0, -1, 0]) - uaV) * 0.2, (Wr[2] - (W.shoulder_r.p[2] - 1)) * 0.5, x[4] * 0.01, Math.max(0, x[1] - 40) * 2, (x[1] - 15) * 0.02];
  };
  let best = null;
  for (const g of [[pitch0, 15, 90, 60, 0, 80, palm === 'up' ? 0 : 175], [pitch0 + 10, 20, 80, 70, -20, 70, palm === 'up' ? 10 : 170], [pitch0 - 10, 10, 95, 50, 10, 90, palm === 'up' ? 0 : 175]]) {
    const s = R.solveLM(g, res, { iters: 600 }); if (!best || s.cost < best.cost) best = s;
  }
  const x = best.x.map(r1);
  const p = build(x);
  p.ch.wrist_r.pron = r1(L.wrap(p.ch.wrist_r.pron)); p.ch.shoulder_r.axial = r1(L.wrap(p.ch.shoulder_r.axial)); p.ch.shoulder_r.plane = r1(L.wrap(p.ch.shoulder_r.plane));
  require('./b3-back').mirrorArm(p);
  for (const j in p.ch) for (const c in p.ch[j]) if (typeof p.ch[j][c] === 'number') p.ch[j][c] = r1(p.ch[j][c]);
  const W = L.fk(p, contacts);
  const edgeX = r1(W.wrist_r.p[0] - past), nearX = r1(Math.min(W.elbow_r.p[0] - 8, edgeX - 26));
  const bench = { id: 'bench', kind: 'bench', center: [r1((edgeX + nearX) / 2), 0, 0], size: [r1(edgeX - nearX), padY, 120] };
  return { pose: p, contacts, bench, padY, edgeX, res: res(best.x).map((v) => +v.toFixed(2)), x, info: k.info };
}
// Signed clearance (cm) of a point with radius r from an axis-aligned box prop {center (y = 0 floor), size}
function boxClear(box, p, r = 0) {
  const [cx, cy, cz] = box.center, [sx, sy, sz] = box.size, lo = [cx - sx / 2, cy, cz - sz / 2], hi = [cx + sx / 2, cy + sy, cz + sz / 2];
  const q = p.map((v, i) => Math.max(lo[i], Math.min(hi[i], v))), inside = p.every((v, i) => v > lo[i] && v < hi[i]);
  if (!inside) return V.len(V.sub(p, q)) - r;
  return -Math.min(...p.map((v, i) => Math.min(v - lo[i], hi[i] - v))) - r;
}
// Bar shaft and hand shapes vs a box (the hands sampled at their shape centre and the ends of their longest axes)
function barBoxClear(W, box, { skipArms = false } = {}) {
  const b = EQ.barAt(W, BB.GRIP); let best = 1e9;
  for (let i = 0; i <= 20; i++) best = Math.min(best, boxClear(box, V.add(b.l, V.scale(V.sub(b.r, b.l), i / 20)), EQ.BAR.shaftR));
  let hand = 1e9;
  for (const s of L.rig.shapes) {
    if (!/^(hand|thumb)_/.test(s.id) && !(skipArms ? false : false)) continue;
    const g = R.shapeWorld(W, s);
    if (g.kind === 'capsule') { for (let i = 0; i <= 4; i++) hand = Math.min(hand, boxClear(box, V.add(g.a, V.scale(V.sub(g.b, g.a), i / 4)), Math.max(...g.r) * 0.9)); }
    else { const rr = Math.min(...g.axes.map((a) => V.len(a))); hand = Math.min(hand, boxClear(box, g.c, rr)); for (const a of g.axes) for (const sg of [-1, 1]) hand = Math.min(hand, boxClear(box, V.add(g.c, V.scale(a, sg * 0.8)), 0)); }
  }
  return { bar: best, hand };
}
Object.assign(module.exports, { kneelOnBench, boxClear, barBoxClear });

/* ---------------- rows lying face down on a bench (flat, raised, or incline) ---------------- */
// Oriented boxes of an adjustable bench prop (b3-back.js benchBoxes: seat pad, back pad, base) plus the support strut the
// player draws under an inclined back pad, and the two seat leg panels it draws for a flat bench
function benchSolids(b) {
  const Bk = require('./b3-back');
  const bx = Bk.benchBoxes(b).filter((x) => x.id !== 'base');
  const pr = b.prop, [cx, , cz] = pr.center, [sx, sy, sz] = pr.size, pad = 6, side = pr.backSide ?? -1, a = (pr.backAngle || 0) * R.DEG, bl = pr.backLength ?? 80;
  for (const fx of [-0.35, 0.35]) bx.push({ id: `leg${fx}`, c: [cx + fx * sx, (sy - pad) / 2, cz], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [2.5, (sy - pad) / 2, sz * 0.4] });
  if (a > 0.05) { const sY = sy - pad + Math.sin(a) * bl * 0.7, sX = cx + side * (sx / 2 + Math.cos(a) * bl * 0.7); bx.push({ id: 'strut', c: [sX, sY / 2, cz], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [2.5, sY / 2, 2.5] }); }
  else bx.push({ id: 'foot', c: [cx + side * (sx / 2 + bl * 0.9), (sy - pad) / 2, cz], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [2.5, (sy - pad) / 2, sz * 0.4] });
  return bx;
}
// signed distance from a point to an oriented box { c, ax: [3 unit axes], h: [3 half sizes] }
function obbDist(b, p) {
  const d = V.sub(p, b.c), l = b.ax.map((a) => V.dot(d, a)), q = l.map((v, i) => Math.abs(v) - b.h[i]);
  const out = Math.hypot(...q.map((v) => Math.max(0, v)));
  return out > 0 ? out : Math.max(...q);
}
// bar shaft (between the collars) and the hand shapes vs the bench solids
function barBenchClear(W, solids, { hands = true } = {}) {
  const b = EQ.barAt(W, BB.GRIP), ax = V.norm(V.sub(b.r, b.l)); let bar = { d: 1e9 }, hand = { d: 1e9 };
  for (let i = -20; i <= 20; i++) { const p = V.add(b.c, V.scale(ax, (i / 20) * (EQ.BAR.inner / 2))); for (const s of solids) { const d = obbDist(s, p) - EQ.BAR.shaftR; if (d < bar.d) bar = { d, id: s.id }; } }
  if (hands) for (const sh of L.rig.shapes) {
    if (!/^(hand|thumb|forearm)_/.test(sh.id)) continue;
    const g = R.shapeWorld(W, sh), pts = [];
    if (g.kind === 'capsule') for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push([V.add(g.a, V.scale(V.sub(g.b, g.a), t)), g.r[0] + (g.r[1] - g.r[0]) * t]); }
    else { const rr = Math.min(...g.axes.map((a) => V.len(a))); pts.push([g.c, rr]); for (const a of g.axes) for (const sg of [-1, 1]) pts.push([V.add(g.c, V.scale(a, sg * 0.85)), 0]); }
    for (const [p, r] of pts) for (const s of solids) { const d = obbDist(s, p) - r; if (d < hand.d) hand = { d, id: `${sh.id}/${s.id}` }; }
  }
  return { bar, hand };
}
// Body shapes vs the bench solids (the front of the trunk and the thighs rest on the pad: those are reported apart)
function bodyBenchClear(W, solids, rest = /^(chest|pecs_[rl]|ribcage|abdomen|pelvis|quad_[rl]|thigh_[rl]|buttock_[rl])$/) {
  let other = { d: 1e9 }, rs = { d: 1e9 };
  for (const sh of L.rig.shapes) {
    if (/^(eye|brow|ear|nose|hair)/.test(sh.id)) continue;
    const g = R.shapeWorld(W, sh), pts = [];
    if (g.kind === 'capsule') for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([V.add(g.a, V.scale(V.sub(g.b, g.a), t)), g.r[0] + (g.r[1] - g.r[0]) * t]); }
    else { // ellipsoid: sample its surface along the axes and diagonals
      for (const a of g.axes) for (const sg of [-1, 1]) pts.push([V.add(g.c, V.scale(a, sg)), 0]);
      for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) pts.push([V.add(g.c, V.add(V.scale(g.axes[i], s1 * 0.707), V.scale(g.axes[j], s2 * 0.707))), 0]);
    }
    for (const [p, r] of pts) for (const s of solids) { const d = obbDist(s, p) - r; const o = rest.test(sh.id) ? rs : other; if (d < o.d) { o.d = d; o.id = `${sh.id}/${s.id}`; } }
  }
  return { rest: rs, other };
}
// Lying face down on a horizontal pad at height padY (head toward +X): root height, pitch and a little spine flexion so
// the chest and the thighs rest on the pad (lowest point of the front trunk shapes and of the thighs at padY); the right
// shoulder at x = shX. Legs straight along the bench, feet pointed, head in line looking down past the end.
function proneOnPad({ padY, shX, neck = [-6, -6] }) {
  const P = require('./prone');
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  const p0 = { root: { pos: [0, padY + 12, 0], rot: { pitch: -88 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: neck[0] }, head_c1: { rot: 0, flex: neck[1] }, sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 },
    hip_r: { flex: 2, abd: 4, rot: 0 }, hip_l: { flex: 2, abd: 4, rot: 0 }, knee_r: { flex: 6 }, knee_l: { flex: 6 }, ankle_r: { dorsi: -55 }, ankle_l: { dorsi: -55 },
    shoulder_r: { plane: 90, elev: 90, axial: 0 }, shoulder_l: { plane: 90, elev: 90, axial: 0 }, elbow_r: { flex: 5 }, elbow_l: { flex: 5 }, wrist_r: { pron: 90, flex: 0, dev: 0 }, wrist_l: { pron: 90, flex: 0, dev: 0 } } };
  const front = (W) => Math.min(...['chest', 'pecs_r', 'pecs_l', 'ribcage', 'abdomen'].map((id) => P.bottomOf(W, id)));
  const thigh = (W) => Math.min(...['quad_r', 'quad_l', 'thigh_r', 'thigh_l'].map((id) => P.bottomOf(W, id)));
  const s = L.solvePose(p0, ['root.pos.0', 'root.pos.1', 'root.rot.pitch', 'ch.spine_t12.flex'], [
    (W) => [(front(W) - padY) * 4, (thigh(W) - padY) * 4, (W.shoulder_r.p[0] - shX) * 2], L.obj.reg('ch.spine_t12.flex', 0, 0.3)], { iters: 400 });
  const W = L.fk(s.pose);
  return { pose: s.pose, info: { front: +front(W).toFixed(2), thigh: +thigh(W).toFixed(2), cost: +s.cost.toFixed(3) } };
}
Object.assign(module.exports, { benchSolids, obbDist, barBenchClear, bodyBenchClear, proneOnPad });

// Prone row on a raised flat bench inside a power rack (lying row / seal row on the rack). cfg: { padY, gw, palm, thumb,
// topDX (bar x relative to the shoulder at the top), elbow: [du, dz] (b5-bbhinge.js elbowAt in the trunk frame), pins
// (true: the bar rests on the safety pins at the bottom of each rep), slack (cm short of a fully straight arm), name, rows }
function proneRow(meta, cfg) {
  const Xh = require('./b5-bbhinge');
  const { padY = 88, gw = 54, palm = [-1, 0, 0], thumb = [0, 0, -1], topDX = -10, elbow = [-6, 14], pins = true, slack = -1, shX = 10, plateD = 45 } = cfg;
  const body = proneOnPad({ padY, shX });
  const P0 = body.pose, W0 = L.fk(P0), S = W0.shoulder_r.p;
  const Rg = BB.reachG(P0, 4) - slack, dz = gw / 2 - S[2], dx = 2;
  const C0 = [S[0] + dx, S[1] - Math.sqrt(Rg * Rg - dz * dz - dx * dx), 0];
  const C1 = [S[0] + topDX, padY - 6 - EQ.BAR.shaftR - 0.6, 0];   // bar against the pad underside
  const SC = [{ protract: 8, elevate: 0 }, { protract: -16, elevate: -1 }];
  const state = {};
  const hangGuess = [[90, 90, 0, 5, 90], [60, 80, 30, 5, 150], [100, 90, -20, 5, 60], [80, 100, 0, 5, 120]];
  const at = (f) => {
    const g = f * f * (3 - 2 * f) * 0.4 + f * 0.6;
    const p = clone(P0);
    p.ch.sc_r = { protract: r1(SC[0].protract + (SC[1].protract - SC[0].protract) * g), elevate: r1(SC[0].elevate + (SC[1].elevate - SC[0].elevate) * g) }; p.ch.sc_l = clone(p.ch.sc_r);
    const c = V.add(V.lerp(C0, C1, g), [-2 * Math.sin(Math.PI * g), 0, 0]);
    const W = L.fk(p), E = Xh.elbowAt(W, elbow[0], elbow[1]);
    // elbows guided toward their top position from the start (a light pull early), so the arm never takes the curl-like
    // branch with the elbows swinging toward the head; at the straight-arm hang the humeral rotation / pronation split is
    // held where the bent arm needs it (pron PRON), so the forearm does not spin when the elbow starts to bend
    return Xh.barArms(p, c, gw, { palm: null, thumb, elbow: E, elbowW: 0.15 + 0.65 * g, dirW: 1.0, wristW: 0.3, lambda: cfg.lambda ?? 5e-3, guesses: state.nearest ? [] : hangGuess, extra: [(Wq, qq) => [(qq.ch.wrist_r.pron - (cfg.pron ?? 150)) * 0.05 * (1 - g)]] }, state);
  };
  const FS = cfg.FS || [0, 0.015, 0.03, 0.05, 0.08, 0.15, 0.22, 0.3, 0.37, 0.45, 0.52, 0.6, 0.7, 0.8, 0.9, 1], N = FS.length - 1;   // dense off the straight-arm hang
  const poses = {};
  // solved from the top down: the rowing arm's branch (elbows back) carries down to the hang, each key nearest the last
  for (let i = N; i >= 0; i--) { poses[`r${i}`] = Xh.wrapBody(at(FS[i])); state.keep = true; state.nearest = true; }
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
  const keyframes = [{ t: 0, pose: 'r0' }, ...Xh.eased('r', FS, ph.pull[0], ph.pull[1]), ...Xh.eased('r', FS, ph.lower[0], ph.lower[1], true), { t: D, pose: 'r0' }];
  const ex = H.module_(meta, [], poses, keyframes);
  // bench under the body: seat centred under the top bar position, back pad toward the feet
  const Wb = L.fk(poses.r0), Wt = L.fk(poses[`r${N}`]), bb = EQ.barAt(Wb, BB.GRIP), bt = EQ.barAt(Wt, BB.GRIP);
  const bench = require('./dumbbell').bench({ x: r1((bt.c[0] + bb.c[0]) / 2), seat: 60, height: padY, width: cfg.benchW ?? 26, angle: 0, back: 60 });
  const solids = benchSolids(bench);
  const SAFE_Y = r1(bb.c[1] - EQ.BAR.shaftR - 2 - (pins ? 0 : 3));   // pins: the bar rests on them; otherwise 3 cm below
  const RACK_X = r1(bb.c[0] - 15);
  const rk = EQ.rack({ x: RACK_X, depth: 120, height: 210, width: 120, hookY: padY + 30, safetyY: SAFE_Y });
  ex.props = [bench.prop, rk.prop, BB.barbellProp({ plateD })];
  let bc = { bar: { d: 1e9 }, hand: { d: 1e9 } }, body2 = null;
  const sw = BB.sweep(ex, { fixed: ['pelvis', 'knee_r', 'knee_l'], probe: (W) => { const c = barBenchClear(W, solids); if (c.bar.d < bc.bar.d) bc.bar = c.bar; if (c.hand.d < bc.hand.d) bc.hand = c.hand; } });
  for (const q of Object.values(poses)) { const c = bodyBenchClear(L.fk(q), solids); if (!body2 || c.other.d < body2.other.d) body2 = c; }
  const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
  set('Body on the bench', 'setup', `Face down on a ${padY} cm flat bench: chest and thighs on the pad (lowest front point ${body.info.front} cm, thighs ${body.info.thigh} cm), chin past the end`);
  set('Body on the bench', 'peak', 'Unchanged (only the arms and shoulder blades move)');
  set('Elbow flexion', 'setup', `${d(B6elbow(Wb))}, ${gw} cm grip (handle centres); bar ${r1(bb.c[1])} cm high${pins ? ', resting on the safety pins' : ', just above the safety pins'}`);
  set('Elbow flexion', 'peak', `${d(B6elbow(Wt))}, elbows ${r1(Wt.elbow_r.p[2] - Wt.shoulder_r.p[2])} cm out from the shoulders, bar against the pad underside ${r1(Math.abs(bt.c[0] - Wt.shoulder_r.p[0]))} cm ${bt.c[0] < Wt.shoulder_r.p[0] ? 'behind' : 'ahead of'} the shoulders`);
  set('Tempo', 'setup', `Hang ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.pull[1] - ph.pull[0])} s up, ${r1(ph.squeeze[1] - ph.squeeze[0])} s squeeze, ${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(D - ph.lower[1])} s reset`);
  if (cfg.rows) cfg.rows(set, { Wb, Wt, sw });
  const info = { body: body.info, C0: C0.map(r1), C1: C1.map(r1), barTop: bt.c.map(r1), gripErr: +state.err.toFixed(2), benchBar: bc.bar, benchHand: bc.hand, benchBody: body2, safety: SAFE_Y };
  const fails = A.failures(sw, [[state.err < 0.5, `hands off the bar (${state.err.toFixed(2)})`], [bc.bar.d > -0.2, `bar into the bench (${JSON.stringify(bc.bar)})`], [bc.hand.d > -0.8, `hands into the bench (${JSON.stringify(bc.hand)})`], [body2.other.d > -1, `body into the bench (${JSON.stringify(body2.other)})`], [Math.abs(body.info.front - padY) < 0.3, 'chest off the pad']]);
  A.report(cfg.name, L.write(ex), sw, info, fails);
  return { ex, sw, poses };
}
const B6elbow = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
Object.assign(module.exports, { proneRow });

/* ---------------- incline chest-supported barbell row ---------------- */
// Body on an adjustable bench (back pad at `ang` degrees rising toward +X), straddling the seat with the balls of the feet
// planted behind, chest on the pad, chin over the top: the body solve of author-chest-supported-dumbbell-row.js.
function inclineChestBody({ ang = 40, pad = 80, bw = 28, seat = 40, benchH = 45, sAlong = 23, foot = [-50, 26], heel = 64, neck = [-14, -16] } = {}) {
  const Bk = require('./b3-back'), P = require('./prone'), DBH = require('./dumbbell');
  const { makeFamily } = require('./lunge');
  const Q = L.Q;
  const bench = DBH.bench({ x: -seat / 2, z: 0, seat, height: benchH, width: bw, angle: ang, back: pad, side: 1 });
  const dir = bench.padDir, nrm = [-dir[1], dir[0], 0];
  makeFamily({ toe: 15, half: 10 });
  const fq = (pitch, yaw) => P.qArr(Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch)));
  const contacts = [Object.assign(L.legContact('r'), { label: 'Right foot (ball)', pole: [1, 0, 0.7], handRot: fq(heel, -15) }), Object.assign(L.legContact('l'), { label: 'Left foot (ball)', pole: [1, 0, -0.7], handRot: fq(heel, 15) })];
  const footSh = L.rig.shapes.find((s) => s.id === 'foot_r');
  const ANK = (() => { let a = 2, b = 30; for (let i = 0; i < 40; i++) { const y = (a + b) / 2, st = L.POSES.standing().pose; st.ik = { leg_r: { target: [0, y, 10], weight: 1 } }; const g = R.shapeWorld(L.fk(st, [contacts[0]]), footSh); const lo = g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); if (lo > 0.15) b = y; else a = y; } return r1((a + b) / 2 + 0.05); })();
  const FT = { r: [foot[0], ANK, foot[1]], l: [foot[0], ANK, -foot[1]] };
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  const PITCH = -(90 - ang) - 8;
  const base = (pos) => ({ root: { pos, rot: { pitch: PITCH } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: neck[0] }, head_c1: { rot: 0, flex: neck[1] },
    sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 }, hip_r: { flex: 45, abd: 30, rot: -30 }, hip_l: { flex: 45, abd: 30, rot: -30 }, knee_r: { flex: 55 }, knee_l: { flex: 55 }, ankle_r: { dorsi: -8 }, ankle_l: { dorsi: -8 },
    shoulder_r: { plane: 90, elev: 60, axial: 0 }, shoulder_l: { plane: 90, elev: 60, axial: 0 }, elbow_r: { flex: 8 }, elbow_l: { flex: 8 }, wrist_r: { pron: 90, flex: 0, dev: 0 }, wrist_l: { pron: 90, flex: 0, dev: 0 } },
    ik: { leg_r: { target: FT.r, weight: 1 }, leg_l: { target: FT.l, weight: 1 } } });
  const TRUNK = L.rig.shapes.filter((s) => /^(chest|pecs_r|pecs_l|ribcage|abdomen)$/.test(s.id));
  const frontGap = (W) => { let m = 1e9; for (const s of TRUNK) { const g = R.shapeWorld(W, s); const ext = Math.sqrt(g.axes.reduce((a, ax) => a + V.dot(ax, nrm) ** 2, 0)); m = Math.min(m, V.dot(V.sub(g.c, bench.hinge), nrm) - ext); } return m; };
  let pos = V.add(V.add(bench.hinge, V.scale(dir, sAlong)), V.scale(nrm, 20));
  for (let it = 0; it < 40; it++) { const g = frontGap(L.fk(base(pos))); pos = V.sub(pos, V.scale(nrm, g)); if (Math.abs(g) < 0.005) break; }
  let body = base(pos.map((v) => +v.toFixed(2)));
  body = P.fitLeg(body, 'r', contacts, 'leg_r'); body = P.fitLeg(body, 'l', contacts, 'leg_l'); Bk.wrapPose(body);
  const along = (W, j) => r1(V.dot(V.sub(W[j].p, bench.hinge), dir));
  return { pose: body, contacts, bench, dir, nrm, along, gap: frontGap(L.fk(body, contacts)) };
}
// Barbell row with the chest on the incline pad. cfg: { gw, palm, thumb (hang), elbow [du, dz], back (cm the bar moves toward
// the hips per cm up), slack, name, ang, sAlong }
function inclineRow(meta, cfg) {
  const Xh = require('./b5-bbhinge');
  const { gw = 46, thumb = [0, 0, 1], elbow = [-20, 8], back = 0.25, slack = -1, margin = 0.6 } = cfg;
  const bd = inclineChestBody({ ang: cfg.ang ?? 40, sAlong: cfg.sAlong ?? 23 });
  const P0 = bd.pose, contacts = bd.contacts, W0 = L.fk(P0, contacts), S = W0.shoulder_r.p;
  const solids = benchSolids(bd.bench);
  const Rg = BB.reachG(P0, 4) - slack, dz = gw / 2 - S[2], dx = cfg.dx ?? 3;
  const C0 = [S[0] + dx, S[1] - Math.sqrt(Rg * Rg - dz * dz - dx * dx), 0];
  // top: up (and back toward the hips by `back` per cm) until the bar shaft is `margin` cm from the pad or the strut
  const barClr = (c) => { let m = 1e9; for (let i = -10; i <= 10; i++) { const p = [c[0], c[1], (i / 10) * (EQ.BAR.inner / 2)]; for (const s of solids) m = Math.min(m, obbDist(s, p) - EQ.BAR.shaftR); } return m; };
  const path = (u) => [C0[0] - back * u, C0[1] + u, 0];
  let a = 0, b = 60; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (barClr(path(m)) > margin) a = m; else b = m; }
  const C1 = path(a);
  const SC = [{ protract: 8, elevate: 0 }, { protract: -16, elevate: -1 }];
  const state = {};
  const at = (f) => {
    const g = f * f * (3 - 2 * f) * 0.4 + f * 0.6;
    const p = clone(P0);
    p.ch.sc_r = { protract: r1(SC[0].protract + (SC[1].protract - SC[0].protract) * g), elevate: r1(SC[0].elevate + (SC[1].elevate - SC[0].elevate) * g) }; p.ch.sc_l = clone(p.ch.sc_r);
    const c = V.lerp(C0, C1, g);
    const W = L.fk(p, contacts), E = Xh.elbowAt(W, elbow[0], elbow[1]);
    return Xh.barArms(p, c, gw, { palm: null, thumb, elbow: E, elbowW: 0.15 + 0.65 * g, dirW: 1.0, wristW: 0.3, lambda: 5e-3, guesses: state.nearest ? [] : (cfg.guesses || [[30, 60, -60, 40, 20], [60, 60, -30, 40, 0], [0, 60, -90, 40, 10], [45, 70, 0, 40, 30]]), extra: cfg.pron != null ? [(Wq, qq) => [(qq.ch.wrist_r.pron - cfg.pron) * 0.05 * (1 - g)]] : [] }, state);
  };
  const FS = [0, 0.015, 0.03, 0.05, 0.08, 0.15, 0.22, 0.3, 0.37, 0.45, 0.52, 0.6, 0.7, 0.8, 0.9, 1], N = FS.length - 1;
  const poses = {};
  for (let i = N; i >= 0; i--) { poses[`r${i}`] = Xh.wrapBody(at(FS[i])); state.keep = true; state.nearest = true; }
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
  const keyframes = [{ t: 0, pose: 'r0' }, ...Xh.eased('r', FS, ph.pull[0], ph.pull[1]), ...Xh.eased('r', FS, ph.lower[0], ph.lower[1], true), { t: D, pose: 'r0' }];
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [bd.bench.prop, BB.barbellProp({ plateD: cfg.plateD ?? 45 })];
  let bc = { bar: { d: 1e9 }, hand: { d: 1e9 } }, body2 = null;
  const sw = BB.sweep(ex, { fixed: ['pelvis', 'ankle_r', 'ankle_l'], probe: (W) => { const c = barBenchClear(W, solids); if (c.bar.d < bc.bar.d) bc.bar = c.bar; if (c.hand.d < bc.hand.d) bc.hand = c.hand; } });
  for (const q of Object.values(poses)) { const c = bodyBenchClear(L.fk(q, contacts), solids, /^(chest|pecs_[rl]|ribcage|abdomen|pelvis|quad_[rl]|thigh_[rl]|buttock_[rl]|calf_[rl]|shank_[rl])$/); if (!body2 || c.other.d < body2.other.d) body2 = c; }
  const Wb = L.fk(poses.r0, contacts), Wt = L.fk(poses[`r${N}`], contacts), bt = EQ.barAt(Wt, BB.GRIP);
  const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
  set('Bench angle', 'setup', `${cfg.ang ?? 40}° back pad (80 cm), seat 45 cm high`); set('Bench angle', 'peak', `Trunk ≈${Math.round(V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]))}° from vertical, along the pad`);
  set('Elbow flexion', 'setup', `${d(B6elbow(Wb))}, underhand ${gw} cm grip (handle centres), arms hanging in front of the pad`);
  set('Elbow flexion', 'peak', `${d(B6elbow(Wt))}, elbows ${r1(Wt.elbow_r.p[2] - Wt.shoulder_r.p[2])} cm out from the shoulders; the bar stops ${margin} cm under the pad; shoulder blades retracted (clavicle ${SC[0].protract}° to ${SC[1].protract}°)`);
  set('Chest on the pad', 'setup', `Chest on the pad (gap ${r1(bd.gap)} cm); head ${r1(bd.along(W0, 'head_c1') - 80)} cm past the top`); set('Chest on the pad', 'peak', 'Unchanged (the trunk does not move)');
  set('Tempo', 'setup', `Hang ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.pull[1] - ph.pull[0])} s up, ${r1(ph.squeeze[1] - ph.squeeze[0])} s squeeze, ${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(D - ph.lower[1])} s reset`);
  const info = { C0: C0.map(r1), C1: C1.map(r1), barTop: bt.c.map(r1), gripErr: +state.err.toFixed(2), benchBar: bc.bar, benchHand: bc.hand, benchBody: body2, elbow: [r1(B6elbow(Wb)), r1(B6elbow(Wt))] };
  const fails = A.failures(sw, [[state.err < 0.5, `hands off the bar (${state.err.toFixed(2)})`], [bc.bar.d > -0.2, `bar into the bench (${JSON.stringify(bc.bar)})`], [bc.hand.d > -0.8, `hands into the bench (${JSON.stringify(bc.hand)})`], [body2.other.d > -1, `body into the bench (${JSON.stringify(body2.other)})`], [sw.drift < 0.05, 'trunk moves']]);
  A.report(cfg.name, L.write(ex), sw, info, fails);
  return { ex, sw, poses };
}
Object.assign(module.exports, { inclineChestBody, inclineRow });

/* ---------------- Olympic lifts: the clean-and-press machinery as a kit ---------------- */
// author-barbell-clean-and-press.js solves both arms onto the bar at every key and in-between key on one continuous
// branch (b5-bbhinge.js barArms, nearest-solution mode), with the bodies from the power family (b4-power.js body /
// lerpCfg: flat or rolling feet) and the floor pull from the balanced barbell hinge. oly() packages that machinery with
// the grip width as a parameter, so cleans, jerks and snatches share it. Returns the solver, the key bookkeeping and the
// arm specs: hang (straight arms just clear of the body), pull (high pull, elbows high and out), rack (front of the
// shoulders), pmid (in front of the forehead), ptop (straight arms overhead), plus the first-pull configs (hingeCfg).
function oly({ GW, KG = 30, MIDFOOT = 5, toe = 8, half = 12, env = {} }) {
  toe = +(env.TOE ?? toe); half = +(env.HALF ?? half); KG = +(env.KG ?? KG); MIDFOOT = +(env.MIDF ?? MIDFOOT);
  const P = require('./b4-power'), Bk = require('./b3-back'), Xh = require('./b5-bbhinge');
  const Q = L.Q;
  const E_ = (k, d) => +(env[k] ?? d);
  const F = P.makeFamily({ toe, half });
  const UAL = V.len(L.rig.byId.elbow_r.offset) - 0.1;
  const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
  const roll = (pitch) => ({ r: { c: 'roll', pitch, ballX: F.BALL_X }, l: { c: 'roll', pitch, ballX: F.BALL_X } });
  const THUMB = [0, 0, -1];
  const sphere = (S, d) => V.add(S, V.scale(V.norm(d), UAL));
  const straight = [(W, qq) => [(qq.ch.elbow_r.flex - 4) * 0.3]];
  const thumbIn = (W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), [0, 0, -1]).map((v) => v * E_('TW', 3));
  const st0 = {};
  const hingeArms = (p) => { const q = Xh.hangBar(p, F.contacts, { gw: GW, clear: 0.8, state: st0 }); delete q.__bar; return q; };
  const sp = (g) => ({ l5: r1(-3 * g), t12: r1(E_('SPT12', 0) * g), t6: r1(E_('SPT6', 1) * g) }), scH = (g) => ({ protract: r1(E_('SCP', 6) * g), elevate: r1(-2 - E_('SCE', 4) * g) });
  const hinge = (pitch, knee, g) => Bk.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet: flat, spine: sp(g), sc: scH(g), kg: KG, midfoot: MIDFOOT, arms: hingeArms });
  const KNEE_B = E_('KNEE_B', 78), KNEE_T = 4;
  let pa = -20, pb = -75;
  for (let i = 0; i < 22; i++) { const pm = (pa + pb) / 2, r = hinge(pm, KNEE_B, 1); if (EQ.barMinY(r.W, { grip: BB.GRIP }) > 0.05) pa = pm; else pb = pm; }
  const PITCH_B = r1((pa + pb) / 2);
  function hingeCfg(f) {
    const gk = 1 - Math.pow(1 - f, 1.7), gp = Math.pow(f, 1.5), g = 1 - f, pitch = PITCH_B * (1 - gp), knee = KNEE_B + (KNEE_T - KNEE_B) * gk;
    const r = hinge(pitch, knee, g);
    return { feet: flat, knee: r1(knee), pitch: r1(pitch), x: r.spec.root[0], spine: sp(g), sc: scH(g), neck: [r.pose.ch.neck_c7.flex, r.pose.ch.head_c1.flex] };
  }
  const S_ = (W) => W.shoulder_r.p;
  const touchSkip = /^(hand|thumb|forearm|upperarm|biceps|triceps)_/;
  function clearFwd(W, c, margin = 0.8) { const q = c.slice(), half2 = GW / 2 - 6; for (let i = 0; i < 40; i++) { if (EQ.segmentClear(W, [q[0], q[1], -half2], [q[0], q[1], half2], EQ.BAR.shaftR, { skip: touchSkip }).d >= margin) break; q[0] += 0.5; } return q; }
  const PRON_H = E_('PH', 100), PRON_T = E_('PT', 85);
  const splitAt = (v) => (W, qq) => [(qq.ch.wrist_r.pron - v) * 0.05];
  const HANG = { bar: (W, p) => clearFwd(W, Xh.hangPlace(p, F.contacts, { gw: GW, clear: 1.0 }), 1.5), th: 180, split: PRON_H, extra: [...straight, splitAt(PRON_H)] };
  const EXT = Object.assign({}, HANG, { bar: (W, p) => clearFwd(W, Xh.hangPlace(p, F.contacts, { gw: GW, clear: 1.0 }), E_('EXM', 4)) });
  const ARM = {
    hang: HANG, ext: EXT,
    pull: { bar: (W) => Xh.touchAlong(W, V.lerp(W.pelvis.p, W.neck_c7.p, E_('PUP', 0.66)).map((v, i) => (i === 2 ? 0 : v)), [1, 0, 0], GW / 2 - 8, { margin: 1.5, skip: touchSkip }), elbow: (W) => sphere(S_(W), [-0.35, 0.3, E_('EO', 0.6)]), elbowW: 0.8, th: E_('THP', 205) },
    rack: { bar: (W) => X0(Xh.touchAlong(W, [S_(W)[0] - 4, S_(W)[1] + E_('RY', 1), 0], [1, 0, 0], GW / 2 - 9, { margin: E_('RM', 9), skip: touchSkip })), elbow: (W, c) => [c[0] - 1, c[1] - L.FA - 3, GW / 2 + 1], elbowW: 0.6, th: E_('THR', 25) },
    pmid: { bar: (W) => Xh.touchAlong(W, [W.head_c1.p[0], S_(W)[1] + 17, 0], [1, 0, 0], GW / 2 - 8, { margin: 2.5, skip: touchSkip }), elbow: (W) => sphere(S_(W), [0.3, 0.05, 0.95]), elbowW: 0.6, th: E_('THM', 30) },
    ptop: { bar: (W, p) => { const S = S_(W), r = BB.reachG(p, 4) - 0.5, dz = GW / 2 - S[2], dx = E_('PDX', 1); return [S[0] + dx, S[1] + Math.sqrt(Math.max(1, r * r - dz * dz - dx * dx)), 0]; }, th: 90, split: PRON_T, extra: [...straight, splitAt(PRON_T)] },
  };
  function X0(c) { return c; }
  const state = {};
  // optional: keep the forearm rotation (wrapped) within an anatomical range [lo, hi] (0 palm up ... 180 palm down), so a
  // straight arm cannot settle on a hyper-supinated / over-rotated humerus split that later has to spin back
  const pr = env.PRANGE ? String(env.PRANGE).split(',').map(Number) : null;
  const pRange = pr ? (W, qq) => { const v = L.wrap(qq.ch.wrist_r.pron); return [Math.min(0, v - pr[0]) * 0.5, Math.max(0, v - pr[1]) * 0.5]; } : null;
  function solve(cfg, arm, keep) {
    const b = P.body(F, cfg); delete b.__spec;
    const W = L.fk(b, F.contacts), c = arm.bar(W, b), Eh = arm.elbow ? arm.elbow(W, c) : null;
    c[2] = W.pelvis.p[2];
    state.keep = keep; state.nearest = keep;
    const th = arm.th * Math.PI / 180, palm = [Math.cos(th), Math.sin(th), 0];
    const q = Xh.barArms(b, c, GW, { palm, thumb: THUMB, elbow: Eh, elbowW: arm.elbowW ?? 0.5, dirW: arm.pdw ?? E_('PDW', 4), wristW: arm.wristW ?? 0.2, wflex: [-80, 70], lambda: E_('LAM', 5e-4), extra: [...(arm.extra || []), thumbIn, ...(pRange ? [pRange] : [])], guesses: arm.guesses }, state);
    const Wq = L.fk(q, F.contacts), S = S_(Wq);
    return { pose: Xh.wrapBody(q), guess: state.guess.slice(), cfg, rel: V.sub(c, S), e: V.norm(V.sub(Wq.elbow_r.p, S)), th: (() => { const pm = Q.rot(Wq.wrist_r.q, [1, 0, 0]); let a = Math.atan2(pm[1], pm[0]) * 180 / Math.PI; return a + 360 * Math.round((arm.th - a) / 360); })(), err: state.last, straight: !!arm.extra, split: arm.split, ew: arm.elbowW ?? 0.5, pdw: arm.pdw ?? E_('PDW', 4) };
  }
  function between(A, Bk2, n, prog = false) {
    const out = [], fr = Array.isArray(n) ? n : Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
    for (const f of fr) {
      const cfg = P.lerpCfg(A.cfg, Bk2.cfg, f);
      const rel = V.scale(Xh.slerpV(A.rel, Bk2.rel, f), V.len(A.rel) + (V.len(Bk2.rel) - V.len(A.rel)) * f);
      const arm = { bar: (W) => V.add(S_(W), rel), elbow: (W) => sphere(S_(W), Xh.slerpV(A.e, Bk2.e, f)), elbowW: E_('BEW', 0.25), th: A.th + (Bk2.th - A.th) * f, pdw: E_('MPDW', 4), split: Bk2.split, extra: A.straight && Bk2.straight ? [...straight, splitAt(Bk2.split ?? PRON_H)] : (prog && Bk2.straight ? [(W, qq) => [(qq.ch.elbow_r.flex - 4) * 0.3 * f * f, (qq.ch.wrist_r.pron - (Bk2.split ?? PRON_H)) * 0.05 * f * f]] : []) };
      out.push(solve(cfg, arm, true));
    }
    return out;
  }
  const poses = {}, errs = {}, K = {}, seq = [];
  function addK(name, k, t) { K[name] = k; poses[name] = k.pose; errs[name] = +(k.err ?? 0).toFixed(2); if (t != null) seq.push({ t: +t.toFixed(3), name }); return k; }
  function link(A, nameB, cfgB, armB, n, tA, tB, cont = false, prog = cont) {
    const g0 = A.guess.slice();
    solve(cfgB, armB, false);
    const Bk0 = solve(cfgB, armB, true);
    state.guess = g0;
    const mids = between(A, Bk0, n, prog);   // cont: a straight-arm key also straightens the in-betweens progressively
    const fr = Array.isArray(n) ? n : Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
    mids.forEach((m, i) => addK(`${nameB}_${i}`, m, tA + (tB - tA) * fr[i]));
    // the key itself: by default re-solved with its own arm spec from the last in-between's branch (as in the clean and
    // press); with cont, solved as the last in-between at f = 1 (same weights, so no step between the two)
    const kB = cont ? Object.assign(between(A, Bk0, [1], prog)[0], { straight: Bk0.straight, split: Bk0.split }) : solve(cfgB, armB, true);
    return addK(nameB, kB, tB);
  }
  const sc = (protract, elevate) => ({ protract, elevate });
  return { F, P, GW, flat, roll, sc, sphere, straight, splitAt, PRON_H, PRON_T, clearFwd, S_, touchSkip, HANG, EXT, ARM, state, solve, between, link, addK, poses, errs, K, seq, hingeCfg, PITCH_B, KNEE_B, MIDFOOT };
}
Object.assign(module.exports, { oly });
