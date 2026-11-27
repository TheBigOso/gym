// Batch 5 barbell squat and lunge family (b5-bbsquat): where the bar sits and how the arms hold it, on top of the
// barbell family (barbell.js armsOnBar / sweep) and the squat (squat.js) and lunge (lunge.js) families.
//  - backBar: bar fixed on the upper back in the spine_t6 frame (high bar on the upper traps, low bar across the rear
//    delts), so it rides with the trunk; the arm solve is the same in every pose, so the grip width cannot drift.
//  - overheadBar: wide snatch grip, elbows locked, bar over a world depth (mid-foot), shoulder blades shrugged up.
//  - behindBar: straight arms hanging to a bar behind the legs (barbell hack squat), kept just clear of the legs/buttocks.
//  - gate: the standard pass / fail lines for a barbell loop.
const L = require('../lib');
const { V, Q, rig, r1, clone } = L;
const BB = require('./barbell');
const EQ = require('./equip');

const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';

/* ---------------- bar on the back ---------------- */
// cfg: { barT6, elbowT6, gw, sc, guesses }
function backBar(cfg) {
  const st = { worst: 0 };
  const barOn = (W) => V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, cfg.barT6));
  const guesses = cfg.guesses || [[-20, 20, -120, 135, 0], [-30, 40, -100, 130, 60], [0, 50, -110, 120, 0], [-40, 50, -60, 130, 0]];
  let cache = null;
  const armsFn = (p) => {
    p.ch.sc_r = clone(cfg.sc); p.ch.sc_l = clone(cfg.sc);
    const W = L.fk(p), c = barOn(W), grips = EQ.barGrips(c, BB.AX, cfg.gw), fwd = Q.rot(W.spine_t6.q, [1, 0, 0]);
    const E = V.add(W.shoulder_r.p, V.scale(V.norm(Q.rot(W.spine_t6.q, cfg.elbowT6)), L.UA));
    // the arm channels are relative to the upper trunk, so one solve serves every pose: reuse it when it still fits
    if (cache) { const q = clone(p); for (const j of ['shoulder_r', 'elbow_r', 'wrist_r', 'shoulder_l', 'elbow_l', 'wrist_l']) q.ch[j] = clone(cache[j]); const e = BB.gripErr(L.fk(q), grips); if (e < 0.05) { st.worst = Math.max(st.worst, e); return q; } }
    const q = BB.armsOnBar(p, grips.r, { palm: fwd, thumb: [0, 0, -1], elbow: E, elbowW: cfg.elbowW ?? 0.3, dirW: 1.5, guesses });
    st.worst = Math.max(st.worst, BB.gripErr(L.fk(q), grips)); delete q.__cost;
    cache = {}; for (const j of ['shoulder_r', 'elbow_r', 'wrist_r', 'shoulder_l', 'elbow_l', 'wrist_l']) cache[j] = clone(q.ch[j]);
    return q;
  };
  return { armsFn, barOn, st };
}
const HIGH_BAR = { barT6: [-5.2, 14.4, 0], elbowT6: [-8, -20, 10], gw: 80, sc: { protract: -8, elevate: 4 } };

/* ---------------- bar overhead ---------------- */
// cfg: { gw, x(W) -> bar depth (world), sc, flex (elbow, deg) }. The bar height is the straight-arm reach from the shoulder.
function overheadBar(cfg) {
  const st = { worst: 0, elbow: [999, 0] };
  const flex = cfg.flex ?? 4;
  const armsFn = (p, f) => {
    p.ch.sc_r = clone(cfg.sc); p.ch.sc_l = clone(cfg.sc);
    const W = L.fk(p), S = W.shoulder_r.p, Rg = BB.reachG(p, flex), z = cfg.gw / 2, x = cfg.x(W, f);
    const dy = Math.sqrt(Math.max(1, Rg * Rg - (x - S[0]) ** 2 - (z - S[2]) ** 2));
    const c = [x, S[1] + dy, 0], grips = EQ.barGrips(c, BB.AX, cfg.gw);
    const q = BB.armsOnBar(p, grips.r, { palm: [0, 1, 0], thumb: [0, 0, -1], dirW: 1.2, guesses: cfg.guesses || [[30, 160, 0, 5, 0], [10, 150, -40, 5, 60], [50, 170, 30, 5, -40], [0, 140, 0, 5, 90]],
      extra: [(Wx, qq) => [(qq.ch.elbow_r.flex - flex) * 0.3]] });
    st.worst = Math.max(st.worst, BB.gripErr(L.fk(q), grips)); st.elbow = [Math.min(st.elbow[0], q.ch.elbow_r.flex), Math.max(st.elbow[1], q.ch.elbow_r.flex)]; delete q.__cost;
    return q;
  };
  return { armsFn, st };
}

