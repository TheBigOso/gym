// Batch 6 family b6-04: dumbbell presses and flyes lying on the bench or the floor, plus helpers for the other b6-04 moves.
// Builds on b3-chest.js (lying on the bench, press / fly paths, whole-loop sweep), b4-benchpress.js (free hand on the
// stomach, shared finish) and b4-floorpush.js (lying on the mat, floor sweep).
//  - pressPathAx: the b3-chest press path with the handle axis given per key (axAt(F, f), f = 0 bottom ... 1 top), so a
//    grip can turn during the press (twist press) or be any fixed grip (reverse / supinated).
//  - benchPress: flat / incline dumbbell press for any grip; single-arm (free hand on the stomach) or bilateral.
//  - floorPress: dumbbell press lying on the floor for any grip; bilateral, single-arm, or alternating arms.
//  - altKeys: keyframes for an alternating loop (right rep, then left rep) built from two path pose sets.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./b3-chest');
const H = require('./hips');
const P = require('./b4-benchpress');
const FP = require('./b4-floorpush');
const CA = require('./core-a');

const d0 = (v) => `≈${Math.round(v)}°`;
const SEEDS = C.ARM_SEEDS.concat([
  { shoulder_r: { plane: 20, elev: 60, axial: 0 }, elbow_r: { flex: 100 }, wrist_r: { pron: -40, flex: 0, dev: 0 } },
  { shoulder_r: { plane: 10, elev: 50, axial: 40 }, elbow_r: { flex: 100 }, wrist_r: { pron: -80, flex: 0, dev: 0 } },
  { shoulder_r: { plane: 30, elev: 60, axial: -30 }, elbow_r: { flex: 100 }, wrist_r: { pron: 0, flex: 0, dev: 0 } },
]);

// Press path with the handle axis per key: forearm vertical (stacked under the dumbbell), upper arm swinging from the
// bottom direction (flare / dip in the trunk frame) to topDir (world).
function pressPathAx(pose, { flare, dip, topDir, axAt, n = 6, seeds = SEEDS }) {
  const W = L.fk(pose), F = C.trunkFrame(W), S = W.shoulder_r.p, d0v = C.upperArmDir(F, flare, dip), d1 = V.norm(topDir);
  const up = [0, 1, 0], fore = (Wx) => V.sub(V.norm(V.sub(Wx.wrist_r.p, Wx.elbow_r.p)), up);
  const out = []; let prev = null;
  for (let i = 0; i <= n; i++) {
    const f = i / n, E = V.add(S, V.scale(C.slerpV(d0v, d1, f), L.UA)), prevCh = prev && clone(prev.ch);
    const extra = (Wx, qq) => [...V.sub(Wx.elbow_r.p, E).map((v) => v * 3), ...fore(Wx).map((v) => v * 10)].concat(prev ? [(qq.ch.wrist_r.pron - prevCh.wrist_r.pron) * 0.01, (qq.ch.shoulder_r.axial - prevCh.shoulder_r.axial) * 0.01] : []);
    const q = C.solveArmDB(pose, { c: null, ax: axAt(F, f), seeds: prev ? [{ shoulder_r: prevCh.shoulder_r, elbow_r: prevCh.elbow_r, wrist_r: prevCh.wrist_r }] : seeds, extra });
    out.push({ f, pose: q }); prev = q;
  }
  return out;
}
// Grip axes (right hand, handle direction from the little finger toward the thumb side as dumbbell.js GRIP.axis)
const AX = {
  pronated: (F) => V.scale(F.w, -1),   // palms toward the feet, thumbs toward the midline
  neutral: (F) => V.norm([F.u[0], 0, F.u[2]]), // palms facing each other, thumbs toward the head (handle level, so it sits
                                                // square across a vertical forearm on an incline too)
  supinated: (F) => F.w,               // palms toward the head, thumbs out to the side (reverse grip)
};
const twistAx = (from, to) => (F, f) => C.slerpV(AX[from](F), AX[to](F), f);

