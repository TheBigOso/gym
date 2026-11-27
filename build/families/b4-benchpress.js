// Bench press family (batch 4): dumbbell chest and triceps presses lying on a flat or inclined bench. Builds on the batch 3
// chest helpers (b3-chest.js: lying on the bench pad with the skinned-mesh sinks, planted feet, press / fly paths, the
// whole-loop sweep) and the triceps helpers (b3-triceps.js: upper-arm and wrist solves for lying extensions).
//  - pressModule: the flat / incline dumbbell press with a pronated (palms toward the feet) or neutral (palms facing) grip,
//    optionally on a custom lying base (the Larsen press with the legs held off the floor).
//  - larsenBase: lying flat, glutes near the seat end, legs straight and hovering (no foot contacts).
//  - extArm: right-arm channels for a lying extension key (upper arm along a world direction, elbow bend, neutral wrist).
//  - restHand: free hand resting on the stomach (single-arm moves), solved for the right arm and mirrored to the left.
//  - finish: shared self-checks and the one-line report.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./b3-chest');
const H = require('./hips');
const T3 = require('./b3-triceps');

const HEAD_LIFT = -9; // same aim of the rig hair shape into the pad as the batch 3 chest family (mesh head rests on the pad)
const d0 = (v) => `≈${Math.round(v)}°`;

// Lying flat with the legs straight out and the feet off the floor (no contacts). The glutes sit near the +X end of the seat
// so the thighs clear its edge; hip extension `hipExt` (negative = legs below the line of the pelvis), knees nearly straight.
function larsenBase({ hipX = 26, hipExt = -12, knee = 4, abd = 7, ankle = -25 } = {}) {
  const B = C.makeBench(0);
  let p = C.layOnBench(B, { headLift: HEAD_LIFT, neckMin: HEAD_LIFT / 2, hipX, pitch: 89, pitchW: 0.8, l5: -8 });
  p.ch.sc_r = clone(C.SC); p.ch.sc_l = clone(C.SC);
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: hipExt, abd, rot: 0 }; p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi: ankle }; }
  delete p.ik;
  return { B, base: p, contacts: [] };
}

// Dumbbell press module. grip 'pronated': right thumb toward the midline (palms toward the feet); 'neutral': thumbs toward
// the head (palms facing each other). The forearms stay vertical under the dumbbells (b3-chest pressPath).
function pressModule(meta, { angle = 0, flare = 55, dip = 22, topTilt = [0.03, 1, 0.12], grip = 'pronated', lying = null, label, kin }) {
  const T = C.phaseT(meta), L0 = lying || C.benchBase(angle), { B, base, contacts } = L0;
  const W0 = L.fk(base, contacts), F = C.trunkFrame(W0), ax = grip === 'neutral' ? F.u : V.scale(F.w, -1);
  const path = C.pressPath(base, { flare, dip, topDir: topTilt, ax, n: 6 }).map((k) => ({ f: k.f, pose: C.mirrorArm(C.strip(k.pose)) }));
  const settle = C.mirrorArm(C.strip(C.pressPath(base, { flare, dip: dip - 1.5, topDir: topTilt, ax, n: 1 })[0].pose));
  const { poses, keyframes } = C.repKeys(path, T, settle);
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props.find((p) => p.id === 'bench').center = B.prop.center;
  const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }] });
  const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
  const m = { W0, Wt, Wb, B, poses, T, sw, fit: C.benchFit(B, W0), dbT: C.dbAt(Wt, 'r'), dbB: C.dbAt(Wb, 'r'), elbowTop: C.elbowFlexOf(Wt), elbowBot: C.elbowFlexOf(Wb), flare: C.elbowFlare(Wb), dip: C.armDip(Wb) };
  kin(H.setKin(ex), m);
  finish(ex, label, m, `top elbow ${m.elbowTop.toFixed(0)} bottom elbow ${m.elbowBot.toFixed(0)} flare ${m.flare.toFixed(0)} dip ${m.dip.toFixed(0)}`);
  return ex;
}

