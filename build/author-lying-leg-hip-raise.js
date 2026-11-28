// Lying Leg Hip Raise (GymVisual #5283; page not readable here, movement from the name: the classic flat-bench leg-hip
// raise). Bilateral: supine on a flat bench with the glutes near its end, hands gripping the sides of the pad behind the
// head (planted hands), legs straight and together, held out level with a slight drop below the bench line. Raise the
// straight legs to vertical, then curl the pelvis up off the bench so the feet drive toward the ceiling; pause, roll the
// pelvis back down slowly and lower the legs to the start. The upper back and head stay on the pad (the pelvis curl is
// solved about a locked T6, as in author-reverse-crunch.js). Lying base from b4-benchpress.js larsenBase.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const C = require('./families/core-a');
const BP = require('./families/b4-benchpress');
const CH = require('./families/b3-chest');
const H = require('./families/hips');
const F = require('./families/b6-13');
const meta = require('./meta/lying-leg-hip-raise.json');

const { B, base: lay } = BP.larsenBase({ hipX: 34, hipExt: -5, knee: 4, abd: 0, ankle: -20 });
// Hands: wrists just outside the pad edges, level with the top of the head, palms in and fingers wrapped down
const W0 = L.fk(lay), hz = B.prop.size[2] / 2;
const HAND = { r: [r1(W0.head_c1.p[0] - 4), r1(B.top - 1.5), r1(hz + 2.2)] }; HAND.l = [HAND.r[0], HAND.r[1], -HAND.r[2]];
const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
let best = null;
for (const g of [{ plane: 60, elev: 150, axial: 0 }, { plane: 20, elev: 140, axial: -60 }, { plane: 90, elev: 130, axial: 60 }, { plane: 40, elev: 160, axial: 90 }]) {
  const q = clone(lay); q.ch.shoulder_r = g; q.ch.elbow_r = { flex: 100 }; q.ch.wrist_r = { pron: 0, flex: 0, dev: 0 }; q.ch.sc_r = { protract: 0, elevate: 10 };
  const r = L.solvePose(q, ARM, [(W) => V.sub(W.wrist_r.p, HAND.r).map((v) => v * 4),
    (W) => V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), [0, 0, -1]).map((v) => v * 2), // palm toward the pad edge
    (W) => [(Q.rot(W.wrist_r.q, [0, -1, 0])[1] + 0.8) * 1.5], // fingers point down around the edge
    (W) => [Math.min(0, W.elbow_r.p[1] - B.top - 4) * 2, Math.min(0, W.elbow_r.p[2] - hz - 4) * 2], // elbows above and outside the pad
    C.limitPen(ARM, 3), L.obj.reg('ch.wrist_r.flex', 0, 0.05), L.obj.reg('ch.wrist_r.dev', 0, 0.05)], { iters: 600 });
  if (!best || r.cost < best.cost) best = r;
}
const armPose = C.mirrorArm(best.pose);
const Wa = L.fk(armPose);
const pole = (s) => { const S = Wa[`shoulder_${s}`].p, E = Wa[`elbow_${s}`].p, Wr = Wa[`wrist_${s}`].p, n = V.norm(V.sub(Wr, S)), d = V.sub(E, S); return V.norm(V.sub(d, V.scale(n, V.dot(d, n)))).map((v) => +v.toFixed(4)); };
const HC = ['r', 'l'].map((s) => Object.assign(L.handContact(s), { label: `${s === 'r' ? 'Right' : 'Left'} hand (bench)`, pole: pole(s), handRot: H.qArr(Wa[`wrist_${s}`].q) }));
const base = clone(armPose); base.ik = { arm_r: { target: HAND.r.slice(), weight: 1 }, arm_l: { target: HAND.l.slice(), weight: 1 } };
const K = F.curler(base);
const CURL = +(process.env.CURL || 34), LEG_TOP = +(process.env.LEGTOP || 104);
const START = C.legFromFloor(W0);
const legs = (c, deg, knee = 4) => F.legsStraight(K.curl(c), deg, { knee, dorsi: -18 + 8 * Math.min(1, Math.max(0, deg) / 90), abd: 0 });
const poses = {
  start: legs(0, START, 4), up30: legs(0, 30, 4), up60: legs(0, 60, 5), up90: legs(0, 90, 6),
  lift1: legs(CURL * 0.35, 94, 6), lift2: legs(CURL * 0.7, 99, 7), top: legs(CURL, LEG_TOP, 7), topHold: legs(CURL + 1, LEG_TOP + 0.5, 7),
  down2: legs(CURL * 0.65, 98, 7), down1: legs(CURL * 0.3, 93, 6),
};
const keyframes = F.kf([[0, 'start'], [0.6, 'start'], [1.1, 'up30'], [1.55, 'up60'], [2.0, 'up90'], [2.4, 'lift1'], [2.75, 'lift2'], [3.1, 'top'], [3.5, 'topHold'],
  [4.1, 'down2'], [4.65, 'down1'], [5.15, 'up90'], [5.8, 'up60'], [6.45, 'up30'], [7.1, 'start'], [7.6, 'start']]);
