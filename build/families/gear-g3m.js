// g3-machines family: shared engines for the lever / plate-loaded / selectorized machine exercises (prop kind
// 'lever_machine', src/gear/lever.js and the frontal-plane extension src/gear/g3-machines-frontal.js).
//
//   arcPress(meta, cfg)  hands on handles that ride a lever arc (presses, pulldowns, curls, dips, rows): the pivot is put
//                        through the turnaround (G0) and start (G1) hand positions, the right arm is solved on the arc
//                        (gear-lever armOnArc), the left arm mirrored (or resting, for one-arm work)
//   handsOnSide(pose)    hands on side handles beside the hips (seated leg machines)
//   rangeOf(a, b, pad)   lever range around two angles
//   gateArms(name, rep, opt) gate with arms to ignore (a resting lever pinned at its stop is fine)
const L = require('../lib');
const { V, r1, clone } = L;
const H = require('./hips');
const C = require('./eq-cable');
const EQ = require('./equip');
const CH = require('./b3-chest');
const GL = require('./gear-lever');

// armOnArc with every key after the first solved from the previous key (the last too), so no key jumps to another
// solution branch; the elbow follows the slerp between the first key's upper arm and a free solve of the last key's
function armOnArcSeq(base, contacts, M, angles, spec = {}) {
  const G = GL.G, arm = M.arms.find((a) => a.id === 'arm_r') || M.arms[0];
  const rx = (r) => { const [x, y, z] = (r || [0, 0, 0]).map((v) => (v * Math.PI) / 180); let v = [0, 0, 1]; v = [v[0] * Math.cos(z) - v[1] * Math.sin(z), v[0] * Math.sin(z) + v[1] * Math.cos(z), v[2]]; v = [v[0] * Math.cos(y) + v[2] * Math.sin(y), v[1], -v[0] * Math.sin(y) + v[2] * Math.cos(y)]; v = [v[0], v[1] * Math.cos(x) - v[2] * Math.sin(x), v[1] * Math.sin(x) + v[2] * Math.cos(x)]; return v; };
  const zax = rx(M.P.endRot);
  const ax = (a) => { const o = G.leverPivot(M.P, arm), w = M.toWorld(G.leverRotate(M.P, arm, V.add(o, zax), a)); return V.norm(V.sub(w, M.toWorld(o))); };
  const one = (a, guess, elbow, w) => C.armR(base, contacts, { grip: GL.endAt(M, arm, a), axis: ax(a), palm: spec.palm, wPalm: spec.wPalm ?? 2, elbow, wElbow: w, guess, wGrip: 4 });
  const n = angles.length - 1, p0 = one(angles[0], spec.g0 || { plane: -30, elev: 55, axial: 10, pron: 128, flex: 130 }, spec.elbow0, spec.elbow0 ? 0.6 : 0);
  const p1 = one(angles[n], spec.g1 || { plane: 95, elev: 80, axial: -80, pron: 175, flex: 15 }, spec.elbow1, spec.elbow1 ? 0.6 : 0);
  const ua = (p) => { const W = L.fk(p, contacts); return V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); };
  const d0 = ua(p0), d1 = ua(p1), S = L.fk(base, contacts).shoulder_r.p, out = []; let g = C.guessOf(p0), worst = 0;
  for (let i = 0; i <= n; i++) {
    const f = i / n, E = V.add(S, V.scale(CH.slerpV(d0, d1, f), L.UA));
    const p = i === 0 ? p0 : one(angles[i], g, E, spec.wElbow ?? 1.5);
    worst = Math.max(worst, p.__err.grip); g = C.guessOf(p); out.push({ f, a: angles[i], pose: p });
  }
  out.worstGrip = worst;
  return out;
}
const rangeOf = (a, b, pad = 5) => [r1(Math.min(a, b) - pad), r1(Math.max(a, b) + pad)];

// hands on fore-aft side handles beside the hips (seated machines): returns { pose, grip }
function handsOnSide(base, contacts = [], { dx = 8, dy = 6, z = 24, top } = {}) {
  const W0 = L.fk(base, contacts);
  const G = [r1(W0.hip_r.p[0] + dx), r1(top + dy), z];
  const armed = C.armR(base, contacts, { grip: G, axis: [1, 0, 0], guess: { plane: 10, elev: 15, axial: 0, pron: 90, flex: 20 } });
  C.mirrorArm(armed); delete armed.__err;
  return { pose: armed, grip: EQ.gripPoint(L.fk(armed, contacts), 'r').p };
}
const sideBars = (grip, len = 22) => [{ c: [r1(grip[0]), r1(grip[1]), r1(grip[2])], size: [len, 1.6], kind: 'bar', rot: [0, 90, 0] }, { c: [r1(grip[0]), r1(grip[1]), -r1(grip[2])], size: [len, 1.6], kind: 'bar', rot: [0, 90, 0] }];

