// Power family (batch 4): dumbbell swings, cleans, snatch, jerk, high pull and loaded carries.
// Builds on the lunge family (flat / ball / rolling-foot leg contacts, legs fitted to the IK solution, bisection root
// solves) and the batch 3 back helpers (holdArm, mirrorArm, wristFromHandle, sweep, dumbbell clearance). Adds:
//   - body(F, cfg): a standing / hinged / squatting body on planted feet for a target knee angle; feet may also be
//     rolling up onto the balls (heels raised in the triple extension), solved by bisection on the fitted legs
//   - handArm(p, key, state): one right arm holding a dumbbell: handle centre, sagittal "thumb angle" (palm medial: 0 =
//     thumb forward / fingers down, 90 = thumb up, 180 = thumb back / fingers up) or explicit palm and thumb directions,
//     optional elbow hint; keeps one continuous shoulder branch from key to key (state.guess)
//   - jumps(ex): the largest frame-to-frame change of the arm channels over the loop (a branch flip shows as a jump)
//   - gait(F, cfg): a walking loop (heel strike, flat foot, heel off and roll onto the ball, swing) for loaded carries
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const { makeFamily, kneeOf, trunkLean } = require('./lunge');
const B = require('./b3-back');
const DBH = require('./dumbbell');

const DEG = Math.PI / 180;
const thumbAt = (deg) => [Math.cos(deg * DEG), Math.sin(deg * DEG), 0];

// Knee angle of a pose drawn with its stored channels (contacts at weight 0 draw FK)
const kneeFK = (F, p, s) => kneeOf(L.fk(p, F.contacts), s);
// Root height for a knee angle (feet may roll: legs fitted per probe). spec: lunge-family spec
function rootFor(F, spec, knee, side = 'r') {
  const rolls = Object.values(spec.feet).some((f) => f.c === 'roll');
  if (!rolls) return F.rootY(spec, knee, side);
  let a = spec.root[1] - 25, b = spec.root[1] + 15;
  for (let i = 0; i < 26; i++) { const y = (a + b) / 2, s2 = clone(spec); s2.root[1] = y; if (kneeFK(F, F.pose(s2), side) > knee) a = y; else b = y; }
  const s2 = clone(spec); s2.root[1] = r1((a + b) / 2); return s2;
}
// cfg: { feet, knee, pitch, spine: {l5,t12,t6}, x, z, side, sc: {protract, elevate}, neck: [neckFlex, headFlex] }
// cfg.shX: shift the root along X until the right shoulder sits at this X (balance a hinge over the feet)
function body(F, cfg) {
  const mk = (x) => rootFor(F, { root: [x, 88, cfg.z ?? 0], pitch: cfg.pitch ?? 0, spine: cfg.spine || { l5: 0, t12: 0, t6: 0 }, feet: cfg.feet }, cfg.knee ?? 4, cfg.side || 'r');
  let spec = cfg.rootY != null ? { root: [cfg.x ?? 0, cfg.rootY, cfg.z ?? 0], pitch: cfg.pitch ?? 0, spine: cfg.spine || { l5: 0, t12: 0, t6: 0 }, feet: cfg.feet } : mk(cfg.x ?? 0);
  if (cfg.shX != null && cfg.rootY == null) for (let i = 0; i < 6; i++) { const e = L.fk(F.build(spec), F.contacts).shoulder_r.p[0] - cfg.shX; if (Math.abs(e) < 0.1) break; spec = mk(r1(spec.root[0] - e)); }
  cfg.__x = spec.root[0];
  const p = F.pose(spec);
  if (cfg.sc) { p.ch.sc_r = clone(cfg.sc); p.ch.sc_l = clone(cfg.sc); }
  if (cfg.neck) { p.ch.neck_c7 = { rot: 0, flex: r1(cfg.neck[0]) }; p.ch.head_c1 = { rot: 0, flex: r1(cfg.neck[1]) }; }
  B.wrapPose(p);
  p.__spec = spec;
  return p;
}
// Neck that keeps the eyes level (or slightly down) for a trunk leaning `lean` degrees forward (+)
const levelNeck = (lean, down = 4) => [r1(-(lean - down) * 0.45), r1(-(lean - down) * 0.5)];

