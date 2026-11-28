// Barbell Decline Pullover (GymVisual #005287; page not readable here, movement from the name and standard coaching):
// lying on a 25-degree decline bench (gear pack decline_bench), feet hooked under the roller, a light barbell held with
// straight arms over the chest (overhand, grip points 42 cm apart). The bar travels in an arc over and past the head,
// arms nearly straight (small fixed elbow bend), until the arms are about level with the floor, then back over the chest.
// Built by g3-benches.declineArms (both hands on the bar at a constant width, grip 'bar'). Bilateral.
const L = require('./lib');
const { V, R } = L;
const G = require('./families/g3-benches');
const meta = require('./meta/barbell-decline-pullover.json');
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1], TH = ['TH'].map(() => 88)[0], GW = 42, names = FS.map((f, i) => `k${i}`);
const keys = (c) => {
  const out = {}, feetH = [1, 0, 0], headH = [-1, 0, 0];
  FS.forEach((f, i) => {
    const th = (6 + (TH - 6) * f) * R.DEG, dir = V.add(V.scale(c.up, Math.cos(th)), V.scale(headH, Math.sin(th)));
    const S0 = [c.S[0], c.S[1], GW / 2], flex = 16 + 6 * f, d = c.gripReach(flex);
    const g = V.add(S0, V.scale(dir, Math.sqrt(Math.max(1, d * d - (GW / 2 - c.S[2]) ** 2))));
    const palm = V.add(V.scale(feetH, Math.cos(th)), V.scale(c.up, Math.sin(th)));
    out[names[i]] = { g, palm, thumb: [0, 0, -1] };
  });
  return out;
};
const rows = (set, c, poses, W) => {
  const fl = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), [0, 1, 0]);
  set('Shoulder flexion', 'setup', `Arms ${G.dg(fl(W('k0')))} from vertical over the chest`); set('Shoulder flexion', 'peak', `${G.dg(fl(W(names[names.length - 1])))} from vertical, past the head (about level with the floor)`);
  set('Elbow', 'setup', G.dg(poses.k0.ch.elbow_r.flex)); set('Elbow', 'peak', G.dg(poses[names[names.length - 1]].ch.elbow_r.flex));
  set('Muscles', 'setup', 'Lats and chest lengthen as the bar goes overhead'); set('Muscles', 'peak', 'Both pull the bar back over the chest');
};
module.exports = { ex: G.declineArms(meta, { item: 'barbell', grip: 'bar', keys, kf: G.kfDownUp(meta, names, FS), rows }) };
