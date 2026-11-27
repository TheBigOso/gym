// Batch 5 miscellaneous family (b5-misc): helpers shared by the b5-misc authors.
//  - tallKneel: both knees on the floor under the hips (thighs about vertical), toes tucked, trunk tall. Built from the
//    batch 4 half-kneeling solve (b4-shoulders3.js halfKneel) run once per side.
//  - twoHandDb / twoHandDbClear: a dumbbell held between both hands (attach.with): centre midway between the two grip
//    points, axis from the left grip to the right (as the player places two-hand items), and its clearance to the body.
const L = require('../lib');
const { R, V, rig, r1, clone } = L;
const DB = require('./dumbbell');
const S3 = require('./b3-shoulders');
const H = require('./hips');
const K = require('./b4-shoulders3');

function tallKneel({ kneeY = 5.0, toePitch = 88, width = 10, thigh = 4, toe = 6 } = {}) {
  const a = K.halfKneel({ down: 'r', kneeY, toePitch, frontKnee: 90, width, thigh, toe });
  const b = K.halfKneel({ down: 'l', kneeY, toePitch, frontKnee: 90, width, thigh, toe });
  const cR = a.contacts.find((c) => c.id === 'leg_r'), cL = b.contacts.find((c) => c.id === 'leg_l');
  const contacts = [cR, cL];
  let q = clone(a.pose);
  q.ik = { leg_r: { target: a.info.tD, weight: 1 }, leg_l: { target: b.info.tD, weight: 1 } };
  q = H.fitLeg(q, 'l', cL, b.info.tD);
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in q.ch[j]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  delete q.__cost;
  const W = L.fk(q, contacts);
  return { pose: q, contacts, info: { kneeLowR: +K.kneeLow(W, 'r').toFixed(2), kneeLowL: +K.kneeLow(W, 'l').toFixed(2), kneeR: +H.kneeOf(W, 'r').toFixed(1), kneeL: +H.kneeOf(W, 'l').toFixed(1), tR: a.info.tD, tL: b.info.tD } };
}


function twoHandDb(W, grip = 'handle') {
  const a = DB.dumbbellAt(W, 'r', grip).c, b = DB.dumbbellAt(W, 'l', grip).c;
  const c = V.scale(V.add(a, b), 0.5), ax = V.norm(V.sub(a, b));
  return { c, ax, gripGap: V.len(V.sub(a, b)) };
}
// Clearance (cm, rig shapes) from the plates (radius 6, 7..16 cm from the centre) and handle of a two-hand dumbbell to the
// body, skipping the hands / forearms that hold it (and any extra shape ids matching `skip`)
function twoHandDbClear(W, { grip = 'handle', skip = /^(hand|thumb|forearm)_[rl]$/, len = 32 } = {}) {
  const d = twoHandDb(W, grip), pts = [], h = len / 2;
  for (const sg of [-1, 1]) for (const s of [h - 9, h - 4.5, h]) for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI, u = V.norm(V.cross(d.ax, [0, 1, 0.01])), w = V.cross(d.ax, u);
    pts.push(V.add(V.add(d.c, V.scale(d.ax, sg * s)), V.add(V.scale(u, 6 * Math.cos(a)), V.scale(w, 6 * Math.sin(a)))));
  }
  let best = { d: 1e9 };
  for (const s of rig.shapes) { if (skip.test(s.id) || /^(eye|brow)/.test(s.id)) continue; for (const p of pts) { const dd = S3.shapeDist(W, s, p); if (dd < best.d) best = { d: dd, what: s.id }; } }
  best.minY = Math.min(...pts.map((p) => p[1]));
  return best;
}

module.exports = { tallKneel, twoHandDb, twoHandDbClear };