// Bench press for any grip. single: right arm only, the left hand resting on the stomach (b4-benchpress restHand).
function benchPress(meta, { angle = 0, flare = 45, dip = 18, topTilt = [0.03, 1, 0.1], axAt, single = false, footZ = single ? 28 : 24, label, kin }) {
  const T = C.phaseT(meta), bb = C.benchBase(angle, { footZ }), { B, contacts, foot } = bb;
  const rest = single ? P.restHand(bb.base, { lift: 2.5 }) : null, base = single ? rest.pose : bb.base;
  const W0 = L.fk(base, contacts);
  const fin = (p) => { const q = C.strip(p); if (single) { for (const j of ['shoulder_l', 'elbow_l', 'wrist_l', 'sc_l']) q.ch[j] = clone(base.ch[j]); } else C.mirrorArm(q); return q; };
  const raw = pressPathAx(base, { flare, dip, topDir: topTilt, axAt, n: 6 });
  const path = raw.map((k) => ({ f: k.f, pose: fin(k.pose) }));
  const settle = fin(pressPathAx(base, { flare, dip: dip - 1.5, topDir: topTilt, axAt, n: 1, seeds: [{ shoulder_r: raw[0].pose.ch.shoulder_r, elbow_r: raw[0].pose.ch.elbow_r, wrist_r: raw[0].pose.ch.wrist_r }] })[0].pose);
  const { poses, keyframes } = C.repKeys(path, T, settle);
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props.find((p) => p.id === 'bench').center = B.prop.center;
  const grips = single ? [{ side: 'r', grip: 'handle' }] : [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }];
  const sw = C.sweep(ex, B, { grips });
  const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
  const m = { W0, Wt, Wb, B, poses, T, sw, foot, fit: C.benchFit(B, W0), dbT: C.dbAt(Wt, 'r'), dbB: C.dbAt(Wb, 'r'), elbowTop: C.elbowFlexOf(Wt), elbowBot: C.elbowFlexOf(Wb), flare: C.elbowFlare(Wb), dip: C.armDip(Wb), costs: raw.map((k) => +k.pose.__cost.toFixed(3)) };
  kin(H.setKin(ex), m);
  P.finish(ex, label, m, `top elbow ${m.elbowTop.toFixed(0)} bottom elbow ${m.elbowBot.toFixed(0)} flare ${m.flare.toFixed(0)} dip ${m.dip.toFixed(0)} costs ${m.costs}${rest ? ` rest ${rest.cost.toFixed(3)}` : ''}`);
  if (Math.max(...m.costs) > 2) { console.error('FAIL: press key not solved'); process.exitCode = 1; }
  return { ex, m };
}

// Keyframes for an alternating loop: phases (by id) lowerR, bottomR, pressR, lowerL, bottomL, pressL; the arm path keys are
// named `${side}${i}` (i = 0 bottom ... n top) and 'both' is both arms at the top. A settle key sits mid-pause.
function altKeys(meta, n) {
  const T = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration, out = [{ t: 0, pose: 'both' }];
  for (const s of ['R', 'L']) {
    const lo = T[`lower${s}`], bo = T[`bottom${s}`], pr = T[`press${s}`];
    for (let i = n - 1; i >= 1; i--) out.push({ t: lo.start + ((lo.end - lo.start) * (n - i)) / n, pose: `${s}${i}` });
    if (lo.start > out[out.length - 1].t) out.splice(out.length - (n - 1), 0, { t: lo.start, pose: 'both' });
    out.push({ t: bo.start, pose: `${s}0` }, { t: (bo.start + bo.end) / 2, pose: `${s}hold` }, { t: bo.end, pose: `${s}0` });
    for (let i = 1; i <= n - 1; i++) out.push({ t: pr.start + ((pr.end - pr.start) * i) / n, pose: `${s}${i}` });
    out.push({ t: pr.end, pose: 'both' });
  }
  out.push({ t: D, pose: 'both' });
  const m = new Map(); for (const k of out) m.set(+k.t.toFixed(3), { t: +k.t.toFixed(3), pose: k.pose });
  return [...m.values()].sort((a, b) => a.t - b.t);
}
// Pose with the right arm from `pr` and the left arm mirrored from `pl` (both right-arm solves)
function combine(base, pr, pl) {
  const q = clone(base);
  for (const j of ['shoulder', 'elbow', 'wrist']) { q.ch[`${j}_r`] = clone(pr.ch[`${j}_r`]); q.ch[`${j}_l`] = clone(pl.ch[`${j}_r`]); }
  delete q.__cost; return q;
}