// gate that ignores some arms (a lever resting at its stop) and optional parts
function gateArms(name, rep, { ignore = [], ignoreParts = [], ...opt } = {}) {
  const r = clone(rep);
  for (const a of ignore) delete r.arms[a];
  for (const k of Object.keys(r.clear)) if (ignoreParts.some((re) => re.test(k))) delete r.clear[k];
  return GL.gate(name, r, opt);
}

// cfg: { type, params (machine overrides), base(M0) -> { pose, contacts, planted }, arc(W0, S, Fr, M0) -> { G0, G1, radius,
// side }, palm(Fr, W0) -> world dir, elbow0 / elbow1 (W0, S, Fr, G0, G1) -> world point, wElbow, NK, uni: (pose) -> pose with
// the left arm at rest, rangePad, endRot, maxOffArc, partSkip }
function arcPress(meta, cfg) {
  const M0 = GL.machine(cfg.type, cfg.params || {});
  const st = cfg.base ? cfg.base(M0) : (() => { const s = GL.seated(M0, { feet: 'floor', knee: 90, stance: 16, footAhead: 6, ...(cfg.seat || {}) }); return { pose: s.pose, contacts: s.contacts, planted: ['leg_r', 'leg_l'], fit: s.fit }; })();
  const base = clone(st.pose);
  if (!cfg.keepHead) { base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 6 }; }
  if (cfg.prep) cfg.prep(base);
  const W0 = L.fk(base, st.contacts), S = W0.shoulder_r.p, Fr = CH.trunkFrame(W0);
  const arc = cfg.arc(W0, S, Fr, M0);
  const pv = arc.pivot ? { pivot: M0.toLocal(arc.pivot).map(r1), end: M0.toLocal(arc.G0).map(r1) } : GL.pivotThrough(M0, arc.G0, arc.G1, arc.radius, arc.side ?? 1);
  if (arc.pivot) pv.pivot[2] = 0;
  const M1 = GL.machine(cfg.type, { ...(cfg.params || {}), pivot: pv.pivot, end: pv.end, range: [-179, 179] });
  const A1 = r1(GL.G.leverAngle(M1.P, M1.arms[0], M1.toLocal(arc.G1)));
  const range = cfg.range ? cfg.range(A1) : rangeOf(0, A1, cfg.rangePad ?? 5);
  const M = GL.machine(cfg.type, { ...(cfg.params || {}), pivot: pv.pivot, end: pv.end, range, ...(cfg.uni ? { only: 'r' } : {}), ...(cfg.extra ? cfg.extra(W0, S, arc) : {}) });
  const NK = cfg.NK ?? 8, ease = cfg.ease || ((f) => Math.sin((f * Math.PI) / 2));
  const angs = Array.from({ length: NK + 1 }, (_, i) => r1(A1 * ease(i / NK)));
  const palm = cfg.palm(Fr, W0);
  const spec = { palm, wElbow: cfg.wElbow ?? 0.5, wPalm: cfg.wPalm };
  if (cfg.elbow0) spec.elbow0 = cfg.elbow0(W0, S, Fr, arc.G0, arc.G1);
  if (cfg.elbow1) spec.elbow1 = cfg.elbow1(W0, S, Fr, arc.G0, arc.G1);
  if (cfg.g0) spec.g0 = cfg.g0; if (cfg.g1) spec.g1 = cfg.g1;
  const raw = (cfg.seq ? armOnArcSeq : GL.armOnArc)(base, st.contacts, M, angs, spec);
  const path = raw.map((k) => ({ f: k.f, pose: cfg.uni ? C.strip(cfg.uni(CH.strip(k.pose))) : C.mirrorArm(CH.strip(k.pose)) }));
  const T = CH.phaseT(meta);
  const { poses, keyframes } = CH.repKeys(path, T, null);
  const ex = H.module_(meta, st.contacts, poses, keyframes);
  ex.props = [...(st.props || []), M.prop, ...GL.handProps(cfg.uni ? ['r'] : ['r', 'l'])];
  const rep = GL.track(ex, M, { planted: st.planted || [], partSkip: cfg.partSkip || { seat: /^(hand|thumb|forearm)_/, back: /^(hand|thumb|forearm)_/ } });
  gateArms(meta.exercise.id, rep, { maxOffArc: cfg.maxOffArc ?? 0.8, ignore: cfg.uni ? ['arm_l'] : [], ignoreParts: [...(cfg.ignoreParts || []), ...(cfg.uni ? [/^arm_l:/] : [])] });
  C.limits(ex.poses);
  return { ex, M, rep, poses, base, st, A1, arc, W0, S, Fr, worstGrip: raw.worstGrip, set: H.setKin(ex), Wt: L.fk(poses.top, st.contacts), Wb: L.fk(poses.bottom, st.contacts) };
}
const deg = (v) => `≈${Math.round(v)}°`;
const offArcOf = (rep) => Math.max(...Object.values(rep.arms).map((a) => a.offArc));
function summary(name, R) { return `${name}: wrote ${L.write(R.ex)}\n  pivot ${R.M.P.pivot} end ${R.M.P.end} range ${R.M.P.range} A1 ${R.A1} grip ${R.worstGrip}\n  ${JSON.stringify({ floor: R.rep.floor, slide: R.rep.slide, arms: R.rep.arms, clear: R.rep.clear })}`; }

