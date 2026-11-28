// Phase 3 helpers for group g3-bars (suspension / rings, landmine, EZ and cambered bars, plates, chairs, cable rope).
// Builds on build/families/gear-bars.js (G) and the gear plug-in src/gear/g3-bars.js (foot cradle, cambered bar, weight
// vest, single rope, parallel pull-up handles). Units: cm, world axes (+X forward, +Y up, +Z figure's right).
//
// API:
//   armToL(p, g, opt)                left-arm twin of G.armTo (solves the left arm onto a grip point)
//   leanRow(meta, spec)              body straight from the heels, leaning back under straps / rings / fixed hand holds;
//                                    rows, curls or presses where the body turns about the heels (see spec below)
//   cradleProps(anchors, offset)     foot cradles (rings style 'cradle') mounted on the ankles
//   vestProp(), camberedProp(), rope1Prop(anchor), parallelHandlesProp(), chairProps(...)
//   sweep(ex, probe)                 loop report: floor, slide of planted contacts, channel jumps (K.scanHeld)
const L = require('../lib');
const { V, Q, R, r1, clone } = L;
const EQ = require('./equip');
const H = require('./hips');
const G = require('./gear-bars');
const K = require('./b4-shoulders3');

const RAD = Math.PI / 180;
const unit = (v) => { const l = V.len(v); return l > 1e-9 ? V.scale(v, 1 / l) : [0, 0, 0]; };

