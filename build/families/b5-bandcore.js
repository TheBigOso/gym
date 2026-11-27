// Batch 5, band core / band lower-body family (b5-bandcore): split squat, pull-through, back extension, Pallof press,
// standing crunch, seated twist, twist (up-down) and bicycle crunch, all with a resistance band.
// Helpers: a left-arm solve by mirroring (the right-arm solver C.armR run on the mirrored pose), band strand segments
// for any band prop (anchored at a fixed point or a rig joint, one or two hands), a whole-loop scan (floor, planted
// contacts, still joints, channel jumps, band strands clear of the body, joint limits) and rack-upright / pull-up-bar
// anchors so no band is left floating. Builds on equip.js (EQ), eq-cable.js (C), hips.js (H) and core-b.js (CB)
// without changing them.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const EQ = require('./equip');
const C = require('./eq-cable');
const H = require('./hips');
const CB = require('./core-b');

const BAND_R = 0.6; // drawn band strand radius (cm), as in the band pull-apart
const BAND_COLOR = '#d9534f';
const ARMJ = ['shoulder', 'elbow', 'wrist', 'sc'];

// Mirror a world point / direction across the sagittal plane (z -> -z)
const mz = (v) => (v ? [v[0], v[1], -v[2] || 0] : v);

// C.armR (eq-cable.js) with extra objectives: spec.extra = [(W, pose) => residual[]] (e.g. keep the arm off the floor).
// Same seeds and soft limits; falls back to C.armR when there is nothing extra.
const SOFT = { 'ch.shoulder_r.plane': [-60, 140], 'ch.shoulder_r.elev': [0, 200], 'ch.elbow_r.flex': [0, 150], 'ch.wrist_r.pron': [-15, 175], 'ch.wrist_r.flex': [-80, 70], 'ch.wrist_r.dev': [-18, 33] };
function armR(pose, contacts, spec) {
  if (!spec.extra) return C.armR(pose, contacts, spec);
  const p0 = C.armR(pose, contacts, spec), g = C.guessOf(p0);
  const paths = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev', 'ch.elbow_r.flex'];
  const objs = [];
  if (spec.elbow) objs.push(L.obj.at('elbow_r', spec.elbow, spec.wElbow ?? 3));
  if (spec.grip) objs.push((W) => V.sub(EQ.gripPoint(W, 'r').p, spec.grip).map((v) => v * (spec.wGrip ?? 3)));
  if (spec.axis) { const a = V.norm(spec.axis); objs.push((W) => [(1 - Math.abs(V.dot(EQ.gripPoint(W, 'r').ax, a))) * 20]); }
  if (spec.palm) objs.push((W) => V.sub(C.palmOf(W), V.norm(spec.palm)).map((v) => v * (spec.wPalm ?? 4)));
  objs.push((W, q) => paths.map((pp) => { const lim = SOFT[pp], v = L.getPath(q, pp); return lim ? (Math.max(0, lim[0] - v) + Math.max(0, v - lim[1])) * 3 : 0; }));
  objs.push(L.obj.reg('ch.wrist_r.flex', 0, 0.08), L.obj.reg('ch.wrist_r.dev', 0, 0.08), L.obj.reg('ch.shoulder_r.axial', g.axial, 0.01), ...spec.extra);
  const r = L.solvePose(C.strip(p0), paths, objs, { iters: 500, contacts });
  const W = L.fk(r.pose, contacts);
  r.pose.__err = { cost: +r.cost.toFixed(3), elbow: spec.elbow ? +V.len(V.sub(W.elbow_r.p, spec.elbow)).toFixed(2) : 0, grip: spec.grip ? +V.len(V.sub(EQ.gripPoint(W, 'r').p, spec.grip)).toFixed(2) : 0 };
  return r.pose;
}
// Right arm on the band handle (C.armR spec, world targets). Left arm: the same solver on the mirrored pose with the
// spec mirrored, the solved right-arm channels copied back to the left side. spec may be a function (W) => spec.
function armSide(pose, contacts, side, spec) {
  if (side === 'r') { const sp = typeof spec === 'function' ? spec(L.fk(pose, contacts)) : spec; return armR(pose, contacts, sp); }
  const m = CB.mirror(pose);
  for (const j of ARMJ) if (pose.ch[`${j}_l`]) m.ch[`${j}_r`] = clone(pose.ch[`${j}_l`]);
  const Wm = L.fk(m, contacts);
  const sp0 = typeof spec === 'function' ? spec(Wm, true) : spec;
  const sp = Object.assign({}, sp0);
  if (typeof spec !== 'function') for (const k of ['grip', 'elbow', 'axis', 'palm']) if (sp[k]) sp[k] = mz(sp[k]);
  if (sp.gripZ != null && typeof spec !== 'function') sp.gripZ = -sp.gripZ;
  const s = armR(m, contacts, sp), out = clone(pose);
  for (const j of ARMJ) if (s.ch[`${j}_r`]) out.ch[`${j}_l`] = clone(s.ch[`${j}_r`]);
  out.__err = s.__err;
  return out;
}

