// Batch 5 barbell family (b5-bbpress): close-grip / incline close-grip / JM bench press, lying and seated barbell triceps
// extensions, the seated barbell front raise and barbell calf raises. Builds on barbell.js (armsOnBar: right handle point on
// the bar, mirrored to the left so the grip width stays what was asked; sweep: whole-loop grip width / bar vs floor / bar vs
// body / planted contacts) and on the batch 3 / 4 bases (b3-chest.js lying on the bench, b4-shoulders2.js seated on the
// bench end, b4-calvesglutes.js heel raise about the ball of the foot).
//  - seedOf / armKey: one arm key on the bar, seeded from the previous key so the shoulder / wrist channels stay on one
//    continuous branch, optionally with an elbow target (upper-arm direction) and a wrist-flexion target.
//  - lyingPress: the bench-press path generalised (grip width, bench angle, bottom point, elbow flare / dip) and its rack.
//  - extPath: lying or seated elbow-extension keys: the upper arm along a direction that may tilt with the phase, the forearm
//    folding in a given plane by a given elbow bend; the bar is wherever the hands end up (handle points kept at the grip
//    width by the mirrored solve).
//  - clearHead: bar shaft clearance from the head / neck shapes (the bar's skull-crusher depth limit).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const EQ = require('./equip');
const BB = require('./barbell');
const C = require('./b3-chest');

const seedOf = (q) => [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];
// Wrist flexion soft target (deg, negative = extended) with hard-ish stops inside the rig range
const wristAt = (v, w = 0.3) => (W, q) => [(q.ch.wrist_r.flex - v) * w, Math.min(0, q.ch.wrist_r.flex + 40) * 3, Math.max(0, q.ch.wrist_r.flex - 30) * 3];
// One key: right handle point at g (z = half the grip width), palm / thumb preferences, optional elbow target
function armKey(base, contacts, g, { palm, thumb = [0, 0, -1], E = null, elbowW = 0.5, wrist = null, wristW = 0.3, dirW = 0.6, seeds, extra = [] }) {
  const ex = [...extra]; if (wrist != null) ex.push(wristAt(wrist, wristW));
  const q = BB.armsOnBar(base, g, { palm, thumb, dirW, wristW: 0.01, guesses: seeds, elbow: E, elbowW, extra: ex });
  const err = V.len(V.sub(EQ.gripPoint(L.fk(q, contacts), 'r', BB.GRIP).p, g));
  q.__err = err;
  return q;
}
const strip = (q) => { const p = clone(q); delete p.__cost; delete p.__err; delete p.__E; return p; };

// Bar shaft (inside the hands) clearance from the head and neck shapes (cm)
const HEAD = rig.shapes.filter((s) => /^(head|hair|ear_[rl]|jaw|nose|brow_[rl]|eye_[rl]|neck)$/.test(s.id)).map((s) => s.id);
function clearHead(W) {
  const b = EQ.barAt(W, BB.GRIP), a = V.norm(V.sub(b.r, b.l)), half = V.len(V.sub(b.r, b.l)) / 2;
  let best = { d: 1e9 };
  for (let k = -12; k <= 12; k++) { const p = V.add(b.c, V.scale(a, (k / 12) * half)); for (const id of HEAD) { const d = EQ.pointShape(W, p, id) - EQ.BAR.shaftR; if (d < best.d) best = { d, id }; } }
  return best;
}


