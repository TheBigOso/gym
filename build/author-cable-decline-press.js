// Cable Decline Press (GymVisual #016298; page not readable here, movement from the name and standard coaching): lying on
// a 25-degree decline bench (gear pack decline_bench) between two cable towers, feet hooked under the roller, a D-handle in
// each hand beside the lower chest. Press up and in until the hands nearly meet over the lower chest, lower back with the
// elbows about 45 degrees from the trunk. The pulleys sit at bench height beside the head end, where the cables stay clear
// of the arms through the press (searched in this script). Built by g3-benches.declineArms. Bilateral.
const L = require('./lib');
const { V, R, r1 } = L;
const G = require('./families/g3-benches');
const meta = require('./meta/cable-decline-press.json');
const FS = [0, 0.25, 0.5, 0.75, 1], names = FS.map((f, i) => `k${i}`);
const keys = (c) => {
  const out = {}, bot = c.T6([c.chestTop + 12, -10, 0]); bot[2] = 26;
  const dTop = c.gripReach(8), dx = bot[0] - c.S[0], zt = 8, top = [bot[0], c.S[1] + Math.sqrt(dTop * dTop - dx * dx - (zt - c.S[2]) ** 2), zt];
  FS.forEach((f, i) => {
    const g = V.lerp(top, bot, f), E = V.add(g, [0, -L.FA * 0.8, 12]);
    out[names[i]] = { g, palm: [0, 1, 0], thumb: [0, 0, -1], elbow: f > 0.3 ? E : undefined, wElbow: 0.4 };
  });
  return out;
};
const anchors = (c) => { const x = r1(c.S[0] - 30); return { r: [x, 40, 62], l: [x, 40, -62] }; };
const rows = (set, c, poses, W) => {
  const el = (Wx) => 180 - V.angle(V.sub(Wx.shoulder_r.p, Wx.elbow_r.p), V.sub(Wx.wrist_r.p, Wx.elbow_r.p));
  set('Elbow flexion', 'setup', `${G.dg(el(W('k0')))} at the top`); set('Elbow flexion', 'peak', `${G.dg(el(W('k4')))} at the bottom`);
  set('Hand path', 'setup', 'Hands nearly meet over the lower chest'); set('Hand path', 'peak', 'Hands beside the lower chest, about 48 cm apart');
  set('Decline', 'setup', '25° decline, head low, feet hooked'); set('Decline', 'peak', 'Body still on the board');
};
module.exports = { ex: G.declineArms(meta, { item: 'cable', keys, anchors, kf: G.kfDownUp(meta, names, FS), rows }) };