/* ---------------- bar hanging behind the legs ---------------- */
const BACKS = rig.shapes.filter((s) => /^(thigh|quad|shank|calf|foot|buttock)_|^pelvis$/.test(s.id));
function behindClear(W, x, y, zr) { let best = 1e9; for (let k = -10; k <= 10; k++) { const p = [x, y, (k / 10) * zr]; for (const s of BACKS) best = Math.min(best, EQ.pointShape(W, p, s.id) - EQ.BAR.shaftR); } return best; }
// cfg: { gw, clear (cm off the legs), palm }. The bar rides down the back of the legs: its centre sits on a line behind
// the right thigh axis (hip -> knee, continued down the shank past the knee), offset along the sagittal normal (behind /
// under the leg) by the least distance that clears the thighs, calves and buttocks; how far down the leg follows from the
// straight-arm reach. Both are continuous in the pose, so the bar slides smoothly down the legs. Call on poses whose leg
// channels are already fitted (L.fk without contacts), e.g. after squat.js author().
function behindBar(cfg) {
  const st = { worst: 0 };
  const CLEAR = cfg.clear ?? 1;
  let last = null; // the previous solve seeds the next (call in depth order) so the arm stays on one branch
  const armsFn = (p) => {
    p.ch.sc_r = clone(cfg.sc || { protract: -4, elevate: -2 }); p.ch.sc_l = clone(p.ch.sc_r);
    const W0 = L.fk(p), S = W0.shoulder_r.p, Rg = BB.reachG(p, cfg.flex ?? 3) - 0.3, z = cfg.gw / 2;
    const H2 = [W0.hip_r.p[0], W0.hip_r.p[1]], K2 = [W0.knee_r.p[0], W0.knee_r.p[1]], A2 = [W0.ankle_r.p[0], W0.ankle_r.p[1]];
    const at = (t) => { const [p0, p1, u] = t <= 1 ? [H2, K2, t] : [K2, A2, t - 1]; const d = V.norm([p1[0] - p0[0], p1[1] - p0[1], 0]); return { b: [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u], n: [d[1], -d[0]] }; };
    const place = (t) => { const { b, n } = at(t); let lo = 0, hi = 40; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (behindClear(W0, b[0] + n[0] * m, b[1] + n[1] * m, z - 4) > CLEAR) hi = m; else lo = m; } return [b[0] + n[0] * hi, b[1] + n[1] * hi, 0]; };
    let ta = 0, tb = 1.8;
    for (let i = 0; i < 34; i++) { const t = (ta + tb) / 2, c = place(t); if (V.len(V.sub([c[0], c[1], z], S)) < Rg) ta = t; else tb = t; }
    const c = place((ta + tb) / 2), grips = EQ.barGrips(c, BB.AX, cfg.gw);
    const q = BB.armsOnBar(p, grips.r, { palm: cfg.palm || [-1, 0, 0], thumb: [0, 0, -1], dirW: 1.2, guesses: last ? [last] : (cfg.guesses || [[-80, 15, 0, 5, 30], [-60, 25, 30, 5, 0], [80, 15, -30, 5, 60], [-90, 20, 0, 5, -30]]), extra: [(Wx, qq) => [(qq.ch.elbow_r.flex - (cfg.flex ?? 3)) * 0.3]] });
    if (last) { const nr = (v, ref) => v + 360 * Math.round((ref - v) / 360); for (const s2 of ['r', 'l']) { q.ch[`shoulder_${s2}`].axial = r1(nr(q.ch[`shoulder_${s2}`].axial, last[2])); q.ch[`wrist_${s2}`].pron = r1(nr(q.ch[`wrist_${s2}`].pron, last[4])); } }
    last = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];
    st.worst = Math.max(st.worst, BB.gripErr(L.fk(q), grips)); st.t = (ta + tb) / 2; delete q.__cost;
    return q;
  };
  return { armsFn, st, behindClear };
}

/* ---------------- checks ---------------- */
function gate(name, sw, { gripWorst = 0, rest = null, widthMax = 1.0 } = {}) {
  const fail = (m) => { console.error(`FAIL ${name}: ${m}`); process.exitCode = 1; };
  if (sw.widthRange > widthMax || gripWorst > 0.5) fail(`hands do not stay on the bar at a constant grip width (${sw.widthRange} / ${gripWorst.toFixed(2)})`);
  if (sw.barFloor < 0 || sw.barBody < 0) fail(`bar or plates through the floor or the body (${sw.barFloor} / ${sw.barBody} ${JSON.stringify(sw.barBodyAt)})`);
  if (rest != null && rest < -1.5) fail(`bar sinks into the back (${rest})`);
  if (sw.slide > 0.05 || sw.drift > 0.05) fail(`planted feet move (${sw.slide} / ${sw.drift})`);
  if (sw.floor < -0.5) fail(`body through the floor (${sw.floor} ${JSON.stringify(sw.floorAt)})`);
}
// Whole-loop joint-limit scan over the stored channels (the limits verify enforces)
function limits(ex) {
  const R = L.R, tl = R.buildTimeline(ex), D = ex.timeline.duration, bad = {};
  const lim = {}; for (const j of rig.joints || []) { if (j.limits) lim[j.id] = j.limits; }
  for (let i = 0; i <= 400; i++) {
    const pz = tl.pose((i / 400) * D);
    for (const [j, ch] of Object.entries(pz.ch)) { const lj = lim[j] || lim[j.replace(/_[rl]$/, '')]; if (!lj) continue; for (const [c, v] of Object.entries(ch)) { const l = lj[c]; if (!l) continue; if (v < l[0] - 0.5 || v > l[1] + 0.5) bad[`${j}.${c}`] = r1(v); } }
  }
  return bad;
}
module.exports = { NOTE, backBar, HIGH_BAR, overheadBar, behindBar, behindClear, gate, limits };
