// Dumbbell Seated External Rotation (GymVisual #15725; page not read, movement from the name): elbow-on-knee external
// rotation. Authored on the right: sitting astride a flat bench (along its length), the left foot flat on the floor
// beside it, the right foot planted on the bench in front so the right knee is raised; trunk leaning a little forward.
// The right elbow rests on top of the raised knee, bent 90 degrees, upper arm forward and out. The forearm starts
// pointing forward and a little down (palm down) and turns up about the upper arm (humeral external rotation only, so the
// elbow stays on the knee) until it points up (palm forward); slow lowering. The left hand rests on the left thigh.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const DBF = require('./families/dumbbell');
const T = require('./families/b3-triceps');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-seated-external-rotation.json');
const ID = meta.exercise.id;

const SZ = [meta.props[0].size[0], meta.props[0].size[1]];
const SEAT = 45, PHI0 = +(process.env.PHI0 || -25), PHI1 = +(process.env.PHI1 || 85), PAD = +(process.env.PAD || 9.5);
const FOOT_R = [+(process.env.FRX || 56), SEAT + L.ANKLE_H, +(process.env.FRZ || 9)], FOOT_L = [+(process.env.FLX || 22), L.ANKLE_H, -30];
const s0 = K.seatedFlat({ seatH: SEAT, stance: 16, lean: 0, hipFlex: 88 });
const contacts = [H.legC('r', { pole: [1, 0.3, 0.25] }), H.legC('l', { pole: [1, 0, -0.3], rot: L.footRot(12) })];
let p = clone(s0.pose);
const hipX = L.fk(p).hip_r.p[0];
const FT = { r: [r1(hipX + FOOT_R[0]), FOOT_R[1], FOOT_R[2]], l: [r1(hipX + FOOT_L[0]), FOOT_L[1], FOOT_L[2]] };
function legs(q) {
  q.ik = { leg_r: { target: FT.r, weight: 1 }, leg_l: { target: FT.l, weight: 1 } };
  q.ch.hip_r = { flex: 115, abd: 8, rot: 0 }; q.ch.knee_r = { flex: 110 }; q.ch.hip_l = { flex: 80, abd: 20, rot: -10 };
  q = H.fitLeg(q, 'r', contacts[0], FT.r, { abd: 8 }); q = H.fitLeg(q, 'l', contacts[1], FT.l, { abd: 20, rot: -10 });
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in q.ch[j]) q.ch[j][c] = r1(G.wrapA(q.ch[j][c]));
  return q;
}
// lean (pelvis pitch, spine follows) so the elbow pad point on top of the knee is one upper-arm length from the shoulder
const lean = (q, a) => { q = clone(q); q.root.rot = { pitch: r1(-a * 0.6) }; q.ch.spine_l5 = { rot: 0, flex: r1(a * 0.2), latFlex: 0 }; q.ch.spine_t12 = { rot: 0, flex: r1(a * 0.15), latFlex: 0 }; q.ch.spine_t6 = { rot: 0, flex: r1(a * 0.05), latFlex: 0 }; return q; };
const kneeTop = (W) => V.add(W.knee_r.p, [-2, PAD, 2]);
let lo = 0, hi = 45; for (let i = 0; i < 25; i++) { const m = (lo + hi) / 2, q = legs(lean(p, m)), W = L.fk(q, contacts); if (V.len(V.sub(kneeTop(W), W.shoulder_r.p)) > L.UA - 0.05) lo = m; else hi = m; }
const LEAN = r1(hi);
let base = legs(lean(p, LEAN));
base.ch.neck_c7 = { rot: 0, flex: r1(LEAN * 0.3) }; base.ch.head_c1 = { rot: 0, flex: r1(LEAN * 0.2) };
base.ch.sc_r = { protract: 4, elevate: 0 };
// left hand resting on the left thigh
{ const W = L.fk(base, contacts), th = V.add(W.hip_l.p, V.scale(V.sub(W.knee_l.p, W.hip_l.p), 0.7)), tgt = V.add(th, [0, 9, 0]);
  const m = clone(base); const paths = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron'];
  m.ch.shoulder_l = { plane: 40, elev: 30, axial: 0 }; m.ch.elbow_l = { flex: 60 }; m.ch.wrist_l = { pron: 0, flex: 0, dev: 0 };
  base = L.solvePose(m, paths, [L.obj.at('wrist_l', tgt, 2), (Wx) => [(Q.rot(Wx.wrist_l.q, [1, 0, 0])[1] + 1) * 2], L.obj.reg('ch.shoulder_l.axial', 0, 0.01), G.limitPen(paths.slice(0, 2))], { iters: 300 }).pose; }
