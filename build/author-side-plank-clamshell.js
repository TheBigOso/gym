// Side Plank Clamshell (GymVisual #984912): kneeling side plank on the right forearm, authored on the right side (the player
// mirrors). Lying on the right side (head toward -X, chest facing +Z), right elbow under the shoulder with the forearm
// pointing forward, hips flexed about 30 degrees and knees about 90 degrees, feet stacked behind. From the hips resting on
// the mat, the hips lift into a straight shoulder-hip-knee line pivoting on the right forearm and the right knee; with the
// hips up the top (left) knee opens like a clamshell while the feet stay together, closes, and the hips lower.
// Contact: right forearm (wrist IK target; the elbow point stays on the mat one upper arm from the shoulder, as in the side
// plank). The bottom leg is FK, solved per key so the right knee and ankle stay on their mat points (the root solve keeps the
// hip one thigh length from the knee point; an IK leg with one fixed pole could not let the thigh adduct as the hips drop).
// The top leg is FK too: its ankle stays stacked on the right ankle while the knee opens.
const L = require('./lib');
const { R, V, Q, rig, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const meta = require('./meta/side-plank-clamshell.json');

const r3 = (v) => Math.round(v * 1000) / 1000;
const DROP = 3.2, WRIST_Y = 4.2, TILT = 15;        // forearm fit to the athlete (from the side plank)
const HIP_FLEX = +(process.env.HF ?? 30), KNEE = +(process.env.KN ?? 90), OPEN = +(process.env.OPEN ?? 40), STACK = +(process.env.STACK ?? 7.5);
const KNEE_Y = +(process.env.KY ?? 5.8), ANKLE_Y = +(process.env.AY ?? 6.0);                  // shank capsule radii (5.2 at the knee, 3.2 at the ankle): shin lying on the mat
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const base = { root: { pos: [0, 30, 0], rot: { yaw: -90, pitch: 0, roll: 72 } }, ch: {
  spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 },
  hip_r: { flex: HIP_FLEX, abd: 0, rot: 0 }, hip_l: { flex: HIP_FLEX, abd: 0, rot: 0 }, knee_r: { flex: KNEE }, knee_l: { flex: KNEE }, ankle_r: { dorsi: -15 }, ankle_l: { dorsi: -15 },
  sc_r: { protract: 4, elevate: -4 }, sc_l: { protract: 0, elevate: 0 },
  shoulder_l: { plane: 30, elev: 14, axial: 10 }, elbow_l: { flex: 12 }, wrist_l: { pron: 30, flex: 0, dev: 0 } } };
// Hold frame (FK): shoulder at the forearm-plank height, right knee and shin on the mat
const solve = (pose, paths, objs, contacts, iters = 500) => {
  const set = (x) => { const q = clone(pose); paths.forEach((p, i) => L.setPathV(q, p, x[i])); return q; };
  const res = (x) => { const q = set(x), W = L.fk(q, contacts); return objs.flatMap((f) => f(W, q)); };
  const sol = R.solveLM(paths.map((p) => L.getPath(pose, p) ?? 0), res, { iters });
  return { pose: set(sol.x.map(r3)), cost: sol.cost };
};
const hold0 = solve(base, ['root.pos.1', 'root.rot.roll', 'ch.hip_r.rot'], [L.obj.atY('shoulder_r', P.ELBOW_Y + P.UA - DROP, 3), L.obj.atY('knee_r', KNEE_Y, 3), L.obj.atY('ankle_r', ANKLE_Y, 3), L.obj.reg('ch.hip_r.rot', 0, 0.02)]).pose;
hold0.ch.hip_l = clone(hold0.ch.hip_r);
hold0.ch.ankle_r = { dorsi: -10 }; hold0.ch.ankle_l = { dorsi: -10 };
const W0 = L.fk(hold0);
const BACK = Math.sqrt(P.UA ** 2 - (P.UA - DROP) ** 2), S0 = W0.shoulder_r.p;
const E = [r3(S0[0] + BACK), P.ELBOW_Y, r3(S0[2])];
const WT = [E[0], WRIST_Y, r3(E[2] + Math.sqrt(P.FA ** 2 - (WRIST_Y - P.ELBOW_Y) ** 2))];
const K = W0.knee_r.p.map(r3), AT = W0.ankle_r.p.map(r3);
// right foot resting on its outer edge: the hold-frame foot turned about the shin axis until its sole edge sits on the mat
const FOOT_R = (() => { const ax = V.norm(V.sub(W0.ankle_r.p, W0.knee_r.p)); let a = -90, b = 90, q = W0.ankle_r.q;
  const low = (al) => { const Wt = L.fk(hold0); Wt.ankle_r = { p: Wt.ankle_r.p, q: Q.mul(Q.axis(ax, al), W0.ankle_r.q) }; return H.bottomOf(Wt, 'foot_r'); };
  let best = null; for (let al = -90; al <= 90; al += 5) { const y = low(al); if (y >= 0.3 && (!best || Math.abs(al) < Math.abs(best))) best = al; }
  if (best == null) best = 0; else { a = best - 5; b = best; if (low(a) < 0.3) { for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (low(m) < 0.3) a = m; else b = m; } best = b; } }
  return { q: Q.mul(Q.axis(ax, best), W0.ankle_r.q), al: best }; })();
