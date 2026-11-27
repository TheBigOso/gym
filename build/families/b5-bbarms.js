// Barbell arm family (batch 5): standing barbell curls (reverse curl, strict wall curl) and standing barbell wrist curls
// (bar in front palms up, bar in front palms down, bar behind the thighs). Builds on barbell.js (armsOnBar, sweep,
// barBodyClear), b3-curls.js (standing base, elbow / palm measures), b4-curls2.js (curl keyframe timing, unwrap) and
// b4-forearms.js (wrist channel helpers).
//  - curlPoses: both hands on the bar at a constant grip width; the bar (handle point of the right hand) swings about a
//    pinned elbow in the sagittal plane, the palm turning with the forearm. The start angle is the smallest that keeps the
//    bar shaft clear of the thighs.
//  - wristArm: straight arms holding the bar at depth x (in front of or behind the legs), palms as asked; wristDepth picks
//    the depth that keeps the bar clear of the body over the whole wrist range.
//  - wristLoop: constant arm pose, only the wrist flexion channel keyed.
const L = require('../lib');
const { V, R, r1, clone } = L;
const BB = require('./barbell');
const EQ = require('./equip');
const C = require('./b3-curls');
const K = require('./b4-curls2');
const F = require('./b4-forearms');

const GW = 42;          // grip width (cm between the handle points): about shoulder width
const PLATE_D = 32;     // light plates on a curl / wrist-curl bar
const SKIP = /^(hand|thumb|forearm)_/; // the hands wrap the bar; the forearms meet the bar only at the grip
const ARM_GUESS = [[0, 10, 0, 20, 0], [-58, 14, 113, 4, 137], [-50, 15, 90, 4, 150], [20, 15, 10, 40, 10], [-20, 10, -10, 20, 170], [10, 20, 20, 60, 160], [0, 5, 0, 5, 90]];

// Distance from the elbow joint to the right handle point with the arm straight (elbow 0, wrist neutral)
function forearmReach(base, pron = 0) { const q = clone(base); C.setArm(q, 'r', { plane: 0, elev: 0.01, axial: 0, flex: 0, pron }); const W = L.fk(q); return V.len(V.sub(EQ.gripPoint(W, 'r', BB.GRIP).p, W.elbow_r.p)); }
const barClear = (W, plateD = PLATE_D) => BB.barBodyClear(W, { plates: 1, plateD, skip: SKIP });

// Curl poses. E: elbow (world, right side); a: grip angle about the elbow from straight down toward +X (deg);
// under: palms forward/up (true) or palms back/down (false). opt.a0: start angle or null to fit to the thighs (clear cm).
function curlPoses(base, contacts, { E, a1, FS, under = true, drift = [0, 0, 0], clear = 0.8, a0 = null, elbowW = 2 }) {
  const dz = GW / 2 - E[2], rr = Math.sqrt(forearmReach(base, under ? 0 : 175) ** 2 - dz * dz);
  const palmAt = (a) => { const v = [Math.cos(a * R.DEG), Math.sin(a * R.DEG), 0]; return under ? v : V.scale(v, -1); };
  const thumb = under ? [0, 0, 1] : [0, 0, -1];
  let guesses = ARM_GUESS, gErr = 0;
  const solve = (a, f) => {
    const Ef = V.add(E, V.scale(drift, f)), g = [Ef[0] + rr * Math.sin(a * R.DEG), Ef[1] - rr * Math.cos(a * R.DEG), GW / 2];
    const q = BB.armsOnBar(base, g, { palm: palmAt(a), thumb, elbow: Ef, elbowW, guesses });
    const W = L.fk(q, contacts); gErr = Math.max(gErr, BB.gripErr(W, EQ.barGrips([g[0], g[1], 0], BB.AX, GW)));
    delete q.__cost; return q;
  };
  if (a0 == null) { // smallest start angle with the bar shaft `clear` cm off the thighs
    let lo = 0, hi = 60;
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2, q = solve(m, 0); if (barClear(L.fk(q, contacts)).d >= clear) hi = m; else lo = m; }
    a0 = r1(hi + 0.05);
  }
  const poses = [];
  for (const f of FS) {
    const q = solve(a0 + (a1 - a0) * f, f);
    guesses = [[q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev]];
    if (poses.length) K.unwrapTo(q, poses[poses.length - 1]);
    poses.push(q);
  }
  // re-solve the bottom seeded from the second key so the humeral rotation stays put through the rep
  if (FS.length > 1) { guesses = [[poses[1].ch.shoulder_r.plane, poses[1].ch.shoulder_r.elev, poses[1].ch.shoulder_r.axial, poses[1].ch.elbow_r.flex * 0.5, poses[1].ch.wrist_r.pron]]; poses[0] = K.unwrapTo(solve(a0, 0), poses[1]); }
  return { poses, a0, rr, gripErr: gErr };
}

