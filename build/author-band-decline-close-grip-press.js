// Band Decline Close Grip Press (GymVisual #025241; page not readable here, movement from the name and standard
// coaching): lying on a 25-degree decline bench (gear pack decline_bench), feet hooked under the roller, a band handle in
// each hand (one band per hand, tied at shoulder height to the uprights of a rack beyond the head end). Hands about 22 cm apart over the
// lower chest, elbows tucked; press straight up to straight arms, lower back. Built by g3-benches.declineArms. Bilateral.
const L = require('./lib');
const { V, R, r1 } = L;
const G = require('./families/g3-benches');
const EQ = require('./families/equip');
const meta = require('./meta/band-decline-close-grip-press.json');
const FS = [0, 0.25, 0.5, 0.75, 1], GZ = 11, names = FS.map((f, i) => `k${i}`);
const keys = (c) => {
  const out = {}, bot = c.T6([c.chestTop + 12, -9, 0]); bot[2] = GZ;
  const dTop = c.gripReach(6), dx = bot[0] - c.S[0], dz = GZ - c.S[2], top = [bot[0], c.S[1] + Math.sqrt(dTop * dTop - dx * dx - dz * dz), GZ];
  FS.forEach((f, i) => { // f = 0 at the top (arms straight), 1 at the bottom
    const g = V.lerp(top, bot, f), E = V.add(V.lerp(top, bot, f), [0, -L.FA * 0.85, 13]);
    out[names[i]] = { g, palm: [0, 1, 0], thumb: [0, 0, -1], elbow: f > 0.3 ? E : undefined, wElbow: 0.4 };
  });
  return out;
};
// bands tied to the uprights of a rack standing beyond the head end, at about shoulder height (the strands then run clear
// of the arms through the whole press)
const RX = (c) => r1(c.S[0] - 40);
const anchors = (c) => ({ r: [RX(c), 45, 60], l: [RX(c), 45, -60] });
const extraProps = (c) => [EQ.rack({ x: RX(c), width: 120, hookY: 140 }).prop];
const rows = (set, c, poses, W) => {
  const el = (Wx) => 180 - V.angle(V.sub(Wx.shoulder_r.p, Wx.elbow_r.p), V.sub(Wx.wrist_r.p, Wx.elbow_r.p));
  set('Elbow flexion', 'setup', `${G.dg(el(W('k0')))} (arms straight)`); set('Elbow flexion', 'peak', `${G.dg(el(W('k4')))} at the chest`);
  set('Grip width', 'setup', `Hands ${2 * GZ} cm apart (close grip)`); set('Grip width', 'peak', 'Unchanged');
  set('Decline', 'setup', '25° decline, head low, feet hooked'); set('Decline', 'peak', 'Body still on the board');
};
const kf = G.kfDownUp(meta, names, FS);
module.exports = { ex: G.declineArms(meta, { item: 'band', keys, anchors, extraProps, kf, rows }) };