// Band strands [[anchor, end], ...] for the band props of a module at world pose W (anchor point, or the anchor joint)
function strands(W, props) {
  const out = [];
  for (const pr of props || []) {
    if (pr.kind !== 'band' || !pr.attach) continue;
    const side = pr.attach.joint === 'wrist_l' ? 'l' : 'r', two = !!pr.attach.with;
    const a = pr.anchorJoint ? W[pr.anchorJoint].p : pr.anchor;
    const g1 = EQ.gripPoint(W, side).p;
    if (!a) { if (two) out.push([g1, EQ.gripPoint(W, side === 'r' ? 'l' : 'r').p]); continue; }
    out.push([a, g1]);
    if (two) out.push([a, EQ.gripPoint(W, side === 'r' ? 'l' : 'r').p]);
  }
  return out;
}

// Whole loop: floor, planted contacts, still joints, arm channel jumps, band strands clear of the body (skip: shapes the
// band may rest on, e.g. the foot that stands on it), measure peak, stored channels inside the rig limits.
const ARMCH = ['shoulder_r', 'elbow_r', 'wrist_r', 'sc_r', 'shoulder_l', 'elbow_l', 'wrist_l', 'sc_l'];
function scan(ex, { skip = /^(hand|thumb|forearm)_/, still = [], n = 1200, measure = null } = {}) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, planted = (ex.checks && ex.checks.plantedContacts) || [];
  const W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  const out = { floor: 1e9, floorAt: null, slide: 0, drift: 0, jump: { v: 0 }, band: { d: 1e9 }, peak: -1e9 };
  let prevIk = null, prevCh = null;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    for (const id of planted) {
      const k = pz.ik && pz.ik[id]; if (!k || (k.weight ?? 1) < 0.999) continue;
      const c = ex.contacts.find((x) => x.id === id); out.slide = Math.max(out.slide, V.len(V.sub(W[c.chain[2]].p, k.target)));
      if (prevIk && prevIk[id] && (prevIk[id].weight ?? 1) >= 0.999) out.slide = Math.max(out.slide, V.len(V.sub(k.target, prevIk[id].target)));
    }
    prevIk = pz.ik ? clone(pz.ik) : null;
    for (const j of still) out.drift = Math.max(out.drift, V.len(V.sub(W[j].p, W0[j].p)));
    const cc = {}; for (const j of ARMCH) for (const c in pz.ch[j] || {}) cc[`${j}.${c}`] = pz.ch[j][c];
    if (prevCh) for (const k in cc) { const d = Math.abs(cc[k] - (prevCh[k] ?? cc[k])); if (d > out.jump.v) out.jump = { v: +d.toFixed(2), k, t: +t.toFixed(2) }; }
    prevCh = cc;
    for (const [a, b] of strands(W, ex.props)) { const c = EQ.lineClear(W, a, b, BAND_R, { skip }); if (c.d < out.band.d) out.band = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; }
    if (measure) out.peak = Math.max(out.peak, measure(W, pz));
  }
  out.floor = +out.floor.toFixed(2); out.slide = +out.slide.toFixed(3); out.drift = +out.drift.toFixed(3); out.peak = +out.peak.toFixed(1);
  out.limits = C.limits(ex.poses);
  return out;
}
function gate(name, rep, { minBand = 0, maxJump = 6, range = null } = {}) {
  const bad = [];
  if (rep.slide > 0.05) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.drift > 0.05) bad.push(`still joints drift ${rep.drift} cm`);
  if (rep.floor < -0.5) bad.push(`below the floor ${rep.floor} (${rep.floorAt})`);
  if (rep.band.d < minBand) bad.push(`band clearance ${rep.band.d} cm (${rep.band.id} at ${rep.band.t}s)`);
  if (rep.jump.v > maxJump) bad.push(`channel jump ${rep.jump.v} deg (${rep.jump.k} at ${rep.jump.t}s)`);
  if (range && (rep.peak < range[0] || rep.peak > range[1])) bad.push(`peak measure ${rep.peak} outside ${range}`);
  if (rep.limits.length) bad.push(`joint limits ${rep.limits.join(', ')}`);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
}
// The same measures test/verify.mjs uses
const MEASURE = {
  kneeFlexion: (W) => Math.max(R.measures(W).knee, 180 - V.angle(V.sub(W.hip_l.p, W.knee_l.p), V.sub(W.ankle_l.p, W.knee_l.p))),
  hipFlexion: (W, pose) => Math.max(pose.ch.hip_r?.flex ?? 0, pose.ch.hip_l?.flex ?? 0),
  trunkFlexion: (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]),
  shoulderLineIncl: (W) => R.measures(W).shoulderLineIncl,
};

