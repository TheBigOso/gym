// Single Arm Dumbbell Curl over Incline Bench (GymVisual #042212): the back pad of an adjustable bench is set steep
// (65 degrees). Standing behind the pad, feet planted, the athlete leans in so the right armpit rests on the top edge and the
// back of the right upper arm lies along the pad's front face, which slopes down away from him (a preacher pad). The left
// hand holds the top edge. The right forearm curls about the elbow hinge from nearly straight along the pad up toward the
// shoulder, short squeeze, slow lower to just short of straight. authoredSide 'right' (the player mirrors for the left arm).
const L = require('./lib');
const { V, Q, R, r1, clone } = L;
const C = require('./families/b3-curls');
const B3 = require('./families/b3-back');
const P = require('./families/prone');
const K = require('./families/b4-curls2');
const D = require('./families/dumbbell');
const meta = require('./meta/single-arm-dumbbell-curl-over-incline.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANG = ENV('ANG', 65), PAD = 80, BW = 28;
const bench = D.bench({ x: 20, z: 0, seat: 40, height: 45, width: BW, angle: ANG, back: PAD });  // pad rises toward -X
const boxes = B3.benchBoxes(bench);
const u = bench.padDir, n = V.norm([u[1], -u[0], 0]);   // u: hinge -> tip; n: front-face normal (+X and up)
const tip = bench.tip;
// Upper arm over the pad: the armpit hooks over the top edge, so the shoulder joint sits BEYOND cm past the edge (along the
// pad) and ARM_OFF cm off the front-face plane; the elbow rests on the face (its joint ELB_OFF cm off it) further down. The
// upper arm passes over the edge and lies on the face. Offsets on the rig shapes (rig v2 matches the mesh): the elbow joint sits
// one upper-arm radius (4 cm) off the face, and the shoulder 5 cm behind the face plane so the ribcage clears the pad's back.
const ARM_OFF = ENV('ARM_OFF', -5), BEYOND = ENV('BEYOND', 15), ELB_OFF = ENV('ELB_OFF', 4);
const S = V.add(V.add(tip, V.scale(n, ARM_OFF)), V.scale(u, BEYOND));
const UA = V.len(L.rig.byId.elbow_r.offset), sAlong = Math.sqrt(UA * UA - (ARM_OFF - ELB_OFF) ** 2) - BEYOND;
const E = V.add(V.sub(tip, V.scale(u, sAlong)), V.scale(n, ELB_OFF));
// Body: feet flat on the floor behind the pad, left of the pad so the right shoulder is over its centre line; trunk leaning
// in. Solve the root, lean, turn, hips and knees so the right shoulder joint lands on S with both ankles at floor height and
// the shins near vertical; then plant the feet where the ankles are (constant leg IK targets).
const STANCE = ENV('STANCE', 12), ZOFF = ENV('ZOFF', -17);
const st = L.POSES.standing({ stance: STANCE, toeOut: 8 });
const contacts = st.contacts;
let p = clone(st.pose); delete p.ik;
p.root.pos = [S[0] - 25, 90, ZOFF]; p.root.rot = { pitch: -30, yaw: ENV('YAW', -8), roll: 0 };
Object.assign(p.ch, { spine_l5: { rot: 0, flex: 4, latFlex: 0 }, spine_t12: { rot: 0, flex: 6, latFlex: 0 }, spine_t6: { rot: 0, flex: 4, latFlex: 0 }, sc_r: { protract: 6, elevate: 6 }, sc_l: { protract: 4, elevate: 0 },
  hip_r: { flex: 30, abd: 0, rot: -6 }, hip_l: { flex: 30, abd: 0, rot: -6 }, knee_r: { flex: 15 }, knee_l: { flex: 15 }, ankle_r: { dorsi: 5 }, ankle_l: { dorsi: 5 }, neck_c7: { rot: ENV('NROT', 0) * 0.4, flex: ENV('NFLEX', -25) }, head_c1: { rot: ENV('NROT', 0) * 0.6, flex: ENV('HFLEX', -8) } });
const KNEE = ENV('KNEE', 25);
const sol = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.pos.2', 'root.rot.pitch', 'root.rot.yaw', 'ch.spine_t12.flex', 'ch.hip_r.flex', 'ch.hip_l.flex', 'ch.knee_r.flex', 'ch.knee_l.flex', 'ch.ankle_r.dorsi', 'ch.ankle_l.dorsi'],
  [L.obj.at('shoulder_r', S, 3), L.obj.atY('ankle_r', L.ANKLE_H, 3), L.obj.atY('ankle_l', L.ANKLE_H, 3), L.obj.reg('root.rot.yaw', ENV('YAW', -8), 0.05), L.obj.reg('ch.spine_t12.flex', 6, 0.05),
   L.obj.reg('ch.knee_r.flex', KNEE, 0.2), L.obj.reg('ch.knee_l.flex', KNEE, 0.2), (W) => [(W.hip_r.p[2] - W.ankle_r.p[2]) * 0, (W.knee_r.p[0] - W.ankle_r.p[0] - 2) * 0.3, (W.knee_l.p[0] - W.ankle_l.p[0] - 2) * 0.3],
   (W) => { const fr = L.R.shapeWorld(W, L.rig.shapes.find((x) => x.id === 'foot_r')), fl = L.R.shapeWorld(W, L.rig.shapes.find((x) => x.id === 'foot_l')); return [(fr.axes[0][1] / L.V.len(fr.axes[0])) * 20, (fl.axes[0][1] / L.V.len(fl.axes[0])) * 20]; }], { iters: 600 });