// Shared end of an author: trunk-flexion measure band, write, one-line report, self-checks
function finish(ex, label, m, extra, { dbGapMin = 1, bodyBenchMax = 2.5 } = {}) {
  const tf = V.angle(V.sub(m.W0.neck_c7.p, m.W0.pelvis.p), [0, 1, 0]);
  ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
  const sw = m.sw;
  console.log(`${label}: wrote ${L.write(ex)}\n  bench ${JSON.stringify(m.fit)} trunk ${tf.toFixed(1)} ${extra}\n  sweep ${JSON.stringify(sw)}`);
  if (sw.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
  if (sw.dbBody > 0.5 || sw.dbBench > 0 || sw.dbFloor < 0 || (sw.dbGap != null && sw.dbGap < dbGapMin) || sw.bodyBench > bodyBenchMax) { console.error('FAIL: dumbbell or body collision'); process.exitCode = 1; }
}

// Right-arm channels for a lying extension key: upper arm along uaDir (world), forearm bending in the plane of faDir (the
// forearm direction at 90 degrees of elbow flexion), elbow flex `flex`, wrist neutral with the palm facing `palm`.
function extArm(pose, uaDir, faDir, flex, palm = [0, 0, -1], guess = [[90, 90, 0], [90, 90, -90], [0, 90, 90], [60, 120, 0]]) {
  const p = clone(pose), ua = T3.upperArm(p, 'r', uaDir, faDir, guess);
  p.ch.shoulder_r = ua.ch; p.ch.elbow_r = { flex: 90 };
  const W = L.fk(p), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)), w = T3.wristTo(p, 'r', fa, palm);
  p.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 }; p.ch.elbow_r = { flex: r1(flex) };
  p.__cost = ua.cost;
  return p;
}

// Free hand resting on the stomach: solve the right arm to the mirrored target (palm down on the abdomen, fingers toward
// the midline) and copy the channels to the left arm. `lift` raises the wrist target above the abdomen shape (cm; the
// skinned hand is thicker than the rig hand at the wrist).
function restHand(pose, { lift = 2.5, along = 0, side = 'l' } = {}) {
  const W = L.fk(pose), g = R.shapeWorld(W, T3.shapeOf('abdomen'));
  const top = T3.extremePt(W, T3.shapeOf('abdomen'), [0, 1, 0]);
  const target = [top[0] + along, top[1] + lift, 9];
  const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
  const q0 = clone(pose); q0.ch.shoulder_r = { plane: 20, elev: 30, axial: 40 }; q0.ch.elbow_r = { flex: 100 }; q0.ch.wrist_r = { pron: 0, flex: 0, dev: 0 };
  const res = L.solvePose(q0, ARM, [
    (Wx) => V.sub(Wx.wrist_r.p, target).map((v) => v * 3),
    (Wx) => { const hq = Wx.wrist_r.q; return [...V.sub(Q.rot(hq, [1, 0, 0]), [0, -1, 0]).map((v) => v * 4), ...V.sub(Q.rot(hq, [0, -1, 0]), V.norm([0.35, 0, -1])).map((v) => v * 2)]; },
    (Wx, q) => [q.ch.wrist_r.flex * 0.05, q.ch.wrist_r.dev * 0.05],
    (Wx) => { const e = Wx.elbow_r.p; return [Math.min(0, e[2] - 24) * 2]; }, // elbow beside the trunk, not on it
  ], { iters: 500 });
  const p = clone(pose);
  for (const j of ['shoulder', 'elbow', 'wrist']) p.ch[`${j}_${side}`] = clone(res.pose.ch[`${j}_r`]);
  p.ch[`shoulder_${side}`] = { plane: r1(p.ch[`shoulder_${side}`].plane), elev: r1(p.ch[`shoulder_${side}`].elev), axial: r1(p.ch[`shoulder_${side}`].axial) };
  return { pose: p, cost: res.cost, target };
}

module.exports = { HEAD_LIFT, d0, larsenBase, pressModule, finish, extArm, restHand };

