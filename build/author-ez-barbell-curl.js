// EZ Barbell Curl (GymVisual #1948 / #908, "EZ Barbell Curl"; page not readable here, movement from the name and the
// library's barbell curls): standing tall, feet about hip width (planted), underhand grip on the outer cambers of an EZ curl
// bar (44 cm between the grip points), so the hands sit semi-supinated: the camber turns each hand's thumb-side axis 22
// degrees from the bar axis toward the palm. The bar starts just off the front of the thighs; both arms curl it up about
// pinned elbows (a small forward drift at the top), short squeeze, slow lower. The bar turns about its own axis with the
// hands (src/gear/bars.js ez_bar orient). Arm solve: barbell.js armsOnBar with the camber axis (gear-bars.js ezHandAxes),
// mirrored to the left so the grip width stays constant. Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const BB = require('./families/barbell');
const C = require('./families/b3-curls');
const K = require('./families/b4-curls2');
const H = require('./families/hips');
const G = require('./families/gear-bars');
const meta = require('./meta/ez-barbell-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const UARM = ENV('U', 6), EZE = ENV('EZ', 21), A1 = ENV('A1', 132); // upper arm forward of vertical (deg), elbow z, top grip angle
const GW = G.EZ.width, CAMBER = G.EZ.camber, CLEAR = 0.8;
const bar = G.ezProp({ width: GW, grip: 'outer', camber: CAMBER });
const { contacts, base } = C.standing({}, { sc: { protract: -2, elevate: 0 } });
const S = L.fk(base, contacts).shoulder_r.p, UA = V.len(L.rig.byId.elbow_r.offset);
const E = [S[0] + UA * Math.sin(UARM * R.DEG), 0, EZE]; E[1] = S[1] - Math.sqrt(UA * UA - (E[0] - S[0]) ** 2 - (E[2] - S[2]) ** 2);
const DRIFT = [3, 1, 0];

// grip-point distance from the elbow (arm straight, semi-supinated)
const q0 = clone(base); C.setArm(q0, 'r', { plane: 0, elev: 0.01, axial: 0, flex: 0, pron: 25 });
const W0 = L.fk(q0); const FR = V.len(V.sub(G.handFrame(W0, 'r', 'bar').p, W0.elbow_r.p));
const dz = GW / 2 - E[2], rr = Math.sqrt(FR * FR - dz * dz);
let guesses = [[0, 10, 0, 20, 25], [-58, 14, 113, 4, 137], [-20, 10, -10, 20, 40], [10, 20, 20, 60, 30], [0, 5, 0, 5, 60]], gErr = 0, kink = 0;
const solve = (a, f) => {
  const Ef = V.add(E, V.scale(DRIFT, f)), g = [Ef[0] + rr * Math.sin(a * R.DEG), Ef[1] - rr * Math.cos(a * R.DEG), GW / 2];
  const ax = G.ezHandAxes([Math.cos(a * R.DEG), Math.sin(a * R.DEG), 0], CAMBER);
  const q = BB.armsOnBar(base, g, { palm: ax.palm, thumb: ax.thumb, ax: ax.thumb, elbow: Ef, elbowW: 2, guesses });
  delete q.__cost;
  const W = L.fk(q, contacts), ez = G.ezAt(W);
  gErr = Math.max(gErr, V.len(V.sub(G.handFrame(W, 'r', 'bar').p, g)));
  kink = Math.max(kink, Math.abs(ez.camber - CAMBER));
  return q;
};
// start angle: the smallest that keeps the EZ bar (zigzag, sleeves, plates) clear of the thighs
let lo = 0, hi = 60;
for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (G.ezClear(L.fk(solve(m, 0), contacts), bar.params).d >= CLEAR) hi = m; else lo = m; }
const a0 = r1(hi + 0.05);
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], poses = {}, names = [];
let prev = null;
FS.forEach((f, i) => {
  const q = solve(a0 + (A1 - a0) * f, f);
  guesses = [G.guessOf(q)];
  if (prev) K.unwrapTo(q, prev);
  poses[`c${i}`] = q; names.push(`c${i}`); prev = q;
});
guesses = [G.guessOf(poses.c1)]; poses.c0 = K.unwrapTo(solve(a0, 0), poses.c1);
const top = names[names.length - 1];
poses.squeeze = clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`wrist_${s}`].flex = r1(poses.squeeze.ch[`wrist_${s}`].flex + 3);
const ph = (id) => meta.timeline.phases.find((p) => p.id === id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [bar];

// loop sweep: grip width, bar vs body / floor, planted feet, camber match
const tl = R.buildTimeline(ex), D = ex.timeline.duration, sw = { width: [1e9, -1e9], clear: { d: 1e9 }, floor: 1e9, slide: 0 };
for (let i = 0; i <= 300; i++) {
  const t = (i / 300) * D, pz = tl.pose(t), W = R.evalPose(L.rig, pz, contacts), ez = G.ezAt(W);
  sw.width = [Math.min(sw.width[0], ez.width), Math.max(sw.width[1], ez.width)];
  const c = G.ezClear(W, bar.params); if (c.d < sw.clear.d) sw.clear = { ...c, t: +t.toFixed(2) };
  sw.floor = Math.min(sw.floor, L.shapeMinY(W).y);
  for (const id of ['leg_r', 'leg_l']) { const k = pz.ik[id]; const cc = contacts.find((x) => x.id === id); sw.slide = Math.max(sw.slide, V.len(V.sub(W[cc.chain[2]].p, k.target))); }
}
const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Bar on the thighs 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom']);
const set = H.setKin(ex);
set('Bar clearance', 'setup', `EZ bar ${r1(sw.clear.d)} cm or more off the body; outer cambers, ${GW} cm between the grip points, hands turned ${CAMBER}° toward neutral`);
set('Bar clearance', 'peak', `Grip width steady within ${r1(sw.width[1] - sw.width[0])} cm; nearest the bar comes: ${sw.clear.id}`);
const info = { a0, gripErr: +gErr.toFixed(2), camberErr: +kink.toFixed(1), elbow: [r1(C.elbowFlex(Wb, 'r')), r1(C.elbowFlex(Wt, 'r'))], pron: [poses.c0.ch.wrist_r.pron, poses.squeeze.ch.wrist_r.pron], bar0: G.ezAt(Wb).c.map(r1), barTop: G.ezAt(Wt).c.map(r1) };
console.log(`EZ Barbell Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(info)}\n  sweep ${JSON.stringify({ ...sw, width: sw.width.map(r1), clear: { ...sw.clear, d: r1(sw.clear.d) } })}`);
const fails = [];
if (sw.width[1] - sw.width[0] > 1.0) fails.push('grip width varies');
if (gErr > 0.6) fails.push(`hands off the bar (${gErr.toFixed(2)} cm)`);
if (kink > 4) fails.push(`hands off the cambers (${kink.toFixed(1)} deg)`);
if (sw.clear.d < 0) fails.push(`EZ bar into the body (${sw.clear.id} at ${sw.clear.t}s)`);
if (sw.floor < -0.5) fails.push('body through the floor');
if (sw.slide > 0.05) fails.push('planted feet slide');
if (fails.length) { console.error(`FAIL ez-barbell-curl: ${fails.join('; ')}`); process.exitCode = 1; }
