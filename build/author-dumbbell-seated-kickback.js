// Dumbbell Seated Kickback (GymVisual #964; page not read, movement from the name): sitting on the end of a flat 45 cm
// bench, feet flat on the floor (planted), leaning well forward from the hips with a long back. Both upper arms are held
// back along the sides of the trunk (constant shoulder channels), elbows bent about 90 degrees with the dumbbells hanging
// below the elbows, palms facing in (neutral grip). Only the elbows move: straighten back, squeeze, and swing slowly back
// down. Bilateral, the left arm mirrors the right.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const K = require('./families/b4-shoulders3');
const DBF = require('./families/dumbbell');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-seated-kickback.json');
const ID = meta.exercise.id;

const LEAN = +(process.env.LEAN || 50), UP = +(process.env.UP || 18), OUT = +(process.env.OUT || 0.26);
const SZ = { length: meta.props[0].size[0], diameter: meta.props[0].size[1] };
const s0 = K.seatedFlat({ lean: -LEAN, hipFlex: 88 + LEAN, stance: +(process.env.ST || 10), footAhead: +(process.env.FA || 12) });
const contacts = s0.contacts;
let base = clone(s0.pose);
base.ch.spine_l5 = { rot: 0, flex: 12, latFlex: 0 }; base.ch.spine_t12 = { rot: 0, flex: 8, latFlex: 0 }; base.ch.spine_t6 = { rot: 0, flex: 4, latFlex: 0 };
base.ch.neck_c7 = { rot: 0, flex: -10 }; base.ch.head_c1 = { rot: 0, flex: -8 };
base.ch.sc_r = { protract: -4, elevate: 0 }; base.ch.sc_l = clone(base.ch.sc_r);
// Upper arm: along the trunk toward the hips, tipped UP degrees toward the back and a little out to the side
const W0 = L.fk(base, contacts);
const down = V.norm(V.sub(W0.pelvis.p, W0.neck_c7.p));            // trunk axis, pointing to the hips
const back = V.norm(V.sub([0, 1, 0], V.scale(down, V.dot([0, 1, 0], down)))); // perpendicular to the trunk, toward the back (up)
const u = Math.PI / 180 * UP;
const uaDir = V.norm(V.add(V.add(V.scale(down, Math.cos(u)), V.scale(back, Math.sin(u))), [0, 0, OUT]));
const ua = G.upperArm(base, 'r', uaDir, [0, -1, 0], [[0, 10, 0], [90, 10, 0], [-60, 20, 0], [0, 20, 90], [0, 20, -90]]);
base.ch.shoulder_r = ua.ch; base.ch.elbow_r = { flex: 90 };
{ const W = L.fk(base), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); const w = T.wristTo(base, 'r', fa, [0, 0, -1]); base.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 }; }
const armAt = (flex) => { const q = clone(base); q.ch.elbow_r = { flex: r1(flex) }; return T.mirrorArm(q); };
const BOT = +(process.env.BOT || 92), TOP = 4;
const poses = { bent: armAt(BOT), straight: armAt(TOP), squeeze: armAt(TOP - 1.5) };
const keyframes = [{ t: 0, pose: 'bent' }, { t: 0.6, pose: 'bent' }, { t: 1.6, pose: 'straight' }, { t: 1.85, pose: 'squeeze' }, { t: 2.1, pose: 'straight' }, { t: 3.9, pose: 'bent' }, { t: 4.6, pose: 'bent' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [s0.bench.prop, ...ex.props];
const bb = s0.bench.prop, benchBox = { center: [bb.center[0] - 40, 0, 0], size: [120, bb.size[1], 30] };

const BODY = /^(ribcage|abdomen|pelvis|buttock_[rl]|thigh_[rl]|quad_[rl]|chest|pecs_[rl]|knee_[rl]|shank_[rl]|calf_[rl])$/;
const pr = { body: 1e9, bench: 1e9, floor: 1e9, onBench: 1e9 };
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, _p, t) => {
  for (const s of ['r', 'l']) {
    const b = T.dumbbellBody(W, s, 'handle', BODY, SZ); if (b.d < pr.body) { pr.body = b.d; pr.bodyId = b.id; pr.bodyAt = +t.toFixed(2); }
    pr.bench = Math.min(pr.bench, DBF.dumbbellBoxClearance(W, s, benchBox, 'handle', SZ)); pr.floor = Math.min(pr.floor, DBF.dumbbellMinY(W, s, 'handle', SZ));
  }
} });
const Wb = L.fk(poses.bent, contacts), Ws = L.fk(poses.straight, contacts);
const trunkFromV = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const uaTrunk = V.angle(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p), V.sub(Wb.pelvis.p, Wb.neck_c7.p));
const set = H.setKin(ex), d = G.deg;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wb, 'r'))} (forearm hanging)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Ws, 'r'))} (arms straight back)`);
set('Upper arm to trunk', 'setup', `${d(uaTrunk)} from the trunk line, elbows at back level`); set('Upper arm to trunk', 'peak', 'Unchanged (shoulder channels constant)');
set('Trunk lean', 'setup', `${d(trunkFromV(Wb))} forward from vertical (pelvis to C7), hips ${d(base.ch.hip_r.flex)}`); set('Trunk lean', 'peak', 'Unchanged');
set('Dumbbell clearance', 'setup', 'Dumbbells under the elbows'); set('Dumbbell clearance', 'peak', `${r1(pr.body)} cm from the body at the closest (rig shapes), ${r1(pr.bench)} cm from the bench`);
set('Tempo', 'setup', 'Elbows bent 0.6 s'); set('Tempo', 'peak', '1.0 s out, 0.5 s squeeze, 1.8 s back, 0.7 s reset');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  trunk ${r1(trunkFromV(Wb))} shoulder ${JSON.stringify(ua.ch)} cost ${ua.cost.toExponential(1)} err ${ua.err} wrist ${JSON.stringify(base.ch.wrist_r)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(pr)}`);
G.fail(ID, [rep.slide > 0.05 && 'planted foot slides', rep.floor < -0.5 && 'below floor', pr.body < 0.5 && `dumbbell in the body ${pr.body}`, pr.bench < 0 && 'dumbbell in the bench', pr.floor < 0 && 'dumbbell below floor', ...G.limits(poses)]);
