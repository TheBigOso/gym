// Push-up to Side Plank (GymVisual #066412): high plank, hands under the shoulders, feet hip width on the balls of the feet;
// a strict push-up, then the body turns as one piece onto the right hand into a side plank with the left arm reaching to the
// ceiling (1 s hold), turns back, does another push-up and turns onto the left hand. Alternating sides, authored in full
// (bilateral). Push-up keys: batch 2 push-up solver (b4-floorpush makePushG; all four contacts planted). The turn: the whole
// body rotates rigidly about the line through the support shoulder and the support foot's contact point, so the support hand
// stays planted (constant target, weight 1) under a vertical arm and the support foot rolls onto its outer edge about that
// point; the legs are FK for the turn (fitted to the planted legs at the hand-over), the free hand is released and its arm
// raised to the ceiling, and the top foot comes to rest on the bottom foot. The left-side half is the mirror image.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const B = require('./families/b4-floorpush');
const H = require('./families/hips');
const meta = require('./meta/push-up-to-side-plank.json');

const HAND_X = 46, HAND_Z = 20, ANKLE_Z = 9, BOT_CHEST = 12;
const F = B.makePushG({ handY: 0, handZ: HAND_Z, ankleZ: ANKLE_Z, footTilt: -8, flarePole: [-1, 0.4, 0.45] });
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const T0 = ph.setup.end, T1 = ph.lower.end, T2 = ph.press.end, T3 = ph.rotateR.end, T4 = ph.holdR.end, T5 = ph.returnR.end, D = meta.timeline.duration;
const HALF = T5 - T0; // the second half (left side) repeats the first half's keys mirrored, shifted by HALF
const rp = F.rep(HAND_X, { meshSlack: 0.5, botChest: BOT_CHEST, T: { hold: T0, down: T1 - T0 - 0.1, pause: 0.1, up: T2 - T1, D }, nDown: 5, nUp: 4 });
const top = rp.poses.top;
const legs = F.contacts.filter((c) => /^leg_/.test(c.id));
// FK legs matching the planted legs of the top pose (hand-over pose for the turn)
const Wtop = L.fk(top, F.contacts);
const ballR = B.lowPoint(R.shapeWorld(Wtop, B.shapeOf('foot_r')));
const S0 = Wtop.shoulder_r.p.slice(), AX = V.norm(V.sub(ballR, S0));
// Rotate a world point / quaternion about the axis through S0 by phi (deg)
const rotAbout = (p, q) => V.add(S0, Q.rot(q, V.sub(p, S0)));
// YZX Euler (engine rootQuat = Ry(yaw) Rz(pitch) Rx(roll)) from a quaternion
function euler(q) {
  const ex = Q.rot(q, [1, 0, 0]), b = Math.asin(Math.max(-1, Math.min(1, ex[1]))), a = Math.atan2(-ex[2], ex[0]);
  const qi = Q.conj(Q.mul(Q.axis([0, 1, 0], a / R.DEG), Q.axis([0, 0, 1], b / R.DEG))), ey = Q.rot(Q.mul(qi, q), [0, 1, 0]);
  return { yaw: r1(a / R.DEG), pitch: r1(b / R.DEG), roll: r1(Math.atan2(ey[2], ey[1]) / R.DEG) };
}
// Left arm raised: wrist straight above the left shoulder, palm facing the way the chest faces, elbow nearly straight
const ARM_L = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron', 'ch.wrist_l.flex', 'ch.wrist_l.dev'];
const lim = (q) => ARM_L.map((pth) => { const [, j, c] = pth.split('.'), l = rig.byId[j].limits && rig.byId[j].limits[c], v = L.getPath(q, pth) ?? 0; return l ? (Math.max(0, l[0] + 1 - v) + Math.max(0, v - l[1] + 1)) * 20 : 0; });
function raiseLeft(p, f, prevArm) {
  const W = L.fk(p), up = [0, 1, 0], S = W.shoulder_l.p;
  const W0 = L.fk(Object.assign(clone(p), { ik: {} }));
  const start = W0.wrist_l.p; // where the released arm (hand-over channels) puts the wrist at this body pose
  const g = Math.min(1, f * 1.15), lift = V.scale(up, 4 * Math.min(1, f / 0.2)); // the hand first lifts off the floor, then swings up
  const want = V.add(S, V.scale(V.norm(V.add(V.scale(V.norm(V.sub(V.add(start, lift), S)), 1 - g), V.scale(up, g))), V.len(V.sub(start, S)) * (1 - g) + L.reach(6) * g));
  const ref = prevArm || { shoulder_l: p.ch.shoulder_l, elbow_l: p.ch.elbow_l, wrist_l: p.ch.wrist_l };
  const objs = [(Wx) => V.sub(Wx.wrist_l.p, want).map((v) => v * 3), (Wx) => V.sub(Q.rot(Wx.wrist_l.q, [1, 0, 0]), Q.rot(Wx.spine_t6.q, [1, 0, 0])).map((v) => v * 2 * g * g),
    (Wx, q) => [(q.ch.elbow_l.flex - 6) * 0.08 * g, q.ch.wrist_l.flex * 0.05 * g, q.ch.wrist_l.dev * 0.05 * g],
    (Wx, q) => ARM_L.map((pth) => { const [, j, c] = pth.split('.'); return ((q.ch[j][c] ?? 0) - (ref[j][c] ?? 0)) * 0.02; }), lim];
  const q0 = clone(p); Object.assign(q0.ch, clone(ref));
  return L.solvePose(q0, ARM_L, objs, { iters: 400 }).pose;
}
// Support foot: after the rigid turn, small right hip / ankle corrections keep the foot's lowest point on the floor at the pivot
function footOnFloor(p) {
  const objs = [(W) => { const lp = B.lowPoint(R.shapeWorld(W, B.shapeOf('foot_r'))); return [(lp[1] - 0.1) * 4, (lp[0] - ballR[0]) * 0.5, (lp[2] - ballR[2]) * 0.5]; },
    L.obj.reg('ch.hip_r.abd', p.ch.hip_r.abd, 0.05), L.obj.reg('ch.hip_r.flex', p.ch.hip_r.flex, 0.05), L.obj.reg('ch.ankle_r.dorsi', p.ch.ankle_r.dorsi, 0.02)];
  return L.solvePose(p, ['ch.hip_r.abd', 'ch.hip_r.flex', 'ch.ankle_r.dorsi'], objs, { iters: 200 }).pose;
}
// Turn angle about the shoulder-foot axis that makes the chest face sideways (coronal plane vertical) in the side plank
const PHI = (() => { const ant = Q.rot(Wtop.spine_t6.q, [1, 0, 0]), g = (phi) => Q.rot(Q.axis(AX, -phi), ant)[1]; let lo = 50, hi = 130; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (g(m) < 0) lo = m; else hi = m; } return r1((lo + hi) / 2); })();
// Turn key: f = 0..1 of the roll onto the right hand
function turn(f, armL) {
  const phi = PHI * f, qr = Q.axis(AX, -phi); // AX points from the shoulder to the foot (-X): a negative turn brings the right side down
  const p = clone(armL.base);
  p.root.pos = rotAbout(top.root.pos, qr).map(r1);
  Object.assign(p.root.rot, euler(Q.mul(qr, Wtop.pelvis.q)));
  // feet together: the top (left) leg adducts onto the bottom one as the body turns
  p.ch.hip_l = Object.assign({}, p.ch.hip_l, { abd: r1((armL.base.ch.hip_l.abd || 0) - 9.5 * f) });
  p.ch.hip_r = Object.assign({}, p.ch.hip_r, { abd: r1((armL.base.ch.hip_r.abd || 0) - 2 * f) });
  p.ch.neck_c7 = { rot: r1(-30 * f), flex: r1(top.ch.neck_c7.flex * (1 - f)) }; p.ch.head_c1 = { rot: r1(-15 * f), flex: r1(top.ch.head_c1.flex * (1 - f)) };
  p.ch.sc_r = { protract: r1(top.ch.sc_r.protract + 2 * f), elevate: 0 };
  p.ik = { arm_r: clone(top.ik.arm_r), arm_l: Object.assign(clone(top.ik.arm_l), { weight: 0 }), leg_r: Object.assign(clone(top.ik.leg_r), { weight: 0 }), leg_l: Object.assign(clone(top.ik.leg_l), { weight: 0 }) };
  const q = raiseLeft(footOnFloor(p), f, armL.prev);
  armL.prev = { shoulder_l: q.ch.shoulder_l, elbow_l: q.ch.elbow_l, wrist_l: q.ch.wrist_l };
  return q;
}
// Hand-over pose: top with FK legs and FK left arm fitted to the planted ones
let fkTop = clone(top);
fkTop = F.freeArms(fkTop, HAND_X, 0); fkTop.ik.arm_r.weight = 1; // right hand stays planted
fkTop.ik.leg_r.weight = 0; fkTop.ik.leg_l.weight = 0;
for (const sd of ['r', 'l']) for (const j of ['shoulder', 'elbow', 'wrist']) top.ch[`${j}_${sd}`] = clone(fkTop.ch[`${j}_l`]); // both arms on the released left arm's branch (mirror-symmetric values; drawing unchanged: hands planted)
const armL = { base: fkTop, prev: null };
const half = []; // [t, name, pose] for the first half (after the setup hold)
for (const k of rp.keyframes) if (k.t > T0 && k.t <= T2) half.push([k.t, k.pose, rp.poses[k.pose]]);
const fs = [0.06, 0.2, 0.38, 0.56, 0.74, 0.9, 1];
const ease = (x) => x * x * (3 - 2 * x);
const turnPoses = fs.map((f) => turn(f, armL));
fs.forEach((f, i) => half.push([+(T2 + 0.08 + (T3 - T2 - 0.08) * ease((i + 1) / fs.length)).toFixed(3), `turn${i + 1}`, turnPoses[i]]));
const reach = clone(turnPoses[fs.length - 1]); reach.root.pos[1] = r1(reach.root.pos[1] + 0.0); // hold: tiny reach of the top arm
half.push([+((T3 + T4) / 2).toFixed(3), 'hold', (() => { const q = clone(reach); q.ch.sc_l = { protract: 2, elevate: 4 }; return q; })()]);
half.push([T4, `turn${fs.length}`, null]);
for (let i = fs.length - 2; i >= 0; i--) half.push([+(T4 + (T5 - T4 - 0.08) * ease((fs.length - 1 - i) / fs.length)).toFixed(3), `turn${i + 1}`, null]);
half.push([T5, 'top', null]);
// Mirror a pose to the other side
const SW = (k) => (k.endsWith('_r') ? k.slice(0, -2) + '_l' : k.endsWith('_l') ? k.slice(0, -2) + '_r' : k);
function mirror(p) {
  const q = { root: { pos: [p.root.pos[0], p.root.pos[1], r1(-p.root.pos[2])], rot: Object.assign({}, p.root.rot) }, ch: {}, ik: {} };
  if (q.root.rot.yaw != null) q.root.rot.yaw = r1(-q.root.rot.yaw); if (q.root.rot.roll != null) q.root.rot.roll = r1(-q.root.rot.roll);
  for (const [j, c] of Object.entries(p.ch)) { const m = Object.assign({}, c); if (!/_[rl]$/.test(j)) { if (m.rot != null) m.rot = r1(-m.rot); if (m.latFlex != null) m.latFlex = r1(-m.latFlex); } q.ch[SW(j)] = m; }
  for (const [id, k] of Object.entries(p.ik || {})) q.ik[SW(id)] = Object.assign({}, k, { target: [k.target[0], k.target[1], r1(-k.target[2])] });
  return q;
}
for (const p of [top, ...Object.values(rp.poses), fkTop]) p.root.rot = Object.assign({ yaw: 0, roll: 0 }, p.root.rot); // every key states yaw and roll
const poses = { top }, keyframes = [{ t: 0, pose: 'top' }, { t: T0, pose: 'top' }];
for (const [t, n, p] of half) { if (p && !poses[n]) poses[n] = p; keyframes.push({ t, pose: n }); }
for (const [t, n] of half) { const m = n === 'top' ? 'top' : `${n}M`; if (!poses[m]) poses[m] = mirror(poses[n]); keyframes.push({ t: +(t + HALF).toFixed(3), pose: m }); }
keyframes[keyframes.length - 1].t = D;

