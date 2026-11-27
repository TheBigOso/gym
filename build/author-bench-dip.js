// Bench Dip, knees bent (GymVisual #012912): palms planted on the edge of a flat 42 cm bench behind the hips, fingers
// forward (arm contacts: constant targets, palm-down world orientation), knees bent and feet flat on the floor (planted
// leg contacts). The trunk stays upright with the buttocks just clear of the bench face; the body lowers until the upper
// arms are about parallel to the floor, then presses back up. Each key is solved for the root (x, height, lean); the
// shoulder blades stay set down and back. Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const meta = require('./meta/bench-dip.json');

const BENCH_H = 42, BENCH_D = 30, EDGE = 0, PALM = 2.6;
const HZ = 22;                                      // wrists 44 cm apart, a little outside the hips
// Hands grip the edge: heel of the palm on the pad, fingers forward and curled down over the edge. The rigid rig hand is
// pitched FPITCH deg fingers-down with its palm surface resting on the front corner A_CORNER cm ahead of the wrist.
const FPITCH = +(process.env.FPITCH || 35), A_CORNER = +(process.env.ACORNER || 6);
const handQ = (s) => Q.mul(Q.axis([0, 0, 1], -FPITCH), s === 'r' ? L.handRotR : L.handRotL);
const WRIST = (() => { const a = FPITCH * R.DEG, pal = [EDGE - A_CORNER * Math.cos(a), BENCH_H + A_CORNER * Math.sin(a)]; return [r1(pal[0] + PALM * Math.sin(a)), r1(pal[1] + PALM * Math.cos(a))]; })();
const BACK = +(process.env.BACK ?? -6.5);              // rearmost rig buttock/pelvis point this far in front of the bench face (mesh sits inside the rig shapes)
const FOOT_X = +(process.env.FOOT_X || 58), FOOT_Z = 13, TOP_FLEX = 8;
const LEAN = +(process.env.LEAN || 4);               // trunk lean forward from vertical (deg)
const HAND = { r: [WRIST[0], WRIST[1], HZ], l: [WRIST[0], WRIST[1], -HZ] };
const FOOT = { r: [FOOT_X, L.ANKLE_H, FOOT_Z], l: [FOOT_X, L.ANKLE_H, -FOOT_Z] };
const POLE = JSON.parse(process.env.POLE || '[-1, 0, 0.3]');
const contacts = [Object.assign(H.handC('r', POLE), { handRot: H.qArr(handQ('r')) }), Object.assign(H.handC('l', [POLE[0], POLE[1], -POLE[2]]), { handRot: H.qArr(handQ('l')) }), H.legC('r', { pole: [1, 0.2, 0.15], rot: H.footQ(0, -6) }), H.legC('l', { pole: [1, 0.2, -0.15], rot: H.footQ(0, 6) })];
const SC = { protract: -18, elevate: -4 };          // shoulders down and back