const W0 = L.fk(base, contacts), S = W0.shoulder_r.p;
const E = V.add(S, V.scale(V.norm(V.sub(kneeTop(W0), S)), L.UA - 0.05)), uaDir = V.norm(V.sub(E, S));
const f0 = V.norm(V.sub([1, 0, 0], V.scale(uaDir, uaDir[0])));
let up0 = V.norm(V.cross(uaDir, f0)); if (up0[1] < 0) up0 = V.scale(up0, -1);
const D2R = Math.PI / 180;
const d = (ph) => V.add(V.scale(f0, Math.cos(ph * D2R)), V.scale(up0, Math.sin(ph * D2R)));
const palm = (ph) => V.add(V.scale(up0, -Math.cos(ph * D2R)), V.scale(f0, Math.sin(ph * D2R)));
const FS = [0, 0.25, 0.5, 0.75, 1];
const rk = G.rotKeys(base, E, d, palm, 30, FS.map((f) => G.lerp(PHI0, PHI1, f)), { guess: { plane: 40, elev: 60, axial: 0, flex: 90, pron: 90 } });
const poses = rk.poses;
const up = G.easeTimes([0.25, 0.5, 0.75, 1], 0.6, 2.6), dn = G.easeTimes([0.25, 0.5, 0.75, 1], 3.1, 5.6);
const keyframes = [{ t: 0, pose: 'r0' }, { t: 0.6, pose: 'r0' }, ...up.map((t, i) => ({ t, pose: `r${i + 1}` })), { t: 3.1, pose: 'r4' }, ...dn.map((t, i) => ({ t, pose: `r${3 - i}` })), { t: 6.0, pose: 'r0' }];
const ex = H.module_(meta, contacts, poses, keyframes);
// bench along X under the athlete: seat under the buttocks, flat pad continuing forward under the right foot
const bench = DBF.bench({ x: r1(hipX - 8), seat: 40, height: SEAT, width: 30, angle: 0, back: 80, side: 1 });
ex.props = [bench.prop, ...ex.props];
const benchBox = { center: [bench.prop.center[0] + 20, 0, 0], size: [120, SEAT, 30] };
const rep = K.scanHeld(ex, [{ side: 'r', grip: 'handle', size: SZ }], { planted: ['leg_r', 'leg_l'], probe: (W, pz, t, out) => { out.benchDb = Math.min(out.benchDb ?? 1e9, DBF.dumbbellBoxClearance(W, 'r', benchBox, 'handle', { length: SZ[0], diameter: SZ[1] })); } });
const Wa = L.fk(poses.r0, contacts), Wb = L.fk(poses.r4, contacts);
const footOnBench = r1(H.lowPoint(Wa, 'foot_r')[1] - SEAT), seatGap = r1(Math.min(H.bottomOf(Wa, 'buttock_r'), H.bottomOf(Wa, 'buttock_l')) - SEAT);
const elbowOnKnee = r1(T.pointToShape(Wa, T.shapeOf('thigh_r'), Wa.elbow_r.p));
const set = H.setKin(ex), dg = G.deg;
set('External rotation', 'setup', `Forearm ${dg(-rk.phiOf(Wa))} below horizontal, pointing forward`); set('External rotation', 'peak', `Forearm ${dg(rk.phiOf(Wb))} above horizontal (${dg(rk.phiOf(Wb) - rk.phiOf(Wa))} of rotation); elbow fixed on the knee`);
set('Shoulder position', 'setup', `Upper arm ${dg(K.humElev(Wa))} from the trunk, ${dg(Math.atan2(uaDir[0], uaDir[2]) / D2R)} in front of the frontal plane; elbow joint ${elbowOnKnee} cm above the thigh surface at the knee`); set('Shoulder position', 'peak', 'Unchanged');
set('Elbow flexion', 'setup', dg(K.elbowAng(Wa))); set('Elbow flexion', 'peak', dg(K.elbowAng(Wb)));
set('Trunk', 'setup', `Leaning ${dg(V.angle(V.sub(Wa.neck_c7.p, Wa.pelvis.p), [0, 1, 0]))} forward; right foot on the bench, left foot on the floor`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.6 s'); set('Tempo', 'peak', '2.0 s up, 0.5 s at the top, 2.5 s down');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ LEAN, footOnBench, seatGap, elbowOnKnee, err: rk.err, arm: rk.arm.ch.shoulder_r, legR: base.ch.hip_r, kneeR: base.ch.knee_r, phi: [rk.phiOf(Wa), rk.phiOf(Wb)].map(r1), ...rep })}`);
G.fail(ID, [rep.slide > 0.05 && 'slide', rep.floor < -0.5 && 'below floor', rep.clear.d < 0 && `dumbbell clearance ${JSON.stringify(rep.clear)}`, rep.benchDb < 0 && 'dumbbell in the bench', rep.dbFloor < 0 && 'dumbbell below floor', rep.jump.v > 4 && 'channel jump', ...G.limits(poses)]);