// A rack turned side-on (rotY 90: the two uprights stand one behind the other along X at z) with the band tied round the
// upright at x = ux. The second upright stands `toward` (+1 / -1) along X, 120 cm away. Returns { prop, anchor(y) }.
function uprightX(ux, z, { toward = -1, hookY = 150, height = 230, id = 'rack' } = {}) {
  const prop = { id, kind: 'rack', center: [r1(ux + toward * 60), 0, r1(z)], size: [0, height, 120], hookY, rotY: 90 };
  return { prop, anchor: (y, off = [0, 0]) => [r1(ux + off[0]), r1(y), r1(z + off[1])] };
}
// A rack in its usual orientation (uprights at z = cz +- 60) with the band round the upright at z = uz; the other
// upright is 120 cm away toward `toward` along Z.
function uprightZ(x, uz, { toward = 1, hookY = 150, height = 230, id = 'rack', facing = 1 } = {}) {
  const prop = { id, kind: 'rack', center: [r1(x), 0, r1(uz + toward * 60)], size: [0, height, 120], hookY };
  if (facing < 0) prop.rotY = 180;
  return { prop, anchor: (y, off = [0, 0]) => [r1(x + off[0]), r1(y), r1(uz + off[1])] };
}
const band = (id, attach, anchor, extra = {}) => Object.assign({ id, kind: 'band', color: BAND_COLOR, attach }, anchor ? (typeof anchor === 'string' ? { anchorJoint: anchor } : { anchor: anchor.map(r1) }) : {}, extra);

// Point in a joint's frame (local offset, cm) to world
const inFrame = (W, j, v) => V.add(W[j].p, Q.rot(W[j].q, v));
const deg = (v) => `≈${Math.round(v)}°`;
const angleOf = (a, b) => V.angle(a, b);

module.exports = { armR, BAND_R, BAND_COLOR, mz, armSide, strands, scan, gate, MEASURE, uprightX, uprightZ, band, inFrame, deg, angleOf };