const base = (() => {
  const p = L.POSES.standing().pose; delete p.ik;
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 4, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: -2, latFlex: 0 }, neck_c7: { rot: 0, flex: 4 }, head_c1: { rot: 0, flex: 2 },
    sc_r: clone(SC), sc_l: clone(SC), hip_r: { flex: 85, abd: 4, rot: 0 }, hip_l: { flex: 85, abd: 4, rot: 0 }, knee_r: { flex: 90 }, knee_l: { flex: 90 } });
  return p;
})();
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]) * Math.sign(W.neck_c7.p[0] - W.pelvis.p[0]);
const rearX = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => T.extremePt(W, T.shapeOf(id), [-1, 0, 0])[0]));
// Root (x, y, pitch) for a given shoulder height: buttocks BACK cm in front of the bench face, trunk at LEAN.
function rootFor(shY) {
  const p = clone(base);
  return L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [
    (W) => [(rearX(W) - (EDGE + BACK)) * 3], (W) => [(trunkLean(W) - LEAN) * 0.5], (W) => [(W.shoulder_r.p[1] - shY) * 3],
  ], { iters: 300 });
}
function poseFor(shY) {
  let p = rootFor(shY).pose;
  p.ik = { arm_r: { target: HAND.r.slice(), weight: 1 }, arm_l: { target: HAND.l.slice(), weight: 1 }, leg_r: { target: FOOT.r.slice(), weight: 1 }, leg_l: { target: FOOT.l.slice(), weight: 1 } };
  for (const s of ['r', 'l']) {
    p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), FOOT[s], { rot: 0, abd: 4, handRot: contacts.find((c) => c.id === `leg_${s}`).handRot });
    p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], [{ [`shoulder_${s}`]: { plane: -50, elev: 30, axial: 0 }, [`elbow_${s}`]: { flex: 30 }, [`wrist_${s}`]: { pron: 0, flex: -80, dev: 0 } }, { [`shoulder_${s}`]: { plane: -55, elev: 70, axial: 40 }, [`elbow_${s}`]: { flex: 90 }, [`wrist_${s}`]: { pron: 0, flex: -80, dev: 0 } }]);
    p[`__cost_${s}`] = p.__cost; delete p.__cost;
  }
  return p;
}
const armDist = (shY) => { const W = L.fk(rootFor(shY).pose); return V.len(V.sub(W.shoulder_r.p, HAND.r)); };
const uaTilt = (p) => { const W = L.fk(p, contacts); return Math.asin(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p))[1]) / R.DEG; }; // + elbow above shoulder
// top: straight arms (elbow TOP_FLEX)
let lo = 50, hi = 110, shTop = 90;
for (let i = 0; i < 40; i++) { shTop = (lo + hi) / 2; if (armDist(shTop) > L.reach(TOP_FLEX)) hi = shTop; else lo = shTop; }
// bottom: upper arm parallel to the floor
lo = shTop - 45; hi = shTop - 5; let shBot = shTop - 20;
for (let i = 0; i < 30; i++) { shBot = (lo + hi) / 2; const W = L.fk(Object.assign(rootFor(shBot).pose, { ik: { arm_r: { target: HAND.r, weight: 1 } } }), contacts); if (W.elbow_r.p[1] > W.shoulder_r.p[1]) lo = shBot; else hi = shBot; }
shTop = r1(shTop); shBot = r1(shBot);
const ease = T.ease, at = (u) => poseFor(shTop + (shBot - shTop) * u);
const poses = { top: at(0), d1: at(ease(0.25)), d2: at(ease(0.5)), d3: at(ease(0.75)), bottom: at(1), bottomHold: at(0.985), u1: at(ease(0.75)), u2: at(ease(0.5)), u3: at(ease(0.25)) };
const costs = Object.values(poses).map((p) => Math.max(p.__cost_r, p.__cost_l)); Object.values(poses).forEach((p) => { delete p.__cost_r; delete p.__cost_l; });
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 1.1, pose: 'd1' }, { t: 1.6, pose: 'd2' }, { t: 2.1, pose: 'd3' }, { t: 2.6, pose: 'bottom' }, { t: 2.75, pose: 'bottomHold' }, { t: 2.9, pose: 'bottom' },
  { t: 3.225, pose: 'u1' }, { t: 3.55, pose: 'u2' }, { t: 3.875, pose: 'u3' }, { t: 4.2, pose: 'top' }, { t: 5.0, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
// Flat padded bench (seat + flat back pad, 120 cm) turned crosswise (rotY 90: its length runs along Z behind the athlete);
// the box below is the same pad volume for the clearance checks.
const DBF = require('./families/dumbbell');
const benchProp = Object.assign(DBF.bench({ x: EDGE - BENCH_D / 2, z: -40, seat: 40, height: BENCH_H, width: BENCH_D, angle: 0, back: 80 }).prop, { rotY: 90 });
ex.props = ex.props.filter((p) => p.id !== 'bench').concat([benchProp]);
const bench = { center: [EDGE - BENCH_D / 2, 0, 0], size: [BENCH_D, BENCH_H, 120] };

// checks: planted contacts, floor, body vs the bench (top and front face)
const pr = { face: 1e9, top: 1e9 };
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l', 'leg_r', 'leg_l'], probe: (W) => {
  pr.face = Math.min(pr.face, rearX(W) - EDGE);
  const ob = T.bodyOverBox(W, bench, /^(hand_[rl]|thumb_[rl])$/); if (ob.d < pr.top) { pr.top = ob.d; pr.topAt = ob.id; }
} });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const shExt = (W) => { const t = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)), ua = V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); return V.angle(ua, V.scale(t, -1)) * (V.dot(ua, [1, 0, 0]) < 0 ? 1 : -1); }; // upper arm behind the trunk line
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wb, 'r'))} at the bottom`);
set('Shoulder extension', 'setup', `${d(shExt(Wt))} (upper arm behind the trunk line)`); set('Shoulder extension', 'peak', `${d(shExt(Wb))} at the bottom`);
set('Upper arm angle to the floor', 'setup', `${d(-uaTilt(poses.top))} (arm pointing down and back)`); set('Upper arm angle to the floor', 'peak', `${d(Math.abs(uaTilt(poses.bottom)))} (parallel)`);
const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
set('Hip travel', 'setup', `Hips ${Math.round(Wt.hip_r.p[1])} cm above the floor, just in front of the bench`); set('Hip travel', 'peak', `${Math.round(travel)} cm down (hips ${Math.round(Wb.hip_r.p[1])} cm)`);
set('Tempo', 'setup', 'Top 0.6 s'); set('Tempo', 'peak', '2.0 s down, 0.3 s pause, 1.3 s up, 0.8 s at the top');
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Bench Dip: wrote ${L.write(ex)}\n  shoulder y ${shTop}..${shBot} travel ${r1(travel)} elbow ${r1(T.elbowOf(Wt, 'r'))}..${r1(T.elbowOf(Wb, 'r'))} shExt ${r1(shExt(Wt))}..${r1(shExt(Wb))} uaTilt ${r1(uaTilt(poses.bottom))} armFitCost ${Math.max(...costs).toExponential(1)}\n  top arm ${JSON.stringify(poses.top.ch.shoulder_r)} ${JSON.stringify(poses.top.ch.wrist_r)} bottom arm ${JSON.stringify(poses.bottom.ch.shoulder_r)} ${JSON.stringify(poses.bottom.ch.elbow_r)} root ${JSON.stringify(poses.top.root)} / ${JSON.stringify(poses.bottom.root)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(pr)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (process.env.DBG) for (const n of ['top', 'bottom']) {
  const p = poses[n], Wi = L.fk(p, contacts), Wf = L.fk(p);
  const hq = Wi.wrist_r.q, hf = Wf.wrist_r.q;
  console.log('DBG', n, 'elbowErr', V.len(V.sub(Wi.elbow_r.p, Wf.elbow_r.p)).toFixed(2), 'wristErr', V.len(V.sub(Wi.wrist_r.p, Wf.wrist_r.p)).toFixed(2), 'handOriErr', V.angle(Q.rot(hq, [0, -1, 0]), Q.rot(hf, [0, -1, 0])).toFixed(1), V.angle(Q.rot(hq, [1, 0, 0]), Q.rot(hf, [1, 0, 0])).toFixed(1), 'elbowIK', Wi.elbow_r.p.map(r1), 'sh', Wi.shoulder_r.p.map(r1));
  // unconstrained fit of the shoulder for the IK elbow
  const set = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; return q; };
  const s = R.solveLM([-80, 60, 0], (x) => V.sub(L.fk(set(x)).elbow_r.p, Wi.elbow_r.p), { iters: 300 }); console.log('  free plane/elev', s.x.map(r1), s.cost.toFixed(4));
}
if (process.env.DBG2) { const p = poses.top, Wi = L.fk(p, contacts), hq = Wi.wrist_r.q; const f = Q.rot(hq, [0, -1, 0]), n = Q.rot(hq, [1, 0, 0]);
  const Wf = L.fk(p); console.log('forearm', V.norm(V.sub(Wf.wrist_r.p, Wf.elbow_r.p)).map((v) => +v.toFixed(2)), 'f', f.map((v) => +v.toFixed(2)), 'n', n.map((v) => +v.toFixed(2)));
  for (const pr of [-170, -90, 0, 90, 170]) console.log(pr, JSON.stringify(T.wristTo(p, 'r', f, n, [[pr, -40, 0]], { flex: [-200, 200], dev: [-200, 200] }))); }