const ex = H.module_(meta, HC, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
const peakHip = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 6), max: Math.ceil(peakHip + 4) };

const pelvisLift = (W) => C.minOf(W, ['buttock_r', 'buttock_l', 'pelvis']) - B.top;
const rep = C.scan(ex, { upperBack: K.upperBack, hip: (W, p) => p.ch.hip_r.flex, leg: (W) => C.legFromFloor(W), lift: pelvisLift });
const sw = CH.sweep(ex, B, { grips: [] });
const Ws = L.fk(poses.start, HC), Wt = L.fk(poses.top, HC), d = (v) => `≈${Math.round(v)}°`;
const set = H.setKin(ex);
set('Legs from the floor', 'setup', `${d(C.legFromFloor(Ws))} (straight out, just below the line of the bench)`); set('Legs from the floor', 'peak', `${d(C.legFromFloor(Wt))} (vertical is 90°; the feet go a little past it as the hips lift)`);
set('Hip flexion', 'setup', d(poses.start.ch.hip_r.flex)); set('Hip flexion', 'peak', `${d(poses.up90.ch.hip_r.flex)} with the legs vertical, ${d(poses.top.ch.hip_r.flex)} at the top`);
set('Pelvis roll', 'setup', 'Pelvis on the bench'); set('Pelvis roll', 'peak', `${d(CURL)} posterior tilt; buttocks ${r1(pelvisLift(Wt))} cm off the pad`);
set('Knees', 'setup', d(C.kneeOf(Ws, 'r'))); set('Knees', 'peak', d(C.kneeOf(Wt, 'r')));
set('Grip', 'setup', 'Hands grip the sides of the pad beside the head, elbows out'); set('Grip', 'peak', `Unchanged; upper back stays on the pad (T6 moves ${r1(rep.upperBack[1])} cm)`);
set('Tempo', 'setup', 'Legs out 0.6 s'); set('Tempo', 'peak', '1.4 s legs up, 1.1 s hips up, 0.4 s pause, 1.65 s hips down, 1.95 s legs down');
console.log(`Lying Leg Hip Raise: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  sweep floor ${sw.floor} bodyBench ${sw.bodyBench} ${JSON.stringify(sw.bodyBenchAt)} fit ${JSON.stringify(CH.benchFit(B, W0))} armCost ${best.cost.toFixed(3)} arm ${JSON.stringify(armPose.ch.shoulder_r)} ${JSON.stringify(armPose.ch.elbow_r)} ${JSON.stringify(armPose.ch.wrist_r)}\n  hip start/90/top ${poses.start.ch.hip_r.flex}/${poses.up90.ch.hip_r.flex}/${poses.top.ch.hip_r.flex} lift ${r1(pelvisLift(Wt))} start legs ${r1(START)}`);
C.guard('lying-leg-hip-raise', rep, [pelvisLift(Wt) < 4 && 'pelvis barely leaves the bench', rep.upperBack[1] > 0.3 && `upper back moves ${rep.upperBack[1]} cm`, sw.bodyBench > 2.5 && `body sinks into the bench ${sw.bodyBench}`, best.cost > 1 && 'arm grip solve poor']);
