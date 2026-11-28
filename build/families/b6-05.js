// Batch 6 family b6-05: dumbbell arm variants built on the batch 3 / 4 helpers.
//  - lyingExt: lying single-arm (or alternating two-arm) triceps extension on a flat bench (b3-chest benchBase, b4-benchpress
//    extArm / restHand): the upper arm stays still while the elbow bends; grip and bending plane are parameters
//    (pronated / supinated / across the face / neutral alternating).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./b3-chest');
const H = require('./hips');
const P = require('./b4-benchpress');
const T3 = require('./b3-triceps');

/* ---------------- Lying triceps extensions on a flat bench ---------------- */
// opts: ua (upper-arm world direction), fa (forearm direction at 90 degrees of elbow flexion: sets the bending plane),
// palm (palm direction at 90 degrees, perpendicular to fa), flexTop / flexBot, label, rest ('stomach' | null: the free
// hand on the stomach), grip text for the kinematics rows, dbSize (dumbbell size), guess (shoulder seeds).
function lyingExtKeys(base, { ua, fa, palm, flexTop = 6, flexBot = 100, n = 4, guess }) {
  const keyAt = (f) => P.extArm(base, ua, fa, flexTop + (flexBot - flexTop) * f, palm, guess);
  const path = []; for (let i = 0; i <= n; i++) { const q = keyAt(i / n); path.push({ f: 1 - i / n, pose: C.strip(q), cost: q.__cost }); }
  path.reverse();
  return { path, settle: C.strip(keyAt(0.985)), keyAt };
}
function lyingExt(meta, opts) {
  const { ua = [0, 1, 0], fa = [-1, 0, 0], palm = [0, 0, -1], flexTop = 6, flexBot = 100, label, gripText, planeText, dbSize, guess } = opts;
  const T = C.phaseT(meta), { B, base: base0, contacts, foot } = C.benchBase(0);
  const rest = P.restHand(base0, { lift: 2.5 }), base = rest.pose;
  const { path, settle } = lyingExtKeys(base, { ua, fa, palm, flexTop, flexBot, guess });
  const { poses, keyframes } = C.repKeys(path, T, settle);
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props.find((p) => p.id === 'bench').center = B.prop.center;
  if (dbSize) ex.props.find((p) => p.id === 'dbR').size = dbSize.slice();
  let uaDev = 0;
  const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }], probe: (Wx) => { uaDev = Math.max(uaDev, V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), ua)); } });
  const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = P.d0;
  const dbB = C.dbAt(Wb, 'r');
  set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom`);
  set('Upper arm angle', 'setup', `${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} from vertical`); set('Upper arm angle', 'peak', `Unchanged: shoulder channels constant (max ${uaDev.toFixed(1)}° drift)`);
  set('Grip', 'setup', gripText[0]); set('Grip', 'peak', gripText[1]);
  set('Dumbbell path', 'setup', planeText[0]); set('Dumbbell path', 'peak', `${planeText[1]}; dumbbell centre ${r1(dbB.c[1] - Wb.shoulder_r.p[1])} cm above the shoulder at the bottom, ${r1(Wb.shoulder_r.p[2] - dbB.c[2])} cm toward the midline from it; closest approach to the body ${r1(-sw.dbBody)} cm (rig shapes), to the bench ${r1(-sw.dbBench)} cm`);
  set('Free hand', 'setup', 'Left hand resting on the stomach'); set('Free hand', 'peak', 'Unchanged (constant left-arm channels)');
  set('Knee flexion', 'setup', `${d(H.kneeOf(L.fk(base, contacts), 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
  P.finish(ex, label, { W0: L.fk(base, contacts), sw, fit: C.benchFit(B, L.fk(base, contacts)) }, `elbow ${r1(C.elbowFlexOf(Wt))}/${r1(C.elbowFlexOf(Wb))} sh ${JSON.stringify(poses.top.ch.shoulder_r)} wr ${JSON.stringify(poses.top.ch.wrist_r)} costs ${path.map((k) => k.cost.toFixed(4)).join(',')} dbBottom ${dbB.c.map(r1)}`);
  return ex;
}

module.exports = { lyingExtKeys, lyingExt };

// Alternating two-arm lying extension: both arms straight up, neutral grip; the right elbow bends and straightens while
// the left holds straight, then the left. Keys from lyingExtKeys for the right arm; the left arm copies the right arm's key
// channels (mirror) at the matching phase time. Phase ends from meta: [setup, rLower, rBottom, rPress, switch, lLower,
// lBottom, lPress, reset].
function lyingAltExt(meta, { flexTop = 6, flexBot = 104, label }) {
  const ph = meta.timeline.phases.map((p) => p.end), D = meta.timeline.duration;
  const { B, base, contacts, foot } = C.benchBase(0);
  const { path, settle } = lyingExtKeys(base, { ua: [0, 1, 0], fa: [-1, 0, 0], palm: [0, 0, -1], flexTop, flexBot });
  const n = path.length - 1, arm = (q) => ({ sc: q.ch.sc_r, shoulder: q.ch.shoulder_r, elbow: q.ch.elbow_r, wrist: q.ch.wrist_r });
  const combo = (qr, ql) => { const q = clone(base); delete q.__cost; const a = arm(qr), b = arm(ql); for (const j of ['sc', 'shoulder', 'elbow', 'wrist']) { q.ch[`${j}_r`] = clone(a[j]); q.ch[`${j}_l`] = clone(b[j]); } return q; };
  const top = path[n].pose, poses = { top: combo(top, top) }, keyframes = [{ t: 0, pose: 'top' }, { t: ph[0], pose: 'top' }];
  for (const [s, t0, tb, tp, tr] of [['r', ph[0], ph[1], ph[2], ph[3]], ['l', ph[4], ph[5], ph[6], ph[7]]]) {
    const mk = (q) => (s === 'r' ? combo(q, top) : combo(top, q));
    for (let i = n - 1; i >= 0; i--) { const nm = `${s}Down${n - i}`; poses[nm] = mk(path[i].pose); keyframes.push({ t: +(t0 + ((tb - t0) * (n - i)) / n).toFixed(3), pose: nm }); }
    poses[`${s}Hold`] = mk(settle); keyframes.push({ t: +((tb + tp) / 2).toFixed(3), pose: `${s}Hold` }, { t: tp, pose: `${s}Down${n}` });
    for (let i = 1; i <= n - 1; i++) keyframes.push({ t: +(tp + ((tr - tp) * i) / n).toFixed(3), pose: `${s}Down${n - i}` });
    keyframes.push({ t: tr, pose: 'top' });
  }
  keyframes.push({ t: ph[4] > ph[3] ? ph[4] : ph[3], pose: 'top' });
  keyframes.sort((a, b) => a.t - b.t);
  const kf = keyframes.filter((k, i) => i === 0 || k.t !== keyframes[i - 1].t);
  kf.push({ t: D, pose: 'top' });
  const ex = H.module_(meta, contacts, poses, kf.filter((k, i, a) => i === a.length - 1 || k.t < D));
  ex.props = [B.prop, ...ex.props];
  let uaDev = 0;
  const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }], probe: (Wx) => { for (const s of ['r', 'l']) uaDev = Math.max(uaDev, V.angle(V.sub(Wx[`elbow_${s}`].p, Wx[`shoulder_${s}`].p), [0, 1, 0])); } });
  const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses[`rDown${n}`], contacts), set = H.setKin(ex), d = P.d0;
  set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom, each arm in turn`);
  set('Upper arm angle', 'setup', `${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} from vertical`); set('Upper arm angle', 'peak', `Unchanged: shoulder channels constant (max ${uaDev.toFixed(1)}° from vertical over the loop)`);
  set('Alternation', 'setup', 'Both arms straight'); set('Alternation', 'peak', 'Right arm lowers and extends while the left holds straight, then the left (resting arm channels constant)');
  set('Dumbbell clearance', 'setup', 'Dumbbells over the shoulders'); set('Dumbbell clearance', 'peak', `Closest approach to the body ${r1(-sw.dbBody)} cm (rig shapes), to the bench ${r1(-sw.dbBench)} cm, between the dumbbells ${sw.dbGap} cm`);
  set('Back on the bench', 'setup', `Flat bench ${B.prop.size[1]} cm; buttocks, upper back and head on the pad, feet ${2 * foot[2]} cm apart`); set('Back on the bench', 'peak', 'Unchanged (the trunk does not move)');
  set('Tempo', 'setup', `Both arms straight ${ph[0]} s`); set('Tempo', 'peak', `Per arm ${r1(ph[1] - ph[0])} s down, ${r1(ph[2] - ph[1])} s pause, ${r1(ph[3] - ph[2])} s up`);
  P.finish(ex, label, { W0: L.fk(base, contacts), sw, fit: C.benchFit(B, L.fk(base, contacts)) }, `elbow ${r1(C.elbowFlexOf(Wt))}/${r1(C.elbowFlexOf(Wb))} keys ${ex.keyframes.map((k) => `${k.t}:${k.pose}`).join(' ')}`);
  return ex;
}
module.exports.lyingAltExt = lyingAltExt;

/* ---------------- Wrist curls: seated (forearms on the thighs) and kneeling over a flat bench ---------------- */
// palm 'up' | 'down' | 'in' (thumb up, palm toward the midline). Wrist motion on channel 'flex' (palmar flexion /
// extension) or 'dev' (+ toward the thumb side: radial deviation; - ulnar). One-arm variants keep only the right dumbbell;
// the left forearm rests in the mirrored position with a still, neutral wrist.
const F4 = require('./b4-forearms');
const CU = require('./b3-curls');
const palmTarget = (W, palm) => {
  const fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p));
  const want = palm === 'up' ? [0, 1, 0] : palm === 'down' ? [0, -1, 0] : [0, 0, -1];
  return V.norm(V.sub(want, V.scale(fa, V.dot(want, fa))));
};
// Seated base: same objectives as b4-forearms seatedForearms, with the palm-in option (forearm resting on its little-finger
// edge along the top of the thigh).
function seatedBase({ seatH = 45, stance = 20, footDX = 44, toeOut = 8, hipAbd = 10, tW = 1.08, liftE = 0, liftW = 0, palm = 'up', seatOff = 0, uaV = 20, spine = { l5: 12, t12: 10, t6: 8 }, rootX = 0 } = {}) {
  const st = L.POSES.standing({ stance, toeOut });
  const contacts = st.contacts.map((c) => Object.assign(c, { pole: [1, 0, c.id === 'leg_r' ? 0.25 : -0.25] }));
  let p = clone(st.pose); delete p.ik;
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: spine.l5, latFlex: 0 }, spine_t12: { rot: 0, flex: spine.t12, latFlex: 0 }, spine_t6: { rot: 0, flex: spine.t6, latFlex: 0 },
    hip_r: { flex: 95, abd: hipAbd, rot: -toeOut }, hip_l: { flex: 95, abd: hipAbd, rot: -toeOut }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, sc_r: { protract: 8, elevate: 0 }, sc_l: { protract: 8, elevate: 0 } });
  p.root.pos = [rootX, seatH + 8, 0]; p.root.rot = { pitch: -15 };
  p.ik = { leg_r: { target: [r1(rootX + footDX), L.ANKLE_H, stance], weight: 1 }, leg_l: { target: [r1(rootX + footDX), L.ANKLE_H, -stance], weight: 1 } };
  const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => CU.shapePlaneDist(W, id, [0, seatH, 0], [0, 1, 0])));
  CU.setArm(p, 'r', { plane: 60, elev: 30, axial: 0, flex: 70, pron: palm === 'up' ? 0 : palm === 'down' ? 175 : 90 });
  const objs = [
    (W) => [(seatY(W) - seatOff) * 4],
    (W) => { const t = F4.thighFrac(W, 'r', W.elbow_r.p); return V.sub(W.elbow_r.p, F4.thighTop(W, 'r', t, 3.9 + liftE)).map((v) => v * 3); },
    (W) => V.sub(W.wrist_r.p, F4.thighTop(W, 'r', tW, 2.5 + liftW)).map((v) => v * 3),
    (W) => V.sub(CU.palmDir(W, 'r'), palmTarget(W, palm)).map((v) => v * 6),
    (W, q) => [q.ch.shoulder_r.axial * 0.01, Math.min(0, q.ch.shoulder_r.elev) * 5],
    (W) => [(V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]) - uaV) * 0.15],
  ];
  const sol = L.solvePose(p, ['root.pos.1', 'root.rot.pitch', 'ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron'], objs, { iters: 600, contacts });
  p = T3.mirrorArm(sol.pose);
  p.ch.wrist_r.pron = r1(L.wrap(p.ch.wrist_r.pron)); p.ch.wrist_l.pron = p.ch.wrist_r.pron;
  const W = L.fk(p, contacts);
  const res = objs.slice(0, 4).concat([objs[5]]).map((f) => +Math.hypot(...f(W, p)).toFixed(2));
  const measure = (Wx) => ({ seat: +seatY(Wx).toFixed(2), elbowFrac: +F4.thighFrac(Wx, 'r', Wx.elbow_r.p).toFixed(2), wristFrac: +F4.thighFrac(Wx, 'r', Wx.wrist_r.p).toFixed(2) });
  return { pose: p, contacts, cost: sol.cost, res, measure, seatY };
}

// Kneeling over a flat bench set crosswise in front: both knees on the floor, toes tucked (b5-cablepush tallKneel), the
// trunk pitched forward LEAN degrees about the hips (legs refitted to the same targets), upper arms hanging about uaFwd
// degrees forward of vertical, forearms lying straight forward across the bench pad (elbow just inside the near edge, wrist
// `over` cm past the far edge so the hand moves freely). The bench top height follows from the elbow (forearm surface on
// the pad); the bench width from the forearm. palm 'up' | 'down' | 'in'.
function kneelBase({ lean = 62, uaFwd = 12, palm = 'up', over = 2.5, liftE = 3.9, liftW = 2.6, inset = 3.5, dz = 0, head = -14 } = {}) {
  const P5 = require('./b5-cablepush');
  const kn = P5.tallKneel({ toePitch: 78 }), contacts = kn.contacts;
  let p = clone(kn.pose);
  const W0 = L.fk(p, contacts), hm0 = V.scale(V.add(W0.hip_r.p, W0.hip_l.p), 0.5);
  p.root.rot = { pitch: -lean };
  const W1 = L.fk(p, contacts), hm1 = V.scale(V.add(W1.hip_r.p, W1.hip_l.p), 0.5);
  p.root.pos = V.add(p.root.pos, V.sub(hm0, hm1)).map(r1);
  for (const s of ['r', 'l']) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target);
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in p.ch[j]) p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  p.ch.neck_c7 = { rot: 0, flex: r1(head / 2) }; p.ch.head_c1 = { rot: 0, flex: r1(head / 2) };
  p.ch.sc_r = { protract: 10, elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);
  const Wp = L.fk(p, contacts), S = Wp.shoulder_r.p, a = uaFwd * R.DEG;
  const E = V.add(S, V.scale([Math.sin(a), -Math.cos(a), 0], L.UA)), Wt = V.add(E, [Math.sqrt(L.FA * L.FA - dz * dz), 0, -dz]);
  const top = E[1] - liftE;
  const objs = [
    (W) => V.sub(W.elbow_r.p, E).map((v) => v * 3),
    (W) => V.sub(W.wrist_r.p, [Wt[0], top + liftW, Wt[2]]).map((v) => v * 3),
    (W) => V.sub(CU.palmDir(W, 'r'), palmTarget(W, palm)).map((v) => v * 6),
    (W, q) => [q.ch.wrist_r.flex * 0.05, q.ch.wrist_r.dev * 0.05],
  ];
  CU.setArm(p, 'r', { plane: 80, elev: 20, axial: 0, flex: 80, pron: palm === 'up' ? 0 : palm === 'down' ? 175 : 90 });
  const sol = L.solvePose(p, ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron'], objs, { iters: 600, contacts });
  p = sol.pose;
  p.ch.shoulder_r = { plane: r1(L.wrap(p.ch.shoulder_r.plane)), elev: r1(p.ch.shoulder_r.elev), axial: r1(L.wrap(p.ch.shoulder_r.axial)) }; p.ch.elbow_r = { flex: r1(p.ch.elbow_r.flex) };
  p.ch.wrist_r = { pron: r1(L.wrap(p.ch.wrist_r.pron)), flex: 0, dev: 0 }; p = T3.mirrorArm(p);
  const W = L.fk(p, contacts);
  const near = r1(W.elbow_r.p[0] - inset), far = r1(W.wrist_r.p[0] - over), BENCH_LEN = 110;
  const bench = { id: 'bench', kind: 'bench', center: [r1((near + far) / 2), 0, 0], size: [r1(far - near), r1(top), BENCH_LEN] };
  const res = objs.slice(0, 3).map((f) => +Math.hypot(...f(W, p)).toFixed(2));
  return { pose: p, contacts, bench, res, cost: sol.cost, top: r1(top) };
}

// Wrist curl module on a base { pose, contacts }: keys [[t, angle], ...] on `channel` for the moving wrists; `sides`
// moving wrists ('r' or both); held dumbbells on `held` sides; bench prop (or box) added; whole-loop report and checks.
function wristCurlModule(meta, B, { keys, channel = 'flex', sides = ['r', 'l'], held = ['r', 'l'], bench, grip = 'handle', offset, size = F4.LIGHT, label }) {
  const poses = {}, keyframes = [], names = {};
  for (const [t, v] of keys) {
    const k = `w${v < 0 ? 'm' : 'p'}${Math.abs(v)}`;
    if (!names[k]) { names[k] = 1; const q = clone(B.pose); for (const s of sides) q.ch[`wrist_${s}`] = Object.assign({}, q.ch[`wrist_${s}`], { [channel]: r1(v) }); poses[k] = q; }
    keyframes.push({ t, pose: k });
  }
  const ex = H.module_(meta, B.contacts, poses, keyframes);
  ex.props = [bench, ...held.map((s) => F4.dbProp(s, grip, size, offset))];
  const box = { center: bench.center, size: bench.size };
  const rep = F4.forearmLoop(ex, { box, still: ['elbow_r', 'wrist_r'] });
  // channel range over the loop (forearmLoop reports flex only)
  const vals = keys.map((k) => k[1]); rep.range = [Math.min(...vals), Math.max(...vals)];
  // forearm on the support: lowest forearm surface above the support top (cm; negative = sunk into it)
  const W0 = L.fk(B.pose, B.contacts);
  rep.forearmOn = +CU.shapePlaneDist(W0, 'forearm_r', [0, bench.size[1], 0], [0, 1, 0]).toFixed(2);
  if (B.bench) { // kneeling: nothing but the forearms and hands may touch the bench (the body is still, so one pose)
    const BK = require('./b3-back'), [cx, , cz] = bench.center, [sx, sy, sz] = bench.size;
    rep.bodyBench = BK.bodyBoxClear(W0, [{ id: 'bench', c: [cx, sy / 2, cz], ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], h: [sx / 2, sy / 2, sz / 2] }], ['forearm_r', 'forearm_l', 'hand_r', 'hand_l', 'thumb_r', 'thumb_l']);
  }
  return { ex, rep, W0 };
}
function wristCurlFinish(ex, rep, label, extra = '', { minBox = 0 } = {}) {
  console.log(`${label}: wrote ${L.write(ex)}\n  ${extra}\n  ${JSON.stringify(rep)}`);
  if (rep.slide > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
  if (rep.body.d < 0 || rep.dbFloor < 0 || (rep.box != null && rep.box < minBox) || (rep.pair != null && rep.pair < 0.5)) { console.error('FAIL: dumbbell clearance'); process.exitCode = 1; }
  if (rep.drift > 0.05) { console.error('FAIL: forearm moves'); process.exitCode = 1; }
  if (rep.bodyBench && rep.bodyBench.d < -0.5) { console.error('FAIL: body into the bench'); process.exitCode = 1; }
}
module.exports.seatedBase = seatedBase; module.exports.kneelBase = kneelBase; module.exports.wristCurlModule = wristCurlModule; module.exports.wristCurlFinish = wristCurlFinish;

// Seated or kneeling wrist curl author: base 'seated' | 'kneel', options for the base, channel, keys, sides/held, texts.
function wristCurl(meta, { base = 'seated', baseOpt = {}, channel = 'flex', keys, sides = ['r', 'l'], held = ['r', 'l'], wristRow, wristText, tempo, label, free = false, minBox = 0 }) {
  const B = base === 'seated' ? seatedBase(baseOpt) : kneelBase(baseOpt);
  const W0 = L.fk(B.pose, B.contacts);
  const bench = base === 'seated' ? F4.benchUnder(W0, { seatH: baseOpt.seatH || 45 }) : B.bench;
  const { ex, rep } = wristCurlModule(meta, B, { keys, channel, sides, held, bench });
  const set = H.setKin(ex), trunk = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
  const [lo, hi] = rep.range, txt = wristText(lo, hi);
  set(wristRow, 'setup', txt[0]); set(wristRow, 'peak', txt[1]);
  const elbow = Math.round(T3.elbowOf(W0, 'r'));
  if (base === 'seated') {
    const m = B.measure(W0);
    set('Forearm on the thigh', 'setup', `Elbow at ${Math.round(m.elbowFrac * 100)}% of the thigh, wrist at ${Math.round(m.wristFrac * 100)}% (just past the knee); elbow ≈${elbow}°`);
    set('Forearm on the thigh', 'peak', `Forearm still (elbow and wrist move ${rep.drift} cm over the loop)`);
    set('Trunk lean', 'setup', `≈${Math.round(trunk)}° forward from vertical`); set('Trunk lean', 'peak', 'Unchanged');
  } else {
    set('Forearm on the bench', 'setup', `Bench ${B.bench.size[1]} cm high, ${B.bench.size[0]} cm deep, set crosswise; elbow just inside the near edge, wrist ${baseOpt.over ?? 2.5} cm past the far edge; elbow ≈${elbow}°`);
    set('Forearm on the bench', 'peak', `Forearm still (elbow and wrist move ${rep.drift} cm over the loop)`);
    set('Kneeling lean', 'setup', `Both knees on the floor, toes tucked; trunk ≈${Math.round(trunk)}° forward from vertical, upper arm ≈${Math.round(V.angle(V.sub(W0.elbow_r.p, W0.shoulder_r.p), [0, -1, 0]))}° forward of vertical`);
    set('Kneeling lean', 'peak', 'Unchanged');
  }
  if (free) { set('Free arm', 'setup', `Left forearm resting in the mirrored position, no dumbbell`); set('Free arm', 'peak', 'Unchanged (constant channels)'); }
  set('Tempo', 'setup', tempo[0]); set('Tempo', 'peak', tempo[1]);
  ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(trunk - 8), max: Math.ceil(trunk + 8) };
  wristCurlFinish(ex, rep, label, `res ${JSON.stringify(B.res)} trunk ${trunk.toFixed(1)} bench ${JSON.stringify(bench)} arm ${JSON.stringify({ sh: B.pose.ch.shoulder_r, el: B.pose.ch.elbow_r, wr: B.pose.ch.wrist_r })}`, { minBox });
  return { ex, rep, B };
}
module.exports.wristCurl = wristCurl;
const degTxt = {
  flex: (v) => (v >= 0 ? `${Math.round(v)}° flexion` : `${Math.round(-v)}° extension`),
  dev: (v) => (v >= 0 ? `${Math.round(v)}° radial deviation (toward the thumb)` : `${Math.round(-v)}° ulnar deviation (toward the little finger)`),
};
module.exports.degTxt = degTxt;