// Straight arms (elbow `flex`) with the right handle point at depth x and z = GW / 2, palm normal `palm`, thumb `thumb`;
// the wrist is straight (flex 0, dev 0) in the returned pose.
function wristArm(base, contacts, { x, palm, thumb, flex = 4, guesses = ARM_GUESS }) {
  const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.wrist_r.pron'];
  const objs = [
    (W) => { const g = EQ.gripPoint(W, 'r', BB.GRIP); return [(g.p[0] - x) * 4, (g.p[2] - GW / 2) * 4, (1 - Math.abs(g.ax[2])) * 30]; },
    (W) => V.sub(L.Q.rot(W.wrist_r.q, [1, 0, 0]), V.norm(palm)).map((v) => v * 3),
    (W) => V.sub(L.Q.rot(W.wrist_r.q, [0, 0, 1]), V.norm(thumb)).map((v) => v * 1.5),
    (W, q) => [Math.min(0, q.ch.shoulder_r.elev - 2) * 5, Math.min(0, q.ch.shoulder_r.plane + 58) * 5, Math.max(0, q.ch.shoulder_r.plane - 138) * 5, q.ch.shoulder_r.axial * 0.003],
  ];
  let best = null;
  for (const s of guesses) {
    const q0 = clone(base); C.setArm(q0, 'r', { plane: s[0], elev: s[1], axial: s[2], flex, pron: s[4] });
    const r = L.solvePose(q0, ARM, objs, { iters: 500, contacts });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const q = best.pose;
  for (const [j, c] of [['shoulder_r', 'axial'], ['wrist_r', 'pron'], ['shoulder_r', 'plane']]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  require('./b3-back').mirrorArm(q);
  q.__cost = best.cost;
  return q;
}
// Smallest |x| (searching from x0 outward to x1) for which the bar stays `clear` cm off the body at every wrist angle
function wristDepth(base, contacts, { x0, x1, palm, thumb, flexes, clear = 0.8 }) {
  const minClear = (x) => { const q = wristArm(base, contacts, { x, palm, thumb }); let m = 1e9; for (const fl of flexes) m = Math.min(m, barClear(L.fk(F.withWrist(q, fl), contacts)).d); return m; };
  let a = x0, b = x1;
  if (minClear(b) < clear) throw new Error(`wristDepth: no clear depth up to ${x1}`);
  for (let i = 0; i < 16; i++) { const m = (a + b) / 2; if (minClear(m) >= clear) b = m; else a = m; }
  return Math.sign(b) * Math.ceil(Math.abs(b) * 10) / 10; // rounded away from the body
}
// Wrist loop keyframes: [[t, flex], ...] -> poses named by flex, keyframes
function wristLoop(arm, keys) {
  const poses = {}, keyframes = [];
  for (const [t, fl] of keys) { const k = `w${fl < 0 ? 'm' : 'p'}${Math.abs(fl)}`; if (!poses[k]) poses[k] = F.withWrist(arm, fl); keyframes.push({ t, pose: k }); }
  return { poses, keyframes };
}
// Common checks: grip width, bar clear of the body and floor, planted feet. Returns a list of failures.
function failures(sw, extra = []) {
  const f = [];
  if (sw.widthRange > 1.0) f.push(`grip width varies ${sw.widthRange} cm`);
  if (sw.barBody < 0) f.push(`bar into the body (${JSON.stringify(sw.barBodyAt)})`);
  if (sw.barFloor < 0) f.push('plates through the floor');
  if (sw.floor < -0.5) f.push('body through the floor');
  if (sw.slide > 0.05) f.push('planted feet slide');
  for (const [ok, msg] of extra) if (!ok) f.push(msg);
  return f;
}
function report(name, file, sw, info, fails) {
  console.log(`${name}: wrote ${file}\n  ${JSON.stringify(info)}\n  sweep ${JSON.stringify(sw)}`);
  if (fails.length) { console.error(`FAIL ${name}: ${fails.join('; ')}`); process.exitCode = 1; }
}
// Arm vs a wall face at x = wx (wall behind the body, -X): smallest gap of the upper-arm / forearm capsules (cm)
function armWallGap(W, wx) {
  let best = 1e9;
  for (const s of ['r', 'l']) for (const [a, b, r0, r1_] of [[`shoulder_${s}`, `elbow_${s}`, 4.8, 4.0], [`elbow_${s}`, `wrist_${s}`, 3.9, 2.5]])
    for (let k = 0; k <= 8; k++) { const t = k / 8, p = V.add(W[a].p, V.scale(V.sub(W[b].p, W[a].p), t)); best = Math.min(best, p[0] - (r0 + (r1_ - r0) * t) - wx); }
  return best;
}

/* ---------------- authors ---------------- */
const H = require('./hips');
const ph = (meta, id) => meta.timeline.phases.find((p) => p.id === id);
// Standing barbell curl. opt: { base, contacts, E (elbow, world), a1, under, drift, props (extra), name, tempo, extraRows(ex, W..), fails(sw, ...) }
function buildCurl(meta, { base, contacts, E, a1, under, drift, props = [], name, tempo, rows, checks = () => [] }) {
  const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1];
  const c = curlPoses(base, contacts, { E, a1, FS, under, drift });
  const poses = {}, names = [];
  c.poses.forEach((p, i) => { poses[`c${i}`] = p; names.push(`c${i}`); });
  const top = names[names.length - 1];
  poses.squeeze = clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`wrist_${s}`].flex = r1(poses.squeeze.ch[`wrist_${s}`].flex + (under ? 3 : 0));
  const keyframes = K.keys(names, FS, { t0: ph(meta, 'lift').start, t1: ph(meta, 'lift').end, t2: ph(meta, 'top').end, t3: ph(meta, 'lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [...props, BB.barbellProp({ plateD: PLATE_D })];
  const sw = BB.sweep(ex, { skip: SKIP });
  const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts), bb = EQ.barAt(Wb, BB.GRIP);
  C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', tempo);
  if (rows) rows(H.setKin(ex), { Wb, Wt, sw, c, poses });
  const info = { a0: c.a0, gripErr: +c.gripErr.toFixed(2), elbow: [r1(C.elbowFlex(Wb, 'r')), r1(C.elbowFlex(Wt, 'r'))], bar0: bb.c.map(r1), barTop: EQ.barAt(Wt, BB.GRIP).c.map(r1), elbowPos: [Wb.elbow_r.p.map(r1), Wt.elbow_r.p.map(r1)] };
  report(name, L.write(ex), sw, info, failures(sw, [[c.gripErr < 0.5, `hands off the bar (${c.gripErr.toFixed(2)} cm)`], ...checks(sw, { Wb, Wt, poses })]));
  return { ex, sw, c, poses };
}
// Standing barbell wrist curl. opt: { base, contacts, palm, thumb, keys [[t, flex]], x0, x1 (depth search), name, rows }
function buildWrist(meta, { base, contacts, palm, thumb, keys, x0, x1, name, rows }) {
  const flexes = [...new Set(keys.map((k) => k[1]))];
  const lo = Math.min(...flexes), hi = Math.max(...flexes), sweepFl = [];
  for (let i = 0; i <= 8; i++) sweepFl.push(lo + ((hi - lo) * i) / 8);
  const x = wristDepth(base, contacts, { x0, x1, palm, thumb, flexes: sweepFl });
  const arm = wristArm(base, contacts, { x, palm, thumb }), cost = arm.__cost; delete arm.__cost;
  const { poses, keyframes } = wristLoop(arm, keys);
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [BB.barbellProp({ plateD: PLATE_D })];
  const sw = BB.sweep(ex, { skip: SKIP, fixed: ['elbow_r', 'elbow_l', 'wrist_r', 'wrist_l'] });
  const W0 = L.fk(arm, contacts);
  const set = H.setKin(ex);
  set('Bar clearance', 'setup', `Bar ${r1(Math.abs(x))} cm ${x > 0 ? 'in front of' : 'behind'} the hip line (handle points); grip ${GW} cm between the handle points`);
  set('Bar clearance', 'peak', `At least ${sw.barBody} cm off the body over the loop (rig shapes, nearest ${sw.barBodyAt[0]})`);
  const armAng = Math.atan2(W0.wrist_r.p[0] - W0.shoulder_r.p[0], W0.shoulder_r.p[1] - W0.wrist_r.p[1]) / R.DEG;
  set('Arm position', 'setup', `Elbows ≈${Math.round(C.elbowFlex(W0, 'r'))}° (straight); arms ≈${Math.round(Math.abs(armAng))}° ${armAng >= 0 ? 'in front of' : 'behind'} vertical`);
  set('Arm position', 'peak', `Unchanged (elbows and wrists move ${sw.drift} cm over the loop)`);
  set('Tempo', 'setup', 'Bottom 0.5 s'); set('Tempo', 'peak', '1 s up, 0.4 s squeeze, 1.7 s down, 0.4 s at the bottom');
  if (rows) rows(set, { lo, hi });
  const info = { x, cost: +cost.toFixed(3), arm: { sh: arm.ch.shoulder_r, el: arm.ch.elbow_r, wr: arm.ch.wrist_r, sc: arm.ch.sc_r }, wrist: [lo, hi], armAng: r1(armAng) };
  report(name, L.write(ex), sw, info, failures(sw, [[cost < 1, `arm solve cost ${cost.toFixed(2)}`], [sw.drift < 0.05, 'arms move']]));
  return { ex, sw, arm, x };
}

module.exports = { buildCurl, buildWrist, GW, PLATE_D, SKIP, forearmReach, barClear, curlPoses, wristArm, wristDepth, wristLoop, failures, report, armWallGap };