// Right arm holding a dumbbell. key: { c: [x,y,z] handle centre (world) or (W) => c, theta (deg) | palm + thumb,
// tilt (palm tilts by this many degrees toward the floor about the thumb axis), elbow: point or (W) => point, elbowW,
// grip, wflex, dirW }
function handArm(p, key, state = {}) {
  const W = L.fk(p);
  const elbow = typeof key.elbow === 'function' ? key.elbow(W) : key.elbow;
  let thumb = key.thumb, palm = key.palm, wristT = null;
  if (key.w) { // wrist target with the hand in line with the forearm (toward the elbow hint), thumb toward key.thumb
    wristT = typeof key.w === 'function' ? key.w(W) : key.w;
    if (key.palm) { palm = key.palm; thumb = key.thumb; } // explicit hand orientation (the wrist bends)
    else { const up = V.norm(V.sub(elbow, wristT)), th = V.norm(V.sub(key.thumb, V.scale(up, V.dot(key.thumb, up)))); thumb = th; palm = V.cross(up, th); }
  }
  if (key.theta != null) { thumb = thumbAt(key.theta); palm = [0, 0, -1]; }
  if (key.tilt) { const q = Q.axis(V.norm(thumb), key.tilt * DEG); palm = Q.rot(q, palm); }
  palm = V.norm(palm); thumb = V.norm(V.sub(thumb, V.scale(palm, V.dot(thumb, palm))));
  const grip = key.grip || 'handle';
  const wrist = wristT || B.wristFromHandle(typeof key.c === 'function' ? key.c(W) : key.c, palm, thumb, grip);
  const DEF = [[20, 20, 0, 10, 90], [60, 40, 0, 30, 90], [0, 80, -40, 90, 90], [90, 80, 0, 90, 90], [0, 80, 40, 120, 0], [30, 60, 60, 100, 60], [90, 50, -80, 140, 90]];
  const guesses = [...(state.guess ? [state.guess] : []), ...(key.guesses || []), ...(key.onlyGuess ? [] : DEF)];
  const q = B.holdArm(p, wrist, { palm, axis: thumb, elbow, elbowW: key.elbowW ?? 0.6, dirW: key.dirW ?? 4, wflex: key.wflex ?? 0, wristW: key.wristW, axialW: key.axialW ?? 0.01, axial: key.axial ?? 0, guesses, minElev: key.minElev });
  const g = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron];
  // keep the branch continuous with the previous key (no 360 jumps in plane / axial / pronation)
  if (state.guess) {
    const near = (v, ref) => v + 360 * Math.round((ref - v) / 360);
    q.ch.shoulder_r.plane = r1(near(q.ch.shoulder_r.plane, state.guess[0])); q.ch.shoulder_r.axial = r1(near(q.ch.shoulder_r.axial, state.guess[2])); q.ch.wrist_r.pron = r1(near(q.ch.wrist_r.pron, state.guess[4]));
  }
  state.guess = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron];
  const Wq = L.fk(q);
  state.err = { wrist: +V.len(V.sub(Wq.wrist_r.p, wrist)).toFixed(2), cost: +q.__cost.toFixed(3) };
  delete q.__cost;
  return q;
}
// Copy the right arm to the left arm (bilateral, symmetric)
const mirror = (p) => B.mirrorArm(p);
// Left arm relaxed at the side (no dumbbell): elbow a little bent, hand beside the thigh
function leftRelaxed(p, { out = 6, fwd = 2, elbow = 12 } = {}) {
  const q = clone(p);
  const tmp = clone(p); ['sc', 'shoulder', 'elbow', 'wrist'].forEach((j) => { tmp.ch[`${j}_r`] = clone(p.ch[`${j}_l`] || {}); });
  const W = L.fk(tmp), S = W.shoulder_r.p, len = L.reach(elbow);
  const tgt = V.add(S, [fwd, -Math.sqrt(len * len - fwd * fwd - out * out), out]);
  const a = L.armToTarget(tmp, tgt, { flex: elbow, wrist: { pron: 70, flex: 0, dev: 0 }, guess: [10, 10, 0] });
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { q.ch[`${j}_l`] = clone(a.ch[`${j}_r`]); });
  return q;
}

