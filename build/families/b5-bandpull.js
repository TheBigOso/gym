// Batch 5, band family (b5-bandpull): resistance-band props and loop checks for band rows, raises, face pulls, curls and the
// squat to press. Builds on build/families/equip.js (EQ) and eq-cable.js without changing them.
//  - Bands under the feet: one band per hand, anchored to the foot (anchorJoint 'toe_r' / 'toe_l', the ball of the foot).
//  - Bands anchored to a rack upright: the rack stands in front of (or behind) the athlete with one upright on the
//    midline (z = 0), and a band held in both hands runs as two strands from the upright to the hands.
const L = require('../lib');
const { V, r1 } = L;
const H = require('./hips');
const EQ = require('./equip');

const BAND_COLOR = '#d9534f';
const POST = 6; // rack upright section (cm)

// one band per hand, each looped under the ball of its own foot
function feetBands({ color = BAND_COLOR } = {}) {
  return ['r', 'l'].map((s) => ({ id: `band_${s}`, kind: 'band', color, anchorJoint: `toe_${s}`, attach: { joint: `wrist_${s}` } }));
}
// Rack in front of the athlete (who faces +X; behind: true puts it behind the athlete): one upright on the midline at x
// (its face toward the athlete at x -/+ POST / 2), the other `width` cm to the left; the J-hooks point toward the athlete.
// The band is looped round the upright at height y.
function rackAnchor({ x, y, width = 120, hookY = null, behind = false, color = BAND_COLOR } = {}) {
  const hy = hookY ?? (Math.abs(y - 140) < 25 ? (y > 140 ? y - 40 : y + 40) : 140);
  const rk = EQ.rack({ x, z: -width / 2, width, hookY: r1(hy), facing: behind ? 1 : -1, id: 'rack' });
  const anchor = [r1(x + (behind ? 1 : -1) * POST / 2), r1(y), 0];
  return { rack: rk.prop, anchor, band: { id: 'band', kind: 'band', color, anchor, attach: { joint: 'wrist_r', with: 'wrist_l' } } };
}
// Rack centred on the athlete's midline, uprights `width` apart (z = +-width / 2): one band per hand, each looped round
// its own upright at height y (the right hand's band on the right upright).
function rackPair({ x, y, width = 120, hookY = null, behind = false, color = BAND_COLOR } = {}) {
  const hy = hookY ?? (Math.abs(y - 140) < 25 ? (y > 140 ? y - 40 : y + 40) : 140);
  const rk = EQ.rack({ x, z: 0, width, hookY: r1(hy), facing: behind ? 1 : -1, id: 'rack' });
  const ax = r1(x + (behind ? 1 : -1) * POST / 2), anchors = { r: [ax, r1(y), width / 2], l: [ax, r1(y), -width / 2] };
  return { rack: rk.prop, anchors, bands: ['r', 'l'].map((s) => ({ id: `band_${s}`, kind: 'band', color, anchor: anchors[s], attach: { joint: `wrist_${s}` } })) };
}
const pairStrands = (anchors) => (W) => [[anchors.r, grip(W, 'r')], [anchors.l, grip(W, 'l')]];
// strand end points for the props above (the player draws each strand to the hand's grip point)
const grip = (W, s) => EQ.gripPoint(W, s).p;
const feetStrands = (W) => [[W.toe_r.p, grip(W, 'r')], [W.toe_l.p, grip(W, 'l')]];
const rackStrands = (anchor) => (W) => [[anchor, grip(W, 'r')], [anchor, grip(W, 'l')]];

