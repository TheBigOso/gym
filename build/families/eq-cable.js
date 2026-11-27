// Equipment pack (cable and band demos): a right-arm solver on the equipment grip point, mirroring, and a loop scan for
// cable / band lines and two-hand grip width. Builds on build/families/equip.js (EQ) without changing it.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const EQ = require('./equip');

const near = (v, ref) => v + 360 * Math.round((ref - v) / 360);
const SOFT = { 'ch.shoulder_r.plane': [-60, 140], 'ch.shoulder_r.elev': [0, 200], 'ch.elbow_r.flex': [0, 150], 'ch.wrist_r.pron': [-15, 175], 'ch.wrist_r.flex': [-80, 70], 'ch.wrist_r.dev': [-18, 33] };
const palmOf = (W, s = 'r') => Q.rot(W[`wrist_${s}`].q, [1, 0, 0]);

// Right arm on the handle grip point. spec: { flex (fixed elbow flexion; omit to solve it), elbow (world target), grip
// (world target for the grip point), gripZ (only the grip's z), axis (handle axis direction, either sign), palm (world
// dir), guess {plane, elev, axial, pron, flex}, wFlex, wDev (wrist flex / dev regularisation), lockUA (keep the guess's
// plane and elevation: the elbow stays exactly still) }
function armR(pose, contacts, spec) {
  const g = spec.guess || { plane: 30, elev: 20, axial: 0, pron: 90, flex: 20 };
  const paths = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
  if (spec.flex == null) paths.push('ch.elbow_r.flex');
  if (spec.lockUA) paths.splice(0, 2); // upper arm held (plane, elev from the guess): only axial rotation and the wrist
  const objs = [];
  if (spec.elbow) objs.push(L.obj.at('elbow_r', spec.elbow, spec.wElbow ?? 3));
  if (spec.grip) objs.push((W) => V.sub(EQ.gripPoint(W, 'r').p, spec.grip).map((v) => v * (spec.wGrip ?? 3)));
  if (spec.gripZ != null) objs.push((W) => [(EQ.gripPoint(W, 'r').p[2] - spec.gripZ) * 3]);
  if (spec.axis) { const a = V.norm(spec.axis); objs.push((W) => [(1 - Math.abs(V.dot(EQ.gripPoint(W, 'r').ax, a))) * 20]); }
  if (spec.palm) objs.push((W) => V.sub(palmOf(W), V.norm(spec.palm)).map((v) => v * (spec.wPalm ?? 4)));
  objs.push((W, q) => paths.map((p) => { const lim = SOFT[p], v = L.getPath(q, p); return lim ? (Math.max(0, lim[0] - v) + Math.max(0, v - lim[1])) * 3 : 0; }));
  objs.push(L.obj.reg('ch.wrist_r.flex', spec.wristFlex ?? 0, spec.wFlex ?? 0.08), L.obj.reg('ch.wrist_r.dev', 0, spec.wDev ?? 0.08), L.obj.reg('ch.shoulder_r.axial', spec.axialRef ?? g.axial, spec.wAxial ?? 0.01), L.obj.reg('ch.shoulder_r.plane', g.plane, 0.003));
  let best = null;
  const seeds = [g, { ...g, axial: g.axial - 40 }, { ...g, axial: g.axial + 40 }, { ...g, pron: g.pron + 40 }, { ...g, pron: g.pron - 40 }];
  for (const s of seeds) {
    const q0 = clone(pose);
    q0.ch.shoulder_r = { plane: s.plane, elev: s.elev, axial: s.axial }; q0.ch.elbow_r = { flex: spec.flex ?? s.flex ?? 20 };
    q0.ch.wrist_r = { pron: s.pron, flex: spec.wristFlex ?? 0, dev: 0 };
    const r = L.solvePose(q0, paths, objs, { iters: 500, contacts });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const p = best.pose, sh = p.ch.shoulder_r;
  sh.plane = r1(near(sh.plane, g.plane)); sh.axial = r1(near(sh.axial, g.axial)); p.ch.wrist_r.pron = r1(near(p.ch.wrist_r.pron, g.pron));
  const W = L.fk(p, contacts);
  p.__err = { cost: +best.cost.toFixed(3), elbow: spec.elbow ? +V.len(V.sub(W.elbow_r.p, spec.elbow)).toFixed(2) : 0, grip: spec.grip ? +V.len(V.sub(EQ.gripPoint(W, 'r').p, spec.grip)).toFixed(2) : 0 };
  return p;
}
const guessOf = (p) => ({ plane: p.ch.shoulder_r.plane, elev: p.ch.shoulder_r.elev, axial: p.ch.shoulder_r.axial, pron: p.ch.wrist_r.pron, flex: p.ch.elbow_r.flex });
const mirrorArm = (p) => { for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) if (p.ch[`${j}_r`]) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); delete p.__err; return p; };
const strip = (p) => { delete p.__err; return p; };

// Loop scan: floor and planted feet (H.loopReport), channel jumps, the cable / band line's clearance from the body, the
// one-hand item's clearance, and the two-hand grip width.
const ARMCH = ['shoulder_r', 'elbow_r', 'wrist_r', 'sc_r', 'shoulder_l', 'elbow_l', 'wrist_l', 'sc_l'];
function scan(ex, { planted = ['leg_r', 'leg_l'], line = null, lineSkip = null } = {}) {
  let jump = { v: 0 }, prev = null, lc = { d: 1e9 }, w = [1e9, -1e9];
  const rep = H.loopReport(ex, {
    planted,
    probe: (W, pz, t) => {
      const cc = {}; for (const j of ARMCH) for (const c in pz.ch[j] || {}) cc[`${j}.${c}`] = pz.ch[j][c];
      if (prev) for (const k in cc) { const d = Math.abs(cc[k] - (prev[k] ?? cc[k])); if (d > jump.v) jump = { v: +d.toFixed(2), k, t: +t.toFixed(2) }; }
      prev = cc;
      if (line) { const [a, b] = line(W); const c = EQ.lineClear(W, a, b, 0.5, lineSkip ? { skip: lineSkip } : {}); if (c.d < lc.d) lc = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; }
      const bw = EQ.barAt(W).width; w = [Math.min(w[0], bw), Math.max(w[1], bw)];
    },
  });
  rep.jump = jump; rep.line = lc; rep.gripWidth = w.map((v) => +v.toFixed(2));
  return rep;
}
function gate(name, rep, { minLine = 0, maxJump = 4, maxWidth = 1.5, checkWidth = true } = {}) {
  const bad = [];
  if (rep.slide > 0.05) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < -0.5) bad.push(`below the floor ${rep.floor}`);
  if (rep.line.d < minLine) bad.push(`line clearance ${rep.line.d} cm (${rep.line.id} at ${rep.line.t}s)`);
  if (rep.jump.v > maxJump) bad.push(`channel jump ${rep.jump.v} deg (${rep.jump.k} at ${rep.jump.t}s)`);
  if (checkWidth && rep.gripWidth[1] - rep.gripWidth[0] > maxWidth) bad.push(`grip width varies ${rep.gripWidth.join('-')} cm`);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
}
// joint-limit check on the stored channels (as test/verify.mjs does)
function limits(poses) {
  const viol = [];
  for (const [name, p] of Object.entries(poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${name}.${j}.${c}=${p.ch[j][c]}`); }
  if (viol.length) { console.error(`FAIL joint limits: ${viol.join(', ')}`); process.exitCode = 1; }
  return viol;
}
const elbowAng = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));

module.exports = { armR, guessOf, mirrorArm, strip, scan, gate, limits, palmOf, elbowAng, near };