// fill the standard press kinematics rows (rows missing from the meta are skipped)
function kinPress(R, { grip, top = 'with the arms extended', bottom = 'at the turnaround', rows = {}, tempo = ['Pause 0.5 s at the start', '2 s back, 0.3 s pause, 1.3 s press'] } = {}) {
  const { set, Wt, Wb, M, rep } = R, has = (k) => R.ex.exercise.kinematics.some((x) => x.measure.startsWith(k)), put = (k, a, b) => { if (has(k)) { set(k, 'setup', a); set(k, 'peak', b); } };
  put('Elbow flexion', `${deg(C.elbowAng(Wt))} ${top}`, `${deg(C.elbowAng(Wb))} ${bottom}`);
  put('Elbow flare', '–', `${deg(CH.elbowFlare(Wb))} from the trunk`);
  if (grip) put('Grip', grip, 'Unchanged');
  put('Lever', `Pivot ${M.P.pivot[1]} cm high, ${r1(M.P.pivot[0] - R.S[0])} cm ${M.P.pivot[0] >= R.S[0] ? 'ahead of' : 'behind'} the shoulders`, `Lever swings ${Math.abs(R.A1)}°; hands within ${offArcOf(rep)} cm of the arc`);
  if (M.P.back) put('Trunk', `Back on the ${M.P.back.angle}° pad`, 'Unchanged');
  for (const [k, [a, b]] of Object.entries(rows)) put(k, a, b);
  put('Tempo', tempo[0], tempo[1]);
  fillDash(R.ex);
}
// rows left empty (reference rows with only a norm) get a dash
function fillDash(ex) { for (const k of ex.exercise.kinematics) { if (!k.setup) k.setup = '–'; if (!k.peak) k.peak = '–'; } }
// left hand resting on the left thigh (one-arm work): solved for the right side and copied over
function restHandOnThigh(pose, contacts = []) {
  const W = L.fk(pose, contacts), mid = V.scale(V.add(W.hip_r.p, W.knee_r.p), 0.5);
  const top = EQ.pointShape(W, V.add(mid, [0, 30, 0]), 'thigh_r');
  const q = C.armR(pose, contacts, { grip: [r1(mid[0] + 4), r1(mid[1] + 30 - top + 3), r1(mid[2] + 2)], palm: [0, -1, 0], guess: { plane: 20, elev: 20, axial: 0, pron: 90, flex: 50 } });
  const out = clone(pose); for (const j of ['shoulder', 'elbow', 'wrist']) out.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  return out;
}
module.exports = { fillDash, armOnArcSeq, kinPress, restHandOnThigh, rangeOf, handsOnSide, sideBars, gateArms, arcPress, deg, offArcOf, summary };