// Loop scan: floor and planted contacts, arm-channel jumps, and every strand's clearance from the body. `skip` leaves out
// shapes the strand rests on by design (the hands and forearms at the hand end; the feet under the band).
const ARMCH = ['shoulder_r', 'elbow_r', 'wrist_r', 'sc_r', 'shoulder_l', 'elbow_l', 'wrist_l', 'sc_l'];
function scan(ex, { planted = ['leg_r', 'leg_l'], strands, skip = /^(hand|thumb|forearm)_/, probe = null } = {}) {
  let jump = { v: 0 }, prev = null, lc = { d: 1e9 }, len = [1e9, -1e9], post = { d: 1e9 };
  const rk = (ex.props || []).find((pr) => pr.kind === 'rack');
  // the rack's uprights near the athlete must stay clear of the whole body, hands included
  const uz = rk ? [rk.center[2] - rk.size[2] / 2, rk.center[2] + rk.size[2] / 2].filter((z) => Math.abs(z) < 80) : [];
  const uprights = uz.map((z) => [[rk.center[0], 0, z], [rk.center[0], rk.size[1], z]]);
  const rep = H.loopReport(ex, {
    planted,
    probe: (W, pz, t, out) => {
      const cc = {}; for (const j of ARMCH) for (const c in pz.ch[j] || {}) cc[`${j}.${c}`] = pz.ch[j][c];
      if (prev) for (const k in cc) { const d = Math.abs(cc[k] - (prev[k] ?? cc[k])); if (d > jump.v) jump = { v: +d.toFixed(2), k, t: +t.toFixed(2) }; }
      prev = cc;
      for (const [a, b] of strands(W)) {
        const c = EQ.lineClear(W, a, b, 0.6, { skip }); if (c.d < lc.d) lc = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
        const l = V.len(V.sub(b, a)); len = [Math.min(len[0], l), Math.max(len[1], l)];
      }
      for (const u of uprights) { const c = EQ.segmentClear(W, u[0], u[1], POST / 2, { skip: /^$/, n: 80 }); if (c.d < post.d) post = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; }
      if (probe) probe(W, pz, t, out);
    },
  });
  rep.jump = jump; rep.line = lc; rep.strand = len.map((v) => +v.toFixed(1)); if (uprights.length) rep.upright = post;
  return rep;
}
function gate(name, rep, { minLine = 0, maxJump = 4 } = {}) {
  const bad = [];
  if (rep.slide > 0.05) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < -0.5) bad.push(`below the floor ${rep.floor}`);
  if (rep.line.d < minLine) bad.push(`band clearance ${rep.line.d} cm (${rep.line.id} at ${rep.line.t}s)`);
  if (rep.jump.v > maxJump) bad.push(`channel jump ${rep.jump.v} deg (${rep.jump.k} at ${rep.jump.t}s)`);
  if (rep.upright && rep.upright.d < 2) bad.push(`rack upright ${rep.upright.d} cm from the body (${rep.upright.id})`);
  if (rep.strand && rep.strand[0] < 5) bad.push(`band strand too short ${rep.strand[0]} cm`);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
}

// Right arm from directions: the upper arm along `u` from the shoulder (after the shoulder-girdle change `sc`), the
// forearm along `f` from the elbow, or toward the point `fTo` (e.g. the band anchor), the palm facing `palm`. The left
// arm is the mirror copy. Returns the pose (with __err) for chaining guesses.
const F3 = require('./b3-shoulders');
function armFrom(basePose, contacts, { sc, u, f = null, fTo = null, fMix = 0, palm, guess, wPalm = 4, flexCap = 0.3 }) {
  const p = L.clone(basePose);
  if (sc) { p.ch.sc_r = L.clone(sc); p.ch.sc_l = L.clone(sc); }
  const S = L.fk(p, contacts).shoulder_r.p, E = V.add(S, V.scale(V.norm(u), L.UA - 0.05));
  let fd = f ? V.norm(f) : null;
  if (fTo) { const toward = V.norm(V.sub(fTo, E)); fd = fd ? V.norm(V.add(V.scale(toward, 1 - fMix), V.scale(fd, fMix))) : toward; }
  const Wt = V.add(E, V.scale(fd, L.FA - flexCap));
  const q = F3.solveArm(p, { wrist: Wt, elbow: E, palm, wPalm, guess });
  return q;
}
const slerp = (a, b, t) => { a = V.norm(a); b = V.norm(b); const om = Math.acos(Math.max(-1, Math.min(1, V.dot(a, b)))); if (om < 1e-4) return a; const s = Math.sin(om); return V.add(V.scale(a, Math.sin((1 - t) * om) / s), V.scale(b, Math.sin(t * om) / s)); };
const ease = (u) => u * u * (3 - 2 * u);

const ANDERSEN = { id: 'andersen2010', title: 'Andersen, Andersen, Mortensen, Poulsen, Bjornlund and Zebis 2010, muscle activation and perceived loading during rehabilitation exercises: comparison of dumbbells and elastic resistance (Phys Ther 90(4):538-549)', url: 'https://doi.org/10.2522/ptj.20090167' };

module.exports = { BAND_COLOR, feetBands, rackAnchor, rackPair, feetStrands, rackStrands, pairStrands, scan, gate, armFrom, slerp, ease, ANDERSEN };