// Keep angle channels on one continuous branch: unwrap plane / axial / pron (both arms) toward the previous key
function unwrapTo(q, ref) {
  for (const s of ['r', 'l']) for (const [j, c] of [['shoulder', 'plane'], ['shoulder', 'axial'], ['wrist', 'pron']]) {
    const a = q.ch[`${j}_${s}`], b = ref && ref.ch[`${j}_${s}`]; if (!a || !b) continue;
    a[c] = r1(a[c] + 360 * Math.round((b[c] - a[c]) / 360));
  }
  return q;
}
// Grip-width error (cm) of a pose: handle points of the two hands vs the wanted width
const widthErr = (q, contacts, GW) => Math.abs(EQ.barAt(L.fk(q, contacts), BB.GRIP).width - GW);
// Linear blend of two poses' channels (what the player's interpolation does between dense keys, near enough)
function blend(a, b, t) { const q = clone(a); for (const j in q.ch) for (const c in q.ch[j]) if (b.ch[j] && typeof b.ch[j][c] === 'number') q.ch[j][c] = a.ch[j][c] + (b.ch[j][c] - a.ch[j][c]) * t; return q; }
// Path keys f = 0 ... 1 from solve(f, prevPose): n even keys, then keys inserted where the blend between two neighbours
// lets the grip width drift by more than tol (near the shoulder's elevation singularity the plane / axial channels swing
// quickly). Every key is unwrapped toward its neighbour. Returns [{ f, pose }] sorted by f (f = 0 first).
function refine(solve, n, GW, contacts, { tol = 0.35, depth = 4, from = 1 } = {}) {
  const keys = []; let prev = null;
  const order = []; for (let i = 0; i <= n; i++) order.push(from === 1 ? i / n : 1 - i / n);
  for (const f of order) { const q = unwrapTo(solve(f, prev), prev); keys.push({ f, pose: q }); prev = q; }
  keys.sort((a, b) => a.f - b.f);
  const out = [keys[0]];
  const split = (a, b, d) => {
    let worst = 0; for (const t of [0.25, 0.5, 0.75]) worst = Math.max(worst, widthErr(blend(a.pose, b.pose, t), contacts, GW));
    if (worst > tol && d > 0) { const fm = (a.f + b.f) / 2, m = { f: fm, pose: unwrapTo(solve(fm, a.pose), a.pose) }; split(a, m, d - 1); split(m, b, d - 1); } else out.push(b);
  };
  for (let i = 1; i < keys.length; i++) split(out[out.length - 1], keys[i], depth);
  return out;
}
// repKeys with key times proportional to f (dense keys where they were inserted): top hold, lower, bottom (settle), lift, top
function repKeysF(path, T, settle, names = {}) {
  const n = path.length - 1, poses = { top: path[n].pose, bottom: path[0].pose }, kf = [{ t: 0, pose: 'top' }, { t: T.h, pose: 'top' }];
  for (let i = n - 1; i >= 1; i--) { const nm = `k${i}`; poses[nm] = path[i].pose; kf.push({ t: +(T.h + (T.b - T.h) * (1 - path[i].f)).toFixed(3), pose: nm }); }
  kf.push({ t: T.b, pose: 'bottom' });
  if (settle) { poses.bottomHold = unwrapTo(settle, path[0].pose); kf.push({ t: +((T.b + T.p) / 2).toFixed(3), pose: 'bottomHold' }); }
  kf.push({ t: T.p, pose: 'bottom' });
  for (let i = 1; i <= n - 1; i++) kf.push({ t: +(T.p + (T.r - T.p) * path[i].f).toFixed(3), pose: `k${i}` });
  kf.push({ t: T.r, pose: 'top' }, { t: T.D, pose: 'top' });
  return { poses, keyframes: kf };
}

