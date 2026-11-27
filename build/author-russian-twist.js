// Russian Twist (GymVisual #068712), bodyweight version. Bilateral: seated, knees bent, heels/feet on the floor (planted
// contacts), trunk leaned back about 45 degrees with a long spine, hands together in front of the chest. The trunk turns
// side to side through the spine channels (mostly thoracic); the hands travel with the chest toward the floor beside each
// hip. The pelvis stays on the mat; two full turns each way per loop.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const C = require('./families/core-b');
const meta = require('./meta/russian-twist.json');

const LEAN = 45, KNEE = 95;
const sitBottom = (W) => Math.min(C.bottomOf(W, 'pelvis'), C.bottomOf(W, 'buttock_r'), C.bottomOf(W, 'buttock_l'));

/* ---------------- 1) Seated lean: pelvis rolled back, long spine, trunk 45 degrees from vertical ---------------- */
let base = C.lie({ kneeFlex: 90, spine: { l5: 2, t12: 2, t6: 4 }, pitch: 93 });
Object.assign(base.ch, { spine_l5: { rot: 0, latFlex: 0, flex: 10 }, spine_t12: { rot: 0, latFlex: 0, flex: 6 }, spine_t6: { rot: 0, latFlex: 0, flex: 2 } });
C.neck(base, 6);
const setPitch = (p, P) => { p.root.rot = { pitch: r1(P) }; return p; };
{ let lo = 0, hi = 90; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, a = C.trunkFromVertical(L.fk(setPitch(clone(base), m))); if (a < LEAN) lo = m; else hi = m; } setPitch(base, (lo + hi) / 2); }
for (const s of ['r', 'l']) { base.ch[`hip_${s}`] = { flex: 100, abd: 0, rot: 0 }; base.ch[`knee_${s}`] = { flex: KNEE }; base.ch[`ankle_${s}`] = { dorsi: -20 }; }
base.root.pos[1] = r1(base.root.pos[1] - sitBottom(L.fk(base)) + 0.2);

/* ---------------- 2) Feet planted: ankle on the floor so the knee sits at ~95 degrees ---------------- */
const TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
const W0 = L.fk(base), HIP = W0.hip_r.p;
const hipToAnkle = Math.sqrt(TH * TH + SH * SH - 2 * TH * SH * Math.cos((180 - KNEE) * R.DEG));
const ankleX = r1(HIP[0] + Math.sqrt(hipToAnkle ** 2 - (HIP[1] - L.ANKLE_H) ** 2));
const T = { r: [ankleX, L.ANKLE_H, r1(HIP[2] - 1)], l: [ankleX, L.ANKLE_H, -r1(HIP[2] - 1)] };
const contacts = ['r', 'l'].map((sd) => Object.assign(L.legContact(sd), { pole: [0.2, 1, sd === 'r' ? 0.06 : -0.06] }));
function fitLeg(pose, s) {
  const c = contacts.find((x) => x.id === `leg_${s}`), q = clone(pose); q.ik = { [c.id]: { target: T[s], weight: 1 } };
  const Wi = R.evalPose(rig, q, [c]);
  return L.solvePose(pose, [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`],
    [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2), L.obj.reg(`ch.hip_${s}.abd`, 0, 0.05), L.obj.reg(`ch.hip_${s}.rot`, 0, 0.05)], { iters: 300 }).pose;
}
base = fitLeg(fitLeg(base, 'r'), 'l');
base.ik = { leg_r: { target: T.r, weight: 1 }, leg_l: { target: T.l, weight: 1 } };
base.ch.sc_r = { protract: 8, elevate: 2 }; base.ch.sc_l = { protract: 8, elevate: 2 };

/* ---------------- 3) Hands together in front of the chest ---------------- */
// Hand target in the upper-back (T6) frame: forward of the sternum, rotated `extra` degrees further about the trunk axis and
// dropped `drop` cm (toward the hip) at the end of each turn.
function hands(pose, extra = 0, drop = 0, guess) {
  let p = clone(pose);
  const W = L.fk(p), fr = W.spine_t6.q, org = W.spine_t6.p;
  const local = (z) => { const a = extra * R.DEG, v = [44 * Math.cos(a), -6 - drop * 0.7, 44 * Math.sin(a) + z]; return V.add(org, Q.rot(fr, v)); };
  for (const s of ['r', 'l']) {
    const tgt = local(s === 'r' ? 2.5 : -2.5);
    const paths = [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`];
    if (guess) for (const c of ['plane', 'elev', 'axial']) p.ch[`shoulder_${s}`][c] = guess[s].shoulder[c];
    else { p.ch[`shoulder_${s}`] = { plane: 95, elev: 60, axial: 20 }; p.ch[`elbow_${s}`] = { flex: 70 }; }
    p.ch[`wrist_${s}`] = { pron: 0, flex: 0, dev: 0 };
    p = L.solvePose(p, paths, [(Wx) => V.sub(V.add(Wx[`wrist_${s}`].p, Q.rot(Wx[`wrist_${s}`].q, [0, -5, 0])), tgt).map((v) => v * 3),
      // elbows soft and down, not flared
      (Wx) => [(Wx[`elbow_${s}`].p[1] - Wx[`wrist_${s}`].p[1] + 2) * 0.3], L.obj.reg(`ch.elbow_${s}.flex`, 50, 0.005), L.obj.reg(`ch.shoulder_${s}.axial`, 20, 0.02), C.limitPen(paths)], { iters: 300 }).pose;
  }
  return p;
}
const center = hands(base);
const ARM = { r: C.armOf(center, 'r'), l: C.armOf(center, 'l') };
const SPLIT = { spine_l5: 0.1, spine_t12: 0.45, spine_t6: 0.45 };
// Turn: theta (+ right), extra hand travel, drop, neck rotation share, small pelvis yaw, lateral flexion toward the turn.
function turn(theta, k = {}) {
  const p = clone(center);
  for (const j of Object.keys(SPLIT)) p.ch[j] = Object.assign({}, p.ch[j], { rot: r1(theta * SPLIT[j]), latFlex: r1((k.lat || 0) * (j === 'spine_l5' ? 0.2 : 0.4)) });
  C.neck(p, 6, theta * 0.45);
  return hands(p, k.extra || 0, k.drop || 0, ARM);
}
const poses = { center, R: turn(44, { extra: 20, drop: 20, lat: 6 }), Rhold: turn(46, { extra: 22, drop: 22, lat: 6.5 }) };
poses.L = C.mirror(poses.R); poses.Lhold = C.mirror(poses.Rhold);
const keyframes = [{ t: 0, pose: 'center' }, { t: 0.8, pose: 'center' }, { t: 1.7, pose: 'R' }, { t: 1.95, pose: 'Rhold' }, { t: 3.05, pose: 'L' }, { t: 3.3, pose: 'Lhold' },
  { t: 4.4, pose: 'R' }, { t: 4.65, pose: 'Rhold' }, { t: 5.75, pose: 'L' }, { t: 6.0, pose: 'Lhold' }, { t: 6.9, pose: 'center' }, { t: 7.6, pose: 'center' }];