/* ---------------- frontal-plane lever machines (params.axis 'x', src/gear/g3-machines-frontal.js) ---------------- */
const FG = require('../../src/gear/g3-machines-frontal.js');
// opt: { id, center, color, ...params } -> M { prop, P, toLocal, toWorld }
function fmachine(opt = {}) {
  const { id = 'machine', center = [0, 0, 0], color = null, size = null, ...params } = opt;
  const prop = { id, kind: 'lever_machine', center: center.slice(), params: { ...clone(params), axis: 'x' } };
  if (color) prop.color = color;
  const P = FG.frParams(prop);
  const toLocal = (p) => V.sub(p, center), toWorld = (p) => V.add(p, center);
  prop.size = size || [r1(2 * Math.max(Math.abs(P.pivot[0]), Math.abs(P.end[0]), Math.abs((P.frame.x ?? P.pivot[0] - 25))) + 20), r1(P.pivot[1] + 15), r1(2 * Math.max(Math.abs(P.pivot[2]), Math.abs(P.end[2])) + 30)];
  return { prop, P, toLocal, toWorld, frontal: true };
}
const frArm = (side) => FG.frArms.find((a) => a.side === side);
const frEnd = (M, side, deg) => M.toWorld(FG.frEndAt(M.P, frArm(side), deg));
function frGet(M, W) { return { get: (j) => M.toLocal(W[j].p), grip: (s, g) => M.toLocal(EQ.gripPoint(W, s, g).p) }; }
const frTargetOf = (M, W, side) => { const g = frGet(M, W); return M.toWorld(FG.frTarget(M.P, frArm(side), g.get, g.grip)); };
const frAngleOf = (M, W, side) => { const g = frGet(M, W); return FG.frAngle(M.P, frArm(side), FG.frTarget(M.P, frArm(side), g.get, g.grip)); };
// the right axle's (y, z) circle through two world points (same x plane): center on side `side` of the chord
function frPivotThrough(p0, p1, radius, side = 1) {
  const m = [(p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2], d = [p1[1] - p0[1], p1[2] - p0[2]], c = Math.hypot(...d) / 2;
  const h = Math.sqrt(Math.max(0, radius * radius - c * c)), n = [-d[1] / (2 * c), d[0] / (2 * c)];
  return [r1(p0[0]), r1(m[0] + side * n[0] * h), r1(m[1] + side * n[1] * h)];
}
// sampled points of the end pads (world) at the given angles
function frParts(M, ang) {
  const P = M.P, out = [];
  for (const arm of FG.frArms) {
    if (P.endKind === 'handles') continue;
    const [sx, sy, sz] = P.endSize, pts = [];
    for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) for (const k of [-1, 0, 1]) pts.push(FG.frRotate(P, [P.end[0] + (i * sx) / 2, P.end[1] + (j * sy) / 2, P.end[2] + (k * sz) / 2], ang[arm.id] ?? 0));
    out.push({ id: `${arm.id}:end`, pts: pts.map((p) => M.toWorld([p[0], p[1], p[2] * arm.s])) });
  }
  return out;
}
const SHAPE_IDS2 = L.rig.shapes.map((s) => s.id);
function frTrack(ex, M, { planted = [], skip = /^(hand|thumb)_/ } = {}) {
  const arms = { arm_r: { range: [1e9, -1e9], offArc: 0, clamp: 0 }, arm_l: { range: [1e9, -1e9], offArc: 0, clamp: 0 } }, clear = {};
  let i = 0;
  const rep = H.loopReport(ex, { planted, probe: (W, pz, t) => {
    const ang = {};
    for (const s of ['r', 'l']) {
      const id = `arm_${s}`, a = frAngleOf(M, W, s), o = V.len(V.sub(frEnd(M, s, a), frTargetOf(M, W, s))), A = arms[id];
      ang[id] = a; A.range = [Math.min(A.range[0], a), Math.max(A.range[1], a)];
      if (o > A.offArc) { A.offArc = +o.toFixed(2); A.offAt = +t.toFixed(2); }
      if (a <= M.P.range[0] + 1e-6 || a >= M.P.range[1] - 1e-6) A.clamp++;
    }
    if (i++ % 20 === 0) for (const part of frParts(M, ang)) { let best = { d: 1e9 }; for (const p of part.pts) for (const id of SHAPE_IDS2) { if (skip.test(id)) continue; const d = EQ.pointShape(W, p, id); if (d < best.d) best = { d: +d.toFixed(2), id }; } if (!clear[part.id] || best.d < clear[part.id].d) clear[part.id] = { ...best, t: +t.toFixed(2) }; }
  } });
  for (const k in arms) arms[k].range = arms[k].range.map((v) => +v.toFixed(1));
  rep.arms = arms; rep.clear = clear;
  return rep;
}
// elbow point consistent with the shoulder S and grip G (|E - S| = UA, |E - G| = fg), closest to a hint point
function elbowFor(S, G, hint, fg = 32.97) {
  const d = V.sub(G, S), D = V.len(d), u = V.scale(d, 1 / D), a = (L.UA * L.UA - fg * fg + D * D) / (2 * D), r = Math.sqrt(Math.max(0, L.UA * L.UA - a * a));
  const c = V.add(S, V.scale(u, a)), h = V.sub(hint, c), hp = V.sub(h, V.scale(u, V.dot(h, u))), n = V.len(hp) > 1e-6 ? V.scale(hp, 1 / V.len(hp)) : [0, -1, 0];
  return V.add(c, V.scale(n, r));
}
// sequential right-arm solve onto a list of grip targets [{ grip, axis }] (each key from the previous); elbow hints optional
function armOnPath(base, contacts, keys, spec = {}) {
  const out = []; let g = spec.g0 || { plane: 30, elev: 90, axial: 0, pron: 90, flex: 60 }, worst = 0;
  const S0 = L.fk(base, contacts).shoulder_r.p;
  keys.forEach((k, i) => { const el = k.elbow && spec.consistent ? elbowFor(S0, k.grip, k.elbow) : k.elbow; const p = C.armR(base, contacts, { grip: k.grip, axis: k.axis, palm: k.palm || spec.palm, wPalm: spec.wPalm ?? 1, elbow: el, wElbow: k.elbow ? spec.wElbow ?? 1 : 0, guess: g, wGrip: 4 }); worst = Math.max(worst, p.__err.grip); g = C.guessOf(p); out.push(p); });
  out.worstGrip = worst;
  return out;
}
module.exports = Object.assign(module.exports, { FG, fmachine, frEnd, frTargetOf, frAngleOf, frPivotThrough, frParts, frTrack, armOnPath, elbowFor });