/* ---------------- left arm solve ---------------- */
const ARM_L = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron', 'ch.wrist_l.flex', 'ch.wrist_l.dev'];
// thumb: the left hand's thumb-side axis is -z of the wrist frame (z is the little-finger side of the left hand)
function armToL(p, g, { grip = 'handle', thumb, palm, elbow, wGrip = 6, wDir = 1.5, wElbow = 0.5, wristW = 0.04, guesses = [[0, 10, 0, 20, 0], [20, 15, 10, 40, 10], [30, 80, -60, 100, 90], [10, 20, 20, 60, 160], [60, 30, 0, 5, 90]], extra = [], contacts = null } = {}) {
  const objs = [
    (W) => V.sub(EQ.gripPoint(W, 'l', grip).p, g).map((v) => v * wGrip),
    (W) => (thumb ? V.sub(Q.rot(W.wrist_l.q, [0, 0, -1]), unit(thumb)).map((v) => v * wDir) : []),
    (W) => (palm ? V.sub(Q.rot(W.wrist_l.q, [1, 0, 0]), unit(palm)).map((v) => v * wDir) : []),
    (W) => (elbow ? V.sub(W.elbow_l.p, elbow).map((v) => v * wElbow) : []),
    (W, q) => { const sh = q.ch.shoulder_l, el = q.ch.elbow_l.flex, w = q.ch.wrist_l; return [w.flex * wristW, w.dev * wristW, Math.min(0, sh.elev - 4) * 3, Math.max(0, sh.elev - 200) * 3, Math.min(0, sh.plane + 58) * 3, Math.max(0, sh.plane - 138) * 3, Math.min(0, el - 2) * 3, Math.max(0, el - 148) * 3, Math.min(0, w.flex + 70) * 3, Math.max(0, w.flex - 70) * 3, Math.min(0, w.dev + 18) * 3, Math.max(0, w.dev - 33) * 3]; },
    ...extra,
  ];
  let best = null;
  for (const s of guesses) {
    const q0 = clone(p);
    q0.ch.shoulder_l = { plane: s[0], elev: s[1], axial: s[2] }; q0.ch.elbow_l = { flex: s[3] }; q0.ch.wrist_l = { pron: s[4], flex: s[5] ?? 0, dev: s[6] ?? 0 };
    const r = L.solvePose(q0, ARM_L, objs, { iters: 400, contacts });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const q = best.pose;
  for (const [j, c] of [['shoulder_l', 'axial'], ['wrist_l', 'pron'], ['shoulder_l', 'plane']]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  for (const c of ['flex', 'dev']) q.ch.wrist_l[c] = r1(q.ch.wrist_l[c]);
  q.ch.shoulder_l.elev = r1(q.ch.shoulder_l.elev); q.ch.elbow_l.flex = r1(q.ch.elbow_l.flex);
  const W = L.fk(q, contacts);
  q.__err = +V.len(V.sub(EQ.gripPoint(W, 'l', grip).p, g)).toFixed(2); q.__cost = best.cost;
  return q;
}
const guessOfL = (q) => [q.ch.shoulder_l.plane, q.ch.shoulder_l.elev, q.ch.shoulder_l.axial, q.ch.elbow_l.flex, q.ch.wrist_l.pron, q.ch.wrist_l.flex, q.ch.wrist_l.dev];

/* ---------------- props ---------------- */
const vestProp = (id = 'vest') => ({ id, kind: 'plate', size: [36, 28, 30], attach: { joint: 'spine_t6', offset: [7.4, 7.2, 0] }, params: { shape: 'vest' } });
const camberedProp = ({ width = 56, drop = 16, plates = 1, plateD = 45, id = 'cambered_bar' } = {}) =>
  ({ id, kind: 'ez_bar', size: [200, plateD, plateD], attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'bar' }, params: { shape: 'cambered', width, drop, plates, plateD } });
// geometry of the cambered bar (as the player draws it) for clearance checks: capsules and plate discs
function camberedGeometry(W, p = {}) {
  const r = EQ.gripPoint(W, 'r', 'bar').p, l = EQ.gripPoint(W, 'l', 'bar').p, x = unit(V.sub(r, l)), c = V.scale(V.add(r, l), 0.5);
  let y = V.sub([0, 1, 0], V.scale(x, x[1])); y = unit(y);
  const tw = ([a, b]) => V.add(c, V.add(V.scale(x, a), V.scale(y, b))), w = (p.width ?? 56) / 2, dr = p.drop ?? 16, half = 100, s0 = half - 42, D = p.plateD ?? 45, caps = [], discs = [];
  for (const sg of [1, -1]) {
    const pts = [[0, -dr], [w - 16, -dr], [w - 8, 0], [s0, 0]].map(([a, b]) => tw([sg * a, b]));
    for (let i = 0; i + 1 < pts.length; i++) caps.push([pts[i], pts[i + 1], 1.35, i < 2 ? 'camber' : 'bar']);
    caps.push([tw([sg * s0, 0]), tw([sg * half, 0]), 2.5, 'sleeve']);
    for (let i = 0; i < (p.plates ?? 1); i++) discs.push({ c: tw([sg * (s0 + 6 + i * 5.5), 0]), ax: x, r: D / 2, w: 5 });
  }
  return { caps, discs, c, x, y, width: V.len(V.sub(r, l)) };
}
const rope1Prop = (anchor, id = 'rope') => ({ id, kind: 'cable', attachment: 'handle', anchor: anchor.map(r1), attach: { joint: 'wrist_r' }, params: { attachment: 'rope1' } });
const parallelHandlesProp = ({ width, barDX, barDY = 0, id = 'parallel_handles' }) => ({ id, kind: 'cable', attachment: 'vbar', size: [width + 6, 10, barDX + 10], attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' }, params: { style: 'parallel', width, barDX, barDY } });
// foot cradles: one strap per foot from its anchor; offset = the cradle centre in the ankle frame (over the instep)
const CRADLE_OFF = [5, -2.2, 0];
const cradleProps = (anchors, offset = CRADLE_OFF) => ['r', 'l'].map((s) => ({ id: `cradle_${s}`, kind: 'rings', size: [14, 14, 14], anchor: anchors[s].map(r1), attach: { joint: `ankle_${s}`, offset }, params: { style: 'cradle' } }));
const cradlePoint = (W, s, offset = CRADLE_OFF) => V.add(W[`ankle_${s}`].p, Q.rot(W[`ankle_${s}`].q, offset));
// a chair as two boxes: a thin backrest whose top edge runs along X at (x, backY, z), and the seat block on the outer
// side (sgn = +1: seat toward +Z). The chair faces away from the athlete lying between two chairs.
function chairProps({ x, z, sgn = 1, seatY = 46, backY = 88, depth = 42, width = 42, id = 'chair' }) {
  return [
    { id: `${id}_back`, kind: 'box', center: [r1(x), seatY, r1(z)], size: [width, r1(backY - seatY), 3] }, // a box's center y is its bottom
    { id: `${id}_seat`, kind: 'box', center: [r1(x), 0, r1(z + sgn * (depth / 2 + 1.5))], size: [width, seatY, depth] },
  ];
}

/* ---------------- standing stances ---------------- */
// feet planted (leg contacts, flat world-locked feet): front foot `front` step/2 ahead, the other step/2 behind, feet
// width apart; the root drops `drop` cm (soft knees) and moves fwd cm forward. Stored leg channels fitted to the IK.
function stance({ front = 'l', step = 34, width = 24, drop = 3, fwd = 0, toeOut = 8, pitch = 0 } = {}) {
  const st = L.POSES.standing({ stance: width / 2, toeOut });
  const contacts = st.contacts.map((c) => Object.assign({}, c, { handRot: L.footRot(c.id === 'leg_r' ? -toeOut : toeOut).map((v) => +v.toFixed(6)) }));
  let q = clone(st.pose);
  const tg = { r: [front === 'r' ? step / 2 : -step / 2, L.ANKLE_H, width / 2], l: [front === 'l' ? step / 2 : -step / 2, L.ANKLE_H, -width / 2] };
  q.root.pos = [fwd, r1(q.root.pos[1] - drop), 0]; q.root.rot = { pitch };
  q.ik = { leg_r: { target: tg.r.map(r1), weight: 1 }, leg_l: { target: tg.l.map(r1), weight: 1 } };
  for (const s of ['r', 'l']) { q = H.fitLeg(q, s, contacts.find((c) => c.id === `leg_${s}`), q.ik[`leg_${s}`].target); delete q.__cost; }
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in q.ch[j]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  return { pose: q, contacts, targets: tg };
}


/* ---------------- prone on an incline bench (chest on the pad) ---------------- */
// From author-chest-supported-dumbbell-row.js: adjustable bench at `ang`, straddling the seat, chest on the pad with the
// chin just over the top, balls of the feet planted behind and beside the seat. Returns the body (arms at rest), the
// contacts, the bench, its oriented boxes (b3-back benchBoxes), and the pad frame (dir up the pad, nrm off the pad).
function proneIncline({ ang = 45, pad = 80, bw = 28, seat = 40, benchH = 45, along = 23, foot = [-50, 26], neck = -14, head = -16 } = {}) {
  const B3 = require('./b3-back'), P = require('./prone'), DBH = require('./dumbbell'), { BALL_PITCH } = require('./lunge');
  const bench = DBH.bench({ x: -seat / 2, z: 0, seat, height: benchH, width: bw, angle: ang, back: pad, side: 1 });
  const boxes = B3.benchBoxes(bench), dir = bench.padDir, nrm = [-dir[1], dir[0], 0];
  const fq = (pitch, yaw) => P.qArr(Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch)));
  const contacts = [Object.assign(L.legContact('r'), { label: 'Right foot (ball)', pole: [1, 0, 0.7], handRot: fq(BALL_PITCH, -15) }), Object.assign(L.legContact('l'), { label: 'Left foot (ball)', pole: [1, 0, -0.7], handRot: fq(BALL_PITCH, 15) })];
  const footSh = L.rig.shapes.find((sh) => sh.id === 'foot_r');
  const ANK = (() => { let a = 2, b = 30; for (let i = 0; i < 40; i++) { const y = (a + b) / 2, st = L.POSES.standing().pose; st.ik = { leg_r: { target: [0, y, 10], weight: 1 } }; const g = R.shapeWorld(L.fk(st, [contacts[0]]), footSh); const lo = g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); if (lo > 0.15) b = y; else a = y; } return r1((a + b) / 2 + 0.05); })();
  const FT = { r: [foot[0], ANK, foot[1]], l: [foot[0], ANK, -foot[1]] };
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  const PITCH = -(90 - ang) - 8;
  const base = (pos) => ({ root: { pos, rot: { pitch: PITCH } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: neck }, head_c1: { rot: 0, flex: head },
    sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 }, hip_r: { flex: 45, abd: 30, rot: -30 }, hip_l: { flex: 45, abd: 30, rot: -30 }, knee_r: { flex: 55 }, knee_l: { flex: 55 }, ankle_r: { dorsi: -8 }, ankle_l: { dorsi: -8 },
    shoulder_r: { plane: 90, elev: 60, axial: 0 }, shoulder_l: { plane: 90, elev: 60, axial: 0 }, elbow_r: { flex: 8 }, elbow_l: { flex: 8 }, wrist_r: { pron: 90, flex: 0, dev: 0 }, wrist_l: { pron: 90, flex: 0, dev: 0 } },
  ik: { leg_r: { target: FT.r, weight: 1 }, leg_l: { target: FT.l, weight: 1 } } });
  const TRUNK = L.rig.shapes.filter((sh) => /^(chest|pecs_r|pecs_l|ribcage|abdomen)$/.test(sh.id));
  const frontGap = (W) => { let m = 1e9; for (const sh of TRUNK) { const g = R.shapeWorld(W, sh); const ext = Math.sqrt(g.axes.reduce((a, ax) => a + V.dot(ax, nrm) ** 2, 0)); m = Math.min(m, V.dot(V.sub(g.c, bench.hinge), nrm) - ext); } return m; };
  let pos = V.add(V.add(bench.hinge, V.scale(dir, along)), V.scale(nrm, 20));
  for (let it = 0; it < 40; it++) { const g = frontGap(L.fk(base(pos))); pos = V.sub(pos, V.scale(nrm, g)); if (Math.abs(g) < 0.005) break; }
  let body = base(pos.map((v) => +v.toFixed(2)));
  body = P.fitLeg(body, 'r', contacts, 'leg_r'); body = P.fitLeg(body, 'l', contacts, 'leg_l'); B3.wrapPose(body);
  return { body, contacts, bench, boxes, dir, nrm, pad, FT };
}
// signed distance (cm) from a point to an oriented box { c, ax: [3 unit axes], h: [3 half sizes] }
function obbDist(p, b) {
  const d = V.sub(p, b.c), q = b.ax.map((a, i) => Math.abs(V.dot(d, a)) - b.h[i]);
  return Math.hypot(...q.map((v) => Math.max(v, 0))) + Math.min(Math.max(...q), 0);
}
// clearance of capsules / discs (gear-bars geometry) from oriented boxes
function geomBoxClear(geom, boxes) {
  let best = { d: 1e9 };
  for (const [a, b, r, label] of geom.caps) for (let k = 0; k <= 12; k++) { const p = V.add(a, V.scale(V.sub(b, a), k / 12)); for (const bx of boxes) { const d = obbDist(p, bx) - r; if (d < best.d) best = { d, box: bx.id, what: label }; } }
  for (const dk of geom.discs || []) for (const p of G.discPoints(dk)) for (const bx of boxes) { const d = obbDist(p, bx); if (d < best.d) best = { d, box: bx.id, what: 'plate' }; }
  return best;
}