// Largest frame-to-frame change of the arm channels (deg) and where; a branch flip shows as a spike
function jumps(ex, n = 2400, joints = ['shoulder_r', 'elbow_r', 'wrist_r', 'shoulder_l', 'elbow_l', 'wrist_l']) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration;
  let prev = null, best = { v: 0 };
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pz = tl.pose(t), o = {};
    for (const j of joints) for (const c in pz.ch[j] || {}) o[`${j}.${c}`] = pz.ch[j][c];
    if (prev) for (const k in o) { const d = Math.abs(o[k] - prev[k]) / (D / n); if (d > best.v) best = { v: Math.round(d), k, t: +t.toFixed(2) }; }
    prev = o;
  }
  return best; // deg / s
}
// Dumbbell (handle centre) speed peak, m/s, and lowest dumbbell point over the loop
function dbPath(ex, held, n = 1200) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration;
  let prev = null, vmax = 0, at = 0;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, W = R.evalPose(rig, tl.pose(t), ex.contacts), c = DBH.dumbbellAt(W, held.side, held.grip, held.size).c;
    if (prev) { const v = V.len(V.sub(c, prev)) / (D / n) / 100; if (v > vmax) { vmax = v; at = t; } }
    prev = c;
  }
  return { vmax: +vmax.toFixed(2), at: +at.toFixed(2) };
}
// Insert an evenly spaced keyframe list: names in order at times
const keysAt = (list) => list.map(([t, pose]) => ({ t: +(+t).toFixed(3), pose }));

module.exports = { makeFamily, kneeOf, trunkLean, thumbAt, rootFor, body, levelNeck, handArm, mirror, leftRelaxed, jumps, dbPath, keysAt, B, DBH };

/* ---------------- Clean (hang clean, power clean, clean and press) ---------------- */
// Straight hanging arm: wrist `fwd` cm in front of and `out` cm outside the shoulder, elbow bent `flex` deg; hand in line
// with the forearm, thumb forward (neutral grip, handle fore-aft beside the thigh)
function hangKey(fwd, out, flex = 5, extra = {}) {
  const len = L.reach(flex), dy = -Math.sqrt(Math.max(1, len * len - fwd * fwd - out * out));
  const w = (W) => V.add(W.shoulder_r.p, [fwd, dy, out]);
  const elbow = (W) => V.add(W.shoulder_r.p, V.scale(V.norm([fwd, dy, out]), L.UA));
  return Object.assign({ w, elbow, thumb: [1, 0, 0.0], elbowW: 0.5 }, extra);
}
// Dumbbells racked on the shoulders (neutral grip): handle centre in front of and above the shoulder joint, thumbs back,
// forearms under the handles, elbows forward and down
const RK = JSON.parse(process.env.RK || '[18, 8, -3]');
const RACK = { c: (W) => V.add(W.shoulder_r.p, [RK[0], RK[1], RK[2]]), theta: 190, elbow: (W) => V.add(W.shoulder_r.p, [20, -18, 4]), elbowW: 1, wflex: -40 };
// Body keys of the clean (feet flat, or rolling onto the balls in the second pull). Returns name -> body config.
function cleanBodies(F, { ballPitch = 26 } = {}) {
  const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
  const roll = (pitch) => ({ r: { c: 'roll', pitch, ballX: F.BALL_X }, l: { c: 'roll', pitch, ballX: F.BALL_X } });
  const sp = (l5, t12, t6) => ({ l5, t12, t6 });
  return {
    stand: { feet: flat, knee: 5, pitch: 0, sc: { protract: 2, elevate: -2 } },
    h50: { feet: flat, knee: 14, pitch: -15, shX: 4, spine: sp(-1, 0, 0.5), sc: { protract: 4, elevate: -2 } },
    hang: { feet: flat, knee: 24, pitch: -30, shX: 6, spine: sp(-2, 0, 1), sc: { protract: 6, elevate: -3 } },
    ext: { feet: roll(ballPitch), knee: 4, pitch: 4, sc: { protract: 0, elevate: 14 } },
    pull: { feet: roll(ballPitch * 0.7), knee: 9, pitch: 2, sc: { protract: 0, elevate: 18 } },
    turn: { feet: flat, knee: 26, pitch: -6, sc: { protract: 2, elevate: 10 } },
    catch: { feet: flat, knee: 45, pitch: -12, spine: sp(-2, 0, 0), sc: { protract: 4, elevate: 6 } },
    absorb: { feet: flat, knee: 50, pitch: -13, spine: sp(-2, 0, 0), sc: { protract: 4, elevate: 6 } },
    rise: { feet: flat, knee: 25, pitch: -6, sc: { protract: 4, elevate: 6 } },
    rack: { feet: flat, knee: 5, pitch: 0, sc: { protract: 4, elevate: 6 } },
    low1: { feet: flat, knee: 10, pitch: -3, sc: { protract: 3, elevate: 0 } },
    low2: { feet: flat, knee: 16, pitch: -12, shX: 4, spine: sp(-1, 0, 0.5), sc: { protract: 4, elevate: -2 } },
  };
}
// Arm keys of the clean, in order (each solved from the previous one's branch)
const CLEAN_ARMS = {
  stand: hangKey(1, 8, 5),
  h50: hangKey(1, 8, 5),
  hang: hangKey(0, 8, 5),
  ext: hangKey(10, 11, 5),
  pull: { w: (W) => V.add(W.shoulder_r.p, [4, -26, 15]), elbow: (W) => V.add(W.shoulder_r.p, [-4, -8, 28]), thumb: [1, 0, 0], elbowW: 1.5 },
  turn: { w: (W) => V.add(W.shoulder_r.p, [24, -12, 12]), elbow: (W) => V.add(W.shoulder_r.p, [2, -16, 22]), thumb: [0, 1, 0], elbowW: 1.5 },
  catch: RACK, absorb: RACK, rise: RACK, rack: RACK,
  low1: { w: (W) => V.add(W.shoulder_r.p, [27, -28, 2]), elbow: (W) => V.add(W.shoulder_r.p, [3, -29.5, 5]), thumb: [0, 1, 0], elbowW: 1.5 },
  low2: hangKey(8, 11, 15),
};
// Solve body + arms for a list of key names; returns { poses, err }
function solveKeys(F, names, bodies, arms, { state = {}, both = true, prefix = '' } = {}) {
  const poses = {}, err = {};
  for (const n of names) {
    const b = typeof bodies[n] === 'object' && bodies[n].__spec ? bodies[n] : body(F, bodies[n]);
    let p = handArm(b, arms[n], state);
    err[n] = state.err;
    if (both) p = mirror(p);
    delete p.__spec;
    poses[prefix + n] = p;
  }
  return { poses, err };
}
Object.assign(module.exports, { hangKey, RACK, cleanBodies, CLEAN_ARMS, solveKeys });

