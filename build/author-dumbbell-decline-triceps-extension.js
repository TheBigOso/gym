// Dumbbell Decline Triceps Extension (GymVisual #000962; page not readable here, movement from the name and standard
// coaching): lying on a 25-degree decline bench (gear pack decline_bench), feet hooked under the roller, a dumbbell in each
// hand straight up over the shoulders, palms facing. Only the elbows bend: the upper arms stay vertical (elbows pinned),
// the dumbbells swing down beside the head to about 110 degrees of elbow flexion and back up. Built by
// g3-benches.declineArms (grip on the forearm arc about the pinned elbow, neutral palms). Bilateral.
const L = require('./lib');
const { V, R } = L;
const G = require('./families/g3-benches');
const meta = require('./meta/dumbbell-decline-triceps-extension.json');
const FS = [0, 0.25, 0.5, 0.75, 1], FLEX0 = 8, FLEX1 = 108, TILT = 8, names = FS.map((f, i) => `k${i}`);
const keys = (c) => {
  const out = {}, t = TILT * R.DEG, u = V.norm(V.add(V.scale(c.up, Math.cos(t)), V.scale(G.perpTo(c.head, c.up), Math.sin(t)))), h = G.perpTo(c.head, u);
  const E = V.add(V.add(c.S, V.scale(u, L.UA)), [0, 0, 0]), rf = c.gripReach(0) - L.UA;
  FS.forEach((f, i) => {
    const ph = (FLEX0 + (FLEX1 - FLEX0) * f) * R.DEG, dir = V.add(V.scale(u, Math.cos(ph)), V.scale(h, Math.sin(ph)));
    const g = V.add(E, V.scale(dir, rf)), palm = [0, 0, -1], thumb = V.add(V.scale(u, -Math.sin(ph)), V.scale(h, Math.cos(ph)));
    out[names[i]] = { g, palm, thumb, elbow: E, wElbow: 2 };
  });
  return out;
};
const rows = (set, c, poses, W) => {
  const el = (Wx) => 180 - V.angle(V.sub(Wx.shoulder_r.p, Wx.elbow_r.p), V.sub(Wx.wrist_r.p, Wx.elbow_r.p)), ua = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), [0, 1, 0]);
  set('Elbow flexion', 'setup', `${G.dg(el(W('k0')))} (arms straight up)`); set('Elbow flexion', 'peak', `${G.dg(el(W('k4')))} with the dumbbells beside the head`);
  set('Upper arm', 'setup', `${G.dg(ua(W('k0')))} from vertical`); set('Upper arm', 'peak', `${G.dg(ua(W('k4')))} from vertical (elbows pinned)`);
  set('Triceps heads', 'setup', 'All three heads lengthen as the elbows bend'); set('Triceps heads', 'peak', 'Shortening to straight arms');
};
module.exports = { ex: G.declineArms(meta, { item: 'dumbbells', keys, kf: G.kfDownUp(meta, names, FS), rows }) };
