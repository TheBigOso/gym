// Dumbbell Cross Body Hammer Curl (GymVisual #029812): standing, dumbbells at the sides with neutral palms (thumbs forward).
// The right forearm curls up and across the body in a diagonal plane, thumb up the whole way, to the front of the left
// chest; short squeeze; it lowers back along the same path. Then the left arm. The idle arm hangs still. One 8.4 s loop
// holds one right and one left rep. Bilateral (both sides authored).
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-curls');
const K = require('./families/b4-curls2');
const D = require('./families/dumbbell');
const meta = require('./meta/dumbbell-cross-body-hammer-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
// curl plane: starts turned B0 toward the midline from straight ahead and turns to BETA by the top (diagonal path)
const B0 = ENV('B0', 25) * R.DEG, BETA = ENV('BETA', 62) * R.DEG;
const { contacts, base } = C.standing({});
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const down = [0, -1, 0], sm = (u) => u * u * (3 - 2 * u), beta = (f) => B0 + (BETA - B0) * sm(f);
const fwd = (f) => [Math.cos(beta(f)), 0, -Math.sin(beta(f))];
const flex1 = ENV('FLEX', 112);
let a0 = 0;
// thumb axis: forward at the bottom, then perpendicular to the forearm in the turned curl plane (top plate toward the shoulder)
const axis = (f) => { const a = a0 + flex1 * f * R.DEG, b = f < 0.3 ? beta(f) * (f / 0.3) : beta(f), fw = [Math.cos(b), 0, -Math.sin(b)]; return V.norm(V.add(V.scale(down, -Math.sin(a)), V.scale(fw, Math.cos(a)))); };
const A = K.arcCurl(base, { handle0: [ENV('HX', 4), ENV('HY', 80), ENV('HZ', 27)], axis, palm: (f) => (f === 0 ? [0, 0, -1] : null), flex1, drift: [ENV('DX', 8), ENV('DY', 2), -ENV('DZ', 4)], FS, contacts, fwd, down, guess: [40, 12, -40, 8, 90], armOpt: { axialW: ENV('AXW', 0.02), minElev: ENV('MINEL', 11) } });
const right = A.poses;
const bottom = clone(right[0]); delete bottom.__cost; K.mirrorArmTo(bottom);
const poses = { bottom }, kf = [{ t: 0, pose: 'bottom' }];
const ph = (id) => C.phase(meta, id);
let prev = bottom;
right.forEach((p, i) => {
  if (process.env.DEBUG) { const W = L.fk(p, contacts); console.log(FS[i], (p.__cost || 0).toFixed(3), p.__H ? V.len(V.sub(D.dumbbellAt(W, 'r', 'handle').c, p.__H)).toFixed(2) : '-', JSON.stringify([p.ch.shoulder_r, p.ch.elbow_r, p.ch.wrist_r])); }
  delete p.__cost; delete p.__H; if (i) K.unwrapTo(p, prev); prev = p;
});
for (const [s, up, top, dn] of [['r', 'rightUp', 'rightTop', 'rightDown'], ['l', 'leftUp', 'leftTop', 'leftDown']]) {
  const names = FS.map((f, i) => {
    if (i === 0) return 'bottom';
    const q = clone(bottom); K.putArm(q, s, K.armOf(right[i], 'r')); const n = `${s}${i}`; poses[n] = q; return n;
  });
  const sq = clone(poses[names[names.length - 1]]); sq.ch[`elbow_${s}`].flex = r1(sq.ch[`elbow_${s}`].flex + 2); poses[`${s}Squeeze`] = sq;
  const t0 = s === 'r' ? ph(up).start : 4.2;
  const k = K.keys(names, FS, { t0, t1: ph(up).end, t2: ph(top).end, t3: ph(dn).end, D: ph(dn).end, squeeze: `${s}Squeeze` });
  kf.push(...k.filter((x) => x.t > kf[kf.length - 1].t + 1e-6));
}
kf.push({ t: meta.timeline.duration, pose: 'bottom' });
const ex = K.assemble(meta, { contacts, poses, keyframes: kf });
const rep = K.report(ex, { skip: ['thigh_r', 'thigh_l', 'quad_r', 'quad_l'] });
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.rSqueeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.bottom, poses.rSqueeze, 'r', ['Arms straight 0.5 s', 'Per arm: 1.1 s up, 0.2 s squeeze, 2.0 s down; right rep then left rep']);
const ht = D.dumbbellAt(Wt, 'r', 'handle').c;
C.setKin(ex, 'Forearm rotation', 'peak', `${poses.rSqueeze.ch.wrist_r.pron}° channel; handle centre ends ${r1(-ht[2])} cm left of the midline, ${r1(ht[1])} cm high (in front of the left chest)`);
console.log(`Dumbbell Cross Body Hammer Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { topHandle: ht.map(r1) }))}`);
K.fail(rep, 'cross body hammer curl');
if (process.env.DEBUG) {
  const p = right[FS.length - 1], W = L.fk(p, contacts), f = 1;
  const E = V.add(A.E0, [ENV('DX', 8), ENV('DY', 2), -ENV('DZ', 4)]);
  console.log('elbow err', V.sub(W.elbow_r.p, E).map(r1), 'axis', L.Q.rot(W.wrist_r.q, [0, 0, 1]).map((v) => +v.toFixed(2)), 'want', axis(1).map((v) => +v.toFixed(2)), 'E0', A.E0.map(r1), 'S', W.shoulder_r.p.map(r1));
}