/* ---------------- Lying press (flat or incline) ---------------- */
// opt: { angle, GW, bottomDX (bar touch point toward the feet from the shoulder joints), topDX, flare, dip (elbow target at
// the bottom, trunk frame), foreW (forearms vertical in the sagittal plane), wristBot / wristTop, palm, n }
const PALM = V.norm([1, 0.6, 0]), THUMB = [0, 0, -1];
const SEEDS = [[0, 55, 0, 100, 120], [30, 70, 60, 90, 60], [30, 70, -60, 90, 170], [10, 80, 0, 90, 90], [60, 85, 30, 30, 90], [20, 60, 30, 110, 90]];
function lyingPress(meta, { angle = 0, GW, bottomDX, topDX = 2, flare, dip, foreW = 1.0, wristBot = -20, wristTop = -10, topElbow = 8, n = 18, settleDY = 0.2, touch = 0.5, base: L0 = null }) {
  const T = C.phaseT(meta), { B, base, contacts, foot } = L0 || C.benchBase(angle);
  const W0 = L.fk(base, contacts), S = W0.shoulder_r.p, Fr = C.trunkFrame(W0);
  const vertFore = (w) => (W) => { const d = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); return [d[0] * w]; };
  let gripWorst = 0;
  const arm = (c, f, seed) => {
    const grips = EQ.barGrips(c, BB.AX, GW), E = V.add(S, V.scale(C.upperArmDir(Fr, flare, dip), L.UA));
    const q = armKey(base, contacts, grips.r, { palm: PALM, thumb: THUMB, dirW: 0.4, E: f < 1 ? E : null, elbowW: 0.5 * (1 - f), wrist: wristBot + (wristTop - wristBot) * f, seeds: seed ? [seed] : SEEDS, extra: [vertFore(foreW * (1 - f) + 0.3)] });
    gripWorst = Math.max(gripWorst, q.__err);
    return q;
  };
  const xb = r1(S[0] + bottomDX), cb = [xb, r1(BB.chestTop(W0, xb) + touch), 0];
  const xt = r1(S[0] + topDX);
  let ya = cb[1] + 15, yb = cb[1] + 60;
  for (let i = 0; i < 24; i++) { const y = (ya + yb) / 2, q = armKey(base, contacts, EQ.barGrips([xt, y, 0], BB.AX, GW).r, { palm: PALM, thumb: THUMB, dirW: 0.4, wrist: wristTop, seeds: SEEDS }); if (q.__err < 0.1 && q.ch.elbow_r.flex > topElbow) ya = y; else yb = y; }
  const ct = [xt, r1(ya), 0];
  const cAt = (f) => { const gx = 1 - Math.pow(1 - f, 1.8); return [r1(cb[0] + (ct[0] - cb[0]) * gx), r1(cb[1] + (ct[1] - cb[1]) * f), 0]; };
  const path = refine((f, prev) => strip(arm(cAt(f), f, prev && seedOf(prev))), n, GW, contacts);
  const settle = strip(arm([cb[0], cb[1] - settleDY, 0], 0, seedOf(path[0].pose)));
  const { poses, keyframes } = repKeysF(path, T, settle);
  return { T, B, base, contacts, foot, W0, S, Fr, poses, keyframes, cb, ct, gripWorst: () => gripWorst };
}
// Bench-press stands at the head end: J-hooks a few cm below the bar's top height, a little toward the head from the eyes
function stands(W0, ct, { drop = 5, back = 5 } = {}) {
  const eyeX = r1(R.shapeWorld(W0, rig.shapes.find((x) => x.id === 'eye_r')).c[0]), hookY = Math.round(ct[1] - drop), x = r1(Math.min(eyeX, ct[0] - 10) - back);
  return { prop: EQ.rack({ x, hookY, height: hookY + 25, width: 120, id: 'stands' }).prop, x, hookY };
}

/* ---------------- Elbow-extension keys ---------------- */
// Handle-point distance from the elbow joint with the wrist neutral (cm) on this rig (the bar sits in the heel of the palm)
function elbowToGrip(base) {
  const q = clone(base); q.ch.shoulder_r = { plane: 0, elev: 0.01, axial: 0 }; q.ch.elbow_r = { flex: 0 }; q.ch.wrist_r = { pron: 0, flex: 0, dev: 0 };
  const W = L.fk(q); return V.len(V.sub(EQ.gripPoint(W, 'r', BB.GRIP).p, W.elbow_r.p));
}
// One extension key: shoulder joint S, upper arm along ua (world unit), forearm direction fa (world unit, the forearm at the
// wanted bend). The elbow target is S + ua * UA; the handle target is the elbow plus the forearm at the elbow-to-grip
// length, moved to z = GW / 2 (the hands sit a little inside or outside the elbows) keeping the in-plane distance.
function extTarget(S, ua, fa, d, GW) {
  const E = V.add(S, V.scale(ua, L.UA)), g0 = V.add(E, V.scale(fa, d)), dz = GW / 2 - E[2];
  const inPlane = [g0[0] - E[0], g0[1] - E[1]], ip = Math.hypot(...inPlane), k = Math.sqrt(Math.max(1, d * d - dz * dz)) / (ip || 1);
  return { E, g: [E[0] + inPlane[0] * k, E[1] + inPlane[1] * k, GW / 2] };
}


