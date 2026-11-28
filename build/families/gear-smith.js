// Smith machine authoring helpers (gear pack; the prop is drawn by src/gear/smith.js).
// The Smith bar can only move along its guide rails: the player puts the bar centre at the midpoint of the hands' 'bar'
// grip points projected onto the rail line. Author the hands so that midpoint stays ON the rail line (railOff in the sweep,
// keep it under about 0.5 cm), with the grip width constant (verify checks it, within 1.5 cm).
//  - smith(opts): the frame prop + the invisible grip marker (closes both hands); returns the rail line as well.
//  - railPoint(sm, y): bar centre on the rails at height y. projectToRail(sm, p): closest rail point, offset, height.
//  - armsOnSmith(pose, sm, y, width, opt): right arm on the bar at height y (barbell.js armsOnBar), mirrored to the left.
//  - barGeometry / barBodyClear / barFloor: the Smith bar (shaft, sleeves, plates outside the rails) vs the body / floor.
//  - frameClear(W, sm): clearance of the guide rails and posts from the body.
//  - sweep(ex, sm, opt): whole-loop report (grip width, rail offset, bar travel, bar vs body / floor, frame vs body,
//    planted contacts, floor).
// Units: cm, world axes (+X forward, +Y up, +Z the figure's right). The rail line runs in the XY plane at z = sm.z.
const L = require('../lib');
const { R, V, rig, clone } = L;
const EQ = require('./equip');
const BB = require('./barbell');

const GRIP = 'bar';
const SM = { shaftR: 1.4, sleeveR: 2.5, sleeve: 34, plateW: 5.5, railR: 1.6, post: 6, carriage: 16 }; // matches src/gear/smith.js

/**
 * smith({ x, z, incline, width, height, depth, plates, plateD, restY, hookY, safetyY, barMin, barMax, follow, id, color })
 * x: where the rail line meets the floor; incline: degrees from vertical, + = top toward +X; width: rail spacing (124).
 * Returns { prop, grip, props: [prop, grip], x, z, incline, dir, width, height, depth, plates, plateD, barMin, barMax }.
 */