const HAND0 = Q.fromBasis([0, -1, 0], [0, 0, -1], [1, 0, 0]), hand = Q.mul(Q.axis([0, 0, 1], TILT), HAND0);
// knee pole: from the hip-ankle midpoint toward the knee in the hold frame
const poleR = V.norm(V.sub(K, V.scale(V.add(W0.hip_r.p, AT), 0.5))).map(r3);
const contacts = [
  Object.assign(L.handContact('r'), { label: 'Right forearm', pole: [0.5, -1, 0], handRot: P.qArr(hand) }),
];
const TH = V.len(rig.byId.knee_r.offset);
// left ankle stacked on top of the right one (FK target)
const AL = V.add(AT, V.scale(V.norm(V.sub(W0.hip_l.p, W0.hip_r.p)), STACK)).map(r3);
const lowHip = (W) => Math.min(P.bottomOf(W, 'pelvis'), P.bottomOf(W, 'buttock_r'));
const setSag = (p, s) => { for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 0, latFlex: r3(s * (j === 'spine_t6' ? 0.6 : 1)) }; return p; };
// Place the body: elbow IK point on E, knee IK point on K, pelvis at height hipY; free root x/y/z/roll/pitch, sc_r, side bend
function place(start, hipY, sagRef) {
  const sc0 = base.ch.sc_r;
  const set = (x) => { const q = clone(start); q.root = { pos: [x[0], x[1], x[2]], rot: { yaw: -90, pitch: x[3], roll: x[4] } }; q.ch.sc_r = { protract: x[5], elevate: x[6] }; setSag(q, x[7]); return q; };
  const res = (x) => { const W = L.fk(set(x), contacts); return [...V.sub(W.elbow_r.p, E).map((v) => v * 20), (V.len(V.sub(W.hip_r.p, K)) - TH) * 20, (lowHip(W) - hipY) * 3, Math.min(0, P.bottomOf(W, 'thigh_r') + 0.3) * 15,
    x[3] * 2, (x[4] - start.root.rot.roll) * +(process.env.RW ?? 0.3), (x[5] - sc0.protract) * 0.05, (x[6] - sc0.elevate) * 0.05, (x[7] - sagRef) * +(process.env.SW ?? 0.15), (x[2] - start.root.pos[2]) * +(process.env.ZW ?? 0.3), Math.max(0, x[7] + 0.5 * (sagRef < -1)) * 3, Math.min(0, x[6] + 9.5) * 3, Math.max(0, Math.abs(x[7]) - 14.5) * 5]; };
  const r = start.root, x0 = [r.pos[0], r.pos[1], r.pos[2], r.rot.pitch || 0, r.rot.roll, start.ch.sc_r.protract, start.ch.sc_r.elevate, start.ch.spine_l5.latFlex || 0];
  const sol = R.solveLM(x0, res, { iters: 800 });
  const q = set(sol.x.map(r3)); q.__err = { elbow: V.len(V.sub(L.fk(q, contacts).elbow_r.p, E)), hipK: Math.abs(V.len(V.sub(L.fk(q, contacts).hip_r.p, K)) - TH) };
  return q;
}
// Top leg: ankle on AL; closed = knee resting on the bottom knee, open = rotated about the hip-ankle axis by `open` degrees
function topLeg(q, open) {
  const W = L.fk(q, contacts);
  const closedKnee = V.add(W.knee_r.p, V.scale(V.norm(V.sub(W.hip_l.p, W.hip_r.p)), STACK + 1));
  let p = F.legTo(q, 'l', { ankle: AL, knee: closedKnee, kneeFlex: undefined });
  if (open > 0.01) {
    const Wc = L.fk(p, contacts), ax = V.norm(V.sub(AL, Wc.hip_l.p)), kq = Q.axis(ax, -open);
    const kn = V.add(Wc.hip_l.p, Q.rot(kq, V.sub(Wc.knee_l.p, Wc.hip_l.p)));
    const up = L.fk(p, contacts).knee_l.p[1];
    p = F.legTo(p, 'l', { ankle: AL, knee: kn });
    p.__up = L.fk(p, contacts).knee_l.p[1] - up;
  }
  delete p.__cost;
  return p;
}
hold0.ik = { arm_r: { target: WT, weight: 1 } };
const W1 = L.fk(hold0, contacts), HIP_TOP = lowHip(W1);
const HIP_LOW = +(process.env.HIPLOW ?? 1.5), SAG_LOW = -10;
function key(f, open, start) { // f: 0 = hips down, 1 = top
  const s = start || hold0;
  let q = place(s, HIP_LOW + (HIP_TOP - HIP_LOW) * f, SAG_LOW * (1 - f));
  const err = q.__err; delete q.__err;
  q = P.fitAll(q, contacts);
  q = F.legTo(q, 'r', { knee: K, ankle: AT, wRot: 0.0005 }); const c = q.__cost; delete q.__cost;   // bottom leg: FK, knee and ankle held on their mat points
  q = topLeg(q, open);
  err.leg = c;
  // the bottom foot lies on its outer edge: ankle angle (closest to -10) that keeps the sole edge on or just above the mat
  { let best = null; for (let d = -60; d <= 30; d += 1) { q.ch.ankle_r = { dorsi: d }; const y = H.bottomOf(L.fk(q, contacts), 'foot_r'); if (y >= 0.1 && y < 3 && (!best || Math.abs(d + 10) < Math.abs(best + 10))) best = d; }
    if (best == null) { let by = -1e9; for (let d = -60; d <= 30; d += 1) { q.ch.ankle_r = { dorsi: d }; const y = H.bottomOf(L.fk(q, contacts), 'foot_r'); if (y > by) { by = y; best = d; } } }
    q.ch.ankle_r = { dorsi: best }; }
  q.__err = err;
  return q;
}
const poses = {}, errs = {};
const add = (n, f, open, start) => { const q = key(f, open, start); errs[n] = q.__err; delete q.__err; delete q.__up; poses[n] = q; return q; };
add('top', 1, 0);
const NL = +(process.env.NL ?? 16);
// lowering chain solved from the top down, each key started from the one above (continuation keeps one smooth branch)
for (let i = NL - 1; i >= 1; i--) add(`l${i}`, F.easeIO(i / NL), 0, poses[i === NL - 1 ? 'top' : `l${i + 1}`]);
add('setup', 0, 0, poses.l1);
const OPENS = [0.25, 0.5, 0.75, 1];
OPENS.forEach((o, i) => add(`o${i + 1}`, 1, OPEN * F.easeIO(o), poses.top));
add('oHold', 1, OPEN + 2, poses.top);
const keyframes = [{ t: 0, pose: 'setup' }, { t: 0.8, pose: 'setup' }];
for (let i = 1; i < NL; i++) keyframes.push({ t: +(0.8 + 1.0 * i / NL).toFixed(3), pose: `l${i}` });
keyframes.push({ t: 1.8, pose: 'top' });
OPENS.forEach((o, i) => keyframes.push({ t: +(1.8 + 0.8 * o).toFixed(3), pose: `o${i + 1}` }));
keyframes.push({ t: 2.9, pose: 'oHold' });
[0.75, 0.5, 0.25].forEach((o, i) => keyframes.push({ t: +(3.2 + 0.8 * (1 - o)).toFixed(3), pose: `o${OPENS.indexOf(o) + 1}` }));
keyframes.splice(keyframes.findIndex((k) => k.pose === 'oHold') + 1, 0, { t: 3.2, pose: 'o4' });
keyframes.push({ t: 4.0, pose: 'top' });
for (let i = NL - 1; i >= 1; i--) keyframes.push({ t: +(4.0 + 1.0 * (NL - i) / NL).toFixed(3), pose: `l${i}` });
keyframes.push({ t: 5.0, pose: 'setup' }, { t: 5.8, pose: 'setup' });
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const sw = P.sweep(ex, [{ joint: 'elbow_r', p: E }]), swK = P.sweep(ex, [{ joint: 'knee_r', p: K }, { joint: 'ankle_r', p: AT }]);
let anklL = 0; H.loopReport(ex, { probe: (W) => { anklL = Math.max(anklL, V.len(V.sub(W.ankle_l.p, AL))); } });
const meas = (n) => { const W = L.fk(poses[n], contacts), mid = (a, b) => V.scale(V.add(W[a].p, W[b].p), 0.5);
  const trunk = V.sub(mid('shoulder_r', 'shoulder_l'), W.pelvis.p), thigh = V.sub(W.knee_r.p, W.hip_r.p);
  return { W, line: V.angle(V.sub(W.shoulder_r.p, W.hip_r.p), V.sub(W.hip_r.p, W.knee_r.p)), pelvisY: lowHip(W), kneeGap: V.len(V.sub(W.knee_l.p, W.knee_r.p)), elbow: P.elbowAngle(W, 'r') }; };
