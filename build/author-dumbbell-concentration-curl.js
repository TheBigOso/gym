// Dumbbell Concentration Curl (GymVisual #029712): seated on the end of a flat bench, feet wide and flat, trunk leaning
// forward from the hips. The back of the right upper arm, just above the elbow, is braced against the inside of the right
// thigh; the left hand rests on the left thigh. The right forearm curls the dumbbell up toward the right shoulder, short
// squeeze, slow lower to a straight arm. authoredSide 'right' (the player mirrors for the left arm).
const L = require('./lib');
const { V, Q, R, r1, clone } = L;
const C = require('./families/b3-curls');
const D = require('./families/dumbbell');
const meta = require('./meta/dumbbell-concentration-curl.json');

const SEAT_H = 45, BENCH = { id: 'bench', kind: 'bench', center: [-40, 0, 0], size: [110, SEAT_H, 30] }; // flat bench, the athlete on its +X end
const SEAT_END = BENCH.center[0] + BENCH.size[0] / 2;
const SEAT_OFF = +(process.env.SEAT_OFF ?? 0); // rig buttock shapes vs the seat top (rig v2: rig = drawn body, so they rest on it)
const ENV = (k, d) => +(process.env[k] ?? d);
const LEAN = { l5: ENV('L5', 10), t12: ENV('T12', 10), t6: ENV('T6', 6) };
const STANCE = ENV('STANCE', 38), FOOT_DX = ENV('FOOTDX', 30), HIP_ABD = ENV('HABD', 24);
const ELB_T = ENV('ELBT', 0.78), ELB_SQ = ENV('ELBSQ', 1.0); // elbow contact: fraction along the right thigh, and how far it presses in (cm)

const st = L.POSES.standing({ stance: STANCE, toeOut: 20 });
const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: [Math.cos(20 * R.DEG), 0, (s === 'r' ? 1 : -1) * Math.sin(28 * R.DEG)].map((v) => +v.toFixed(4)), handRot: L.footRot(s === 'r' ? -20 : 20).map((v) => +v.toFixed(6)) }));
let p = clone(st.pose); delete p.ik;
Object.assign(p.ch, { spine_l5: { rot: 0, flex: LEAN.l5, latFlex: 0 }, spine_t12: { rot: 0, flex: LEAN.t12, latFlex: 0 }, spine_t6: { rot: 0, flex: LEAN.t6, latFlex: 0 },
  hip_r: { flex: 95, abd: HIP_ABD, rot: -10 }, hip_l: { flex: 95, abd: HIP_ABD, rot: -10 }, knee_r: { flex: 95 }, knee_l: { flex: 95 }, sc_r: { protract: 8, elevate: -2 }, sc_l: { protract: 4, elevate: 0 } });
p.root.pos = [SEAT_END - 12, 52, 0]; p.root.rot = { pitch: -18 };
p.ik = { leg_r: { target: [r1(p.root.pos[0] + FOOT_DX), L.ANKLE_H, STANCE], weight: 1 }, leg_l: { target: [r1(p.root.pos[0] + FOOT_DX), L.ANKLE_H, -STANCE], weight: 1 } };
const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => C.shapePlaneDist(W, id, [0, SEAT_H, 0], [0, 1, 0])));
// the thigh axis point and its inner-side direction (toward the body midline, perpendicular to the thigh) at fraction t
function thighInner(W, s, t) {
  const a = W[`hip_${s}`].p, b = W[`knee_${s}`].p, ax = V.norm(V.sub(b, a)), c = V.add(a, V.scale(V.sub(b, a), t));
  let m = [0, 0, s === 'r' ? -1 : 1]; m = V.norm(V.sub(m, V.scale(ax, V.dot(m, ax))));
  return { c, m, r: 8.7 + (5.4 - 8.7) * t };
}
// right arm: elbow braced on the inner thigh (upper arm surface touching the thigh surface), forearm hanging
const ARM = (x) => ({ plane: x[0], elev: x[1], axial: x[2] - x[0], flex: x[3], pron: x[4] });
function solveTrunkAndArm(p) {
  const paths = ['root.pos.1', 'root.rot.pitch', 'ch.shoulder_r.plane', 'ch.shoulder_r.elev'];
  p = clone(p); C.setArm(p, 'r', ARM([60, 20, 0, 10, 10]));
  const obj = [
    (W) => [(seatY(W) - SEAT_OFF) * 4],
    (W) => { const ti = thighInner(W, 'r', ELB_T), tgt = V.add(V.add(ti.c, V.scale(ti.m, ti.r + 3.6 - ELB_SQ)), [0, 2, 0]); return V.sub(W.elbow_r.p, tgt).map((v) => v * 3); },
  ];
  const sol = L.solvePose(p, paths, obj, { iters: 400, contacts });
  sol.res = obj.map((f) => f(L.fk(sol.pose, contacts)).map((v) => +v.toFixed(2)));
  return sol;
}
const s0 = solveTrunkAndArm(p); p = s0.pose;
let W = L.fk(p, contacts);
// left hand resting on top of the left thigh, palm down, fingers along the thigh toward the knee
function leftHand(p) {
  const W0 = L.fk(p, contacts), a = W0.hip_l.p, b = W0.knee_l.p, ax = V.norm(V.sub(b, a));
  let up = V.norm(V.sub([0, 1, 0], V.scale(ax, ax[1])));
  const t = ENV('LHT', 0.85), tgt = V.add(V.add(a, V.scale(V.sub(b, a), t)), V.scale(up, 8.7 + (5.4 - 8.7) * t + 2.6));
  const q = clone(p); C.setArm(q, 'l', { plane: 30, elev: 35, axial: 0, flex: 90, pron: 120, wflex: 0 });
  const paths = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron', 'ch.wrist_l.flex', 'ch.wrist_l.dev'];
  const obj = [(W) => V.sub(W.wrist_l.p, tgt).map((v) => v * 3), (W) => V.sub(C.palmDir(W, 'l'), V.scale(up, -1)).map((v) => v * 8),
    (W) => V.sub(V.norm(L.Q.rot(W.wrist_l.q, [0, -1, 0])), ax).map((v) => v * 4), (W) => [(W.elbow_l.p[2] + ENV('LEZ', 32)) * 0.5, (W.elbow_l.p[0] - W.shoulder_l.p[0] + 4) * 0.3], (W, q) => [(q.ch.wrist_l.flex) * 0.05, (q.ch.wrist_l.dev) * 0.05, (q.ch.shoulder_l.axial) * 0.01, Math.min(0, q.ch.shoulder_l.elev - 8) * 3, Math.min(0, q.ch.shoulder_l.plane + 55) * 3, Math.max(0, q.ch.wrist_l.flex - 70) * 3, Math.min(0, q.ch.wrist_l.flex + 85) * 3, Math.max(0, Math.abs(q.ch.wrist_l.dev) - 18) * 3]];
  const sol = L.solvePose(q, paths, obj, { iters: 400, contacts });
  return { pose: sol.pose, cost: sol.cost, tgt };
}
const LH = leftHand(p); p = LH.pose; W = L.fk(p, contacts);
if (process.env.DEBUG) console.log('LH', LH.cost.toFixed(3), JSON.stringify({ sh: p.ch.shoulder_l, el: p.ch.elbow_l, wr: p.ch.wrist_l }), 'trunk solve', s0.cost.toFixed(3), JSON.stringify(s0.res), 'root', JSON.stringify(p.root), 'shR', JSON.stringify(p.ch.shoulder_r), 'knee', W.knee_r.p.map(r1), 'elbow', W.elbow_r.p.map(r1), 'shoulder', W.shoulder_r.p.map(r1), 'elbowL', W.elbow_l.p.map(r1));

