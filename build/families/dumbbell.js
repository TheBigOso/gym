// Dumbbell and bench helpers for authoring (batch 3). The player draws held dumbbells in the athlete's hand (see
// gripFrame in src/athlete.js); these helpers estimate the same dumbbell on the RepRig skeleton so author scripts can
// keep it clear of the floor, the bench and the body.
// RepRig rest hand: fingers -Y, palm +X (anatomical position), so grip offsets are [palm, -fingers, thumb axis].
// Note: the player's attach.offset third axis is the little-finger side of each hand (mirrored between hands).
const L = require('../lib');
const { R, V, Q, rig } = L;

const GRIP = { handle: { off: [2.2, -7.2, 0], axis: [0, 0, 1] }, bar: { off: [2.6, -4.2, 0], axis: [0, 0, 1] }, goblet: { off: [7.5, -6.5, 0], axis: [0, -1, 0] }, end: { off: [4, -8, 0], axis: [0, -1, 0] } };
const DB = { length: 32, diameter: 12 }; // cm, a medium hex dumbbell

// Dumbbell centre, axis and end-plate centres in world cm for the hand on `side` ('r' | 'l')
function dumbbellAt(W, side, grip = 'handle', size = DB) {
  const w = W[`wrist_${side}`], g = GRIP[grip] || GRIP.handle;
  const off = side === 'l' ? [g.off[0], g.off[1], -g.off[2]] : g.off;
  const c = V.add(w.p, Q.rot(w.q, off)), ax = V.norm(Q.rot(w.q, g.axis)), half = (size.length || DB.length) / 2 - 4;
  return { c, ax, ends: [V.add(c, V.scale(ax, half)), V.sub(c, V.scale(ax, half))], r: (size.diameter || DB.diameter) / 2 };
}
// Lowest point of the dumbbell (cm above the floor); keep it >= 0
function dumbbellMinY(W, side, grip, size) {
  const d = dumbbellAt(W, side, grip, size);
  return Math.min(...d.ends.map((e) => e[1])) - d.r;
}
// Signed clearance from a dumbbell to an axis-aligned box prop (cm; < 0 means it passes into the box)
function dumbbellBoxClearance(W, side, box, grip, size) {
  const d = dumbbellAt(W, side, grip, size), [cx, cy, cz] = box.center, [sx, sy, sz] = box.size;
  const lo = [cx - sx / 2, cy, cz - sz / 2], hi = [cx + sx / 2, cy + sy, cz + sz / 2];
  let best = 1e9;
  for (let k = 0; k <= 8; k++) {
    const p = V.add(d.ends[1], V.scale(V.sub(d.ends[0], d.ends[1]), k / 8));
    const q = p.map((v, i) => Math.max(lo[i], Math.min(hi[i], v))), dist = V.len(V.sub(p, q));
    const inside = p.every((v, i) => v > lo[i] && v < hi[i]);
    best = Math.min(best, (inside ? -1 : 1) * dist - d.r);
  }
  return best;
}
// Adjustable bench prop: seat on [x0, x0 + seat] along X (centre z), back pad hinged at the -X end rising at `angle`.
// Returns the prop plus the pad surface as a line (for placing the back on it) in world cm.
function bench({ x = 0, z = 0, seat = 40, height = 45, width = 30, angle = 0, back = 80, id = 'bench', side = -1 } = {}) {
  const prop = { id, kind: 'bench', center: [x, 0, z], size: [seat, height, width], backAngle: angle, backLength: back, backSide: side };
  const a = angle * R.DEG, hinge = [x + side * seat / 2, height, z], tip = [hinge[0] + side * Math.cos(a) * back, height + Math.sin(a) * back, z];
  return { prop, top: height, hinge, tip, seatX: [x - seat / 2, x + seat / 2], padDir: V.norm(V.sub(tip, hinge)) };
}
module.exports = { GRIP, DB, dumbbellAt, dumbbellMinY, dumbbellBoxClearance, bench };
