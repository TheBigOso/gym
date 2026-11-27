// Dumbbell Skull Crusher (GymVisual #035112, Dumbbell Lying Triceps Extension): lying face up on a flat 45 cm bench,
// head, upper back and buttocks on the pad, feet flat on the floor (planted leg contacts). A dumbbell in each hand,
// palms facing each other (handle grip, neutral). The upper arms stay vertical over the shoulders (constant shoulder
// channels, still trunk) while only the elbows bend, lowering the dumbbells back beside the head, then straighten.
// Bilateral; the left arm mirrors the right.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const DBF = require('./families/dumbbell');
const meta = require('./meta/dumbbell-skull-crusher.json');

const BENCH_H = 42, TOP_FLEX = 6, BOT_FLEX = +(process.env.BOT_FLEX || 112);
const SINK = JSON.parse(process.env.SINK || '{"butt":7.2,"back":1.6,"head":11}'); // rig shapes below the pad so the mesh touches it (b2/tri_mesh.mjs)
const base = T.lieOnBench(BENCH_H, 0, SINK);
// Bench: flat adjustable bench (seat + flat back pad, 120 cm), the +X end just past the buttocks so the thighs leave it.
const W0 = L.fk(base);
const BENCH_END = r1(W0.pelvis.p[0] + 13);
const bench = DBF.bench({ x: BENCH_END - 20, seat: 40, height: BENCH_H, width: 30, angle: 0, back: 80 });
const benchBox = { center: [BENCH_END - 60, 0, 0], size: [120, BENCH_H, 30] };
// Head resting on the pad, chin neutral
base.ch.sc_r = { protract: 4, elevate: 0 }; base.ch.sc_l = clone(base.ch.sc_r);
// Feet flat on the floor, a little wider than the hips, knees about over the ankles
const contacts = [H.legC('r', { pole: [0.6, 1, 0.2] }), H.legC('l', { pole: [0.6, 1, -0.2] })];
const FOOT = { r: [r1(W0.hip_r.p[0] + 36), L.ANKLE_H, 19], l: [r1(W0.hip_r.p[0] + 36), L.ANKLE_H, -19] };
let p = clone(base);
p.ik = { leg_r: { target: FOOT.r, weight: 1 }, leg_l: { target: FOOT.l, weight: 1 } };
p = H.fitLeg(p, 'r', contacts[0], FOOT.r, { rot: 0, abd: 6 }); p = H.fitLeg(p, 'l', contacts[1], FOOT.l, { rot: 0, abd: 6 });
// Upper arm vertical (world), forearm bending toward the head in the sagittal plane; wrist neutral, palm facing in.
const ua = T.upperArm(p, 'r', [0, 1, 0], [-1, 0, 0], [[90, 90, 0], [90, 90, -90], [0, 90, 90]]);
p.ch.shoulder_r = ua.ch; p.ch.elbow_r = { flex: TOP_FLEX };
{ const W = L.fk(p), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); const w = T.wristTo(p, 'r', fa, [0, 0, -1]); p.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 }; }
const armAt = (flex) => { const q = clone(p); q.ch.elbow_r = { flex: r1(flex) }; return T.mirrorArm(q); };
const poses = { top: armAt(TOP_FLEX), bottom: armAt(BOT_FLEX), bottomHold: armAt(BOT_FLEX - 1.5) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 2.8, pose: 'bottom' }, { t: 2.95, pose: 'bottomHold' }, { t: 3.1, pose: 'bottom' }, { t: 4.5, pose: 'top' }, { t: 5.0, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [bench.prop, ...ex.props];

// Whole-loop checks: planted feet, floor, dumbbells vs head / body / bench / floor, body on the bench.
const HEAD = /^(head|hair|ear_[rl]|jaw|nose|neck|brow_[rl]|eye_[rl])$/, BODY = /^(chest|pecs_[rl]|traps_[rl]|ribcage|deltoid_[rl])$/;
const pr = { head: 1e9, body: 1e9, bench: 1e9, dbFloor: 1e9, onBench: 1e9, onBenchAt: null, uaDev: 0 };
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => {
  for (const s of ['r', 'l']) {
    const h = T.dumbbellBody(W, s, 'handle', HEAD), b = T.dumbbellBody(W, s, 'handle', BODY);
    if (h.d < pr.head) { pr.head = h.d; pr.headId = h.id; }
    if (b.d < pr.body) { pr.body = b.d; pr.bodyId = b.id; }
    pr.bench = Math.min(pr.bench, DBF.dumbbellBoxClearance(W, s, benchBox, 'handle')); pr.dbFloor = Math.min(pr.dbFloor, DBF.dumbbellMinY(W, s, 'handle'));
    pr.uaDev = Math.max(pr.uaDev, V.angle(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p), [0, 1, 0]));
  }
  const ob = T.bodyOverBox(W, benchBox); if (ob.d < pr.onBench) { pr.onBench = ob.d; pr.onBenchAt = ob.id; }
} });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const rest = ['buttock_r', 'chest', 'hair'].map((id) => `${id} ${r1(H.bottomOf(Wt, id) - BENCH_H)}`).join(', ') + ` neck ${poses.top.ch.neck_c7.flex}+${poses.top.ch.head_c1.flex} pitch ${poses.top.root.rot.pitch}`;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wb, 'r'))} at the bottom`);
set('Upper arm angle', 'setup', `${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} from vertical`); set('Upper arm angle', 'peak', `Unchanged: shoulder channels constant (max ${pr.uaDev.toFixed(1)}° from vertical over the loop)`);
set('Dumbbell clearance', 'setup', `Dumbbells over the shoulders`); set('Dumbbell clearance', 'peak', `${r1(pr.head)} cm from the head at the closest (rig shapes); ${r1(pr.bench)} cm above the bench`);
set('Back on the bench', 'setup', `Bench ${BENCH_H} cm; buttocks, upper back and head on the pad`); set('Back on the bench', 'peak', 'Unchanged (the trunk does not move)');
set('Tempo', 'setup', 'Top 0.6 s'); set('Tempo', 'peak', '2.2 s down, 0.3 s pause, 1.4 s up, 0.5 s at the top');
console.log(`Dumbbell Skull Crusher: wrote ${L.write(ex)}\n  shoulder ${JSON.stringify(ua.ch)} wrist ${JSON.stringify(p.ch.wrist_r)} elbow ${r1(T.elbowOf(Wt, 'r'))}..${r1(T.elbowOf(Wb, 'r'))} rest(${rest}) hip ${JSON.stringify(poses.top.ch.hip_r)} knee ${r1(H.kneeOf(Wt, 'r'))}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(pr)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (pr.head < 0.5 || pr.body < 0 || pr.bench < 0 || pr.dbFloor < 0) { console.error('FAIL: dumbbell clearance'); process.exitCode = 1; }

