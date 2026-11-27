// Batch 5 extras: helpers for the barbell front-rack lunge and the reverse-grip cable pulldown. Builds on barbell.js
// (bar clearance, grip-width sweep), equip.js (bar between the grip points, cable tower) and eq-cable.js without changing
// them.
//  - frontRack: arms for a barbell held in the front rack (bar across the front delts in front of the throat, elbows forward
//    and up, wrists extended, the bar resting in the fingers). The arm pose is solved once relative to the upper trunk and
//    reused for every key, so the bar rides with the trunk and the grip width is exactly constant.
//  - barSweep: barbell.js sweep with a chosen grip (the front rack holds the bar in the fingers, not the heel of the palm).
//  - pulldown helpers: an arm solve onto a cable bar with a chosen palm direction, and a bench seat under a high pulley.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const EQ = require('./equip');
const BB = require('./barbell');
const B = require('./b3-back');
const B3 = require('./b3-legs');

const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
const T6 = (W, v) => V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, v));
const toT6 = (W, p) => Q.rot(Q.conj(W.spine_t6.q), V.sub(p, W.spine_t6.p));

// Right arm onto grip point g (grip key `grip`, its axis along `ax` either sign), with soft palm / elbow targets and soft
// joint limits inside the rig limits, optional channel pulls regs [[path, value, weight]]; mirrored to the left.
function armOnto(p, g, { grip, ax = [0, 0, 1], axW = 3, palm, palmW = 0.5, elbow, elbowW = 1.5, gripW = 6, guesses, lim = {}, regs = [] } = {}) {
  const a = V.norm(ax), wf = lim.wristFlex || [-89, 79], wd = lim.wristDev || [-19, 34.5], ef = lim.elbow || [2, 148];
  const objs = [
    (W) => V.sub(EQ.gripPoint(W, 'r', grip).p, g).map((v) => v * gripW),
    (W) => [(1 - Math.abs(V.dot(EQ.gripPoint(W, 'r', grip).ax, a))) * axW],
    (W) => (palm ? V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), V.norm(palm)).map((v) => v * palmW) : []),
    (W) => (elbow ? V.sub(W.elbow_r.p, elbow).map((v) => v * elbowW) : []),
    (W, q) => regs.map(([path, v, w]) => (L.getPath(q, path) - v) * w),
    (W, q) => { const sh = q.ch.shoulder_r, el = q.ch.elbow_r.flex, w = q.ch.wrist_r; return [Math.min(0, sh.elev - 4) * 3, Math.max(0, sh.elev - 200) * 3, Math.min(0, sh.plane + 58) * 3, Math.max(0, sh.plane - 138) * 3, Math.min(0, el - ef[0]) * 3, Math.max(0, el - ef[1]) * 3, Math.min(0, w.flex - wf[0]) * 3, Math.max(0, w.flex - wf[1]) * 3, Math.min(0, w.dev - wd[0]) * 3, Math.max(0, w.dev - wd[1]) * 3]; },
  ];
  let best = null;
  for (const s of guesses) {
    const q0 = clone(p);
    q0.ch.shoulder_r = { plane: s[0], elev: s[1], axial: s[2] }; q0.ch.elbow_r = { flex: s[3] }; q0.ch.wrist_r = { pron: s[4], flex: s[5] ?? 0, dev: s[6] ?? 0 };
    const r = L.solvePose(q0, ARM, objs, { iters: 500 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const q = best.pose;
  for (const [j, c] of [['shoulder_r', 'axial'], ['wrist_r', 'pron'], ['shoulder_r', 'plane'], ['shoulder_r', 'elev']]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  for (const c of ['flex', 'dev']) q.ch.wrist_r[c] = r1(q.ch.wrist_r[c]);
  q.ch.elbow_r.flex = r1(q.ch.elbow_r.flex);
  B.mirrorArm(q);
  q.__cost = best.cost;
  return q;
}

/* ---------------- front rack ---------------- */
// opt: { gw (handle-point width, cm), offset (athlete-frame attach.offset [fingers, palm, thumb]), bar (t6-frame bar target),
// elbow (t6-frame elbow target), sc (shoulder blades: up and forward make the shelf) }
function frontRack(standPose, { gw = 66, offset = [9.5, 1.5, 0], bar = [20, 15, 0], elbow = [32, 2, 21], sc = { protract: 14, elevate: 14 }, contacts } = {}) {
  const grip = B3.gripSpec('handle', offset);
  const p = clone(standPose); p.ch.sc_r = clone(sc); p.ch.sc_l = clone(sc);
  const W1 = L.fk(p, contacts), c = T6(W1, bar), grips = EQ.barGrips(c, BB.AX, gw), E = T6(W1, elbow);
  const guesses = []; for (const pr of [-60, 0, 60, 120, 180]) for (const ax of [-90, 0, 90]) guesses.push([95, 85, ax, 145, pr, -70]);
  const q = armOnto(p, grips.r, { grip, palm: Q.rot(W1.spine_t6.q, [0.3, 1, 0]), elbow: E, guesses });
  const W2 = L.fk(q, contacts), b = EQ.barAt(W2, grip);
  const arms = {}; for (const j of ['sc', 'shoulder', 'elbow', 'wrist']) for (const s of ['r', 'l']) arms[`${j}_${s}`] = clone(q.ch[`${j}_${s}`]);
  const out = {
    grip, offset, arms, cost: +q.__cost.toFixed(1), gripErr: +V.len(V.sub(EQ.gripPoint(W2, 'r', grip).p, grips.r)).toFixed(2),
    barT6: toT6(W2, b.c).map((v) => +v.toFixed(2)), width: +b.width.toFixed(2),
    elbowT6: toT6(W2, W2.elbow_r.p).map(r1), shoulderT6: toT6(W2, W2.shoulder_r.p).map(r1),
    apply: (pose) => { const r = clone(pose); Object.assign(r.ch, clone(arms)); return r; },
    prop: ({ plates = 1, plateD = 45 } = {}) => ({ id: 'barbell', kind: 'barbell', size: [220, plateD, plateD], plates, attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle', offset: offset.slice() } }),
  };
  return out;
}

// barbell.js sweep with a chosen grip key (width, plates / bar vs the floor, bar vs the body, planted contacts, fixed joints)
function barSweep(ex, { grip, skip, planted, fixed = [], n = 600, probe } = {}) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, pl = planted || (ex.checks && ex.checks.plantedContacts) || [];
  const bar = ex.props.find((p) => p.kind === 'barbell'), bopt = { plates: bar.plates ?? 1, plateD: (bar.size && bar.size[1]) || 45, skip, grip };
  const out = { width: [1e9, -1e9], barFloor: 1e9, barBody: 1e9, barBodyAt: null, floor: 1e9, floorAt: null, slide: 0, drift: 0 };
  const W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
    const b = EQ.barAt(W, grip); out.width = [Math.min(out.width[0], b.width), Math.max(out.width[1], b.width)];
    out.barFloor = Math.min(out.barFloor, EQ.barMinY(W, bopt));
    const c = BB.barBodyClear(W, bopt); if (c.d < out.barBody) { out.barBody = c.d; out.barBodyAt = [c.id, c.plate ? 'plate' : 'bar', +t.toFixed(2)]; }
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    for (const id of pl) {
      const k = pz.ik && pz.ik[id]; if (!k || (k.weight ?? 1) < 0.999) continue;
      const cc = ex.contacts.find((x) => x.id === id);
      let sl = V.len(V.sub(W[cc.chain[2]].p, k.target));
      if (prev && prev[id] && (prev[id].weight ?? 1) >= 0.999) sl = Math.max(sl, V.len(V.sub(k.target, prev[id].target)));
      out.slide = Math.max(out.slide, sl);
    }
    for (const j of fixed) out.drift = Math.max(out.drift, V.len(V.sub(W[j].p, W0[j].p)));
    if (probe) probe(W, pz, t, out);
    prev = pz.ik ? clone(pz.ik) : null;
  }
  out.width = out.width.map((v) => +v.toFixed(2)); out.widthRange = +(out.width[1] - out.width[0]).toFixed(2);
  for (const k of ['barFloor', 'barBody', 'floor', 'slide', 'drift']) out[k] = +out[k].toFixed(2);
  return out;
}

// joint-limit check on the stored channels (as test/verify.mjs does)
function limits(poses) {
  const viol = [];
  for (const [name, p] of Object.entries(poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${name}.${j}.${c}=${p.ch[j][c]}`); }
  return viol;
}


/* ---------------- seated pulldown ---------------- */
// Seated base (b4-shoulders2 benchEnd: flat bench end, feet planted) leaned back `deg` about the buttocks: root pitch set,
// root x / y solved so the right buttock's low point stays where it sat, legs re-planted on the same targets.
function leanBack(base, deg, { spine } = {}) {
  const H = require('./hips'), F3 = require('./b3-shoulders');
  const W0 = L.fk(base.pose, base.contacts), lp0 = H.lowPoint(W0, 'buttock_r');
  const set = (x) => { const q = clone(base.pose); q.root.rot = { ...q.root.rot, pitch: r1(base.pose.root.rot.pitch + deg) }; q.root.pos = [base.pose.root.pos[0] + x[0], base.pose.root.pos[1] + x[1], base.pose.root.pos[2]]; if (spine) for (const j in spine) q.ch[j] = { ...q.ch[j], ...spine[j] }; return q; };
  const res = (x) => { const lp = H.lowPoint(L.fk(set(x)), 'buttock_r'); return [(lp[0] - lp0[0]) * 3, (lp[1] - lp0[1]) * 3]; };
  const x = R.solveLM([0, 0], res, { iters: 200 }).x;
  const q = set(x); q.root.pos = q.root.pos.map((v) => +v.toFixed(2));
  return F3.plantLegs(q, base.contacts);
}

module.exports = { ARM, T6, toT6, armOnto, frontRack, barSweep, limits, leanBack };
