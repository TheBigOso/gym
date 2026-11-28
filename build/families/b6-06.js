// Batch 6 family b6-06: dumbbell triceps, rear-delt / rotator-cuff raises, shrugs and core twists. Builds on the batch 3-5
// families (b3-triceps lying on a bench and arm solves, b3-shoulders / b4-shoulders3 bases, the held-dumbbell solver and
// clearance scans, b5-misc two-hand dumbbell) without changing them. Adds:
//   - fail(): one gate for the author self-checks (prints every problem, sets the exit code)
//   - twoHands(): both arms solved so the hands hold one dumbbell by its ends (attach.with) at a centre / axis, with the
//     grip gap held constant (the player places a two-hand item midway between the grips)
//   - limits(): joint-limit scan of every key pose (same test as test/verify.mjs)
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const DB = require('./dumbbell');
const wrapA = (a) => ((((a % 360) + 540) % 360) - 180);

function fail(name, bad) {
  const b = bad.filter(Boolean);
  if (b.length) { console.error(`FAIL ${name}: ${b.join('; ')}`); process.exitCode = 1; }
}
function limits(poses) {
  const viol = [];
  for (const [name, p] of Object.entries(poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${name}.${j}.${c}=${p.ch[j][c]}`); }
  return viol;
}
const ARMP = (s) => [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`];
const limitPen = (paths, w = 3) => (W, pose) => paths.map((pth) => { const [, j, c] = pth.split('.'), lim = rig.byId[j].limits && rig.byId[j].limits[c], v = L.getPath(pose, pth) ?? 0; return lim ? (Math.max(0, lim[0] + 1 - v) + Math.max(0, v - lim[1] + 1)) * w : 0; });
// Grip point of a hand ('handle' grip, as dumbbell.js / the player): the dumbbell centre for a one-hand hold
const gripPt = (W, s, grip = 'handle') => DB.dumbbellAt(W, s, grip).c;
// Both hands on one dumbbell held by its ends: right grip at c + ax * gap / 2, left at c - ax * gap / 2; palms face the
// dumbbell (palm normal along -ax for the right hand, +ax for the left), knuckles toward `up` (world). Arm channels are
// solved by least squares from `guess` (pose with the previous key's arms, keeps one branch). extra: more residuals.
function twoHands(pose, c, ax, gap, { up = [0, 1, 0], wUp = 2, extra = [], elbowOut = null, guess = null, iters = 400, seedArms = null, seedAlways = false } = {}) {
  let p = clone(pose);
  if (guess) for (const s of ['r', 'l']) for (const j of ['shoulder', 'elbow', 'wrist']) p.ch[`${j}_${s}`] = clone(guess.ch[`${j}_${s}`]);
  const a = V.norm(ax);
  const tgt = { r: V.add(c, V.scale(a, gap / 2)), l: V.sub(c, V.scale(a, gap / 2)) };
  const paths = [...ARMP('r'), ...ARMP('l')];
  const objs = [];
  for (const s of ['r', 'l']) {
    const pn = s === 'r' ? V.scale(a, -1) : a;
    objs.push((W) => V.sub(gripPt(W, s), tgt[s]).map((v) => v * 4));
    objs.push((W) => V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), pn).map((v) => v * 1.5));
    // fingers (hand -Y) roughly perpendicular to the dumbbell, back of the hand toward `up`
    objs.push((W) => [V.dot(Q.rot(W[`wrist_${s}`].q, [0, -1, 0]), V.norm(up)) * wUp]);
    if (elbowOut) objs.push((W) => [Math.min(0, V.dot(V.sub(W[`elbow_${s}`].p, W[`wrist_${s}`].p), s === 'r' ? elbowOut : [elbowOut[0], elbowOut[1], -elbowOut[2]])) * 0.5]);
    objs.push(L.obj.reg(`ch.wrist_${s}.flex`, 0, 0.08), L.obj.reg(`ch.wrist_${s}.dev`, 0, 0.08), L.obj.reg(`ch.shoulder_${s}.axial`, p.ch[`shoulder_${s}`]?.axial ?? 0, 0.004));
  }
  objs.push(limitPen(paths), ...extra);
  let sol = null;
  const seeds = guess ? (seedAlways && seedArms ? [null, ...seedArms] : [null]) : (seedArms || [null]);
  for (const sd of seeds) {
    const p0 = clone(p);
    if (sd) for (const s of ['r', 'l']) { p0.ch[`shoulder_${s}`] = { plane: sd[0], elev: sd[1], axial: sd[2] }; p0.ch[`elbow_${s}`] = { flex: sd[3] }; p0.ch[`wrist_${s}`] = { pron: sd[4], flex: 0, dev: 0 }; }
    const r = L.solvePose(p0, paths, objs, { iters });
    if (!sol || r.cost < sol.cost) sol = r;
  }
  const q = sol.pose;
  for (const s of ['r', 'l']) { q.ch[`shoulder_${s}`].plane = r1(wrapA(q.ch[`shoulder_${s}`].plane)); q.ch[`shoulder_${s}`].axial = r1(wrapA(q.ch[`shoulder_${s}`].axial)); q.ch[`wrist_${s}`].pron = r1(wrapA(q.ch[`wrist_${s}`].pron)); }
  const W = L.fk(q);
  q.__cost = sol.cost; q.__err = +Math.max(V.len(V.sub(gripPt(W, 'r'), tgt.r)), V.len(V.sub(gripPt(W, 'l'), tgt.l))).toFixed(2);
  return q;
}
// Shoulder channels putting the elbow along uaDir (world) with the forearm (at elbow flex 90) along faDir, inside the
// shoulder joint limits (b3-triceps upperArm plus limit penalties). Returns { ch, cost, err (deg) }.
function upperArm(pose, side, uaDir, faDir, guess, wFa = 10) {
  const set = (x) => { const q = clone(pose); q.ch[`shoulder_${side}`] = { plane: x[0], elev: x[1], axial: x[2] }; q.ch[`elbow_${side}`] = { flex: 90 }; return q; };
  const lim = rig.byId[`shoulder_${side}`].limits;
  const res = (x) => { const W = L.fk(set(x)); return [...V.sub(V.norm(V.sub(W[`elbow_${side}`].p, W[`shoulder_${side}`].p)), V.norm(uaDir)).map((v) => v * 20), ...V.sub(V.norm(V.sub(W[`wrist_${side}`].p, W[`elbow_${side}`].p)), V.norm(faDir)).map((v) => v * wFa),
    (Math.max(0, lim.plane[0] + 1 - x[0]) + Math.max(0, x[0] - lim.plane[1] + 1)) * 5, (Math.max(0, lim.elev[0] + 1 - x[1]) + Math.max(0, x[1] - lim.elev[1] + 1)) * 5]; };
  let best = null;
  for (const g of guess) { const s = R.solveLM(g, res, { iters: 400 }); if (!best || s.cost < best.cost) best = s; }
  const x = best.x.map(r1), W = L.fk(set(x));
  return { ch: { plane: r1(wrapA(x[0])), elev: x[1], axial: r1(wrapA(x[2])) }, cost: best.cost, err: +V.angle(V.sub(W[`elbow_${side}`].p, W[`shoulder_${side}`].p), uaDir).toFixed(1) };
}
// Held-dumbbell arm keys from nominal right-arm channels (b3-shoulders armKeys, with a thumb direction instead of a palm):
// FK of the nominal channels gives the wrist and elbow targets; thumb(armDir, key) gives the world thumb direction (made
// perpendicular to the forearm); the arm is solved with F.solveArm along one branch and mirrored to the left unless
// key.one. keys: [{ name, plane, elev, axial, flex, pron, sc, thumb }]
function raiseKeys(basePose, keys, contacts, { mirror = true, wThumb = 4 } = {}) {
  const F = require('./b3-shoulders');
  const poses = {}, err = {};
  let g = null;
  for (const k of keys) {
    const p = clone(basePose);
    if (k.sc) p.ch.sc_r = clone(k.sc);
    const n = clone(p); n.ch.shoulder_r = { plane: k.plane, elev: k.elev, axial: k.axial }; n.ch.elbow_r = { flex: k.flex }; n.ch.wrist_r = { pron: k.pron, flex: 0, dev: 0 };
    const Wn = L.fk(n, contacts), fore = V.norm(V.sub(Wn.wrist_r.p, Wn.elbow_r.p)), arm = V.norm(V.sub(Wn.wrist_r.p, Wn.shoulder_r.p));
    let th = k.thumb(arm, k); th = V.norm(V.sub(th, V.scale(fore, V.dot(th, fore))));
    const guess = g || { plane: k.plane, elev: k.elev, axial: k.axial, flex: k.flex, pron: k.pron };
    const q = F.solveArm(p, { wrist: Wn.wrist_r.p, elbow: Wn.elbow_r.p, wElbow: 1, thumb: th, wThumb, guess });
    err[k.name] = q.__err; g = F.armGuess(q);
    poses[k.name] = mirror ? F.mirrorArm(q) : strip(q);
  }
  return { poses, err };
}
const lerp = (a, b, f) => a + (b - a) * f;
const blendDir = (a, b, f) => V.norm(V.add(V.scale(V.norm(a), 1 - f), V.scale(V.norm(b), f)));
// Side-lying on the left side on the mat (head toward -X, facing -Z, right side up; root yaw -90 / pitch 180 / roll 90 as
// in the side crunch author), hips and knees bent and stacked, the bottom (left) arm reaching overhead along the floor as a
// pillow under the head. Rig v2 shapes rest on the floor: the left hip and the left side of the ribs at y = 0, the arm on
// the floor. Returns { pose, info }.
function sideLie({ hip = 45, knee = 70, armElev = 165, armPlane = 95, elbow = 25, neck = 0, armDy = 0.12 } = {}) {
  const M = require('./b4-core2'), CA = require('./core-a');
  let p = M.lie({ kneeFlex: 0, headRest: 'free' });
  p.root.rot = { yaw: -90, pitch: 180, roll: 90 };
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 0, latFlex: 0 };
  p.ch.hip_r = { flex: hip, abd: -6, rot: 0 }; p.ch.hip_l = { flex: hip, abd: 0, rot: 0 };
  p.ch.knee_r = { flex: knee }; p.ch.knee_l = { flex: knee }; p.ch.ankle_r = { dorsi: -20 }; p.ch.ankle_l = { dorsi: -20 };
  p.ch.neck_c7 = { rot: 0, flex: r1(neck * 0.5) }; p.ch.head_c1 = { rot: 0, flex: r1(neck * 0.5) };
  p.ch.sc_l = { protract: 10, elevate: 14 }; p.ch.sc_r = { protract: 2, elevate: 0 };
  p.ch.shoulder_l = { plane: armPlane, elev: armElev, axial: 0 }; p.ch.elbow_l = { flex: elbow }; p.ch.wrist_l = { pron: 0, flex: 0, dev: 0 };
  p.ch.shoulder_r = { plane: 0, elev: 5, axial: 0 }; p.ch.elbow_r = { flex: 10 }; p.ch.wrist_r = { pron: 0, flex: 0, dev: 0 };
  const bo = (W, ids) => Math.min(...ids.map((id) => CA.bottomOf(W, id)));
  const hipLow = (W) => bo(W, ['pelvis', 'buttock_l', 'thigh_l', 'quad_l']);
  const ARM = ['upperarm_l', 'forearm_l', 'hand_l', 'deltoid_l', 'biceps_l', 'thumb_l'];
  const ribLow = (W) => bo(W, ['ribcage', 'chest', 'pecs_l', ...ARM]);
  for (let it = 0; it < 4; it++) {
    // bottom arm as a pillow: elbow on the floor beyond the head, forearm back up so the hand cups the side of the head
    const W0 = L.fk(p), Hh = W0.head_c1;
    const HB = V.add(Hh.p, [2, -(Hh.p[1] - bo(W0, ['head', 'hair'])) + 1, -2]); // just under the side of the head
    const paths = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron', 'ch.wrist_l.flex', 'ch.wrist_l.dev'];
    const handTop = (W) => { const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === 'hand_l')); return g.c[1] + Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
    const sol = L.solvePose(p, paths, [(W) => [(handTop(W) - HB[1]) * 3, (W.wrist_l.p[0] - HB[0] + 3) * 1, (W.wrist_l.p[2] - HB[2]) * 1], (W) => ARM.map((id) => Math.min(0, CA.bottomOf(W, id) - 0.3) * 4), (W) => [(W.elbow_l.p[1] - 6) * 0.5],
      L.obj.reg('ch.shoulder_l.axial', 0, 0.005), L.obj.reg('ch.wrist_l.flex', 0, 0.05), L.obj.reg('ch.wrist_l.dev', 0, 0.05), limitPen(paths.filter((x) => !/axial|pron/.test(x)))], { iters: 400 });
    p = sol.pose;
    p = L.solvePose(p, ['root.pos.1', 'root.rot.roll'], [(W) => [hipLow(W) * 4, ribLow(W) * 4]], { iters: 200 }).pose;
    p = L.solvePose(p, ['ch.hip_r.abd', 'ch.hip_l.abd'], [(W) => [(bo(W, ['shank_l', 'calf_l', 'foot_l']) - 0.2) * 3, (W.knee_r.p[1] - W.knee_l.p[1] - 11) * 2], L.obj.reg('ch.hip_r.abd', -6, 0.05), L.obj.reg('ch.hip_l.abd', 0, 0.05), limitPen(['ch.hip_r.abd', 'ch.hip_l.abd'])], { iters: 150 }).pose;
  }
  for (const k of ['yaw', 'pitch', 'roll']) p.root.rot[k] = r1(p.root.rot[k]);
  p.root.pos = p.root.pos.map(r1);
  for (const j of ['hip_r', 'hip_l', 'shoulder_l', 'elbow_l', 'wrist_l']) for (const c in p.ch[j]) p.ch[j][c] = r1(c === 'axial' || c === 'pron' || c === 'plane' ? wrapA(p.ch[j][c]) : p.ch[j][c]);
  const W = L.fk(p), headLow = bo(W, ['head', 'hair']), armTop = Math.max(...['upperarm_l', 'forearm_l'].map((id) => { const g = R.shapeWorld(W, rig.shapes.find((x) => x.id === id)); return Math.max(g.a[1] + g.r[0], g.b[1] + g.r[1]); }));
  return { pose: p, info: { hipLow: +hipLow(W).toFixed(2), ribLow: +ribLow(W).toFixed(2), headLow: +headLow.toFixed(1), armTop: +armTop.toFixed(1), floor: +L.shapeMinY(W).y.toFixed(2) } };
}
// External-rotation keys about a fixed upper arm: the right arm is solved once (F.solveArm) with the elbow at E, the
// forearm along d(phiRef) and the palm along palm(phiRef); every key then changes only the humeral axial rotation, so the
// elbow stays exactly still. d / palm: (phi) => world directions. Returns { poses, phiOf(W), axial0, sign, err }.
function rotKeys(base, E, d, palm, phiRef, phis, { guess, names } = {}) {
  const F = require('./b3-shoulders');
  const p = clone(base);
  const Wt = V.add(E, V.scale(d(phiRef), L.FA - 0.3));
  const q = F.solveArm(p, { wrist: Wt, elbow: E, wElbow: 3, palm: palm(phiRef), wPalm: 4, guess: guess || { plane: 30, elev: 40, axial: 0, flex: 90, pron: 90 } });
  const err = q.__err; strip(q);
  const ax0 = q.ch.shoulder_r.axial;
  // forearm angle in the rotation plane, measured against d(0) toward d(90)
  const phiOf = (W) => { const v = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); return Math.atan2(V.dot(v, d(90)), V.dot(v, d(0))) / R.DEG; };
  const at = (ax) => { const z = clone(q); z.ch.shoulder_r.axial = r1(ax); return z; };
  const p0 = phiOf(L.fk(at(ax0))), p1 = phiOf(L.fk(at(ax0 + 10)));
  const sign = (p1 - p0) / 10;
  const poses = {};
  phis.forEach((ph, i) => { poses[names ? names[i] : `r${i}`] = at(ax0 + (ph - p0) / sign); });
  return { poses, phiOf, axial0: ax0, sign: +sign.toFixed(3), err, arm: q };
}
const gapOf = (W) => V.len(V.sub(gripPt(W, 'r'), gripPt(W, 'l')));
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const easeTimes = (fs, t0, t1) => fs.map((f) => +(t0 + (t1 - t0) * inv(f)).toFixed(3));
// Gap between two dumbbells (dumbbellAt results) treated as capsules end plate to end plate (cm, < 0 = overlap)
function segGap(a, b) { let m = 1e9; for (let i = 0; i <= 12; i++) for (let k = 0; k <= 12; k++) { const p = V.add(a.ends[1], V.scale(V.sub(a.ends[0], a.ends[1]), i / 12)), q = V.add(b.ends[1], V.scale(V.sub(b.ends[0], b.ends[1]), k / 12)); m = Math.min(m, V.len(V.sub(p, q))); } return m - a.r - b.r; }
const deg = (v) => `≈${Math.round(v)}°`;
const strip = (p) => { delete p.__err; delete p.__errL; delete p.__cost; return p; };

module.exports = { fail, limits, limitPen, ARMP, gripPt, twoHands, gapOf, ease, inv, easeTimes, deg, strip, segGap, upperArm, raiseKeys, lerp, blendDir, sideLie, wrapA, rotKeys };