/* ---------------- leaning body (heels on the floor) ---------------- */
// Body straight from the heels to the head, the root pitched so the body is alpha degrees above the floor (supine side
// up: rows and curls under straps; prone: presses facing away from the anchor, toes as the pivot).
function leanBody({ prone = false, half = 11, ankle = -20, knee = 3, heelX = 120 } = {}) {
  const base = prone ? L.POSES.plank().pose : L.POSES.supine({ kneeFlex: 0 }).pose;
  const body0 = clone(base); delete body0.ik;
  Object.assign(body0.ch, { hip_r: { flex: 0, abd: 2, rot: 0 }, hip_l: { flex: 0, abd: 2, rot: 0 }, knee_r: { flex: knee }, knee_l: { flex: knee }, ankle_r: { dorsi: ankle }, ankle_l: { dorsi: ankle }, neck_c7: { rot: 0, flex: 4 }, head_c1: { rot: 0, flex: 4 }, sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 } });
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) body0.ch[j] = { rot: 0, flex: 0, latFlex: 0 };
  const at0 = (alpha) => { const p = clone(body0); p.root = { pos: [0, 0, 0], rot: { pitch: prone ? -(90 - alpha) : 90 - alpha } }; return p; };
  return { body0, at0, half, heelX, prone };
}
// The pivot contact: supine = the heel bottom (ankle joint target), prone = the toes (toe joints on the floor)
function pivotSetup(LB, alphaRef) {
  const { at0, half, heelX, prone } = LB, Wref = L.fk(at0(alphaRef));
  const target = {}, rot = {};
  for (const s of ['r', 'l']) {
    const z = s === 'r' ? half : -half;
    const drop = Wref[`ankle_${s}`].p[1] - H.bottomOf(Wref, `foot_${s}`);
    target[s] = [heelX, r1(drop), z]; rot[s] = H.qArr(Wref[`ankle_${s}`].q);
  }
  const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: prone ? [0.3, -1, s === 'r' ? 0.1 : -0.1] : [-0.3, 1, s === 'r' ? 0.1 : -0.1], handRot: rot[s] }));
  return { target, contacts };
}
// body at angle alpha with the right ankle on its target; prone bodies pivot on the toes, so the ankle target moves:
// we keep the ankle on a circle about the toe tip (toe joint) instead
function bodyAtFn(LB, piv) {
  return (alpha) => {
    const p = LB.at0(alpha), W = L.fk(p), d = V.sub(piv.target.r, W.ankle_r.p);
    p.root.pos = V.add(p.root.pos, [d[0], d[1], 0]).map(r1);
    p.ik = { leg_r: { target: piv.target.r, weight: 1 }, leg_l: { target: piv.target.l, weight: 1 } };
    return p;
  };
}
// spec: {
//   style: 'handle' | 'ring' | 'fixed'; alphaT (top body angle), barY (bar height), anchorZ (0: one anchor, else +-z),
//   topHand(W, u, n) -> right hand at the top (u toward the head, n chest normal), anchorDX (anchor behind the hand top),
//   arm(f, W, ub, nb, S) -> { elbow, wElbow, thumb, palm, wDir } wishes per key (f 0 bottom -> 1 top),
//   sc(f) -> shoulder blades, guess: first guesses, reachFlex: elbow at the bottom (deg), FS: key fractions,
//   holdKey: extra 'squeeze' pose tweak (q, W) }
function leanRow(meta, spec) {
  const LB = leanBody(spec.body || {}), alphaT = spec.alphaT, piv = pivotSetup(LB, alphaT), bodyAt = bodyAtFn(LB, piv), contacts = piv.contacts;
  const top = bodyAt(alphaT);
  const Wt0 = L.fk(top, contacts);
  const u = unit(V.sub(Wt0.neck_c7.p, Wt0.pelvis.p)), n = unit(V.cross(u, [0, 0, 1]));
  const pre = spec.anchorAt ? spec.anchorAt(Wt0, u, n).map(r1) : null;
  const Ht = spec.topHand(Wt0, u, n, pre);
  const fixed = spec.style === 'fixed';
  const anchor = fixed ? Ht.slice() : pre || [r1(Ht[0] - (spec.anchorDX ?? 6)), spec.barY - 1.6, typeof spec.anchorZ === 'function' ? r1(spec.anchorZ(Ht)) : spec.anchorZ || 0];
  const Ls = fixed ? 0 : V.len(V.sub(Ht, anchor));
  const reach = L.reach(spec.reachFlex ?? 5) + 7.6;
  // arms long: row = the shoulder Ls + reach from the anchor (body lower); press (anchor behind) = Ls - reach (body higher)
  let lo = spec.press ? alphaT : 2, hi = spec.press ? 88 : alphaT;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2, p = bodyAt(m); p.ch.sc_r = spec.sc(0); p.ch.sc_l = clone(p.ch.sc_r); const S = L.fk(p, contacts).shoulder_r.p, d = V.len(V.sub(anchor, S));
    if (spec.press ? d > Ls - reach + 1.5 : d > Ls + reach - 1.5) lo = m; else hi = m;
  }
  if (spec.press) hi = lo;
  const alphaB = r1(spec.alphaB ?? hi);
  const pB = bodyAt(alphaB); pB.ch.sc_r = spec.sc(0); pB.ch.sc_l = clone(pB.ch.sc_r);
  const Sb = L.fk(pB, contacts).shoulder_r.p;
  const Hb = fixed ? Ht.slice() : G.onSphere(anchor, Ls, Sb, reach - 1.5, spec.hbHint || [0, -1, 0.3]);
  const FS = spec.FS || [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], poses = {};
  let guess = spec.guess || [[85, 80, 0, 10, 90], [70, 60, 20, 30, 90], [90, 90, -20, 5, 80]], worst = 0;
  FS.forEach((f, i) => {
    const p = bodyAt(alphaB + (alphaT - alphaB) * f);
    p.ch.sc_r = spec.sc(f); p.ch.sc_l = clone(p.ch.sc_r);
    if (spec.bodyTweak) spec.bodyTweak(p, f);
    const W = L.fk(p, contacts), g = fixed ? Ht : G.sphereArc(anchor, Ls, Hb, Ht, f), ub = unit(V.sub(W.neck_c7.p, W.pelvis.p)), nb = unit(V.cross(ub, [0, 0, 1]));
    const a = spec.arm(f, W, ub, nb, W.shoulder_r.p, anchor);
    const q = G.armTo(p, g, { grip: 'handle', thumb: a.thumb, palm: a.palm, wDir: a.wDir ?? 0.8, elbow: a.elbow, wElbow: a.wElbow ?? 0.3, guesses: guess, mirror: true, contacts, extra: a.ring ? [G.ringObjective(anchor, { w: a.ring, tilt: a.ringTilt || 0 })] : [] });
    worst = Math.max(worst, q.__err); delete q.__err; delete q.__cost;
    guess = [G.guessOf(q)]; poses[`r${i}`] = q;
  });
  const N = FS.length - 1, ph = (id) => meta.timeline.phases.find((p) => p.id === id);
  const ease = (x) => x * x * (3 - 2 * x), inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
  const [P1, P2, P3] = spec.phaseIds || ['pull', 'top', 'lower'];
  const t0 = ph(P1).start, t1 = ph(P1).end, t2 = ph(P2).end, t3 = ph(P3).end, D = meta.timeline.duration;
  const keyframes = [{ t: 0, pose: 'r0' }];
  FS.forEach((f, i) => keyframes.push({ t: +(t0 + (t1 - t0) * inv(f)).toFixed(3), pose: `r${i}` }));
  keyframes.push({ t: t2, pose: `r${N}` });
  for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(t2 + (t3 - t2) * inv(1 - FS[i])).toFixed(3), pose: `r${i}` });
  if (D > t3) keyframes.push({ t: D, pose: 'r0' });
  const ex = H.module_(meta, contacts, poses, keyframes);
  const tl = R.buildTimeline(ex), Ws = [];
  for (let i = 0; i <= 120; i++) Ws.push(R.evalPose(L.rig, tl.pose((i / 120) * D), contacts));
  const anchors = { r: anchor, l: [anchor[0], anchor[1], -anchor[2]] };
  const out = { ex, contacts, poses, anchor, anchors, Ls, alphaB, alphaT, Ht, Hb, worst, N, Ws, D, target: piv.target, timing: { t0, t1, t2, t3 } };
  if (!fixed) {
    const tilt = { r: G.ringTiltFit(Ws, 'r', anchors.r), l: G.ringTiltFit(Ws, 'l', anchors.l) };
    out.tilt = tilt;
    const bar = EQ.pullupBar({ x: anchor[0], height: spec.barY, width: Math.max(120, 2 * Math.abs(anchor[2]) + 60) });
    const rings = G.ringProps({ anchors, style: spec.style, tilt: { r: tilt.r.tilt, l: tilt.l.tilt } });
    if (spec.swivel) rings.forEach((r) => { r.params.swivel = true; });
    ex.props = [bar.prop, ...rings, ...(spec.swivel ? [{ id: 'ring_swivel', kind: 'rings', center: [0, 0, 0], size: [1, 1, 1], params: { role: 'swivel' } }] : [])];
  } else ex.props = [];
  // loop report: strap length / angle, strap clearance, floor, pivot slide
  const lp = { strap: [1e9, -1e9], clear: { d: 1e9 }, floor: 1e9, slide: 0, fromVert: [1e9, -1e9], hand: 0 };
  Ws.forEach((W, i) => {
    for (const s of ['r', 'l']) {
      if (!fixed) { const st = G.strap(W, s, anchors[s]); lp.strap = [Math.min(lp.strap[0], st.len), Math.max(lp.strap[1], st.len)]; lp.fromVert = [Math.min(lp.fromVert[0], st.fromVertical), Math.max(lp.fromVert[1], st.fromVertical)]; const c = G.strapClear(W, s, anchors[s]); if (c.d < lp.clear.d) lp.clear = { d: r1(c.d), id: c.id, t: r1((i / 120) * D) }; }
      else lp.hand = Math.max(lp.hand, V.len(V.sub(EQ.gripPoint(W, s, 'handle').p, s === 'r' ? Ht : [Ht[0], Ht[1], -Ht[2]])));
      lp.slide = Math.max(lp.slide, V.len(V.sub(W[`ankle_${s}`].p, piv.target[s])));
    }
    lp.floor = Math.min(lp.floor, L.shapeMinY(W).y);
  });
  out.lp = lp;
  out.fails = [];
  if (worst > 0.8) out.fails.push(`hands off their targets (${worst} cm)`);
  if (!fixed && lp.strap[1] - lp.strap[0] > 1.5) out.fails.push(`straps change length ${r1(lp.strap[1] - lp.strap[0])} cm`);
  if (!fixed && lp.clear.d < 0) out.fails.push(`strap through the body (${lp.clear.id} at ${lp.clear.t}s)`);
  if (fixed && lp.hand > 0.8) out.fails.push(`hands slide on the holds (${r1(lp.hand)} cm)`);
  if (lp.floor < -0.5) out.fails.push('body through the floor');
  if (lp.slide > 0.05) out.fails.push('heels slide');
  if (out.tilt && !spec.swivel && out.tilt.r.residual > 30) out.fails.push(`handle off its strap by ${out.tilt.r.residual} deg`);
  return out;
}

