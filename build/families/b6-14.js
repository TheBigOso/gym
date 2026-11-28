// Family b6-14 (batch 6): bridge variants, push-up variants (toes, knees, raised hands, inverted), a side bridge on bent
// knees and a standing palm press. Shared helpers:
//  - peakMeasure / fitMeasure: compute a module's check measure over the loop exactly as test/verify.mjs does, and set
//    checks.measure to a tight band around it.
//  - pushAuthor: one push-up module from a b4-floorpush makePushG solver (rep, sweep, kinematics fill, self-checks).
//  - makeKneePush: the same solver idea pivoting on the knees (shins flat on the mat, insteps down): the trunk and thighs
//    form one line about the planted knee, the hands are planted, and each key is solved for root x / y / pitch.
//  - bridge: the glute bridge solve (author-glute-bridge.js) as a reusable builder with the feet at any x, optional
//    one-leg lift (FK leg) and per-foot targets (walk-outs).
const L = require('../lib');
const { R, V, Q, rig, r1, clone, fk, solvePose } = L;
const B = require('./b4-floorpush');
const H = require('./hips');
const P = require('./prone');

const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
const dist = (a, b) => V.len(V.sub(a, b));
const ease = (f) => f * f * (3 - 2 * f);

/* ---------------- check measure, as verify computes it ---------------- */
function measureOf(name, W, pose, W0) {
  if (name === 'shoulderLineIncl') return R.measures(W).shoulderLineIncl;
  if (name === 'kneeFlexion') return Math.max(R.measures(W).knee, 180 - V.angle(V.sub(W.hip_l.p, W.knee_l.p), V.sub(W.ankle_l.p, W.knee_l.p)));
  if (name === 'hipFlexion') return Math.max(pose.ch.hip_r?.flex ?? 0, pose.ch.hip_l?.flex ?? 0);
  if (name === 'trunkFlexion') return V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
  if (name === 'rootTravel') return V.len(V.sub(W.pelvis.p, W0.pelvis.p));
  throw new Error(name);
}
function peakMeasure(ex, name, n = 800) {
  const tl = R.buildTimeline(ex), W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  let pk = -1e9;
  for (let i = 0; i <= n; i++) { const t = (i / n) * tl.duration, pose = tl.pose(t), W = R.evalPose(rig, pose, ex.contacts); pk = Math.max(pk, measureOf(name, W, pose, W0)); }
  return pk;
}
function fitMeasure(ex, name, pad = 3) {
  const pk = peakMeasure(ex, name);
  ex.checks.measure = { name, min: Math.floor(pk - pad), max: Math.ceil(pk + pad) };
  return pk;
}
// Joint-limit scan of stored channels (as verify does) and wrap of leg angles into (-180, 180]
function limitViol(ex) {
  const out = [];
  for (const [name, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) out.push(`${name}.${j}.${c}=${p.ch[j][c]}`); }
  return out;
}
function wrapPoses(poses) {
  for (const p of Object.values(poses)) for (const j in p.ch) for (const c in p.ch[j]) if (typeof p.ch[j][c] === 'number' && !/^sc_|^spine|^neck|^head/.test(j)) p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
}
// Contact-driven leg check (knee and ankle from the solved frame), as verify does
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset);
function legLimitScan(ex, n = 400) {
  const tl = R.buildTimeline(ex), bad = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * tl.duration, pose = tl.pose(t), W = R.evalPose(rig, pose, ex.contacts);
    for (const c of ex.contacts || []) {
      if (!c.chain[0].startsWith('hip_')) continue;
      const k = pose.ik && pose.ik[c.id]; if (!k || (k.weight ?? 1) < 0.5) continue;
      const [h, kn, an, to] = c.chain, kf = 180 - V.angle(V.sub(W[h].p, W[kn].p), V.sub(W[an].p, W[kn].p));
      const d = ANKLE_REST - V.angle(V.sub(W[kn].p, W[an].p), V.sub(W[to].p, W[an].p));
      if (kf > 150.5 || d < -76 || d > 36) bad.push(`${c.id} knee ${kf.toFixed(0)} ankle ${d.toFixed(0)} @${t.toFixed(2)}`);
    }
  }
  return bad;
}
function finishChecks(ex, label, sw, { slide = 0.05, floor = -0.5 } = {}) {
  const lv = limitViol(ex), legs = legLimitScan(ex);
  if (lv.length) { console.error(`FAIL ${label}: joint limits ${lv.slice(0, 6).join(', ')}`); process.exitCode = 1; }
  if (legs.length) { console.error(`FAIL ${label}: leg limits ${legs.slice(0, 3).join('; ')}`); process.exitCode = 1; }
  if (sw && sw.slide != null && sw.slide > slide) { console.error(`FAIL ${label}: planted contact slides ${sw.slide}`); process.exitCode = 1; }
  if (sw && sw.floor != null && sw.floor < floor) { console.error(`FAIL ${label}: below the floor ${sw.floor}`); process.exitCode = 1; }
  if (/§/.test(JSON.stringify(ex))) { console.error(`FAIL ${label}: section symbol`); process.exitCode = 1; }
}
const T5 = (meta) => { const ph = meta.timeline.phases; return { hold: ph[0].end, down: ph[1].end - ph[0].end, pause: ph[2].end - ph[1].end, up: ph[3].end - ph[2].end, D: meta.timeline.duration }; };