// Floor press for any grip. mode 'both' | 'single' (free left arm on the floor, planted) | 'alternate'. The bottom depth is
// solved so the arm shapes rest on the floor.
function floorPress(meta, { mode = 'both', flare = 45, axAt, topTilt, label, kin }) {
  const T = C.phaseT(meta), { base: b0, contacts: legC, foot } = FP.lieFloor();
  let base = b0, contacts = legC.slice();
  if (mode === 'single') {
    const hc = CA.handContacts().find((c) => c.id === 'arm_l'), tg = CA.handTargets(base, { abd: 40, flex: 12, wristY: 2.6 });
    base = CA.fitArm(base, 'l', tg.l, [hc]); base.ik = Object.assign(base.ik, { arm_l: { target: tg.l, weight: 1 } });
    contacts = contacts.concat([hc]);
  }
  const W0 = L.fk(base, contacts), tt = topTilt || (mode === 'both' ? [0.03, 1, 0.12] : [0.02, 1, 0.05]);
  const bottomAt = (dip) => pressPathAx(base, { flare, dip, topDir: tt, axAt, n: 1 })[0].pose;
  const DIP = r1(FP.bisect((dip) => FP.armMinY(L.fk(bottomAt(dip), contacts)) - 0.05, 0, 35));
  const raw = pressPathAx(base, { flare, dip: DIP, topDir: tt, axAt, n: 6 });
  const settleRaw = pressPathAx(base, { flare, dip: DIP - 1.2, topDir: tt, axAt, n: 1, seeds: [{ shoulder_r: raw[0].pose.ch.shoulder_r, elbow_r: raw[0].pose.ch.elbow_r, wrist_r: raw[0].pose.ch.wrist_r }] })[0].pose;
  let poses, keyframes;
  if (mode === 'alternate') {
    const top = raw[6].pose; poses = { both: combine(base, top, top) };
    raw.forEach((k, i) => { poses[`R${i}`] = combine(base, k.pose, top); poses[`L${i}`] = combine(base, top, k.pose); });
    poses.Rhold = combine(base, settleRaw, top); poses.Lhold = combine(base, top, settleRaw);
    delete poses.R6; delete poses.L6;
    keyframes = altKeys(meta, 6);
  } else {
    const fin = (p) => { const q = C.strip(p); if (mode === 'both') C.mirrorArm(q); else for (const j of ['shoulder_l', 'elbow_l', 'wrist_l', 'sc_l']) q.ch[j] = clone(base.ch[j]); return q; };
    ({ poses, keyframes } = C.repKeys(raw.map((k) => ({ f: k.f, pose: fin(k.pose) })), T, fin(settleRaw)));
  }
  for (const p of Object.values(poses)) p.ik = clone(base.ik);
  const ex = H.module_(meta, contacts, poses, keyframes);
  const grips = mode === 'single' ? [{ side: 'r', grip: 'handle' }] : [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }];
  const sw = FP.floorSweep(ex, { grips });
  const Wt = L.fk(poses.top || poses.both, contacts), Wb = L.fk(poses.bottom || poses.R0, contacts);
  const m = { W0, Wt, Wb, T, sw, foot, DIP, dbT: C.dbAt(Wt, 'r'), dbB: C.dbAt(Wb, 'r'), elbowTop: C.elbowFlexOf(Wt), elbowBot: C.elbowFlexOf(Wb), flare: C.elbowFlare(Wb), dip: C.armDip(Wb), armFloor: FP.armMinY(Wb), costs: raw.map((k) => +k.pose.__cost.toFixed(3)) };
  kin(H.setKin(ex), m);
  const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
  ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
  console.log(`${label}: wrote ${L.write(ex)}\n  dip ${DIP} top elbow ${m.elbowTop.toFixed(0)} bottom elbow ${m.elbowBot.toFixed(0)} flare ${m.flare.toFixed(0)} trunk ${tf.toFixed(1)} costs ${m.costs}\n  sweep ${JSON.stringify(sw)}`);
  if (sw.slide > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
  if (sw.floor < -0.5 || sw.dbFloor < 0 || sw.dbBody > 0.5 || (sw.dbGap && sw.dbGap[0] < 1)) { console.error('FAIL: floor or dumbbell collision'); process.exitCode = 1; }
  if (Math.max(...m.costs) > 2) { console.error('FAIL: press key not solved'); process.exitCode = 1; }
  return { ex, m };
}