const ex = H.module_(meta, F.contacts, poses, keyframes);
// Whole-loop report: planted hands (weight-1 frames), floor, support foot contact drift, mesh reach of the support arm
let footDrift = 0, reachMax = 0, footMinY = 1e9, stackGap = [1e9, -1e9];
const tl = R.buildTimeline(ex);
let slide = 0, floor = 1e9, floorAt = null;
for (let i = 0; i <= 2000; i++) {
  const t = (i / 2000) * D, pz = tl.pose(t), W = R.evalPose(rig, pz, F.contacts);
  for (const s of ['r', 'l']) { const k = pz.ik[`arm_${s}`]; if ((k.weight ?? 1) >= 0.999) { slide = Math.max(slide, B.dist(W[`wrist_${s}`].p, k.target)); reachMax = Math.max(reachMax, B.meshReach(W, s, k.target)); } }
  const f = L.shapeMinY(W); if (f.y < floor) { floor = f.y; floorAt = [f.id, +t.toFixed(2)]; }
  if (t > T2 && t < T5) { const lp = B.lowPoint(R.shapeWorld(W, B.shapeOf('foot_r'))); footMinY = Math.min(footMinY, lp[1]); footDrift = Math.max(footDrift, Math.hypot(lp[0] - ballR[0], lp[2] - ballR[2])); }
  if (t > T3 && t < T4) { const gl = B.lowPoint(R.shapeWorld(W, B.shapeOf('foot_l'))), gr = R.shapeWorld(W, B.shapeOf('foot_r')); stackGap = [Math.min(stackGap[0], gl[1] - (gr.c[1] + Math.hypot(gr.axes[0][1], gr.axes[1][1], gr.axes[2][1]))), Math.max(stackGap[1], gl[1])]; }
}
const Ws = L.fk(poses[`turn${fs.length}`], F.contacts), st = F.stats(top), sb = F.stats(rp.poses.bottom);
const shoulderLine = (W) => Math.asin(V.norm(V.sub(W.shoulder_l.p, W.shoulder_r.p))[1]) / R.DEG;
const armVert = V.angle(V.sub(Ws.shoulder_r.p, Ws.wrist_r.p), [0, 1, 0]), armUp = V.angle(V.sub(Ws.wrist_l.p, Ws.shoulder_l.p), [0, 1, 0]);
const hipLine = (W) => { const a = V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5), h = V.scale(V.add(W.hip_r.p, W.hip_l.p), 0.5), k = V.scale(V.add(W.ankle_r.p, W.ankle_l.p), 0.5); return 180 - V.angle(V.sub(a, h), V.sub(k, h)); };
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(st.drawnElbow)} at the top on the drawn arm`); set('Elbow flexion', 'peak', `${d(sb.elbow)} at the bottom (chest ${BOT_CHEST} cm above the floor)`);
set('Trunk rotation', 'setup', 'Facing the floor'); set('Trunk rotation', 'peak', `Shoulder line ${d(shoulderLine(Ws))} from horizontal in the side plank (shoulders and hips turn together)`);
set('Support arm', 'setup', `Wrists ${2 * HAND_Z} cm apart under the shoulders`); set('Support arm', 'peak', `Support arm ${d(armVert)} from vertical, hand planted throughout`);
set('Free arm', 'setup', 'Planted'); set('Free arm', 'peak', `${d(armUp)} from vertical, reaching to the ceiling`);
set('Hip height', 'setup', `Body line bend ${hipLine(Wtop).toFixed(1)}°`); set('Hip height', 'peak', `Shoulder-hip-ankle bend ${hipLine(Ws).toFixed(1)}° in the side plank; feet together, the top foot resting against the bottom one`);
set('Tempo', 'setup', `Top ${T0} s`); set('Tempo', 'peak', `Push-up ${r1(T1 - T0)} s down, ${r1(T2 - T1)} s up; turn ${r1(T3 - T2)} s, hold ${r1(T4 - T3)} s, back ${r1(T5 - T4)} s; then the other side`);
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: 120 };
const tfs = Object.values(poses).map((p) => { const W = L.fk(p, F.contacts); return V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]); });
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(Math.min(...tfs) - 2), max: Math.ceil(Math.max(...tfs) + 2) };
console.log(`Push-up to Side Plank: wrote ${L.write(ex)} PHI ${PHI}\n  top elbow ${st.elbow.toFixed(0)} drawn ${st.drawnElbow.toFixed(0)}; bottom elbow ${sb.elbow.toFixed(0)}\n  side plank: shoulder line ${shoulderLine(Ws).toFixed(0)} support arm ${armVert.toFixed(0)} free arm ${armUp.toFixed(0)} body bend ${hipLine(Ws).toFixed(1)} root ${JSON.stringify(poses[`turn${fs.length}`].root)}\n  loop: slide ${slide.toFixed(3)} floor ${floor.toFixed(2)} ${floorAt} supportFoot drift ${footDrift.toFixed(2)} minY ${footMinY.toFixed(2)} stack gap ${stackGap.map((v) => v.toFixed(1))} meshReach max ${reachMax.toFixed(1)}`);
if (slide > 0.05) { console.error('FAIL: planted hand slides'); process.exitCode = 1; }
if (floor < -0.5) { console.error('FAIL: below the floor'); process.exitCode = 1; }