// Sagittal extension geometry in a frame { up (the upper arm at tilt 0), head (perpendicular, toward where the forearm
// folds) }: upper arm tilted `tilt` deg from `up` away from `head` (toward the feet when lying), elbow bent `flex` deg with
// the forearm folding toward `head`. The palm faces away from the fold (overhand on the bar: toward the feet with the arms
// straight up, toward the ceiling with the forearms level). Returns world unit vectors { ua, fa, palm }.
function extDirs(up, head, tilt, flex) {
  const t = tilt * R.DEG, f = flex * R.DEG;
  const ua = V.norm(V.sub(V.scale(up, Math.cos(t)), V.scale(head, Math.sin(t)))), perp = V.norm(V.add(V.scale(head, Math.cos(t)), V.scale(up, Math.sin(t))));
  const fa = V.norm(V.add(V.scale(ua, Math.cos(f)), V.scale(perp, Math.sin(f)))), palm = V.norm(V.sub(V.scale(ua, Math.sin(f)), V.scale(perp, Math.cos(f))));
  return { ua, fa, palm };
}
// One extension key on the bar: elbow target from the upper-arm direction, handle target from the forearm, palm preference.
// opt: { GW, d (elbowToGrip), seeds, elbowW, wrist (deg), S (shoulder joint, world), dz (elbow z offset from the shoulder),
//   flex (soft elbow-flexion target: the bar grip sits off the forearm axis, so the same elbow-to-grip distance can be met by
//   more than one elbow bend / forearm rotation) }
function extKey(base, contacts, dirs, { S, GW, d, seeds, elbowW = 2, wrist = -5, dirW = 0.6, dz = 0, flex = null, flexW = 0.15 }) {
  const S2 = [S[0], S[1], S[2] + dz], { E, g } = extTarget(S2, dirs.ua, dirs.fa, d, GW);
  const extra = flex == null ? [] : [(W, q) => [(q.ch.elbow_r.flex - flex) * flexW]];
  const q = armKey(base, contacts, g, { palm: dirs.palm, thumb: [0, 0, -1], E, elbowW, wrist, wristW: 0.3, dirW, seeds, extra });
  q.__E = E;
  return q;
}


// Surface sample points of a rig shape (ellipsoid: 3 rings + poles; capsule: rings along the axis)
function shapePts(W, id) {
  const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === id)), pts = [];
  if (g.kind === 'capsule') {
    const ab = V.sub(g.b, g.a), ax = V.norm(ab), u = V.norm(V.cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = V.cross(ax, u);
    for (let k = 0; k <= 4; k++) { const t = k / 4, c = V.add(g.a, V.scale(ab, t)), r = g.r[0] + (g.r[1] - g.r[0]) * t; for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * Math.PI; pts.push(V.add(c, V.add(V.scale(u, Math.cos(a) * r), V.scale(w, Math.sin(a) * r)))); } }
    pts.push(V.sub(g.a, V.scale(ax, g.r[0])), V.add(g.b, V.scale(ax, g.r[1])));
  } else {
    const [a0, a1, a2] = g.axes;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI, c = Math.cos(a), sn = Math.sin(a); pts.push(V.add(g.c, V.add(V.scale(a0, c), V.scale(a1, sn))), V.add(g.c, V.add(V.scale(a1, c), V.scale(a2, sn))), V.add(g.c, V.add(V.scale(a0, c), V.scale(a2, sn)))); }
  }
  return pts;
}
// Least clearance (cm) between shapes `a` (sampled) and shapes `b` (signed distance)
function shapesClear(W, a, b) { let best = { d: 1e9 }; for (const ia of a) { const pts = shapePts(W, ia); for (const ib of b) for (const p of pts) { const d = EQ.pointShape(W, p, ib); if (d < best.d) best = { d, a: ia, b: ib }; } } return best; }

module.exports = { shapePts, shapesClear, extDirs, extKey, unwrapTo, widthErr, blend, refine, repKeysF, seedOf, wristAt, armKey, strip, clearHead, HEAD, PALM, THUMB, SEEDS, lyingPress, stands, elbowToGrip, extTarget };