const ms = meas('setup'), mt = meas('top'), mo = meas('o4');
const set = H.setKin(ex);
set('Body line', 'setup', `Hips on the mat, trunk side-bent ${Math.round(-poses.setup.ch.spine_l5.latFlex * 2.6)}° toward the ceiling`); set('Body line', 'peak', `Shoulder-hip-knee ≈${Math.round(mt.line)}° off straight (hips flexed ${HIP_FLEX}° forward of the line)`);
set('Elbow position', 'setup', 'On the mat under the shoulder, forearm pointing forward'); set('Elbow position', 'peak', `Unchanged (elbow point ${Math.round(BACK)} cm toward the feet to fit the athlete's shorter upper arm)`);
set('Pelvis lift', 'setup', `Pelvis ${ms.pelvisY.toFixed(1)} cm (resting)`); set('Pelvis lift', 'peak', `Pelvis ${Math.round(mt.pelvisY)} cm off the mat`);
set('Top hip (clam)', 'setup', 'Knees together'); set('Top hip (clam)', 'peak', `Top knee opens ${OPEN}° about the hip-ankle axis (knees ${Math.round(mo.kneeGap)} cm apart; hip abd ${poses.o4.ch.hip_l.abd}°, rot ${poses.o4.ch.hip_l.rot}°)`);
set('Knees and feet', 'setup', `Knees ≈${Math.round(P.kneeAngle(ms.W, 'r'))}°, feet stacked`); set('Knees and feet', 'peak', 'Bottom knee and shin stay on the mat; the feet stay together');
set('Tempo', 'setup', '0.8 s resting'); set('Tempo', 'peak', '1 s lift, 0.8 s open, 0.6 s hold, 0.8 s close, 1 s lower, 0.8 s rest');
const travel = V.len(V.sub(mt.W.pelvis.p, ms.W.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Side Plank Clamshell: kneeAnkleDrift ${swK.drift} at ${swK.driftAt}`);
console.log(`Side Plank Clamshell: wrote ${L.write(ex)}  E=${E} WT=${WT} K=${K} AT=${AT} AL=${AL} pole=${poleR}\n  sweep ${JSON.stringify(sw)} leftAnkleDrift ${anklL.toFixed(2)} hipTop ${HIP_TOP.toFixed(1)}`);
for (const n of Object.keys(poses)) { const m = meas(n); console.log(`  ${n.padEnd(6)} err ${JSON.stringify(Object.fromEntries(Object.entries(errs[n]).map(([k, v]) => [k, +v.toFixed(3)])))} line ${m.line.toFixed(1)} pelvisY ${m.pelvisY.toFixed(1)} kneeGap ${m.kneeGap.toFixed(1)} hipL ${JSON.stringify(poses[n].ch.hip_l)} hipR ${JSON.stringify(poses[n].ch.hip_r)} sag ${poses[n].ch.spine_l5.latFlex} min ${L.shapeMinY(m.W).y.toFixed(2)}(${L.shapeMinY(m.W).id})`); }
console.log('  keys', keyframes.map((k) => `${k.t}:${k.pose}`).join(' '));
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted forearm slides'); process.exitCode = 1; }
if (swK.drift > 0.1) { console.error('FAIL: bottom knee or ankle moves on the mat'); process.exitCode = 1; }
