// Dumbbell Pronate Grip Triceps Extension (GymVisual #9134; page not read, movement from the name): lying face up on a flat
// 42 cm bench, head, upper back and buttocks on the pad, feet flat on the floor (planted). A dumbbell in each hand with an
// overhand (pronated) grip: palms toward the feet at the top, the two handles in one line across the body. The upper arms
// stay about vertical over the shoulders (constant shoulder channels) while only the elbows bend, lowering the dumbbells
// toward the top of the head and stopping above the forehead (the inner plates must clear the head), then straighten.
// Bilateral; the left arm mirrors the right. Same base as the dumbbell skull crusher (b3-triceps lieOnBench).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const DBF = require('./families/dumbbell');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-pronate-grip-triceps-extension.json');
const ID = meta.exercise.id;

const BENCH_H = 42, TOP_FLEX = 6, BOT_FLEX = +(process.env.BOT || 104), UA_BACK = +(process.env.UAB || 8);
const SZ = { length: meta.props[0].size[0], diameter: meta.props[0].size[1] };
const base = T.lieOnBench(BENCH_H, 0);
const W0 = L.fk(base);
const BENCH_END = r1(W0.pelvis.p[0] + 13);
const bench = DBF.bench({ x: BENCH_END - 20, seat: 40, height: BENCH_H, width: 30, angle: 0, back: 80 });
const benchBox = { center: [BENCH_END - 60, 0, 0], size: [120, BENCH_H, 30] };
base.ch.sc_r = { protract: 4, elevate: 0 }; base.ch.sc_l = clone(base.ch.sc_r);
const contacts = [H.legC('r', { pole: [0.6, 1, 0.2] }), H.legC('l', { pole: [0.6, 1, -0.2] })];
const FOOT = { r: [r1(W0.hip_r.p[0] + 36), L.ANKLE_H, 19], l: [r1(W0.hip_r.p[0] + 36), L.ANKLE_H, -19] };
let p = clone(base);
p.ik = { leg_r: { target: FOOT.r, weight: 1 }, leg_l: { target: FOOT.l, weight: 1 } };
p = H.fitLeg(p, 'r', contacts[0], FOOT.r, { rot: 0, abd: 6 }); p = H.fitLeg(p, 'l', contacts[1], FOOT.l, { rot: 0, abd: 6 });
// Upper arm a few degrees back from vertical (toward the head, so the dumbbells pass beyond the crown), forearm bending
// toward the head in the sagittal plane. Pronated: palm toward the feet (+X) with the arm straight up.
const a = UA_BACK * Math.PI / 180;
const ua = T.upperArm(p, 'r', [-Math.sin(a), Math.cos(a), 0], [-1, 0, 0], [[90, 90, 0], [90, 90, -90], [0, 90, 90]]);
p.ch.shoulder_r = ua.ch; p.ch.elbow_r = { flex: TOP_FLEX };
{ const W = L.fk(p), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); const w = T.wristTo(p, 'r', fa, [1, 0, 0]); p.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 }; }
const armAt = (flex) => { const q = clone(p); q.ch.elbow_r = { flex: r1(flex) }; return T.mirrorArm(q); };
const poses = { top: armAt(TOP_FLEX), bottom: armAt(BOT_FLEX), bottomHold: armAt(BOT_FLEX - 1.5) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 2.8, pose: 'bottom' }, { t: 2.95, pose: 'bottomHold' }, { t: 3.1, pose: 'bottom' }, { t: 4.5, pose: 'top' }, { t: 5.0, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [bench.prop, ...ex.props];

const HEAD = /^(head|hair|ear_[rl]|jaw|nose|neck|brow_[rl]|eye_[rl])$/, BODY = /^(chest|pecs_[rl]|traps_[rl]|ribcage|deltoid_[rl])$/;
const pr = { head: 1e9, body: 1e9, bench: 1e9, dbFloor: 1e9, onBench: 1e9, pair: 1e9 };
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => {
  for (const s of ['r', 'l']) {
    const h = T.dumbbellBody(W, s, 'handle', HEAD, SZ), b = T.dumbbellBody(W, s, 'handle', BODY, SZ);
    if (h.d < pr.head) { pr.head = h.d; pr.headId = h.id; }
    if (b.d < pr.body) { pr.body = b.d; pr.bodyId = b.id; }
    pr.bench = Math.min(pr.bench, DBF.dumbbellBoxClearance(W, s, benchBox, 'handle', SZ)); pr.dbFloor = Math.min(pr.dbFloor, DBF.dumbbellMinY(W, s, 'handle', SZ));
  }
  const dr = DBF.dumbbellAt(W, 'r', 'handle', SZ), dl = DBF.dumbbellAt(W, 'l', 'handle', SZ);
  pr.pair = Math.min(pr.pair, G.segGap(dr, dl));
  const ob = T.bodyOverBox(W, benchBox); if (ob.d < pr.onBench) { pr.onBench = ob.d; pr.onBenchAt = ob.id; }
} });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const set = H.setKin(ex), d = G.deg;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wb, 'r'))} at the bottom`);
set('Upper arm angle', 'setup', `${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} from vertical, tipped toward the head`); set('Upper arm angle', 'peak', 'Unchanged (shoulder channels constant)');
set('Grip', 'setup', 'Overhand: palms toward the feet, handles in one line'); set('Grip', 'peak', 'Palms toward the ceiling at the bottom (the forearms turn with the elbows)');
set('Dumbbell clearance', 'setup', 'Dumbbells over the shoulders'); set('Dumbbell clearance', 'peak', `${r1(pr.head)} cm from the head at the closest (rig shapes); inner plates ${r1(pr.pair)} cm apart`);
set('Back on the bench', 'setup', `Bench ${BENCH_H} cm; buttocks, upper back and head on the pad`); set('Back on the bench', 'peak', 'Unchanged (the trunk does not move)');
set('Tempo', 'setup', 'Top 0.6 s'); set('Tempo', 'peak', '2.2 s down, 0.3 s pause, 1.4 s up, 0.5 s at the top');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  shoulder ${JSON.stringify(ua.ch)} wrist ${JSON.stringify(p.ch.wrist_r)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(pr)}`);
G.fail(ID, [rep.slide > 0.05 && 'planted foot slides', rep.floor < -0.5 && 'below floor', pr.head < 1 && `dumbbell near the head ${pr.head}`, pr.body < 0 && 'dumbbell in the body', pr.bench < 0 && 'dumbbell in the bench', pr.dbFloor < 0 && 'dumbbell below floor', pr.pair < 0 && 'dumbbells collide', ...G.limits(poses)]);