const TW = ENV('TW', 5), sh = p.ch.shoulder_r;
const rArm = (a) => ({ plane: sh.plane, elev: sh.elev, axial: TW - sh.plane, flex: a.flex, pron: a.pron });
const BOT = { flex: ENV('BFLEX', 10), pron: ENV('BPRON', 20) }, TOP = { flex: 124, pron: 0 }, SQZ = { flex: 127, pron: -3 };
const withArm = (a) => C.setArm(clone(p), 'r', rArm(a));
// the trunk lean already tips the face down toward the arm; the neck is held slightly extended (eyes on the arm, chin up) so
// the jaw clears the dumbbell at the top (the v2 rig's shorter upper arm brings the top of the curl closer to the face)
p.ch.neck_c7 = { rot: 0, flex: ENV('NECK', -17) }; p.ch.head_c1 = { rot: 0, flex: ENV('HEAD', -8) };
const poses = { bottom: withArm(BOT), up50: withArm(C.mixArm(BOT, TOP, 0.5)), top: withArm(TOP), squeeze: withArm(SQZ), down66: withArm(C.mixArm(BOT, TOP, 0.66)), down33: withArm(C.mixArm(BOT, TOP, 0.33)) };
const ph = (id) => C.phase(meta, id);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph('lift').start, pose: 'bottom' }, { t: 1.2, pose: 'up50' }, { t: ph('top').start, pose: 'top' }, { t: ph('top').end, pose: 'squeeze' },
  { t: 3.1, pose: 'down66' }, { t: 3.9, pose: 'down33' }, { t: ph('lower').end, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];
const props = [BENCH, ...C.dumbbells(['r'])];
const ex = C.assemble(meta, { contacts, poses, keyframes, props });
const rep = C.loopCheck(ex, { sides: ['r'], benchBox: { center: BENCH.center, size: BENCH.size } });
// brace: gap between the upper-arm surface (at the elbow) and the inner right-thigh surface (rig shapes)
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.squeeze, contacts);
const ti = thighInner(Wb, 'r', ELB_T), brace = +(V.len(V.sub(Wb.elbow_r.p, ti.c)) - ti.r - 3.6).toFixed(1);
C.fillCurlKin(ex, Wb, Wt, poses.bottom, poses.squeeze, 'r', ['Arm straight 0.6 s', '1.2 s up, 0.5 s squeeze, 2.4 s down, 1.3 s at the bottom']);
// the upper arm is braced on the thigh, so report it from the vertical as well as the trunk line
const uaV = (W) => Math.round(V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]));
const trunk = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
C.setKin(ex, 'Upper arm', 'setup', `≈${uaV(Wb)}° from vertical (hanging, braced on the inner thigh); ≈${Math.round(C.upperArmFromTrunk(Wb, 'r'))}° from the trunk line`);
C.setKin(ex, 'Upper arm', 'peak', `≈${uaV(Wt)}° from vertical (does not move)`);
C.setKin(ex, 'Trunk lean', 'setup', `≈${Math.round(trunk)}° forward from vertical`); C.setKin(ex, 'Trunk lean', 'peak', 'Unchanged');
console.log(`Dumbbell Concentration Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { brace, seat: +seatY(Wb).toFixed(2), trunk: +trunk.toFixed(1), leftHandErr: +V.len(V.sub(Wb.wrist_l.p, LH.tgt)).toFixed(2) }))}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (rep.body.d < 0 || rep.dbFloor < 0 || rep.bench < 0) { console.error('FAIL: dumbbell passes into the body, the bench or the floor'); process.exitCode = 1; }
module.exports = { ex, p, contacts };
