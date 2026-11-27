// Single-Arm Overhead Triceps Extension (GymVisual #615812, Dumbbell Seated Single Arm Overhead Triceps Extension):
// seated tall on the end of a flat bench, feet flat (planted leg contacts), the left hand resting on the left thigh.
// One dumbbell in the right hand overhead, palm facing in (neutral grip, 'handle'). The upper arm stays still beside the
// head, elbow pointing up (constant upper-arm direction; the humeral rotation follows the forearm so the hand stays at
// one width); the elbow bends, lowering the dumbbell behind the head, then straightens. authoredSide 'right'.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const C = require('./families/b3-curls');
const F = require('./families/b4-forearms');
const meta = require('./meta/single-arm-overhead-triceps-extension.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const SEAT_H = 45, SEAT_OFF = ENV('SEAT_OFF', 0);                 // rig buttock shapes vs the seat top (rig v2: rig = drawn body, so they rest on it)
const TOP_FLEX = 6, BOT_FLEX = ENV('BOT_FLEX', 112), ZW = ENV('ZW', 9), UA_FWD = ENV('UA_FWD', -0.1);
const STANCE = 18, FOOT_DX = 42;
const st = L.POSES.standing({ stance: STANCE, toeOut: 10 });
const contacts = st.contacts.map((c) => Object.assign(c, { pole: [1, 0, c.id === 'leg_r' ? 0.25 : -0.25] }));
let base = clone(st.pose); delete base.ik;
Object.assign(base.ch, { hip_r: { flex: 88, abd: 8, rot: -10 }, hip_l: { flex: 88, abd: 8, rot: -10 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, spine_l5: { rot: 0, flex: -4, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 2, latFlex: 0 },
  sc_r: { protract: 0, elevate: 8 }, sc_l: { protract: 2, elevate: 0 }, neck_c7: { rot: 0, flex: 4 }, head_c1: { rot: 0, flex: 2 } });
base.root.pos = [0, SEAT_H + 8, 0]; base.root.rot = { pitch: 2 };
base.ik = { leg_r: { target: [FOOT_DX, L.ANKLE_H, STANCE], weight: 1 }, leg_l: { target: [FOOT_DX, L.ANKLE_H, -STANCE], weight: 1 } };
const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => C.shapePlaneDist(W, id, [0, SEAT_H, 0], [0, 1, 0])));
base = L.solvePose(base, ['root.pos.1', 'root.rot.pitch'], [(W) => [(seatY(W) - SEAT_OFF) * 4], (W) => [(W.neck_c7.p[0] - W.pelvis.p[0] - 2) * 1]], { contacts }).pose;
// left hand resting on the left thigh near the knee, palm down, fingers along the thigh
{
  const W0 = L.fk(base, contacts), tgt = F.thighTop(W0, 'l', 0.8, 2.6 + ENV('LH_LIFT', 3.5)), ax = V.norm(V.sub(W0.knee_l.p, W0.hip_l.p)), up = V.norm(V.sub([0, 1, 0], V.scale(ax, ax[1])));
  C.setArm(base, 'l', { plane: 40, elev: 30, axial: 0, flex: 60, pron: 120 });
  const paths = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron', 'ch.wrist_l.flex', 'ch.wrist_l.dev'];
  const objs = [(W) => V.sub(W.wrist_l.p, tgt).map((v) => v * 3), (W) => V.sub(C.palmDir(W, 'l'), V.scale(up, -1)).map((v) => v * 6), (W) => V.sub(Q.rot(W.wrist_l.q, [0, -1, 0]), ax).map((v) => v * 3),
    (W, q) => [q.ch.wrist_l.flex * 0.05, q.ch.wrist_l.dev * 0.05, q.ch.shoulder_l.axial * 0.01, Math.max(0, q.ch.wrist_l.flex - 70) * 3, Math.min(0, q.ch.wrist_l.flex + 85) * 3, Math.max(0, Math.abs(q.ch.wrist_l.dev) - 18) * 3, Math.min(0, q.ch.shoulder_l.plane + 58) * 3]];
  base = L.solvePose(base, paths, objs, { iters: 500, contacts }).pose;
  base.__lh = +V.len(V.sub(L.fk(base, contacts).wrist_l.p, tgt)).toFixed(2);
}
const lhErr = base.__lh; delete base.__lh;
const Wb = L.fk(base, contacts), S = Wb.shoulder_r.p;
const uaZ = (ZW - S[2]) / L.reach(TOP_FLEX), uaDir = V.norm([UA_FWD, Math.sqrt(1 - UA_FWD ** 2 - uaZ ** 2), uaZ]);
const ua = T.upperArm(base, 'r', uaDir, [-1, 0, 0], [[90, 160, 0], [90, 170, 90], [90, 170, -90], [0, 170, 0]]);
base.ch.shoulder_r = ua.ch;
function armAt(flex) {
  const q = clone(base); q.ch.elbow_r = { flex: r1(flex) };
  const set = (x) => { const p = clone(q); p.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; return p; };
  const res = (x) => { const W = L.fk(set(x), contacts); return [...V.sub(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)), uaDir).map((v) => v * 40), (W.wrist_r.p[2] - ZW) * 2, Math.max(0, W.wrist_r.p[0] - W.elbow_r.p[0]) * 2]; };
  const x = R.solveLM([ua.ch.plane, ua.ch.elev, ua.ch.axial], res, { iters: 400 }).x.map(r1);
  const p = set(x), W = L.fk(p, contacts), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p));
  const w = T.wristTo(p, 'r', fa, V.norm(V.sub([0, 0, -1], V.scale(fa, V.dot([0, 0, -1], fa)))));
  p.ch.wrist_r = { pron: w.pron, flex: w.flex, dev: w.dev };
  return p;
}
const fl = (u) => TOP_FLEX + (BOT_FLEX - TOP_FLEX) * u;
const poses = { top: armAt(TOP_FLEX), d1: armAt(fl(0.25)), d2: armAt(fl(0.5)), d3: armAt(fl(0.75)), bottom: armAt(BOT_FLEX), bottomHold: armAt(BOT_FLEX - 1.5), u1: armAt(fl(0.75)), u2: armAt(fl(0.5)), u3: armAt(fl(0.25)) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 1.3, pose: 'd1' }, { t: 1.8, pose: 'd2' }, { t: 2.3, pose: 'd3' }, { t: 2.9, pose: 'bottom' }, { t: 3.05, pose: 'bottomHold' }, { t: 3.2, pose: 'bottom' }, { t: 3.55, pose: 'u1' }, { t: 3.9, pose: 'u2' }, { t: 4.25, pose: 'u3' }, { t: 4.6, pose: 'top' }, { t: 5.2, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const bench = F.benchUnder(Wb, { seatH: SEAT_H, front: 14 });
ex.props = [bench, ...ex.props];
const HEAD = /^(head|hair|ear_[rl]|jaw|nose|neck|brow_[rl]|eye_[rl])$/, BACK = /^(chest|ribcage|traps_[rl]|lats_[rl])$/;
const pr = { head: 1e9, back: 1e9, body: 1e9, uaDev: 0 };
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => {
  const h = T.dumbbellBody(W, 'r', 'handle', HEAD); if (h.d < pr.head) { pr.head = h.d; pr.headId = h.id; pr.headAt = +t.toFixed(2); }
  const b = T.dumbbellBody(W, 'r', 'handle', BACK); if (b.d < pr.back) { pr.back = b.d; pr.backId = b.id; }
  pr.uaDev = Math.max(pr.uaDev, V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), uaDir));
} });
const Wt = L.fk(poses.top, contacts), Wbt = L.fk(poses.bottom, contacts);
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wbt, 'r'))} at the bottom`);
set('Shoulder elevation (upper arm)', 'setup', `${d(elevOf(Wt))} from the trunk line, elbow ${Math.round(Math.abs(Wt.elbow_r.p[2]))} cm from the midline`); set('Shoulder elevation (upper arm)', 'peak', `Unchanged (upper arm drifts at most ${pr.uaDev.toFixed(1)}° over the loop)`);
set('Dumbbell clearance', 'setup', 'Dumbbell overhead'); set('Dumbbell clearance', 'peak', `${r1(pr.head)} cm behind the head at the closest, ${r1(pr.back)} cm above the upper back (rig shapes)`);
set('Trunk', 'setup', `Seated upright (${d(V.angle(V.sub(Wt.neck_c7.p, Wt.pelvis.p), [0, 1, 0]))} from vertical), seat ${SEAT_H} cm, left hand on the left thigh`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Top 0.6 s'); set('Tempo', 'peak', '2.3 s down, 0.3 s pause, 1.4 s up, 0.6 s at the top');
console.log(`Single-Arm Overhead Triceps Extension: wrote ${L.write(ex)}\n  root ${JSON.stringify(base.root)} seat ${r1(seatY(Wt))} lhErr ${lhErr} shoulder ${JSON.stringify(ua.ch)} elbow ${r1(T.elbowOf(Wt, 'r'))}..${r1(T.elbowOf(Wbt, 'r'))} elev ${r1(elevOf(Wt))}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(pr)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (pr.head < 0.5 || pr.back < 0) { console.error('FAIL: dumbbell clearance'); process.exitCode = 1; }