/* ---------------- flys on a pec deck (lever_machine type pec_deck, axis 'y') ---------------- */
// cfg: { mode: 'pad' | 'handles', reverse, planeStart, planeTurn, elbow, elev, N, padT }
// The arms are posed directly (shoulder plane sweeps at fixed elevation, axial -90, elbow fixed), so the forearm / hand
// turns about the vertical line through the shoulder joint; each lever axle is put on that line, so pads and handles
// stay on the limb. Path f = 0 at the turnaround, 1 at the start (repKeys order).
function fly(meta, cfg) {
  const { mode = 'pad', reverse = false, planeStart, planeTurn, elbow = 90, elev = 90, N = 8, padT = 7 } = cfg;
  const M0 = GL.machine('pec_deck', reverse ? { back: null } : { back: { angle: 0, h: 70 } });
  const st = GL.seated(M0, { feet: 'floor', knee: 90, stance: 16, footAhead: 6, lean: 0, ...(cfg.seat || {}) });
  const base = clone(st.pose);
  base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: reverse ? 10 : 4 };
  base.ch.sc_r = { protract: reverse ? 4 : 0, elevate: 0 }; base.ch.sc_l = clone(base.ch.sc_r);
  const at = (plane, sc) => { const p = clone(base); p.ch.shoulder_r = { plane: r1(plane), elev, axial: -90 }; p.ch.elbow_r = { flex: elbow }; p.ch.wrist_r = { pron: 90, flex: 0, dev: 0 }; if (sc) p.ch.sc_r = sc; return C.mirrorArm(p); };
  const Wt = L.fk(at(planeTurn), st.contacts), S = Wt.shoulder_r.p;
  let follow, end, endKind, endSize, endRot = [0, 0, 0], armY;
  if (mode === 'pad') {
    const E = Wt.elbow_r.p, ua = V.norm([E[0] - S[0], 0, E[2] - S[2]]); let n = V.norm([-ua[2], 0, ua[0]]); if (n[2] * 1 < 0 && Math.abs(n[2]) > 1e-6) n = V.scale(n, -1); // forward / medial side
    const up = cfg.padUp ?? 15, fp = V.add(E, [0, up, 0]), r = 20 - EQ.pointShape(Wt, V.add(fp, V.scale(n, 20)), 'forearm_r');
    const off = r1(r + padT * 0.62 + 0.3); // square pad (lever.js does not mirror endRot for the left arm, so keep it unrotated)
    follow = { joints: ['shoulder_r', 'elbow_r'], t: 1, off: -off, shift: [0, up, 0] };
    const g = GL.G; const tmp = GL.machine('pec_deck', { pivot: [r1(S[0]), r1(S[1] + 70), r1(S[2])], follow });
    end = GL.targetOf(tmp, Wt, 'arm_r').map(r1); endKind = 'pad'; endSize = [padT, 24, padT];
    armY = r1(end[1] + 19);
  } else {
    follow = { grip: 'handle' }; end = EQ.gripPoint(Wt, 'r').p.map(r1); endKind = 'handles'; endSize = [14, 1.6]; endRot = [90, 0, 0]; armY = r1(end[1] + 14);
  }
  const params = { pivot: [r1(S[0]), r1(S[1] + 70), r1(S[2])], end, armY, endKind, endSize, endRot, follow, stack: reverse ? { x: r1(S[0] + 70), z: 0, h: 120 } : { x: -70, z: 0, h: 120 }, ...(reverse ? { back: null, columns: [[r1(S[0] + 40), 0]] } : { back: { angle: 0, h: 70 } }) };
  if (reverse) { // chest pad in front of the sternum
    let fx = S[0]; const y = S[1] - 16; for (let x = S[0] - 10; x < S[0] + 40; x += 0.25) { if (['ribcage', 'chest', 'pecs_r', 'pecs_l', 'abdomen'].every((id) => !L.rig.shapes.find((s) => s.id === id) || EQ.pointShape(Wt, [x, y, 0], id) > 0.2)) { fx = x; break; } }
    params.pads = [{ c: [r1(fx + 4), r1(y), 0], size: [8, 34, 32], kind: 'box', post: true }];
  }
  const M1 = GL.machine('pec_deck', { ...params, range: [-179, 179] });
  const A1 = r1(GL.angleOf(M1, L.fk(at(planeStart), st.contacts), 'arm_r'));
  const M = GL.machine('pec_deck', { ...params, range: rangeOf(0, A1, 4) });
  const path = []; for (let i = 0; i <= N; i++) { const f = i / N; path.push({ f, pose: at(planeTurn + (planeStart - planeTurn) * f, cfg.sc ? cfg.sc(f) : null) }); }
  const T = CH.phaseT(meta), { poses, keyframes } = CH.repKeys(path, T, null);
  const ex = H.module_(meta, st.contacts, poses, keyframes);
  ex.props = [M.prop, ...(mode === 'handles' ? GL.handProps() : [])];
  const rep = GL.track(ex, M, { planted: ['leg_r', 'leg_l'], partSkip: { seat: /^(hand|thumb|forearm)_/, back: /^(hand|thumb|forearm|upperarm|elbow|triceps|biceps|deltoid)_/, pad0: /^(hand|thumb|forearm|upperarm|elbow|triceps|biceps)_/ } });
  GL.gate(meta.exercise.id, rep, { maxOffArc: cfg.maxOffArc ?? 0.8, minClear: -1.5 });
  C.limits(ex.poses);
  return { ex, M, rep, poses, base, st, A1, S, set: H.setKin(ex), Wt: L.fk(poses.top, st.contacts), Wb: L.fk(poses.bottom, st.contacts) };
}
module.exports.fly = fly;