/* ---------------- In-between keys ---------------- */
// Interpolate two body configs (numbers lerped; a foot rolling up or down passes through rolling keys)
function lerpCfg(A, B, f) {
  const lerp = (a, b) => (a ?? 0) + ((b ?? 0) - (a ?? 0)) * f;
  const o = { knee: lerp(A.knee, B.knee), pitch: lerp(A.pitch, B.pitch), x: lerp(A.__x ?? A.x, B.__x ?? B.x), z: lerp(A.z, B.z), side: A.side };
  if (A.shX != null && B.shX != null) o.shX = lerp(A.shX, B.shX);
  if (A.spine || B.spine) { const a = A.spine || { l5: 0, t12: 0, t6: 0 }, b = B.spine || { l5: 0, t12: 0, t6: 0 }; o.spine = { l5: lerp(a.l5, b.l5), t12: lerp(a.t12, b.t12), t6: lerp(a.t6, b.t6) }; }
  if (A.sc || B.sc) { const a = A.sc || { protract: 0, elevate: 0 }, b = B.sc || { protract: 0, elevate: 0 }; o.sc = { protract: r1(lerp(a.protract, b.protract)), elevate: r1(lerp(a.elevate, b.elevate)) }; }
  if (A.neck || B.neck) { const a = A.neck || [0, 0], b = B.neck || [0, 0]; o.neck = [lerp(a[0], b[0]), lerp(a[1], b[1])]; }
  o.feet = {};
  for (const s of ['r', 'l']) {
    const fa = A.feet[s], fb = B.feet[s];
    if (fa.c === 'roll' || fb.c === 'roll') {
      const pa = fa.c === 'roll' ? fa.pitch : 0, pb = fb.c === 'roll' ? fb.pitch : 0;
      o.feet[s] = { c: 'roll', pitch: r1(lerp(pa, pb)), ballX: fa.c === 'roll' ? fa.ballX : fb.ballX, z: fa.z };
    } else o.feet[s] = Object.assign({}, fa, { x: lerp(fa.x, fb.x), lift: lerp(fa.lift, fb.lift) });
  }
  return o;
}
// World-space arm targets of a solved pose, relative to the right shoulder
function armTargets(p) {
  const W = L.fk(p), S = W.shoulder_r.p, q = W.wrist_r.q;
  return { w: V.sub(W.wrist_r.p, S), e: V.sub(W.elbow_r.p, S), palm: Q.rot(q, [1, 0, 0]), thumb: Q.rot(q, [0, 0, 1]) };
}
const slerpV = (a, b, f) => { const d = Math.max(-1, Math.min(1, V.dot(a, b))), th = Math.acos(d); if (th < 1e-4) return a; const s = Math.sin(th); return V.norm(V.add(V.scale(a, Math.sin((1 - f) * th) / s), V.scale(b, Math.sin(f * th) / s))); };
// Keys between two solved keys: body configs lerped, wrist / elbow / hand directions interpolated relative to the shoulder.
// arcs: optional (f) => extra wrist offset (cm) to bow the path (e.g. keep the dumbbells clear of the body)
function between(F, cfgA, cfgB, pA, pB, fracs, state, { both = true, bow = null, elbowW = 1.5 } = {}) {
  const ta = armTargets(pA), tb = armTargets(pB), out = [];
  for (const f of fracs) {
    const b = body(F, lerpCfg(cfgA, cfgB, f)), W = L.fk(b), S = W.shoulder_r.p;
    let w = V.add(S, V.lerp(ta.w, tb.w, f)); if (bow) w = V.add(w, bow(f));
    const e = V.add(S, V.lerp(ta.e, tb.e, f));
    const palm = slerpV(ta.palm, tb.palm, f), thumb = slerpV(ta.thumb, tb.thumb, f);
    const q = B.holdArm(b, w, { palm, axis: thumb, elbow: e, elbowW, axialW: 0.01, guesses: [state.guess] });
    const near = (v, ref) => v + 360 * Math.round((ref - v) / 360);
    q.ch.shoulder_r.plane = r1(near(q.ch.shoulder_r.plane, state.guess[0])); q.ch.shoulder_r.axial = r1(near(q.ch.shoulder_r.axial, state.guess[2])); q.ch.wrist_r.pron = r1(near(q.ch.wrist_r.pron, state.guess[4]));
    state.guess = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron];
    delete q.__cost; delete q.__spec;
    out.push(both ? mirror(q) : q);
  }
  return out;
}
// A whole chain: keys [{ name, t, cfg, arm }] solved in order; `n` in-between keys inserted before a key when it has
// { n } (times spread evenly). Returns { poses, keyframes, err }.
function chain(F, keys, { both = true, state = {}, bow = {} } = {}) {
  const poses = {}, keyframes = [], err = {}, cfgs = {};
  let prev = null;
  for (const k of keys) {
    if (k.same) { keyframes.push({ t: k.t, pose: k.same }); prev = { cfg: cfgs[k.same], pose: poses[k.same], t: k.t }; continue; }
    const st0 = state.guess ? state.guess.slice() : null;
    const cfg = k.ref ? cfgs[k.ref] : k.cfg;
    let p, b;
    if (k.ref) p = poses[k.ref];
    else { b = body(F, cfg); p = handArm(b, k.arm, state); err[k.name] = state.err; delete p.__spec; }
    if (prev && k.n) {
      state.guess = st0;
      const fr = Array.from({ length: k.n }, (_, i) => (i + 1) / (k.n + 1));
      const mids = between(F, prev.cfg, cfg, prev.pose, p, fr, state, { both, bow: bow[k.name] });
      const nm0 = k.ref ? `${k.ref}_in${keyframes.length}` : k.name;
      mids.forEach((m, i) => { const nm = `${nm0}_${i}`; poses[nm] = m; keyframes.push({ t: +(prev.t + (k.t - prev.t) * fr[i]).toFixed(3), pose: nm }); });
      if (!k.ref) { p = handArm(b, k.arm, state); err[k.name] = state.err; delete p.__spec; } // re-solve from the last in-between branch
    }
    if (k.ref) { keyframes.push({ t: k.t, pose: k.ref }); prev = { cfg, pose: p, t: k.t }; continue; }
    if (both) p = mirror(p);
    poses[k.name] = p; cfgs[k.name] = cfg; keyframes.push({ t: k.t, pose: k.name });
    prev = { cfg, pose: p, t: k.t };
  }
  return { poses, keyframes, err, cfgs };
}
Object.assign(module.exports, { lerpCfg, armTargets, between, chain });

