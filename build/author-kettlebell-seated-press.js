// Kettlebell Seated Press (GymVisual 13776, movement reference only): sitting tall on the end of a flat bench, feet flat
// a little wider than the hips, left hand on the hip. One kettlebell in the right hand racked at the shoulder (forearm
// vertical, palm facing in and a little forward), pressed straight up over the shoulder to a nearly straight arm without
// leaning back: 1.4 s up, 0.4 s at the top, 2 s down. Sitting removes the leg drive. Base: b4-shoulders3 seatedFlat; the
// wrist path is the half-kneeling single-arm press's. Authored right (the player mirrors).
// Note: the player draws a one-hand kettlebell past the knuckles, so with a vertical forearm the bell shows above the fist
// (bottoms-up look) instead of resting on the back of the forearm; see the batch report (needs a 'rack' grip).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const X = require('./families/b6-12');
const EQ = require('./families/equip');
const meta = require('./meta/kettlebell-seated-press.json');

const base = K.seatedFlat({ seatH: 45, stance: 18, toe: 10, hipFlex: 86 });
let P0 = base.pose;
// left hand on the hip (only the left arm is taken from the hands-on-hips helper)
{ const hh = H.handsOnHips(P0); for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) P0.ch[`${j}_l`] = clone(hh.ch[`${j}_l`]); }
P0.ch.sc_r = { protract: 4, elevate: 0 };
const PALM = V.norm([+(process.env.PX ?? 0.5), 0, -1]);
// nominal right-arm channels along the press (bottom -> top), then solved for the palm direction
const keys = [
  { name: 'p0', f: 0 }, { name: 'p1', f: 0.25 }, { name: 'p2', f: 0.5 }, { name: 'p3', f: 0.75 }, { name: 'p4', f: 1 },
];
const lerp = (a, b, f) => a + (b - a) * f;
const poses = {}, err = {};
let g = null;
// Wrist path: from above the elbow (forearm vertical, upper arm just below level, 25 degrees in front of the frontal plane)
// up and slightly in to over the shoulder; the elbow is placed on its circle toward the side and a little forward/down.
const S0 = L.fk(P0, base.contacts).shoulder_r.p, D2R = Math.PI / 180;
const E0 = V.add(S0, V.scale([Math.sin(78 * D2R) * Math.sin(25 * D2R), -Math.cos(78 * D2R), Math.sin(78 * D2R) * Math.cos(25 * D2R)], L.UA));
const Wbot = V.add(E0, [1, L.FA - 0.5, -2]);
for (const k of keys) {
  const f = k.f, p = clone(P0);
  p.ch.sc_r = { protract: r1(lerp(4, 8, f)), elevate: r1(lerp(0, 12, f * f)) };
  const S = L.fk(p, base.contacts).shoulder_r.p;
  const top = V.add(S, [2, L.reach(8) * 0.999, 2]);
  const u = f * f * (3 - 2 * f) * 0.5 + f * 0.5;
  const Wt = [lerp(Wbot[0], top[0], u), lerp(Wbot[1], top[1], f), lerp(Wbot[2], top[2], u)];
  const E = F.elbowFor(S, Wt, [0.35, -0.5, 1]);
  const q = F.solveArm(p, { wrist: Wt, elbow: E, palm: PALM, wPalm: 4, guess: g || { plane: 30, elev: 80, axial: -70, flex: 100, pron: 90 } });
  err[k.name] = q.__err; delete q.__err;
  g = F.armGuess(q); poses[k.name] = q;
}
const down = K.easeTimes([0.25, 0.5, 0.75, 1], 2.6, 4.6).map((t, i) => ({ t, pose: `p${3 - i}` }));
const kf = [{ t: 0, pose: 'p0' }, { t: 0.8, pose: 'p0' }, ...K.easeTimes([0.25, 0.5, 0.75, 1], 0.8, 2.2).map((t, i) => ({ t, pose: `p${i + 1}` })), { t: 2.6, pose: 'p4' }, ...down, { t: 5.2, pose: 'p0' }];

const ex = H.module_(meta, base.contacts, poses, kf);
ex.props = [base.bench.prop, X.kbProp('r')];
let seat = 1e9;
const rep = X.scan(ex, { planted: ['leg_r', 'leg_l'], kb: ['r'], probe: (W) => { seat = Math.min(seat, H.bottomOf(W, 'buttock_r') - 45); } });
X.gate('kettlebell-seated-press', rep, poses);

const Wb = L.fk(poses.p0, base.contacts), Wt = L.fk(poses.p4, base.contacts);
const set = H.setKin(ex);
set('Seat', 'setup', `Sitting tall on a 45 cm flat bench, hips ${Math.round(poses.p0.ch.hip_r.flex)}°, knees ${Math.round(H.kneeOf(Wb, 'r'))}°, feet flat`); set('Seat', 'peak', 'Unchanged');
set('Shoulder elevation', 'setup', `≈${Math.round(K.humElev(Wb))}°`); set('Shoulder elevation', 'peak', `≈${Math.round(K.humElev(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(K.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(K.elbowAng(Wt))}°`);
set('Trunk lean', 'setup', 'vertical'); set('Trunk lean', 'peak', 'vertical (held)');
set('Tempo', 'setup', 'Brace 0.8 s at the shoulder'); set('Tempo', 'peak', '1.4 s up, 0.4 s at the top, 2.0 s down');
const fwdTilt = (W) => V.angle(V.sub(W.wrist_r.p, W.elbow_r.p), [0, 1, 0]);
set('Forearm', 'setup', `${Math.round(fwdTilt(Wb))}° off vertical at the shoulder`); set('Forearm', 'peak', `${Math.round(fwdTilt(Wt))}° off vertical at the top`);
console.log(`Kettlebell Seated Press: wrote ${L.write(ex)}\n  seat gap ${r1(seat)} ${JSON.stringify({ err, ...rep })}`);
