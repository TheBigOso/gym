// Seated Dumbbell Curl (GymVisual #039112): sitting tall on the end of a flat bench (no back support), feet flat and a little
// wider than the hips, dumbbells hanging beside the bench with the palms forward. Both arms curl together with the elbows
// by the sides, short squeeze, slow lower until the arms are straight with the dumbbells clear of the bench. Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-curls');
const K = require('./families/b4-curls2');
const D = require('./families/dumbbell');
const meta = require('./meta/seated-dumbbell-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const SEAT_H = 45, BENCH = { id: 'bench', kind: 'bench', center: [-40, 0, 0], size: [110, SEAT_H, 30] };
const SEAT_END = BENCH.center[0] + BENCH.size[0] / 2;
// rig buttock shapes vs the seat top: measured on the skinned mesh, the clay buttocks sit SEAT_OFF lower than the rig shapes
const SEAT_OFF = ENV('SEAT_OFF', -4.2);
const STANCE = ENV('STANCE', 13), FOOT_DX = ENV('FOOTDX', 42), BACK = ENV('BACK', 9); // pelvis this far in from the seat end
const st = L.POSES.standing({ stance: STANCE, toeOut: 10 });
const contacts = st.contacts;
let p = clone(st.pose); delete p.ik;
Object.assign(p.ch, { spine_l5: { rot: 0, flex: ENV('L5', -4), latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 2, latFlex: 0 },
  hip_r: { flex: 88, abd: ENV('HABD', 4), rot: -4 }, hip_l: { flex: 88, abd: ENV('HABD', 4), rot: -4 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, sc_r: { protract: -4, elevate: 0 }, sc_l: { protract: -4, elevate: 0 },
  neck_c7: { rot: 0, flex: 2 }, head_c1: { rot: 0, flex: 2 } });
p.root.pos = [SEAT_END - BACK, 55, 0]; p.root.rot = { pitch: ENV('PITCH', -4) };
const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => C.shapePlaneDist(W, id, [0, SEAT_H, 0], [0, 1, 0])));
p = L.solvePose(p, ['root.pos.1'], [(W) => [(seatY(W) - SEAT_OFF) * 4]]).pose;
const W0 = L.fk(p);
p.ik = { leg_r: { target: [r1(W0.hip_r.p[0] + FOOT_DX), L.ANKLE_H, STANCE], weight: 1 }, leg_l: { target: [r1(W0.hip_r.p[0] + FOOT_DX), L.ANKLE_H, -STANCE], weight: 1 } };
const base = p;
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const axis = [0, 0, 1];
const boxB = { center: BENCH.center, size: BENCH.size };
// bottom: arms hanging nearly straight beside the hips; the handle moves forward (x) until the dumbbell clears the bench end
// by CLR cm, at the height a nearly straight arm reaches (handle ~60.5 cm from the shoulder)
const CLR = ENV('CLR', 1.0), HZ = ENV('HZ', 30), S = L.fk(base, contacts).shoulder_r.p;
const at = (dx) => { const dz = HZ - S[2], y = S[1] - Math.sqrt(Math.max(0, ENV('REACH', 61.8) ** 2 - dx * dx - dz * dz)); return K.arcCurl(base, { handle0: [S[0] + dx, y, HZ], axis, flex1: ENV('FLEX', 128), drift: [ENV('DX', 4), ENV('DY', 2), 0], FS, contacts, guess: [40, 12, -40, 8, 0], armOpt: { minElev: 6 } }); };
let lo = 0, hi = 30, A = null;
for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2, r = at(m); if (D.dumbbellBoxClearance(L.fk(r.poses[0], contacts), 'r', boxB, 'handle') > CLR) { hi = m; A = r; } else lo = m; }
if (!A) A = at(hi);
const poses = {}, names = [];
A.poses.forEach((q, i) => {
  if (process.env.DEBUG) console.log(FS[i], (q.__cost || 0).toFixed(3), JSON.stringify([q.ch.shoulder_r, q.ch.elbow_r, q.ch.wrist_r]));
  delete q.__cost; delete q.__H; K.mirrorArmTo(q); if (i) K.unwrapTo(q, poses[names[i - 1]]);
  poses[`c${i}`] = q; names.push(`c${i}`);
});
const top = names[names.length - 1];
poses.squeeze = clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`elbow_${s}`].flex = r1(poses.squeeze.ch[`elbow_${s}`].flex + 2);
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
const ex = K.assemble(meta, { contacts, poses, keyframes, props: [BENCH, ...C.dumbbells(['r', 'l'])] });
const rep = C.loopCheck(ex, { benchBox: boxB, skip: ['thigh_r', 'thigh_l', 'quad_r', 'quad_l', 'buttock_r', 'buttock_l', 'shank_r', 'shank_l', 'calf_r', 'calf_l'] }); // legs: the rig plates are spheres (too fat sideways); checked on the mesh instead (>= 0.9 cm past the knees)
const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arms straight 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom']);
const trunk = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
console.log(`Seated Dumbbell Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { trunk: r1(trunk), knee: Math.round(kneeOf(Wb, 'r')), seat: +seatY(Wb).toFixed(2), handle: D.dumbbellAt(Wb, 'r', 'handle').c.map(r1), seatEnd: SEAT_END }))}`);
K.fail(rep, 'seated curl', [[rep.bench > 0, 'dumbbell into the bench']]);
module.exports = { ex };
