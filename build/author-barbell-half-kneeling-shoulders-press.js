// Barbell Half Kneeling Shoulders Press (GymVisual #21313 "Barbell Half Kneeling Shoulders Press"; page not readable here,
// movement from the name and standard coaching): half-kneeling (right knee down on a pad under the hip with the toes tucked,
// left foot flat in front, both knees about 90 degrees; the b4-shoulders3 halfKneel base), trunk tall, glutes squeezed.
// Overhand grip just outside the shoulders (58 cm between the handle centres). The bar starts at the front of the shoulders
// (forearms about vertical under it, elbows a little forward and out), is pressed past the face (head back a little, bar
// path pushed forward just enough to clear the chin and nose) to straight arms overhead with the bar over the shoulders and
// the head coming back through; 0.4 s at the top, 2 s down. Shoulder blades rise and rotate up as the arms go overhead.
// Both arms solved onto the bar at every key on one continuous branch (b6-01 segment: barbell.js armsOnBar, mirrored, keys
// refined where the grip width could drift). Authored right knee down (the player mirrors).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const BB = require('./families/barbell');
const P5 = require('./families/b5-bbpress');
const F = require('./families/b6-01');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-half-kneeling-shoulders-press.json');

const GW = 58, PAD = 3.5;
const base = K.halfKneel({ down: 'r', kneeY: 5.0, toePitch: 88, frontKnee: 90, width: 10, thigh: 4 });
const contacts = base.contacts, P0 = base.pose;
const lerp = (a, b, f) => a + (b - a) * f;
const headBack = (f) => Math.sin(Math.PI * Math.min(1, f / 0.8)); // head back while the bar passes the face, through at the top
const body = (f) => {
  const p = clone(P0), g = F.smooth(f), h = headBack(f);
  p.ch.sc_r = { protract: r1(lerp(6, 2, g)), elevate: r1(lerp(4, 22, g)) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: r1(-7 * h) }; p.ch.head_c1 = { rot: 0, flex: r1(-9 * h) };
  return p;
};
const PRON = +(process.env.PRON ?? 150), EW = +(process.env.EW ?? 0.1), TOPD = +(process.env.TOPD ?? -0.4);
const SEEDS = [[30, 30, -80, 125, 135], [20, 40, -60, 120, 135], [40, 20, -100, 130, 135], [0, 15, -50, 130, 120], [50, 45, -90, 115, 150]];
function bar(W, p, f) {
  const S = W.shoulder_r.p, zm = W.neck_c7.p[2];
  const Rg = BB.reachG(p, 5) - TOPD, dz = GW / 2 - (S[2] - zm), dx = 1.5;
  const top = [S[0] + dx, S[1] + Math.sqrt(Rg * Rg - dz * dz - dx * dx), zm];
  const bot = [S[0] + +(process.env.BX ?? 13), S[1] + +(process.env.BY ?? 7), zm];
  const c = [lerp(bot[0], top[0], F.smooth(f)), lerp(bot[1], top[1], f), zm];
  return F.clearFront(W, c, GW / 2 - 8, f < 0.85 ? 1.5 : 0.5);
}
const spec = {
  body, bar,
  // elbow hint: forward, down and out at the bottom, turning smoothly onto the shoulder-to-bar line (straight arm) at the top
  elbow: (W, f, c) => { const S = W.shoulder_r.p, g = [c[0], c[1], c[2] + GW / 2], dir = V.norm(V.add(V.scale(V.norm([0.35, -0.75, 0.55]), 1 - F.smooth(f)), V.scale(V.norm(V.sub(g, S)), F.smooth(f)))); return V.add(S, V.scale(dir, L.UA)); },
  elbowW: () => 0.5,
  palm: () => V.norm([1, +(process.env.PY ?? 0.35), 0]), thumb: [0, 0, -1], dirW: 0.5,
  wrist: (f) => lerp(-25, -10, f),
  // forearm rotation held near one value so the straight-arm top (where humeral rotation and pronation trade freely) stays
  // on the same branch as the bent-arm keys
  extra: (f) => { const r = F.smooth(Math.max(0, (f - 0.7) / 0.3)); return [(W, q) => [(q.ch.wrist_r.pron - PRON) * 0.06, (q.ch.elbow_r.flex - 5) * EW * r]]; },
};
const path = F.segment(spec, contacts, GW, { n: 12, seeds: SEEDS });
const n = path.length - 1, poses = { bottom: path[0].pose, top: path[n].pose };
const kf = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }];
for (let i = 1; i < n; i++) { poses[`k${i}`] = path[i].pose; kf.push({ t: +(0.8 + 1.4 * path[i].f).toFixed(3), pose: `k${i}` }); }
kf.push({ t: 2.2, pose: 'top' }, { t: 2.6, pose: 'top' });
for (let i = n - 1; i >= 1; i--) kf.push({ t: +(2.6 + 2.0 * (1 - path[i].f)).toFixed(3), pose: `k${i}` });
kf.push({ t: 4.6, pose: 'bottom' }, { t: 5.2, pose: 'bottom' });
const ex = H.module_(meta, contacts, poses, kf);
const Wk = L.fk(P0, contacts);
ex.props = [{ id: 'mat', kind: 'mat', center: [r1(Wk.knee_r.p[0] - 4), 0, r1(Wk.knee_r.p[2])], size: [34, PAD, 26] }, BB.barbellProp()];
let head = { d: 1e9 };
const sw = BB.sweep(ex, { skip: /^(hand|thumb|forearm)_|^deltoid_/, probe: (W) => { const c = P5.clearHead(W); if (c.d < head.d) head = c; } });
const rest = BB.sweep(ex, {}, 150);
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Stance', 'setup', `Right knee down (knee ${d(H.kneeOf(Wb, 'r'))}), left foot in front (knee ${d(H.kneeOf(Wb, 'l'))}), down thigh about vertical`); set('Stance', 'peak', 'Unchanged (both contacts planted)');
set('Shoulder elevation', 'setup', `${d(K.humElev(Wb))} with the bar at the front of the shoulders`); set('Shoulder elevation', 'peak', `${d(K.humElev(Wt))} overhead`);
set('Elbow flexion', 'setup', d(BB.elbowOf(Wb, 'r'))); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wt, 'r'))} (arms straight)`);
set('Bar path', 'setup', `Front of the shoulders, ${GW} cm overhand grip`); set('Bar path', 'peak', `Over the shoulder joints at the top (${r1(EQ_c(Wt)[0] - Wt.shoulder_r.p[0])} cm in front of them); ${r1(head.d)} cm or more from the face on the way up`);
set('Tempo', 'setup', 'Brace 0.8 s at the shoulders'); set('Tempo', 'peak', '1.4 s up, 0.4 s at the top, 2.0 s down, 0.6 s reset');
function EQ_c(W) { return require('./families/equip').barAt(W, BB.GRIP).c; }
ex.checks.measure = { name: 'rootTravel', min: 0, max: 2 }; // the kneeling base stays put
const lim = S5.limits(ex), rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'] });
console.log(`Barbell Half Kneeling Shoulders Press: wrote ${L.write(ex)}\n  kneel ${JSON.stringify(base.info)}\n  ${JSON.stringify(rep)}\n  sweep ${JSON.stringify(sw)} restOnDelts ${rest.barBody} head ${JSON.stringify(head)} gripErr ${path.worst.toFixed(2)} keys ${n + 1} limits ${JSON.stringify(lim)}\n  bottom elbow ${BB.elbowOf(Wb, 'r').toFixed(0)} top elbow ${BB.elbowOf(Wt, 'r').toFixed(0)}`);
const bad = [];
if (sw.widthRange > 1.0 || path.worst > 0.5) bad.push('grip width');
if (sw.barFloor < 0 || sw.barBody < 0 || head.d < 0 || rest.barBody < -1.5) bad.push('bar collision');
if (rep.slide > 0.05) bad.push('planted contacts slide');
if (Object.keys(lim).length) bad.push('joint limits');
if (bad.length) { console.error(`FAIL barbell-half-kneeling-shoulders-press: ${bad.join('; ')}`); process.exitCode = 1; }