const ex = C.moduleOf(meta, poses, keyframes, contacts);

const rep = C.scan(ex, { still: ['pelvis'] });
const Wc = L.fk(center, contacts), Wr = L.fk(poses.Rhold, contacts), rh = poses.Rhold.ch;
const rotSum = rh.spine_l5.rot + rh.spine_t12.rot + rh.spine_t6.rot;
const handY = (W) => Math.min(W.wrist_r.p[1], W.wrist_l.p[1]);
Object.assign(rep, { pitch: center.root.rot.pitch, lean: r1(C.trunkFromVertical(Wc)), hip: center.ch.hip_r.flex, knee: r1(C.kneeOf(Wc, 'r')), feet: T.r, sit: r1(sitBottom(Wc)),
  arm: center.ch.shoulder_r, elbow: center.ch.elbow_r.flex, handsGap: r1(V.len(V.sub(Wc.wrist_r.p, Wc.wrist_l.p))), turn: { rot: r1(rotSum), l5: rh.spine_l5.rot, handY: r1(handY(Wr)), handZ: r1(Wr.wrist_r.p[2]), hipZ: r1(Wr.hip_r.p[2]) } });
C.setKin(ex, 'Trunk lean', `${C.deg(C.trunkFromVertical(Wc))} back from vertical (pelvis to C7)`, 'Held through the turns');
C.setKin(ex, 'Trunk rotation', 'Facing the knees', `${C.deg(rotSum)} each way (lumbar ${C.deg(rh.spine_l5.rot)}, thoracic ${C.deg(rh.spine_t12.rot + rh.spine_t6.rot)}), head turns with the hands`);
C.setKin(ex, 'Knees and hips', `Knees ${C.deg(C.kneeOf(Wc, 'r'))}, hips ${C.deg(center.ch.hip_r.flex)}, feet flat (heels down)`, 'Feet and pelvis do not move');
C.setKin(ex, 'Hands', `Together ${Math.round(V.len(V.sub(V.scale(V.add(Wc.wrist_r.p, Wc.wrist_l.p), 0.5), Wc.spine_t6.p)))} cm in front of the upper chest, elbows ${C.deg(center.ch.elbow_r.flex)}`, `Beside the hip, ${Math.round(handY(Wr))} cm above the floor`);
C.setKin(ex, 'Tempo', 'Sit 0.8 s', 'About 1.35 s per side with a short pause, 4 turns per 7.6 s loop');
C.finish(ex, rep, 'Russian Twist');