function smith(o = {}) {
  const { x = 0, z = 0, incline = 0, width = 124, height = 220, depth = 110, plates = 1, plateD = 45, id = 'smith' } = o;
  const params = { incline, plates, plateD };
  for (const k of ['restY', 'hookY', 'safetyY', 'barMin', 'barMax', 'follow', 'plateColor']) if (o[k] != null) params[k] = o[k];
  const prop = { id, kind: 'smith', center: [x, 0, z], size: [depth, height, width], params };
  if (o.color) prop.color = o.color;
  const grip = { id: `${id}_grip`, kind: 'smith', attach: { joint: 'wrist_r', with: 'wrist_l', grip: GRIP } };
  const a = incline * R.DEG;
  const barMin = o.barMin ?? Math.max(plateD / 2 + 2, o.safetyY ?? 0), barMax = o.barMax ?? height - 22;
  return { prop, grip, props: [prop, grip], x, z, incline, dir: [Math.sin(a), Math.cos(a), 0], width, height, depth, plates, plateD, barMin, barMax, hookY: o.hookY, safetyY: o.safetyY };
}
// Bar centre on the rails at height y
const railPoint = (sm, y) => [sm.x + (y * sm.dir[0]) / sm.dir[1], y, sm.z];
// Closest point of the rail line to p: { c (bar centre), off (distance, cm), y (height of c), clamped (c held at a travel limit) }
function projectToRail(sm, p) {
  const o = [sm.x, 0, sm.z], s = V.dot(V.sub(p, o), sm.dir), y = s * sm.dir[1];
  const yc = Math.max(sm.barMin, Math.min(sm.barMax, y)), c = railPoint(sm, yc);
  return { c, off: V.len(V.sub(p, c)), y: yc, clamped: yc !== y };
}
// Grip points for a bar at height y with the hands `width` cm apart
const grips = (sm, y, width) => EQ.barGrips(railPoint(sm, y), [0, 0, 1], width);
// Right arm on the Smith bar at height y (bar grip in the heel of the palm), mirrored to the left. opt as BB.armsOnBar.
function armsOnSmith(p, sm, y, width, opt = {}) { return BB.armsOnBar(p, grips(sm, y, width).r, opt); }
// Where the player draws the bar for a pose: hands' midpoint projected to the rails
function barAt(W, sm) { const b = EQ.barAt(W, GRIP), pr = projectToRail(sm, b.c); return { ...pr, width: b.width, hands: b.c }; }
// Bar segments as capsules [a, b, r] and plate discs { c, ax, r, w } for a bar centred at c (on the rails)
function barGeometry(sm, c) {
  const at = (z) => V.add(c, [0, 0, z]), h = sm.width / 2, caps = [[at(-h), at(h), SM.shaftR]], discs = [];
  for (const s of [-1, 1]) {
    caps.push([at(s * (h + 4)), at(s * (h + 4 + SM.sleeve)), SM.sleeveR]);
    for (let i = 0; i < sm.plates; i++) discs.push({ c: at(s * (h + 10.5 + i * 6)), ax: [0, 0, 1], r: sm.plateD / 2, w: SM.plateW });
  }
  return { caps, discs };
}
// Lowest point of the bar and plates (cm)
function barFloor(sm, c) { return Math.min(c[1] - SM.shaftR, ...(sm.plates ? [c[1] - sm.plateD / 2] : [])); }
// Bar (shaft + sleeves + plates) clearance from the body shapes; skip: RegExp of shape ids (default the hands / forearms)
const SHAPES = rig.shapes.flatMap((s) => (s.bilateral ? [`${s.id}_r`, `${s.id}_l`] : [s.id]));
function barBodyClear(W, sm, opt = {}) {
  const c = opt.c || barAt(W, sm).c, g = barGeometry(sm, c), skip = opt.skip || /^(hand|thumb|forearm)_/;
  let best = { d: 1e9 };
  for (const [a, b, r] of g.caps) { const k = EQ.segmentClear(W, a, b, r, { skip, n: 24 }); if (k.d < best.d) best = k; }
  for (const d of g.discs) {
    const pts = [];
    for (const face of [-1, 1]) for (const rr of [0.5, 1]) for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI; pts.push(V.add(d.c, [Math.cos(a) * d.r * rr, Math.sin(a) * d.r * rr, (face * d.w) / 2])); }
    for (const id of SHAPES) { if (skip.test(id)) continue; for (const p of pts) { const dd = EQ.pointShape(W, p, id); if (dd < best.d) best = { d: dd, id, plate: true }; } }
  }
  return best;
}
// Frame (guide rails from 5 cm to the top, posts) clearance from the body
function frameClear(W, sm, opt = {}) {
  const skip = opt.skip || /^$/, top = sm.height - 6, pz = sm.width / 2 + 7, segs = [];
  for (const s of [-1, 1]) {
    segs.push([[...railPoint(sm, 5).slice(0, 2), sm.z + s * sm.width / 2], [...railPoint(sm, top).slice(0, 2), sm.z + s * sm.width / 2], SM.railR]);
    const xo = (railPoint(sm, top)[0] - sm.x) / 2;
    for (const x of [-sm.depth / 2, sm.depth / 2]) segs.push([[sm.x + x + xo, 0, sm.z + s * pz], [sm.x + x + xo, sm.height, sm.z + s * pz], SM.post * 0.6]);
  }
  let best = { d: 1e9 };
  for (const [a, b, r] of segs) { const k = EQ.segmentClear(W, a, b, r, { skip, n: 24 }); if (k.d < best.d) best = k; }
  return best;
}
// Whole loop: opt { skip (bar vs body), planted, fixed: [joints], probe(W, pz, t, out) }
function sweep(ex, sm, opt = {}, n = 600) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, planted = opt.planted || (ex.checks && ex.checks.plantedContacts) || [];
  const out = { width: [1e9, -1e9], railOff: 0, railOffAt: null, clamped: 0, travel: [1e9, -1e9], barBody: 1e9, barBodyAt: null, barFloor: 1e9, frame: 1e9, frameAt: null, floor: 1e9, floorAt: null, slide: 0, drift: 0 };
  const W0 = R.evalPose(rig, tl.pose(0), ex.contacts);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts), b = barAt(W, sm);
    out.width = [Math.min(out.width[0], b.width), Math.max(out.width[1], b.width)];
    if (b.off > out.railOff) { out.railOff = b.off; out.railOffAt = +t.toFixed(2); }
    if (b.clamped) out.clamped++;
    out.travel = [Math.min(out.travel[0], b.y), Math.max(out.travel[1], b.y)];
    const c = barBodyClear(W, sm, { c: b.c, skip: opt.skip }); if (c.d < out.barBody) { out.barBody = c.d; out.barBodyAt = [c.id, c.plate ? 'plate' : 'bar', +t.toFixed(2)]; }
    out.barFloor = Math.min(out.barFloor, barFloor(sm, b.c));
    if (i % 4 === 0) { const fr = frameClear(W, sm); if (fr.d < out.frame) { out.frame = fr.d; out.frameAt = [fr.id, +t.toFixed(2)]; } }
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    for (const id of planted) {
      const k = pz.ik && pz.ik[id]; if (!k || (k.weight ?? 1) < 0.999) continue;
      const cc = ex.contacts.find((x) => x.id === id);
      let sl = V.len(V.sub(W[cc.chain[2]].p, k.target));
      if (prev && prev[id] && (prev[id].weight ?? 1) >= 0.999) sl = Math.max(sl, V.len(V.sub(k.target, prev[id].target)));
      out.slide = Math.max(out.slide, sl);
    }
    for (const j of opt.fixed || []) out.drift = Math.max(out.drift, V.len(V.sub(W[j].p, W0[j].p)));
    if (opt.probe) opt.probe(W, pz, t, out);
    prev = pz.ik ? clone(pz.ik) : null;
  }
  out.width = out.width.map((v) => +v.toFixed(2)); out.widthRange = +(out.width[1] - out.width[0]).toFixed(2); out.travel = out.travel.map((v) => +v.toFixed(1));
  for (const k of ['railOff', 'barBody', 'barFloor', 'frame', 'floor', 'slide', 'drift']) out[k] = +out[k].toFixed(2);
  return out;
}
// Standard self-check failures (sets process.exitCode); returns the list of messages
function fail(sw, { railOff = 0.6, width = 1.0, barBody = 0, frame = 0.5 } = {}) {
  const m = [];
  if (sw.widthRange > width) m.push('hands do not keep a constant grip width');
  if (sw.railOff > railOff) m.push(`hands' midpoint leaves the rail line by ${sw.railOff} cm (the bar would sit off the hands)`);
  if (sw.clamped) m.push('bar driven past its travel limits');
  if (sw.barBody < barBody) m.push('bar or plates through the body');
  if (sw.barFloor < 0) m.push('plates through the floor');
  if (sw.frame < frame) m.push('body touches the rails or posts');
  if (sw.slide > 0.05 || sw.drift > 0.05) m.push('planted contacts move');
  for (const s of m) console.error(`FAIL: ${s}`);
  if (m.length) process.exitCode = 1;
  return m;
}

module.exports = { SM, GRIP, smith, railPoint, projectToRail, grips, armsOnSmith, barAt, barGeometry, barFloor, barBodyClear, frameClear, sweep, fail };
