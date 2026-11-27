// Lunge family (batch 2): split stance and stepping. Each leg has two contacts on the same chain:
//   leg_<s>  flat foot (heel down)          ball_<s>  on the ball of the foot (heel up, BALL_PITCH degrees)
// Only one is weighted at a time; a swinging foot has both at weight 0. Every key pose stores leg channels fitted to the
// IK solution, so weight blends are seamless and the stored channels match what is drawn.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;

const qArr = (q) => q.map((v) => +v.toFixed(6));
const BALL_PITCH = 64;
// Rolling a planted flat foot up onto its ball keeps the ball of the foot in place: the ankle moves forward this far (cm)
const BALL_SHIFT = 7.8;   // back foot heel-up angle in a lunge (rig foot segment from the floor; the heel stays high, toes bent)
const footQ = (pitch = 0, yaw = 0) => Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch)); // pitch > 0 = heel up
const footShape = (s) => rig.shapes.find((x) => x.id === `foot_${s}`);
const footMinY = (W, s) => { const g = R.shapeWorld(W, footShape(s)); return g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);

function makeFamily({ toe = 6, half = 9 } = {}) {
  const contacts = [];
  for (const s of ['r', 'l']) {
    const yaw = s === 'r' ? -toe : toe;
    contacts.push(Object.assign(L.legContact(s), { handRot: qArr(footQ(0, yaw)) }));
    contacts.push(Object.assign(L.legContact(s), { id: `ball_${s}`, label: `${s === 'r' ? 'Right' : 'Left'} foot (ball)`, handRot: qArr(footQ(BALL_PITCH, yaw)) }));
  }
  const st = L.POSES.standing({ stance: half, toeOut: toe });
  // ankle height that puts the ball of a heel-up foot on the floor
  const ANK_BALL = (() => { const p = clone(st.pose); p.ik = { ball_r: { target: [0, 12, half], weight: 1 } }; return r1(12 - footMinY(L.fk(p, contacts), 'r') + 0.1); })();
  const ANK_FLAT = L.ANKLE_H;
  const BALL_X = 12.5; // ball of a flat foot, cm in front of the ankle
  // Ankle target that keeps the ball of the foot at ballX on the floor for a heel-up pitch (deg): solved on the foot shape
  const lowPoint = (W, s) => { const g = R.shapeWorld(W, footShape(s)); const ny = Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); return V.sub(g.c, V.scale(V.add(V.add(V.scale(g.axes[0], g.axes[0][1]), V.scale(g.axes[1], g.axes[1][1])), V.scale(g.axes[2], g.axes[2][1])), 1 / ny)); };
  const rollContact = (s, pitch) => Object.assign(L.legContact(s), { id: `roll_${s}`, handRot: qArr(footQ(pitch, s === 'r' ? -toe : toe)) });
  const rollCache = {};
  function rollTarget(s, pitch, ballX, z) { // solved once at the origin (standing pose) and shifted, so it works anywhere on the floor
    if (pitch <= 0.01) return [r1(ballX - BALL_X), ANK_FLAT, z];
    const k = `${s}${pitch}${z}`;
    if (!rollCache[k]) {
      const c = rollContact(s, pitch), res = (x) => { const p = clone(st.pose); p.ik = { [c.id]: { target: [x[0], x[1], z], weight: 1 } }; const lp = lowPoint(L.fk(p, [c]), s); return [(lp[0] - BALL_X) * 3, (lp[1] - 0.1) * 3]; };
      rollCache[k] = R.solveLM([pitch / 10, ANK_FLAT + pitch / 6], res, { iters: 200 }).x;
    }
    const x = rollCache[k];
    return [r1(x[0] + ballX - BALL_X), r1(x[1]), z];
  }

  // spec: { root: [x, y, z], pitch, spine: {l5,t12,t6}, feet: { r: { c: 'flat'|'ball', x, z, lift, w }, l: ... }, arms(p) }
  function build(spec) {
    const p = clone(st.pose);
    p.root.pos = spec.root.slice(); p.root.rot = { pitch: spec.pitch || 0, ...(spec.rot || {}) };
    const sp = spec.spine || { l5: 0, t12: 0, t6: 0 };
    Object.assign(p.ch, { spine_l5: { rot: 0, flex: sp.l5, latFlex: 0 }, spine_t12: { rot: 0, flex: sp.t12, latFlex: 0 }, spine_t6: { rot: 0, flex: sp.t6, latFlex: 0 } });
    const lean = -(spec.pitch || 0) + sp.l5 + sp.t12 + sp.t6;
    p.ch.neck_c7 = { rot: 0, flex: r1(-lean * 0.4) }; p.ch.head_c1 = { rot: 0, flex: r1(-lean * 0.45) };
    p.ik = {};
    for (const s of ['r', 'l']) {
      const f = spec.feet[s], y = (f.c === 'ball' ? ANK_BALL : ANK_FLAT) + (f.lift || 0), zz = r1(f.z ?? (s === 'r' ? half : -half));
      if (f.c === 'roll') { // foot rolling about the ball: pure FK this key (both contacts at weight 0), channels fitted to the rolled foot
        const tgt = rollTarget(s, f.pitch, f.ballX, zz);
        for (const c of ['leg', 'ball']) p.ik[`${c}_${s}`] = { target: tgt.slice(), weight: 0 };
        p.ik.__fit = p.ik.__fit || {}; p.ik.__fit[s] = { roll: f.pitch, target: tgt }; continue;
      }
      const tgt = [r1(f.x), r1(y), zz];
      if (f.c === 'flat' && (f.w ?? 1) === 0 && (f.lift || 0) > 1.5) { // a swinging foot: toes relaxed slightly down (keeps the ankle in range)
        for (const c of ['leg', 'ball']) p.ik[`${c}_${s}`] = { target: tgt.slice(), weight: 0 };
        p.ik.__fit = p.ik.__fit || {}; p.ik.__fit[s] = { roll: f.pitch ?? Math.min(15, 2.5 * f.lift), target: tgt }; continue; // low feet stay nearly level
      }
      for (const c of ['leg', 'ball']) p.ik[`${c}_${s}`] = { target: tgt.slice(), weight: (f.c === (c === 'leg' ? 'flat' : 'ball')) ? (f.w ?? 1) : 0 };
      p.ik.__fit = p.ik.__fit || {}; p.ik.__fit[s] = f.c === 'ball' ? 'ball' : 'leg';
    }
    return p;
  }
  // Fit leg channels to the full-weight IK solution of the chosen contact (also for swinging feet)
  const LEG_PATHS = (s) => [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
  function fitLegs(p) {
    const fit = p.ik.__fit; delete p.ik.__fit;
    let q = p;
    for (const s of ['r', 'l']) {
      let Wi;
      if (typeof fit[s] === 'object') { const c = rollContact(s, fit[s].roll), tmp = clone(q); tmp.ik = { [c.id]: { target: fit[s].target, weight: 1 } }; Wi = L.fk(tmp, [c]); }
      else { const id = `${fit[s]}_${s}`, tmp = clone(q); tmp.ik = { [id]: { target: q.ik[id].target, weight: 1 } }; Wi = L.fk(tmp, contacts); }
      // small pull on hip rotation picks the natural branch when the knee is straight (rotation is then nearly free)
      const objs = [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2), L.obj.reg(`ch.hip_${s}.rot`, 0, 0.03)];
      let best = null; // a few starts: the hip angles have equivalent branches (keep the one with natural rotation)
      for (const h of [q.ch[`hip_${s}`], { flex: 20, abd: 25, rot: 0 }, { flex: 70, abd: 5, rot: 0 }, { flex: -10, abd: 5, rot: 0 }]) {
        const q0 = clone(q); q0.ch[`hip_${s}`] = { ...h };
        const r = L.solvePose(q0, LEG_PATHS(s), objs, { iters: 250 });
        if (!best || r.cost < best.cost - 1e-6) best = r;
      }
      q = best.pose;
    }
    return q;
  }
  // Solve root height (and optionally x) so a planted leg reaches a knee angle, other residuals optional
  function solveRoot(spec, { knee, side = 'r', paths = ['root.1'], extra = [] }) {
    const set = (x) => { const s2 = clone(spec); paths.forEach((pp, i) => { if (pp === 'root.0') s2.root[0] = x[i]; if (pp === 'root.1') s2.root[1] = x[i]; if (pp === 'root.2') s2.root[2] = x[i]; if (pp === 'pitch') s2.pitch = x[i]; }); return s2; };
    const res = (x) => { const s2 = set(x), W = L.fk(build(s2), contacts); return [(kneeOf(W, side) - knee) * 0.5, ...extra.flatMap((f) => f(W))]; };
    const x0 = paths.map((pp) => (pp === 'pitch' ? spec.pitch || 0 : spec.root[+pp.split('.')[1]]));
    const sol = R.solveLM(x0, res, { iters: 300 });
    return set(sol.x.map(r1));
  }
  // Hands on hips: wrists on the iliac crests, elbows out to the side (fixed in the pelvis frame)
  function handsOnHips(p) {
    const W = L.fk(p), P = W.pelvis;
    const target = V.add(P.p, Q.rot(P.q, [1, 9, 15.5])), elbow = V.add(P.p, Q.rot(P.q, [-6, 22, 30]));
    const q = L.armToTarget(p, target, { wrist: { pron: -80, flex: 15, dev: 20 }, axial: 0, axialW: 0.005, guess: [10, 40, 40], extra: (Wx) => V.sub(Wx.elbow_r.p, elbow).map((v) => v * 0.8) });
    ['shoulder', 'elbow', 'wrist'].forEach((j) => { q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]); });
    q.ch.sc_r = { protract: 2, elevate: 2 }; q.ch.sc_l = { protract: 2, elevate: 2 };
    return q;
  }
  function armsForward(p) {
    const W = L.fk(p), S = W.shoulder_r.p;
    const q = L.armToTarget(p, [S[0] + L.reach(6) * 0.995, S[1] - 2, S[2] - 2], { flex: 6, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess: [90, 90, 0] });
    ['shoulder', 'elbow', 'wrist'].forEach((j) => { q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]); });
    q.ch.sc_r = { protract: 8, elevate: 2 }; q.ch.sc_l = { protract: 8, elevate: 2 };
    return q;
  }
  function pose(spec) {
    let p = build(spec);
    if (spec.arms) p = spec.arms(p);
    return fitLegs(p);
  }
  // Whole-loop report: floor, slides of planted contacts, knee range per leg, back-knee floor clearance
  function report(ex) {
    const tl = R.buildTimeline(ex), D = ex.timeline.duration;
    const out = { floor: 1e9, floorAt: null, kneeR: [999, 0], kneeL: [999, 0], kneeYmin: 1e9, slide: 0, hipExtMin: 0 };
    let prev = null;
    for (let i = 0; i <= 1200; i++) {
      const t = (i / 1200) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, contacts);
      const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
      const kr = kneeOf(W, 'r'), kl = kneeOf(W, 'l');
      out.kneeR = [Math.min(out.kneeR[0], kr), Math.max(out.kneeR[1], kr)]; out.kneeL = [Math.min(out.kneeL[0], kl), Math.max(out.kneeL[1], kl)];
      out.kneeYmin = Math.min(out.kneeYmin, W.knee_r.p[1], W.knee_l.p[1]);
      out.hipExtMin = Math.min(out.hipExtMin, pz.ch.hip_r.flex, pz.ch.hip_l.flex);
      for (const c of contacts) { const k = pz.ik[c.id]; if (!k || k.weight < 0.999) continue; out.slide = Math.max(out.slide, V.len(V.sub(W[c.chain[2]].p, k.target))); if (prev && prev[c.id] && prev[c.id].weight >= 0.999) out.slide = Math.max(out.slide, V.len(V.sub(k.target, prev[c.id].target))); }
      prev = clone(pz.ik);
    }
    for (const k of ['floor', 'kneeYmin', 'slide', 'hipExtMin']) out[k] = +out[k].toFixed(2);
    out.kneeR = out.kneeR.map(Math.round); out.kneeL = out.kneeL.map(Math.round);
    return out;
  }
  // Split stance (front leg 'fs' flat at frontX, other leg on its ball at backX): reachable top and bottom specs
  function split(fs, frontX, backX, { kneeTop = 22, backTop = 33, kneeBottom = 92, backKneeY = 13, pitchTop = -14, pitchBottom = -12, z = 0 } = {}) {
    const bs = fs === 'r' ? 'l' : 'r';
    const base = (pitch) => ({ root: [r1((frontX + backX) / 2 + 3), 80, z], pitch, spine: { l5: -2, t12: 0, t6: 0 }, feet: { [fs]: { c: 'flat', x: frontX }, [bs]: { c: 'ball', x: backX } } });
    const top = solveRoot(base(pitchTop), { knee: kneeTop, side: fs, paths: ['root.0', 'root.1'], extra: [(W) => [(kneeOf(W, bs) - backTop) * 0.5]] });
    const bottom = solveRoot(base(pitchBottom), { knee: kneeBottom, side: fs, paths: ['root.0', 'root.1'], extra: [(W) => [(W[`knee_${bs}`].p[1] - backKneeY) * 0.5]] });
    const at = (f) => { const s2 = clone(top); s2.root = top.root.map((v, i) => r1(v + (bottom.root[i] - v) * f)); s2.pitch = r1(top.pitch + (bottom.pitch - top.pitch) * f); return s2; };
    return { top, bottom, at };
  }
  // Standing root height for given feet (knee of the named leg at kneeDeg)
  // Root height for a knee angle by bisection (knee flexion falls monotonically as the pelvis rises; LM stalls at full reach)
  function rootY(spec, knee, side = 'r') {
    let a = 30, b = 105;
    for (let i = 0; i < 50; i++) { const y = (a + b) / 2, s2 = clone(spec); s2.root[1] = y; if (kneeOf(L.fk(build(s2), contacts), side) > knee) a = y; else b = y; }
    const s2 = clone(spec); s2.root[1] = r1((a + b) / 2); return s2;
  }
  function stand(feet, { knee = 4, side = 'r', x = 0, z = 0, pitch = 0, spine } = {}) {
    return rootY({ root: [x, 88, z], pitch, spine: spine || { l5: 0, t12: 0, t6: 0 }, feet }, knee, side);
  }
  return { rollTarget, BALL_X, split, stand, rootY, contacts, st, half, ANK_BALL, ANK_FLAT, build, pose, solveRoot, handsOnHips, armsForward, report, kneeOf, trunkLean, fk: (p) => L.fk(p, contacts) };
}
module.exports = { makeFamily, kneeOf, trunkLean, BALL_PITCH, BALL_SHIFT };