// Fly path with the handle axis per key (f = 0 top ... 1 bottom, as b3-chest flyPath): the upper arm sweeps along the arc
// from dTop to dBot with the elbow held at a soft bend, the forearm bending toward the inside of the arc.
function flyPathAx(pose, { dTop, dBot, elbow = 20, n = 6, axAt, palmTo, seeds }) {
  // palmTo(F): instead of a handle axis, turn the palm toward this direction (projected square to the forearm)
  const W = L.fk(pose), F = C.trunkFrame(W), S = W.shoulder_r.p, a = V.norm(dTop), b = V.norm(dBot);
  const out = []; let prev = null;
  for (let i = 0; i <= n; i++) {
    const f = i / n, d = C.slerpV(a, b, f), d2 = C.slerpV(a, b, Math.min(1, f + 0.01)), d1 = C.slerpV(a, b, Math.max(0, f - 0.01));
    const tan = V.norm(V.sub(d2, d1)), bend = V.norm(V.sub(V.scale(tan, -1), V.scale(d, V.dot(V.scale(tan, -1), d))));
    const E = V.add(S, V.scale(d, L.UA)), prevCh = prev && clone(prev.ch);
    const extra = (Wx, qq) => [...V.sub(Wx.elbow_r.p, E).map((v) => v * 3), (V.dot(V.norm(V.sub(Wx.wrist_r.p, Wx.elbow_r.p)), bend) - Math.sin(elbow * R.DEG)) * 6]
      .concat(prev ? [(qq.ch.wrist_r.pron - prevCh.wrist_r.pron) * 0.01, (qq.ch.shoulder_r.axial - prevCh.shoulder_r.axial) * 0.01] : [])
      .concat(palmTo ? (() => { const fa = V.norm(V.sub(Wx.wrist_r.p, Wx.elbow_r.p)), P0 = palmTo(F), tg = V.norm(V.sub(P0, V.scale(fa, V.dot(P0, fa)))); return V.sub(V.norm(Q.rot(Wx.wrist_r.q, [1, 0, 0])), tg).map((v) => v * 6); })() : []);
    const sd = prev ? [{ shoulder_r: prevCh.shoulder_r, elbow_r: prevCh.elbow_r, wrist_r: prevCh.wrist_r }] : (seeds || [{ shoulder_r: { plane: 90, elev: 90, axial: 0 }, elbow_r: { flex: elbow }, wrist_r: { pron: 0, flex: 0, dev: 0 } }, { shoulder_r: { plane: 90, elev: 90, axial: 90 }, elbow_r: { flex: elbow }, wrist_r: { pron: 0, flex: 0, dev: 0 } }, { shoulder_r: { plane: 90, elev: 90, axial: -90 }, elbow_r: { flex: elbow }, wrist_r: { pron: 90, flex: 0, dev: 0 } }, { shoulder_r: { plane: 90, elev: 100, axial: 60 }, elbow_r: { flex: elbow }, wrist_r: { pron: -60, flex: 0, dev: 0 } }, { shoulder_r: { plane: 100, elev: 110, axial: 30 }, elbow_r: { flex: elbow }, wrist_r: { pron: -90, flex: 0, dev: 0 } }]);
    const q = C.solveArmDB(pose, { c: null, ax: axAt ? axAt(F, f) : null, elbowFlex: elbow, seeds: sd, extra });
    out.push({ f, pose: q }); prev = q;
  }
  return out;
}