/* ---------------- plank with the feet in suspension cradles ---------------- */
// Hands planted on the floor (arm contacts, palm down, shoulder width), legs free with the feet in foot cradles hanging
// from one strap each. ringPlank() solves the plank (feet at cradle height hc) and places each anchor d cm in front of
// the plank cradle (toward the hands) at barY, so the feet swing on spheres about the anchors. solveKey(spec) then finds
// root x / y / pitch for prescribed leg channels so that the arms stay straight onto the hand targets, the shoulders sit
// offX cm in front of the wrists, and the right cradle lies on its strap sphere (both when legs: 'both').
function ringPlank({ hc = 50, d = 22, barY = 215, handZ = 21, footZ = 9, armFlex = 6, ankle = -28 } = {}) {
  const FP = require('./b4-floorpush');
  const contacts = [Object.assign(L.handContact('r'), { pole: [-1, 0.3, 0.42] }), Object.assign(L.handContact('l'), { pole: [-1, 0.3, -0.42] })];
  const WR = [0, FP.PALM, handZ], WL = [0, FP.PALM, -handZ];
  const P0 = clone(L.POSES.plank().pose); delete P0.ik;
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) P0.ch[j] = { rot: 0, flex: 0, latFlex: 0 };
  P0.ch.neck_c7 = { rot: 0, flex: 0 }; P0.ch.head_c1 = { rot: 0, flex: 0 };
  const legs = (p, L_, R_) => { for (const [sd, v] of [['r', R_], ['l', L_]]) { p.ch[`hip_${sd}`] = { flex: r1(v.hip), abd: 0, rot: 0 }; p.ch[`knee_${sd}`] = { flex: r1(v.knee ?? 0) }; p.ch[`ankle_${sd}`] = { dorsi: r1(v.ankle ?? ankle) }; } return p; };
  const footAdd = (W) => V.sub(cradlePoint(W, 'r'), [0, 0, 0]);
  const reachT = L.reach(armFlex);
  function solveRoot(p0, objs) {
    const s = L.solvePose(p0, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [(W) => [(V.len(V.sub(W.shoulder_r.p, WR)) - reachT) * 4], ...objs], { iters: 500 });
    let q = s.pose; q.ik = { arm_r: { target: WR.slice(), weight: 1 }, arm_l: { target: WL.slice(), weight: 1 } };
    for (const sd of ['r', 'l']) q = FP.matchArm(q, sd, contacts);
    q.__cost = s.cost; return q;
  }
  // plank with the feet at cradle height hc
  const pl = legs(clone(P0), { hip: 0 }, { hip: 0 });
  // feet together-ish: legs adducted so the ankles sit footZ from the midline
  const plank = solveRoot(pl, [(W) => [(W.shoulder_r.p[0] - WR[0]) * 2], (W) => [(cradlePoint(W, 'r')[1] - hc) * 3]]);
  const Wp = L.fk(plank, contacts), C0 = { r: cradlePoint(Wp, 'r'), l: cradlePoint(Wp, 'l') };
  const anchors = { r: [r1(C0.r[0] + d), barY, r1(C0.r[2])], l: [r1(C0.l[0] + d), barY, r1(C0.l[2])] };
  const Ls = V.len(V.sub(C0.r, anchors.r));
  // key: legs { r: {hip, knee, ankle}, l: {...} }, offX: shoulder ahead of the wrists, sphere: which cradles to keep on
  // their spheres with the root (the others are solved by the caller), guess: previous pose
  function solveKey({ legs: lg, offX = 0, sphere = ['r', 'l'], guess = plank, sc = { protract: 6, elevate: 0 }, neck = 0 }) {
    const p = legs(clone(guess), lg.l, lg.r); p.ch.sc_r = clone(sc); p.ch.sc_l = clone(sc); p.ch.neck_c7 = { rot: 0, flex: r1(neck / 2) }; p.ch.head_c1 = { rot: 0, flex: r1(neck / 2) };
    return solveRoot(p, [(W) => [(W.shoulder_r.p[0] - WR[0] - offX) * 2], ...sphere.map((sd) => (W) => [(V.len(V.sub(cradlePoint(W, sd), anchors[sd])) - Ls) * 3])]);
  }
  // one leg's hip and knee for the cradle on its sphere at a forward travel dx (root fixed)
  function solveLeg(pose0, sd, { dx, hipW = 0.02, kneePerHip = 1.1, hip0 = null, knee0 = null }) {
    const pose = clone(pose0); if (hip0 != null) pose.ch[`hip_${sd}`].flex = hip0; if (knee0 != null) pose.ch[`knee_${sd}`].flex = knee0;
    const s = L.solvePose(pose, [`ch.hip_${sd}.flex`, `ch.knee_${sd}.flex`, `ch.ankle_${sd}.dorsi`], [
      (W) => [(V.len(V.sub(cradlePoint(W, sd), anchors[sd])) - Ls) * 4, (cradlePoint(W, sd)[0] - (C0[sd][0] + dx)) * 2],
      (W, q) => [(q.ch[`knee_${sd}`].flex - kneePerHip * q.ch[`hip_${sd}`].flex) * hipW, (q.ch[`ankle_${sd}`].dorsi - ankle) * 0.05, Math.min(0, q.ch[`knee_${sd}`].flex) * 5, Math.max(0, q.ch[`hip_${sd}`].flex - 135) * 5, Math.max(0, q.ch[`ankle_${sd}`].dorsi - 30) * 5, Math.min(0, q.ch[`ankle_${sd}`].dorsi + 50) * 5],
    ], { iters: 400, contacts });
    const q = s.pose; for (const c of ['hip', 'knee', 'ankle']) { const k = c === 'hip' ? 'flex' : c === 'knee' ? 'flex' : 'dorsi'; q.ch[`${c}_${sd}`][k] = r1(q.ch[`${c}_${sd}`][k]); }
    q.__cost = s.cost; return q;
  }
  return { contacts, WR, WL, plank, anchors, Ls, C0, solveKey, solveLeg, cradles: () => cradleProps(anchors) };
}
// cradle straps: length range and clearance from the body over a list of rig states
function cradleLoop(Ws, anchors, Ls) {
  const out = { len: [1e9, -1e9], clear: { d: 1e9 } };
  Ws.forEach((W, i) => { for (const s of ['r', 'l']) { const c = cradlePoint(W, s), l = V.len(V.sub(c, anchors[s])); out.len = [Math.min(out.len[0], l), Math.max(out.len[1], l)]; const cl = EQ.segmentClear(W, anchors[s], c, 1.2, { skip: /^(foot|toe|shank|calf)_/, n: 16 }); if (cl.d < out.clear.d) out.clear = { d: r1(cl.d), id: cl.id, i }; } });
  out.err = r1(Math.max(Math.abs(out.len[0] - Ls), Math.abs(out.len[1] - Ls)));
  return out;
}
// unwrap the unlimited angle channels (shoulder axial, wrist pronation) of q toward prev so keys interpolate the short way
function unwrapArms(q, prev) {
  if (!prev) return q;
  for (const [j, c] of [['shoulder_r', 'axial'], ['shoulder_l', 'axial'], ['wrist_r', 'pron'], ['wrist_l', 'pron']]) if (q.ch[j] && prev.ch[j]) { const v = q.ch[j][c], r = prev.ch[j][c]; q.ch[j][c] = r1(v + 360 * Math.round((r - v) / 360)); }
  return q;
}
const elbowDeg = (W, s = 'r') => Math.round(180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p)));
const sweep = (ex, opt = {}) => K.scanHeld(ex, [], opt);
const report = (id, fails) => { if (fails.length) { console.error(`FAIL ${id}: ${fails.join('; ')}`); process.exitCode = 1; } };