/* ---------------- push-ups on the toes (b4-floorpush solver) ---------------- */
// opt: { handX, topElbow, botChest, props, sweepProps, kin(set, top, bot, F) }
function pushAuthor(meta, F, opt) {
  const T = opt.T || T5(meta);
  const { poses, keyframes } = F.rep(opt.handX, { topElbow: opt.topElbow ?? 8, botChest: opt.botChest, T, neck: opt.neck || 0 });
  const ex = H.module_(meta, F.contacts, poses, keyframes);
  if (opt.props) ex.props = meta.props.concat(opt.props);
  const sw = F.sweep(ex, opt.sweepProps || []), top = F.stats(poses.top), bot = F.stats(poses.bottom);
  const set = H.setKin(ex);
  if (opt.kin) opt.kin(set, top, bot, F, poses);
  ex.exercise.reference.note = NOTE;
  const pk = fitMeasure(ex, 'trunkFlexion');
  const f1 = (s) => `elbow ${s.elbow.toFixed(0)} flare ${s.flare.toFixed(0)} wristExt ${s.wristExt.toFixed(0)} chest ${s.chestY.toFixed(1)} sh ${s.sh.toFixed(1)} shAhead ${s.shAhead.toFixed(1)} body ${s.bodyAng.toFixed(1)} bend ${s.bend.toFixed(1)} knee ${s.knee.toFixed(0)} dorsi ${s.dorsi.toFixed(0)}`;
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  top: ${f1(top)}\n  bottom: ${f1(bot)}\n  sweep ${JSON.stringify(sw)} trunkFlexion peak ${pk.toFixed(1)}`);
  finishChecks(ex, meta.exercise.name, { slide: Math.max(sw.arm, sw.leg), floor: sw.floor });
  if (opt.sweepProps && sw.prop < -0.5) { console.error(`FAIL: body passes into a prop (${JSON.stringify(sw.propAt)})`); process.exitCode = 1; }
  return { ex, sw, top, bot, poses };
}
// Standard kinematics fill for push-ups (rows that exist in the meta are filled)
function pushKin(set, top, bot, { handNote, botNote, T }) {
  const d = (v) => `≈${Math.round(v)}°`;
  const trySet = (p, f, v) => { try { set(p, f, v); } catch (e) { /* row not in this meta */ } };
  trySet('Hand width', 'setup', handNote(top)); trySet('Hand width', 'peak', 'Unchanged (hands planted)');
  trySet('Elbow flexion', 'setup', `${d(top.elbow)} (arms straight, not locked)`); trySet('Elbow flexion', 'peak', `${d(bot.elbow)} at the bottom${botNote ? ` (${botNote})` : ''}`);
  trySet('Elbow tuck', 'setup', `${d(top.flare)} (arms near vertical)`); trySet('Elbow tuck', 'peak', `${d(bot.flare)} at the bottom`);
  trySet('Body line', 'setup', `Trunk ${d(top.bodyAng)} above horizontal; trunk-to-leg bend ${top.bend.toFixed(1)}°`); trySet('Body line', 'peak', `Trunk ${d(bot.bodyAng)}; bend ${bot.bend.toFixed(1)}°`);
  trySet('Wrist extension', 'setup', d(top.wristExt)); trySet('Wrist extension', 'peak', `${d(bot.wristExt)} at the bottom`);
  if (T) { trySet('Tempo', 'setup', `Top ${T.hold} s`); trySet('Tempo', 'peak', `${T.down.toFixed(1)} s down, ${T.pause.toFixed(1)} s pause, ${T.up.toFixed(1)} s up, ${(T.D - T.hold - T.down - T.pause - T.up).toFixed(1)} s at the top`); }
}
// Right palm turned about the vertical by yaw degrees (+ turns the fingers toward -z, i.e. inward for the right hand)
const handYaw = (s, yaw) => { const q = Q.mul(Q.axis([0, 1, 0], yaw), L.handRotR); return (s === 'r' ? q : Q.mirrorZ(q)).map((v) => +v.toFixed(6)); };


/* ---------------- push-ups on the knees ---------------- */
// Knees on the mat (knee joint at the shank radius), shins flat, insteps down (the all-fours leg set-up from prone.js):
// legs planted with leg contacts at constant ankle targets and world-fixed feet; the knee is the pivot. Each key solves
// root x / y / pitch so the knee stays on its mat point, the thighs stay in line with the trunk (knee-hip-shoulder line,
// bendDeg extra hip flexion allowed) and either the arm length armD or the chest height chestY is met.
const trunkDir = (W) => V.norm(V.sub(W.neck_c7.p, W.pelvis.p));
const sag = (a, b) => Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / R.DEG;
function makeKneePush({ handY = 0, handZ = 24, kneeZ = 10, kneeLift = 0.5, flarePole = [-1, 0.25, 0.5], bendDeg = 0, handRot = null } = {}) {
  const A = P.allFours({});
  const Wf = A.Wf, AT = { r: A.AT.r.slice(), l: A.AT.l.slice() }, K = { r: Wf.knee_r.p.slice(), l: Wf.knee_l.p.slice() };
  // move the knees / ankles to |z| = kneeZ (shins stay parallel)
  for (const s of ['r', 'l']) { const dz = (s === 'r' ? kneeZ : -kneeZ) - K[s][2]; K[s][2] += dz; AT[s][2] += dz; K[s][1] += kneeLift; AT[s][1] += kneeLift; // kneeLift: the knee and instep sink into the 0.6 cm mat less than the thigh front
    AT[s] = AT[s].map((v) => +v.toFixed(3)); K[s] = K[s].map((v) => +v.toFixed(3)); }
  const legC = A.contacts.filter((c) => c.id.startsWith('leg_'));
  const contacts = [Object.assign(L.handContact('r'), { pole: flarePole.slice() }), Object.assign(L.handContact('l'), { pole: [flarePole[0], flarePole[1], -flarePole[2]] }), ...legC];
  if (handRot) { contacts[0].handRot = handRot.r; contacts[1].handRot = handRot.l; }
  const base = clone(A.fours);
  base.ch.hip_r = { flex: 10, abd: 0, rot: 0 }; base.ch.hip_l = { flex: 10, abd: 0, rot: 0 };
  base.root.rot.pitch = -20; base.root.pos = [K.r[0] + 30, 40, 0];
  // straight reference: knee-to-hip vs trunk direction in a neutral standing pose
  const Ws0 = clone(L.POSES.standing().pose); delete Ws0.ik; Ws0.ch.knee_r = { flex: 0 }; Ws0.ch.knee_l = { flex: 0 }; Ws0.ch.hip_r = { flex: 0, abd: 0, rot: 0 }; Ws0.ch.hip_l = { flex: 0, abd: 0, rot: 0 }; const Ws = fk(Ws0);
  const BEND0 = sag(V.sub(Ws.hip_l.p, Ws.knee_l.p), trunkDir(Ws));
  function headSc(p, u, neck = 0) {
    p.ch.sc_r = { protract: r1(8 - 7 * u), elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);
    const f = 3 - 7 * u + neck; p.ch.neck_c7 = { rot: 0, flex: r1(f * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(f * 0.55) };
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j) => { p.ch[j] = { rot: 0, flex: 0, latFlex: 0 }; });
    return p;
  }
  const WR0 = (hx) => [r1(hx), r1(handY + B.PALM), handZ], WL0 = (hx) => [r1(hx), r1(handY + B.PALM), -handZ];
  const ikOf = (hx) => ({ arm_r: { target: WR0(hx), weight: 1 }, arm_l: { target: WL0(hx), weight: 1 }, leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } });
  function body(hx, { armD, chestY, u, neck = 0, sc = null, start = null }) {
    const p = headSc(clone(start || base), u, neck);
    if (sc) { p.ch.sc_r = clone(sc); p.ch.sc_l = clone(sc); }
    p.ik = { leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } };
    const WR = WR0(hx);
    const objs = [
      (W) => [...V.sub(W.knee_r.p, K.r), ...V.sub(W.knee_l.p, K.l)].map((v) => v * 4),
      (W) => [(sag(V.sub(W.hip_l.p, W.knee_l.p), trunkDir(W)) - BEND0 - bendDeg) * 0.4],
    ];
    if (armD != null) objs.push((W) => [(dist(W.shoulder_r.p, WR) - armD) * 4]);
    else objs.push((W) => [(B.chestMinY(W) - chestY) * 4]);
    const s = solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], objs, { iters: 500, contacts: legC });
    return s;
  }
  function key(hx, o) {
    const s = body(hx, o);
    let q = s.pose; q.ik = ikOf(hx);
    for (const sd of ['r', 'l']) { q = B.matchLeg(q, sd, contacts); q = B.matchArm(q, sd, contacts); }
    return { pose: q, cost: s.cost };
  }
  const topKey = (hx, { topElbow = 8, neck = 0, sc = null } = {}) => key(hx, { armD: L.reach(topElbow), u: 0, neck, sc });
  // hand x that puts the shoulders over the wrists at the top (shAhead = shoulder x - wrist x)
  function handXFor(shAhead = 0, topElbow = 8) {
    let lo = K.r[0] + 30, hi = K.r[0] + 110;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, W = fk(topKey(m, { topElbow }).pose, contacts), d = (W.shoulder_r.p[0] + W.shoulder_l.p[0]) / 2 - m; if (d > shAhead) lo = m; else hi = m; }
    return r1((lo + hi) / 2);
  }
  function stats(p) {
    const W = fk(p, contacts), m = R.measures(W), t = trunkDir(W), WR = p.ik.arm_r.target;
    return { elbow: m.elbowR, flare: B.elbowFlare(W, 'r'), wristExt: B.wristExt(W, 'r'), chestY: B.chestMinY(W), sh: W.shoulder_r.p[1], shAhead: (W.shoulder_r.p[0] + W.shoulder_l.p[0]) / 2 - WR[0],
      bodyAng: Math.atan2(t[1], t[0]) / R.DEG, bend: sag(V.sub(W.hip_l.p, W.knee_l.p), t) - BEND0, knee: B.kneeOf(W, 'r'), dorsi: B.dorsiOf(W, 'r'), hip: p.ch.hip_r.flex, shW: dist(W.shoulder_r.p, W.shoulder_l.p), kneeErr: Math.max(dist(W.knee_r.p, K.r), dist(W.knee_l.p, K.l)) };
  }
  // sweep: planted wrists / ankles (weight-1 frames), knee drift from the mat point, floor, props
  function sweep(ex, props = [], n = 800) {
    const tl = R.buildTimeline(ex), out = { slide: 0, knee: 0, floor: 1e9, prop: 1e9 };
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * ex.timeline.duration, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts);
      for (const c of contacts) { const k = pose.ik[c.id]; if (k && (k.weight ?? 1) >= 0.999) out.slide = Math.max(out.slide, dist(W[c.chain[2]].p, k.target)); }
      out.knee = Math.max(out.knee, dist(W.knee_r.p, K.r), dist(W.knee_l.p, K.l));
      const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
      for (const { prop, skip } of props) {
        const x0 = prop.center[0] - prop.size[0] / 2, x1 = prop.center[0] + prop.size[0] / 2, z0 = prop.center[2] - prop.size[2] / 2, z1 = prop.center[2] + prop.size[2] / 2, top = prop.center[1] + prop.size[1];
        for (const s of rig.shapes) { if (skip && skip.test(s.id)) continue; const g = R.shapeWorld(W, s); const pts = g.kind === 'capsule' ? [[g.a, g.r[0]], [g.b, g.r[1]]].map(([c, r]) => [c[0], c[1] - r, c[2]]) : [B.lowPoint(g)];
          for (const [x, y, z] of pts) if (x > x0 && x < x1 && z > z0 && z < z1 && y - top < out.prop) { out.prop = y - top; out.propAt = [s.id, +t.toFixed(2)]; } }
      }
    }
    for (const k of ['slide', 'knee', 'floor', 'prop']) out[k] = +out[k].toFixed(3);
    return out;
  }
  function rep(hx, { topElbow = 8, botChest = 8, T, nDown = 6, nUp = 4, neck = 0 }) {
    const top = topKey(hx, { topElbow, neck }).pose, cTop = B.chestMinY(fk(top, contacts)), cBot = handY + botChest;
    const poses = { top, bottom: key(hx, { chestY: cBot, u: 1, neck }).pose };
    const t0 = T.hold, t1 = t0 + T.down, t2 = t1 + T.pause, t3 = t2 + T.up;
    const keyframes = [{ t: 0, pose: 'top' }, { t: t0, pose: 'top' }];
    for (let i = 1; i < nDown; i++) { const u = ease(i / nDown), nm = `down${i}`; poses[nm] = key(hx, { chestY: cTop + (cBot - cTop) * u, u, neck }).pose; keyframes.push({ t: +(t0 + (T.down * i) / nDown).toFixed(3), pose: nm }); }
    keyframes.push({ t: t1, pose: 'bottom' });
    poses.bottomHold = key(hx, { chestY: cBot + 0.4, u: 1, neck }).pose;
    keyframes.push({ t: +((t1 + t2) / 2).toFixed(3), pose: 'bottomHold' }, { t: t2, pose: 'bottom' });
    for (let i = 1; i < nUp; i++) { const u = 1 - ease(i / nUp), nm = `up${i}`; poses[nm] = key(hx, { chestY: cTop + (cBot - cTop) * u, u, neck }).pose; keyframes.push({ t: +(t2 + (T.up * i) / nUp).toFixed(3), pose: nm }); }
    keyframes.push({ t: t3, pose: 'top' }, { t: T.D, pose: 'top' });
    return { poses, keyframes, cTop, cBot };
  }
  return { contacts, AT, K, base, key, topKey, body, rep, stats, sweep, handXFor, handY, handZ, WR0, WL0, ikOf, BEND0, chestMinY: B.chestMinY };
}

/* ---------------- glute bridge builder (author-glute-bridge.js solve, generalised) ---------------- */
// Supine on the mat (head toward -X), knees bent, feet planted with leg contacts, hands planted beside the hips. The pelvis
// rolls up about the upper back (shoulders keep their x) with the head resting; the low back flattens as the hips rise.
// opt: { kneeTop: knee angle at the top for choosing the feet x (or ax: feet x), zFoot, footRot(s): world foot rotation,
//        ankleY(s, x): ankle height for that foot rotation }
const UB = (W) => Math.min(H.bottomOf(W, 'chest'), H.bottomOf(W, 'traps_r'), H.bottomOf(W, 'traps_l'));
function makeBridge({ kneeTop = 90, ax = null, zFoot = 10, footRot = null, ankleY = L.ANKLE_H, poles = null } = {}) {
  const lie = H.lieBase();
  const W0 = fk(lie), SX = W0.shoulder_r.p[0], P0 = lie.root.rot.pitch, L5 = lie.ch.spine_l5.flex;
  function trunk(dP, l5) {
    const p = clone(lie); p.root.rot.pitch = r1(P0 + dP); p.ch.spine_l5.flex = r1(l5);
    return solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.neck_c7.flex', 'ch.head_c1.flex'], [
      (W) => [(UB(W) - 0.2) * 2, Math.min(0, H.bottomOf(W, 'neck') - 0.5) * 6, Math.min(0, UB(W)) * 6, Math.min(0, H.bottomOf(W, 'buttock_r') - 0.1) * 4, Math.min(0, H.bottomOf(W, 'hair') - 0.3) * 6, Math.min(0, H.bottomOf(W, 'thigh_r') - 0.05) * 8, (W.shoulder_r.p[0] - SX) * 2],
      (W, q) => [(q.ch.head_c1.flex - q.ch.neck_c7.flex * 0.5) * 0.3, (q.ch.neck_c7.flex - (-22 + dP * 0.6)) * 0.1, Math.max(0, q.ch.neck_c7.flex - 39) * 3, Math.max(0, q.ch.head_c1.flex - 29) * 3, Math.max(0, -27 - q.ch.neck_c7.flex) * 3, Math.max(0, -27 - q.ch.head_c1.flex) * 3]], { iters: 400 }).pose;
  }
  const l5At = (f) => L5 + (0 - L5) * f;
  const xy = (v) => [v[0], v[1], 0];
  const lineAt = (W) => V.angle(xy(V.sub(W.knee_r.p, W.hip_r.p)), xy(V.sub(W.shoulder_r.p, W.hip_r.p)));
  const sagBelow = (W) => { const a = W.shoulder_r.p, k = W.knee_r.p, h = W.hip_r.p, d = V.norm([k[0] - a[0], k[1] - a[1], 0]); return -((h[0] - a[0]) * -d[1] + (h[1] - a[1]) * d[0]); };
  const rotOf = (s) => (footRot ? footRot(s) : null);
  const ay = (s, x) => (typeof ankleY === 'function' ? ankleY(s, x) : ankleY);
  const legC = (s) => H.legC(s, Object.assign({ pole: poles ? poles[s] : [0.15, 1, s === 'r' ? 0.04 : -0.04] }, rotOf(s) ? { rot: rotOf(s) } : {}));
  const contacts = [legC('r'), legC('l'), H.handC('r', [0, 0.5, 1]), H.handC('l', [0, 0.5, -1])];
  const legOnly = contacts.slice(0, 2);
  const footT = (s, x) => [r1(x), r1(ay(s, x)), s === 'r' ? zFoot : -zFoot];
  const withFeet = (p, feet) => { const q = clone(p); q.ik = { leg_r: { target: feet.r, weight: 1 }, leg_l: { target: feet.l, weight: 1 } }; return q; };
  const feetAt = (x) => ({ r: footT('r', x), l: footT('l', x) });
  function topFor(feet, legs = legOnly) { // pelvis roll where the knee-hip-shoulder line is straight
    let lo = 5, hi = 75;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, W = fk(withFeet(trunk(m, l5At(1)), feet), legs); if (sagBelow(W) > 0) lo = m; else hi = m; }
    return r1((lo + hi) / 2);
  }
  let AX = ax, DP_TOP = 0;
  if (AX == null) {
    let a = 20, b = 110;
    for (let i = 0; i < 25; i++) { AX = (a + b) / 2; DP_TOP = topFor(feetAt(AX)); const W = fk(withFeet(trunk(DP_TOP, l5At(1)), feetAt(AX)), legOnly); if (H.kneeOf(W, 'r') > kneeTop) a = AX; else b = AX; }
    AX = r1(AX);
  }
  DP_TOP = topFor(feetAt(AX));
  const HAND = { r: [r1(W0.hip_r.p[0] + 4), 2.7, 24], l: [r1(W0.hip_r.p[0] + 4), 2.7, -24] };
  const ARM_GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 30, elev: 15, axial: 0 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 80, flex: 0, dev: 0 } }, { [`shoulder_${s}`]: { plane: -20, elev: 20, axial: 60 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: 0, dev: 0 } }];
  // Pose at roll fraction f with the given feet ({ r, l } targets). lift: { s, ch: { hip, knee, ankle } } turns leg s into
  // an FK leg (contact weight 0) with those channels; fitOnly: { s } keeps the leg planted but stores fitted channels
  // with weight 0 (the hand-over key). dP: explicit roll (deg) instead of f * DP_TOP.
  function poseAt(f, { feet = feetAt(AX), lift = null, release = null, dP = null } = {}) {
    let p = withFeet(trunk(dP != null ? dP : DP_TOP * f, l5At(Math.min(1, f))), feet);
    p.ch.sc_r = { protract: 0, elevate: 0 }; p.ch.sc_l = { protract: 0, elevate: 0 };
    for (const s of ['r', 'l']) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target);
    for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], ARM_GUESS(s)); delete p.__cost; }
    p.ik.arm_r = { target: HAND.r.slice(), weight: 1 }; p.ik.arm_l = { target: HAND.l.slice(), weight: 1 };
    if (release) p.ik[`leg_${release}`].weight = 0;
    if (lift) { p.ch[`hip_${lift.s}`] = clone(lift.ch.hip); p.ch[`knee_${lift.s}`] = clone(lift.ch.knee); p.ch[`ankle_${lift.s}`] = clone(lift.ch.ankle); p.ik[`leg_${lift.s}`].weight = 0; }
    delete p.__cost;
    return p;
  }
  return { lie, W0, trunk, l5At, lineAt, sagBelow, contacts, legOnly, footT, feetAt, withFeet, topFor, AX, DP_TOP, HAND, poseAt, UB };
}

module.exports = { makeBridge, makeKneePush, NOTE, dist, ease, measureOf, peakMeasure, fitMeasure, limitViol, wrapPoses, legLimitScan, finishChecks, T5, pushAuthor, pushKin, handYaw, ANKLE_REST };