// One knee and the same-side hand on a flat bench, the other foot planted on the floor out to the side, back flat about
// 16-20 degrees above the floor (the support position of author-one-arm-dumbbell-row.js, rebuilt here so this family does not
// depend on another author). Left knee and left hand on the bench, right foot on the floor, right arm free. Returns
// { pose, contacts, bench, boxes, K, A, HAND }.
function kneelBench({ pitch = -74, foot = [-28, L.ANKLE_H, 32], kneeR = 10, benchTop = 45, tilt = 8, elbowL = 32 } = {}) {
  const B3 = require('./b3-back'), PR = require('./prone'), D = require('./dumbbell');
  const SHIN_R = 5.2, KNEE_Y = benchTop + SHIN_R - 2.8, WRIST_Y = benchTop + 1.8;
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  const handQ = (s) => { const q = Q.mul(Q.axis([1, 0, 0], tilt), L.handRotR); return PR.qArr(s === 'r' ? q : Q.mirrorZ(q)); };
  const contacts = [Object.assign(L.legContact('r'), { pole: [1, 0, 0.35], handRot: PR.qArr(L.footRot(-12)) }), Object.assign(L.handContact('l'), { pole: [-1, 0.1, -0.25], handRot: handQ('l') })];
  const base = (y) => ({ root: { pos: [0, y, 0], rot: { pitch } }, ch: { spine_l5: { ...z0(), flex: -2 }, spine_t12: z0(), spine_t6: { ...z0(), flex: 1 }, neck_c7: { rot: 0, flex: -10 }, head_c1: { rot: 0, flex: -12 },
    sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 4, elevate: 1 }, hip_r: { flex: 70, abd: 18, rot: 0 }, knee_r: { flex: kneeR }, ankle_r: { dorsi: 0 }, hip_l: { flex: 100, abd: 0, rot: 0 }, knee_l: { flex: 100 }, ankle_l: { dorsi: -60 },
    shoulder_r: { plane: 90, elev: 80, axial: 0 }, elbow_r: { flex: 5 }, wrist_r: { pron: 90, flex: 0, dev: 0 }, shoulder_l: { plane: 90, elev: 80, axial: 0 }, elbow_l: { flex: 10 }, wrist_l: { pron: 0, flex: 0, dev: 0 } },
    ik: { leg_r: { target: foot.slice(), weight: 1 } } });
  let a = 60, b = 100;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; if (B3.kneeOf(L.fk(base(y), contacts), 'r') > kneeR) a = y; else b = y; }
  let pose = base(r1((a + b) / 2));
  pose = PR.fitLeg(pose, 'r', contacts, 'leg_r');
  let W = L.fk(pose, contacts);
  const Hp = W.hip_l.p, dy = Hp[1] - KNEE_Y, K = [r1(Hp[0] + Math.sqrt(42 * 42 - dy * dy - 1)), r1(KNEE_Y), r1(Hp[2] - 1)];
  const A = [r1(K[0] - Math.sqrt(41.5 * 41.5 - 4)), r1(benchTop + 4), K[2]];
  pose = L.solvePose(pose, ['ch.hip_l.flex', 'ch.hip_l.abd', 'ch.hip_l.rot', 'ch.knee_l.flex', 'ch.ankle_l.dorsi'],
    [L.obj.at('knee_l', K, 3), L.obj.at('ankle_l', A, 3), (Wx) => [(Wx.toe_l.p[1] - (benchTop + 2.2)) * 1.5], L.obj.reg('ch.hip_l.rot', 0, 0.05)], { iters: 400 }).pose;
  W = L.fk(pose, contacts);
  const SL = W.shoulder_l.p, ARM = L.reach(elbowL), hy = SL[1] - WRIST_Y, HAND = [r1(SL[0] + Math.sqrt(ARM * ARM - hy * hy - 4)), WRIST_Y, r1(SL[2] + 2)];
  pose.ik.arm_l = { target: HAND, weight: 1 };
  pose = PR.fitArm(pose, 'l', contacts, 'arm_l');
  const bx0 = r1(A[0] + 4), zB = r1((K[2] + HAND[2]) / 2);
  const bench = D.bench({ x: r1(bx0 + 20), z: zB, seat: 40, height: benchTop, width: 30, angle: 0, back: 80, side: 1 });
  return { pose, contacts, bench, boxes: B3.benchBoxes(bench), K, A, HAND };
}
// Right arm (FK solve) with the elbow at E and the wrist at Wt, palm normal `palm`, thumb (handle) axis `thumb` (b3-back holdArm)
function armAt(pose, E, Wt, palm, thumb, guess) {
  const B3 = require('./b3-back');
  return B3.holdArm(pose, Wt, { palm, axis: thumb, elbow: E, elbowW: 1.5, axialW: 0.02, guesses: guess ? [guess] : undefined });
}