/* ---------------- assisted pull-up machine: kneeling on a counterweighted lever pad, hands on the top bar ---------------- */
// Built on author-pull-up.js / author-chin-up.js (hands planted on the bar with arm contacts, root height solved per key
// for the elbow angle). The knees rest on a pad carried by a lever_machine arm (single arm, follows both knees) that
// pivots behind the athlete; the pivot is put on the circle through the knee-pad points at the hang and at the top.
// opt: { under (underhand), GZ (grip |z|), TILT, POLE, plane (shoulder plane guess), oneArm, BAR_H, CLEAR }
function assisted(meta, opt = {}) {
  const { R: RR, Q, rig } = L;
  const BAR_H = opt.BAR_H ?? 218, GZ = opt.GZ ?? 26, TILT = opt.TILT ?? 6, CLEAR = opt.CLEAR ?? 3, one = !!opt.oneArm;
  const PB = EQ.pullupBar({ height: BAR_H, width: 120 }), bar = PB.bar, D2R = Math.PI / 180;
  const fl = [0, Math.cos(TILT * D2R), -Math.sin(TILT * D2R)];
  const XL = [opt.under ? -1 : 1, 0, 0], YL = V.scale(fl, -1), ZL = V.cross(XL, YL), rotL = Q.fromBasis(XL, YL, ZL), rotR = Q.mirrorZ(rotL);
  const qA = (q) => q.map((v) => +v.toFixed(6)), POLE = opt.POLE || (opt.under ? [1, -0.3, 0.45] : [0.35, -0.25, 1]);
  const sides = one ? ['r'] : ['r', 'l'];
  const contacts = sides.map((s) => Object.assign(L.handContact(s), { pole: [POLE[0], POLE[1], s === 'r' ? POLE[2] : -POLE[2]], handRot: qA(s === 'r' ? rotR : rotL) }));
  const grip = { r: [bar.c[0], BAR_H, GZ], l: [bar.c[0], BAR_H, -GZ] };
  const wristT = (s) => V.sub(grip[s], Q.rot(s === 'r' ? rotR : rotL, [2.2, -7.2, 0])).map((v) => +v.toFixed(2));
  const WT = { r: wristT('r'), l: wristT('l') };
  const KEY = {
    hang: { flex: 8, sc: { protract: 4, elevate: 24 }, pitch: 0, spine: [0, 0, 0], neck: [0, 0] },
    scap: { flex: 10, sc: { protract: 0, elevate: 8 }, pitch: 2, spine: [-1, -2, -2], neck: [-2, -2] },
    m1: { flex: 55, sc: { protract: -6, elevate: 2 }, pitch: 3, spine: [-2, -3, -3], neck: [-3, -3] },
    m2: { flex: 95, sc: { protract: -12, elevate: -2 }, pitch: 4, spine: [-2, -4, -5], neck: [-4, -4] },
    m3: { flex: 118, sc: { protract: -14, elevate: -6 }, pitch: 5, spine: [-2, -5, -6], neck: [-3, -3] },
    top: { flex: opt.topFlex ?? 140, sc: { protract: -16, elevate: -10 }, pitch: 5, spine: [-2, -5, -6], neck: [-3, -3] },
  };
  const st = L.POSES.standing();
  let restL = null;
  function bodyPose(k, x, y) {
    const p = clone(st.pose); delete p.ik;
    p.root.pos = [x, y, one ? r1(GZ * 0.55) : 0]; p.root.rot = { pitch: k.pitch };
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j] = { rot: 0, latFlex: one ? [1, 3, 3][i] : 0, flex: k.spine[i] }; });
    p.ch.neck_c7 = { rot: 0, flex: k.neck[0] }; p.ch.head_c1 = { rot: 0, flex: k.neck[1] };
    p.ch.sc_r = clone(k.sc); p.ch.sc_l = one ? { protract: 2, elevate: 0 } : clone(k.sc);
    for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: 4, abd: 2, rot: 0 }; p.ch[`knee_${s}`] = { flex: 92 }; p.ch[`ankle_${s}`] = { dorsi: -30 }; }
    p.ch.shoulder_r = { plane: opt.plane ?? 20, elev: 160, axial: 0 }; p.ch.elbow_r = { flex: k.flex };
    if (one) { if (restL) for (const j of ['shoulder', 'elbow', 'wrist']) p.ch[`${j}_l`] = clone(restL.ch[`${j}_l`]); else { p.ch.shoulder_l = { plane: 20, elev: 20, axial: 0 }; p.ch.elbow_l = { flex: 60 }; } }
    else { p.ch.shoulder_l = clone(p.ch.shoulder_r); p.ch.elbow_l = { flex: k.flex }; }
    return p;
  }
  function rootY(k, x) {
    const want = L.reach(k.flex); let a = 40, b = 220;
    for (let i = 0; i < 40; i++) { const y = (a + b) / 2, S = L.fk(bodyPose(k, x, y)).shoulder_r.p; if (S[1] < WT.r[1] && V.len(V.sub(S, WT.r)) > want) a = y; else b = y; }
    return r1(((a + b) / 2) * 10) / 10;
  }
  const barA = V.sub(bar.c, [0, 0, 60]), barB = V.add(bar.c, [0, 0, 60]);
  const barClear = (W, skip = /^(hand|thumb)_/) => EQ.segmentClear(W, barA, barB, bar.r, { skip, n: 24 });
  const TRUNK = /^(hand|thumb|forearm|upperarm|biceps|deltoid)_/;
  const pl = opt.plane ?? 20;
  const guessArm = (k) => [pl, pl + 25].map((p) => ({ shoulder_r: { plane: p, elev: 180 - k.flex * 0.8, axial: 0 }, elbow_r: { flex: k.flex }, shoulder_l: { plane: p, elev: 180 - k.flex * 0.8, axial: 0 }, elbow_l: { flex: k.flex } }));
  function solveKey(k, x) {
    let p = bodyPose(k, x, rootY(k, x));
    p.ik = {}; for (const s of sides) p.ik[`arm_${s}`] = { target: WT[s], weight: 1 };
    for (const s of sides) { const c = contacts.find((cc) => cc.id === `arm_${s}`); const g = guessArm(k).map((o) => ({ [`shoulder_${s}`]: o[`shoulder_${s}`], [`elbow_${s}`]: o[`elbow_${s}`] })); p = H.fitArm(p, s, c, WT[s], g); delete p.__cost; }
    return p;
  }
  function placeX(k) { let x = -3; for (let i = 0; i < 40; i++) { const W = L.fk(bodyPose(k, x, rootY(k, x))); if (barClear(W, TRUNK).d >= CLEAR) break; x -= 0.5; } return x; }
  if (one) { const h = bodyPose(KEY.hang, -3, rootY(KEY.hang, -3)); restL = restHandOnThigh(h); }
  const X = {}, poses = {};
  for (const n of Object.keys(KEY)) { X[n] = placeX(KEY[n]); poses[n] = solveKey(KEY[n], X[n]); }
  const keyframes = [['hang', 0], ['hang', 0.5], ['scap', 0.65], ['m1', 0.95], ['m2', 1.25], ['m3', 1.55], ['top', 1.8], ['top', 2.2], ['m3', 2.5], ['m2', 2.9], ['m1', 3.4], ['scap', 3.9], ['hang', 4.2], ['hang', 4.7]].map(([pose, t]) => ({ t, pose }));
  const ex = H.module_(meta, contacts, poses, keyframes);
  for (const p of Object.values(ex.poses)) { p.ik = {}; for (const s of sides) p.ik[`arm_${s}`] = { target: WT[s], weight: 1 }; }
  // knee pad lever: pad under the shins just below the knees; pivot on the circle through the pad points at hang and top
  const Wh = L.fk(poses.hang, contacts), Wtop = L.fk(poses.top, contacts), T = 0.15;
  const sp = (W) => V.add(W.knee_r.p, V.scale(V.sub(W.ankle_r.p, W.knee_r.p), T));
  const shin = 20 - EQ.pointShape(Wh, V.add(sp(Wh), [0, -20, 0]), 'shank_r'), off = r1(shin + 3 + 0.3);
  const padAt = (W) => { const a = W.knee_r.p, b = W.ankle_r.p, d = V.norm([b[0] - a[0], b[1] - a[1], 0]); return V.add(sp(W), [-d[1] * off, d[0] * off, 0]); };
  const P0 = padAt(Wh), P1 = padAt(Wtop), M0 = GL.machine('leg_press', {});
  const Pm = padAt(L.fk(poses.m2, contacts));
  const circ = (() => { const [ax, ay] = P0, [bx, by] = Pm, [cx, cy] = P1, dd = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); if (Math.abs(dd) < 1e-6) return null; const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / dd, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / dd; return [ux, uy]; })();
  const cr = circ && Math.hypot(circ[0] - P0[0], circ[1] - P0[1]);
  const pv = circ && cr > 50 && cr < 220 && circ[0] < P0[0] ? { pivot: [r1(circ[0]), r1(circ[1]), 0] } : GL.pivotThrough(M0, P0, P1, opt.radius ?? 140, (P1[1] - P0[1]) > 0 ? 1 : -1);
  const follow = { joints: ['knee_r', 'ankle_r'], t: T, off };
  const zMid = r1((Wh.knee_r.p[2] + Wh.knee_l.p[2]) / 2);
  const mk = (range) => GL.machine('leg_press', { pivot: pv.pivot, end: [r1(P0[0]), r1(P0[1]), zMid], armZ: 30, endKind: 'pad', endSize: [22, 6, 46], endRot: [0, 0, 0], follow, range, seat: null, back: null, load: 'stack', stack: { x: r1(pv.pivot[0] - 18), z: 0, h: 130 }, pads: [], columns: [[r1(pv.pivot[0] - 4), 32]] });
  const A1 = r1(GL.angleOf(mk([-179, 179]), Wtop, 'arm'));
  const M = mk(rangeOf(0, A1, 4));
  ex.props = [PB.prop, M.prop];
  const rep = GL.track(ex, M, { skip: /^(hand|thumb|foot|toe)_/ });
  GL.gate(meta.exercise.id, rep, { maxOffArc: opt.maxOffArc ?? 4, minClear: -1.5 }); // the off-arc error is along the shins (the pad slides a few cm on them, as real knee pads do); the vertical gap stays under 0.5 cm
  C.limits(ex.poses);
  // hands planted, bar clearance, chin over the bar
  const tl = RR.buildTimeline(ex); let slide = 0, barMin = 1e9;
  for (let i = 0; i <= 600; i++) { const W = RR.evalPose(rig, tl.pose((i / 600) * tl.duration), ex.contacts); for (const s of sides) slide = Math.max(slide, V.len(V.sub(W[`wrist_${s}`].p, WT[s]))); barMin = Math.min(barMin, barClear(W).d); }
  const chin = H.bottomOf(Wtop, 'jaw') - BAR_H;
  if (slide > 0.05) { console.error(`FAIL ${meta.exercise.id}: hands slide ${slide}`); process.exitCode = 1; }
  if (barMin < 0.5) { console.error(`FAIL ${meta.exercise.id}: body through the bar ${barMin}`); process.exitCode = 1; }
  if (chin < -2) { console.error(`FAIL ${meta.exercise.id}: chin ${chin.toFixed(1)} cm below the bar`); process.exitCode = 1; }
  return { ex, M, rep, poses, KEY, GZ, BAR_H, Wh, Wt: Wtop, chin, slide, barMin, A1, travel: V.len(V.sub(Wtop.pelvis.p, Wh.pelvis.p)), set: H.setKin(ex) };
}
module.exports.assisted = assisted;
// circle through three points in the x-y plane -> [cx, cy, r] (null if collinear)
function circle3(A, B, Cc) {
  const [ax, ay] = A, [bx, by] = B, [cx, cy] = Cc, dd = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(dd) < 1e-6) return null;
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / dd, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / dd;
  return [ux, uy, Math.hypot(ax - ux, ay - uy)];
}
module.exports.circle3 = circle3;