// Pullover (straight or bent arm): lying along a flat bench with the head near its end, feet planted. One dumbbell with both
// palms cupping the top plate ('end' grip on the right hand with the batch 3 pullover offset; the left hand mirrors it).
// mode 'straight': the dumbbell stays in line with the (nearly straight) arms along an arc from over the chest to behind
// the head, aimed `dip` deg below (+) / above (-) the line of the back at the bottom (same objectives as the batch 3
// pullover). mode 'bent': the upper arms swing from `topFlex` to `botFlex` degrees of shoulder flexion (sagittal plane, in
// the trunk frame: 90 = vertical, 180 = in line with the trunk overhead) with the elbows held at `elbow` deg of flexion,
// hands together at the midline. Returns { ex, path, base, B, contacts, foot, W0, F, sw, extra }.
const PULL_GRIP = 'end', PULL_OFF = [-7, 6.5, 0];
function pulloverModule(meta, { mode = 'straight', grip = 'end', elbow = 4, elbowBot = null, dip = -10, topFlex = 90, botFlex = 170, hipX = 2, n = 7, scUp = 26 }) {
  // grip 'end': both palms cup the top plate; 'handle2': both fists side by side on the handle (overhand), the dumbbell
  // centred between them (player offset shifted 4.5 cm toward the right thumb) with its axis across the body (Z)
  const GR = grip === 'handle2' ? 'handle' : PULL_GRIP, OFF = grip === 'handle2' ? [7.2, 2.2, -4.5] : PULL_OFF;
  const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(0, { hipX });
  const W0 = L.fk(base, contacts), F = C.trunkFrame(W0), mid = F.mid, S = W0.shoulder_r.p;
  const sag = (deg) => V.norm(V.add(V.scale(F.v, Math.sin(deg * R.DEG)), V.scale(F.u, -Math.cos(deg * R.DEG)))); // flexion angle -> direction (90 = out of the chest)
  const dTopS = [0, 1, 0], dBotS = V.norm(V.sub(F.u, V.scale(F.v, Math.tan(dip * R.DEG))));
  function key(f, prev) {
    const eb = elbowBot == null ? elbow : r1(elbow + (elbowBot - elbow) * f);
    const p = clone(base); p.ch.sc_r = { protract: r1(C.SC.protract + 6 * (1 - f)), elevate: r1(4 + scUp * f) };
    const prevCh = prev && clone(prev.ch);
    let extra;
    if (mode === 'straight') {
      const d = C.slerpV(dTopS, dBotS, f);
      extra = (W, q) => {
        const db = C.dbAt(W, 'r', GR, OFF), rel = V.sub(db.c, mid), off = V.sub(rel, V.scale(d, V.dot(rel, d)));
        const palm = V.norm(Q.rot(W.wrist_r.q, [1, 0, 0])), a2 = V.norm([db.ax[0], db.ax[1], 0]);
        return [db.c[2] * 3, ...off.map((v) => v * 2), ...V.sub(a2, d).map((v) => v * 15), db.ax[2] * 10, (V.dot(palm, V.scale(F.w, -1)) - 1) * 4];
      };
    } else {
      const a = topFlex + (botFlex - topFlex) * f, d = sag(a), fa = sag(a + eb); // forearm folds toward the head
      extra = (W) => {
        const db = C.dbAt(W, 'r', GR, OFF), palm = V.norm(Q.rot(W.wrist_r.q, [1, 0, 0])), fw = V.sub(W.wrist_r.p, W.elbow_r.p), fs = V.norm([fw[0], fw[1], 0]), E = V.add(W.shoulder_r.p, V.scale(d, L.UA)); // elbow from the current (elevated) shoulder
        if (grip === 'handle2') return [...V.sub(W.elbow_r.p, E).map((v, i) => v * (i === 2 ? 0.5 : 2)), Math.min(0, W.elbow_r.p[2] - 10) * 3, ...V.sub(fs, fa).map((v) => v * 6), db.c[2] * 3, db.ax[0] * 10, db.ax[1] * 10];
        return [...V.sub(W.elbow_r.p, E).map((v, i) => v * (i === 2 ? 0.5 : 2)), Math.min(0, W.elbow_r.p[2] - 10) * 3, ...V.sub(fs, fa).map((v) => v * 6), db.c[2] * 3, db.ax[2] * 10, (V.dot(palm, V.scale(F.w, -1)) - 1) * +(process.env.PALMW ?? 3)];
      };
    }
    const grid = [];
    if (mode === 'bent') for (const plane of [60, 90, 120]) for (const axial of [-90, -45, 0, 45, 90]) for (const pron of [-60, 0, 60]) grid.push({ shoulder_r: { plane, elev: 70 + 95 * f, axial }, elbow_r: { flex: eb }, wrist_r: { pron, flex: 0, dev: 0 } });
    const seeds = prev ? [{ shoulder_r: prevCh.shoulder_r, elbow_r: prevCh.elbow_r, wrist_r: prevCh.wrist_r }, ...grid] : [...grid,{ shoulder_r: { plane: 90, elev: 90, axial: 0 }, elbow_r: { flex: elbow }, wrist_r: { pron: 0, flex: 0, dev: 0 } }, { shoulder_r: { plane: 80, elev: 90, axial: 30 }, elbow_r: { flex: elbow }, wrist_r: { pron: -30, flex: 0, dev: 0 } }, { shoulder_r: { plane: 100, elev: 90, axial: -30 }, elbow_r: { flex: elbow }, wrist_r: { pron: 30, flex: 0, dev: 0 } }, { shoulder_r: { plane: 90, elev: 70, axial: 0 }, elbow_r: { flex: elbow }, wrist_r: { pron: 0, flex: 0, dev: 0 } }, { shoulder_r: { plane: 90, elev: 70, axial: -60 }, elbow_r: { flex: elbow }, wrist_r: { pron: 60, flex: 0, dev: 0 } }, { shoulder_r: { plane: 70, elev: 70, axial: -90 }, elbow_r: { flex: elbow }, wrist_r: { pron: 90, flex: 0, dev: 0 } }];
    const cont = (W, q) => (prev ? [(q.ch.wrist_r.pron - prevCh.wrist_r.pron) * 0.01, (q.ch.shoulder_r.axial - prevCh.shoulder_r.axial) * 0.01] : []);
    const out = C.solveArmDB(p, { c: null, ax: null, grip: GR, off: OFF, elbowFlex: eb, seeds, extra: (W, q) => [...extra(W, q), ...cont(W, q), (q.ch.shoulder_r.axial || 0) * 0.02, (q.ch.wrist_r.pron || 0) * 0.02], wristW: mode === 'bent' ? +(process.env.WRW ?? 0.04) : 0.03 });
    if (process.env.PDEBUG) { const W = L.fk(out); console.log('  key', f.toFixed(2), 'extra', extra(W, out).map((v) => v.toFixed(2)).join(' '), 'ch', JSON.stringify(out.ch.shoulder_r), JSON.stringify(out.ch.wrist_r), out.ch.elbow_r.flex); }
    return out;
  }
  const path = []; let prev = null;
  for (let i = 0; i <= n; i++) { const q = key(i / n, prev); path.push({ f: 1 - i / n, pose: C.mirrorArm(C.strip(q)), cost: q.__cost }); prev = q; }
  path.reverse();
  const settle = C.mirrorArm(C.strip(key(0.985, path[1].pose)));
  const { poses, keyframes } = C.repKeys(path, T, settle);
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props.find((p) => p.id === 'bench').center = B.prop.center;
  ex.props.find((p) => p.id === 'dbR').attach.offset = OFF;
  const both = [/^(hand|thumb|forearm)_[rl]$/];
  let sh = [999, -999], el = [999, -999];
  const flexOf = (W) => { const F2 = C.trunkFrame(W), ua = V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); return Math.atan2(V.dot(ua, F2.u), V.dot(ua, F2.v)) / R.DEG + 90; };
  const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: GR, off: OFF, skip: both }], probe: (W) => { const s = flexOf(W), e = C.elbowFlexOf(W); sh = [Math.min(sh[0], s), Math.max(sh[1], s)]; el = [Math.min(el[0], e), Math.max(el[1], e)]; } });
  const headTop = Math.min(...rig.shapes.filter((s) => /^(hair|head)$/.test(s.id)).map((s) => { const g = R.shapeWorld(W0, s); return g.c[0] - Math.hypot(g.axes[0][0], g.axes[1][0], g.axes[2][0]); }));
  return { ex, path, poses, base, B, contacts, foot, W0, F, T, sw, sh, el, flexOf, headTop, fit: C.benchFit(B, W0), dbAt: (W) => C.dbAt(W, 'r', GR, OFF) };
}
module.exports.pulloverModule = pulloverModule;