// Bird-dog support on a flat bench: right knee (shin along the pad, foot pointed back) and left hand (planted hand contact)
// on the bench, the left leg held straight back about level with the hip, trunk nearly level, right arm free. The right
// knee / shin are posed by FK and stay still; the hand is a planted contact. Returns { pose, contacts, bench, boxes, K, A, HAND }.
function birdDogBench({ pitch = -82, benchTop = 45, tilt = 8, elbowL = 14, handZ = -9, kneeZ = 6, legLift = 0 } = {}) {
  const B3 = require('./b3-back'), PR = require('./prone'), D = require('./dumbbell');
  const SHIN_R = 5.2, KNEE_Y = benchTop + SHIN_R - 2.8, WRIST_Y = benchTop + 1.8;
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  const handQ = (s) => { const q = Q.mul(Q.axis([1, 0, 0], tilt), L.handRotR); return PR.qArr(s === 'r' ? q : Q.mirrorZ(q)); };
  const contacts = [Object.assign(L.handContact('l'), { pole: [-1, 0.1, -0.25], handRot: handQ('l') })];
  const mk = (y) => ({ root: { pos: [0, y, 0], rot: { pitch } }, ch: { spine_l5: { ...z0(), flex: -2 }, spine_t12: z0(), spine_t6: { ...z0(), flex: 1 }, neck_c7: { rot: 0, flex: -12 }, head_c1: { rot: 0, flex: -14 },
    sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 4, elevate: 1 }, hip_r: { flex: 90, abd: 0, rot: 0 }, knee_r: { flex: 90 }, ankle_r: { dorsi: -60 }, hip_l: { flex: 0, abd: 0, rot: 0 }, knee_l: { flex: 4 }, ankle_l: { dorsi: -25 },
    shoulder_r: { plane: 90, elev: 80, axial: 0 }, elbow_r: { flex: 5 }, wrist_r: { pron: 90, flex: 0, dev: 0 }, shoulder_l: { plane: 90, elev: 80, axial: 0 }, elbow_l: { flex: 10 }, wrist_l: { pron: 0, flex: 0, dev: 0 } }, ik: {} });
  // pelvis height: the right thigh hangs about vertically onto the knee on the pad
  const y0 = (() => { const W = L.fk(mk(100)); return r1(100 - (W.hip_r.p[1] - KNEE_Y) + 40.2); })();
  let pose = mk(y0), W = L.fk(pose);
  const Hp = W.hip_r.p, dy = Hp[1] - KNEE_Y, K = [r1(Hp[0] - Math.sqrt(Math.max(1, 40.6 * 40.6 - dy * dy - (Hp[2] - kneeZ) ** 2))), r1(KNEE_Y), kneeZ];
  const A = [r1(K[0] - Math.sqrt(41.5 * 41.5 - 4)), r1(benchTop + 4), kneeZ];
  pose = L.solvePose(pose, ['ch.hip_r.flex', 'ch.hip_r.abd', 'ch.hip_r.rot', 'ch.knee_r.flex', 'ch.ankle_r.dorsi'],
    [L.obj.at('knee_r', K, 3), L.obj.at('ankle_r', A, 3), (Wx) => [(Wx.toe_r.p[1] - (benchTop + 2.2)) * 1.5], L.obj.reg('ch.hip_r.rot', 0, 0.05)], { iters: 400 }).pose;
  // left leg straight back, level with the hip (plus legLift deg)
  pose = L.solvePose(pose, ['ch.hip_l.flex'], [(Wx) => V.sub(V.norm(V.sub(Wx.ankle_l.p, Wx.hip_l.p)), V.norm([-Math.cos(legLift * R.DEG), Math.sin(legLift * R.DEG), 0])).map((v) => v * 10)]).pose;
  W = L.fk(pose);
  const SL = W.shoulder_l.p, ARM = L.reach(elbowL), hy = SL[1] - WRIST_Y, dz = handZ - SL[2], HAND = [r1(SL[0] + Math.sqrt(Math.max(1, ARM * ARM - hy * hy - dz * dz))), r1(WRIST_Y), handZ];
  pose.ik.arm_l = { target: HAND, weight: 1 };
  pose = PR.fitArm(pose, 'l', contacts, 'arm_l');
  W = L.fk(pose, contacts);
  const x0 = r1(Math.min(W.toe_r.p[0], A[0]) - 8), x1 = r1(HAND[0] + 14), zB = r1((kneeZ + handZ) / 2), seat = 40, back = r1(x1 - x0 - seat);
  const bench = D.bench({ x: r1(x0 + seat / 2), z: zB, seat, height: benchTop, width: 30, angle: 0, back, side: 1 });
  return { pose, contacts, bench, boxes: B3.benchBoxes(bench), K, A, HAND };
}

const slerp = (a, b, t) => C.slerpV(V.norm(a), V.norm(b), t);
module.exports = { birdDogBench, slerp, kneelBench, armAt, flyPathAx, d0, SEEDS, AX, twistAx, pressPathAx, benchPress, floorPress, altKeys, combine };
