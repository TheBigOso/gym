// Dumbbell Decline Fly (GymVisual #001359; page not readable here, movement from the name and standard coaching): lying on
// a 25-degree decline bench (gear pack decline_bench), head low, feet hooked under the roller. Dumbbells over the lower
// chest, palms facing, elbows slightly bent; the arms open in a wide arc in the plane of world vertical and the shoulder
// line until the upper arms are about level with the body, palms turning up, then close. The hands follow the arc
// (g3-benches.declineArms: both arms solved onto grip targets, the left mirrored). Bilateral.
const L = require('./lib');
const { V, R } = L;
const G = require('./families/g3-benches');
const meta = require('./meta/dumbbell-decline-fly.json');
const FS = [0, 0.25, 0.5, 0.75, 1], TH = 78, names = FS.map((f, i) => `k${i}`);
const keys = (c) => {
  const out = {}, feet = V.scale(c.head, -1);
  FS.forEach((f, i) => {
    const th = TH * f * R.DEG, flex = 14 + 16 * f, d = c.gripReach(flex);
    const dir = V.add(V.scale(c.up, Math.cos(th)), V.scale(c.Z, Math.sin(th)));
    const g0 = V.add(V.add(V.add(c.S, V.scale(dir, d)), V.scale(c.Z, -8 * (1 - f))), V.scale(feet, 4)), g = V.add(c.S, V.scale(V.norm(V.sub(g0, c.S)), d));
    const palm = V.norm(V.add(V.scale(c.Z, -Math.cos(th)), V.scale(c.up, Math.sin(th))));
    out[names[i]] = { g, palm, thumb: G.perpTo(c.head, palm) };
  });
  return out;
};
const rows = (set, c, poses, W) => {
  const ha = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), [0, 1, 0]);
  set('Shoulder horizontal abduction', 'setup', `Arms ${G.dg(ha(W('k0')))} from vertical over the chest`); set('Shoulder horizontal abduction', 'peak', `${G.dg(ha(W('k4')))} from vertical at the bottom of the arc`);
  set('Elbow', 'setup', G.dg(poses.k0.ch.elbow_r.flex)); set('Elbow', 'peak', G.dg(poses.k4.ch.elbow_r.flex));
  set('Decline', 'setup', '25° decline, head low, feet hooked'); set('Decline', 'peak', 'Body still on the board');
};
module.exports = { ex: G.declineArms(meta, { item: 'dumbbells', keys, kf: G.kfDownUp(meta, names, FS), rows }) };
