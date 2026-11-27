// Dumbbell Close Grip Curl (GymVisual #415212): standing, two dumbbells held in line in front of the thighs with the inner
// ends almost touching (handle centres about 17 cm either side of the midline), palms forward. Both arms curl together with
// the elbows close in front of the hips, the hands staying close; short squeeze, slow lower. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-curls');
const K = require('./families/b4-curls2');
const D = require('./families/dumbbell');
const meta = require('./meta/dumbbell-close-grip-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const HZ = ENV('HZ', 17.2);            // handle centre from the midline: the inner plate ends are ~2.4 cm apart
const Y0 = ENV('Y0', 80);
// rig clearance at the thighs: the skinned thighs sit inside the rig capsules (rig 1.2 cm measured as ~3.4 cm on the mesh)
const GAP = ENV('GAP', -0.8);
const { contacts, base } = C.standing({});
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const axis = [0, 0, 1];
const solve = (x) => K.arcCurl(base, { handle0: [x, Y0, HZ], axis, flex1: ENV('FLEX', 118), drift: [ENV('DX', 5), ENV('DY', 2.5), 0], FS, contacts, guess: [60, 10, -30, 8, 0] });
let lo = 5, hi = 30, best = null;
for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2, r = solve(m), c = C.bodyClearance(L.fk(r.poses[0], contacts), 'r'); if (c.d > GAP) { hi = m; best = r; } else lo = m; }
const A = best || solve(hi);
const poses = {}, names = [];
A.poses.forEach((p, i) => {
  if (process.env.DEBUG) { const W = L.fk(p, contacts); console.log(FS[i], (p.__cost || 0).toFixed(3), p.__H ? V.len(V.sub(D.dumbbellAt(W, 'r', 'handle').c, p.__H)).toFixed(2) : '-', V.len(V.sub(L.Q.rot(W.wrist_r.q, [0, 0, 1]), axis)).toFixed(2), W.elbow_r.p.map(r1)); }
  if (process.env.DEBUG) console.log( JSON.stringify([p.ch.shoulder_r, p.ch.elbow_r, p.ch.wrist_r]));
  delete p.__cost; delete p.__H; K.mirrorArmTo(p); if (i) K.unwrapTo(p, poses[names[i - 1]]);
  poses[`c${i}`] = p; names.push(`c${i}`);
});
const top = names[names.length - 1];
poses.squeeze = L.clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`elbow_${s}`].flex = r1(poses.squeeze.ch[`elbow_${s}`].flex + 2);
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
const ex = K.assemble(meta, { contacts, poses, keyframes });
const rep = K.report(ex);
const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arms straight 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom']);
const hr = D.dumbbellAt(Wb, 'r', 'handle').c, hl = D.dumbbellAt(Wb, 'l', 'handle').c, ht = D.dumbbellAt(Wt, 'r', 'handle').c, htl = D.dumbbellAt(Wt, 'l', 'handle').c;
C.setKin(ex, 'Hand spacing', 'setup', `Handle centres ${r1(hr[2] - hl[2])} cm apart (inner plate ends ≈${r1(hr[2] - hl[2] - 32)} cm apart)`);
C.setKin(ex, 'Hand spacing', 'peak', `Handle centres ${r1(ht[2] - htl[2])} cm apart at the top`);
console.log(`Dumbbell Close Grip Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { handleX: r1(hr[0]), spacing: [r1(hr[2] - hl[2]), r1(ht[2] - htl[2])] }))}`);
K.fail(rep, 'close grip curl', [[ht[2] - htl[2] > 32.5, 'dumbbells collide at the top']], { bodyTol: GAP - 0.5 });