p = sol.pose;
let W = L.fk(p);
p.ik = { leg_r: { target: [r1(W.ankle_r.p[0]), L.ANKLE_H, r1(W.ankle_r.p[2])], weight: 1 }, leg_l: { target: [r1(W.ankle_l.p[0]), L.ANKLE_H, r1(W.ankle_l.p[2])], weight: 1 } };
p = P.fitLeg(p, 'r', contacts, 'leg_r'); p = P.fitLeg(p, 'l', contacts, 'leg_l'); B3.wrapPose(p);
W = L.fk(p, contacts);
// right arm at the bottom: elbow on the pad line, forearm FLEXB degrees up off the pad direction, supinated (thumb out)
const FLEXB = ENV('FLEXB', 14), FA = 25 + 7.2;
const dir = (th) => V.add(V.scale(u, -Math.cos(th * R.DEG)), V.scale(n, Math.sin(th * R.DEG)));
const axisB = [0, 0, 1];
const p0 = K.handleArm(p, V.add(E, V.scale(dir(FLEXB), FA)), { axis: axisB, elbow: E, elbowW: 2, guesses: [[80, 50, 0, FLEXB, 0], [60, 60, 20, FLEXB, 0], [100, 40, -20, FLEXB, 0]], contacts, minElev: 8 });
// left hand grips the left side edge of the pad below the top (palm toward the pad side, thumb on the front face), clear
// of the right dumbbell's path
const LT = V.add(V.add(tip, [0, 0, -ENV('LZ', 18)]), V.add(V.scale(n, -ENV('LN', 3)), V.scale(u, -ENV('LALONG', 18))));
function leftHand(q) {
  const paths = K.ARM('l');
  const objs = [L.obj.at('wrist_l', LT, 3), (Wx) => V.sub(Q.rot(Wx.wrist_l.q, [1, 0, 0]), [0, 0, 1]).map((v) => v * 2), L.obj.reg('ch.wrist_l.flex', 0, 0.05), L.obj.reg('ch.wrist_l.dev', 0, 0.05), L.obj.reg('ch.shoulder_l.axial', 0, 0.01),
    (Wx, q) => [Math.min(0, q.ch.shoulder_l.elev - 3) * 3, Math.max(0, q.ch.shoulder_l.plane - 138) * 3, q.ch.shoulder_l.elev * 0.01]]; // inside the shoulder limits (elev >= 0, plane <= 140); elbow low by the side
  let best = null;
  for (const g of [[80, 70, 0, 40, 90], [60, 80, 30, 60, 120], [100, 60, -30, 30, 60], [130, 40, 0, 90, 90], [130, 60, 40, 90, 60], [120, 30, -40, 100, 120]]) {
    const q0 = clone(q); q0.ch.shoulder_l = { plane: g[0], elev: g[1], axial: g[2] }; q0.ch.elbow_l = { flex: g[3] }; q0.ch.wrist_l = { pron: g[4], flex: 0, dev: 0 };
    const r = L.solvePose(q0, paths, objs, { contacts, iters: 300 }); if (!best || r.cost < best.cost) best = r;
  }
  return best;
}
const LH = leftHand(p0);
const base = LH.pose; delete base.__cost;
// pure hinge: top target where a forearm at FLEXT deg from straight would put the handle
const FLEXT = ENV('FLEXT', 114);
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const keysR = K.hingeCurl(base, { flexTop: FLEXT, target: V.add(E, V.scale(dir(FLEXT), FA)), axisB, axisT: axisB, FS, contacts, flexB: ENV('FLEXB0', 12) });
const poses = {}, names = [];
keysR.forEach((q, i) => { delete q.__cost; B3.wrapPose(q); if (i) K.unwrapTo(q, poses[names[i - 1]]); poses[`c${i}`] = q; names.push(`c${i}`); });
const top = names[names.length - 1];
poses.squeeze = clone(poses[top]); poses.squeeze.ch.elbow_r.flex = r1(poses.squeeze.ch.elbow_r.flex + 2);
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
const ex = K.assemble(meta, { contacts, poses, keyframes, props: [bench.prop, ...C.dumbbells(['r'])] });
const rep = K.report(ex, { sides: ['r'], boxes, armBoxes: false });
const sw = B3.sweep(ex, { held: [{ side: 'r', grip: 'handle', size: D.DB }], fixed: ['pelvis', 'ankle_r', 'ankle_l', 'wrist_l'], boxes, bodySkip: ['upperarm_r', 'biceps_r', 'triceps_r', 'deltoid_r', 'hand_l', 'thumb_l', 'forearm_l'] }, 400);
// right forearm vs the pad over the loop (it must lift off the face, never sink into it)
let faClear = 1e9; { const tl = L.R.buildTimeline(ex); for (let i = 0; i <= 300; i++) { const Wx = L.R.evalPose(L.rig, tl.pose((i / 300) * meta.timeline.duration), contacts); for (let k = 0; k <= 8; k++) { const t = k / 8, q = V.add(Wx.elbow_r.p, V.scale(V.sub(Wx.wrist_r.p, Wx.elbow_r.p), t)); faClear = Math.min(faClear, B3.boxDist(q, boxes[1]) - (3.9 + (2.5 - 3.9) * t)); } } }
faClear = +faClear.toFixed(1);
const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arm near straight 0.6 s', '1.2 s up, 0.5 s squeeze, 2.4 s down, 1.3 s near straight']);
const ua = V.norm(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p));
C.setKin(ex, 'Upper arm', 'setup', `Along the pad: ≈${Math.round(V.angle(ua, [0, -1, 0]))}° forward of vertical, ≈${Math.round(C.upperArmFromTrunk(Wb, 'r'))}° from the trunk line`);
C.setKin(ex, 'Upper arm', 'peak', 'Unchanged (pure elbow hinge on the pad)');
C.setKin(ex, 'Bench angle', 'setup', `${ANG}° back pad (80 cm), top edge ${r1(tip[1])} cm high`);
C.setKin(ex, 'Bench angle', 'peak', `Trunk leans ≈${Math.round(B3.trunkLean(Wb))}° forward from vertical`);
C.setKin(ex, 'Upper arm on the pad', 'setup', `Shoulder joint ${ARM_OFF} cm off the pad face, ${BEYOND} cm past the top edge`);
C.setKin(ex, 'Upper arm on the pad', 'peak', 'Unchanged');
const tf = B3.trunkLean(Wb);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
const dS = V.len(V.sub(Wb.shoulder_r.p, S)), dE = V.len(V.sub(Wb.elbow_r.p, E)), dL = V.len(V.sub(Wb.wrist_l.p, LT));
console.log(`Single Arm Dumbbell Curl over Incline Bench: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { sw: { dbBox: sw.dbBox, bodyBox: sw.bodyBox, bodyBoxAt: sw.bodyBoxAt, drift: sw.drift, knee: sw.kneeR }, trunk: r1(tf), errS: r1(dS), errE: r1(dE), errL: r1(dL), faClear, solveCost: +sol.cost.toFixed(2), root: p.root, feet: [p.ik.leg_r.target, p.ik.leg_l.target], tip: tip.map(r1) }))}`);
K.fail(rep, 'curl over incline', [[sw.drift < 0.05, 'pelvis, feet or left hand drift'], [sw.dbBox >= 0, 'dumbbell into the bench'], [sw.bodyBox >= -0.5, `body into the bench ${sw.bodyBox} ${sw.bodyBoxAt}`], [dS < 1 && dE < 1.5, 'upper arm not on the pad']]);