/* ---------------- Overhead (press, jerk, snatch lockout) ---------------- */
// Neutral grip, thumbs back, forearm vertical under the handle: handle centre from a wrist target
const NEUTRAL_UP = (wOff, eOff) => ({ c: (W) => V.add(V.add(W.shoulder_r.p, wOff), [0, 7.2, -2.2]), theta: 180, elbow: (W) => V.add(W.shoulder_r.p, eOff), elbowW: 1 });
const PRESS_MID = NEUTRAL_UP([18, 21, 14], [20, -3, 20]);
const OVERHEAD = NEUTRAL_UP([2, 54.8, 0], [1.5, 29.8, 4]);
Object.assign(module.exports, { NEUTRAL_UP, PRESS_MID, OVERHEAD });

/* ---------------- Walking (loaded carries) ---------------- */
// Walking keys from feet together at x = 0: a half step with the right foot, full steps of `step` cm, and a closing step
// so the feet finish together. Per step: the back foot rolls onto its ball (heel off), swings through (weight 0, lifted),
// reaches forward just above the floor and lands flat; the pelvis travels steadily and sways a little over the stance
// foot. Returns [{ name, t, cfg }] (cfg: body configs for body()) and the travel. opt: { step, period, t0, knee, sc, pitch }
function gait(F, { step = 55, period = 0.7, t0 = 0.6, knee = 6, sc = { protract: 2, elevate: 0 }, pitch = 0, sway = 1.2, lift = 7 } = {}) {
  const pos = { r: 0, l: 0 }, keys = [];
  const plan = [['r', step / 2], ['l', step], ['r', step], ['l', step], ['r', step / 2]];
  let t = t0, k = 0;
  const flat = (x, o = {}) => Object.assign({ c: 'flat', x }, o);
  const cfg = (feet, side, x, z, kn = knee) => ({ feet, side, x: r1(x), z: r1(z), knee: kn, pitch, sc: clone(sc) });
  keys.push({ name: 'stand', t: 0, cfg: cfg({ r: flat(0), l: flat(0) }, 'r', 0, 0, 4) });
  for (const [s, d] of plan) {
    const o = s === 'r' ? 'l' : 'r', xa = pos[s], xb = xa + d, xo = pos[o], zs = (o === 'r' ? 1 : -1) * sway;
    const mid = (xa + xb) / 2;
    const ff = (sf) => (s === 'r' ? { r: sf, l: flat(xo) } : { r: flat(xo), l: sf });
    const big = d > step * 0.75;
    // heel off: the back foot rolls up about its ball (only on full steps, when it is behind)
    if (xa < xo - 5) keys.push({ name: `k${k}heel`, t: t + period * 0.12, cfg: cfg(ff({ c: 'roll', pitch: big ? 28 : 16, ballX: xa + F.BALL_X }), o, xo + 2, zs * 0.8) });
    keys.push({ name: `k${k}swing`, t: t + period * 0.36, cfg: cfg(ff(flat(mid, { lift: big ? lift : lift * 0.7, w: 0 })), o, Math.max(xo, mid) + 4, zs) });
    keys.push({ name: `k${k}reach`, t: t + period * 0.58, cfg: cfg(ff(flat(xb, { lift: 1.2, w: 0, pitch: 0 })), o, (xo + xb) / 2 + 2, zs * 0.6) });
    keys.push({ name: `k${k}land`, t: t + period * 0.7, cfg: cfg(ff(flat(xb)), o, (xo + xb) / 2 + 1, zs * 0.3) });
    pos[s] = xb; t += period; k++;
  }
  keys.push({ name: 'end', t: +(t + 0.15).toFixed(3), cfg: cfg({ r: flat(pos.r), l: flat(pos.l) }, 'r', pos.r, 0, 4) });
  keys.forEach((q) => { q.t = +q.t.toFixed(3); });
  return { keys, travel: pos.r };
}
Object.assign(module.exports, { gait });