// clearance of the body from an axis-aligned box prop (sampled on its faces); skip: shape ids to ignore
const SHAPE_IDS = L.rig.shapes.flatMap((s) => (s.bilateral ? [`${s.id}_r`, `${s.id}_l`] : [s.id]));
function boxClear(W, box, skip = /^(hand|thumb)_/, n = 6) {
  const [cx, cy, cz] = box.center, [sx, sy, sz] = box.size, lo = [cx - sx / 2, cy, cz - sz / 2], hi = [cx + sx / 2, cy + sy, cz + sz / 2];
  let best = { d: 1e9 };
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) for (let k = 0; k <= 2; k++) {
    const p = [lo[0] + (hi[0] - lo[0]) * i / n, lo[1] + (hi[1] - lo[1]) * j / n, lo[2] + (hi[2] - lo[2]) * k / 2];
    for (const id of SHAPE_IDS) { if (skip && skip.test(id)) continue; const d = EQ.pointShape(W, p, id); if (d < best.d) best = { d, id }; }
  }
  return best;
}
module.exports = { proneIncline, obbDist, geomBoxClear, unwrapArms, stance, ringPlank, cradleLoop, boxClear, armToL, guessOfL, vestProp, camberedProp, camberedGeometry, rope1Prop, parallelHandlesProp, CRADLE_OFF, cradleProps, cradlePoint, chairProps, leanBody, pivotSetup, bodyAtFn, leanRow, elbowDeg, sweep, report, unit };
