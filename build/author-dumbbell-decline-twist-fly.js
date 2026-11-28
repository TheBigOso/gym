// Dumbbell Decline Twist Fly (GymVisual #011191; page not readable here, movement from the name and standard coaching):
// decline fly (gear pack decline_bench, 25 degrees, feet hooked) in which the hands turn through the arc: palms toward
// the feet with the handles in line at the top, palms facing each other on the way out, palms up in the stretch; the
// reverse on the way back. Built by g3-benches.declineArms (grip targets on the fly arc, palm and thumb wishes). Bilateral.
const L = require('./lib');
const { V, R } = L;
const G = require('./families/g3-benches');
const meta = require('./meta/dumbbell-decline-twist-fly.json');
const FS = [0, 0.25, 0.5, 0.75, 1], TH = 76, names = FS.map((f, i) => `k${i}`);
const keys = (c) => {
  const out = {}, feet = V.scale(c.head, -1);
  FS.forEach((f, i) => {
    const th = TH * f * R.DEG, dir = V.add(V.scale(c.up, Math.cos(th)), V.scale(c.Z, Math.sin(th)));
    const g = G.aim(c, dir, 14 + 16 * f, V.add(V.scale(c.Z, -7 * (1 - f)), V.scale(feet, 4)));
    const fly = V.norm(V.add(V.scale(c.Z, -Math.cos(th)), V.scale(c.up, Math.sin(th)))); // palm in the plain fly
    const tw = Math.max(0, 1 - f * 2), palm = V.norm(V.add(V.scale(fly, 1 - tw), V.scale(G.perpTo(feet, V.norm(V.sub(g, c.S))), tw)));
    out[names[i]] = { g, palm, thumb: G.perpTo(V.add(V.scale(c.head, 1 - tw), V.scale(c.Z, -tw)), palm) };
  });
  return out;
};
const rows = (set, c, poses, W) => {
  const ha = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), [0, 1, 0]);
  set('Shoulder horizontal abduction', 'setup', `Arms ${G.dg(ha(W('k0')))} from vertical over the chest`); set('Shoulder horizontal abduction', 'peak', `${G.dg(ha(W('k4')))} from vertical at the bottom of the arc`);
  set('Forearm rotation', 'setup', `Palms toward the feet (pron ${poses.k0.ch.wrist_r.pron})`); set('Forearm rotation', 'peak', `Palms up in the stretch (pron ${poses.k4.ch.wrist_r.pron})`);
  set('Decline', 'setup', '25° decline, head low, feet hooked'); set('Decline', 'peak', 'Body still on the board');
};
module.exports = { ex: G.declineArms(meta, { item: 'dumbbells', keys, kf: G.kfDownUp(meta, names, FS), rows }) };
