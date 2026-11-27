// Band pushing family (batch 5): band presses, flyes and triceps extensions. Resistance bands are drawn by the player as
// strands from an anchor to the hand's grip point (src/player.js placeHeld). A bilateral band move uses two one-hand
// band props (one per hand), each anchored to something visible: a rack upright behind the bench, the bench frame, a
// pull-up bar, or a foot (anchorJoint). Helpers here build those props, place a rack behind an incline bench, and scan
// the loop so every strand stays clear of the body. Builds on equip.js (EQ) and eq-cable.js without changing them.
const L = require('../lib');
const { V, r1 } = L;
const H = require('./hips');
const EQ = require('./equip');

const COLOR = { light: '#e3b23c', medium: '#d9534f', heavy: '#2f6fb3' }; // band colours by tension (yellow, red, blue)
const mz = (p) => [p[0], p[1], -p[2]];

// One band strand per hand. spec: { anchor: [x, y, z] (right hand; the left hand gets the mirror) | anchorJoint: 'toe_r'
// (the left hand gets 'toe_l'), sides: ['r', 'l'], color }
function bandProps({ anchor = null, anchorJoint = null, sides = ['r', 'l'], color = COLOR.medium, id = 'band' } = {}) {
  return sides.map((s) => {
    const pr = { id: sides.length > 1 ? `${id}${s.toUpperCase()}` : id, kind: 'band', color, attach: { joint: `wrist_${s}`, grip: 'handle' } };
    if (anchorJoint) pr.anchorJoint = s === 'r' ? anchorJoint : anchorJoint.replace(/_r$/, '_l');
    else pr.anchor = (s === 'r' ? anchor : mz(anchor)).map(r1);
    return pr;
  });
}
// A two-hand band with one anchor (two strands from the same point)
function bandTwoHand({ anchor = null, anchorJoint = null, color = COLOR.medium, id = 'band' } = {}) {
  const pr = { id, kind: 'band', color, attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' } };
  if (anchorJoint) pr.anchorJoint = anchorJoint; else pr.anchor = anchor.map(r1);
  return pr;
}
// The strands of the band props as segments [anchor, grip point] in world cm
function strands(W, props) {
  const out = [];
  for (const pr of props) {
    if (pr.kind !== 'band' || !(pr.anchor || pr.anchorJoint)) continue;
    const a = pr.anchorJoint ? EQ.jointAnchor(W, pr.anchorJoint) : pr.anchor, sides = [pr.attach.joint.slice(-1)];
    if (pr.attach.with) sides.push(pr.attach.with.slice(-1));
    for (const s of sides) out.push({ a, b: EQ.gripPoint(W, s).p, side: s, id: pr.id });
  }
  return out;
}
// Loop scan of the strands' clearance from the body (cm, < 0 = through the body). The holding hand and forearm are
// skipped at the hand end; `skip` widens that (e.g. the foot a band runs under). Also returns the strand lengths
// (shortest / longest: the band should stay stretched) and the rest of H.loopReport.
function scanBands(ex, { planted = [], skip = null, r = 0.6, probe = null } = {}) {
  let clear = { d: 1e9 }, len = [1e9, -1e9];
  const props = ex.props.filter((p) => p.kind === 'band');
  const rep = H.loopReport(ex, { planted, probe: (W, pz, t, out) => {
    for (const s of strands(W, props)) {
      const sk = skip || new RegExp(`^(hand|thumb|forearm)_${s.side}$`);
      const c = EQ.lineClear(W, s.a, s.b, r, { skip: sk });
      if (c.d < clear.d) clear = { d: +c.d.toFixed(2), id: c.id, strand: s.id, side: s.side, t: +t.toFixed(2) };
      const l = V.len(V.sub(s.b, s.a)); len = [Math.min(len[0], l), Math.max(len[1], l)];
    }
    if (probe) probe(W, pz, t, out);
  } });
  rep.band = clear; rep.bandLen = len.map(r1);
  return rep;
}
function gateBands(name, rep, { minClear = 0.5, maxSlide = 0.05 } = {}) {
  const bad = [];
  if (rep.band.d < minClear) bad.push(`band strand ${rep.band.d} cm from the body (${rep.band.id}, ${rep.band.strand} at ${rep.band.t}s)`);
  if (rep.slide > maxSlide) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < -0.5) bad.push(`below the floor ${rep.floor}`);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
}

// Incline bench (b3-chest makeBench: hinge at x = 0, pad rising toward -X, 80 cm long): a rack (stands only) behind the
// top of the pad with the band looped around each upright at height y. Returns { rack, anchor (right side) }.
function rackBehindBench({ x = -85, width = 120, y = 40, hookY = 125 } = {}) {
  const rk = EQ.rack({ x, width, hookY, id: 'rack' });
  return { rack: rk.prop, anchor: [x, y, width / 2] };
}
// Replace a dumbbell module's dumbbells with band props (keeps the other props, e.g. the bench)
function swapDumbbells(ex, extra) {
  ex.props = ex.props.filter((p) => p.kind !== 'dumbbell').concat(extra);
  return ex;
}
// Staggered standing stance from b3-shoulders standing(): the right foot `front` cm forward and the left `back` cm back
// (feet `stance` cm off the midline), pelvis lowered until the shorter-reaching leg bends `knee` degrees. Planted feet.
function staggered({ front = 20, back = 15, stance = 12, knee = 8, toe = 8 } = {}) {
  const F3 = require('./b3-shoulders');
  const st = F3.standing({ stance, toe, knee: 2 }), p = L.clone(st.pose);
  p.ik.leg_r.target = [front, p.ik.leg_r.target[1], stance]; p.ik.leg_l.target = [-back, p.ik.leg_l.target[1], -stance];
  p.root.pos[0] = r1((front - back) / 2);
  let a = p.root.pos[1] - 15, b = p.root.pos[1] + 2;
  for (let i = 0; i < 40; i++) { const y = (a + b) / 2, q = L.clone(p); q.root.pos[1] = y; const W = L.fk(q, st.contacts); if (Math.min(H.kneeOf(W, 'r'), H.kneeOf(W, 'l')) > knee) a = y; else b = y; }
  p.root.pos[1] = r1((a + b) / 2);
  return { pose: F3.plantLegs(p, st.contacts), contacts: st.contacts };
}
const d0 = (v) => `≈${Math.round(v)}°`;

module.exports = { COLOR, bandProps, bandTwoHand, strands, scanBands, gateBands, rackBehindBench, swapDumbbells, staggered, d0, mz };
